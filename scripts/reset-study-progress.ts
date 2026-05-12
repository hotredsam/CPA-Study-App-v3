import { PrismaClient } from "@prisma/client";
import { resetStudyProgressPreservingLibrary } from "../src/lib/study-reset";
import { assertLocalDatabaseUrl, loadDotEnv } from "./lib/db-safety";

loadDotEnv();
assertLocalDatabaseUrl();

const prisma = new PrismaClient();

try {
  const counts = await resetStudyProgressPreservingLibrary(prisma);
  console.log(JSON.stringify({ ok: true, counts }, null, 2));
} finally {
  await prisma.$disconnect();
}
