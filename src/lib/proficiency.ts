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

// The latest attempt of each type on a given day, keyed by day. Retrying a word after getting it
// wrong should let a later correct attempt count — but a later WRONG attempt must also erase an
// earlier correct one, so only the last attempt of the day for each type is ever consulted.
function latestByDayAndType(events: ProficiencyEvent[], timeZone: string) {
  const byDay = new Map<string, Partial<Record<ScoringChallengeType, ProficiencyEvent>>>();
  for (const event of events) {
    const key = dayKey(event.createdAt, timeZone);
    const entry = byDay.get(key) ?? {};
    const existing = entry[event.challengeType];
    if (!existing || event.createdAt > existing.createdAt) entry[event.challengeType] = event;
    byDay.set(key, entry);
  }
  return byDay;
}

// decayEnabled=false：不再看「最近 N 天的滑動視窗」，而是累計歷史上所有兩種題型都答對過的天數（上限一樣是 windowDays）。
// 只要練到滿分過，之後不練也不會再往下掉——只有分數還沒滿、且很久沒練時才會反映在「還沒滿」，不會主動倒扣。
export function computeProficiency(events: ProficiencyEvent[], windowDays: number, now = new Date(), decayEnabled = true, timeZone = TIME_ZONE) {
  const byDay = latestByDayAndType(events, timeZone);
  const max = proficiencyMax(windowDays);
  if (!decayEnabled) {
    let score = 0;
    for (const [, entry] of byDay) if (entry.spell?.isCorrect && entry.dictation?.isCorrect) score += PROFICIENCY_DAY_POINTS;
    return Math.min(score, max);
  }
  const windowKeys = new Set<string>();
  for (let i = 0; i < windowDays; i++) windowKeys.add(dayKey(new Date(now.getTime() - i * 86_400_000), timeZone));
  let score = 0;
  for (const [key, entry] of byDay) {
    if (!windowKeys.has(key)) continue;
    if (entry.spell?.isCorrect && entry.dictation?.isCorrect) score += PROFICIENCY_DAY_POINTS;
  }
  return score;
}

export function reviewedOnDay(events: { createdAt: Date }[], day: Date, timeZone = TIME_ZONE) {
  const key = dayKey(day, timeZone);
  return events.some((event) => dayKey(event.createdAt, timeZone) === key);
}

// Whether a word was actually scored (both typing types' LAST attempt today were correct) —
// used for the daily quiz-completion count, independent of the rolling window size.
export function scoredOnDay(events: ProficiencyEvent[], day: Date, timeZone = TIME_ZONE) {
  return correctTypeOnDay(events, "spell", day, timeZone) && correctTypeOnDay(events, "dictation", day, timeZone);
}

// Whether the LAST attempt of this specific typing type on the given day was correct — a later
// wrong retry overrides an earlier correct one, matching computeProficiency's semantics.
export function correctTypeOnDay(events: ProficiencyEvent[], challengeType: ScoringChallengeType, day: Date, timeZone = TIME_ZONE) {
  const key = dayKey(day, timeZone);
  const todaysOfType = events.filter((event) => event.challengeType === challengeType && dayKey(event.createdAt, timeZone) === key);
  if (!todaysOfType.length) return false;
  return todaysOfType.reduce((latest, event) => (event.createdAt > latest.createdAt ? event : latest)).isCorrect;
}
