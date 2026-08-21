import { describe, expect, it } from "vitest";
import { nextIntervalDays, replayReviewEvents, scheduleReview } from "./scheduler";
describe("nextIntervalDays", () => {
  it("schedules mistakes earlier", () => { expect(nextIntervalDays(4, false)).toBe(1); expect(nextIntervalDays(4, true, "mastered")).toBe(8); });
  it("caps intervals", () => expect(nextIntervalDays(60, true, "too_easy")).toBe(90));
});
describe("review scheduling",()=>{
  it("uses a ten minute first retry and explains the rule",()=>{const now=new Date("2026-01-01T00:00:00Z");const result=scheduleReview({intervalDays:0,nextReviewAt:null,reviewCount:0},{isCorrect:false,reviewedAt:now});expect(result.reason).toBe("incorrect_reset");expect(result.nextReviewAt.toISOString()).toBe("2026-01-01T00:10:00.000Z")});
  it("replays immutable inputs to the same derived state",()=>{const events=[{isCorrect:true as const,rating:"mastered" as const,reviewedAt:new Date("2026-01-01")},{isCorrect:true as const,rating:"hard" as const,reviewedAt:new Date("2026-01-03")}];expect(replayReviewEvents(events)).toEqual(scheduleReview(scheduleReview({intervalDays:0,nextReviewAt:null,reviewCount:0},events[0]),events[1]))});
});
