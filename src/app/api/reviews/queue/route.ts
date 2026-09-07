import { db } from "@/db/client";
import { lexemeSenses,lexemes,senseTranslations,userLearningPaths,userVocabulary } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { proficiencyMax } from "@/lib/proficiency";
import { loadDueCards,loadFreshCandidates } from "@/lib/review-data";
import { loadCourseSources,sourceFor } from "@/lib/review-sources";
import { eq } from "drizzle-orm";

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

 const poolRows=await db.select({lexemeSenseId:userVocabulary.lexemeSenseId,form:lexemes.canonicalForm,translation:senseTranslations.translation,partOfSpeech:lexemeSenses.partOfSpeech}).from(userVocabulary).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).innerJoin(lexemeSenses,eq(userVocabulary.lexemeSenseId,lexemeSenses.id)).innerJoin(lexemes,eq(lexemeSenses.lexemeId,lexemes.id)).leftJoin(senseTranslations,eq(senseTranslations.lexemeSenseId,lexemeSenses.id)).where(eq(userLearningPaths.userId,userId));
 const{bySense}=await loadCourseSources(userId);
 const scopedPool=sourceFilter?poolRows.filter(row=>sourceFor(bySense,row.lexemeSenseId).key===sourceFilter):poolRows;
 const pool=shuffle(scopedPool).slice(0,60).map(row=>({form:row.form,translation:row.translation,partOfSpeech:row.partOfSpeech}));

 return Response.json({due,new:fresh,pool,policy:{dueFirst:true},proficiencyMax:proficiencyMax(path.reviewWindowDays)});
}
