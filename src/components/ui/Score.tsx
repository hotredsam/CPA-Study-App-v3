type ScoreSize = 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  value: number
  size?: ScoreSize
  suffix?: string
}

const SIZE_CLASSES: Record<ScoreSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
}

function getScoreColor(value: number): string {
  if (value >= 7.5) return 'var(--good)'
  if (value >= 5) return 'var(--warn)'
  return 'var(--bad)'
}

export function Score({ value, size = 'md', suffix = '/10' }: Props) {
  const color = getScoreColor(value)
  return (
    <span
      className={`mono tabular font-semibold ${SIZE_CLASSES[size]}`}
      style={{ color }}
      aria-label={`Score: ${value.toFixed(1)} out of 10`}
    >
      {value.toFixed(1)}
      {suffix && (
        <span className="text-[0.65em] font-normal" style={{ color: 'var(--ink-faint)' }}>
          {suffix}
        </span>
      )}
    </span>
  )
}
