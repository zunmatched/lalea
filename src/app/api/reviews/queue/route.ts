import { db } from "@/db/client";
import { lexemeSenses,lexemes,senseTranslations,userLearningPaths,userVocabulary } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { loadDueCards,loadFreshCandidates } from "@/lib/review-data";
import { newVocabularyAllowance } from "@/lib/vocabulary";
import { eq,sql } from "drizzle-orm";

function shuffle<T>(items:T[]):T[]{return [...items].sort(()=>Math.random()-0.5)}

export async function GET(request:Request){
 const userId=requireUserId();
 const now=new Date();
 const url=new URL(request.url);
 const more=url.searchParams.get("more")==="1";
 const full=url.searchParams.get("full")==="1";
 const sourceFilter=url.searchParams.get("source")||"";
 const[path]=await db.select({id:userLearningPaths.id,newVocabLimit:userLearningPaths.newVocabLimit}).from(userLearningPaths).where(eq(userLearningPaths.userId,userId)).limit(1);
 if(!path)return Response.json({due:[],new:[],pool:[],policy:{dueFirst:true,newAllowance:0,dueCount:0,newVocabLimit:0}});

 let due=(await loadDueCards(userId,now)).sort((a,b)=>Number(a.reviewedToday)-Number(b.reviewedToday)||a.proficiency-b.proficiency);
 if(sourceFilter)due=due.filter(item=>item.sourceKey===sourceFilter);

 const baseAllowance=more?path.newVocabLimit:newVocabularyAllowance(due.length,path.newVocabLimit);
 let freshPool=(full||baseAllowance)?await loadFreshCandidates(userId):[];
 if(sourceFilter)freshPool=freshPool.filter(item=>item.sourceKey===sourceFilter);
 const allowance=full?freshPool.length:baseAllowance;
 const fresh=shuffle(freshPool).slice(0,allowance);

 const pool=await db.select({form:lexemes.canonicalForm,translation:senseTranslations.translation}).from(userVocabulary).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).innerJoin(lexemeSenses,eq(userVocabulary.lexemeSenseId,lexemeSenses.id)).innerJoin(lexemes,eq(lexemeSenses.lexemeId,lexemes.id)).leftJoin(senseTranslations,eq(senseTranslations.lexemeSenseId,lexemeSenses.id)).where(eq(userLearningPaths.userId,userId)).orderBy(sql`random()`).limit(60);

 return Response.json({due,new:fresh,pool,policy:{dueFirst:true,newAllowance:allowance,dueCount:due.length,newVocabLimit:path.newVocabLimit}});
}
