import { db } from "@/db/client";
import { reviewEvents,unitRuns,userLearningPaths,userVocabulary,vocabularyMasteryStates } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { computeProficiency,proficiencyMax,scoredOnDay } from "@/lib/proficiency";
import { and,count,eq,inArray } from "drizzle-orm";

export async function GET() {
  const userId = requireUserId();
  const [path] = await db.select({ id: userLearningPaths.id, reviewWindowDays: userLearningPaths.reviewWindowDays, decayEnabled: userLearningPaths.decayEnabled }).from(userLearningPaths).where(eq(userLearningPaths.userId, userId)).limit(1);
  if (!path) return Response.json({ completedUnits: 0, inProgressUnits: 0, vocabulary: { total: 0, learned: 0, dueToday: 0, averageProficiency: 0, completedToday: 0 } });

  const [[completed], [inProgress], states] = await Promise.all([
    db.select({ value: count() }).from(unitRuns).where(and(eq(unitRuns.userLearningPathId, path.id), eq(unitRuns.status, "completed"))),
    db.select({ value: count() }).from(unitRuns).where(and(eq(unitRuns.userLearningPathId, path.id), eq(unitRuns.status, "in_progress"))),
    db.select({ id: vocabularyMasteryStates.id }).from(vocabularyMasteryStates)
      .innerJoin(userVocabulary, eq(vocabularyMasteryStates.userVocabularyId, userVocabulary.id))
      .innerJoin(userLearningPaths, eq(userVocabulary.userLearningPathId, userLearningPaths.id))
      .where(eq(userLearningPaths.userId, userId)),
  ]);

  const events = states.length ? await db.select({ masteryStateId: reviewEvents.vocabularyMasteryStateId, isCorrect: reviewEvents.isCorrect, createdAt: reviewEvents.createdAt, challengeType: reviewEvents.challengeType }).from(reviewEvents).where(inArray(reviewEvents.vocabularyMasteryStateId, states.map((s) => s.id))) : [];
  const eventsByState = new Map<string, { isCorrect: boolean; createdAt: Date; challengeType: "spell" | "dictation" }[]>();
  for (const event of events) { if (event.challengeType !== "spell" && event.challengeType !== "dictation") continue; const list = eventsByState.get(event.masteryStateId) ?? []; list.push({ isCorrect: event.isCorrect, createdAt: event.createdAt, challengeType: event.challengeType }); eventsByState.set(event.masteryStateId, list) }
  const max = proficiencyMax(path.reviewWindowDays);
  const now = new Date();
  const proficiencies = states.map((state) => computeProficiency(eventsByState.get(state.id) ?? [], path.reviewWindowDays, now, path.decayEnabled));
  const completedTodayCount = states.filter((state) => scoredOnDay(eventsByState.get(state.id) ?? [], now)).length;

  const [[totalVocab], [learnedVocab]] = await Promise.all([
    db.select({ value: count() }).from(userVocabulary).innerJoin(userLearningPaths, eq(userVocabulary.userLearningPathId, userLearningPaths.id)).where(eq(userLearningPaths.userId, userId)),
    db.select({ value: count() }).from(userVocabulary).innerJoin(userLearningPaths, eq(userVocabulary.userLearningPathId, userLearningPaths.id)).where(and(eq(userLearningPaths.userId, userId), eq(userVocabulary.status, "learned"))),
  ]);

  const vocabulary = {
    total: totalVocab.value,
    learned: learnedVocab.value,
    dueToday: proficiencies.filter((value) => value < max).length,
    averageProficiency: proficiencies.length ? Math.round(proficiencies.reduce((sum, value) => sum + value, 0) / proficiencies.length) : 0,
    completedToday: completedTodayCount,
  };

  return Response.json({ completedUnits: completed.value, inProgressUnits: inProgress.value, vocabulary });
}
