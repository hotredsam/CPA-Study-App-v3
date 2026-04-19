import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import { CpaSection } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  section: z.nativeEnum(CpaSection).optional(),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse({ section: searchParams.get('section') ?? undefined })

    const topics = await prisma.topic.findMany({
      where: parsed.success && parsed.data.section ? { section: parsed.data.section } : {},
      orderBy: [{ section: 'asc' }, { name: 'asc' }],
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
