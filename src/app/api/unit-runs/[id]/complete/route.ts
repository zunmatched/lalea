import { db } from "@/db/client";
import { exerciseAttempts, exercises, masteryStates, unitRuns, userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { nextIntervalDays } from "@/lib/scheduler";
import { and, eq } from "drizzle-orm";

const dimensions = ["reading_recognition", "listening_recognition", "active_recall"] as const;
function dimensionFor(type: string): (typeof dimensions)[number] {
  if (type === "listening_choice") return "listening_recognition";
  if (type === "reading_choice") return "reading_recognition";
  return "active_recall";
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const userId = requireUserId(); const { id } = await context.params;
  const [owned] = await db.select({ id: unitRuns.id, status: unitRuns.status, unitId: unitRuns.learningUnitId, pathId: unitRuns.userLearningPathId }).from(unitRuns)
    .innerJoin(userLearningPaths, eq(unitRuns.userLearningPathId, userLearningPaths.id))
    .where(and(eq(unitRuns.id, id), eq(userLearningPaths.userId, userId))).limit(1);
  if (!owned) return Response.json({ error: "Not found" }, { status: 404 });
  if (owned.status === "completed") return Response.json({ status: "completed", idempotent: true });
  if (owned.status !== "in_progress") return Response.json({ error: "Run cannot be completed" }, { status: 409 });

  const unitExercises = await db.select({ id: exercises.id, type: exercises.type }).from(exercises).where(eq(exercises.learningUnitId, owned.unitId));
  const attempts = await db.select({ exerciseId: exerciseAttempts.exerciseId, isCorrect: exerciseAttempts.isCorrect, type: exercises.type }).from(exerciseAttempts)
    .innerJoin(exercises, eq(exerciseAttempts.exerciseId, exercises.id)).where(eq(exerciseAttempts.unitRunId, id));
  const answered = new Set(attempts.map((attempt) => attempt.exerciseId));
  if (unitExercises.some((exercise) => !answered.has(exercise.id))) return Response.json({ error: "All exercises must be answered first" }, { status: 409 });

  const now = new Date(); const key = `unit:${owned.unitId}`;
  await db.transaction(async (tx) => {
    for (const dimension of dimensions) {
      const relevant = attempts.filter((attempt) => dimensionFor(attempt.type) === dimension);
      if (!relevant.length) continue;
      const [previous] = await tx.select().from(masteryStates).where(and(eq(masteryStates.userLearningPathId, owned.pathId), eq(masteryStates.key, key), eq(masteryStates.dimension, dimension))).limit(1);
      const intervalDays = nextIntervalDays(previous?.intervalDays ?? 0, relevant.every((attempt) => attempt.isCorrect));
      const nextReviewAt = new Date(now.getTime() + intervalDays * 86_400_000);
      await tx.insert(masteryStates).values({ userLearningPathId: owned.pathId, key, dimension, intervalDays, nextReviewAt })
        .onConflictDoUpdate({ target: [masteryStates.userLearningPathId, masteryStates.key, masteryStates.dimension], set: { intervalDays, nextReviewAt } });
    }
    await tx.update(unitRuns).set({ status: "completed", completedAt: now }).where(and(eq(unitRuns.id, id), eq(unitRuns.status, "in_progress")));
  });
  return Response.json({ status: "completed", idempotent: false });
}
