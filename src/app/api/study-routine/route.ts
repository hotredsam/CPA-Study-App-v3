import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * GET /api/study-routine
 * Returns the latest StudyRoutine row or null.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const routine = await prisma.studyRoutine.findFirst({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(routine)
  } catch (err) {
    return respond(err)
  }
}

const PostBodySchema = z.object({
  xmlSource: z.string().min(1),
  examDates: z
    .object({
      FAR: z.string().optional(),
      REG: z.string().optional(),
      AUD: z.string().optional(),
      TCP: z.string().optional(),
    })
    .optional(),
  hoursTarget: z
    .object({
      daily: z.number().positive().optional(),
      weekly: z.number().positive().optional(),
      total: z.number().positive().optional(),
    })
    .optional(),
})

/**
 * POST /api/study-routine
 * Creates a StudyRoutine row (no server-side XML validation yet — just stores).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await request.json().catch(() => ({}))
    const parsed = PostBodySchema.safeParse(raw)
    if (!parsed.success) {
      return respond(parsed.error)
    }

    const { xmlSource, examDates, hoursTarget } = parsed.data

    const routine = await prisma.studyRoutine.create({
      data: {
        xmlSource,
        examDates: examDates ?? {},
        hoursTarget: hoursTarget ?? {},
      },
    })

    return NextResponse.json(routine)
  } catch (err) {
    return respond(err)
  }
}
