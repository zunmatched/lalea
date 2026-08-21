import { db } from "@/db/client";
import { reviewEvents,userLearningPaths,userVocabulary,vocabularyMasteryStates } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { scheduleReview,type Rating } from "@/lib/scheduler";
import { and,eq } from "drizzle-orm";
import { z } from "zod";
const input=z.object({userVocabularyId:z.string().uuid(),dimension:z.enum(["reading_recognition","listening_recognition","active_recall"]),clientEventId:z.string().uuid(),isCorrect:z.boolean(),rating:z.enum(["forgot","hard","mastered","too_easy"]).optional()});
export async function POST(request:Request){
 const parsed=input.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid review"},{status:400});const data=parsed.data;const userId=requireUserId();
 const[owned]=await db.select({id:userVocabulary.id,firstLearnedAt:userVocabulary.firstLearnedAt}).from(userVocabulary).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).where(and(eq(userVocabulary.id,data.userVocabularyId),eq(userLearningPaths.userId,userId))).limit(1);if(!owned)return Response.json({error:"Not found"},{status:404});
 const[old]=await db.select({event:reviewEvents,state:vocabularyMasteryStates}).from(reviewEvents).innerJoin(vocabularyMasteryStates,eq(reviewEvents.vocabularyMasteryStateId,vocabularyMasteryStates.id)).where(eq(reviewEvents.clientEventId,data.clientEventId)).limit(1);if(old)return Response.json({state:old.event.afterState,reason:old.event.reason,idempotent:true});
 let[state]=await db.select().from(vocabularyMasteryStates).where(and(eq(vocabularyMasteryStates.userVocabularyId,data.userVocabularyId),eq(vocabularyMasteryStates.dimension,data.dimension))).limit(1);
 if(!state){await db.insert(vocabularyMasteryStates).values({userVocabularyId:data.userVocabularyId,dimension:data.dimension}).onConflictDoNothing();[state]=await db.select().from(vocabularyMasteryStates).where(and(eq(vocabularyMasteryStates.userVocabularyId,data.userVocabularyId),eq(vocabularyMasteryStates.dimension,data.dimension))).limit(1)}
 const now=new Date();const before={intervalDays:state.intervalDays,nextReviewAt:state.nextReviewAt,reviewCount:state.reviewCount};const after=scheduleReview(before,{isCorrect:data.isCorrect,rating:data.rating as Rating|undefined,reviewedAt:now});
 const inserted=await db.transaction(async tx=>{const rows=await tx.insert(reviewEvents).values({clientEventId:data.clientEventId,vocabularyMasteryStateId:state.id,isCorrect:data.isCorrect,rating:data.rating,beforeState:before,afterState:after,reason:after.reason,schedulerVersion:after.schedulerVersion}).onConflictDoNothing().returning({id:reviewEvents.id});if(!rows.length)return false;await tx.update(vocabularyMasteryStates).set({intervalDays:after.intervalDays,nextReviewAt:after.nextReviewAt,lastReviewedAt:now,reviewCount:after.reviewCount,schedulerVersion:after.schedulerVersion}).where(eq(vocabularyMasteryStates.id,state.id));await tx.update(userVocabulary).set({status:"learned",firstLearnedAt:owned.firstLearnedAt??now}).where(eq(userVocabulary.id,owned.id));return true});
 if(!inserted){const[concurrent]=await db.select().from(reviewEvents).where(eq(reviewEvents.clientEventId,data.clientEventId)).limit(1);return Response.json({state:concurrent.afterState,reason:concurrent.reason,idempotent:true})}
 return Response.json({state:after,reason:after.reason,idempotent:false},{status:201});
}
