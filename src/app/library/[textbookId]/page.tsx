import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EyebrowHeading } from '@/components/ui/EyebrowHeading'
import { SectionBadge } from '@/components/ui/SectionBadge'
import { isActiveCpaSection } from '@/lib/cpa-sections'
import { TextbookViewerClient } from './TextbookViewerClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ textbookId: string }>
}) {
  const { textbookId } = await params
  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { title: true },
  })
  return {
    title: textbook?.title
      ? `${textbook.title} — Library`
      : 'Textbook — CPA Study Servant',
  }
}

export default async function TextbookPage({
  params,
}: {
  params: Promise<{ textbookId: string }>
}) {
  const { textbookId } = await params

  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId },
    include: { _count: { select: { chunks: true } } },
  })

  if (!textbook) notFound()

  const activeSections = textbook.sections.filter(isActiveCpaSection)

  const [total, firstChunks] = await Promise.all([
    prisma.chunk.count({ where: { textbookId } }),
    prisma.chunk.findMany({
      where: { textbookId },
      orderBy: { order: 'asc' },
      take: 5,
      select: {
        id: true,
        order: true,
        chapterRef: true,
        title: true,
        content: true,
        topicId: true,
        fasbCitation: true,
        figures: true,
      },
    }),
  ])

  return (
    <div>
      <EyebrowHeading
        eyebrow="Library"
        title={textbook.title}
        sub={
          textbook.publisher
            ? `${textbook.publisher} · ${textbook.pages ?? '?'} pages`
            : textbook.pages
              ? `${textbook.pages} pages`
              : undefined
        }
        right={
          activeSections.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap">
              {activeSections.map((s) => (
                <SectionBadge key={s} section={s} size="sm" />
              ))}
            </div>
          ) : undefined
        }
      />
      <TextbookViewerClient
        textbookId={textbook.id}
        initialChunks={firstChunks}
        total={total}
      />
    </div>
  )
}
