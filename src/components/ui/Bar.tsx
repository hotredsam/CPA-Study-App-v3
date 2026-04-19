interface Props {
  pct: number
  height?: number
  accent?: string
  className?: string
  'aria-label'?: string
}

export function Bar({
  pct,
  height = 6,
  accent = 'var(--accent)',
  className = '',
  'aria-label': ariaLabel,
}: Props) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div
      className={`w-full rounded-full overflow-hidden ${className}`}
      style={{ height, background: 'var(--track)' }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${Math.round(clamped)}%`}
      aria-label={ariaLabel}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${clamped}%`,
          background: accent,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}
