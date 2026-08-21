import { db } from "@/db/client";
import { masteryStates, unitRuns, userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { and, count, eq } from "drizzle-orm";

export async function GET() {
  const userId = requireUserId();
  const [path] = await db.select({ id: userLearningPaths.id }).from(userLearningPaths).where(eq(userLearningPaths.userId, userId)).limit(1);
  if (!path) return Response.json({ completedUnits: 0, inProgressUnits: 0, mastery: [] });
  const [[completed], [inProgress], mastery] = await Promise.all([
    db.select({ value: count() }).from(unitRuns).where(and(eq(unitRuns.userLearningPathId, path.id), eq(unitRuns.status, "completed"))),
    db.select({ value: count() }).from(unitRuns).where(and(eq(unitRuns.userLearningPathId, path.id), eq(unitRuns.status, "in_progress"))),
    db.select({ dimension: masteryStates.dimension, intervalDays: masteryStates.intervalDays, nextReviewAt: masteryStates.nextReviewAt }).from(masteryStates).where(eq(masteryStates.userLearningPathId, path.id)),
  ]);
  return Response.json({ completedUnits: completed.value, inProgressUnits: inProgress.value, mastery });
}
