import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * GET /api/anki/due
 * Returns the count of Anki cards due now (srsState.nextDue <= now).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const now = new Date().toISOString()

    // Query cards where srsState JSON field nextDue is not null and <= now
    const count = await prisma.ankiCard.count({
      where: {
        srsState: {
          path: ['nextDue'],
          lte: now,
          not: null as unknown as string,
        },
      },
    })

    return NextResponse.json({ count })
  } catch (err) {
    return respond(err)
  }
}
