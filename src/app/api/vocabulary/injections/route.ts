import { db } from "@/db/client";
import { learningPaths, lexemes, lexemeSenses, userLearningPaths, userVocabulary, vocabularyContexts, vocabularyInjectionTasks } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { normalizeVocabulary } from "@/lib/vocabulary";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

const input=z.object({rawText:z.string().trim().min(1).max(200),selectedSenseId:z.string().uuid().optional(),originalSentence:z.string().trim().max(1000).optional(),note:z.string().trim().max(500).optional()});
export async function POST(request:Request){
 const parsed=input.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid vocabulary input"},{status:400});
 const userId=requireUserId();const data=parsed.data;const normalized=normalizeVocabulary(data.rawText);
 const[path]=await db.select({id:userLearningPaths.id,targetLanguageId:learningPaths.targetLanguageId}).from(userLearningPaths).innerJoin(learningPaths,eq(userLearningPaths.learningPathId,learningPaths.id)).where(eq(userLearningPaths.userId,userId)).limit(1);
 if(!path)return Response.json({error:"Learning path not found"},{status:404});
 const senses=await db.select({id:lexemeSenses.id,canonicalForm:lexemes.canonicalForm,definition:lexemeSenses.definition,partOfSpeech:lexemeSenses.partOfSpeech}).from(lexemes).innerJoin(lexemeSenses,eq(lexemeSenses.lexemeId,lexemes.id)).where(and(eq(lexemes.languageId,path.targetLanguageId),eq(lexemes.normalizedForm,normalized),eq(lexemeSenses.status,"approved")));
 if(senses.length>1&&!data.selectedSenseId)return Response.json({status:"needs_selection",matches:senses});
 const selected=data.selectedSenseId?senses.find(s=>s.id===data.selectedSenseId):senses[0];
 if(selected){
  const[record]=await db.insert(userVocabulary).values({userLearningPathId:path.id,lexemeSenseId:selected.id}).onConflictDoUpdate({target:[userVocabulary.userLearningPathId,userVocabulary.lexemeSenseId],set:{status:"ready_to_learn"}}).returning();
  if(data.originalSentence||data.note)await db.insert(vocabularyContexts).values({userVocabularyId:record.id,originalSentence:data.originalSentence,note:data.note});
  return Response.json({status:"ready_to_learn",vocabularyId:record.id,sense:selected},{status:201});
 }
 const[existing]=await db.select().from(vocabularyInjectionTasks).where(and(eq(vocabularyInjectionTasks.userLearningPathId,path.id),eq(vocabularyInjectionTasks.normalizedText,normalized),inArray(vocabularyInjectionTasks.status,["captured","needs_enrichment","needs_review"]))).limit(1);
 if(existing)return Response.json({status:existing.status,taskId:existing.id,idempotent:true});
 const[task]=await db.insert(vocabularyInjectionTasks).values({userLearningPathId:path.id,languageId:path.targetLanguageId,rawText:data.rawText,normalizedText:normalized,status:"needs_enrichment"}).returning();
 if(data.originalSentence||data.note)await db.insert(vocabularyContexts).values({injectionTaskId:task.id,originalSentence:data.originalSentence,note:data.note});
 return Response.json({status:"needs_enrichment",taskId:task.id,idempotent:false},{status:202});
}
