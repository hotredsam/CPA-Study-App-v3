import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import { CpaSection } from '@prisma/client'
import { z } from 'zod'
import { CPA_SECTION_OPTIONS } from '@/lib/cpa-sections'
import { getActiveExamSections } from '@/lib/exam-settings'

export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  topicId: z.string().optional(),
  section: z.enum(CPA_SECTION_OPTIONS).optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.parse({
      topicId: searchParams.get('topicId') ?? undefined,
      section: searchParams.get('section') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    })
    const activeSections = await getActiveExamSections()
    if (parsed.section && !activeSections.includes(parsed.section)) {
      return NextResponse.json({ cards: [], total: 0, limit: parsed.limit, offset: parsed.offset })
    }
    const activePrismaSections = activeSections as unknown as CpaSection[]

    const where = {
      ...(parsed.topicId ? { topicId: parsed.topicId } : {}),
      ...(parsed.section
        ? { section: parsed.section as CpaSection }
        : { section: { in: activePrismaSections } }),
      ...(parsed.q
        ? {
            OR: [
              { front: { contains: parsed.q, mode: 'insensitive' as const } },
              { back: { contains: parsed.q, mode: 'insensitive' as const } },
              { explanation: { contains: parsed.q, mode: 'insensitive' as const } },
              { sourceCitation: { contains: parsed.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const cards = await prisma.ankiCard.findMany({
      where,
      orderBy: [
        // Daily mode: order by nextDue ASC so most-overdue cards come first
        { srsState: 'asc' },
        { createdAt: 'asc' },
      ],
      take: parsed.limit,
      skip: parsed.offset,
      select: {
        id: true,
        front: true,
        back: true,
        explanation: true,
        sourceCitation: true,
        section: true,
        topicId: true,
        chunkId: true,
        type: true,
        difficulty: true,
        srsState: true,
        mnemonic: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { reviews: true } },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            content: true,
            isVoice: true,
            createdAt: true,
          },
        },
      },
    })

    const total = await prisma.ankiCard.count({
      where,
    })

    return NextResponse.json({ cards, total, limit: parsed.limit, offset: parsed.offset })
  } catch (err) {
    return respond(err)
  }
}
