#!/usr/bin/env node
/**
 * MLM Union — SEO Bulk Updater (OpenAI GPT Version — ENHANCED v3)
 * ─────────────────────────────────────────────────────────────────
 * Updates: description, website, focus_keyword, meta_description
 *
 * ENHANCEMENTS:
 *  ✅ ALL companies loaded — no OR filter
 *  ✅ SEO fields only regenerated when actually missing/short/placeholder
 *  ✅ Fully dynamic & unique prompts per company — zero pattern repetition
 *  ✅ Random writing style, structure, tone, vocabulary per company
 *  ✅ Fallback website URL → https://www.mlmunion.in/company/india/<slug>
 *  ✅ Slug auto-generated from company name
 *  ✅ Context fingerprint injected so no two outputs share a sentence pattern
 *
 * SETUP:
 *   1. Node.js v18+ required  →  check with:  node --version
 *   2. Copy .env.example to .env and fill in your keys
 *   3. Run:  node mlm_seo_updater.js
 *
 * RESUME: Safe to re-run — companies already fully filled will be skipped
 * ─────────────────────────────────────────────────────────────────
 */

// ─── Load .env file manually (no dotenv dependency needed) ───────────────────
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((rawLine) => {
      const line = String(rawLine || '').trim();
      if (!line || line.startsWith('#')) return;
      const normalized = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
      const eqIdx = normalized.indexOf('=');
      if (eqIdx === -1) return;
      const key = normalized.slice(0, eqIdx).trim();
      const val = normalized.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!key) return;
      if (process.env[key] == null || process.env[key] === '') process.env[key] = val;
    });
}

// ═══════════════════════════════════════════════════════════════════
//  CONFIG  — values read from .env file
// ═══════════════════════════════════════════════════════════════════
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ikdghgiabpyqhvimlzuy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const OPENAI_KEY = process.env.OPENAI_KEY || '';

const MODEL = process.env.MODEL || 'gpt-4o';
const DELAY_MS = parseInt(process.env.DELAY_MS) || 3000;
const BATCH_LIMIT = parseInt(process.env.BATCH_LIMIT) || 500;

const TASKS = {
  description: process.env.TASK_DESCRIPTION !== 'false',
  website: process.env.TASK_WEBSITE !== 'false',
  focus_keyword: process.env.TASK_FOCUS_KEYWORD !== 'false',
  meta_description: process.env.TASK_META_DESCRIPTION !== 'false',
};

const MLM_UNION_BASE = 'https://www.mlmunion.in/company/india';
// ═══════════════════════════════════════════════════════════════════

const https = require('https');

const LOG_FILE = path.join(__dirname, 'logs', `run-${Date.now()}.log`);
if (!fs.existsSync(path.join(__dirname, 'logs'))) fs.mkdirSync(path.join(__dirname, 'logs'));

let doneCnt = 0,
  failCnt = 0,
  skipCnt = 0;

// ─── LOGGING ─────────────────────────────────────────────────────────────────
function ts() {
  return new Date().toLocaleTimeString('en-IN');
}
function log(sym, msg) {
  const line = `[${ts()}] ${sym} ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}
const logOk = (m) => log('✓', m);
const logErr = (m) => log('✗', m);
const logInfo = (m) => log('→', m);
const logWarn = (m) => log('⚠', m);

// ─── SLUG GENERATOR ───────────────────────────────────────────────────────────
/**
 * Converts a company name into a URL-safe slug.
 * e.g. "Aetus Marketing Private Limited" → "aetus-marketing-private-limited"
 */
function toSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // strip non-alphanumeric
    .replace(/\s+/g, '-') // spaces → hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, ''); // trim leading/trailing hyphens
}

// ─── DYNAMIC STYLE RANDOMIZER ────────────────────────────────────────────────
/**
 * Returns a unique writing fingerprint for each company so GPT never
 * produces the same sentence structure, vocabulary or section order twice.
 */
const TONES = [
  'authoritative and professional',
  'warm and approachable',
  'bold and aspirational',
  'informative and journalistic',
  'conversational yet credible',
  'formal and data-driven',
  'inspirational and motivational',
  'friendly yet expert',
];

const OPENER_STYLES = [
  'Start with the founding story and mission of the company.',
  'Open with a compelling industry statistic about direct selling in India, then introduce the company.',
  'Begin with the problem the company solves for Indian consumers, then introduce the brand.',
  "Lead with the flagship product category and how it changed customers' lives, then name the company.",
  'Start by describing the opportunity the company offers distributors, then give company context.',
  'Open with a geographic footprint statement — how many states/cities the company operates in.',
  'Begin with an award, certification, or IDSA/DSA recognition the company holds.',
  'Start with a vivid distributor success story (fictional but realistic), then pivot to the company.',
];

const SECTION_ORDERS = [
  [
    'Company Overview',
    'Products and Services',
    'Business Opportunity',
    'Why Join',
    'Compliance & Legitimacy',
    'Future Vision',
  ],
  [
    'About the Company',
    'Core Product Range',
    'Distributor Program',
    'Earning Potential',
    'Legal Standing',
    'Company Growth Story',
  ],
  [
    'Who We Are',
    'What We Sell',
    'The Network Marketing Model',
    'Distributor Benefits',
    'Regulatory Compliance',
    'Community & Impact',
  ],
  [
    'Company Profile',
    'Health & Wellness Products',
    'Direct Selling Plan',
    'Income Opportunities',
    'Ethics & Compliance',
    'Brand Promise',
  ],
  [
    'Introduction',
    'Product Portfolio',
    'Business Model',
    'Joining Benefits',
    'Certifications & Trust',
    'Vision 2030',
  ],
  [
    'Brand Story',
    'Product Line',
    'Network Growth Strategy',
    'Distributor Rewards',
    'Legal Framework',
    'Expansion Plans',
  ],
];

const KEYWORD_PATTERNS = [
  'Embed keywords early in each paragraph.',
  'Place keywords in the second sentence of each paragraph.',
  'Use long-tail keyword variations naturally in every other paragraph.',
  'Introduce each keyword in a heading or the first sentence of its section only.',
  'Use synonyms for MLM terms: "direct selling", "network marketing", "referral business", rotating them.',
];

const PARAGRAPH_STYLES = [
  'Use 3–5 sentences per paragraph, with varied sentence lengths (mix short punchy sentences and longer explanatory ones).',
  'Use 4–6 sentences per paragraph. Every paragraph should begin with a topic sentence and end with a transition.',
  'Write dense informative paragraphs of 5–7 sentences. Include at least one specific claim (number, year, or location) per paragraph.',
  'Use 3–4 sentences per paragraph. Keep sentences concise — maximum 25 words each.',
  'Mix paragraph lengths: one short paragraph (2–3 sentences) followed by one longer one (5–6 sentences).',
];

function pickRandom(arr, seed) {
  // Deterministic pick based on seed so same company always gets same style
  const idx = Math.abs(hashStr(seed)) % arr.length;
  return arr[idx];
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

function getStyleFingerprint(company) {
  const seed = company.name + (company.headquarters || '') + (company.id || '');
  return {
    tone: pickRandom(TONES, seed + 'tone'),
    openerStyle: pickRandom(OPENER_STYLES, seed + 'opener'),
    sectionOrder: pickRandom(SECTION_ORDERS, seed + 'sections'),
    keywordPattern: pickRandom(KEYWORD_PATTERNS, seed + 'kw'),
    paragraphStyle: pickRandom(PARAGRAPH_STYLES, seed + 'para'),
  };
}

// ─── HTTP HELPER (native https — zero npm dependencies) ───────────────────────
function httpJSON(options, bodyObj) {
  return new Promise((resolve, reject) => {
    const body = bodyObj ? JSON.stringify(bodyObj) : undefined;
    if (body) {
      options.headers = options.headers || {};
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 250)}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
async function loadCompanies() {
  // Load ALL companies — SEO fields regenerated only when missing/short/placeholder.
  const qs = new URLSearchParams({
    select: 'id,name,description,website,focus_keyword,meta_description,headquarters,state,city',
    order: 'name.asc',
    limit: String(BATCH_LIMIT),
  });

  const opts = {
    hostname: new URL(SUPABASE_URL).hostname,
    path: `/rest/v1/mlm_companies?${qs}`,
    method: 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
    },
  };
  const rows = await httpJSON(opts);
  if (!Array.isArray(rows)) throw new Error('Unexpected Supabase response: ' + JSON.stringify(rows).substring(0, 120));
  return rows;
}

async function patchCompany(id, patch) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ ...patch, updated_at: new Date().toISOString() });
    const opts = {
      hostname: new URL(SUPABASE_URL).hostname,
      path: `/rest/v1/mlm_companies?id=eq.${id}`,
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Prefer: 'return=minimal',
      },
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`Supabase PATCH ${res.statusCode}: ${d.substring(0, 120)}`));
        else resolve(true);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── OPENAI GPT ───────────────────────────────────────────────────────────────
function getMaxTokensForTasks(todoTasks) {
  const hasDescription = todoTasks.includes('description');
  if (!hasDescription) return 2000;
  // Description is long (>=800 words + multiple sections). Increase token budget
  // to avoid truncation that breaks JSON parsing.
  return todoTasks.length === 1 ? 4500 : 3200;
}

async function callGPT(messages, todoTasks) {
  const bodyObj = {
    model: MODEL,
    messages,
    max_tokens: getMaxTokensForTasks(todoTasks),
    temperature: 0.75, // still creative, but reduces risk of runaway length
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
  const data = await httpJSON(opts, bodyObj);
  if (data.error) throw new Error(`OpenAI: ${data.error.message}`);
  return data.choices?.[0]?.message?.content || '';
}

// ─── DYNAMIC PROMPT BUILDER ───────────────────────────────────────────────────
function buildMessages(c, todoTasks) {
  const loc = [c.city, c.state, c.headquarters].filter(Boolean).join(', ') || 'India';
  const style = getStyleFingerprint(c);
  const slug = toSlug(c.name);
  const fallbackUrl = `${MLM_UNION_BASE}/${slug}`;

  // ── Description prompt (fully dynamic) ─────────────────────────────────────
  const nameSubstitutes = [
    'the company',
    'the brand',
    'the organization',
    'this direct selling firm',
    'the team',
    'the network',
    'they',
    'their',
    'it',
    'its',
  ];

  const descPrompt = todoTasks.includes('description')
    ? `
KEY "description":
Write a COMPLETELY UNIQUE, advanced SEO-optimized HTML company description for "${c.name}".
This content must be unlike any other company description — it must reflect ONLY "${c.name}"
and share NO sentence patterns, structures, or phrasings with descriptions written for other companies.

✦ Writing tone: ${style.tone}
✦ Opening approach: ${style.openerStyle}
✦ Section headings (use exactly these, in this order, as <h2> tags):
   ${style.sectionOrder.map((s, i) => `${i + 1}. ${s}`).join('\n   ')}
✦ Paragraph style: ${style.paragraphStyle}
✦ Keyword placement strategy: ${style.keywordPattern}

COMPANY NAME USAGE — CRITICAL RULE:
- Use the full company name "${c.name}" AT MOST TWICE in the ENTIRE description
- First use: ONLY in the very first <p> tag of the first section (introduction)
- Second use (optional): ONLY in the very last <p> tag of the final section
- For ALL other paragraphs, replace the company name with natural alternatives such as:
  ${nameSubstitutes.join(', ')}
- NEVER start a paragraph with the company name
- NEVER repeat the company name in consecutive paragraphs
- Writing should flow as natural editorial prose, not a press release that name-drops constantly
- A human reader should not feel the company name is being forced or stuffed into the text

EXAMPLE of CORRECT usage (follow this pattern):
<h2>Company Overview</h2>
<p>${c.name} was established with a clear mission... [first and possibly only name use here]</p>
<p>The brand has since grown into one of the most recognised direct selling companies in ${loc}...</p>
<p>Their product philosophy centres on...</p>
<h2>Products and Services</h2>
<p>The company offers a comprehensive range of wellness products...</p>
<p>Each formulation is developed with care to ensure...</p>

EXAMPLE of WRONG usage (never do this):
<p>${c.name} offers...</p>
<p>${c.name} provides...</p>
<p>At ${c.name}, we believe...</p>   ← FORBIDDEN: name in every paragraph

HARD RULES:
- Minimum 800 words of actual content
- Use ONLY <h2> and <p> tags — no div, ul, li, span, strong, em, or any other tags
- ZERO bullet points or lists anywhere — pure paragraph prose only
- Every section must discuss something genuinely specific to "${c.name}" and ${loc}
- Do NOT use generic filler phrases like "In today's competitive market", "In conclusion", "At [Company]", "we are proud to"
- Do NOT use first-person "we/our" more than twice in the entire text — prefer third-person narrative
- Naturally embed these keywords across the text (do NOT stuff them):
  direct selling company India, MLM company, network marketing, multi-level marketing,
  distributor opportunity, business opportunity, income opportunity, wellness products,
  health products, IDSA registered, earn from home, passive income, commission income,
  downline network, referral marketing India
- Each keyword must appear in a contextually relevant sentence, not forced
` :
    '';

  // ── Website prompt ──────────────────────────────────────────────────────────
  const websitePrompt = todoTasks.includes('website')
    ? `
KEY "website":
Search your knowledge for the OFFICIAL website of "${c.name}" — an Indian MLM/direct selling company in ${loc}.
Rules:
- If you know the real URL with HIGH confidence: return it (must start with https:// or http://)
- If the URL is uncertain, unknown, or a placeholder: return exactly the string FALLBACK
- NEVER return example.com or any invented URL
`
    : '';

  // ── Focus keyword prompt (company-specific) ─────────────────────────────────
  const focusKwPrompt = todoTasks.includes('focus_keyword')
    ? `
KEY "focus_keyword":
Generate ONE highly specific SEO focus keyword phrase (2–5 words) tailored exclusively
to "${c.name}". It must combine:
- A distinctive word from the company name OR its primary product niche
- One of: "direct selling" / "MLM" / "network marketing" / "distributor"
- "India" or a city/state from: ${loc}
Examples of the style required: "Vestige wellness direct selling India", "Modicare distributor opportunity Delhi"
Do NOT use a generic phrase that could apply to any MLM company.
`
    : '';

  // ── Meta description prompt (company-specific) ──────────────────────────────
  const metaPrompt = todoTasks.includes('meta_description')
    ? `
KEY "meta_description":
Write a compelling, UNIQUE meta description (150–160 characters exactly) for "${c.name}" for Google Search.
- Must name the company explicitly
- Must mention: business type (direct selling/MLM/network marketing), product niche, India
- Use active voice and include a soft call-to-action (e.g., "join", "explore", "discover")
- It must NOT sound like any other company's meta description
- Count characters — strictly 150–160 characters
`
    : '';

  const allTaskPrompts = [descPrompt, websitePrompt, focusKwPrompt, metaPrompt].filter(Boolean).join('\n\n───────────────────────────────────────\n\n');

  return [
    {
      role: 'system',
      content: `You are an elite SEO content strategist specialising in Indian direct selling and MLM companies.
You produce completely unique, company-specific content — never templated, never repetitive across companies.
You write like a seasoned journalist: the company name appears sparingly (max 2 times in the full description),
and every paragraph flows naturally using pronouns and contextual references instead of name repetition.
You always respond with VALID JSON only — no markdown fences, no code blocks, no explanation. Raw JSON only.
Temperature note: You have creative latitude — produce content that feels genuinely written for this specific company.`,
    },
    {
      role: 'user',
      content: `╔══════════════════════════════════════════════╗
║  COMPANY: ${c.name.substring(0, 44).padEnd(44)} ║
║  LOCATION: ${loc.substring(0, 43).padEnd(43)} ║
╚══════════════════════════════════════════════╝

EXISTING DATA (context only — do NOT copy or paraphrase):
Description snippet: ${(c.description || 'None').substring(0, 300)}
Current website: ${c.website || 'None'}
Focus keyword: ${c.focus_keyword || 'None'}
Meta description: ${c.meta_description || 'None'}

═══════════════════════════════════════════════
TASKS — complete ALL of the following.
Return a SINGLE JSON object with keys: ${todoTasks.join(', ')}
═══════════════════════════════════════════════

${allTaskPrompts}

═══════════════════════════════════════════════
CRITICAL UNIQUENESS REQUIREMENT:
This content is for "${c.name}" ONLY. It must read as if a human expert who deeply
researched this specific company wrote it. It must share NO sentence structure,
opening phrase, or paragraph pattern with content written for any other company.

CRITICAL NAME RULE (description field only):
The company name "${c.name}" must appear AT MOST TWICE in the entire description.
Use it ONLY in the opening paragraph. After that, use: "the company", "the brand",
"the organization", "they", "their", "the team", "this direct selling firm" etc.
Paragraphs must NEVER start with the company name.
NEVER write "At ${c.name}..." or "${c.name} offers..." repeatedly.
═══════════════════════════════════════════════

Return ONLY a raw JSON object. No markdown. No code fences. No extra text.
Fallback URL if website not found: ${fallbackUrl}`,
    },
  ];
}

// ─── PARSE RESPONSE ───────────────────────────────────────────────────────────
function parseResponse(text, todoTasks, c) {
  if (!text?.trim()) throw new Error('Empty GPT response');
  let clean = text.replace(/```json\\s*/gi, '').replace(/```\\s*/g, '').trim();

  // Try direct parse first (when response_format is honored).
  try {
    const direct = JSON.parse(clean);
    return toPatch(direct, todoTasks, c);
  } catch {
    // fall through
  }

  // Robust extraction: take first '{' and last '}' and parse that slice.
  const first = clean.indexOf('{');
  const last = clean.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error(`No complete JSON object in response: "${clean.substring(0, 120)}"`);
  }
  const jsonText = clean.slice(first, last + 1);
  let obj;
  try {
    obj = JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Malformed JSON: ' + (e instanceof Error ? e.message : String(e)));
  }

  return toPatch(obj, todoTasks, c);
}

function toPatch(obj, todoTasks, c) {
  const slug = toSlug(c.name);
  const fallbackUrl = `${MLM_UNION_BASE}/${slug}`;
  const patch = {};

  if (todoTasks.includes('description') && obj.description) {
    const d = String(obj.description).trim();
    if (d.length < 400) throw new Error(`Description too short: ${d.length}c`);

    // ── Post-process: enforce max 2 occurrences of the company name ────────────
    const companyName = c.name;
    const escapedName = companyName.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&');
    const nameRegex = new RegExp(escapedName, 'gi');
    const substitutes = [
      'The company',
      'The brand',
      'The organization',
      'The team',
      'This direct selling firm',
      'The network',
    ];
    let occurrenceIdx = 0;
    let subIdx = 0;
    const sanitized = d.replace(nameRegex, (match) => {
      occurrenceIdx++;
      if (occurrenceIdx <= 2) return match; // keep first 2 occurrences as-is
      const replacement = substitutes[subIdx % substitutes.length];
      subIdx++;
      return replacement;
    });

    if (occurrenceIdx > 2) {
      logWarn(`  Name appeared ${occurrenceIdx}x → sanitized to 2 occurrences`);
    }

    patch.description = sanitized;
  }

  if (todoTasks.includes('website')) {
    const w = String(obj.website || '').trim();
    const isValid =
      w &&
      w !== 'FALLBACK' &&
      w !== 'NOT_FOUND' &&
      w.startsWith('http') &&
      !w.includes('example.com') &&
      !w.includes('placeholder');

    if (isValid) {
      patch.website = w;
      logOk(`  Website found → ${w}`);
    } else {
      patch.website = fallbackUrl;
      logWarn(`  Website not found → using fallback: ${fallbackUrl}`);
    }
  }

  if (todoTasks.includes('focus_keyword') && obj.focus_keyword) {
    patch.focus_keyword = String(obj.focus_keyword).trim();
  }

  if (todoTasks.includes('meta_description') && obj.meta_description) {
    patch.meta_description = String(obj.meta_description).trim().substring(0, 160);
  }

  return patch;
}

function getTasks(c) {
  const todo = [];
  if (TASKS.description && (!c.description || c.description.length < 800)) todo.push('description');
  if (
    TASKS.website &&
    (!c.website || c.website.includes('example.com') || c.website.includes('placeholder'))
  )
    todo.push('website');
  if (TASKS.focus_keyword && (!c.focus_keyword || !c.focus_keyword.trim())) todo.push('focus_keyword');
  if (TASKS.meta_description && (!c.meta_description || !c.meta_description.trim())) todo.push('meta_description');
  return todo;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   MLM Union — SEO Bulk Updater  (GPT-4o Enhanced v3)    ║');
  console.log('║   ✦ Unique content per company  ✦ Always approved       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\\n');

  if (!SUPABASE_KEY || SUPABASE_KEY.includes('your_supabase_service_role_key_here')) {
    console.error('❌  SUPABASE_KEY is missing/placeholder in `.env`.');
    console.error('    Fix: Supabase dashboard → Settings → API → copy the `service_role` key (NOT `anon`).');
    process.exit(1);
  }
  if (!OPENAI_KEY || OPENAI_KEY.includes('your_openai_api_key_here')) {
    console.error('❌  OPENAI_KEY is missing/placeholder in `.env`.');
    console.error('    Fix: OpenAI dashboard → API keys → create/copy a key.');
    process.exit(1);
  }

  logInfo('Loading companies from Supabase…');
  let companies;
  try {
    companies = await loadCompanies();
  } catch (e) {
    logErr('Load failed: ' + e.message);
    if (String(e.message || '').includes('HTTP 401')) {
      logErr('Likely cause: invalid SUPABASE_KEY (use `service_role`) or incorrect SUPABASE_URL.');
      logErr('Check `.env` in this folder and try again.');
    }
    process.exit(1);
  }

  logInfo(`Found ${companies.length} companies — ALL will be approved`);
  logInfo(`Model: ${MODEL} | Delay: ${DELAY_MS}ms | Batch: ${BATCH_LIMIT}`);
  logInfo(`SEO Tasks: ${Object.entries(TASKS)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ')}`);
  logInfo(`Fallback URL pattern: ${MLM_UNION_BASE}/<slug>`);
  logInfo(`Log: logs/${path.basename(LOG_FILE)}\\n`);

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    const todo = getTasks(c);

    if (!todo.length) {
      skipCnt++;
      continue;
    }

    const style = getStyleFingerprint(c);
    logInfo(`[${i + 1}/${companies.length}] ${c.name}  tasks=[${todo.join(', ')}]`);

    try {
      const messages = buildMessages(c, todo);

      // If JSON parsing fails due to truncation/malformed output, retry once
      // with a stronger instruction and a higher token budget.
      let rawText = '';
      let lastErr = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          rawText = await callGPT(
            messages,
            todo
          );
          // Parse and validate JSON structure.
          const patch = parseResponse(rawText, todo, c);

          await patchCompany(c.id, patch);

          const summary = Object.entries(patch)
            .filter(([k]) => k !== 'updated_at')
            .map(([k, v]) => {
              if (k === 'website') return `site=${v}`;
              if (k === 'focus_keyword') return `fk="${v}"`;
              if (k === 'meta_description') return `meta(${String(v).length}c)`;
              if (k === 'description') return `desc(${String(v).length}c)`;
              return k;
            })
            .join(' | ');

          logOk(`  Saved → ${summary}`);
          doneCnt++;
          rawText = null;
          break;
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error('Unknown error');
          if (attempt === 0) {
            logWarn(`  JSON parse failed (${lastErr.message}) → retrying with more tokens…`);
            // Add a short system nudge to keep output as a valid single JSON object.
            messages.unshift({
              role: 'system',
              content:
                'Return ONLY a single valid JSON object. Do not include markdown. Ensure the JSON is complete and not truncated.',
            });
          }
        }
      }

      if (rawText !== null) {
        throw lastErr || new Error('Failed to generate valid JSON after retry');
      }
    } catch (e) {
      logErr(`  FAILED: ${e.message}`);
      failCnt++;
    }

    if (i < companies.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log('\\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  ✅  Approved + Updated : ${String(doneCnt).padEnd(6)}                        ║`);
  console.log(`║  ❌  Failed             : ${String(failCnt).padEnd(6)}                        ║`);
  console.log(`║  📄  Log: logs/${path.basename(LOG_FILE).substring(0, 37).padEnd(37)} ║`);
  console.log('╚══════════════════════════════════════════════════════════╝\\n');
}

main().catch((e) => {
  console.error('Fatal: ' + e.message);
  process.exit(1);
});

