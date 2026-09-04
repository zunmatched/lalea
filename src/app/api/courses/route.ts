import { db } from "@/db/client";
import { courseVersions,courses,exercises,learningPaths,learningUnits,unitRuns,userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { and,eq } from "drizzle-orm";

export async function GET(){
 const userId=requireUserId();
 const[path]=await db.select({id:userLearningPaths.id,learningPathId:userLearningPaths.learningPathId,title:learningPaths.title}).from(userLearningPaths).innerJoin(learningPaths,eq(learningPaths.id,userLearningPaths.learningPathId)).where(eq(userLearningPaths.userId,userId)).limit(1);
 if(!path)return Response.json({groups:[]});

 // 只列出真正有題目可以練習的課程；純詞彙用的關卡（例如透過 scripts/vocab/add-unit.ts 建立的）沒有 exercises，不該出現在會話課程選單裡
 const rows=await db.selectDistinct({courseId:courses.id,courseTitle:courses.title,version:courseVersions.version,unitId:learningUnits.id})
  .from(courses)
  .innerJoin(courseVersions,and(eq(courseVersions.courseId,courses.id),eq(courseVersions.status,"published")))
  .innerJoin(learningUnits,eq(learningUnits.courseVersionId,courseVersions.id))
  .innerJoin(exercises,eq(exercises.learningUnitId,learningUnits.id))
  .where(eq(courses.learningPathId,path.learningPathId));

 const byCourse=new Map<string,{title:string;version:number;unitIds:Set<string>}>();
 for(const row of rows){
  const entry=byCourse.get(row.courseId)??{title:row.courseTitle,version:row.version,unitIds:new Set()};
  if(row.version>=entry.version){
   if(row.version>entry.version)entry.unitIds.clear();
   entry.version=row.version;entry.unitIds.add(row.unitId);
  }
  byCourse.set(row.courseId,entry);
 }

 const completed=await db.select({unitId:unitRuns.learningUnitId}).from(unitRuns).where(and(eq(unitRuns.userLearningPathId,path.id),eq(unitRuns.status,"completed")));
 const completedIds=new Set(completed.map(item=>item.unitId));

 const list=[...byCourse.entries()].map(([id,entry])=>({
  id,title:entry.title,totalUnits:entry.unitIds.size,
  completedUnits:[...entry.unitIds].filter(unitId=>completedIds.has(unitId)).length,
 }));

 if(!list.length)return Response.json({groups:[]});
 return Response.json({groups:[{id:path.id,title:path.title,courses:list}]});
}
