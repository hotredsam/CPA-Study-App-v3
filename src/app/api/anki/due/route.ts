import { NextRequest, NextResponse } from 'next/server'
import { respond } from '@/lib/api-error'
import { CpaSection } from '@prisma/client'
import { getActiveExamSections } from '@/lib/exam-settings'
import { countDueAnkiCards, countDueAnkiCardsBySection } from '@/lib/anki-due'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const breakdown = searchParams.get('breakdown') === 'true'
    const activeSections = await getActiveExamSections()
    const sections = activeSections as unknown as CpaSection[]

    const count = await countDueAnkiCards({ sections })

    if (!breakdown) {
      return NextResponse.json({ count })
    }

    const filteredBreakdown = await countDueAnkiCardsBySection({ sections })

    return NextResponse.json({ count, breakdown: filteredBreakdown })
  } catch (err) {
    return respond(err)
  }
}
