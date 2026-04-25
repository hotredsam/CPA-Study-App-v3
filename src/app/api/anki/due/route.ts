import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import { CpaSection } from '@prisma/client'
import { getActiveExamSections } from '@/lib/exam-settings'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const now = new Date().toISOString()
    const { searchParams } = new URL(request.url)
    const breakdown = searchParams.get('breakdown') === 'true'
    const activeSections = await getActiveExamSections()

    // Base where clause: cards that are due now
    const dueWhere = {
      section: { in: activeSections as unknown as CpaSection[] },
      srsState: {
        path: ['nextDue'],
        lte: now,
        not: null as unknown as string,
      },
    }

    const count = await prisma.ankiCard.count({ where: dueWhere })

    if (!breakdown) {
      return NextResponse.json({ count })
    }

    // Single groupBy query instead of one COUNT per section
    const breakdownRaw = await prisma.ankiCard.groupBy({
      by: ['section'],
      where: dueWhere,
      _count: { _all: true },
    })

    const filteredBreakdown = breakdownRaw
      .filter((r) => r._count._all > 0)
      .map((r) => ({ section: String(r.section), count: r._count._all }))

    return NextResponse.json({ count, breakdown: filteredBreakdown })
  } catch (err) {
    return respond(err)
  }
}
