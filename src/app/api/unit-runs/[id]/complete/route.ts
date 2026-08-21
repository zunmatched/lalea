import { db } from "@/db/client";
import { unitRuns, userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { and, eq } from "drizzle-orm";
export async function POST(_:Request,context:{params:Promise<{id:string}>}){const userId=requireUserId();const {id}=await context.params;const [owned]=await db.select({id:unitRuns.id}).from(unitRuns).innerJoin(userLearningPaths,eq(unitRuns.userLearningPathId,userLearningPaths.id)).where(and(eq(unitRuns.id,id),eq(userLearningPaths.userId,userId))).limit(1);if(!owned)return Response.json({error:"Not found"},{status:404});await db.update(unitRuns).set({status:"completed",completedAt:new Date()}).where(eq(unitRuns.id,id));return Response.json({status:"completed"});}
