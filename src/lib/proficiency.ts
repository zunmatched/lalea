export const PROFICIENCY_DAY_POINTS = 1;
export const DEFAULT_REVIEW_WINDOW_DAYS = 3;
const TIME_ZONE = "Asia/Taipei";

function dayKey(date: Date, timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export type ScoringChallengeType = "spell" | "dictation";
export type ProficiencyEvent = { isCorrect: boolean; createdAt: Date; challengeType: ScoringChallengeType };

export function proficiencyMax(windowDays: number) {
  return windowDays * PROFICIENCY_DAY_POINTS;
}

export function computeProficiency(events: ProficiencyEvent[], windowDays: number, now = new Date(), timeZone = TIME_ZONE) {
  const windowKeys = new Set<string>();
  for (let i = 0; i < windowDays; i++) windowKeys.add(dayKey(new Date(now.getTime() - i * 86_400_000), timeZone));
  const byDay = new Map<string, { spell: boolean; dictation: boolean }>();
  for (const event of events) {
    const key = dayKey(event.createdAt, timeZone);
    if (!windowKeys.has(key)) continue;
    const entry = byDay.get(key) ?? { spell: false, dictation: false };
    if (event.isCorrect) entry[event.challengeType] = true;
    byDay.set(key, entry);
  }
  let score = 0;
  for (const day of byDay.values()) if (day.spell && day.dictation) score += PROFICIENCY_DAY_POINTS;
  return score;
}

export function reviewedOnDay(events: { createdAt: Date }[], day: Date, timeZone = TIME_ZONE) {
  const key = dayKey(day, timeZone);
  return events.some((event) => dayKey(event.createdAt, timeZone) === key);
}

// Whether a word was actually scored (both typing types answered correctly) on the given day —
// used for the daily quiz-completion count, independent of the rolling window size.
export function scoredOnDay(events: ProficiencyEvent[], day: Date, timeZone = TIME_ZONE) {
  const key = dayKey(day, timeZone);
  let spell = false, dictation = false;
  for (const event of events) {
    if (!event.isCorrect || dayKey(event.createdAt, timeZone) !== key) continue;
    if (event.challengeType === "spell") spell = true; else dictation = true;
  }
  return spell && dictation;
}
