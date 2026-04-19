import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * POST /api/textbooks/reindex-all
 * Sets all textbooks to QUEUED and triggers the indexer for each.
 */
export async function POST(): Promise<NextResponse> {
  try {
    // Reset all textbooks to QUEUED
    const updateResult = await prisma.textbook.updateMany({
      data: { indexStatus: 'QUEUED', indexedAt: null },
    })

    // Fetch all textbook ids so we can trigger each
    const textbooks = await prisma.textbook.findMany({
      select: { id: true },
    })

    // Best-effort trigger for each textbook
    if (process.env.TRIGGER_SECRET_KEY) {
      try {
        const { tasks } = await import('@trigger.dev/sdk/v3')
        for (const tb of textbooks) {
          await tasks.trigger('textbook-indexer', { textbookId: tb.id })
        }
      } catch (triggerErr) {
        console.warn('[textbooks/reindex-all] trigger skipped:', triggerErr)
      }
    } else {
      console.warn('[textbooks/reindex-all] TRIGGER_SECRET_KEY not set, skipping trigger')
    }

    return NextResponse.json({ queued: updateResult.count })
  } catch (err) {
    return respond(err)
  }
}
