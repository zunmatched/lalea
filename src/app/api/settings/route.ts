import { db } from "@/db/client";
import { userLearningPaths } from "@/db/schema";
import { requireUserId } from "@/lib/dev-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const userId = requireUserId();
  const [path] = await db.select({ dailyGoalMinutes: userLearningPaths.dailyGoalMinutes, reviewWindowDays: userLearningPaths.reviewWindowDays }).from(userLearningPaths).where(eq(userLearningPaths.userId, userId)).limit(1);
  if (!path) return Response.json({ error: "Learning path not found" }, { status: 404 });
  return Response.json(path);
}

const input = z.object({ dailyGoalMinutes: z.number().int().min(1).max(120).optional(), reviewWindowDays: z.number().int().min(1).max(10).optional() });
export async function PATCH(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid settings" }, { status: 400 });
  if (!Object.keys(parsed.data).length) return Response.json({ error: "No fields to update" }, { status: 400 });
  const userId = requireUserId();
  const [updated] = await db.update(userLearningPaths).set(parsed.data).where(eq(userLearningPaths.userId, userId)).returning({ dailyGoalMinutes: userLearningPaths.dailyGoalMinutes, reviewWindowDays: userLearningPaths.reviewWindowDays });
  if (!updated) return Response.json({ error: "Learning path not found" }, { status: 404 });
  return Response.json(updated);
}
