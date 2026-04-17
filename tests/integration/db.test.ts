import { describe, expect, it, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

const canReachDb = !!process.env.DATABASE_URL;

describe.skipIf(!canReachDb)("database connectivity", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("executes a trivial query", async () => {
    const rows = await prisma.$queryRaw<{ result: number }[]>`SELECT 1 as result`;
    expect(rows[0]?.result).toBe(1);
  });
});
