import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import type { ParsedRoutine } from '@/lib/routine/xml-parser'

export const dynamic = 'force-dynamic'

const EMPTY_ROUTINE: ParsedRoutine = {
  morning: [],
  midday: [],
  evening: [],
}

/**
 * GET /api/study-routine/today
 * Returns today's blocks from the latest active StudyRoutine.
 * If no active routine exists, returns empty morning/midday/evening arrays.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const routine = await prisma.studyRoutine.findFirst({
      where: { activatedAt: { not: null } },
      orderBy: { activatedAt: 'desc' },
    })

    if (!routine?.parsedBlocks) {
      return NextResponse.json(EMPTY_ROUTINE)
    }

    const blocks = routine.parsedBlocks as unknown as ParsedRoutine
    return NextResponse.json({
      morning: blocks.morning ?? [],
      midday: blocks.midday ?? [],
      evening: blocks.evening ?? [],
    })
  } catch (err) {
    return respond(err)
  }
}
