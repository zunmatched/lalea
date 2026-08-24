import { db } from "@/db/client";
import { userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { loadDueCards,loadFreshCandidates } from "@/lib/review-data";
import { loadCourseSources,MANUAL_SOURCE_KEY,MANUAL_SOURCE_LABEL } from "@/lib/review-sources";
import { eq } from "drizzle-orm";

export async function GET(){
 const userId=requireUserId();
 const[path]=await db.select({id:userLearningPaths.id}).from(userLearningPaths).where(eq(userLearningPaths.userId,userId)).limit(1);
 if(!path)return Response.json({sources:[]});

 const[due,fresh,{courseLabels}]=await Promise.all([loadDueCards(userId),loadFreshCandidates(userId),loadCourseSources(userId)]);

 const counts=new Map<string,{due:number;new:number}>();
 const bump=(key:string,field:"due"|"new")=>{const entry=counts.get(key)??{due:0,new:0};entry[field]+=1;counts.set(key,entry)};
 for(const item of due)bump(item.sourceKey,"due");
 for(const item of fresh)bump(item.sourceKey,"new");

 const keys=new Set([MANUAL_SOURCE_KEY,...courseLabels.keys()]);
 const sources=[...keys]
  .map(key=>({key,label:key===MANUAL_SOURCE_KEY?MANUAL_SOURCE_LABEL:(courseLabels.get(key)??key),due:counts.get(key)?.due??0,new:counts.get(key)?.new??0}))
  .filter(source=>source.due>0||source.new>0)
  .sort((a,b)=>(b.due+b.new)-(a.due+a.new));

 if(sources.length>1)sources.unshift({key:"",label:"全部",due:due.length,new:fresh.length});

 return Response.json({sources});
}
