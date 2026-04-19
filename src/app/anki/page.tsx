import { EyebrowHeading } from '@/components/ui/EyebrowHeading'

export const metadata = { title: 'Anki — CPA Study Servant' }

export default function AnkiPage() {
  return (
    <div>
      <EyebrowHeading eyebrow="Spaced Repetition" title="Anki" sub="Practice your due flashcards." />
      <p className="text-sm text-[color:var(--ink-faint)]">
        Full Anki view coming in Phase G.
      </p>
    </div>
  )
}
