import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BackLink } from '@/components/BackLink';

type Props = {
  params: Promise<{ slug: string }>;
};

type PageContent = {
  id: string;
  page: string;
  title: string;
  content: string;
  slug: string;
  is_published: boolean;
  meta_description: string | null;
  meta_keywords: string | null;
  last_updated: string | null;
};

const getPageBySlug = cache(async (slug: string): Promise<PageContent | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('page_content')
    .select('*')
    .or(`slug.eq.${slug},page.eq.${slug}`)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PageContent;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    return {
      title: 'Page Not Found - MLM Union',
      robots: { index: false, follow: true },
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
  const canonical = `${baseUrl}/${encodeURIComponent(page.slug || slug)}`;

  const keywords = page.meta_keywords
    ? page.meta_keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
    : undefined;

  const description =
    page.meta_description ||
    (page.content ? page.content.replace(/<[^>]*>/g, '').slice(0, 160) : undefined);

  return {
    title: `${page.title} - MLM Union`,
    description: description,
    keywords,
    openGraph: {
      title: `${page.title} - MLM Union`,
      description: description,
      type: 'article',
      url: canonical,
      siteName: 'MLM Union',
    },
    twitter: {
      card: 'summary',
      title: `${page.title} - MLM Union`,
      description: description,
    },
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  const lastUpdated = page.last_updated
    ? new Date(page.last_updated).toLocaleDateString()
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackLink />

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">{page.title}</h1>
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
            {lastUpdated && (
              <p className="mt-8 text-sm text-gray-500">Last updated: {lastUpdated}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

