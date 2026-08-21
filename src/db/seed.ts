import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";
async function main() {
loadEnvConfig(process.cwd());
const { db, pool } = await import("./client");
const s = await import("./schema");
const ids = {
  user: "00000000-0000-4000-8000-000000000001", en: "00000000-0000-4000-8000-000000000002", zh: "00000000-0000-4000-8000-000000000003",
  path: "00000000-0000-4000-8000-000000000004", userPath: "00000000-0000-4000-8000-000000000005", course: "00000000-0000-4000-8000-000000000006",
  version: "00000000-0000-4000-8000-000000000007", unit: "00000000-0000-4000-8000-000000000008",
};
await db.insert(s.users).values({ id: ids.user, displayName: "LaLea Learner" }).onConflictDoNothing();
await db.insert(s.languages).values([{ id: ids.en, tag: "en", displayName: "English" }, { id: ids.zh, tag: "zh-Hant", displayName: "繁體中文" }]).onConflictDoNothing();
await db.insert(s.learningPaths).values({ id: ids.path, slug: "zh-hant-business-en", title: "一般商務英語", targetLanguageId: ids.en, supportLanguageId: ids.zh }).onConflictDoNothing();
await db.insert(s.userLearningPaths).values({ id: ids.userPath, userId: ids.user, learningPathId: ids.path }).onConflictDoNothing();
await db.insert(s.courses).values({ id: ids.course, learningPathId: ids.path, slug: "clarify-and-confirm", title: "請對方說明並確認理解" }).onConflictDoNothing();
await db.insert(s.courseVersions).values({ id: ids.version, courseId: ids.course, version: 1 }).onConflictDoNothing();
await db.insert(s.learningUnits).values({ id: ids.unit, courseVersionId: ids.version, position: 1, title: "請對方進一步說明", estimatedSeconds: 180 }).onConflictDoNothing();
const exercises = [
  { id:"10000000-0000-4000-8000-000000000001", position:1, type:"reading_choice", prompt:"你沒有完全理解對方的說明，哪一句最適合？", content:{ context:"We may need to hold off on the report until the numbers are confirmed.", options:[{id:"explain",text:"Please explain again."},{id:"walk",text:"Could you walk me through that?"},{id:"what",text:"What are you talking about?"}]}, answer:{correctIds:["walk"]}, feedback:{correct:"自然且禮貌地請對方完整說明。",incorrect:"Could you walk me through that? 更適合請對方逐步說明。"}},
  { id:"10000000-0000-4000-8000-000000000002", position:2, type:"listening_choice", prompt:"他們接下來會怎麼做？", content:{ speech:"We don't have the final numbers yet, so let's hold off on sending the report.", options:[{id:"send",text:"立刻寄出報告"},{id:"wait",text:"等待確認後的數據"},{id:"cancel",text:"取消報告"}]}, answer:{correctIds:["wait"]}, feedback:{correct:"答對了，他們會先等待數據確認。",incorrect:"hold off 表示暫緩，而不是取消。"}},
  { id:"10000000-0000-4000-8000-000000000003", position:3, type:"chunk_ordering", prompt:"請對方帶你完整說明流程。", content:{ options:[{id:"could",text:"Could you"},{id:"walk",text:"walk me through"},{id:"process",text:"the process?"}]}, answer:{correctIds:["could","walk","process"]}, feedback:{correct:"句子順序正確。",incorrect:"正確句子是：Could you walk me through the process?"}},
  { id:"10000000-0000-4000-8000-000000000004", position:4, type:"branched_dialogue", prompt:"Alex: Let's wait until everything is ready. 選擇合作式的澄清。", content:{ options:[{id:"clarify",text:"Could you clarify what you mean by everything?"},{id:"nonsense",text:"That doesn't make sense."}]}, answer:{correctIds:["clarify"]}, feedback:{correct:"語氣清楚且具有合作感。",incorrect:"直接否定容易顯得不耐煩，應先請對方澄清。"}},
  { id:"10000000-0000-4000-8000-000000000005", position:5, type:"branched_dialogue", prompt:"Alex: I mean the figures and customer approval. 第二輪應如何確認理解？", content:{ options:[{id:"confirm",text:"Got it. So we'll wait for the figures and customer approval before sending it."},{id:"repeat",text:"Just say that again."}]}, answer:{correctIds:["confirm"]}, feedback:{correct:"你用自己的話確認了兩項必要條件。",incorrect:"用自己的話重述重點，可以更可靠地確認雙方理解一致。"}},
];
for (const exercise of exercises) await db.insert(s.exercises).values({ ...exercise, learningUnitId: ids.unit }).onConflictDoUpdate({ target: s.exercises.id, set: { prompt: exercise.prompt, content: exercise.content, answer: exercise.answer, feedback: exercise.feedback } });

const extraCourses=[
 {courseId:"00000000-0000-4000-8000-000000000020",versionId:"00000000-0000-4000-8000-000000000021",unitId:"00000000-0000-4000-8000-000000000022",position:2,slug:"progress-update",title:"回報進度與下一次更新",estimatedSeconds:240},
 {courseId:"00000000-0000-4000-8000-000000000030",versionId:"00000000-0000-4000-8000-000000000031",unitId:"00000000-0000-4000-8000-000000000032",position:3,slug:"reschedule-meeting",title:"安排與調整會議時間",estimatedSeconds:240},
];
for(const item of extraCourses){await db.insert(s.courses).values({id:item.courseId,learningPathId:ids.path,slug:item.slug,title:item.title}).onConflictDoNothing();await db.insert(s.courseVersions).values({id:item.versionId,courseId:item.courseId,version:1}).onConflictDoNothing();await db.insert(s.learningUnits).values({id:item.unitId,courseVersionId:item.versionId,position:item.position,title:item.title,estimatedSeconds:item.estimatedSeconds}).onConflictDoNothing()}
const extraExercises=[
 {unitId:extraCourses[0].unitId,id:"10000000-0000-4000-8000-000000000020",position:1,type:"reading_choice",prompt:"工作仍按計畫進行，預計週四完成。",content:{options:[{id:"track",text:"We're on track to finish by Thursday."},{id:"done",text:"We already finished on Thursday."},{id:"maybe",text:"Maybe Thursday was finished."}]},answer:{correctIds:["track"]},feedback:{correct:"on track 表示進度符合計畫。",incorrect:"on track 不表示已完成，而是按計畫進行。"}},
 {unitId:extraCourses[0].unitId,id:"10000000-0000-4000-8000-000000000021",position:2,type:"listening_choice",prompt:"目前還缺少什麼？",content:{speech:"We're on track to finish the draft today, but we're still waiting on the final cost estimate. I'll send you an update by four.",options:[{id:"draft",text:"草稿"},{id:"estimate",text:"最終成本估算"},{id:"update",text:"客戶更新"}]},answer:{correctIds:["estimate"]},feedback:{correct:"still waiting on 指尚在等待成本估算。",incorrect:"草稿按進度進行，缺少的是 final cost estimate。"}},
 {unitId:extraCourses[0].unitId,id:"10000000-0000-4000-8000-000000000022",position:3,type:"chunk_ordering",prompt:"排列成明確的更新承諾。",content:{options:[{id:"send",text:"I'll send you"},{id:"update",text:"an update"},{id:"noon",text:"by noon."}]},answer:{correctIds:["send","update","noon"]},feedback:{correct:"by noon 清楚承諾最晚更新時間。",incorrect:"正確句子是：I'll send you an update by noon."}},
 {unitId:extraCourses[0].unitId,id:"10000000-0000-4000-8000-000000000023",position:4,type:"branched_dialogue",prompt:"Manager: Is anything still outstanding?",content:{options:[{id:"blocker",text:"The main blocker is the final cost estimate. We're following up with finance."},{id:"blame",text:"Finance is the problem."}]},answer:{correctIds:["blocker"]},feedback:{correct:"客觀指出阻礙並補充行動。",incorrect:"完整回報應避免只責怪其他團隊。"}},
 {unitId:extraCourses[1].unitId,id:"10000000-0000-4000-8000-000000000030",position:1,type:"reading_choice",prompt:"詢問客戶星期四下午兩點是否方便。",content:{options:[{id:"work",text:"Would Thursday at two work for you?"},{id:"job",text:"Do you work Thursday at two?"},{id:"order",text:"You can meet Thursday at two."}]},answer:{correctIds:["work"]},feedback:{correct:"work for you 在此表示時間是否方便。",incorrect:"詢問方便與否可用 Would ... work for you?"}},
 {unitId:extraCourses[1].unitId,id:"10000000-0000-4000-8000-000000000031",position:2,type:"listening_choice",prompt:"新的會議時間是？",content:{speech:"Could we move it to Friday morning? Friday works for me. Would ten o'clock work for you?",options:[{id:"thu2",text:"星期四兩點"},{id:"fri10",text:"星期五十點"},{id:"fri2",text:"星期五兩點"}]},answer:{correctIds:["fri10"]},feedback:{correct:"Friday morning 的具體時間確認為 ten o'clock。",incorrect:"會議改到星期五上午十點。"}},
 {unitId:extraCourses[1].unitId,id:"10000000-0000-4000-8000-000000000032",position:3,type:"chunk_ordering",prompt:"排列成禮貌改期。",content:{options:[{id:"could",text:"Could we"},{id:"move",text:"move it"},{id:"friday",text:"to Friday morning?"}]},answer:{correctIds:["could","move","friday"]},feedback:{correct:"Could we ...? 是合作且禮貌的提議。",incorrect:"正確句子是：Could we move it to Friday morning?"}},
 {unitId:extraCourses[1].unitId,id:"10000000-0000-4000-8000-000000000033",position:4,type:"branched_dialogue",prompt:"Client: Yes, ten works for me.",content:{options:[{id:"invite",text:"Great, I'll send an updated invitation."},{id:"old",text:"I already sent the old time."}]},answer:{correctIds:["invite"]},feedback:{correct:"確認後主動承諾更新邀請。",incorrect:"改期後應寄出更新過的邀請。"}},
];
for(const exercise of extraExercises)await db.insert(s.exercises).values({id:exercise.id,learningUnitId:exercise.unitId,position:exercise.position,type:exercise.type,prompt:exercise.prompt,content:exercise.content,answer:exercise.answer,feedback:exercise.feedback}).onConflictDoUpdate({target:s.exercises.id,set:{prompt:exercise.prompt,content:exercise.content,answer:exercise.answer,feedback:exercise.feedback}});
const audioDrafts=[
 {id:"60000000-0000-4000-8000-000000000001",unitId:ids.unit,exerciseId:"10000000-0000-4000-8000-000000000002",text:"We don't have the final numbers yet, so let's hold off on sending the report."},
 {id:"60000000-0000-4000-8000-000000000002",unitId:extraCourses[0].unitId,exerciseId:"10000000-0000-4000-8000-000000000021",text:"We're on track to finish the draft today, but we're still waiting on the final cost estimate. I'll send you an update by four."},
 {id:"60000000-0000-4000-8000-000000000003",unitId:extraCourses[1].unitId,exerciseId:"10000000-0000-4000-8000-000000000031",text:"Could we move it to Friday morning? Friday works for me. Would ten o'clock work for you?"},
];
for(const audio of audioDrafts)await db.insert(s.audioAssets).values({id:audio.id,learningUnitId:audio.unitId,exerciseId:audio.exerciseId,languageId:ids.en,text:audio.text,generationMethod:"local_tts",reviewStatus:"pending_generation",contentVersion:1}).onConflictDoUpdate({target:[s.audioAssets.exerciseId,s.audioAssets.contentVersion],set:{text:audio.text,reviewStatus:"pending_generation"}});

const vocabulary=[
 ["on track","進度符合計畫","按計畫進行","We're on track to finish the draft by Thursday.",extraCourses[0].unitId],
 ["waiting on","尚在等待某人或事項","還在等待","We're still waiting on the final confirmation.",extraCourses[0].unitId],
 ["main blocker","最主要的阻礙","主要阻礙","The main blocker is the missing test data.",extraCourses[0].unitId],
 ["keep you posted","持續提供最新消息","隨時向你更新","I'll keep you posted if anything changes.",extraCourses[0].unitId],
 ["send you an update by","在指定時間前提供更新","在……前提供更新","I'll send you an update by three.",extraCourses[0].unitId],
 ["work for you","某個時間或安排對某人方便","對你方便","Would Thursday at two work for you?",extraCourses[1].unitId],
 ["still on for","已安排事項仍照原定計畫","仍照原定計畫","Are we still on for Thursday?",extraCourses[1].unitId],
 ["move it to","將安排改到另一時間","改到……","Could we move it to Friday morning?",extraCourses[1].unitId],
 ["suit you better","替代安排是否更合適","對你更方便","Does ten o'clock suit you better?",extraCourses[1].unitId],
 ["updated invitation","更新後的會議邀請","更新後的邀請","I'll send an updated invitation shortly.",extraCourses[1].unitId],
] as const;
for(let index=0;index<vocabulary.length;index++){const[form,definition,translation,example,unitId]=vocabulary[index];const suffix=String(index+1).padStart(3,"0");const lexemeId=`40000000-0000-4000-8000-000000000${suffix}`;const senseId=`41000000-0000-4000-8000-000000000${suffix}`;await db.insert(s.lexemes).values({id:lexemeId,languageId:ids.en,canonicalForm:form,normalizedForm:form,type:"phrase",metadata:{source:"LaLea authored prototype"}}).onConflictDoNothing();await db.insert(s.lexemeSenses).values({id:senseId,lexemeId,definitionLanguageId:ids.en,definition,status:"approved",source:{type:"project_authored",reviewStatus:"draft"}}).onConflictDoNothing();await db.insert(s.senseTranslations).values({lexemeSenseId:senseId,languageId:ids.zh,translation,status:"approved"}).onConflictDoNothing();await db.insert(s.vocabularyExamples).values({lexemeSenseId:senseId,textLanguageId:ids.en,text:example,translationLanguageId:ids.zh,status:"approved",source:{type:"project_authored"}}).onConflictDoNothing();await db.insert(s.lessonVocabulary).values({learningUnitId:unitId,lexemeSenseId:senseId,position:index%5+1}).onConflictDoNothing()}
await db.execute(sql`select 1`); await pool.end();
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
