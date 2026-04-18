import { describe, expect, it } from "vitest";
import { initialState, schedule } from "./sm2";

function approx(a: number, b: number, eps = 0.001) {
  expect(Math.abs(a - b)).toBeLessThan(eps);
}

describe("SM-2 algorithm", () => {
  it("initial state has efactor=2.5, interval=0, repetitions=0", () => {
    const s = initialState();
    expect(s.efactor).toBe(2.5);
    expect(s.interval).toBe(0);
    expect(s.repetitions).toBe(0);
  });

  it("quality=5: first rep → interval=1, efactor rises", () => {
    const s = schedule(initialState(), 5);
    expect(s.interval).toBe(1);
    expect(s.repetitions).toBe(1);
    approx(s.efactor, 2.6); // 2.5 + 0.1
  });

  it("quality=5: second rep → interval=6", () => {
    const s1 = schedule(initialState(), 5);
    const s2 = schedule(s1, 5);
    expect(s2.interval).toBe(6);
    expect(s2.repetitions).toBe(2);
  });

  it("quality=5: third rep → interval=round(6 * 2.6)=16", () => {
    const s1 = schedule(initialState(), 5);
    const s2 = schedule(s1, 5);
    const s3 = schedule(s2, 5);
    expect(s3.interval).toBe(16); // round(6 * 2.6) = round(15.6) = 16
    expect(s3.repetitions).toBe(3);
  });

  it("quality=3: efactor decreases by 0.14", () => {
    const s = schedule(initialState(), 3);
    expect(s.repetitions).toBe(1);
    // EF = 2.5 + (0.1 - 2*(0.08 + 2*0.02)) = 2.5 - 0.14 = 2.36
    approx(s.efactor, 2.36);
  });

  it("quality=4: efactor stays neutral (no change)", () => {
    const s = schedule(initialState(), 4);
    expect(s.repetitions).toBe(1);
    // EF = 2.5 + (0.1 - 1*(0.08 + 1*0.02)) = 2.5 + 0 = 2.5
    approx(s.efactor, 2.5);
  });

  it("quality=0: resets interval and repetitions, lowers efactor", () => {
    // First get some state
    const s1 = schedule(initialState(), 5);
    const s2 = schedule(s1, 5);
    expect(s2.repetitions).toBe(2);

    // Now fail
    const s3 = schedule(s2, 0);
    expect(s3.repetitions).toBe(0);
    expect(s3.interval).toBe(1);
    // efactor should have dropped: 2.6 + (0.1 - 5*0.08 + 25*0.02) = 2.6 - 0.8 = 1.8
    expect(s3.efactor).toBeGreaterThanOrEqual(1.3);
  });

  it("efactor never falls below 1.3 (MIN_EFACTOR floor)", () => {
    let s = initialState();
    // Grade 0 repeatedly — efactor should hit floor and stay there
    for (let i = 0; i < 10; i++) {
      s = schedule(s, 0);
    }
    expect(s.efactor).toBeGreaterThanOrEqual(1.3);
    approx(s.efactor, 1.3);
  });

  it("quality=1: resets repetitions (failed recall)", () => {
    const s = schedule(initialState(), 1);
    expect(s.repetitions).toBe(0);
    expect(s.interval).toBe(1);
  });

  it("quality=2: resets repetitions (failed recall)", () => {
    const s = schedule(initialState(), 2);
    expect(s.repetitions).toBe(0);
    expect(s.interval).toBe(1);
  });

  it("nextReviewAt is approximately interval days from now", () => {
    const before = Date.now();
    const s = schedule(initialState(), 5); // interval=1 → 1 day
    const expected = before + 1 * 24 * 60 * 60 * 1000;
    expect(Math.abs(s.nextReviewAt.getTime() - expected)).toBeLessThan(1000);
  });

  it("5-iteration canonical sequence matches paper values (quality=5 throughout)", () => {
    // iteration 1: interval=1, EF=2.6
    // iteration 2: interval=6, EF=2.7
    // iteration 3: interval=round(6*2.7)=16, EF=2.8
    // iteration 4: interval=round(16*2.8)=45, EF=2.9
    // iteration 5: interval=round(45*2.9)=131, EF=3.0
    const expected = [
      { interval: 1, repetitions: 1, efactor: 2.6 },
      { interval: 6, repetitions: 2, efactor: 2.7 },
      { interval: 16, repetitions: 3, efactor: 2.8 },
      { interval: 45, repetitions: 4, efactor: 2.9 },
      { interval: 131, repetitions: 5, efactor: 3.0 },
    ];

    let state = initialState();
    for (const exp of expected) {
      state = schedule(state, 5);
      expect(state.interval).toBe(exp.interval);
      expect(state.repetitions).toBe(exp.repetitions);
      approx(state.efactor, exp.efactor, 0.01);
    }
  });
});
