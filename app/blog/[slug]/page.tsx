import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ slug: string }>;
};

/** Redirect /blog/[slug] to /blog/[slug]/[id] for canonical URL with id. */
const getBlogIdBySlug = cache(async (slug: string): Promise<{ id: string; slug: string } | null> => {
  const supabase = createClient();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (!data && !error && uuidPattern.test(slug)) {
    const res = await supabase
      .from('blog_posts')
      .select('id, slug')
      .eq('id', slug)
      .maybeSingle();
    data = res.data;
    error = res.error;
  }

  if (error || !data) return null;
  return { id: data.id, slug: (data.slug as string) || data.id };
});

export default async function BlogSlugRedirectPage({ params }: Props) {
  const { slug } = await params;
  const row = await getBlogIdBySlug(slug);
  if (!row) redirect('/blog');
  redirect(`/blog/${row.slug}/${row.id}`);
}
