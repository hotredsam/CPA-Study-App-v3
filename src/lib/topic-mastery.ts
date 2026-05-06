import { inferBeckerUnitLabel } from "@/lib/becker-units";

export type TopicCardRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export type TopicCardEvidence = {
  srsState: unknown;
  reviews: Array<{
    rating: TopicCardRating;
    reviewedAt: Date;
  }>;
};

export type TopicQuestionEvidence = {
  createdAt: Date;
  feedback: {
    accountingScore: number;
    combinedScore: number;
  } | null;
};

export type TopicChunkEvidence = {
  chapterRef: string | null;
  title: string | null;
  textbook: {
    title: string;
  } | null;
};

export type TopicMasteryEvidence = {
  cardsTotal: number;
  cardsReviewed: number;
  questionsGraded: number;
  confidence: "none" | "low" | "medium" | "high";
};

export type TopicMasteryMetrics = {
  unit: string | null;
  mastery: number;
  errorRate: number | null;
  cardsDue: number;
  lastSeen: Date | null;
  evidence: TopicMasteryEvidence;
};

type SrsState = {
  nextDue: string | null;
  repetitions: number;
  lapses: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function parseSrsState(value: unknown): SrsState {
  if (!isRecord(value)) {
    return { nextDue: null, repetitions: 0, lapses: 0 };
  }

  return {
    nextDue: typeof value.nextDue === "string" ? value.nextDue : null,
    repetitions: typeof value.repetitions === "number" ? Math.max(0, value.repetitions) : 0,
    lapses: typeof value.lapses === "number" ? Math.max(0, value.lapses) : 0,
  };
}

function ratingScore(rating: TopicCardRating) {
  switch (rating) {
    case "EASY":
      return 1;
    case "GOOD":
      return 0.82;
    case "HARD":
      return 0.45;
    case "AGAIN":
      return 0;
  }
}

function cardDue(srsState: SrsState, now: Date) {
  if (!srsState.nextDue) return true;
  const nextDue = new Date(srsState.nextDue);
  return Number.isNaN(nextDue.getTime()) || nextDue <= now;
}

function cardMasteryScore(card: TopicCardEvidence, now: Date) {
  const latestReview = card.reviews[0];
  if (!latestReview) return 0;

  const srsState = parseSrsState(card.srsState);
  const repetitionFactor = Math.min(1, 0.65 + srsState.repetitions * 0.12);
  const lapsePenalty = Math.max(0.6, 1 - srsState.lapses * 0.12);
  const duePenalty = cardDue(srsState, now) ? 0.9 : 1;

  return clamp01(ratingScore(latestReview.rating) * repetitionFactor * lapsePenalty * duePenalty);
}

function recencyWeight(createdAt: Date, now: Date) {
  const ageDays = Math.max(0, (now.getTime() - createdAt.getTime()) / 86_400_000);
  return Math.exp(-ageDays / 60);
}

function readinessAverage(components: Array<{ score: number; weight: number }>) {
  if (components.length === 0) return 0;
  const hasBelowThreshold = components.some((component) => component.score < 0.8);
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  if (totalWeight <= 0) return 0;

  return components.reduce((sum, component) => {
    const capped = hasBelowThreshold ? Math.min(component.score, 0.8) : component.score;
    return sum + capped * component.weight;
  }, 0) / totalWeight;
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function maxDate(values: Array<Date | null | undefined>) {
  const timestamps = values
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime())
    .filter(Number.isFinite);
  return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
}

function confidence(args: {
  cardsTotal: number;
  cardsReviewed: number;
  questionsGraded: number;
}) {
  const evidenceUnits = args.cardsReviewed + args.questionsGraded * 2;
  if (evidenceUnits === 0) return "none";
  if (evidenceUnits < 4 || args.cardsReviewed < Math.min(3, args.cardsTotal)) return "low";
  if (evidenceUnits < 10) return "medium";
  return "high";
}

export function computeTopicMasteryMetrics(args: {
  section: string;
  storedUnit: string | null;
  chunks: TopicChunkEvidence[];
  cards: TopicCardEvidence[];
  questions: TopicQuestionEvidence[];
  storedLastSeen?: Date | null;
  now?: Date;
}): TopicMasteryMetrics {
  const now = args.now ?? new Date();
  const inferredUnit =
    args.chunks
      .map((chunk) =>
        inferBeckerUnitLabel({
          chapterRef: chunk.chapterRef,
          title: chunk.title,
          textbookTitle: chunk.textbook?.title,
          section: args.section,
        }),
      )
      .find((unit): unit is string => Boolean(unit)) ?? args.storedUnit;

  const cardScores = args.cards.map((card) => cardMasteryScore(card, now));
  const cardsReviewed = args.cards.filter((card) => card.reviews.length > 0).length;
  const cardsDue = args.cards.filter((card) => cardDue(parseSrsState(card.srsState), now)).length;
  const cardComponent = args.cards.length > 0 ? average(cardScores) : null;

  const gradedQuestions = args.questions.filter((question) => question.feedback);
  const weightedQuestionScores = gradedQuestions.map((question) => {
    const feedback = question.feedback;
    const rawScore = feedback ? feedback.accountingScore / 10 : 0;
    const weight = recencyWeight(question.createdAt, now);
    return { score: clamp01(rawScore), weight };
  });
  const totalQuestionWeight = weightedQuestionScores.reduce((sum, item) => sum + item.weight, 0);
  const questionComponent =
    totalQuestionWeight > 0
      ? weightedQuestionScores.reduce((sum, item) => sum + item.score * item.weight, 0) / totalQuestionWeight
      : null;

  const components: Array<{ score: number; weight: number }> = [];
  if (questionComponent !== null) components.push({ score: questionComponent, weight: 0.6 });
  if (cardComponent !== null) components.push({ score: cardComponent, weight: questionComponent === null ? 1 : 0.4 });

  const errorRate =
    questionComponent !== null
      ? clamp01(1 - questionComponent)
      : cardsReviewed > 0
        ? clamp01(args.cards.filter((card) => card.reviews[0]?.rating === "AGAIN").length / cardsReviewed)
        : null;

  const reviewDates = args.cards.map((card) => card.reviews[0]?.reviewedAt);
  const questionDates = gradedQuestions.map((question) => question.createdAt);
  const lastSeen = maxDate([...reviewDates, ...questionDates, args.storedLastSeen]);

  return {
    unit: inferredUnit,
    mastery: Math.round(readinessAverage(components) * 100),
    errorRate,
    cardsDue,
    lastSeen,
    evidence: {
      cardsTotal: args.cards.length,
      cardsReviewed,
      questionsGraded: gradedQuestions.length,
      confidence: confidence({
        cardsTotal: args.cards.length,
        cardsReviewed,
        questionsGraded: gradedQuestions.length,
      }),
    },
  };
}
