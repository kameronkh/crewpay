import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CrewPay — Job Execution Platform',
  description: 'Per-job pay that keeps crews accountable and on schedule.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
