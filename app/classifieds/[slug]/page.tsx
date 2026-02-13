import { cache } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClassifiedDetailsPageContent } from '@/components/pages/ClassifiedDetailsPageContent';

type Props = {
  params: Promise<{ slug: string }>;
};

type ClassifiedMeta = {
  id: string;
  title: string;
  description: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  focus_keyword: string | null;
  image_url: string | null;
  created_at: string;
  slug: string | null;
  user?: { username?: string; full_name?: string } | { username?: string; full_name?: string }[];
};

function stripHtml(html: string): string {
  if (typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateMetaDescription(text: string, maxLen = 155): string {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length <= maxLen) return cleaned;
  const truncated = cleaned.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 100 ? truncated.slice(0, lastSpace).trim() : truncated;
}

const getClassifiedBySlug = cache(async (slug: string): Promise<ClassifiedMeta | null> => {
  const supabase = createClient();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let { data, error } = await supabase
    .from('classifieds')
    .select('id, title, description, meta_description, meta_keywords, focus_keyword, image_url, created_at, slug, user:profiles(username, full_name)')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();

  if (!data && !error && uuidPattern.test(slug)) {
    const res = await supabase
      .from('classifieds')
      .select('id, title, description, meta_description, meta_keywords, focus_keyword, image_url, created_at, slug, user:profiles(username, full_name)')
      .eq('id', slug)
      .eq('status', 'active')
      .maybeSingle();
    data = res.data;
    error = res.error;
  }

  if (error || !data) return null;
  return data as ClassifiedMeta;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getClassifiedBySlug(slug);
    if (!data) return { title: 'Classified' };

    const rawDescription = data.meta_description || stripHtml(data.description || '');
    const description = truncateMetaDescription(rawDescription, 155);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
    const canonicalSlug = data.slug || data.id;
    const canonical = `${baseUrl}/classifieds/${canonicalSlug}`;

    return {
      title: data.title,
      description: description || undefined,
      keywords: data.meta_keywords || undefined,
      openGraph: {
        title: data.title,
        description: description || undefined,
        type: 'website',
        url: canonical,
        siteName: 'MLM Union',
        images: data.image_url ? [{ url: data.image_url, width: 1200, height: 630, alt: data.title }] : undefined,
      },
      twitter: {
        card: data.image_url ? 'summary_large_image' : 'summary',
        title: data.title,
        description: description || undefined,
        images: data.image_url ? [data.image_url] : undefined,
      },
      alternates: { canonical },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Classified' };
  }
}

function ClassifiedJsonLd({ classified }: { classified: ClassifiedMeta }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
  const author = Array.isArray(classified.user) ? classified.user[0] : classified.user;
  const authorName = (author as any)?.full_name || (author as any)?.username || 'MLM Union';
  const canonicalSlug = classified.slug || classified.id;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: classified.title,
    description: truncateMetaDescription(classified.meta_description || stripHtml(classified.description || ''), 160),
    image: classified.image_url || undefined,
    datePublished: classified.created_at,
    author: { '@type': 'Person', name: authorName },
    publisher: { '@type': 'Organization', name: 'MLM Union', url: baseUrl },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${baseUrl}/classifieds/${canonicalSlug}` },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function ClassifiedDetailPage({ params }: Props) {
  const { slug } = await params;
  const classified = await getClassifiedBySlug(slug);
  if (!classified) redirect('/classifieds');
  const canonicalSlug = classified.slug || classified.id;
  if (slug !== canonicalSlug) {
    redirect(`/classifieds/${canonicalSlug}`);
  }
  return (
    <>
      <ClassifiedJsonLd classified={classified} />
      <ClassifiedDetailsPageContent slug={canonicalSlug} />
    </>
  );
}
