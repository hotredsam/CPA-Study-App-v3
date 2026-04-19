import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const questions = await prisma.question.findMany({
    where: { topicId: id, status: 'done' },
    include: { feedback: { select: { accountingScore: true, combinedScore: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(
    questions.map((q) => ({
      id: q.id,
      recordingId: q.recordingId,
      startSec: q.startSec,
      endSec: q.endSec,
      status: q.status,
      createdAt: q.createdAt,
      accountingScore: q.feedback?.accountingScore ?? null,
      combinedScore: q.feedback?.combinedScore ?? null,
    })),
  )
}
