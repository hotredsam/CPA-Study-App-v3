'use client'

export type PushRouter = {
  push: (href: string) => void
}

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function navigateReliably(router: PushRouter, href: string): void {
  if (currentPath() === href) return
  const target = new URL(href, window.location.href).href
  router.push(href)

  window.setTimeout(() => {
    if (window.location.href === target) return
    window.location.assign(target)
  }, 50)
}
