import { db } from "@/db/client";
import { exerciseAttempts, exercises, unitRuns, userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
const input=z.object({unitRunId:z.string().uuid(),exerciseId:z.string().uuid(),clientEventId:z.string().uuid(),selectedIds:z.array(z.string()).min(1),displayOrder:z.array(z.string()).min(1)});
export async function POST(request:Request){
  const parsed=input.safeParse(await request.json()); if(!parsed.success)return Response.json({error:"Invalid answer"},{status:400});
  const userId=requireUserId(); const data=parsed.data;
  const [owned]=await db.select({id:unitRuns.id,unitId:unitRuns.learningUnitId}).from(unitRuns).innerJoin(userLearningPaths,eq(unitRuns.userLearningPathId,userLearningPaths.id)).where(and(eq(unitRuns.id,data.unitRunId),eq(userLearningPaths.userId,userId),eq(unitRuns.status,"in_progress"))).limit(1);
  if(!owned)return Response.json({error:"Not found"},{status:404});
  const [old]=await db.select().from(exerciseAttempts).where(and(eq(exerciseAttempts.unitRunId,data.unitRunId),eq(exerciseAttempts.clientEventId,data.clientEventId))).limit(1);
  const [exercise]=await db.select().from(exercises).where(and(eq(exercises.id,data.exerciseId),eq(exercises.learningUnitId,owned.unitId))).limit(1); if(!exercise)return Response.json({error:"Exercise not found"},{status:404});
  const correctIds=(exercise.answer as {correctIds:string[]}).correctIds; const isCorrect=JSON.stringify(data.selectedIds)===JSON.stringify(correctIds); const feedback=exercise.feedback as {correct:string;incorrect:string};
  if(!old) await db.transaction(async tx=>{await tx.insert(exerciseAttempts).values({unitRunId:data.unitRunId,exerciseId:data.exerciseId,clientEventId:data.clientEventId,response:{selectedIds:data.selectedIds},displayOrder:data.displayOrder,isCorrect}).onConflictDoNothing(); await tx.update(unitRuns).set({currentPosition:exercise.position}).where(eq(unitRuns.id,data.unitRunId));});
  return Response.json({isCorrect,correctIds,message:isCorrect?feedback.correct:feedback.incorrect,idempotent:Boolean(old)});
}
