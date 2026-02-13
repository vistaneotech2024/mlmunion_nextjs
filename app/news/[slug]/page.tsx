import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ slug: string }>;
};

/** Redirect /news/[slug] to /news/[slug]/[id] for canonical URL with id. */
const getNewsIdBySlug = cache(async (slug: string): Promise<{ id: string; slug: string } | null> => {
  const supabase = createClient();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let { data, error } = await supabase
    .from('news')
    .select('id, slug')
    .eq('slug', slug)
    .eq('published', true)
    .limit(1)
    .maybeSingle();

  if (!data && !error && uuidPattern.test(slug)) {
    const res = await supabase
      .from('news')
      .select('id, slug')
      .eq('id', slug)
      .eq('published', true)
      .limit(1)
      .maybeSingle();
    data = res.data;
    error = res.error;
  }

  if (error || !data) return null;
  return { id: data.id, slug: (data.slug as string) || data.id };
});

export default async function NewsSlugRedirectPage({ params }: Props) {
  const { slug } = await params;
  const row = await getNewsIdBySlug(slug);
  if (!row) redirect('/news');
  redirect(`/news/${row.slug}/${row.id}`);
}
