/**
 * SM-2 spaced repetition algorithm.
 * Reference: Wozniak, P.A. (1990). "Effect of spaced repetition on translation to long-term memory."
 *
 * Quality values:
 *   5 — perfect response
 *   4 — correct after hesitation
 *   3 — correct with serious difficulty
 *   2 — incorrect; correct answer felt easy to recall
 *   1 — incorrect; correct answer remembered
 *   0 — complete blackout
 */

export interface Sm2State {
  efactor: number;
  interval: number;
  repetitions: number;
}

export interface Sm2Result extends Sm2State {
  nextReviewAt: Date;
}

const MIN_EFACTOR = 1.3;

/**
 * Compute the next SM-2 state given the current state and a quality grade.
 * Does not mutate input. Returns the new state + the absolute next-review date.
 */
export function schedule(prev: Sm2State, quality: 0 | 1 | 2 | 3 | 4 | 5): Sm2Result {
  let { efactor, interval, repetitions } = prev;

  if (quality < 3) {
    // Failed recall — reset repetitions, next review is tomorrow
    interval = 1;
    repetitions = 0;
  } else {
    // Successful recall
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * efactor);
    }
    repetitions += 1;
  }

  // Update E-Factor (always, even on failure)
  efactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (efactor < MIN_EFACTOR) efactor = MIN_EFACTOR;

  const nextReviewAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

  return { efactor, interval, repetitions, nextReviewAt };
}

/** Initial state for a new card — due immediately. */
export function initialState(): Sm2State {
  return { efactor: 2.5, interval: 0, repetitions: 0 };
}
