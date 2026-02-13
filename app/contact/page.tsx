import { Metadata } from 'next';
import { ContactUsPageContent } from '@/components/pages/ContactUsPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Contact Us - MLM Union',
  description:
    'Get in touch with the MLM Union team. Send us your questions, feedback, or partnership inquiries.',
  openGraph: {
    title: 'Contact Us - MLM Union',
    description:
      'Get in touch with the MLM Union team. Send us your questions, feedback, or partnership inquiries.',
    type: 'website',
    url: `${baseUrl}/contact`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Contact Us - MLM Union',
    description:
      'Get in touch with the MLM Union team. Send us your questions, feedback, or partnership inquiries.',
  },
  alternates: { canonical: `${baseUrl}/contact` },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return <ContactUsPageContent />;
}

