import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ApiError, respond } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  content: z.string().min(1).max(4000),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
): Promise<NextResponse> {
  try {
    const { cardId } = await params
    const body: unknown = await request.json()
    const parsed = BodySchema.parse(body)

    const card = await prisma.ankiCard.findUnique({ where: { id: cardId }, select: { id: true } })
    if (!card) {
      throw new ApiError('NOT_FOUND', `AnkiCard not found: ${cardId}`)
    }

    const note = await prisma.ankiNote.create({
      data: {
        cardId,
        content: parsed.content,
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (err) {
    return respond(err)
  }
}
