import { describe, expect, it } from "vitest";
import { computeProficiency, correctTypeOnDay, PROFICIENCY_DAY_POINTS, proficiencyMax, reviewedOnDay, scoredOnDay } from "./proficiency";

const day = (offset: number) => new Date(Date.UTC(2026, 0, 10 + offset, 4, 0, 0)); // ~noon Asia/Taipei
const later = (base: Date, minutes: number) => new Date(base.getTime() + minutes * 60_000);
const WINDOW = 3;
const MAX = proficiencyMax(WINDOW);

describe("computeProficiency", () => {
  it("scores an empty history as zero", () => {
    expect(computeProficiency([], WINDOW, day(0))).toBe(0);
  });

  it("gives no points when only one of the two typing types is correct that day", () => {
    expect(computeProficiency([{ isCorrect: true, createdAt: day(0), challengeType: "spell" }], WINDOW, day(0))).toBe(0);
  });

  it("gives full points once both spell and dictation are correct the same day", () => {
    const events = [
      { isCorrect: true, createdAt: day(0), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(0), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, WINDOW, day(0))).toBe(PROFICIENCY_DAY_POINTS);
  });

  it("a later correct attempt overrides an earlier wrong attempt of the same type and day", () => {
    const events = [
      { isCorrect: false, createdAt: day(0), challengeType: "spell" as const },
      { isCorrect: true, createdAt: later(day(0), 5), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(0), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, WINDOW, day(0))).toBe(PROFICIENCY_DAY_POINTS);
  });

  it("a later wrong attempt overrides an earlier correct attempt of the same type and day", () => {
    const events = [
      { isCorrect: true, createdAt: day(0), challengeType: "spell" as const },
      { isCorrect: false, createdAt: later(day(0), 5), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(0), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, WINDOW, day(0))).toBe(0);
  });

  it("an all-wrong day scores zero for that day", () => {
    const events = [
      { isCorrect: false, createdAt: day(0), challengeType: "spell" as const },
      { isCorrect: false, createdAt: day(0), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, WINDOW, day(0))).toBe(0);
  });

  it("accumulates across the window, both types correct each day", () => {
    const events = [0, 1, 2].flatMap((offset) => [
      { isCorrect: true, createdAt: day(-offset), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(-offset), challengeType: "dictation" as const },
    ]);
    expect(computeProficiency(events, WINDOW, day(0))).toBe(MAX);
  });

  it("drops a day out of the window once it falls behind the window size", () => {
    const events = [
      { isCorrect: true, createdAt: day(-WINDOW), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(-WINDOW), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, WINDOW, day(0))).toBe(0);
  });

  it("keeps a day exactly at the window edge", () => {
    const events = [
      { isCorrect: true, createdAt: day(-(WINDOW - 1)), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(-(WINDOW - 1)), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, WINDOW, day(0))).toBe(PROFICIENCY_DAY_POINTS);
  });
});

describe("computeProficiency with decay disabled", () => {
  it("still gives no points when only one of the two typing types is correct that day", () => {
    expect(computeProficiency([{ isCorrect: true, createdAt: day(0), challengeType: "spell" }], WINDOW, day(0), false)).toBe(0);
  });

  it("keeps a day that has fallen out of the recent window instead of dropping it", () => {
    const events = [
      { isCorrect: true, createdAt: day(-WINDOW), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(-WINDOW), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, WINDOW, day(0), false)).toBe(PROFICIENCY_DAY_POINTS);
    // same history still decays back to 0 when decay is enabled (the default)
    expect(computeProficiency(events, WINDOW, day(0))).toBe(0);
  });

  it("caps at the max even with more all-time good days than the window size", () => {
    const events = [0, 10, 20, 30, 40].flatMap((offset) => [
      { isCorrect: true, createdAt: day(-offset), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(-offset), challengeType: "dictation" as const },
    ]);
    expect(computeProficiency(events, WINDOW, day(0), false)).toBe(MAX);
  });

  it("never goes back down just from the passage of time with no new activity", () => {
    const events = [
      { isCorrect: true, createdAt: day(-5), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(-5), challengeType: "dictation" as const },
    ];
    expect(computeProficiency(events, WINDOW, day(0), false)).toBe(PROFICIENCY_DAY_POINTS);
    expect(computeProficiency(events, WINDOW, day(100), false)).toBe(PROFICIENCY_DAY_POINTS);
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

describe("correctTypeOnDay", () => {
  it("is false with no attempts of that type today", () => {
    expect(correctTypeOnDay([], "spell", day(0))).toBe(false);
  });
  it("reflects only the latest attempt of that type today", () => {
    const events = [
      { isCorrect: true, createdAt: day(0), challengeType: "spell" as const },
      { isCorrect: false, createdAt: later(day(0), 5), challengeType: "spell" as const },
    ];
    expect(correctTypeOnDay(events, "spell", day(0))).toBe(false);
  });
});

describe("scoredOnDay", () => {
  it("is false until both types are correct that day", () => {
    expect(scoredOnDay([{ isCorrect: true, createdAt: day(0), challengeType: "spell" }], day(0))).toBe(false);
  });
  it("is true once both types are correct that day", () => {
    const events = [
      { isCorrect: true, createdAt: day(0), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(0), challengeType: "dictation" as const },
    ];
    expect(scoredOnDay(events, day(0))).toBe(true);
  });
  it("does not count a correct answer from a different day", () => {
    const events = [
      { isCorrect: true, createdAt: day(-1), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(0), challengeType: "dictation" as const },
    ];
    expect(scoredOnDay(events, day(0))).toBe(false);
  });
  it("turns false again if the last attempt of the day for a type is wrong", () => {
    const events = [
      { isCorrect: true, createdAt: day(0), challengeType: "spell" as const },
      { isCorrect: true, createdAt: day(0), challengeType: "dictation" as const },
      { isCorrect: false, createdAt: later(day(0), 5), challengeType: "dictation" as const },
    ];
    expect(scoredOnDay(events, day(0))).toBe(false);
  });
});
