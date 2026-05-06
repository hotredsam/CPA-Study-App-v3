'use client'

import { useEffect, useState, type CSSProperties } from 'react'

export function HydratedTextbookHtml({
  html,
  fallbackText,
  ariaLabel,
  className,
  style,
}: {
  html: string | null
  fallbackText: string
  ariaLabel: string
  className: string
  style?: CSSProperties
}) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  if (hydrated && html?.trim()) {
    return (
      <article
        className={className}
        style={style}
        aria-label={ariaLabel}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  const paragraphs = fallbackText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <article className={className} style={style} aria-label={ariaLabel}>
      {paragraphs.length > 0 ? (
        paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 20)}`}>
            {paragraph}
          </p>
        ))
      ) : (
        <p>No content available.</p>
      )}
    </article>
  )
}
