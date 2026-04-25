import { PrismaClient, CpaSection, AiFunctionKey } from "@prisma/client";

const prisma = new PrismaClient();

async function seedSection<T>(
  label: string,
  check: () => Promise<number>,
  create: () => Promise<T>
): Promise<T | null> {
  const count = await check();
  if (count > 0) {
    console.log(`  ${label}: already seeded (${count} rows), skipping`);
    return null;
  }
  return create();
}

async function main(): Promise<void> {
  console.log("Seeding Night 5 data...");

  // ── 1. Topics — one per CpaSection ───────────────────────────────────────

  const sections: CpaSection[] = [
    CpaSection.AUD,
    CpaSection.FAR,
    CpaSection.REG,
    CpaSection.TCP,
  ];

  const topicNames: Partial<Record<CpaSection, { name: string; unit: string }>> = {
    [CpaSection.AUD]: { name: "Audit Evidence", unit: "Audit Planning" },
    [CpaSection.FAR]: { name: "Revenue Recognition", unit: "ASC 606" },
    [CpaSection.REG]: { name: "Federal Taxation", unit: "Individual Income" },
    [CpaSection.TCP]: { name: "Tax Compliance", unit: "Corporate Returns" },
  };

  const topicsResult = await seedSection(
    "Topics",
    () => prisma.topic.count(),
    async () => {
      const createdTopics: { id: string; section: CpaSection }[] = [];
      for (const section of sections) {
        const info = topicNames[section];
        if (!info) continue;
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
      return createdTopics;
    }
  );

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
      sections: [CpaSection.FAR] as CpaSection[],
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

  const textbooksResult = await seedSection(
    "Textbooks",
    () => prisma.textbook.count(),
    async () => {
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
      return createdTextbooks;
    }
  );

  // ── 3. Chunks — 20 per textbook ──────────────────────────────────────────

  if (textbooksResult !== null) {
    await seedSection(
      "Chunks",
      () => prisma.chunk.count(),
      async () => {
        for (let tIdx = 0; tIdx < textbooksResult.length; tIdx++) {
          const textbook = textbooksResult[tIdx];
          if (!textbook) continue;

          const chunkData = Array.from({ length: 20 }, (_, order) => ({
            textbookId: textbook.id,
            order,
            content: `Sample chunk ${order} of textbook-${tIdx + 1}`,
          }));

          await prisma.chunk.createMany({ data: chunkData });
        }
        const totalChunks = textbooksResult.length * 20;
        console.log(`Created ${totalChunks} chunks`);
        return totalChunks;
      }
    );
  } else {
    // Textbooks already existed — check chunks independently
    await seedSection(
      "Chunks",
      () => prisma.chunk.count(),
      async () => {
        const existingTextbooks = await prisma.textbook.findMany({ select: { id: true } });
        for (let tIdx = 0; tIdx < existingTextbooks.length; tIdx++) {
          const textbook = existingTextbooks[tIdx];
          if (!textbook) continue;

          const chunkData = Array.from({ length: 20 }, (_, order) => ({
            textbookId: textbook.id,
            order,
            content: `Sample chunk ${order} of textbook-${tIdx + 1}`,
          }));

          await prisma.chunk.createMany({ data: chunkData });
        }
        const totalChunks = existingTextbooks.length * 20;
        console.log(`Created ${totalChunks} chunks`);
        return totalChunks;
      }
    );
  }

  // ── 4. AnkiCards — 40 total ───────────────────────────────────────────────

  if (topicsResult !== null) {
    await seedSection(
      "AnkiCards",
      () => prisma.ankiCard.count(),
      async () => {
        const firstTopic = topicsResult[0];
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

        const remainingTopics = topicsResult.slice(1);
        const effectiveTopics = remainingTopics.length > 0 ? remainingTopics : topicsResult;

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
        return 40;
      }
    );
  } else {
    // Topics already existed — check AnkiCards independently
    await seedSection(
      "AnkiCards",
      () => prisma.ankiCard.count(),
      async () => {
        const existingTopics = await prisma.topic.findMany({ select: { id: true, section: true } });
        if (existingTopics.length === 0) throw new Error("No topics found");

        const firstTopic = existingTopics[0];
        if (!firstTopic) throw new Error("No topics found");

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

        const remainingTopics = existingTopics.slice(1);
        const effectiveTopics = remainingTopics.length > 0 ? remainingTopics : existingTopics;

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
        return 40;
      }
    );
  }

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
      model: "anthropic/claude-sonnet-4.6",
      batchEnabled: false,
      cacheEnabled: true,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.PIPELINE_SEGMENT,
      model: "anthropic/claude-haiku-4.5",
      batchEnabled: false,
      cacheEnabled: false,
      useOAuthFallback: false,
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
      model: "anthropic/claude-sonnet-4.6",
      batchEnabled: false,
      cacheEnabled: true,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.PIPELINE_TAG,
      model: "anthropic/claude-haiku-4.5",
      batchEnabled: false,
      cacheEnabled: true,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.TOPIC_EXTRACT,
      model: "anthropic/claude-haiku-4.5",
      batchEnabled: false,
      cacheEnabled: true,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.CHECKPOINT_QUIZ,
      model: "anthropic/claude-sonnet-4.6",
      batchEnabled: false,
      cacheEnabled: true,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.ANKI_GEN,
      model: "anthropic/claude-haiku-4.5",
      batchEnabled: false,
      cacheEnabled: true,
      useOAuthFallback: false,
    },
    {
      functionKey: AiFunctionKey.CHAT_TUTOR,
      model: "anthropic/claude-sonnet-4.6",
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
      batchEnabled: false,
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

  const existingBudget = await prisma.budget.findFirst();
  if (!existingBudget) {
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
  } else {
    console.log("Budget already exists, skipping");
  }

  console.log("Night 5 seed complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
