import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/admin/wipe
 * Stub — not implemented. Contact support.
 */
export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented — contact support' } },
    { status: 501 },
  )
}
