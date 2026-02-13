import { Metadata } from 'next';
import { IncomeVerificationPageContent } from '@/components/pages/IncomeVerificationPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Apply for Premium Seller - MLM Union',
  description:
    'Become a premium seller by paying with points or dollars. Get exclusive benefits and showcase your success.',
  openGraph: {
    title: 'Apply for Premium Seller - MLM Union',
    description: 'Become a premium seller and unlock exclusive benefits. Get verified with a premium badge.',
    type: 'website',
    url: `${baseUrl}/income-verification`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Apply for Premium Seller - MLM Union',
    description: 'Become a premium seller and unlock exclusive benefits.',
  },
  alternates: { canonical: `${baseUrl}/income-verification` },
  robots: { index: false, follow: true },
};

export default function IncomeVerificationPage() {
  return <IncomeVerificationPageContent />;
}
