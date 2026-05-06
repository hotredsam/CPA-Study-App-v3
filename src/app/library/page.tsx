import { prisma } from '@/lib/prisma'
import { isActiveCpaSection, type CpaSectionCode } from '@/lib/cpa-sections'
import { getActiveExamSections } from '@/lib/exam-settings'
import { isDatabaseUnavailableError } from '@/lib/api-error'
import { LibraryClient } from './LibraryClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Library — CPA Study Servant' }

export default async function LibraryPage() {
  type TextbookRow = {
    id: string
    title: string
    publisher: string | null
    sections: CpaSectionCode[]
    pages: number | null
    chunkCount: number
    indexStatus: 'QUEUED' | 'INDEXING' | 'READY' | 'NEEDS_UPDATE' | 'FAILED'
    sizeBytes: string | null
    citedCount: number
    uploadedAt: string
    indexedAt: string | null
  }

  let textbooks: TextbookRow[] = []
  let loadError: string | null = null

  try {
    const activeSections = await getActiveExamSections()
    const raw = await prisma.textbook.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: { _count: { select: { chunks: true } } },
    })

    textbooks = raw
      .map((t) => {
        const sections = t.sections
          .filter(isActiveCpaSection)
          .filter((section) => activeSections.includes(section))

        return {
          id: t.id,
          title: t.title,
          publisher: t.publisher,
          sections,
          pages: t.pages,
          chunkCount: t._count.chunks,
          indexStatus: t.indexStatus as TextbookRow['indexStatus'],
          sizeBytes: t.sizeBytes?.toString() ?? null,
          citedCount: t.citedCount,
          uploadedAt: t.uploadedAt.toISOString(),
          indexedAt: t.indexedAt?.toISOString() ?? null,
        }
      })
      .filter((t) => t.sections.length > 0 || raw.find((book) => book.id === t.id)?.sections.length === 0)
  } catch (err) {
    textbooks = []
    loadError = isDatabaseUnavailableError(err)
      ? 'Database is unavailable. Start Docker Desktop and run `docker compose up -d postgres`, then retry.'
      : 'Textbooks could not be loaded. Please refresh the page.'
  }

  return <LibraryClient initialTextbooks={textbooks} initialLoadError={loadError} />
}
