import { strict as assert } from "node:assert";
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as s from "./schema";

async function main() {
  loadEnvConfig(process.cwd());
  const testUrl = process.env.TEST_DATABASE_URL; assert(testUrl, "TEST_DATABASE_URL is required");
  const parsed = new URL(testUrl);
  assert(["127.0.0.1", "localhost"].includes(parsed.hostname), "Integration tests only reset a local database");
  assert(parsed.pathname === "/lalea_test", "Integration tests only reset lalea_test");
  process.env.DATABASE_URL = testUrl; Reflect.set(process.env, "NODE_ENV", "test"); process.env.DEV_AUTH_ENABLED = "true";

  const adminPool = new Pool({ connectionString: testUrl });
  await adminPool.query("drop schema if exists drizzle cascade; drop schema public cascade; create schema public");
  const adminDb = drizzle(adminPool, { schema: s }); await migrate(adminDb, { migrationsFolder: "drizzle" });
  const ids = { u1:"00000000-0000-4000-8000-000000000101",u2:"00000000-0000-4000-8000-000000000102",en:"00000000-0000-4000-8000-000000000103",zh:"00000000-0000-4000-8000-000000000104",path:"00000000-0000-4000-8000-000000000105",up1:"00000000-0000-4000-8000-000000000106",up2:"00000000-0000-4000-8000-000000000107",course:"00000000-0000-4000-8000-000000000108",version:"00000000-0000-4000-8000-000000000109",unit:"00000000-0000-4000-8000-000000000110" };
  await adminDb.insert(s.users).values([{id:ids.u1,displayName:"User 1"},{id:ids.u2,displayName:"User 2"}]);
  await adminDb.insert(s.languages).values([{id:ids.en,tag:"en",displayName:"English"},{id:ids.zh,tag:"zh-Hant",displayName:"繁中"}]);
  await adminDb.insert(s.learningPaths).values({id:ids.path,slug:"test-path",title:"Test",targetLanguageId:ids.en,supportLanguageId:ids.zh});
  await adminDb.insert(s.userLearningPaths).values([{id:ids.up1,userId:ids.u1,learningPathId:ids.path},{id:ids.up2,userId:ids.u2,learningPathId:ids.path}]);
  await adminDb.insert(s.courses).values({id:ids.course,learningPathId:ids.path,slug:"test",title:"Test"});
  await adminDb.insert(s.courseVersions).values({id:ids.version,courseId:ids.course,version:1});
  await adminDb.insert(s.learningUnits).values({id:ids.unit,courseVersionId:ids.version,position:1,title:"Test",estimatedSeconds:60});
  const exerciseRows=[
    {id:"10000000-0000-4000-8000-000000000101",position:1,type:"reading_choice"},
    {id:"10000000-0000-4000-8000-000000000102",position:2,type:"listening_choice"},
    {id:"10000000-0000-4000-8000-000000000103",position:3,type:"chunk_ordering"},
  ];
  for(const row of exerciseRows) await adminDb.insert(s.exercises).values({...row,learningUnitId:ids.unit,prompt:row.type,content:{options:[{id:"right",text:"Right"},{id:"wrong",text:"Wrong"}]},answer:{correctIds:["right"]},feedback:{correct:"Correct",incorrect:"Incorrect"}});
  const workLexeme="40000000-0000-4000-8000-000000000101",workSense1="41000000-0000-4000-8000-000000000101",workSense2="41000000-0000-4000-8000-000000000102";
  await adminDb.insert(s.lexemes).values({id:workLexeme,languageId:ids.en,canonicalForm:"work",normalizedForm:"work",type:"word"});
  await adminDb.insert(s.lexemeSenses).values([{id:workSense1,lexemeId:workLexeme,definitionLanguageId:ids.en,definition:"to perform a job"},{id:workSense2,lexemeId:workLexeme,definitionLanguageId:ids.en,definition:"to be suitable or convenient"}]);

  process.env.DEV_AUTH_USER_ID=ids.u1;
  const [{POST:startRun},{GET:getRun},{POST:submit},{POST:complete},{GET:getProgress},{POST:injectVocabulary},{pool:appPool}] = await Promise.all([import("@/app/api/unit-runs/route"),import("@/app/api/unit-runs/[id]/route"),import("@/app/api/exercise-attempts/route"),import("@/app/api/unit-runs/[id]/complete/route"),import("@/app/api/progress/route"),import("@/app/api/vocabulary/injections/route"),import("./client")]);
  const inject=(body:Record<string,unknown>)=>injectVocabulary(new Request("http://test/api/vocabulary/injections",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
  const choices=await inject({rawText:"  ＷＯＲＫ  "});const choiceBody=await choices.json();assert.equal(choiceBody.status,"needs_selection");assert.equal(choiceBody.matches.length,2,"same spelling must retain two senses");
  await inject({rawText:"work",selectedSenseId:workSense2});await inject({rawText:"work",selectedSenseId:workSense2});assert.equal((await adminDb.select().from(s.userVocabulary).where(eq(s.userVocabulary.userLearningPathId,ids.up1))).length,1,"same sense must not duplicate personal vocabulary");
  const unknown1=await inject({rawText:"spin   up"});const unknown2=await inject({rawText:"ＳＰＩＮ ＵＰ"});assert.equal((await unknown1.json()).status,"needs_enrichment");assert.equal((await unknown2.json()).idempotent,true);assert.equal((await adminDb.select().from(s.vocabularyInjectionTasks).where(eq(s.vocabularyInjectionTasks.userLearningPathId,ids.up1))).length,1,"normalized unknown capture must not duplicate");
  const started=await startRun(); assert.equal(started.status,201); const runId=(await started.json()).id as string;
  assert.equal((await complete(new Request("http://test",{method:"POST"}),{params:Promise.resolve({id:runId})})).status,409,"incomplete run must fail");
  process.env.DEV_AUTH_USER_ID=ids.u2;
  assert.equal((await getRun(new Request("http://test"),{params:Promise.resolve({id:runId})})).status,404,"other user must not read run");
  process.env.DEV_AUTH_USER_ID=ids.u1;
  const send=(exerciseId:string,eventId:string,selectedIds:string[])=>submit(new Request("http://test/api/exercise-attempts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({unitRunId:runId,exerciseId,clientEventId:eventId,selectedIds,displayOrder:["right","wrong"]})}));
  const event="30000000-0000-4000-8000-000000000101";
  const first=await send(exerciseRows[0].id,event,["wrong"]); assert.equal((await first.json()).isCorrect,false);
  const retry=await send(exerciseRows[0].id,event,["right"]); const retryBody=await retry.json(); assert.equal(retryBody.isCorrect,false,"retry must preserve original result"); assert.equal(retryBody.idempotent,true);
  await send(exerciseRows[1].id,"30000000-0000-4000-8000-000000000102",["right"]); await send(exerciseRows[2].id,"30000000-0000-4000-8000-000000000103",["right"]);
  const completed=await complete(new Request("http://test",{method:"POST"}),{params:Promise.resolve({id:runId})}); assert.equal(completed.status,200);
  assert.equal((await adminDb.select().from(s.exerciseAttempts).where(eq(s.exerciseAttempts.unitRunId,runId))).length,3,"retry must not insert a fourth attempt");
  assert.equal((await adminDb.select().from(s.masteryStates).where(eq(s.masteryStates.userLearningPathId,ids.up1))).length,3,"three mastery dimensions must be independent");
  const progress=await getProgress(); const progressBody=await progress.json(); assert.equal(progressBody.completedUnits,1); assert.equal(progressBody.mastery.length,3);
  await appPool.end(); await adminPool.end(); console.log("Integration verification passed");
}
main().catch((error)=>{console.error(error);process.exitCode=1});
