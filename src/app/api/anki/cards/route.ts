import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import { CpaSection } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  topicId: z.string().optional(),
  section: z.nativeEnum(CpaSection).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.parse({
      topicId: searchParams.get('topicId') ?? undefined,
      section: searchParams.get('section') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    })

    const cards = await prisma.ankiCard.findMany({
      where: {
        ...(parsed.topicId ? { topicId: parsed.topicId } : {}),
        ...(parsed.section ? { section: parsed.section } : {}),
      },
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
        type: true,
        difficulty: true,
        srsState: true,
        mnemonic: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { reviews: true } },
      },
    })

    const total = await prisma.ankiCard.count({
      where: {
        ...(parsed.topicId ? { topicId: parsed.topicId } : {}),
        ...(parsed.section ? { section: parsed.section } : {}),
      },
    })

    return NextResponse.json({ cards, total, limit: parsed.limit, offset: parsed.offset })
  } catch (err) {
    return respond(err)
  }
}
