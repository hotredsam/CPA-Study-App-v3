import { Prisma, type CpaSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DueCardScope = {
  sections?: readonly (CpaSection | string)[];
  topicId?: string;
  search?: string;
  now?: Date;
};

function dueCardPredicate(now: Date = new Date()): Prisma.Sql {
  return Prisma.sql`(("srsState"#>>'{nextDue}') IS NULL OR ("srsState"#>>'{nextDue}') <= ${now.toISOString()})`;
}

function dueCardFilters(scope: DueCardScope): Prisma.Sql[] {
  const filters = [dueCardPredicate(scope.now)];
  const sections = scope.sections?.map(String).filter(Boolean) ?? [];

  if (sections.length > 0) {
    filters.push(Prisma.sql`"section"::text IN (${Prisma.join(sections)})`);
  }

  if (scope.topicId) {
    filters.push(Prisma.sql`"topicId" = ${scope.topicId}`);
  }

  if (scope.search?.trim()) {
    const like = `%${scope.search.trim()}%`;
    filters.push(Prisma.sql`(
      "front" ILIKE ${like}
      OR "back" ILIKE ${like}
      OR "explanation" ILIKE ${like}
      OR "sourceCitation" ILIKE ${like}
    )`);
  }

  return filters;
}

export async function countDueAnkiCards(scope: DueCardScope = {}): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    SELECT COUNT(*)::int AS count
    FROM "AnkiCard"
    WHERE ${Prisma.join(dueCardFilters(scope), " AND ")}
  `);
  return rows[0]?.count ?? 0;
}

export async function countDueAnkiCardsBySection(
  scope: Pick<DueCardScope, "sections" | "now"> = {},
): Promise<Array<{ section: string; count: number }>> {
  return prisma.$queryRaw<Array<{ section: string; count: number }>>(Prisma.sql`
    SELECT "section"::text AS section, COUNT(*)::int AS count
    FROM "AnkiCard"
    WHERE ${Prisma.join(dueCardFilters(scope), " AND ")}
    GROUP BY "section"
    ORDER BY "section"::text ASC
  `);
}

export async function listDueAnkiCardIds(args: DueCardScope & {
  take: number;
  skip?: number;
}): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "AnkiCard"
    WHERE ${Prisma.join(dueCardFilters(args), " AND ")}
    ORDER BY ("srsState"#>>'{nextDue}') ASC NULLS FIRST, "createdAt" ASC
    LIMIT ${args.take}
    OFFSET ${args.skip ?? 0}
  `);
  return rows.map((row) => row.id);
}
