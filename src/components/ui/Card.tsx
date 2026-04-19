interface Props {
  children: React.ReactNode
  pad?: boolean
  accent?: string
  onClick?: () => void
  title?: string
  id?: string
  className?: string
  style?: React.CSSProperties
}

export function Card({
  children,
  pad = true,
  accent,
  onClick,
  title,
  id,
  className = '',
  style,
}: Props) {
  const isClickable = Boolean(onClick)
  const Tag = isClickable ? 'button' : 'div'

  return (
    <Tag
      id={id}
      title={title}
      onClick={onClick}
      type={isClickable ? 'button' : undefined}
      className={[
        'relative rounded border border-[color:var(--border)] bg-[color:var(--surface)]',
        'overflow-hidden',
        pad ? 'p-4' : '',
        isClickable
          ? 'w-full text-left hov cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--accent)]'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {/* Left accent stripe */}
      {accent && (
        <span
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: accent }}
          aria-hidden="true"
        />
      )}
      <div className={accent ? 'pl-3' : ''}>{children}</div>
    </Tag>
  )
}
