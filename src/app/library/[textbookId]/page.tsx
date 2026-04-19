import { EyebrowHeading } from '@/components/ui/EyebrowHeading'

interface Props {
  params: Promise<{ textbookId: string }>
}

export default async function TextbookViewPage({ params }: Props) {
  const { textbookId } = await params
  return (
    <div>
      <EyebrowHeading eyebrow="Library" title="Textbook" sub={`Textbook ID: ${textbookId}`} />
      <p className="text-sm text-[color:var(--ink-faint)]">
        Full textbook view coming in Phase G.
      </p>
    </div>
  )
}
