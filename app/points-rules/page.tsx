import { Metadata } from 'next';
import { PointsRulesPageContent } from '@/components/pages/PointsRulesPageContent';

export const metadata: Metadata = {
  title: 'Points Rules - MLM Union',
  description: 'Learn how to earn points by completing various activities on MLM Union',
  openGraph: {
    title: 'Points Rules - MLM Union',
    description: 'Learn how to earn points by completing various activities on MLM Union',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function PointsRulesPage() {
  return <PointsRulesPageContent />;
}
