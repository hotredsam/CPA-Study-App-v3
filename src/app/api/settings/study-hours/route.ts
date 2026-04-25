import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  try {
    const agg = await prisma.recording.aggregate({ _sum: { durationSec: true } })
    const totalHours = Number(((agg._sum.durationSec ?? 0) / 3600).toFixed(1))
    return NextResponse.json({ totalHours })
  } catch (err) {
    return respond(err)
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    const result = await prisma.recording.updateMany({
      data: { durationSec: 0 },
    })
    return NextResponse.json({ updated: result.count })
  } catch (err) {
    return respond(err)
  }
}
