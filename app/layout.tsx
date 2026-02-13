import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { LayoutShell } from '@/components/LayoutShell'
import { ScrollToTop } from '@/components/ScrollToTop'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'MLM Union - Network Marketing Platform',
    template: '%s | MLM Union'
  },
  description: 'Join the largest network marketing community. Find MLM companies, connect with direct sellers, and grow your business.',
  keywords: ['MLM', 'Network Marketing', 'Direct Selling', 'MLM Companies'],
  authors: [{ name: 'MLM Union' }],
  creator: 'MLM Union',
  publisher: 'MLM Union',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mlmunion.in',
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@mlmunion',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add verification codes if needed
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SidebarProvider>
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <ScrollToTop />
              <LayoutShell>{children}</LayoutShell>
            </div>
            <Toaster position="top-right" />
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

