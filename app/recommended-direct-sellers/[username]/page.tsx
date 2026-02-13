import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DirectSellerDetailPageContent } from '@/components/pages/DirectSellerDetailPageContent';

type Props = {
  params: Promise<{ username: string }>;
};

type SellerMeta = {
  id: string;
  username: string | null;
  full_name: string | null;
  image_url: string | null;
  seller_bio: string | null;
  specialties: string[] | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

const getSellerByUsername = cache(async (username: string): Promise<SellerMeta | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, image_url, seller_bio, specialties, city, state, country')
    .eq('is_direct_seller', true)
    .eq('username', username)
    .maybeSingle();

  if (error || !data) return null;
  return data as SellerMeta;
});

function truncate(str: string, max: number): string {
  const s = (str || '').trim();
  return s.length <= max ? s : s.slice(0, max).trim() + (s.length > max ? '...' : '');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  try {
    const seller = await getSellerByUsername(username);
    if (!seller) return { title: 'Direct Seller' };

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
    const canonical = `${baseUrl}/recommended-direct-sellers/${encodeURIComponent(seller.username || username)}`;
    const title = `${seller.full_name || seller.username || 'Seller'} - Recommended Direct Seller | MLM Union`;
    const location = [seller.city, seller.state, seller.country].filter(Boolean).join(', ');
    const descParts = [
      `Connect with ${seller.full_name || seller.username}, a recommended direct seller specializing in ${(seller.specialties || []).join(', ') || 'network marketing'}.`,
      seller.seller_bio ? truncate(seller.seller_bio, 120) : 'View their profile, achievements, and contact information.',
      location ? `Located in ${location}.` : '',
    ];
    const description = descParts.filter(Boolean).join(' ');

    return {
      title,
      description: truncate(description, 160),
      openGraph: {
        type: 'profile',
        title: `${seller.full_name || seller.username} - Recommended Direct Seller | MLM Union`,
        description: truncate(description, 160),
        url: canonical,
        siteName: 'MLM Union',
        images: seller.image_url ? [{ url: seller.image_url, width: 1200, height: 630, alt: String(seller.full_name || seller.username) }] : undefined,
      },
      twitter: {
        card: seller.image_url ? 'summary_large_image' : 'summary',
        title: `${seller.full_name || seller.username} - Recommended Direct Seller | MLM Union`,
        description: truncate(description, 160),
        images: seller.image_url ? [seller.image_url] : undefined,
      },
      alternates: { canonical },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Direct Seller' };
  }
}

export default async function RecommendedDirectSellerDetailPage({ params }: Props) {
  const { username } = await params;
  const seller = await getSellerByUsername(username);
  if (!seller) notFound();
  return <DirectSellerDetailPageContent username={username} />;
}
