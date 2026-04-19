import { PrismaClient, CpaSection, AiFunctionKey } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("Seeding Night 5 data...");

  // ── 1. Topics — one per CpaSection ───────────────────────────────────────

  const sections: CpaSection[] = [
    CpaSection.AUD,
    CpaSection.BAR,
    CpaSection.FAR,
    CpaSection.REG,
    CpaSection.ISC,
    CpaSection.TCP,
  ];

  const topicNames: Record<CpaSection, { name: string; unit: string }> = {
    [CpaSection.AUD]: { name: "Audit Evidence", unit: "Audit Planning" },
    [CpaSection.BAR]: { name: "Business Analysis", unit: "Ratio Analysis" },
    [CpaSection.FAR]: { name: "Revenue Recognition", unit: "ASC 606" },
    [CpaSection.REG]: { name: "Federal Taxation", unit: "Individual Income" },
    [CpaSection.ISC]: { name: "IT General Controls", unit: "COSO Framework" },
    [CpaSection.TCP]: { name: "Tax Compliance", unit: "Corporate Returns" },
    [CpaSection.BEC]: { name: "Economics", unit: "Micro" },
  };

  const createdTopics: { id: string; section: CpaSection }[] = [];

  for (const section of sections) {
    const info = topicNames[section];
    const topic = await prisma.topic.create({
      data: {
        section,
        name: info.name,
        unit: info.unit,
        mastery: Math.random() * 100,
        errorRate: Math.random() * 0.5,
        cardsDue: Math.floor(Math.random() * 20),
        aiNotes: {
          coreRule: `Core rule for ${info.name}`,
          pitfall: `Common pitfall in ${info.name}`,
          citation: `AU-C 300`,
          performance: "average",
        },
      },
    });
    createdTopics.push({ id: topic.id, section: topic.section });
  }

  console.log(`Created ${createdTopics.length} topics`);

  // ── 2. Textbooks ─────────────────────────────────────────────────────────

  const textbookData = [
    {
      title: "Wiley CPAexcel AUD Study Guide",
      publisher: "Wiley",
      sections: [CpaSection.AUD] as CpaSection[],
      pages: 480,
      sizeBytes: BigInt(12_000_000),
      r2Key: "fixtures/textbook-1.pdf",
    },
    {
      title: "Becker FAR Textbook",
      publisher: "Becker",
      sections: [CpaSection.FAR, CpaSection.BAR] as CpaSection[],
      pages: 720,
      sizeBytes: BigInt(18_500_000),
      r2Key: "fixtures/textbook-2.pdf",
    },
    {
      title: "Roger CPA REG Review",
      publisher: "Roger",
      sections: [CpaSection.REG, CpaSection.TCP] as CpaSection[],
      pages: 560,
      sizeBytes: BigInt(14_200_000),
      r2Key: "fixtures/textbook-3.pdf",
    },
  ];

  const createdTextbooks: { id: string }[] = [];

  for (const tb of textbookData) {
    const textbook = await prisma.textbook.create({
      data: {
        title: tb.title,
        publisher: tb.publisher,
        sections: tb.sections,
        pages: tb.pages,
        chunkCount: 20,
        indexStatus: "READY",
        sizeBytes: tb.sizeBytes,
        r2Key: tb.r2Key,
      },
    });
    createdTextbooks.push({ id: textbook.id });
  }

  console.log(`Created ${createdTextbooks.length} textbooks`);

  // ── 3. Chunks — 20 per textbook ──────────────────────────────────────────

  for (let tIdx = 0; tIdx < createdTextbooks.length; tIdx++) {
    const textbook = createdTextbooks[tIdx];
    if (!textbook) continue;

    const chunkData = Array.from({ length: 20 }, (_, order) => ({
      textbookId: textbook.id,
      order,
      content: `Sample chunk ${order} of textbook-${tIdx + 1}`,
    }));

    await prisma.chunk.createMany({ data: chunkData });
  }

  const totalChunks = createdTextbooks.length * 20;
  console.log(`Created ${totalChunks} chunks`);

  // ── 4. AnkiCards — 40 total ───────────────────────────────────────────────
  //    4 tied to topic[0], rest spread randomly across remaining topics

  const firstTopic = createdTopics[0];
  if (!firstTopic) throw new Error("No topics created");

  const ankiCardsFirst = Array.from({ length: 4 }, (_, i) => ({
    front: `What is the key concept #${i + 1} of ${firstTopic.section}?`,
    back: `The key concept #${i + 1} involves careful analysis and documentation.`,
    explanation: `Extended explanation for card ${i + 1}`,
    section: firstTopic.section,
    topicId: firstTopic.id,
    type: "QA" as const,
    srsState: { ease: 2.5, interval: 0, nextDue: null, lapses: 0, repetitions: 0 },
  }));

  await prisma.ankiCard.createMany({ data: ankiCardsFirst });

  // Remaining 36 cards spread across remaining topics (or all topics if fewer)
  const remainingTopics = createdTopics.slice(1);
  const effectiveTopics = remainingTopics.length > 0 ? remainingTopics : createdTopics;

  const ankiCardsRest = Array.from({ length: 36 }, (_, i) => {
    const topic = effectiveTopics[i % effectiveTopics.length];
    if (!topic) throw new Error("Unexpected missing topic");
    return {
      front: `Question ${i + 5}: ${topic.section} fundamental concept`,
      back: `Answer ${i + 5}: Detailed explanation covering the fundamental concept.`,
      explanation: `Explanation for card ${i + 5}`,
      section: topic.section,
      topicId: topic.id,
      type: "QA" as const,
      srsState: { ease: 2.5, interval: 0, nextDue: null, lapses: 0, repetitions: 0 },
    };
  });

  await prisma.ankiCard.createMany({ data: ankiCardsRest });
  console.log("Created 40 AnkiCards");

  // ── 5. UserSettings singleton ─────────────────────────────────────────────

  await prisma.userSettings.upsert({
    where: { id: "singleton" },
    update: {
      theme: "paper",
      accentHue: 18,
      density: "comfortable",
      serifFamily: "Instrument Serif",
    },
    create: {
      id: "singleton",
      theme: "paper",
      accentHue: 18,
      density: "comfortable",
      serifFamily: "Instrument Serif",
    },
  });

  console.log("Upserted UserSettings singleton");

  // ── 6. ModelConfig — one per AiFunctionKey ────────────────────────────────

  const modelConfigs: {
    functionKey: AiFunctionKey;
    model: string;
    batchEnabled: boolean;
    cacheEnabled: boolean;
    useOAuthFallback: boolean;
  }[] = [
    {
      functionKey: AiFunctionKey.PIPELINE_GRADE,
      model: "anthropic/claude-sonnet-4-6",
      batchEnabled: false,
      cacheEnabled: true,
      useOAuthFallback: true,
    },
    {
      functionKey: AiFunctionKey.PIPELINE_SEGMENT,
      model: "anthropic/claude-haiku-4.5",
      batchEnabled: false,
      cacheEnabled: false,
      useOAuthFallback: true,
    },
    {
      functionKey: AiFunctionKey.PIPELINE_TRANSCRIBE,
      model: "local/whisper-small",
      batchEnabled: false,
      cacheEnabled: false,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.PIPELINE_EXTRACT,
      model: "anthropic/claude-sonnet-4-6",
      batchEnabled: false,
      cacheEnabled: true,
      useOAuthFallback: true,
    },
    {
      functionKey: AiFunctionKey.PIPELINE_TAG,
      model: "anthropic/claude-haiku-4.5",
      batchEnabled: false,
      cacheEnabled: true,
      useOAuthFallback: true,
    },
    {
      functionKey: AiFunctionKey.TOPIC_EXTRACT,
      model: "anthropic/claude-haiku-4.5",
      batchEnabled: true,
      cacheEnabled: true,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.CHECKPOINT_QUIZ,
      model: "anthropic/claude-sonnet-4-6",
      batchEnabled: false,
      cacheEnabled: true,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.ANKI_GEN,
      model: "anthropic/claude-haiku-4.5",
      batchEnabled: true,
      cacheEnabled: true,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.CHAT_TUTOR,
      model: "anthropic/claude-sonnet-4-6",
      batchEnabled: false,
      cacheEnabled: true,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.VOICE_NOTE,
      model: "local/whisper-large",
      batchEnabled: false,
      cacheEnabled: false,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.TOPIC_NOTES,
      model: "anthropic/claude-haiku-4.5",
      batchEnabled: true,
      cacheEnabled: true,
      useOAuthFallback: false,
    },
  ];

  for (const config of modelConfigs) {
    await prisma.modelConfig.upsert({
      where: { functionKey: config.functionKey },
      update: {
        model: config.model,
        batchEnabled: config.batchEnabled,
        cacheEnabled: config.cacheEnabled,
        useOAuthFallback: config.useOAuthFallback,
      },
      create: config,
    });
  }

  console.log(`Upserted ${modelConfigs.length} ModelConfig rows`);

  // ── 7. IndexingConfig singleton ───────────────────────────────────────────

  await prisma.indexingConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  console.log("Upserted IndexingConfig singleton");

  // ── 8. Budget ─────────────────────────────────────────────────────────────

  await prisma.budget.create({
    data: {
      monthlyCapUsd: 50,
      warnThreshold: 0.8,
      autoDegrade: true,
      hardStop: false,
      currentUsageUsd: 0,
    },
  });

  console.log("Created Budget row");

  console.log("Night 5 seed complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
