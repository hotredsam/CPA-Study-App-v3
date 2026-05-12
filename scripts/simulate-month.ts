import { AnkiRating, Prisma, PrismaClient } from "@prisma/client";
import { resetStudyProgressPreservingLibrary } from "../src/lib/study-reset";
import { assertLocalDatabaseUrl, loadDotEnv } from "./lib/db-safety";

const DAYS_TO_SIMULATE = 30;
const QUESTIONS_PER_RECORDING = 3;
const CARDS_PER_DAY = 8;

const RUBRIC_ITEMS = [
  ["acc-conceptual-understanding", "Conceptual Understanding", "accounting"],
  ["acc-application-accuracy", "Application Accuracy", "accounting"],
  ["acc-standard-citation", "Standard Citation", "accounting"],
  ["acc-calculation-mechanics", "Calculation Mechanics", "accounting"],
  ["acc-journal-entry", "Journal Entry", "accounting"],
  ["con-risk-identification", "Risk Identification", "consulting"],
  ["con-professional-judgement", "Professional Judgement", "consulting"],
  ["con-communication-clarity", "Communication Clarity", "consulting"],
  ["con-synthesis", "Synthesis", "consulting"],
  ["con-recommendation-quality", "Recommendation Quality", "consulting"],
] as const;

function dayAtStart(offsetFromStart: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - (DAYS_TO_SIMULATE - 1 - offsetFromStart));
  date.setHours(18, 30, 0, 0);
  return date;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(10, Number(value.toFixed(1))));
}

function feedbackItems(score: number): Prisma.JsonArray {
  return RUBRIC_ITEMS.map(([key, label, domain], index): Prisma.JsonObject => ({
    key,
    label,
    comment: `${label}: simulated ${domain} evidence for a no-token month dry run.`,
    score: clampScore(score - (index % 3) * 0.4),
    provisional: true,
  }));
}

function extractedQuestion(day: number, question: number, topicName: string): Prisma.JsonObject {
  const number = day * QUESTIONS_PER_RECORDING + question + 1;
  return {
    question: `Simulation question ${number}: apply ${topicName} to a Becker-style fact pattern.`,
    choices: [
      { label: "A", text: "Recognize the rule too early." },
      { label: "B", text: "Apply the exception only when the criteria are met." },
      { label: "C", text: "Ignore the disclosure requirement." },
      { label: "D", text: "Defer all judgment until year-end." },
    ],
    userAnswer: question % 3 === 0 ? "A" : "B",
    correctAnswer: "B",
    beckerExplanation: `Simulated explanation for ${topicName}; generated locally without an AI call.`,
    section: "FAR",
    _precision: "provisional",
  };
}

function transcript(day: number, question: number, topicName: string): Prisma.JsonObject {
  return {
    language: "en",
    segments: [
      {
        start: question * 600,
        end: question * 600 + 90,
        text: `I am working through ${topicName}. First I identify the rule, then I test the exception and explain the answer.`,
        words: [],
      },
    ],
    simulation: true,
    day: day + 1,
  };
}

function nextDueAfter(date: Date, intervalDays: number): string {
  const due = new Date(date);
  due.setDate(due.getDate() + intervalDays);
  return due.toISOString();
}

loadDotEnv();
assertLocalDatabaseUrl();

const prisma = new PrismaClient();

try {
  const initial = {
    textbooks: await prisma.textbook.count(),
    chunks: await prisma.chunk.count(),
    topics: await prisma.topic.count(),
    ankiCards: await prisma.ankiCard.count(),
  };

  if (initial.textbooks < 1 || initial.chunks < 1 || initial.topics < 1 || initial.ankiCards < 1) {
    throw new Error(
      `Month simulation needs indexed local study material. Found textbooks=${initial.textbooks}, chunks=${initial.chunks}, topics=${initial.topics}, ankiCards=${initial.ankiCards}.`,
    );
  }

  await resetStudyProgressPreservingLibrary(prisma);

  const topics = await prisma.topic.findMany({
    where: { ankiCards: { some: {} } },
    orderBy: [{ section: "asc" }, { name: "asc" }],
    include: {
      ankiCards: {
        orderBy: { createdAt: "asc" },
        take: 20,
      },
    },
  });
  const cards = await prisma.ankiCard.findMany({
    orderBy: { createdAt: "asc" },
    take: Math.max(150, CARDS_PER_DAY * DAYS_TO_SIMULATE),
  });

  if (topics.length === 0 || cards.length === 0) {
    throw new Error("No topics/cards available after reset; cannot run month simulation.");
  }

  await prisma.studyRoutine.create({
    data: {
      xmlSource: "<study-routine><block time=\"daily\">Read, practice cards, record one question set.</block></study-routine>",
      parsedBlocks: {
        morning: [{ label: "Read current Becker chunk", minutes: 45 }],
        midday: [{ label: "Anki audio review", minutes: 25 }],
        evening: [{ label: "Record and review practice questions", minutes: 90 }],
      },
      examDates: { FAR: "2026-08-31" },
      hoursTarget: { daily: 3, weekly: 21, total: 240 },
      createdAt: dayAtStart(0),
      activatedAt: dayAtStart(0),
    },
  });

  for (let day = 0; day < DAYS_TO_SIMULATE; day += 1) {
    const date = dayAtStart(day);
    const topic = topics[day % topics.length];
    if (!topic) throw new Error("Topic selection failed during simulation.");

    const scoreBase = clampScore(4.8 + day * 0.13 + (day % 4) * 0.35);
    const recording = await prisma.recording.create({
      data: {
        status: "done",
        r2Key: `simulation/month/day-${String(day + 1).padStart(2, "0")}/raw.webm`,
        durationSec: 40 * 60 + (day % 6) * 5 * 60,
        triggerRunId: `simulation-no-api-${day + 1}`,
        title: `Simulation day ${day + 1}: ${topic.name}`,
        sections: [topic.section],
        tagStage: {
          status: "done",
          startedAt: date.toISOString(),
          completedAt: date.toISOString(),
          pct: 100,
          simulation: true,
        },
        modelUsed: "simulation/no-api-call",
        segmentsCount: QUESTIONS_PER_RECORDING,
        createdAt: date,
        updatedAt: date,
      },
    });

    await prisma.stageProgress.createMany({
      data: ["uploading", "segmenting", "extracting", "transcribing", "tagging", "grading"].map((stage, index) => ({
        recordingId: recording.id,
        stage: stage as "uploading" | "segmenting" | "extracting" | "transcribing" | "tagging" | "grading",
        pct: 100,
        etaSec: 0,
        message: `Simulated ${stage} complete without provider calls.`,
        updatedAt: new Date(date.getTime() + index * 60_000),
      })),
    });

    for (let question = 0; question < QUESTIONS_PER_RECORDING; question += 1) {
      const questionScore = clampScore(scoreBase + question * 0.25);
      const createdQuestion = await prisma.question.create({
        data: {
          recordingId: recording.id,
          clipR2Key: `simulation/month/day-${String(day + 1).padStart(2, "0")}/q${question + 1}.webm`,
          thumbnailR2Key: `simulation/month/day-${String(day + 1).padStart(2, "0")}/q${question + 1}.jpg`,
          startSec: question * 600,
          endSec: question * 600 + 540,
          section: topic.section,
          transcript: transcript(day, question, topic.name),
          extracted: extractedQuestion(day, question, topic.name),
          status: "done",
          noAudio: false,
          segmentationSignals: { simulation: true, confidence: 0.94 },
          topicId: topic.id,
          tags: { section: topic.section, unit: topic.unit, topic: topic.name, difficulty: question + 2 },
          taggedAt: date,
          createdAt: date,
          updatedAt: date,
        },
      });

      await prisma.feedback.create({
        data: {
          questionId: createdQuestion.id,
          items: feedbackItems(questionScore),
          accountingScore: questionScore,
          consultingScore: clampScore(questionScore - 0.3),
          combinedScore: clampScore(questionScore - 0.15),
          whatYouNeedToLearn: `Simulated weak spot for ${topic.name}: tighten the exception test before choosing an answer.`,
          weakTopicTags: [topic.name, topic.unit ?? topic.section],
          createdAt: date,
        },
      });

      await prisma.reviewState.create({
        data: {
          questionId: createdQuestion.id,
          efactor: 2.5,
          interval: 3 + question,
          repetitions: 1,
          nextReviewAt: new Date(date.getTime() + (question + 2) * 24 * 60 * 60 * 1000),
          lastReviewedAt: date,
          createdAt: date,
          updatedAt: date,
        },
      });
    }

    for (let cardOffset = 0; cardOffset < CARDS_PER_DAY; cardOffset += 1) {
      const card = cards[(day * CARDS_PER_DAY + cardOffset) % cards.length];
      if (!card) throw new Error("Card selection failed during simulation.");
      const ratingCycle = [AnkiRating.GOOD, AnkiRating.EASY, AnkiRating.HARD, AnkiRating.GOOD, AnkiRating.AGAIN];
      const rating = ratingCycle[(day + cardOffset) % ratingCycle.length] ?? AnkiRating.GOOD;
      const interval = rating === AnkiRating.AGAIN ? 1 : rating === AnkiRating.HARD ? 2 : rating === AnkiRating.GOOD ? 4 : 7;
      const ease = rating === AnkiRating.AGAIN ? 2.1 : rating === AnkiRating.HARD ? 2.35 : rating === AnkiRating.GOOD ? 2.55 : 2.75;

      await prisma.ankiReview.create({
        data: {
          cardId: card.id,
          rating,
          reviewedAt: date,
          newInterval: interval,
          newEase: ease,
        },
      });
      await prisma.ankiCard.update({
        where: { id: card.id },
        data: {
          srsState: {
            ease,
            interval,
            nextDue: nextDueAfter(date, interval),
            lapses: rating === AnkiRating.AGAIN ? 1 : 0,
            repetitions: 1 + Math.floor(day / 7),
          },
        },
      });
    }

    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        mastery: clampScore(scoreBase) * 10,
        errorRate: Math.max(0, Number((0.45 - day * 0.008).toFixed(3))),
        lastSeen: date,
      },
    });

    if (day % 7 === 0) {
      const conversation = await prisma.conversation.create({
        data: {
          scope: "STUDY",
          scopeId: topic.id,
          createdAt: date,
        },
      });
      await prisma.chatMessage.createMany({
        data: [
          {
            conversationId: conversation.id,
            role: "USER",
            content: `Simulated no-token question about ${topic.name}.`,
            contextRefs: { topicId: topic.id },
            createdAt: date,
          },
          {
            conversationId: conversation.id,
            role: "ASSISTANT",
            content: "Simulated answer recorded without calling an AI provider.",
            contextRefs: { topicId: topic.id, simulation: true },
            createdAt: new Date(date.getTime() + 30_000),
          },
        ],
      });
    }

    await prisma.modelCall.createMany({
      data: [
        "PIPELINE_EXTRACT",
        "PIPELINE_GRADE",
        "ANKI_GEN",
      ].map((functionKey) => ({
        functionKey,
        model: "simulation/no-api-call",
        inputTokens: 0,
        outputTokens: 0,
        usdCost: 0,
        cacheHit: false,
        createdAt: date,
      })),
    });
  }

  const result = {
    ok: true,
    noProviderCalls: true,
    simulatedDays: DAYS_TO_SIMULATE,
    counts: {
      textbooks: await prisma.textbook.count(),
      chunks: await prisma.chunk.count(),
      topics: await prisma.topic.count(),
      ankiCards: await prisma.ankiCard.count(),
      ankiReviews: await prisma.ankiReview.count(),
      recordings: await prisma.recording.count(),
      questions: await prisma.question.count(),
      feedback: await prisma.feedback.count(),
      studyRoutines: await prisma.studyRoutine.count(),
      modelCalls: await prisma.modelCall.count(),
    },
  };

  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
