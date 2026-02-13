import { Metadata } from 'next';
import { AboutUsPageContent } from '@/components/pages/AboutUsPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'About Us - MLM Union',
  description:
    'Learn more about MLM Union, our mission, vision, and how we help network marketers grow their business and connections.',
  openGraph: {
    title: 'About Us - MLM Union',
    description:
      'Learn more about MLM Union, our mission, vision, and how we help network marketers grow their business and connections.',
    type: 'website',
    url: `${baseUrl}/about`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'About Us - MLM Union',
    description:
      'Learn more about MLM Union, our mission, vision, and how we help network marketers grow their business and connections.',
  },
  alternates: { canonical: `${baseUrl}/about` },
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return <AboutUsPageContent />;
}

