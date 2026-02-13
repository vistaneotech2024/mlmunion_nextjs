import { Metadata } from 'next';
import { UserBlogsPageContent } from '@/components/pages/UserBlogsPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'My Blogs - MLM Union',
  description: 'Manage your blog posts. View, edit, publish, and track the performance of your blog content.',
  openGraph: {
    title: 'My Blogs - MLM Union',
    description: 'Manage your blog posts and content.',
    type: 'website',
    url: `${baseUrl}/my-blogs`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'My Blogs - MLM Union',
    description: 'Manage your blog posts and content.',
  },
  alternates: { canonical: `${baseUrl}/my-blogs` },
  robots: { index: false, follow: true },
};

export default function MyBlogsPage() {
  return <UserBlogsPageContent />;
}
