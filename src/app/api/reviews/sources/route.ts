import { db } from "@/db/client";
import { userLearningPaths,vocabGroups } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { proficiencyMax } from "@/lib/proficiency";
import { loadDueCards,loadFreshCandidates } from "@/lib/review-data";
import { ensureGroupAssignments,loadCourseSources,MANUAL_SOURCE_KEY,MANUAL_SOURCE_LABEL } from "@/lib/review-sources";
import { eq,inArray } from "drizzle-orm";

export async function GET(){
 const userId=requireUserId();
 const[path]=await db.select({id:userLearningPaths.id,reviewWindowDays:userLearningPaths.reviewWindowDays}).from(userLearningPaths).where(eq(userLearningPaths.userId,userId)).limit(1);
 if(!path)return Response.json({groups:[],proficiencyMax:0});

 const[allReviewed,fresh,{courseLabels}]=await Promise.all([loadDueCards(userId,path.reviewWindowDays,new Date(),{includeMastered:true}),loadFreshCandidates(userId),loadCourseSources(userId)]);

 const stats=new Map<string,{sum:number;count:number;label:string}>();
 const bump=(key:string,label:string,proficiency:number)=>{const entry=stats.get(key)??{sum:0,count:0,label};entry.sum+=proficiency;entry.count+=1;stats.set(key,entry)};
 for(const item of allReviewed)bump(item.sourceKey,item.sourceLabel,item.proficiency);
 for(const item of fresh)bump(item.sourceKey,item.sourceLabel,0);

 const keys=new Set([MANUAL_SOURCE_KEY,...courseLabels.keys()]);
 const sources=[...keys]
  .map(key=>{const entry=stats.get(key);return{key,label:key===MANUAL_SOURCE_KEY?MANUAL_SOURCE_LABEL:(courseLabels.get(key)??key),totalWords:entry?.count??0,proficiency:entry&&entry.count?Math.round(entry.sum/entry.count):0}})
  .filter(source=>source.totalWords>0);

 const groupIdBySource=await ensureGroupAssignments(sources.map(source=>source.key));
 const groupIds=[...new Set(groupIdBySource.values())];
 const groupRows=groupIds.length?await db.select().from(vocabGroups).where(inArray(vocabGroups.id,groupIds)):[];
 const groupById=new Map(groupRows.map(row=>[row.id,row]));

 const grouped=new Map<string,{id:string;slug:string;title:string;position:number;sources:typeof sources}>();
 for(const source of sources){
  const groupId=groupIdBySource.get(source.key);
  const group=groupId?groupById.get(groupId):undefined;
  if(!group)continue;
  const entry=grouped.get(group.id)??{id:group.id,slug:group.slug,title:group.title,position:group.position,sources:[]};
  entry.sources.push(source);
  grouped.set(group.id,entry);
 }

 const groups=[...grouped.values()]
  .sort((a,b)=>a.position-b.position||a.title.localeCompare(b.title))
  .map(({id,slug,title,sources})=>({id,slug,title,sources:sources.sort((a,b)=>(b.totalWords)-(a.totalWords))}));

 return Response.json({groups,proficiencyMax:proficiencyMax(path.reviewWindowDays)});
}
