import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/hooks/use-theme'
import { ToastProvider } from '@/components/modern-ui'

export const metadata: Metadata = {
  title: 'Algo - Cloud IDE Platform',
  description: 'A modern cloud-based IDE platform with modern UI/UX',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  )
}
