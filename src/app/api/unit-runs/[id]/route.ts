import { db } from "@/db/client";
import { audioAssets, exerciseGroups, exercises, unitRuns, userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { seededShuffle } from "@/lib/shuffle";
import { and, asc, eq } from "drizzle-orm";
export async function GET(_:Request, context:{params:Promise<{id:string}>}) {
  const userId=requireUserId(); const {id}=await context.params;
  const [run]=await db.select({id:unitRuns.id,unitId:unitRuns.learningUnitId,seed:unitRuns.shuffleSeed,currentPosition:unitRuns.currentPosition,status:unitRuns.status}).from(unitRuns).innerJoin(userLearningPaths,eq(unitRuns.userLearningPathId,userLearningPaths.id)).where(and(eq(unitRuns.id,id),eq(userLearningPaths.userId,userId))).limit(1);
  if(!run) return Response.json({error:"Not found"},{status:404});
  const rows=await db.select().from(exercises).where(eq(exercises.learningUnitId,run.unitId)).orderBy(asc(exercises.position));
  const assets=await db.select().from(audioAssets).where(and(eq(audioAssets.learningUnitId,run.unitId),eq(audioAssets.reviewStatus,"approved")));
  const assetByExercise=new Map(assets.map(asset=>[asset.exerciseId,asset]));
  const assetByGroup=new Map(assets.map(asset=>[asset.groupId,asset]));
  const groups=await db.select().from(exerciseGroups).where(eq(exerciseGroups.learningUnitId,run.unitId));const groupById=new Map(groups.map(group=>[group.id,group]));
  const payload=rows.map((exercise,index)=>{
   const content=exercise.content as {context?:string;speech?:string;options?:Array<{id:string;text:string}>;[key:string]:unknown};
   const group=exercise.groupId?groupById.get(exercise.groupId):undefined;
   const asset=assetByExercise.get(exercise.id)??(exercise.groupId?assetByGroup.get(exercise.groupId):undefined);
   return {id:exercise.id,position:exercise.position,type:exercise.type,prompt:exercise.prompt,content:{...content,context:content.context??group?.context??undefined,speech:content.speech??group?.speech??undefined,image:group?.imagePath??undefined,options:content.options?seededShuffle(content.options,run.seed+index):undefined,audio:asset?{id:asset.id,status:asset.reviewStatus,url:asset.storagePath,voice:asset.voice,durationMs:asset.durationMs,checksum:asset.checksum}:undefined}};
  });
  return Response.json({...run,exercises:payload});
}
