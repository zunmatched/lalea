import { db } from "@/db/client";
import { lexemes,lexemeSenses,reviewEvents,senseTranslations,userLearningPaths,userVocabulary,vocabularyExamples,vocabularyMasteryStates } from "@/db/schema";
import { and,eq,inArray,isNull } from "drizzle-orm";
import { computeProficiency,proficiencyMax,ProficiencyEvent,reviewedOnDay,scoredOnDay } from "./proficiency";
import { loadCourseSources,sourceFor } from "./review-sources";

const cardFields={userVocabularyId:userVocabulary.id,lexemeSenseId:userVocabulary.lexemeSenseId,form:lexemes.canonicalForm,partOfSpeech:lexemeSenses.partOfSpeech,translation:senseTranslations.translation,example:vocabularyExamples.text,exampleTranslation:vocabularyExamples.translation,starred:userVocabulary.starred};

export async function loadDueCards(userId:string,windowDays:number,now=new Date(),options?:{includeMastered?:boolean}){
 const{bySense}=await loadCourseSources(userId);
 const states=await db.select({...cardFields,masteryStateId:vocabularyMasteryStates.id,dimension:vocabularyMasteryStates.dimension,reviewCount:vocabularyMasteryStates.reviewCount}).from(vocabularyMasteryStates).innerJoin(userVocabulary,eq(vocabularyMasteryStates.userVocabularyId,userVocabulary.id)).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).innerJoin(lexemeSenses,eq(userVocabulary.lexemeSenseId,lexemeSenses.id)).innerJoin(lexemes,eq(lexemeSenses.lexemeId,lexemes.id)).leftJoin(senseTranslations,eq(senseTranslations.lexemeSenseId,lexemeSenses.id)).leftJoin(vocabularyExamples,eq(vocabularyExamples.lexemeSenseId,lexemeSenses.id)).where(eq(userLearningPaths.userId,userId));

 const events=states.length?await db.select({masteryStateId:reviewEvents.vocabularyMasteryStateId,isCorrect:reviewEvents.isCorrect,createdAt:reviewEvents.createdAt,challengeType:reviewEvents.challengeType}).from(reviewEvents).where(inArray(reviewEvents.vocabularyMasteryStateId,states.map(s=>s.masteryStateId))):[];
 const eventsByState=new Map<string,ProficiencyEvent[]>();
 for(const event of events){if(event.challengeType!=="spell"&&event.challengeType!=="dictation")continue;const list=eventsByState.get(event.masteryStateId)??[];list.push({isCorrect:event.isCorrect,createdAt:event.createdAt,challengeType:event.challengeType});eventsByState.set(event.masteryStateId,list)}

 const max=proficiencyMax(windowDays);
 return states.map(({masteryStateId,lexemeSenseId,...card})=>{
  const stateEvents=eventsByState.get(masteryStateId)??[];
  const source=sourceFor(bySense,lexemeSenseId);
  return{...card,proficiency:computeProficiency(stateEvents,windowDays,now),reviewedToday:reviewedOnDay(stateEvents,now),completedToday:scoredOnDay(stateEvents,now),sourceKey:source.key,sourceLabel:source.label};
 }).filter(item=>options?.includeMastered||item.proficiency<max);
}

export async function loadFreshCandidates(userId:string){
 const{bySense}=await loadCourseSources(userId);
 const rows=await db.select(cardFields).from(userVocabulary).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).innerJoin(lexemeSenses,eq(userVocabulary.lexemeSenseId,lexemeSenses.id)).innerJoin(lexemes,eq(lexemeSenses.lexemeId,lexemes.id)).leftJoin(senseTranslations,eq(senseTranslations.lexemeSenseId,lexemeSenses.id)).leftJoin(vocabularyExamples,eq(vocabularyExamples.lexemeSenseId,lexemeSenses.id)).leftJoin(vocabularyMasteryStates,eq(vocabularyMasteryStates.userVocabularyId,userVocabulary.id)).where(and(eq(userLearningPaths.userId,userId),eq(userVocabulary.status,"ready_to_learn"),isNull(vocabularyMasteryStates.id)));

 return rows.map(({lexemeSenseId,...card})=>{
  const source=sourceFor(bySense,lexemeSenseId);
  return{...card,sourceKey:source.key,sourceLabel:source.label};
 });
}
