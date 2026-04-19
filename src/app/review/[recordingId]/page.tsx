import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ReviewClient } from './ReviewClient'
import type { ReviewQuestion, ReviewRecording } from './ReviewClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ recordingId: string }>
}) {
  const { recordingId } = await params
  const rec = await prisma.recording.findUnique({
    where: { id: recordingId },
    select: { title: true },
  })
  return {
    title: rec?.title
      ? `${rec.title} — Review`
      : 'Session Review — CPA Study Servant',
  }
}

export default async function RecordingReviewPage({
  params,
}: {
  params: Promise<{ recordingId: string }>
}) {
  const { recordingId } = await params

  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    include: {
      questions: {
        include: {
          feedback: true,
          topic: true,
        },
        orderBy: { startSec: 'asc' },
      },
    },
  })

  if (!recording) notFound()

  const reviewRecording: ReviewRecording = {
    id: recording.id,
    title: recording.title,
    createdAt: recording.createdAt,
    status: recording.status,
    durationSec: recording.durationSec,
    sections: recording.sections,
  }

  const questions: ReviewQuestion[] = recording.questions.map((q) => ({
    id: q.id,
    startSec: q.startSec,
    endSec: q.endSec,
    section: q.section,
    status: q.status,
    noAudio: q.noAudio,
    transcript: q.transcript,
    extracted: q.extracted,
    tags: q.tags,
    feedback: q.feedback
      ? {
          accountingScore: q.feedback.accountingScore,
          consultingScore: q.feedback.consultingScore,
          combinedScore: q.feedback.combinedScore,
          items: q.feedback.items,
          whatYouNeedToLearn: q.feedback.whatYouNeedToLearn,
        }
      : null,
    topic: q.topic
      ? {
          id: q.topic.id,
          name: q.topic.name,
          section: q.topic.section,
        }
      : null,
  }))

  return <ReviewClient recording={reviewRecording} questions={questions} />
}
