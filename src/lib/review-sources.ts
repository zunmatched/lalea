import { db } from "@/db/client";
import { courseVersions,courses,learningUnits,lessonVocabulary,userLearningPaths } from "@/db/schema";
import { eq } from "drizzle-orm";

export const MANUAL_SOURCE_KEY = "manual";
export const MANUAL_SOURCE_LABEL = "自建詞彙";

export async function loadCourseSources(userId: string) {
  const rows = await db.select({ lexemeSenseId: lessonVocabulary.lexemeSenseId, courseId: courses.id, courseTitle: courses.title })
    .from(lessonVocabulary)
    .innerJoin(learningUnits, eq(lessonVocabulary.learningUnitId, learningUnits.id))
    .innerJoin(courseVersions, eq(learningUnits.courseVersionId, courseVersions.id))
    .innerJoin(courses, eq(courseVersions.courseId, courses.id))
    .innerJoin(userLearningPaths, eq(courses.learningPathId, userLearningPaths.learningPathId))
    .where(eq(userLearningPaths.userId, userId));

  const bySense = new Map<string, { key: string; label: string }>();
  const courseLabels = new Map<string, string>();
  for (const row of rows) {
    if (!bySense.has(row.lexemeSenseId)) bySense.set(row.lexemeSenseId, { key: row.courseId, label: row.courseTitle });
    courseLabels.set(row.courseId, row.courseTitle);
  }
  return { bySense, courseLabels };
}

export function sourceFor(bySense: Map<string, { key: string; label: string }>, lexemeSenseId: string) {
  return bySense.get(lexemeSenseId) ?? { key: MANUAL_SOURCE_KEY, label: MANUAL_SOURCE_LABEL };
}
