import { db } from "@/db/client";
import { lexemes,lexemeSenses,senseTranslations,userLearningPaths,userVocabulary,vocabularyExamples,vocabularyMasteryStates } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { newVocabularyAllowance } from "@/lib/vocabulary";
import { and,asc,eq,isNull,lte,sql } from "drizzle-orm";

const cardFields={userVocabularyId:userVocabulary.id,form:lexemes.canonicalForm,partOfSpeech:lexemeSenses.partOfSpeech,translation:senseTranslations.translation,example:vocabularyExamples.text,exampleTranslation:vocabularyExamples.translation};

export async function GET(request:Request){
 const userId=requireUserId();
 const now=new Date();
 const more=new URL(request.url).searchParams.get("more")==="1";
 const[path]=await db.select({id:userLearningPaths.id,newVocabLimit:userLearningPaths.newVocabLimit}).from(userLearningPaths).where(eq(userLearningPaths.userId,userId)).limit(1);
 if(!path)return Response.json({due:[],new:[],pool:[],policy:{dueFirst:true,newAllowance:0,dueCount:0}});

 const due=await db.select({...cardFields,dimension:vocabularyMasteryStates.dimension,nextReviewAt:vocabularyMasteryStates.nextReviewAt,reviewCount:vocabularyMasteryStates.reviewCount}).from(vocabularyMasteryStates).innerJoin(userVocabulary,eq(vocabularyMasteryStates.userVocabularyId,userVocabulary.id)).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).innerJoin(lexemeSenses,eq(userVocabulary.lexemeSenseId,lexemeSenses.id)).innerJoin(lexemes,eq(lexemeSenses.lexemeId,lexemes.id)).leftJoin(senseTranslations,eq(senseTranslations.lexemeSenseId,lexemeSenses.id)).leftJoin(vocabularyExamples,eq(vocabularyExamples.lexemeSenseId,lexemeSenses.id)).where(and(eq(userLearningPaths.userId,userId),lte(vocabularyMasteryStates.nextReviewAt,now))).orderBy(asc(vocabularyMasteryStates.nextReviewAt));

 const allowance=more?path.newVocabLimit:newVocabularyAllowance(due.length,path.newVocabLimit);
 const fresh=allowance?await db.select(cardFields).from(userVocabulary).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).innerJoin(lexemeSenses,eq(userVocabulary.lexemeSenseId,lexemeSenses.id)).innerJoin(lexemes,eq(lexemeSenses.lexemeId,lexemes.id)).leftJoin(senseTranslations,eq(senseTranslations.lexemeSenseId,lexemeSenses.id)).leftJoin(vocabularyExamples,eq(vocabularyExamples.lexemeSenseId,lexemeSenses.id)).leftJoin(vocabularyMasteryStates,eq(vocabularyMasteryStates.userVocabularyId,userVocabulary.id)).where(and(eq(userLearningPaths.userId,userId),eq(userVocabulary.status,"ready_to_learn"),isNull(vocabularyMasteryStates.id))).orderBy(sql`random()`).limit(allowance):[];

 const pool=await db.select({form:lexemes.canonicalForm,translation:senseTranslations.translation}).from(userVocabulary).innerJoin(userLearningPaths,eq(userVocabulary.userLearningPathId,userLearningPaths.id)).innerJoin(lexemeSenses,eq(userVocabulary.lexemeSenseId,lexemeSenses.id)).innerJoin(lexemes,eq(lexemeSenses.lexemeId,lexemes.id)).leftJoin(senseTranslations,eq(senseTranslations.lexemeSenseId,lexemeSenses.id)).where(eq(userLearningPaths.userId,userId)).orderBy(sql`random()`).limit(60);

 return Response.json({due,new:fresh,pool,policy:{dueFirst:true,newAllowance:allowance,dueCount:due.length,newVocabLimit:path.newVocabLimit}});
}
