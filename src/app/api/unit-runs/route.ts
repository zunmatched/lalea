import { db } from "@/db/client";
import { learningUnits, unitRuns, userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { and, asc, desc, eq } from "drizzle-orm";
export async function POST() {
  try {
    const userId=requireUserId();
    const [path]=await db.select().from(userLearningPaths).where(eq(userLearningPaths.userId,userId)).limit(1);
    if(!path) return Response.json({error:"Learning path not found"},{status:404});
    const [existing]=await db.select().from(unitRuns).where(and(eq(unitRuns.userLearningPathId,path.id),eq(unitRuns.status,"in_progress"))).orderBy(desc(unitRuns.createdAt)).limit(1);
    if(existing) return Response.json({id:existing.id,resumed:true});
    const [unit]=await db.select().from(learningUnits).orderBy(asc(learningUnits.position)).limit(1);
    if(!unit) return Response.json({error:"Learning unit not found"},{status:404});
    const [created]=await db.insert(unitRuns).values({userLearningPathId:path.id,learningUnitId:unit.id,shuffleSeed:crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff}).returning();
    return Response.json({id:created.id,resumed:false},{status:201});
  } catch { return Response.json({error:"Unable to start learning"},{status:500}); }
}

