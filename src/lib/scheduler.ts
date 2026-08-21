export type Rating = "forgot" | "hard" | "mastered" | "too_easy";
export type ReviewState = { intervalDays: number; nextReviewAt: Date | null; reviewCount: number };
export type ReviewInput = { isCorrect: boolean; rating?: Rating; reviewedAt: Date };
export function nextIntervalDays(current: number, correct: boolean, rating?: Rating) {
  if (!correct || rating === "forgot") return current === 0 ? 0 : 1;
  if (current === 0) return rating === "hard" ? 1 : rating === "too_easy" ? 4 : 2;
  const multiplier = rating === "hard" ? 1.2 : rating === "too_easy" ? 3 : 2;
  return Math.min(90, Math.max(1, Math.round(current * multiplier)));
}

export function scheduleReview(current: ReviewState, input: ReviewInput) {
  const intervalDays = nextIntervalDays(current.intervalDays, input.isCorrect, input.rating);
  const firstShortRetry = current.reviewCount === 0 && (!input.isCorrect || input.rating === "forgot");
  const nextReviewAt = new Date(input.reviewedAt.getTime() + (firstShortRetry ? 10 * 60_000 : intervalDays * 86_400_000));
  const reason = !input.isCorrect ? "incorrect_reset" : input.rating === "forgot" ? "self_rated_forgot" : input.rating === "hard" ? "hard_x1_2" : input.rating === "too_easy" ? "too_easy_x3" : "mastered_x2";
  return { intervalDays, nextReviewAt, reviewCount: current.reviewCount + 1, reason, schedulerVersion: "mvp-v1" };
}

export function replayReviewEvents(events: ReviewInput[]) {
  return events.reduce((state, event) => scheduleReview(state, event), { intervalDays: 0, nextReviewAt: null, reviewCount: 0 } as ReviewState & { reason?: string; schedulerVersion?: string });
}
