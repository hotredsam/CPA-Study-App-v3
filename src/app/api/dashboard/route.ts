import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import { ACTIVE_CPA_SECTIONS } from '@/lib/cpa-sections'
import { CpaSection, RecordingStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const STALE_PIPELINE_MS = 2 * 60 * 60 * 1000

export async function GET(): Promise<NextResponse> {
  try {
    const staleBefore = new Date(Date.now() - STALE_PIPELINE_MS)
    await prisma.recording.updateMany({
      where: {
        status: { in: ['uploading', 'uploaded', 'segmenting', 'processing_questions'] },
        updatedAt: { lt: staleBefore },
      },
      data: { status: 'failed' },
    })

    const freshPipelineCutoff = new Date(Date.now() - STALE_PIPELINE_MS)
    const liveStatuses: RecordingStatus[] = ['uploaded', 'segmenting', 'processing_questions']
    const activeRecordingWhere = {
      OR: [
        { status: 'done' as const },
        {
          status: { in: liveStatuses },
          updatedAt: { gte: freshPipelineCutoff },
        },
      ],
    }

    // Recordings aggregation
    const [allRecordings, recentRecordings, topics, ankiDueRaw] = await Promise.all([
      prisma.recording.findMany({
        where: activeRecordingWhere,
        select: {
          id: true,
          durationSec: true,
          createdAt: true,
          segmentsCount: true,
          status: true,
        },
      }),
      prisma.recording.findMany({
        where: activeRecordingWhere,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          status: true,
          segmentsCount: true,
        },
      }),
      prisma.topic.findMany({
        where: { section: { in: ACTIVE_CPA_SECTIONS as unknown as CpaSection[] } },
        select: {
          id: true,
          section: true,
          name: true,
          mastery: true,
          errorRate: true,
          lastSeen: true,
        },
        orderBy: { mastery: 'asc' },
      }),
      // Count Anki cards due now
      prisma.ankiCard.count({
        where: {
          section: { in: ACTIVE_CPA_SECTIONS as unknown as CpaSection[] },
          srsState: {
            path: ['nextDue'],
            lte: new Date().toISOString(),
            not: null as unknown as string,
          },
        },
      }),
    ])

    // Compute study stats
    const totalHours = allRecordings.reduce((sum, r) => sum + (r.durationSec ?? 0), 0) / 3600

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const weekHours =
      allRecordings
        .filter((r) => new Date(r.createdAt) >= oneWeekAgo)
        .reduce((sum, r) => sum + (r.durationSec ?? 0), 0) / 3600

    // Simple streak: consecutive days with recordings up to today
    const recordingDays = new Set(
      allRecordings.map((r) => new Date(r.createdAt).toDateString()),
    )
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      if (recordingDays.has(d.toDateString())) {
        streak++
      } else {
        break
      }
    }

    // Sections: group topics by section
    const sectionMap = new Map<
      string,
      { topicCount: number; masterySum: number; hoursStudied: number }
    >()
    for (const t of topics) {
      const key = String(t.section)
      const existing = sectionMap.get(key) ?? { topicCount: 0, masterySum: 0, hoursStudied: 0 }
      existing.topicCount++
      existing.masterySum += t.mastery
      sectionMap.set(key, existing)
    }

    const sectionHoursShare = Number((totalHours / ACTIVE_CPA_SECTIONS.length).toFixed(1))
    const sections = ACTIVE_CPA_SECTIONS.map((section) => {
      const agg = sectionMap.get(section) ?? { topicCount: 0, masterySum: 0, hoursStudied: 0 }
      return {
        section,
        hoursStudied: sectionHoursShare,
        mastery: agg.topicCount > 0 ? Math.round(agg.masterySum / agg.topicCount) : 0,
        examDate: null,
        topicCount: agg.topicCount,
      }
    })

    // Weakest topics: bottom 5
    const weakestTopics = topics.slice(0, 5).map((t) => ({
      id: t.id,
      name: t.name,
      section: String(t.section),
      mastery: Math.round(t.mastery),
      errorRate: t.errorRate != null ? Math.round(t.errorRate * 100) : 0,
    }))

    return NextResponse.json({
      studyStats: {
        totalHours: Number(totalHours.toFixed(1)),
        weekHours: Number(weekHours.toFixed(1)),
        streak,
        recordingsCount: allRecordings.length,
        processingCount: allRecordings.filter((r) => r.status !== 'done').length,
      },
      sections,
      weakestTopics,
      recentRecordings: recentRecordings.map((r) => ({
        id: r.id,
        title: r.title,
        createdAt: r.createdAt.toISOString(),
        status: r.status,
        segmentsCount: r.segmentsCount,
      })),
      cardsDue: ankiDueRaw,
      routine: null,
    })
  } catch (err) {
    return respond(err)
  }
}
