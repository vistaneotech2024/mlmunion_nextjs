import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Prefer env vars but fall back to the provided keys so it "just works"
const ZENSERP_API_KEY =
  process.env.ZENSERP_API_KEY || '3bc4d240-13ce-11f1-bd5d-af01841fdd32';
const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY!;

type CompanyForResearch = {
  id: string;
  name: string;
  description: string | null;
  country: string | null;
  country_name: string | null;
  headquarters: string | null;
  website: string | null;
  established: number | null;
  state?: string | null;
  city?: string | null;
  research_status: string | null;
  research_attempts: number | null;
};

type EnrichedCompanyData = {
  description: string | null;
  country_name: string | null;
  headquarters: string | null;
  website: string | null;
  established: number | null;
  meta_description: string | null;
  meta_keywords: string | null;
  focus_keyword: string | null;
};

// ─── 1. Fetch real search results from ZenSERP ───────────────────────────────
async function fetchSearchResults(companyName: string): Promise<string> {
  try {
    const query = encodeURIComponent(`${companyName} MLM company review`);
    const url = `https://app.zenserp.com/api/v2/search?q=${query}&num=5`;

    const response = await fetch(url, {
      headers: { apikey: ZENSERP_API_KEY },
    });

    if (!response.ok) {
      console.warn(`ZenSERP error for "${companyName}": ${response.status}`);
      return '';
    }

    const data = await response.json();

    // Extract organic result snippets
    const organicResults: { title?: string; snippet?: string; url?: string }[] =
      data?.organic || [];

    const snippets = organicResults
      .slice(0, 5)
      .map((r) => `- ${r.title ?? ''}: ${r.snippet ?? ''}`)
      .filter((s) => s.trim() !== '- :')
      .join('\n');

    // Also check knowledge graph / answer box
    const knowledgeGraph = data?.knowledge_graph;
    const answerBox = data?.answer_box?.answer || data?.answer_box?.snippet || '';

    let context = '';
    if (answerBox) context += `Answer Box: ${answerBox}\n\n`;
    if (knowledgeGraph) {
      const kg = knowledgeGraph;
      if (kg.description) context += `Knowledge Graph: ${kg.description}\n`;
      if (kg.founded) context += `Founded: ${kg.founded}\n`;
      if (kg.headquarters) context += `Headquarters: ${kg.headquarters}\n`;
      if (kg.website) context += `Website: ${kg.website}\n`;
    }
    if (snippets) context += `Search Results:\n${snippets}`;

    return context.trim();
  } catch (err) {
    console.error(`ZenSERP fetch failed for "${companyName}":`, err);
    return '';
  }
}

// ─── 2. Generate dynamic content via OpenAI ──────────────────────────────────
async function generateWithOpenAI(
  company: CompanyForResearch,
  searchContext: string
): Promise<EnrichedCompanyData> {
  const locationParts = [company.city, company.state, company.country_name || company.country]
    .filter(Boolean)
    .join(', ');

  const systemPrompt = `You are an SEO Copywriter with 15 years of experience unique paraglism free business researcher specializing in direct selling, network marketing and mlm (multi-level marketing) companies.
You write factual, balanced, and SEO-optimized company profiles and descriptions.
You must heavily use the provided Google search context to make each company's description as specific and unique as possible.
Do NOT copy generic templates between companies; focus on their unique products, markets, history, leadership, and notable facts.
If information is not available, say so naturally in the text instead of inventing details.
Always respond with valid JSON only — no markdown, no extra text.`;

  const userPrompt = `Research and write a complete profile for the company: "${company.name}"

Known details from our database:
- Location: ${locationParts || 'Unknown'}
- Website: ${company.website || 'Unknown'}
- Founded: ${company.established || 'Unknown'}
- Existing description: ${company.description || 'None'}

Real search context gathered from Google (may include organic results, answer boxes, and knowledge graph data):
${searchContext || 'No search results available.'}

Write a profile that is clearly tailored to THIS specific company (not generic MLM text).
Mention its products or services, target markets, founding background, leadership (if known), geographic focus, and any notable strengths or controversies you can infer from the search context.

Return a JSON object with EXACTLY these keys:
{
  "description": "5 to 8 detailed paragraphs about the company, its products/services, compensation plan, culture, reputation, and what prospective distributors should know. Use real facts from the search context and clearly relate them to this company. Separate each paragraph with \\n\\n.",
  "country_name": "Full country name or null",
  "headquarters": "City, Country headquarters or null if unknown",
  "website": "Official website URL or null",
  "established": "Founding year as a number or null",
  "meta_description": "SEO meta description under 155 characters, specific to this company",
  "meta_keywords": "Comma-separated SEO keywords (8-12 keywords) related to this company",
  "focus_keyword": "Primary SEO focus keyword phrase like \\"${company.name} review\\" or similar"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '{}';

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error(`Failed to parse OpenAI JSON response: ${rawContent.slice(0, 200)}`);
  }

  // Merge with existing known data — only override if OpenAI returned a non-null value
  return {
    description: (parsed.description as string) || null,
    country_name:
      (parsed.country_name as string) || company.country_name || company.country || null,
    headquarters: (parsed.headquarters as string) || company.headquarters || null,
    website: (parsed.website as string) || company.website || null,
    established:
      typeof parsed.established === 'number'
        ? parsed.established
        : company.established || null,
    meta_description: (parsed.meta_description as string) || null,
    meta_keywords: (parsed.meta_keywords as string) || null,
    focus_keyword: (parsed.focus_keyword as string) || null,
  };
}

// ─── 3. Admin guard ───────────────────────────────────────────────────────────
async function ensureAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Error loading admin profile:', profileError);
    throw new Error('Failed to verify admin status');
  }

  const isAdmin = Boolean((profile as { is_admin?: boolean } | null)?.is_admin);
  return { supabase, user, isAdmin };
}

// ─── 4. Main POST handler ─────────────────────────────────────────────────────
export async function POST() {
  try {
    const { supabase, user, isAdmin } = await ensureAdmin();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch pending companies
    const { data: companies, error } = await supabase
      .from('mlm_companies')
      .select(
        'id, name, description, country, country_name, headquarters, website, established, state, city, research_status, research_attempts'
      )
      .or('research_status.is.null,research_status.eq.pending,research_status.eq.Pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) {
      console.error('Error loading pending companies:', error);
      return NextResponse.json({ error: 'Failed to load pending companies' }, { status: 500 });
    }

    if (!companies || companies.length === 0) {
      const { count: remainingPending } = await supabase
        .from('mlm_companies')
        .select('id', { count: 'exact', head: true })
        .or('research_status.is.null,research_status.eq.pending,research_status.eq.Pending');

      return NextResponse.json({
        processedCount: 0,
        remainingPending: remainingPending || 0,
        updatedCompanies: [],
        errors: [],
      });
    }

    let processedCount = 0;
    const updatedCompanies: { id: string; name: string; status: string }[] = [];
    const errors: { id: string; name: string; message: string }[] = [];

    for (const company of companies as CompanyForResearch[]) {
      const attempts = company.research_attempts ?? 0;

      try {
        // Mark as in_progress
        await supabase
          .from('mlm_companies')
          .update({
            research_status: 'in_progress',
            research_attempts: attempts + 1,
            last_researched_at: new Date().toISOString(),
          })
          .eq('id', company.id);

        // Step 1: Get real search context from ZenSERP
        const searchContext = await fetchSearchResults(company.name);

        // Step 2: Generate dynamic content via OpenAI using real search data
        const enriched = await generateWithOpenAI(company, searchContext);

        // Step 3: Save to DB
        const { error: updateError } = await supabase
          .from('mlm_companies')
          .update({
            description: enriched.description ?? company.description,
            country_name: enriched.country_name ?? company.country_name ?? null,
            headquarters: enriched.headquarters ?? company.headquarters ?? null,
            website: enriched.website ?? company.website ?? null,
            established: enriched.established ?? company.established,
            meta_description: enriched.meta_description ?? null,
            meta_keywords: enriched.meta_keywords ?? null,
            focus_keyword: enriched.focus_keyword ?? null,
            research_status: 'completed',
            research_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', company.id);

        if (updateError) throw updateError;

        processedCount += 1;
        updatedCompanies.push({ id: company.id, name: company.name, status: 'completed' });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Research error for company', company.id, message);
        errors.push({ id: company.id, name: company.name, message });

        await supabase
          .from('mlm_companies')
          .update({
            research_status: 'error',
            research_error: message.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq('id', company.id);
      }
    }

    const { count: remainingPending } = await supabase
      .from('mlm_companies')
      .select('id', { count: 'exact', head: true })
      .or('research_status.is.null,research_status.eq.pending,research_status.eq.Pending');

    return NextResponse.json({
      processedCount,
      remainingPending: remainingPending || 0,
      updatedCompanies,
      errors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('Company research automation fatal error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}