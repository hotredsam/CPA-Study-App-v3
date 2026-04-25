import { CPA_SECTION_META } from '@/lib/cpa-sections'

type BadgeSize = 'xs' | 'sm' | 'md' | 'lg'

interface Props {
  section: string
  size?: BadgeSize
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: 'text-[9px] px-1.5 py-0.5',
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
}

export function SectionBadge({ section, size = 'sm' }: Props) {
  const hue = CPA_SECTION_META[section as keyof typeof CPA_SECTION_META]?.hue ?? 0
  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-semibold rounded-[3px] uppercase tracking-[0.08em] border ${SIZE_CLASSES[size]}`}
      style={{
        background: `oklch(0.70 0.06 ${hue} / 0.22)`,
        borderColor: `oklch(0.55 0.08 ${hue} / 0.35)`,
        color: `oklch(0.42 0.10 ${hue})`,
      }}
      aria-label={`Section: ${section}`}
    >
      {section}
    </span>
  )
}
