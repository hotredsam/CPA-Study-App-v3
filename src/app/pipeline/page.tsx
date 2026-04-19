import { EyebrowHeading } from '@/components/ui/EyebrowHeading'

export const metadata = { title: 'Pipeline — CPA Study Servant' }

export default function PipelinePage() {
  return (
    <div>
      <EyebrowHeading eyebrow="Processing" title="Pipeline" sub="Live recording pipeline status." />
      <p className="text-sm text-[color:var(--ink-faint)]">
        Full pipeline view coming in Phase G.
      </p>
    </div>
  )
}
