import { db } from "@/db/client";
import { lexemes,lexemeSenses,reviewEvents,senseTranslations,userLearningPaths,userVocabulary,vocabularyExamples,vocabularyMasteryStates } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { computeProficiency,PROFICIENCY_MAX } from "@/lib/proficiency";
import { newVocabularyAllowance } from "@/lib/vocabulary";
import { and,eq,inArray,isNull,sql } from "drizzle-orm";

const cardFields={userVocabularyId:userVocabulary.id,form:lexemes.canonicalForm,partOfSpeech:lexemeSenses.partOfSpeech,translation:senseTranslations.translation,example:vocabularyExamples.text,exampleTranslation:vocabularyExamples.translation};

export async function GET(request:Request){
 const userId=requireUserId();
 const now=new Date();
 const more=new URL(request.url).searchParams.get("more")==="1";
 const[path]=await db.select({id:userLearningPaths.id,newVocabLimit:userLearningPaths.newVocabLimit}).from(userLearningPaths).where(eq(userLearningPaths.userId,userId)).limit(1);
 if(!path)return Response.json({due:[],new:[],pool:[],policy:{dueFirst:true,newAllowance:0,dueCount:0,newVocabLimit:0}});

 const states=await db.select({...cardFields,masteryStateId:vocabularyMasteryStates.id,dimension:vocabularyMasteryStates.dimension,reviewCount:vocabularyMasteryStates.reviewCount}).from(vocabularyMasteryStates).innerJoin(userVocabulary,eq(vocabularyMasteryStates.userVocabularyId,userVocabulary.id)).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).innerJoin(lexemeSenses,eq(userVocabulary.lexemeSenseId,lexemeSenses.id)).innerJoin(lexemes,eq(lexemeSenses.lexemeId,lexemes.id)).leftJoin(senseTranslations,eq(senseTranslations.lexemeSenseId,lexemeSenses.id)).leftJoin(vocabularyExamples,eq(vocabularyExamples.lexemeSenseId,lexemeSenses.id)).where(eq(userLearningPaths.userId,userId));

 const events=states.length?await db.select({masteryStateId:reviewEvents.vocabularyMasteryStateId,isCorrect:reviewEvents.isCorrect,createdAt:reviewEvents.createdAt}).from(reviewEvents).where(inArray(reviewEvents.vocabularyMasteryStateId,states.map(s=>s.masteryStateId))):[];
 const eventsByState=new Map<string,{isCorrect:boolean;createdAt:Date}[]>();
 for(const event of events){const list=eventsByState.get(event.masteryStateId)??[];list.push({isCorrect:event.isCorrect,createdAt:event.createdAt});eventsByState.set(event.masteryStateId,list)}

 const due=states.map(({masteryStateId,...card})=>({...card,proficiency:computeProficiency(eventsByState.get(masteryStateId)??[],now)})).filter(item=>item.proficiency<PROFICIENCY_MAX).sort((a,b)=>a.proficiency-b.proficiency);

 const allowance=more?path.newVocabLimit:newVocabularyAllowance(due.length,path.newVocabLimit);
 const fresh=allowance?await db.select(cardFields).from(userVocabulary).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).innerJoin(lexemeSenses,eq(userVocabulary.lexemeSenseId,lexemeSenses.id)).innerJoin(lexemes,eq(lexemeSenses.lexemeId,lexemes.id)).leftJoin(senseTranslations,eq(senseTranslations.lexemeSenseId,lexemeSenses.id)).leftJoin(vocabularyExamples,eq(vocabularyExamples.lexemeSenseId,lexemeSenses.id)).leftJoin(vocabularyMasteryStates,eq(vocabularyMasteryStates.userVocabularyId,userVocabulary.id)).where(and(eq(userLearningPaths.userId,userId),eq(userVocabulary.status,"ready_to_learn"),isNull(vocabularyMasteryStates.id))).orderBy(sql`random()`).limit(allowance):[];

 const pool=await db.select({form:lexemes.canonicalForm,translation:senseTranslations.translation}).from(userVocabulary).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).innerJoin(lexemeSenses,eq(userVocabulary.lexemeSenseId,lexemeSenses.id)).innerJoin(lexemes,eq(lexemeSenses.lexemeId,lexemes.id)).leftJoin(senseTranslations,eq(senseTranslations.lexemeSenseId,lexemeSenses.id)).where(eq(userLearningPaths.userId,userId)).orderBy(sql`random()`).limit(60);

 return Response.json({due,new:fresh,pool,policy:{dueFirst:true,newAllowance:allowance,dueCount:due.length,newVocabLimit:path.newVocabLimit}});
}
