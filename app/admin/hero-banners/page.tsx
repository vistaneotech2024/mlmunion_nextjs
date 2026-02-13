import { Metadata } from 'next';
import { AdminHeroBannersPageContent } from '@/components/pages/AdminHeroBannersPageContent';

export const metadata: Metadata = {
  title: 'Hero Banners - Admin',
  description: 'Manage hero banners on the homepage.',
  robots: { index: false, follow: true },
};

export default function AdminHeroBannersPage() {
  return <AdminHeroBannersPageContent />;
}
