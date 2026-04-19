import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiError, respond } from '@/lib/api-error'
import { schedule } from '@/lib/sm2'
import { AnkiRating } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  rating: z.nativeEnum(AnkiRating),
})

/** Map Anki UI rating to SM-2 quality (0-5 scale). */
function ratingToQuality(rating: AnkiRating): 0 | 1 | 2 | 3 | 4 | 5 {
  switch (rating) {
    case 'AGAIN':
      return 0
    case 'HARD':
      return 2
    case 'GOOD':
      return 4
    case 'EASY':
      return 5
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
): Promise<NextResponse> {
  try {
    const { cardId } = await params
    const body: unknown = await request.json()
    const parsed = BodySchema.parse(body)

    const card = await prisma.ankiCard.findUnique({ where: { id: cardId } })
    if (!card) {
      throw new ApiError('NOT_FOUND', `AnkiCard not found: ${cardId}`)
    }

    // Parse existing SRS state from JSON field
    const srsRaw = card.srsState as {
      ease?: number
      interval?: number
      nextDue?: string | null
      lapses?: number
      repetitions?: number
    }

    const prevState = {
      efactor: srsRaw.ease ?? 2.5,
      interval: srsRaw.interval ?? 0,
      repetitions: srsRaw.repetitions ?? 0,
    }

    const quality = ratingToQuality(parsed.rating)
    const result = schedule(prevState, quality)

    const newLapses =
      parsed.rating === 'AGAIN' ? (srsRaw.lapses ?? 0) + 1 : (srsRaw.lapses ?? 0)

    const newSrsState = {
      ease: result.efactor,
      interval: result.interval,
      nextDue: result.nextReviewAt.toISOString(),
      lapses: newLapses,
      repetitions: result.repetitions,
    }

    // Persist review record and update card in a transaction
    const [, updatedCard] = await prisma.$transaction([
      prisma.ankiReview.create({
        data: {
          cardId,
          rating: parsed.rating,
          newInterval: result.interval,
          newEase: result.efactor,
        },
      }),
      prisma.ankiCard.update({
        where: { id: cardId },
        data: { srsState: newSrsState },
        select: {
          id: true,
          front: true,
          back: true,
          explanation: true,
          sourceCitation: true,
          section: true,
          topicId: true,
          type: true,
          srsState: true,
          updatedAt: true,
        },
      }),
    ])

    return NextResponse.json({ card: updatedCard, srsState: newSrsState })
  } catch (err) {
    return respond(err)
  }
}
