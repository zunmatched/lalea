import { db } from "@/db/client";
import { courseVersions,learningUnits,unitRuns,userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { and,asc,desc,eq } from "drizzle-orm";

export async function POST(request:Request) {
  try {
    const userId=requireUserId();
    const body=await request.json().catch(()=>({}));
    const courseId=typeof body?.courseId==="string"?body.courseId:undefined;
    const [path]=await db.select().from(userLearningPaths).where(eq(userLearningPaths.userId,userId)).limit(1);
    if(!path) return Response.json({error:"Learning path not found"},{status:404});

    let units;
    if(courseId){
      const[version]=await db.select({id:courseVersions.id}).from(courseVersions).where(and(eq(courseVersions.courseId,courseId),eq(courseVersions.status,"published"))).orderBy(desc(courseVersions.version)).limit(1);
      units=version?await db.select().from(learningUnits).where(eq(learningUnits.courseVersionId,version.id)).orderBy(asc(learningUnits.position)):[];
    }else{
      units=await db.select().from(learningUnits).orderBy(asc(learningUnits.position));
    }
    const unitIds=new Set(units.map(item=>item.id));

    const [existing]=await db.select().from(unitRuns).where(and(eq(unitRuns.userLearningPathId,path.id),eq(unitRuns.status,"in_progress"))).orderBy(desc(unitRuns.createdAt)).limit(1);
    if(existing&&(!courseId||unitIds.has(existing.learningUnitId))) return Response.json({id:existing.id,resumed:true});

    const completed=await db.select({unitId:unitRuns.learningUnitId}).from(unitRuns).where(and(eq(unitRuns.userLearningPathId,path.id),eq(unitRuns.status,"completed")));
    const completedIds=new Set(completed.map(item=>item.unitId));
    const unit=units.find(item=>!completedIds.has(item.id))??units[0];
    if(!unit) return Response.json({error:"Learning unit not found"},{status:404});
    const [created]=await db.insert(unitRuns).values({userLearningPathId:path.id,learningUnitId:unit.id,shuffleSeed:crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff}).returning();
    return Response.json({id:created.id,resumed:false},{status:201});
  } catch { return Response.json({error:"Unable to start learning"},{status:500}); }
}
