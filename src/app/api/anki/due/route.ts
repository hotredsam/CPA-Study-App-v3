import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import { CpaSection } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const now = new Date().toISOString()
    const { searchParams } = new URL(request.url)
    const breakdown = searchParams.get('breakdown') === 'true'

    // Base where clause: cards that are due now
    const dueWhere = {
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

    // Breakdown by section — query each section's due count
    const sections = Object.values(CpaSection)
    const breakdownData = await Promise.all(
      sections.map(async (section) => {
        const sectionCount = await prisma.ankiCard.count({
          where: { ...dueWhere, section },
        })
        return { section, count: sectionCount }
      }),
    )

    // Only include sections with due cards
    const filteredBreakdown = breakdownData.filter((s) => s.count > 0)

    return NextResponse.json({ count, breakdown: filteredBreakdown })
  } catch (err) {
    return respond(err)
  }
}
