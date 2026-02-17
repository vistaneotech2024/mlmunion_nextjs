import { cache } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BlogDetailsPageContent } from '@/components/pages/BlogDetailsPageContent';

type Props = {
  params: Promise<{ slug: string }>;
};

type BlogMeta = {
  id: string;
  title: string;
  content: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  focus_keyword: string | null;
  cover_image: string | null;
  created_at: string;
  slug: string | null;
  author?: { username?: string; full_name?: string } | { username?: string; full_name?: string }[];
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

const getBlogBySlugOrId = cache(async (slugOrId: string): Promise<BlogMeta | null> => {
  const supabase = createClient();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, content, meta_description, meta_keywords, focus_keyword, cover_image, created_at, slug, author:profiles(username, full_name)')
    .eq('slug', slugOrId)
    .maybeSingle();

  if (!data && !error && uuidPattern.test(slugOrId)) {
    const res = await supabase
      .from('blog_posts')
      .select('id, title, content, meta_description, meta_keywords, focus_keyword, cover_image, created_at, slug, author:profiles(username, full_name)')
      .eq('id', slugOrId)
      .maybeSingle();
    data = res.data;
    error = res.error;
  }

  if (error || !data) return null;
  return data as BlogMeta;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getBlogBySlugOrId(slug);
    if (!data) return { title: 'Blog Post' };

    const rawDescription = data.meta_description || stripHtml(data.content || '');
    const description = truncateMetaDescription(rawDescription, 155);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
    const canonicalSlug = data.slug || data.id;
    const canonical = `${baseUrl}/blog/${canonicalSlug}`;
    const authorName = Array.isArray(data.author)
      ? data.author[0]?.full_name || data.author[0]?.username
      : (data.author as any)?.full_name || (data.author as any)?.username;

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
        images: data.cover_image ? [{ url: data.cover_image, width: 1200, height: 630, alt: data.title }] : undefined,
        publishedTime: data.created_at,
        authors: authorName ? [authorName] : undefined,
      },
      twitter: {
        card: data.cover_image ? 'summary_large_image' : 'summary',
        title: data.title,
        description: description || undefined,
        images: data.cover_image ? [data.cover_image] : undefined,
      },
      alternates: { canonical },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Blog Post' };
  }
}

function BlogJsonLd({ blog }: { blog: BlogMeta }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
  const author = Array.isArray(blog.author) ? blog.author[0] : blog.author;
  const authorName = (author as any)?.full_name || (author as any)?.username || 'MLM Union';
  const canonicalSlug = blog.slug || blog.id;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: truncateMetaDescription(blog.meta_description || stripHtml(blog.content || ''), 160),
    image: blog.cover_image || undefined,
    datePublished: blog.created_at,
    author: { '@type': 'Person', name: authorName },
    publisher: { '@type': 'Organization', name: 'MLM Union', url: baseUrl },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${baseUrl}/blog/${canonicalSlug}` },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function BlogDetailsBySlugPage({ params }: Props) {
  const { slug } = await params;
  const blog = await getBlogBySlugOrId(slug);
  if (!blog) redirect('/blog');

  const canonicalSlug = blog.slug || blog.id;
  if (slug !== canonicalSlug) {
    redirect(`/blog/${canonicalSlug}`);
  }

  return (
    <>
      <BlogJsonLd blog={blog} />
      <BlogDetailsPageContent slug={canonicalSlug} />
    </>
  );
}
