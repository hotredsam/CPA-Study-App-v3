import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiError, respond } from '@/lib/api-error'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const PatchBodySchema = z.object({
  notes: z.string(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params
    const body: unknown = await request.json()
    const parsed = PatchBodySchema.parse(body)

    const topic = await prisma.topic.findUnique({ where: { id } })
    if (!topic) {
      throw new ApiError('NOT_FOUND', `Topic not found: ${id}`)
    }

    const updated = await prisma.topic.update({
      where: { id },
      data: { notes: parsed.notes },
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

    return NextResponse.json(updated)
  } catch (err) {
    return respond(err)
  }
}
