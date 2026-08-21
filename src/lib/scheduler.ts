export type Rating = "forgot" | "hard" | "mastered" | "too_easy";
export function nextIntervalDays(current: number, correct: boolean, rating?: Rating) {
  if (!correct || rating === "forgot") return current === 0 ? 0 : 1;
  if (current === 0) return rating === "hard" ? 1 : rating === "too_easy" ? 4 : 2;
  const multiplier = rating === "hard" ? 1.2 : rating === "too_easy" ? 3 : 2;
  return Math.min(90, Math.max(1, Math.round(current * multiplier)));
}

