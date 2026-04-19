const SECTION_HUES: Record<string, number> = {
  AUD: 260,
  BAR: 120,
  FAR: 35,
  REG: 200,
  ISC: 280,
  TCP: 170,
  BEC: 45,
}

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
  const hue = SECTION_HUES[section] ?? 0
  return (
    <span
      className={`inline-flex items-center font-mono font-semibold rounded uppercase tracking-wide ${SIZE_CLASSES[size]}`}
      style={{
        background: `oklch(0.93 0.06 ${hue})`,
        color: `oklch(0.32 0.10 ${hue})`,
      }}
      aria-label={`Section: ${section}`}
    >
      {section}
    </span>
  )
}
