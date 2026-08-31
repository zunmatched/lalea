import { db } from "@/db/client";
import { lexemeSenses,lexemes,senseTranslations,userLearningPaths,userVocabulary } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { proficiencyMax } from "@/lib/proficiency";
import { loadDueCards,loadFreshCandidates } from "@/lib/review-data";
import { eq,sql } from "drizzle-orm";

function shuffle<T>(items:T[]):T[]{return [...items].sort(()=>Math.random()-0.5)}

export async function GET(request:Request){
 const userId=requireUserId();
 const now=new Date();
 const url=new URL(request.url);
 const sourceFilter=url.searchParams.get("source")||"";
 const[path]=await db.select({id:userLearningPaths.id,reviewWindowDays:userLearningPaths.reviewWindowDays}).from(userLearningPaths).where(eq(userLearningPaths.userId,userId)).limit(1);
 if(!path)return Response.json({due:[],new:[],pool:[],policy:{dueFirst:true},proficiencyMax:0});

 let due=(await loadDueCards(userId,path.reviewWindowDays,now)).sort((a,b)=>Number(a.reviewedToday)-Number(b.reviewedToday)||a.proficiency-b.proficiency);
 if(sourceFilter)due=due.filter(item=>item.sourceKey===sourceFilter);

 let freshPool=await loadFreshCandidates(userId);
 if(sourceFilter)freshPool=freshPool.filter(item=>item.sourceKey===sourceFilter);
 const fresh=shuffle(freshPool);

 const pool=await db.select({form:lexemes.canonicalForm,translation:senseTranslations.translation,partOfSpeech:lexemeSenses.partOfSpeech}).from(userVocabulary).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).innerJoin(lexemeSenses,eq(userVocabulary.lexemeSenseId,lexemeSenses.id)).innerJoin(lexemes,eq(lexemeSenses.lexemeId,lexemes.id)).leftJoin(senseTranslations,eq(senseTranslations.lexemeSenseId,lexemeSenses.id)).where(eq(userLearningPaths.userId,userId)).orderBy(sql`random()`).limit(60);

 return Response.json({due,new:fresh,pool,policy:{dueFirst:true},proficiencyMax:proficiencyMax(path.reviewWindowDays)});
}
