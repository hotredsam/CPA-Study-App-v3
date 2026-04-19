import { EyebrowHeading } from '@/components/ui/EyebrowHeading'

interface Props {
  params: Promise<{ textbookId: string; chunkId: string }>
}

export default async function StudyChunkPage({ params }: Props) {
  const { textbookId, chunkId } = await params
  return (
    <div>
      <EyebrowHeading
        eyebrow="Study"
        title="Chapter"
        sub={`Textbook ${textbookId} · Chunk ${chunkId}`}
      />
      <p className="text-sm text-[color:var(--ink-faint)]">
        Full textbook reader coming in Phase G.
      </p>
    </div>
  )
}
