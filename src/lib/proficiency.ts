export const PROFICIENCY_WINDOW_DAYS = 5;
export const PROFICIENCY_DAY_POINTS = 20;
export const PROFICIENCY_MAX = PROFICIENCY_WINDOW_DAYS * PROFICIENCY_DAY_POINTS;
const TIME_ZONE = "Asia/Taipei";

function dayKey(date: Date, timeZone = TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export type ProficiencyEvent = { isCorrect: boolean; createdAt: Date };

export function computeProficiency(events: ProficiencyEvent[], now = new Date(), timeZone = TIME_ZONE) {
  const windowKeys = new Set<string>();
  for (let i = 0; i < PROFICIENCY_WINDOW_DAYS; i++) windowKeys.add(dayKey(new Date(now.getTime() - i * 86_400_000), timeZone));
  const bestByDay = new Map<string, boolean>();
  for (const event of events) {
    const key = dayKey(event.createdAt, timeZone);
    if (!windowKeys.has(key)) continue;
    bestByDay.set(key, (bestByDay.get(key) ?? false) || event.isCorrect);
  }
  let score = 0;
  for (const correct of bestByDay.values()) if (correct) score += PROFICIENCY_DAY_POINTS;
  return score;
}
