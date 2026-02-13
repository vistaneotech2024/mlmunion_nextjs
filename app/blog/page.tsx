import { Metadata } from 'next';
import { BlogPageContent } from '@/components/pages/BlogPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
const canonical = `${baseUrl}/blog`;

export const metadata: Metadata = {
  title: 'MLM Blog - Network Marketing Insights & Tips',
  description:
    'Read expert articles, tips, and insights about network marketing, MLM opportunities, and direct selling strategies.',
  keywords: [
    'MLM blog',
    'network marketing blog',
    'MLM tips',
    'network marketing articles',
    'MLM strategies',
  ],
  openGraph: {
    title: 'MLM Blog - Network Marketing Insights & Tips',
    description:
      'Read expert articles, tips, and insights about network marketing, MLM opportunities, and direct selling strategies.',
    type: 'website',
    url: canonical,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'MLM Blog - Network Marketing Insights & Tips',
    description:
      'Read expert articles, tips, and insights about network marketing, MLM opportunities, and direct selling strategies.',
  },
  alternates: { canonical },
  robots: { index: true, follow: true },
};

/** Ensure /blog is statically generated so SEO meta tags are in the initial HTML (view-source). */
export const dynamic = 'force-static';

export default function BlogPage() {
  return <BlogPageContent />;
}
