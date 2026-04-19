import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import { parseRoutineXml } from '@/lib/routine/xml-parser'

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
 * Validates xmlSource, parses it, and creates a new StudyRoutine row.
 * Returns 400 if the XML is invalid.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await request.json().catch(() => ({}))
    const parsed = PostBodySchema.safeParse(raw)
    if (!parsed.success) {
      return respond(parsed.error)
    }

    const { xmlSource, examDates, hoursTarget } = parsed.data

    // Parse and validate the XML
    const parseResult = parseRoutineXml(xmlSource)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_XML',
            message: parseResult.errors?.[0] ?? 'Invalid XML',
            details: parseResult.errors,
          },
        },
        { status: 400 },
      )
    }

    const routine = await prisma.studyRoutine.create({
      data: {
        xmlSource,
        parsedBlocks: parseResult.data ?? {},
        examDates: examDates ?? {},
        hoursTarget: hoursTarget ?? {},
        activatedAt: new Date(),
      },
    })

    return NextResponse.json(routine)
  } catch (err) {
    return respond(err)
  }
}
