import { cache } from 'react';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { CompanyDetailsPageContent } from '@/components/pages/CompanyDetailsPageContent';

type Props = {
  params: Promise<{ country_name: string; slug: string }>;
};

type CompanyMeta = {
  name: string;
  description: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  focus_keyword: string | null;
  country_name: string | null;
  country: string | null;
  logo_url: string | null;
  website: string | null;
  headquarters: string | null;
  established: number | null;
};

function countryNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Truncate at word boundary for meta description (SEO: avoid cut-off words like "focus o"). */
function truncateMetaDescription(text: string, maxLen = 155): string {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length <= maxLen) return cleaned;
  const truncated = cleaned.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 100 ? truncated.slice(0, lastSpace).trim() : truncated;
}

const getCompanyBySlug = cache(async (slug: string): Promise<CompanyMeta | null> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mlm_companies')
    .select('name, description, meta_description, meta_keywords, focus_keyword, country_name, country, logo_url, website, headquarters, established')
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  return data as CompanyMeta;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getCompanyBySlug(slug);
    if (!data) return { title: 'Company' };

    const rawDescription = data.meta_description || data.description || '';
    const description = truncateMetaDescription(rawDescription, 155);
    const countrySlug = countryNameToSlug((data.country_name || data.country || '') as string);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
    const canonical = `${baseUrl}/company/${countrySlug}/${slug}`;
    const ogImage = data.logo_url ? { url: data.logo_url, width: 400, height: 400, alt: data.name } : undefined;

    return {
      title: data.name,
      description: description || undefined,
      keywords: data.meta_keywords || undefined,
      openGraph: {
        title: data.name,
        description: description || undefined,
        type: 'website',
        url: canonical,
        siteName: 'MLM Union',
        images: ogImage ? [ogImage] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: data.name,
        description: description || undefined,
        images: data.logo_url ? [data.logo_url] : undefined,
      },
      alternates: { canonical },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: 'Company' };
  }
}

function CompanyJsonLd({ company, canonical }: { company: CompanyMeta; canonical: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    description: truncateMetaDescription(company.meta_description || company.description || '', 160),
    url: canonical,
    logo: company.logo_url || undefined,
    image: company.logo_url || undefined,
    ...(company.website && { sameAs: [company.website] }),
    ...(company.headquarters && { address: { '@type': 'PostalAddress', addressLocality: company.headquarters } }),
    ...(company.established && { foundingDate: String(company.established) }),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function CompanyDetailPage({ params }: Props) {
  const { country_name, slug } = await params;
  const company = await getCompanyBySlug(slug);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
  const countrySlug = countryNameToSlug(country_name);
  const canonical = `${baseUrl}/company/${countrySlug}/${slug}`;

  return (
    <>
      {company && <CompanyJsonLd company={company} canonical={canonical} />}
      <CompanyDetailsPageContent country_name={country_name} slug={slug} />
    </>
  );
}
