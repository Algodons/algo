import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Algo - Cloud IDE Platform',
  description: 'A modern cloud-based IDE platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
