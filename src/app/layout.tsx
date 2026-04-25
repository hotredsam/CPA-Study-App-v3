import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/shell/Sidebar'
import { ToastProvider } from '@/components/shell/ToastProvider'
import { QueryProvider } from '@/components/shell/QueryProvider'
import { KeyboardNav } from '@/components/shell/KeyboardNav'
import { ThemeInitScript } from '@/components/shell/ThemeInitScript'

export const metadata: Metadata = {
  title: 'CPA Study Servant',
  description: 'AI-powered CPA exam coach.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="paper" data-density="comfortable" data-serif="instrument" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeInitScript />
        <QueryProvider>
          <ToastProvider>
            <KeyboardNav />
            <div className="app-shell">
              <Sidebar />
              <main className="main">{children}</main>
            </div>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
