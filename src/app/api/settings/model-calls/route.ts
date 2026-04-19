import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/settings/model-calls
 * Deletes all ModelCall rows and resets budget currentUsageUsd to 0.
 */
export async function DELETE(): Promise<NextResponse> {
  try {
    const [deleteResult] = await Promise.all([
      prisma.modelCall.deleteMany(),
      prisma.budget.updateMany({ data: { currentUsageUsd: 0 } }),
    ])

    return NextResponse.json({ deleted: deleteResult.count })
  } catch (err) {
    return respond(err)
  }
}
