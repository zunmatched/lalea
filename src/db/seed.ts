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
  { id:"10000000-0000-4000-8000-000000000004", position:4, type:"branched_dialogue", prompt:"Alex: Let's wait until everything is ready. 選擇合作式的澄清。", content:{ options:[{id:"clarify",text:"Could you clarify what you mean by “everything”?"},{id:"nonsense",text:"That doesn't make sense."}]}, answer:{correctIds:["clarify"]}, feedback:{correct:"語氣清楚且具有合作感。",incorrect:"直接否定容易顯得不耐煩，應先請對方澄清。"}},
];
for (const exercise of exercises) await db.insert(s.exercises).values({ ...exercise, learningUnitId: ids.unit }).onConflictDoUpdate({ target: s.exercises.id, set: { prompt: exercise.prompt, content: exercise.content, answer: exercise.answer, feedback: exercise.feedback } });
await db.execute(sql`select 1`); await pool.end();
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
