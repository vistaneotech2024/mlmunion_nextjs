import { Metadata } from 'next';
import { CompaniesPageContent } from '@/components/pages/CompaniesPageContent';

export const metadata: Metadata = {
  title: 'MLM Companies - Network Marketing Opportunities | MLM Union',
  description: 'Browse verified MLM companies and network marketing opportunities. Find legitimate network marketing businesses with reviews, ratings, and detailed information.',
  keywords: 'MLM companies, network marketing, MLM opportunities, network marketing companies, MLM reviews',
  openGraph: {
    title: 'MLM Companies - Network Marketing Opportunities | MLM Union',
    description: 'Browse verified MLM companies and network marketing opportunities.',
    type: 'website',
  },
};

export default function CompaniesPage() {
  return <CompaniesPageContent />;
}

