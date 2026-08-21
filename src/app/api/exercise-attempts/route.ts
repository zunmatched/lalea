import { db } from "@/db/client";
import { exerciseAttempts, exercises, unitRuns, userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const input = z.object({
  unitRunId: z.string().uuid(), exerciseId: z.string().uuid(), clientEventId: z.string().uuid(),
  selectedIds: z.array(z.string()).min(1), displayOrder: z.array(z.string()).min(1),
});
type Answer = { correctIds: string[] };
type Feedback = { correct: string; incorrect: string };
type Content = { options?: Array<{ id: string; text: string }> };

function result(exercise: typeof exercises.$inferSelect, isCorrect: boolean, idempotent: boolean) {
  const answer = exercise.answer as Answer; const feedback = exercise.feedback as Feedback;
  return { isCorrect, correctIds: answer.correctIds, message: isCorrect ? feedback.correct : feedback.incorrect, idempotent };
}

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid answer" }, { status: 400 });
  const userId = requireUserId(); const data = parsed.data;
  const [owned] = await db.select({ id: unitRuns.id, unitId: unitRuns.learningUnitId }).from(unitRuns)
    .innerJoin(userLearningPaths, eq(unitRuns.userLearningPathId, userLearningPaths.id))
    .where(and(eq(unitRuns.id, data.unitRunId), eq(userLearningPaths.userId, userId), eq(unitRuns.status, "in_progress"))).limit(1);
  if (!owned) return Response.json({ error: "Not found" }, { status: 404 });

  const [old] = await db.select().from(exerciseAttempts)
    .where(and(eq(exerciseAttempts.unitRunId, data.unitRunId), eq(exerciseAttempts.clientEventId, data.clientEventId))).limit(1);
  if (old) {
    const [originalExercise] = await db.select().from(exercises).where(eq(exercises.id, old.exerciseId)).limit(1);
    return Response.json(result(originalExercise, old.isCorrect, true));
  }

  const [exercise] = await db.select().from(exercises)
    .where(and(eq(exercises.id, data.exerciseId), eq(exercises.learningUnitId, owned.unitId))).limit(1);
  if (!exercise) return Response.json({ error: "Exercise not found" }, { status: 404 });
  const optionIds = ((exercise.content as Content).options ?? []).map((option) => option.id);
  const validSelection = data.selectedIds.every((id) => optionIds.includes(id));
  const validOrder = data.displayOrder.length === optionIds.length && new Set(data.displayOrder).size === optionIds.length && data.displayOrder.every((id) => optionIds.includes(id));
  if (!validSelection || !validOrder) return Response.json({ error: "Invalid option IDs" }, { status: 400 });

  const correctIds = (exercise.answer as Answer).correctIds;
  const isCorrect = JSON.stringify(data.selectedIds) === JSON.stringify(correctIds);
  const inserted = await db.transaction(async (tx) => {
    const rows = await tx.insert(exerciseAttempts).values({ unitRunId: data.unitRunId, exerciseId: data.exerciseId, clientEventId: data.clientEventId, response: { selectedIds: data.selectedIds }, displayOrder: data.displayOrder, isCorrect }).onConflictDoNothing().returning({ id: exerciseAttempts.id });
    if (rows.length) await tx.update(unitRuns).set({ currentPosition: exercise.position }).where(eq(unitRuns.id, data.unitRunId));
    return rows.length > 0;
  });
  if (!inserted) {
    const [concurrent] = await db.select().from(exerciseAttempts).where(and(eq(exerciseAttempts.unitRunId, data.unitRunId), eq(exerciseAttempts.clientEventId, data.clientEventId))).limit(1);
    const [originalExercise] = await db.select().from(exercises).where(eq(exercises.id, concurrent.exerciseId)).limit(1);
    return Response.json(result(originalExercise, concurrent.isCorrect, true));
  }
  return Response.json(result(exercise, isCorrect, false));
}
