import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/anki/all
 * Deletes all AnkiCard rows and returns the count deleted.
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    const result = await prisma.ankiCard.deleteMany()
    return NextResponse.json({ deleted: result.count })
  } catch (err) {
    return respond(err)
  }
}
