import { AiFunctionKey, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_EXAM_SECTIONS = ["FAR", "REG", "AUD", "TCP"];

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

async function main(): Promise<void> {
  console.log("Seeding app configuration...");
  console.log("Study content is intentionally blank: upload textbooks to create topics and Anki cards.");

  await prisma.userSettings.upsert({
    where: { id: "singleton" },
    update: {
      theme: "paper",
      accentHue: 18,
      density: "comfortable",
      serifFamily: "Instrument Serif",
      examSections: DEFAULT_EXAM_SECTIONS,
    },
    create: {
      id: "singleton",
      theme: "paper",
      accentHue: 18,
      density: "comfortable",
      serifFamily: "Instrument Serif",
      examSections: DEFAULT_EXAM_SECTIONS,
    },
  });

  console.log("Upserted UserSettings singleton");

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

  await prisma.indexingConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  console.log("Upserted IndexingConfig singleton");

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

  console.log("Config seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
