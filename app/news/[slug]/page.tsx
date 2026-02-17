import { cache } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NewsDetailsPageContent } from '@/components/pages/NewsDetailsPageContent';

type Props = {
  params: Promise<{ slug: string }>;
};

type NewsMeta = {
  id: string;
  title: string;
  content: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  focus_keyword: string | null;
  image_url: string | null;
  created_at: string;
  slug: string | null;
  author?: { username?: string; full_name?: string } | { username?: string; full_name?: string }[];
};

function getFirst100Words(htmlContent: string): string {
  const text = (htmlContent || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text.split(/\s+/).slice(0, 100);
  return words.join(' ');
}

function truncateMetaDescription(text: string, maxLen = 155): string {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length <= maxLen) return cleaned;
  const truncated = cleaned.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 100 ? truncated.slice(0, lastSpace).trim() : truncated;
}

const getNewsBySlugOrId = cache(async (slugOrId: string): Promise<NewsMeta | null> => {
  const supabase = createClient();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let { data, error } = await supabase
    .from('news')
    .select('id, title, content, meta_description, meta_keywords, focus_keyword, image_url, created_at, slug, author:profiles(username, full_name)')
    .eq('slug', slugOrId)
    .eq('published', true)
    .limit(1)
    .maybeSingle();

  if (!data && !error && uuidPattern.test(slugOrId)) {
    const res = await supabase
      .from('news')
      .select('id, title, content, meta_description, meta_keywords, focus_keyword, image_url, created_at, slug, author:profiles(username, full_name)')
      .eq('id', slugOrId)
      .eq('published', true)
      .limit(1)
      .maybeSingle();
    data = res.data;
    error = res.error;
  }

  if (error || !data) return null;
  return data as NewsMeta;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getNewsBySlugOrId(slug);
    if (!data) return { title: 'News Article' };

    const rawDescription = data.meta_description || getFirst100Words(data.content || '');
    const description = truncateMetaDescription(rawDescription, 155);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
    const canonicalSlug = data.slug || data.id;
    const canonical = `${baseUrl}/news/${canonicalSlug}`;
    const author = Array.isArray(data.author) ? data.author[0] : data.author;
    const authorName = (author as any)?.full_name || (author as any)?.username || 'MLM Union';
    const imageUrl = data.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1200';

    return {
      title: data.title,
      description: description || undefined,
      keywords: data.meta_keywords || undefined,
      openGraph: {
        title: data.title,
        description: description || undefined,
        type: 'article',
        url: canonical,
        siteName: 'MLM Union',
        images: [{ url: imageUrl, width: 1200, height: 630, alt: data.title }],
        publishedTime: data.created_at,
        authors: [authorName],
      },
      twitter: {
        card: 'summary_large_image',
        title: data.title,
        description: description || undefined,
        images: [imageUrl],
      },
      alternates: { canonical },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'News Article' };
  }
}

function NewsJsonLd({ article }: { article: NewsMeta }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
  const author = Array.isArray(article.author) ? article.author[0] : article.author;
  const authorName = (author as any)?.full_name || (author as any)?.username || 'MLM Union';
  const imageUrl = article.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1200';
  const canonicalSlug = article.slug || article.id;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: truncateMetaDescription(article.meta_description || getFirst100Words(article.content || ''), 160),
    image: [imageUrl],
    datePublished: article.created_at,
    dateModified: article.created_at,
    author: { '@type': 'Person', name: authorName },
    publisher: { '@type': 'Organization', name: 'MLM Union', url: baseUrl },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${baseUrl}/news/${canonicalSlug}` },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function NewsDetailsBySlugPage({ params }: Props) {
  const { slug } = await params;
  const article = await getNewsBySlugOrId(slug);
  if (!article) redirect('/news');

  const canonicalSlug = article.slug || article.id;
  if (slug !== canonicalSlug) {
    redirect(`/news/${canonicalSlug}`);
  }

  return (
    <>
      <NewsJsonLd article={article} />
      <NewsDetailsPageContent slug={canonicalSlug} />
    </>
  );
}
