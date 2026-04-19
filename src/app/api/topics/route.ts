import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import { CpaSection } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const SortField = z.enum(['mastery', 'error', 'cards', 'seen'])
type SortField = z.infer<typeof SortField>

const QuerySchema = z.object({
  section: z.nativeEnum(CpaSection).optional(),
  sort: SortField.optional(),
  q: z.string().optional(),
})

function buildOrderBy(sort?: SortField) {
  switch (sort) {
    case 'mastery':
      return [{ mastery: 'asc' as const }]
    case 'error':
      return [{ errorRate: 'desc' as const }]
    case 'cards':
      return [{ cardsDue: 'desc' as const }]
    case 'seen':
      return [{ lastSeen: 'desc' as const }]
    default:
      return [{ section: 'asc' as const }, { name: 'asc' as const }]
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse({
      section: searchParams.get('section') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      q: searchParams.get('q') ?? undefined,
    })

    const data = parsed.success ? parsed.data : {}

    const topics = await prisma.topic.findMany({
      where: {
        ...(data.section ? { section: data.section } : {}),
        ...(data.q
          ? { name: { contains: data.q, mode: 'insensitive' } }
          : {}),
      },
      orderBy: buildOrderBy(data.sort),
      select: {
        id: true,
        section: true,
        name: true,
        unit: true,
        mastery: true,
        errorRate: true,
        cardsDue: true,
        lastSeen: true,
        notes: true,
        aiNotes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(topics)
  } catch (err) {
    return respond(err)
  }
}
