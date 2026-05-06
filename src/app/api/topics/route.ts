import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { respond } from '@/lib/api-error'
import { CpaSection } from '@prisma/client'
import { z } from 'zod'
import { CPA_SECTION_OPTIONS } from '@/lib/cpa-sections'
import { getActiveExamSections } from '@/lib/exam-settings'
import { computeTopicMasteryMetrics } from '@/lib/topic-mastery'

export const dynamic = 'force-dynamic'

const SortField = z.enum(['mastery', 'error', 'cards', 'seen'])
type SortField = z.infer<typeof SortField>

const QuerySchema = z.object({
  section: z.enum(CPA_SECTION_OPTIONS).optional(),
  sort: SortField.optional(),
  q: z.string().optional(),
})

const TOPIC_QUERY_ORDER = [{ section: 'asc' as const }, { name: 'asc' as const }]

type TopicListItem = {
  id: string
  section: CpaSection
  name: string
  unit: string | null
  mastery: number
  errorRate: number | null
  cardsDue: number
  lastSeen: Date | null
  notes: string | null
  aiNotes: unknown
  createdAt: Date
  updatedAt: Date
  masteryEvidence: {
    cardsTotal: number
    cardsReviewed: number
    questionsGraded: number
    confidence: 'none' | 'low' | 'medium' | 'high'
  }
}

function compareNullableDesc(a: number | null, b: number | null) {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return b - a
}

function sortTopics(topics: TopicListItem[], sort?: SortField) {
  return [...topics].sort((a, b) => {
    switch (sort) {
      case 'mastery':
        return a.mastery - b.mastery || a.name.localeCompare(b.name)
      case 'error':
        return compareNullableDesc(a.errorRate, b.errorRate) || a.name.localeCompare(b.name)
      case 'cards':
        return b.cardsDue - a.cardsDue || a.name.localeCompare(b.name)
      case 'seen':
        return compareNullableDesc(a.lastSeen?.getTime() ?? null, b.lastSeen?.getTime() ?? null) || a.name.localeCompare(b.name)
      default:
        return a.section.localeCompare(b.section) || a.name.localeCompare(b.name)
    }
  })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse({
      section: searchParams.get('section') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      q: searchParams.get('q') ?? undefined,
    })

    const data = parsed.success ? parsed.data : {}
    const activeSections = await getActiveExamSections()
    if (data.section && !activeSections.includes(data.section)) {
      return NextResponse.json([])
    }
    const activePrismaSections = activeSections as unknown as CpaSection[]

    const topics = await prisma.topic.findMany({
      where: {
        ...(data.section
          ? { section: data.section as CpaSection }
          : { section: { in: activePrismaSections } }),
        ...(data.q
          ? { name: { contains: data.q, mode: 'insensitive' } }
          : {}),
      },
      orderBy: TOPIC_QUERY_ORDER,
      select: {
        id: true,
        section: true,
        name: true,
        unit: true,
        lastSeen: true,
        notes: true,
        aiNotes: true,
        createdAt: true,
        updatedAt: true,
        chunks: {
          select: {
            chapterRef: true,
            title: true,
            textbook: { select: { title: true } },
          },
        },
        ankiCards: {
          select: {
            srsState: true,
            reviews: {
              orderBy: { reviewedAt: 'desc' },
              take: 1,
              select: {
                rating: true,
                reviewedAt: true,
              },
            },
          },
        },
        questions: {
          where: { status: 'done' },
          select: {
            createdAt: true,
            feedback: {
              select: {
                accountingScore: true,
                combinedScore: true,
              },
            },
          },
        },
      },
    })

    const now = new Date()
    const measuredTopics = topics.map((topic) => {
      const metrics = computeTopicMasteryMetrics({
        section: topic.section,
        storedUnit: topic.unit,
        chunks: topic.chunks,
        cards: topic.ankiCards,
        questions: topic.questions,
        storedLastSeen: topic.lastSeen,
        now,
      })

      return {
        id: topic.id,
        section: topic.section,
        name: topic.name,
        unit: metrics.unit,
        mastery: metrics.mastery,
        errorRate: metrics.errorRate,
        cardsDue: metrics.cardsDue,
        lastSeen: metrics.lastSeen,
        notes: topic.notes,
        aiNotes: topic.aiNotes,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt,
        masteryEvidence: metrics.evidence,
      }
    })

    return NextResponse.json(sortTopics(measuredTopics, data.sort))
  } catch (err) {
    return respond(err)
  }
}
