import { db } from "@/db/client";
import { reviewEvents,userLearningPaths,userVocabulary,vocabularyMasteryStates } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { computeProficiency } from "@/lib/proficiency";
import { and,eq } from "drizzle-orm";
import { z } from "zod";

const input=z.object({userVocabularyId:z.string().uuid(),dimension:z.enum(["reading_recognition","listening_recognition","active_recall"]),challengeType:z.enum(["spell","dictation"]),clientEventId:z.string().uuid(),isCorrect:z.boolean()});

export async function POST(request:Request){
 const parsed=input.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid review"},{status:400});const data=parsed.data;const userId=requireUserId();
 const[owned]=await db.select({id:userVocabulary.id,firstLearnedAt:userVocabulary.firstLearnedAt}).from(userVocabulary).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).where(and(eq(userVocabulary.id,data.userVocabularyId),eq(userLearningPaths.userId,userId))).limit(1);if(!owned)return Response.json({error:"Not found"},{status:404});

 const[old]=await db.select({event:reviewEvents}).from(reviewEvents).where(eq(reviewEvents.clientEventId,data.clientEventId)).limit(1);
 if(old)return Response.json({proficiency:(old.event.afterState as{proficiency:number}).proficiency,idempotent:true});

 let[state]=await db.select().from(vocabularyMasteryStates).where(and(eq(vocabularyMasteryStates.userVocabularyId,data.userVocabularyId),eq(vocabularyMasteryStates.dimension,data.dimension))).limit(1);
 if(!state){await db.insert(vocabularyMasteryStates).values({userVocabularyId:data.userVocabularyId,dimension:data.dimension}).onConflictDoNothing();[state]=await db.select().from(vocabularyMasteryStates).where(and(eq(vocabularyMasteryStates.userVocabularyId,data.userVocabularyId),eq(vocabularyMasteryStates.dimension,data.dimension))).limit(1)}

 const now=new Date();
 const priorEventRows=await db.select({isCorrect:reviewEvents.isCorrect,createdAt:reviewEvents.createdAt,challengeType:reviewEvents.challengeType}).from(reviewEvents).where(eq(reviewEvents.vocabularyMasteryStateId,state.id));
 const priorEvents=priorEventRows.filter((event):event is typeof event&{challengeType:"spell"|"dictation"}=>event.challengeType==="spell"||event.challengeType==="dictation");
 const before={proficiency:computeProficiency(priorEvents,now)};
 const after={proficiency:computeProficiency([...priorEvents,{isCorrect:data.isCorrect,createdAt:now,challengeType:data.challengeType}],now)};

 const inserted=await db.transaction(async tx=>{
  const rows=await tx.insert(reviewEvents).values({clientEventId:data.clientEventId,vocabularyMasteryStateId:state.id,isCorrect:data.isCorrect,challengeType:data.challengeType,beforeState:before,afterState:after,reason:data.isCorrect?"correct":"incorrect",schedulerVersion:"day-bucket-v2"}).onConflictDoNothing().returning({id:reviewEvents.id});
  if(!rows.length)return false;
  await tx.update(vocabularyMasteryStates).set({lastReviewedAt:now,reviewCount:state.reviewCount+1,schedulerVersion:"day-bucket-v2"}).where(eq(vocabularyMasteryStates.id,state.id));
  await tx.update(userVocabulary).set({status:after.proficiency>0?"learned":"learning",firstLearnedAt:owned.firstLearnedAt??now}).where(eq(userVocabulary.id,owned.id));
  return true;
 });
 if(!inserted){const[concurrent]=await db.select().from(reviewEvents).where(eq(reviewEvents.clientEventId,data.clientEventId)).limit(1);return Response.json({proficiency:(concurrent.afterState as{proficiency:number}).proficiency,idempotent:true})}
 return Response.json({proficiency:after.proficiency,idempotent:false},{status:201});
}
