import { Metadata } from 'next'
import { HomePageContent } from '@/components/pages/HomePageContent'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in'

export const metadata: Metadata = {
  title: 'MLM Union - Direct Selling Companies and Direct Sellers Directory',
  description: 'Find legitimate MLM companies and connect with direct sellers. Join our network marketing community for business opportunities and industry insights.',
  keywords: ['MLM', 'Network Marketing', 'Direct Selling', 'MLM Companies', 'Direct Sellers'],
  authors: [{ name: 'MLM Union' }],
  creator: 'MLM Union',
  publisher: 'MLM Union',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: 'MLM Union - Direct Selling Companies and Direct Sellers Directory',
    description: 'Find legitimate MLM companies and connect with direct sellers. Join our network marketing community for business opportunities and industry insights.',
    type: 'website',
    url: baseUrl,
    siteName: 'MLM Union',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MLM Union - Direct Selling Companies and Direct Sellers Directory',
    description: 'Find legitimate MLM companies and connect with direct sellers.',
    creator: '@mlmunion',
  },
  alternates: { 
    canonical: baseUrl,
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
    // Add your verification codes here if needed
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
}

// Force static generation for cleaner HTML output with minimal inline data
export const dynamic = 'force-static'
export const revalidate = 3600 // Revalidate every hour
export const dynamicParams = false // Disable dynamic params for cleaner output

export default function HomePage() {
  return <HomePageContent />
}

