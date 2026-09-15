import { db } from "@/db/client";
import { courseVersions,courses,exerciseAttempts,learningUnits,unitRuns,userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { and,desc,eq,inArray } from "drizzle-orm";

export async function GET(){
 const userId=requireUserId();
 const[path]=await db.select({id:userLearningPaths.id}).from(userLearningPaths).where(eq(userLearningPaths.userId,userId)).limit(1);
 if(!path)return Response.json({sessions:[]});

 const runs=await db.select({id:unitRuns.id,completedAt:unitRuns.completedAt,courseTitle:courses.title,unitTitle:learningUnits.title})
  .from(unitRuns)
  .innerJoin(learningUnits,eq(unitRuns.learningUnitId,learningUnits.id))
  .innerJoin(courseVersions,eq(learningUnits.courseVersionId,courseVersions.id))
  .innerJoin(courses,eq(courseVersions.courseId,courses.id))
  .where(and(eq(unitRuns.userLearningPathId,path.id),eq(unitRuns.status,"completed")))
  .orderBy(desc(unitRuns.completedAt))
  .limit(100);

 const runIds=runs.map(run=>run.id);
 const attempts=runIds.length?await db.select({unitRunId:exerciseAttempts.unitRunId,isCorrect:exerciseAttempts.isCorrect}).from(exerciseAttempts).where(inArray(exerciseAttempts.unitRunId,runIds)):[];
 const statsByRun=new Map<string,{correct:number;total:number}>();
 for(const attempt of attempts){
  const entry=statsByRun.get(attempt.unitRunId)??{correct:0,total:0};
  entry.total+=1;if(attempt.isCorrect)entry.correct+=1;
  statsByRun.set(attempt.unitRunId,entry);
 }

 const sessions=runs.map(run=>{
  const stats=statsByRun.get(run.id)??{correct:0,total:0};
  return{id:run.id,completedAt:run.completedAt,courseTitle:run.courseTitle,unitTitle:run.unitTitle,correctCount:stats.correct,totalCount:stats.total};
 });
 return Response.json({sessions});
}
