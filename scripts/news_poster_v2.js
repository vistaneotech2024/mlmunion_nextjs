#!/usr/bin/env node
/**
 * MLM Union — News Post Automation (single topic)
 *
 * Generates:
 *  - 2 topic options via GPT
 *  - 1 full article per topic option
 *  - downloads an image from Unsplash (redirect)
 *  - uploads it to Supabase storage bucket `news-images`
 *  - inserts into `news` table as published immediately
 *
 * Controlled via env by the admin job runner:
 *  - NEWS_POST_RUN_ID
 *  - NEWS_POST_CANCEL_FILE (optional)
 */

const fs = require('fs');
const path = require('path');

// Supabase keys from environment (configured in .env.local)
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://ikdghgiabpyqhvimlzuy.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

const MODEL = process.env.MODEL || 'gpt-4o';
const COUNTRY = process.env.NEWS_COUNTRY || 'India';
const CONTENT_LANGUAGE = process.env.NEWS_POST_LANGUAGE || 'English';

const NEWS_AUTHOR_ID = process.env.NEWS_AUTHOR_ID || null;
const CANCEL_FILE = process.env.NEWS_POST_CANCEL_FILE || '';
const RUN_ID = process.env.NEWS_POST_RUN_ID || '';

const STORAGE_BUCKET = process.env.NEWS_IMAGES_BUCKET || 'news-images';

function parseInputTopics() {
  const raw = String(process.env.NEWS_POST_TOPICS || '').trim();
  if (!raw) return [];

  // Prefer JSON input.
  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr
          .map((t) => String(t || '').trim())
          .filter(Boolean)
          .slice(0, 1);
      }
    } catch {
      // fallback below
    }
  }

  // Fallback: delimiter parsing.
  return raw
    .split(/[\n,]+/g)
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .slice(0, 1);
}

function isCancelRequested() {
  if (!CANCEL_FILE) return false;
  try {
    return fs.existsSync(CANCEL_FILE);
  } catch {
    return false;
  }
}

function assertEnv(name, value) {
  if (!value) {
    throw new Error(`${name} missing in env.`);
  }
}

assertEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
assertEnv('OPENAI_API_KEY', OPENAI_KEY);

const CATEGORY_MAP = {
  General: 'a74e8447-56e3-46b9-9958-dbc29d807907',
  Business: 'fb93d3fb-87b6-4931-bb35-3d8af98cf8f5',
  'Direct Selling': '00287375-728a-401a-b414-7ca0b59a66b0',
  Legal: 'b2eabbdb-016b-4993-a192-78759973d350',
  Technology: '3354a0ee-3dac-4179-8347-18909a5eb793',
  Training: '78ef8f50-beb9-41db-a185833c387cde83',
};
const DEFAULT_CATEGORY_ID = '00287375-728a-401a-b414-7ca0b59a66b0';

const https = require('https');
const http = require('http');

const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const LOG_FILE = path.join(LOG_DIR, RUN_ID ? `news-${RUN_ID}.log` : `news-${Date.now()}.log`);

function ts() {
  return new Date().toLocaleTimeString('en-IN');
}
function log(level, msg) {
  const l = `[${ts()}] ${level} ${msg}`;
  console.log(l);
  fs.appendFileSync(LOG_FILE, l + '\n', 'utf8');
}
const info = (m) => log('INFO', m);
const ok = (m) => log('OK', m);
const warn = (m) => log('WARN', m);
const error = (m) => log('ERROR', m);

function httpJSON(opts, body) {
  return new Promise((resolve, reject) => {
    const b = body ? JSON.stringify(body) : undefined;
    if (b) {
      opts.headers = opts.headers || {};
      opts.headers['Content-Length'] = Buffer.byteLength(b);
    }
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${d.substring(0, 250)}`));
          return;
        }
        try {
          resolve(JSON.parse(d));
        } catch {
          resolve(d);
        }
      });
    });
    req.on('error', reject);
    if (b) req.write(b);
    req.end();
  });
}

function downloadBinary(urlStr) {
  return new Promise((resolve, reject) => {
    const get = (u, depth = 0) => {
      if (depth > 5) {
        reject(new Error('Too many redirects'));
        return;
      }
      const mod = u.startsWith('https') ? https : http;
      const parsed = new URL(u);
      const opts = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: { 'User-Agent': 'MLMUnionNewsBot/1.0' },
      };
      mod
        .get(opts, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            get(res.headers.location, depth + 1);
            return;
          }
          if (res.statusCode >= 400) {
            reject(new Error(`Image download ${res.statusCode}`));
            return;
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () =>
            resolve({
              buffer: Buffer.concat(chunks),
              contentType: res.headers['content-type'] || 'image/jpeg',
            }),
          );
        })
        .on('error', reject);
    };
    get(urlStr);
  });
}

async function callGPT(messages) {
  const body = {
    model: MODEL,
    messages,
    max_tokens: 3200,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  };
  const opts = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  const data = await httpJSON(opts, body);
  if (data.error) throw new Error(`OpenAI: ${data.error.message}`);
  return data.choices?.[0]?.message?.content || '';
}

function extractJSON(raw) {
  const clean = String(raw || '').replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const first = clean.indexOf('{');
    const last = clean.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) {
      throw new Error('No complete JSON object in response');
    }
    return JSON.parse(clean.slice(first, last + 1));
  }
}

async function researchNewsOptions() {
  info('Step 1/3 — Generating 1 news topic option…');
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const messages = [
    {
      role: 'system',
      content: `You are a professional news researcher and journalist specializing in the MLM, direct selling, and network marketing industry in India and globally. Today's date is ${today}. Use language: ${CONTENT_LANGUAGE}.`,
    },
    {
      role: 'user',
      content: `Search for the most recent and newsworthy MLM/direct selling news from the last 7-14 days.

Return EXACTLY 1 distinct topic option. It must be independently newsworthy.

For each topic option, include:
- topic (1 line)
- headline (60-80 chars)
- key_facts (5 items)
- source_context (brief)
- category (one of: Direct Selling | Business | Legal | Technology | General | Training)
- image_search_query (3-5 words for Unsplash)
- focus_keyword (2-5 words SEO focus)
- country ("India")

Return ONLY JSON with this exact structure:
{
  "topics": [
    {
      "topic": "...",
      "headline": "...",
      "key_facts": ["...", "...", "...", "...", "..."],
      "source_context": "...",
      "category": "Direct Selling",
      "image_search_query": "network marketing business team",
      "focus_keyword": "direct selling India",
      "country": "India"
    },
    { "topic": "...", "headline": "...", "key_facts": ["...","...","...","...","..."], "source_context": "...", "category": "Legal", "image_search_query": "...", "focus_keyword": "...", "country": "India" }
  ]
}

Return ONLY the JSON. No markdown. No code fences.`,
    },
  ];

  const raw = await callGPT(messages);
  const data = extractJSON(raw);
  if (!data?.topics || !Array.isArray(data.topics) || data.topics.length !== 1) {
    throw new Error('Research did not return exactly 1 topic');
  }
  info(`Generated topic: ${data.topics[0]?.headline}`);
  return data.topics;
}

async function researchNewsFromTopics(inputTopics) {
  info('Step 1/3 — Generating news research from provided topic…');
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const messages = [
    {
      role: 'system',
      content: `You are a professional news researcher and journalist specializing in the MLM, direct selling, and network marketing industry in India and globally. Today's date is ${today}. Use language: ${CONTENT_LANGUAGE}.`,
    },
    {
      role: 'user',
      content: `You are given topic ideas. Create independent news research objects for EACH topic idea.

Topic ideas:
${inputTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

For each topic, produce:
- topic (repeat the idea, 1 line)
- headline (60-80 chars)
- key_facts (5 items)
- source_context (brief)
- category (one of: Direct Selling | Business | Legal | Technology | General | Training)
- image_search_query (3-5 words for Unsplash)
- focus_keyword (2-5 words SEO focus)
- country ("India")

Return ONLY JSON with this exact structure:
{
  "topics": [
    {
      "topic": "...",
      "headline": "...",
      "key_facts": ["...", "...", "...", "...", "..."],
      "source_context": "...",
      "category": "Direct Selling",
      "image_search_query": "...",
      "focus_keyword": "...",
      "country": "India"
    }
  ]
}

Return ONLY the JSON. No markdown.`,
    },
  ];

  const raw = await callGPT(messages);
  const data = extractJSON(raw);
  if (!data?.topics || !Array.isArray(data.topics) || data.topics.length !== inputTopics.length) {
    throw new Error('Provided-topics research did not return matching number of topics');
  }

  info(
    `Generated from input: ${data.topics.map((t) => t?.headline).filter(Boolean).join(' | ')}`,
  );
  return data.topics;
}

async function writeArticleForTopic(research) {
  info(`Step 2/3 — Writing article for: ${research.headline}`);
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const messages = [
    {
      role: 'system',
      content: `You are a senior journalist and SEO content writer for MLM Union, India's leading MLM and direct selling news platform. Write in a professional, engaging, and informative tone. Today's date is ${today}. Write in ${CONTENT_LANGUAGE}.`,
    },
    {
      role: 'user',
      content: `Write a complete, publish-ready news article about this topic:

TOPIC: ${research.topic}
HEADLINE: ${research.headline}
KEY FACTS: ${research.key_facts.join(' | ')}
SOURCE CONTEXT: ${research.source_context}
FOCUS KEYWORD: ${research.focus_keyword}

REQUIREMENTS:
1. Write the full article in HTML format using only <p>, <h3>, <strong>, <em>, <ul>, <li>, <blockquote> tags
2. Minimum 600 words, maximum 1000 words
3. Start with a strong <p> hook paragraph — no <h3> at the very start
4. Use 3-4 <h3> section headings relevant to the topic. Do NOT use emojis or other icons in headings.
5. Naturally include these SEO keywords: MLM, direct selling, network marketing, India, distributor
6. End with a forward-looking <p> conclusion paragraph
7. Do NOT mention "MLM Union" in the article body
8. Generate title/content/meta fields in ${CONTENT_LANGUAGE}

Then return ONLY JSON with EXACT structure:
{
  "title": "Full article headline (60-90 chars)",
  "slug": "url-friendly-slug-from-title",
  "content": "<p>Full HTML article content...</p>",
  "meta_description": "150-160 character meta description",
  "meta_keywords": "comma-separated keywords",
  "focus_keyword": "${research.focus_keyword}"
}

Return ONLY the JSON.`,
    },
  ];

  const raw = await callGPT(messages);
  const article = extractJSON(raw);
  if (!article?.title || !article?.content || !article?.slug) {
    throw new Error('Article missing required fields');
  }
  if (String(article.content || '').length < 400) {
    throw new Error(`Article too short: ${String(article.content || '').length} chars`);
  }

  // Safety: strip emoji/icon characters from output before saving.
  const stripEmojis = (s) =>
    String(s || '')
      // U+FFFD is shown as "�" and often appears when upstream text is malformed.
      .replace(/\uFFFD/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/[\u{2600}-\u{27BF}]/gu, '')
      .trim();

  article.title = stripEmojis(article.title);
  article.content = stripEmojis(article.content);

  // Clean slug
  article.slug = String(article.slug)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);

  ok(`Article written: "${article.title}" (${String(article.content).length} chars)`);
  return article;
}

async function fetchImage(query) {
  info(`Step 3/5 — Downloading image for: "${query}"…`);

  const encodedQuery = encodeURIComponent(query);
  const sources = [
    `https://source.unsplash.com/featured/1280x720/?${encodedQuery}`,
    `https://source.unsplash.com/1280x720/?${encodedQuery},business`,
    `https://source.unsplash.com/1280x720/?india,business,professional`,
  ];

  // Retry a few times because `source.unsplash.com` sometimes returns 503 under load.
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    for (const src of sources) {
      try {
        const result = await downloadBinary(src);
        if (result.buffer && result.buffer.length > 5000) {
          ok(
            `Image downloaded (attempt ${attempt}): ${Math.round(result.buffer.length / 1024)}KB (${result.contentType})`,
          );
          return result;
        }
      } catch (e) {
        warn(`Image source failed (attempt ${attempt}): ${e?.message || 'unknown'}`);
      }
    }

    // Small backoff between attempts
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }

  throw new Error('Could not download any image');
}

async function uploadImage(imageBuffer, contentType) {
  info('Step 4/5 — Uploading image to Supabase Storage…');

  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;
  const objectPath = `${STORAGE_BUCKET}/${filename}`;

  const supaHost = new URL(SUPABASE_URL).hostname;
  const body = imageBuffer;

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: supaHost,
      path: `/storage/v1/object/${objectPath}`,
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': contentType,
        'Content-Length': body.length,
        'x-upsert': 'true',
      },
    };

    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Storage upload ${res.statusCode}: ${d.substring(0, 120)}`));
          return;
        }
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${objectPath}`;
        ok(`Image uploaded: ${publicUrl}`);
        resolve(publicUrl);
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function insertNews(article, imageUrl, research) {
  info('Step 5/5 — Publishing news post to database…');

  const categoryId = CATEGORY_MAP[research.category] || DEFAULT_CATEGORY_ID;

  const payload = {
    title: article.title,
    slug: article.slug,
    content: article.content,
    published: true,
    country_name: COUNTRY,
    news_category: categoryId,
    meta_description: article.meta_description || null,
    meta_keywords: article.meta_keywords || null,
    focus_keyword: article.focus_keyword || research.focus_keyword || null,
    likes: 0,
    dislikes: 0,
    views: 0,
    created_at: new Date().toISOString(),
    image_url: imageUrl || null,
  };

  if (NEWS_AUTHOR_ID) payload.author_id = NEWS_AUTHOR_ID;

  const supaHost = new URL(SUPABASE_URL).hostname;
  const body = JSON.stringify(payload);
  const opts = {
    hostname: supaHost,
    path: '/rest/v1/news',
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      Prefer: 'return=representation',
    },
  };

  const result = await httpJSON(opts, payload);
  const inserted = Array.isArray(result) ? result[0] : result;
  if (!inserted?.id) {
    throw new Error('Insert returned no ID: ' + JSON.stringify(result).substring(0, 120));
  }

  ok(`Published! ID: ${inserted.id} | Slug: ${inserted.slug}`);
  return inserted;
}

async function main() {
  console.log('INFO MLM Union — News Post Automation (single post)');

  const inputTopics = parseInputTopics();
  const topics = inputTopics.length
    ? await researchNewsFromTopics(inputTopics)
    : await researchNewsOptions();

  const results = { saved: 0, failed: 0 };
  const total = topics.length;

  for (let i = 0; i < total; i++) {
    if (isCancelRequested()) {
      warn('Cancellation requested (flag detected). Exiting…');
      process.exit(2);
    }

    const research = topics[i];
    console.log(`INFO [${i + 1}/${total}] Processing topic: ${research.headline}`);

    try {
      const article = await writeArticleForTopic(research);
      let publicUrl = null;
      try {
        const img = await fetchImage(research.image_search_query || research.topic);
        publicUrl = await uploadImage(img.buffer, img.contentType);
      } catch (e) {
        // Image is optional. If Unsplash fails (e.g. 503), still publish the article.
        warn(`Image pipeline failed. Publishing without image. Reason: ${e?.message || 'unknown'}`);
      }

      await insertNews(article, publicUrl, research);
      results.saved += 1;
    } catch (e) {
      results.failed += 1;
      error('FAILED: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  console.log('INFO Run summary');
  console.log(`INFO Saved: ${results.saved}`);
  console.log(`INFO Failed: ${results.failed}`);
}

main().catch((e) => {
  error('Fatal: ' + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
});

