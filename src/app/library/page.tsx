import { prisma } from '@/lib/prisma'
import { LibraryClient } from './LibraryClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Library — CPA Study Servant' }

export default async function LibraryPage() {
  type TextbookRow = {
    id: string
    title: string
    publisher: string | null
    sections: Array<'AUD' | 'FAR' | 'REG' | 'TCP'>
    pages: number | null
    chunkCount: number
    indexStatus: 'QUEUED' | 'INDEXING' | 'READY' | 'NEEDS_UPDATE' | 'FAILED'
    sizeBytes: string | null
    citedCount: number
    uploadedAt: string
    indexedAt: string | null
  }

  let textbooks: TextbookRow[] = []

  try {
    const raw = await prisma.textbook.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: { _count: { select: { chunks: true } } },
    })

    textbooks = raw.map((t) => ({
      id: t.id,
      title: t.title,
      publisher: t.publisher,
      sections: t.sections as TextbookRow['sections'],
      pages: t.pages,
      chunkCount: t._count.chunks,
      indexStatus: t.indexStatus as TextbookRow['indexStatus'],
      sizeBytes: t.sizeBytes?.toString() ?? null,
      citedCount: t.citedCount,
      uploadedAt: t.uploadedAt.toISOString(),
      indexedAt: t.indexedAt?.toISOString() ?? null,
    }))
  } catch {
    textbooks = []
  }

  return <LibraryClient initialTextbooks={textbooks} />
}
