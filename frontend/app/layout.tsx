import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth'
import './globals.css'

export const metadata: Metadata = {
  title: 'PRISM - Pull Request Intelligence & Security Machine',
  description: 'Understand what your code change REALLY affects. Detect intent drift in pull requests.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white antialiased text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
