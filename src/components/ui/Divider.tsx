interface Props {
  vertical?: boolean
  className?: string
  style?: React.CSSProperties
}

export function Divider({ vertical, className = '', style }: Props) {
  if (vertical) {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={`w-px self-stretch bg-[color:var(--border)] ${className}`}
        style={style}
      />
    )
  }
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={`h-px w-full bg-[color:var(--border)] ${className}`}
      style={style}
    />
  )
}
