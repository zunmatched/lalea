import { describe, expect, it } from "vitest";
import { computeProficiency, PROFICIENCY_DAY_POINTS, PROFICIENCY_MAX, reviewedOnDay } from "./proficiency";

const day = (offset: number) => new Date(Date.UTC(2026, 0, 10 + offset, 4, 0, 0)); // ~noon Asia/Taipei

describe("computeProficiency", () => {
  it("scores an empty history as zero", () => {
    expect(computeProficiency([], day(0))).toBe(0);
  });

  it("gives no points when only one of the two typing types is correct that day", () => {
    expect(computeProficiency([{ isCorrect: true, createdAt: day(0), challengeType: "spell" }], day(0))).toBe(0);
  });

  it("gives full points once both spell and dictation are correct the same day", () => {
    const events = [
      { isCorrect: true, createdAt: day(0), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(0), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, day(0))).toBe(PROFICIENCY_DAY_POINTS);
  });

  it("takes the best of multiple attempts of the same type on the same day", () => {
    const events = [
      { isCorrect: false, createdAt: day(0), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(0), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(0), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, day(0))).toBe(PROFICIENCY_DAY_POINTS);
  });

  it("an all-wrong day scores zero for that day", () => {
    const events = [
      { isCorrect: false, createdAt: day(0), challengeType: "spell" as const },
      { isCorrect: false, createdAt: day(0), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, day(0))).toBe(0);
  });

  it("accumulates across the 5-day window, both types correct each day", () => {
    const events = [0, 1, 2, 3, 4].flatMap((offset) => [
      { isCorrect: true, createdAt: day(-offset), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(-offset), challengeType: "dictation" as const },
    ]);
    expect(computeProficiency(events, day(0))).toBe(PROFICIENCY_MAX);
  });

  it("drops a day out of the window once it falls more than 5 days behind", () => {
    const events = [
      { isCorrect: true, createdAt: day(-5), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(-5), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, day(0))).toBe(0);
  });

  it("keeps a day exactly at the 5-day edge", () => {
    const events = [
      { isCorrect: true, createdAt: day(-4), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(-4), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, day(0))).toBe(PROFICIENCY_DAY_POINTS);
  });
});

describe("reviewedOnDay", () => {
  it("is false with no events", () => {
    expect(reviewedOnDay([], day(0))).toBe(false);
  });
  it("is true for a correct or incorrect review the same day", () => {
    expect(reviewedOnDay([{ createdAt: day(0) }], day(0))).toBe(true);
  });
  it("is false when the only review was on a different day", () => {
    expect(reviewedOnDay([{ createdAt: day(-1) }], day(0))).toBe(false);
  });
});
