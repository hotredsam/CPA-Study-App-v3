import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import { queueTextbookIndex } from '@/lib/textbooks/queue'

export const dynamic = 'force-dynamic'

/**
 * POST /api/textbooks/reindex-all
 * Sets all textbooks to QUEUED and triggers the indexer for each.
 */
export async function POST(): Promise<NextResponse> {
  try {
    // Reset all textbooks with source PDFs to INDEXING
    const updateResult = await prisma.textbook.updateMany({
      where: { r2Key: { not: null } },
      data: { indexStatus: 'INDEXING', indexedAt: null },
    })

    // Fetch all textbook ids so we can trigger each
    const textbooks = await prisma.textbook.findMany({
      where: { r2Key: { not: null } },
      select: { id: true },
    })

    // Best-effort trigger/fallback for each textbook
    for (const tb of textbooks) {
      try {
        await queueTextbookIndex({ textbookId: tb.id, rebuildChunks: true })
      } catch (queueErr) {
        console.warn('[textbooks/reindex-all] index queue skipped:', queueErr)
      }
    }

    return NextResponse.json({ queued: updateResult.count })
  } catch (err) {
    return respond(err)
  }
}
