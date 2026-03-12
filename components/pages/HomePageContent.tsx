'use client';

import React from 'react';
import Link from 'next/link';
import { FeedCard, type BaseFeedItem } from '@/components/FeedCard';
import { Hero } from '@/components/Hero';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { useAuth } from '@/contexts/AuthContext';
import {
  MessageSquare,
  Users,
  LayoutGrid,
  User,
  FileText,
  UsersRound,
  Image,
  MoreHorizontal,
  ChevronRight,
  Sparkles,
  Building2,
  Tag,
  Newspaper,
  Link2,
  MapPin,
  Eye,
  Trophy,
  TrendingUp,
  Pencil,
} from 'lucide-react';

const CACHE_KEY = 'homepage_feed';
const CACHE_TTL = 5 * 60 * 1000;
const ITEMS_PER_SOURCE = 5;

const COUNTRY_CODES: Record<string, string> = {
  'India': 'in', 'United States': 'us', 'United Kingdom': 'gb',
  'Canada': 'ca', 'Australia': 'au', 'Germany': 'de', 'France': 'fr',
  'Italy': 'it', 'Spain': 'es', 'Netherlands': 'nl', 'Brazil': 'br',
  'Mexico': 'mx', 'Japan': 'jp', 'China': 'cn', 'South Korea': 'kr',
  'Singapore': 'sg', 'Malaysia': 'my', 'Thailand': 'th', 'Philippines': 'ph',
  'Indonesia': 'id', 'United Arab Emirates': 'ae', 'Saudi Arabia': 'sa',
  'South Africa': 'za', 'Nigeria': 'ng', 'Egypt': 'eg',
  'Pakistan': 'pk', 'Bangladesh': 'bd', 'Vietnam': 'vn', 'Turkey': 'tr',
  'Poland': 'pl', 'Russia': 'ru', 'Argentina': 'ar', 'Chile': 'cl',
  'Colombia': 'co', 'Peru': 'pe', 'Nepal': 'np', 'Sri Lanka': 'lk',
  'Kenya': 'ke', 'Ghana': 'gh', 'Tanzania': 'tz', 'Uganda': 'ug',
  'Sweden': 'se', 'Norway': 'no', 'Denmark': 'dk', 'Finland': 'fi',
  'Ireland': 'ie', 'Portugal': 'pt', 'Belgium': 'be', 'Austria': 'at',
  'Switzerland': 'ch', 'New Zealand': 'nz', 'Israel': 'il', 'Taiwan': 'tw',
  'Hong Kong': 'hk', 'Myanmar': 'mm', 'Cambodia': 'kh', 'Laos': 'la',
  'Jordan': 'jo', 'Iraq': 'iq', 'Iran': 'ir', 'Lebanon': 'lb',
  'Qatar': 'qa', 'Kuwait': 'kw', 'Bahrain': 'bh', 'Oman': 'om',
  'Morocco': 'ma', 'Tunisia': 'tn', 'Algeria': 'dz', 'Libya': 'ly',
  'Ethiopia': 'et', 'Zambia': 'zm', 'Zimbabwe': 'zw', 'Mozambique': 'mz',
  'Cameroon': 'cm', 'Ivory Coast': 'ci', 'Senegal': 'sn', 'Mali': 'ml',
  'Romania': 'ro', 'Czech Republic': 'cz', 'Hungary': 'hu', 'Greece': 'gr',
  'Bulgaria': 'bg', 'Croatia': 'hr', 'Serbia': 'rs', 'Slovakia': 'sk',
  'Ukraine': 'ua', 'Belarus': 'by', 'Lithuania': 'lt', 'Latvia': 'lv',
  'Estonia': 'ee', 'Slovenia': 'si', 'Bosnia': 'ba', 'Albania': 'al',
  'Ecuador': 'ec', 'Venezuela': 've', 'Bolivia': 'bo', 'Paraguay': 'py',
  'Uruguay': 'uy', 'Costa Rica': 'cr', 'Panama': 'pa', 'Guatemala': 'gt',
  'Cuba': 'cu', 'Dominican Republic': 'do', 'Honduras': 'hn',
};

const CODE_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_CODES).map(([name, code]) => [code.toLowerCase(), name])
);

function normalizeCountry(raw: string): { name: string; code: string } {
  if (!raw) return { name: '', code: '' };
  if (COUNTRY_CODES[raw]) return { name: raw, code: COUNTRY_CODES[raw] };
  const lower = raw.toLowerCase();
  if (CODE_TO_COUNTRY[lower]) return { name: CODE_TO_COUNTRY[lower], code: lower };
  const titleCase = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  if (COUNTRY_CODES[titleCase]) return { name: titleCase, code: COUNTRY_CODES[titleCase] };
  return { name: raw, code: 'in' };
}

interface TrafficEntry {
  id: string;
  country: string;
  countryCode: string;
  page: string;
  pageHref: string;
  secondsAgo: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const REFETCH_INTERVAL = 30000;
const QUEUE_TICK = 3000;

function RealTimeTraffic() {
  const [visible, setVisible] = React.useState<TrafficEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [exiting, setExiting] = React.useState(false);
  const poolRef = React.useRef<TrafficEntry[]>([]);
  const queueIdx = React.useRef(0);

  React.useEffect(() => {
    loadTraffic();
    const interval = setInterval(loadTraffic, REFETCH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // FIFO queue: every tick, pop top, push new from bottom
  React.useEffect(() => {
    const tick = setInterval(() => {
      if (poolRef.current.length === 0) return;
      setExiting(true);
      setTimeout(() => {
        setVisible((prev) => {
          const pool = poolRef.current;
          const next = pool[queueIdx.current % pool.length];
          queueIdx.current = (queueIdx.current + 1) % pool.length;
          const updated = [...prev.slice(1), { ...next, secondsAgo: Math.floor(Math.random() * 8) + 1 }];
          return updated;
        });
        setExiting(false);
      }, 400);
    }, QUEUE_TICK);
    return () => clearInterval(tick);
  }, []);

  // Tick secondsAgo every second
  React.useEffect(() => {
    const tick = setInterval(() => {
      setVisible((prev) => prev.map((e) => ({ ...e, secondsAgo: e.secondsAgo + 1 })));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  async function loadTraffic() {
    if (!supabase) return;
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const [blogsRes, newsRes, classifiedsRes] = await Promise.all([
        supabase
          .from('blog_posts')
          .select('id, title, slug, updated_at, author:profiles!user_id(country)')
          .eq('published', true)
          .not('slug', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(17),
        supabase
          .from('news')
          .select('id, title, slug, updated_at, country_name')
          .eq('published', true)
          .order('updated_at', { ascending: false })
          .limit(17),
        supabase
          .from('classifieds')
          .select('id, title, slug, updated_at, user:profiles!user_id(country)')
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .limit(17),
      ]);

      // Also get recently active users for country diversity
      const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, country, last_seen')
        .not('country', 'is', null)
        .not('last_seen', 'is', null)
        .order('last_seen', { ascending: false })
        .limit(30);

      const now = Date.now();
      const traffic: TrafficEntry[] = [];

      // Build entries from recent content + active user countries
      const countries = new Set<string>();
      (recentUsers || []).forEach((u: any) => {
        if (u.country) countries.add(u.country);
      });

      const allContent: { type: string; title: string; href: string; country: string; updated: string }[] = [];

      (blogsRes.data || []).forEach((b: any) => {
        const author = Array.isArray(b.author) ? b.author[0] : b.author;
        const country = author?.country || '';
        allContent.push({
          type: 'blog', title: b.title, href: `/blog/${b.slug || b.id}`,
          country, updated: b.updated_at,
        });
      });
      (newsRes.data || []).forEach((n: any) => {
        allContent.push({
          type: 'news', title: n.title, href: `/news/${n.slug || n.id}/${n.id}`,
          country: n.country_name || '', updated: n.updated_at,
        });
      });
      (classifiedsRes.data || []).forEach((c: any) => {
        const user = Array.isArray(c.user) ? c.user[0] : c.user;
        const country = user?.country || '';
        allContent.push({
          type: 'classified', title: c.title, href: `/classifieds/${c.slug || c.id}`,
          country, updated: c.updated_at,
        });
      });

      // Weighted country pool: ~60% India, ~15% USA, ~25% others
      const mixCountries = [
        'India', 'India', 'India', 'India', 'India', 'India',
        'United States', 'United States',
        'United Kingdom', 'Canada', 'Australia', 'Germany',
        'Nigeria', 'South Africa', 'Pakistan', 'Bangladesh',
        'Philippines', 'Malaysia', 'Singapore', 'Nepal',
      ];
      // Add any real countries from active users
      const realCountries = Array.from(countries).filter((c) => c !== 'India');
      const fullPool = [...mixCountries, ...realCountries];

      let ci = 0;
      allContent.forEach((item, idx) => {
        let rawCountry = item.country;
        if (!rawCountry) {
          rawCountry = fullPool[ci % fullPool.length];
          ci++;
        }
        const { name: countryName, code: countryCode } = normalizeCountry(rawCountry);
        const updatedTime = new Date(item.updated).getTime();
        const secsAgo = Math.max(1, Math.floor((now - updatedTime) / 1000));
        const displaySecs = Math.min(secsAgo, 30 + idx * 3);

        traffic.push({
          id: `${item.type}-${idx}`,
          country: countryName,
          countryCode,
          page: item.title,
          pageHref: item.href,
          secondsAgo: displaySecs,
        });
      });

      // Ensure exactly 50 entries by recycling with different countries if needed
      const padded: TrafficEntry[] = [...traffic];
      let padIdx = 0;
      while (padded.length < 50 && traffic.length > 0) {
        const src = traffic[padIdx % traffic.length];
        const rawC = fullPool[padded.length % fullPool.length];
        const { name: cName, code: cCode } = normalizeCountry(rawC);
        padded.push({
          ...src,
          id: `${src.id}-dup-${padded.length}`,
          country: cName,
          countryCode: cCode,
        });
        padIdx++;
      }

      const shuffled = shuffleArray(padded).slice(0, 50);
      poolRef.current = shuffled;
      queueIdx.current = 4;
      setVisible(
        shuffled.slice(0, 4).map((e, i) => ({
          ...e,
          secondsAgo: Math.floor(Math.random() * 8) + 1 + i * 3,
        }))
      );
    } catch (err) {
      console.error('Error loading traffic:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatSecs(s: number): string {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m`;
  }

  return (
    <div className="bg-white rounded-none border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-gray-100">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <h3 className="font-bold text-gray-900 text-base">Real time traffic</h3>
      </div>
      <div className="h-[250px] overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex gap-2">
                <div className="h-10 w-full bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : visible.length > 0 ? (
          <div className="relative h-full flex flex-col justify-between">
            {visible.map((entry, i) => (
              <div
                key={entry.id}
                className={`px-4 py-3 border-b border-gray-100 flex items-start gap-3 transition-all duration-400 ${
                  i === 0 && exiting
                    ? 'opacity-0 -translate-y-full max-h-0 py-0 overflow-hidden'
                    : i === visible.length - 1 && !exiting
                    ? 'animate-fadeInUp'
                    : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-gray-600 leading-snug">
                    A visitor from <span className="text-gray-900 font-semibold">{entry.country}</span> viewed{' '}
                    <Link href={entry.pageHref} className="text-gray-900 font-semibold hover:text-indigo-600 hover:underline">
                      {entry.page.length > 55 ? entry.page.substring(0, 55) + '...' : entry.page}
                    </Link>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                  <img
                    src={`https://flagcdn.com/w40/${entry.countryCode}.png`}
                    srcSet={`https://flagcdn.com/w80/${entry.countryCode}.png 2x`}
                    alt={entry.country}
                    className="h-4 w-6 object-cover rounded-sm border border-gray-200"
                  />
                  <span className="text-[12px] text-gray-400 tabular-nums whitespace-nowrap">{formatSecs(entry.secondsAgo)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-gray-400">No recent activity</div>
        )}
      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

interface SuggestCompany {
  name: string;
  logo_url: string | null;
  slug: string;
  country_name: string;
}

function CompanyReviewCard() {
  const [company, setCompany] = React.useState<SuggestCompany | null>(null);
  const [pool, setPool] = React.useState<SuggestCompany[]>([]);
  const [idx, setIdx] = React.useState(0);
  const [slideDir, setSlideDir] = React.useState<'next' | 'prev'>('next');
  const actionDirRef = React.useRef<'next' | 'prev'>('next');
  const [logoOk, setLogoOk] = React.useState(true);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('mlm_companies')
          .select('name, logo_url, slug, country_name')
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!data || data.length === 0) return;
        setPool(data as SuggestCompany[]);
        const start = Math.floor(Math.random() * data.length);
        setIdx(start);
        setCompany((data as SuggestCompany[])[start]);
        setLogoOk(true);
      } catch (err) {
        console.error('Error loading suggestion:', err);
      }
    })();
  }, []);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = React.useCallback(() => {
    clearTimer();
    if (pool.length <= 1) return;
    timerRef.current = window.setInterval(() => {
      actionDirRef.current = 'next';
      setIdx((prev) => (prev + 1) % pool.length);
    }, 5000);
  }, [clearTimer, pool.length]);

  React.useEffect(() => {
    if (pool.length === 0) return;
    const next = pool[idx % pool.length];
    setCompany(next);
    setSlideDir(actionDirRef.current);
    setLogoOk(true);
    startTimer();
    return () => clearTimer();
  }, [idx, pool, startTimer, clearTimer]);

  const goPrev = React.useCallback(() => {
    if (pool.length === 0) return;
    actionDirRef.current = 'prev';
    setIdx((prev) => (prev - 1 + pool.length) % pool.length);
  }, [pool.length]);

  const goNext = React.useCallback(() => {
    if (pool.length === 0) return;
    actionDirRef.current = 'next';
    setIdx((prev) => (prev + 1) % pool.length);
  }, [pool.length]);

  if (!company) return null;

  const companyHref = company.slug && company.country_name
    ? `/company/${encodeURIComponent(company.country_name)}/${company.slug}`
    : '/companies';

  return (
    <div className="bg-white rounded-none border border-indigo-200 shadow-sm overflow-hidden relative">
      {pool.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous suggested company"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 inline-flex items-center justify-center rounded-none border border-indigo-200 bg-white/95 text-gray-700 hover:bg-white transition-colors shadow-sm"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next suggested company"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 inline-flex items-center justify-center rounded-none border border-indigo-200 bg-white/95 text-gray-700 hover:bg-white transition-colors shadow-sm"
          >
            ›
          </button>
        </>
      )}
      <div
        key={`${company.slug}-${idx}`}
        className={slideDir === 'next' ? 'cr-slide-in-from-right' : 'cr-slide-in-from-left'}
      >
        <div className="h-16 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 relative">
          <span className="absolute top-2 right-2 text-[10px] bg-white/90 text-gray-600 font-semibold px-2 py-0.5 rounded-none border border-white/60">
            Suggested
          </span>
          {company.logo_url && logoOk ? (
            <img
              src={company.logo_url}
              alt={company.name}
              onError={() => setLogoOk(false)}
              className="absolute -bottom-7 left-4 w-[5.5rem] h-[5.5rem] rounded-none border border-gray-200 object-contain bg-white shadow-sm"
            />
          ) : (
            <div className="absolute -bottom-7 left-4 w-[5.5rem] h-[5.5rem] rounded-none border border-gray-200 bg-indigo-50 flex items-center justify-center shadow-sm">
              <Building2 className="h-7 w-7 text-indigo-600" />
            </div>
          )}
        </div>
        <div className="pt-8 px-12 pb-3 bg-gradient-to-b from-white to-indigo-50/40">
          <Link href={companyHref}>
            <h4 className="text-[14px] font-bold text-gray-900 hover:text-indigo-600 transition-colors leading-tight">
              {company.name}
            </h4>
          </Link>
          <p className="text-[12px] text-gray-500 mt-1 leading-snug">
            Review this company and earn points! Share your experience to help others.
          </p>
          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="h-4 w-4 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
        <div className="bg-gradient-to-r from-indigo-50 via-white to-sky-50 border-t border-indigo-100 px-12 py-2.5">
          <Link
            href={companyHref}
            className="w-full inline-flex items-center justify-center py-2 rounded-none border border-indigo-600 text-indigo-700 hover:bg-indigo-600 hover:text-white text-sm font-semibold transition-colors"
          >
            Review & Earn Points
          </Link>
        </div>
      </div>

      <style jsx>{`
        .cr-slide-in-from-right {
          animation: crSlideInFromRight 260ms ease-out;
          will-change: transform, opacity;
        }
        .cr-slide-in-from-left {
          animation: crSlideInFromLeft 260ms ease-out;
          will-change: transform, opacity;
        }
        @keyframes crSlideInFromRight {
          from {
            opacity: 0.4;
            transform: translateX(18px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes crSlideInFromLeft {
          from {
            opacity: 0.4;
            transform: translateX(-18px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .cr-slide-in-from-right,
          .cr-slide-in-from-left {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

interface TopEarner {
  id: string;
  full_name: string;
  username: string;
  image_url: string | null;
  points: number;
  is_premium: boolean;
  is_verified: boolean;
}

interface RecommendedSellerPreview {
  id: string;
  full_name: string;
  username: string;
  image_url: string | null;
  company_name: string | null;
  country: string | null;
  created_at: string | null;
}

type FollowStatus = 'none' | 'loading' | 'pending';

interface RecommendedCompany {
  id: string;
  name: string;
  logo_url: string | null;
  country_name: string | null;
  slug: string;
}

function RecommendedUnconnectedDirectSellersCard() {
  const { user } = useAuth();
  const [rows, setRows] = React.useState<RecommendedSellerPreview[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [statusById, setStatusById] = React.useState<Record<string, FollowStatus>>({});

  React.useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        setErr(null);
        setLoading(true);

        const exclude = new Set<string>();
        if (user?.id) {
          const { data: conns, error: connsErr } = await supabase
            .from('classified_connections')
            .select('owner_id, connector_id, status')
            .or(`owner_id.eq.${user.id},connector_id.eq.${user.id}`)
            .in('status', ['pending', 'accepted'])
            .limit(500);
          if (connsErr) throw connsErr;
          (conns || []).forEach((c: any) => {
            const other = c.owner_id === user.id ? c.connector_id : c.owner_id;
            if (other) exclude.add(other);
          });
          exclude.add(user.id);
        }

        let q: any = supabase
          .from('profiles')
          .select('id, full_name, username, image_url, country, created_at, points, is_direct_seller, company:mlm_companies!profiles_company_id_fkey(name)')
          .eq('is_direct_seller', true)
          .not('username', 'is', null)
          .order('points', { ascending: false })
          .limit(3);

        if (exclude.size > 0) {
          q = q.not('id', 'in', `(${Array.from(exclude).join(',')})`);
        }

        const { data, error } = await q;
        if (error) throw error;

        const mapped: RecommendedSellerPreview[] = (data || []).map((d: any) => ({
          id: d.id,
          full_name: d.full_name || d.username || 'Seller',
          username: d.username || '',
          image_url: d.image_url ?? null,
          company_name: d?.company?.name ?? null,
          country: d.country ?? null,
          created_at: d.created_at ?? null,
        }));

        setRows(mapped.sort(() => Math.random() - 0.5));
      } catch (e: any) {
        console.error('Error loading unconnected sellers:', e);
        setErr(e?.message || 'Failed to load recommendations.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  async function followSeller(profileId: string) {
    if (!supabase) return;
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setStatusById((p) => ({ ...p, [profileId]: 'loading' }));
    try {
      const { error } = await supabase.from('classified_connections').insert({
        owner_id: profileId,
        connector_id: user.id,
        status: 'pending',
        remark: 'Connection request from recommendations card',
      });
      if (error) throw error;
      setStatusById((p) => ({ ...p, [profileId]: 'pending' }));
    } catch (e: any) {
      console.error('Error following seller:', e);
      setStatusById((p) => ({ ...p, [profileId]: 'none' }));
    }
  }

  return (
    <div className="bg-white rounded-none border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="font-semibold text-gray-900">Recommended for you</p>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-none border border-gray-200 bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : err ? (
        <div className="p-4 text-sm text-red-600 font-semibold">{err}</div>
      ) : rows.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">No recommendations right now.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {rows.map((r) => {
            const st = statusById[r.id] || 'none';
            return (
              <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                <Link
                  href={`/recommended-direct-sellers/${encodeURIComponent(r.username)}`}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={r.full_name}
                      className="w-11 h-11 rounded-full object-cover border border-gray-200 bg-white flex-shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{r.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{r.company_name || 'Direct Seller'}</p>
                  </div>
                </Link>

                <button
                  type="button"
                  disabled={st !== 'none'}
                  onClick={() => followSeller(r.id)}
                  className={`inline-flex items-center justify-center px-4 py-1.5 rounded-none border text-sm font-semibold transition-colors ${
                    st === 'pending'
                      ? 'border-gray-300 text-gray-500 bg-gray-50 cursor-not-allowed'
                      : st === 'loading'
                        ? 'border-gray-300 text-gray-400 bg-white cursor-wait'
                        : 'border-indigo-600 text-indigo-700 hover:bg-indigo-600 hover:text-white'
                  }`}
                >
                  {st === 'pending' ? 'Pending' : st === 'loading' ? '...' : 'Connect'}
                </button>
              </div>
            );
          })}

          <div className="px-4 py-3 flex justify-center">
            <Link href="/recommended-direct-sellers" className="inline-flex items-center gap-2 text-gray-700 hover:text-indigo-700 font-semibold">
              Show more <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendedCompaniesReviewCard() {
  const [companies, setCompanies] = React.useState<RecommendedCompany[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const { data, error } = await supabase
          .from('mlm_companies')
          .select('id, name, logo_url, country_name, slug')
          .eq('status', 'approved')
          .order('review_count', { ascending: false })
          .limit(20);
        if (error) throw error;
        const mapped: RecommendedCompany[] = (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          logo_url: c.logo_url ?? null,
          country_name: c.country_name ?? null,
          slug: c.slug || c.id,
        }));
        setCompanies(mapped.sort(() => Math.random() - 0.5));
        setIdx(0);
      } catch (e: any) {
        console.error('Error loading recommended companies:', e);
        setErr(e?.message || 'Failed to load companies.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function next() {
    setIdx((prev) => (prev + 1) % Math.max(companies.length, 1));
  }
  function prev() {
    setIdx((prev) => (prev - 1 + Math.max(companies.length, 1)) % Math.max(companies.length, 1));
  }

  if (!loading && (err || companies.length === 0)) return null;

  const visible = companies.slice(idx, idx + 3).concat(companies.slice(0, Math.max(0, 3 - (companies.length - idx))));

  return (
    <div className="bg-white rounded-none border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="font-semibold text-gray-900">Companies recommended for you</p>
        <Link
          href="/companies"
          className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
        >
          Show all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="p-4 flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 flex-1 border border-gray-200 bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="relative px-2 py-3">
          {companies.length > 3 && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-1 top-1/2 -translate-y-1/2 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                aria-label="Previous companies"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-1 top-1/2 -translate-y-1/2 z-10 h-7 w-7 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                aria-label="Next companies"
              >
                ›
              </button>
            </>
          )}
          <div className="flex gap-3 overflow-hidden">
            {visible.map((c) => {
              const href = c.country_name
                ? `/company/${encodeURIComponent(c.country_name)}/${c.slug}`
                : `/company/India/${c.slug}`;
              return (
                <Link
                  key={c.id}
                  href={href}
                  className="flex-1 min-w-0 bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-shadow p-3 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {c.logo_url ? (
                      <img
                        src={c.logo_url}
                        alt={c.name}
                        className="w-9 h-9 rounded-none border border-gray-200 object-contain bg-white flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-none bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-indigo-700" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                      {c.country_name && (
                        <p className="text-xs text-gray-500 truncate">{c.country_name}</p>
                      )}
                    </div>
                  </div>
                  <span className="mt-auto text-xs font-semibold text-indigo-700">Review this company</span>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 flex justify-center sm:hidden">
            <Link
              href="/companies"
              className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
            >
              Show more <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

interface LatestNewsItem {
  id: string;
  title: string;
  slug: string | null;
  image_url: string | null;
  created_at: string;
  country_name: string | null;
  excerpt: string;
}

function TopEarners() {
  const [earners, setEarners] = React.useState<TopEarner[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, username, image_url, points, is_premium, is_verified')
          .eq('is_direct_seller', true)
          .order('points', { ascending: false })
          .limit(4);
        setEarners(
          (data || []).map((d: any) => ({
            id: d.id,
            full_name: d.full_name || d.username || 'Seller',
            username: d.username || '',
            image_url: d.image_url,
            points: d.points || 0,
            is_premium: d.is_premium || false,
            is_verified: d.is_verified || false,
          }))
        );
      } catch (err) {
        console.error('Error loading top earners:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function resolveAvatar(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    try {
      const { data } = supabase?.storage?.from('avatars')?.getPublicUrl(url) ?? { data: { publicUrl: null } };
      return (data as any)?.publicUrl ?? null;
    } catch { return null; }
  }

  return (
    <div className="bg-white rounded-none border border-indigo-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-white/90" />
          <h3 className="font-bold text-white text-sm">Top Leaderboard</h3>
        </div>
        <Link href="/direct-sellers" className="text-white/90 hover:text-white text-xs font-semibold underline underline-offset-4">
          View All
        </Link>
      </div>
      {loading ? (
        <div className="p-3 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2.5 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-100" />
              <div className="flex-1">
                <div className="h-3 bg-gray-100 rounded w-24 mb-1" />
                <div className="h-2.5 bg-gray-50 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : earners.length > 0 ? (
        <div className="p-2">
          {earners.map((e, idx) => {
            const avatar = resolveAvatar(e.image_url);
            const rowTint =
              idx === 0
                ? 'from-yellow-50 via-white to-amber-50 border-yellow-200'
                : idx === 1
                ? 'from-slate-50 via-white to-gray-50 border-slate-200'
                : idx === 2
                ? 'from-orange-50 via-white to-amber-50 border-orange-200'
                : 'from-indigo-50/60 via-white to-sky-50/60 border-indigo-100';
            return (
              <Link
                key={e.id}
                href={`/recommended-direct-sellers/${e.username}`}
                className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-none border bg-gradient-to-r ${rowTint} hover:shadow-sm transition-shadow`}
              >
                <div className="relative flex-shrink-0">
                  {avatar ? (
                    <img src={avatar} alt={e.full_name} className="w-11 h-11 rounded-none object-cover border border-gray-200 bg-white" />
                  ) : (
                    <div className="w-11 h-11 rounded-none bg-indigo-600/10 border border-indigo-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                  )}
                  {idx < 3 && (
                    <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-none text-[9px] font-bold flex items-center justify-center text-white border border-white/80 shadow ${
                      idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-500' : 'bg-amber-700'
                    }`}>
                      {idx + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate leading-tight">{e.full_name}</p>
                  <p className="text-[11px] text-gray-500 truncate">@{e.username}</p>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 flex-shrink-0">{e.points} pts</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="p-3 text-center text-xs text-gray-400">No sellers found</div>
      )}
    </div>
  );
}

function RecommendedDirectSellersPreview() {
  const [sellers, setSellers] = React.useState<RecommendedSellerPreview[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const SELLERS_TO_SHOW = 12;
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        setLoadError(null);

        const { data: premiumData, error: premiumErr } = await supabase
          .from('profiles')
          .select('id, full_name, username, image_url, country, created_at, points, is_premium, company:mlm_companies!profiles_company_id_fkey(name)')
          .eq('is_premium', true)
          .not('username', 'is', null)
          .order('points', { ascending: false })
          .limit(SELLERS_TO_SHOW);
        if (premiumErr) throw premiumErr;

        setSellers(
          (premiumData || []).map((d: any) => ({
            id: d.id,
            full_name: d.full_name || d.username || 'Seller',
            username: d.username || '',
            image_url: d.image_url ?? null,
            company_name: d?.company?.name ?? null,
            country: d.country ?? null,
            created_at: d.created_at ?? null,
          }))
        );
      } catch (err) {
        const e = err as any;
        console.error('Error loading recommended sellers:', e);
        setLoadError(e?.message || 'Failed to load recommended sellers.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Infinite auto-scroll horizontally (left -> right)
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading || sellers.length <= 1) return;
    if (typeof window === 'undefined') return;

    let rafId = 0;
    const pxPerFrame = 0.6; // smooth speed

    const tick = () => {
      // With duplicated content, reset at halfway for seamless loop
      const half = el.scrollWidth / 2;
      el.scrollLeft += pxPerFrame;
      if (el.scrollLeft >= half) {
        el.scrollLeft = 0;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [loading, sellers.length]);

  function resolveAvatar(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    try {
      const { data } = supabase?.storage?.from('avatars')?.getPublicUrl(url) ?? { data: { publicUrl: null } };
      return (data as any)?.publicUrl ?? null;
    } catch { return null; }
  }

  function formatSince(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const month = d.toLocaleString(undefined, { month: 'short' });
    const day = d.getDate();
    const year = d.getFullYear();
    return `Since ${month} ${day}, ${year}`;
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Recommended Direct Sellers
        </h2>
        <Link
          href="/recommended-direct-sellers?sortBy=points"
          className="hidden sm:inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-800 font-semibold"
        >
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 rounded-none border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-4 shadow-sm">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: Math.min(6, SELLERS_TO_SHOW) }).map((_, i) => (
              <div key={i} className="h-20 rounded-none border border-gray-200 bg-white animate-pulse" />
            ))}
          </div>
        ) : sellers.length > 0 ? (
          <>
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-hidden pb-2"
              style={{ scrollbarWidth: 'none' }}
            >
              {[...sellers, ...sellers].map((s, i) => {
                const avatar = resolveAvatar(s.image_url);
                const since = formatSince(s.created_at);
                const c = s.country ? normalizeCountry(s.country) : null;
                return (
                  <Link
                    key={`${s.id}-${i}`}
                    href={`/recommended-direct-sellers/${encodeURIComponent(s.username)}`}
                    className="group bg-white rounded-none border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4 min-w-[320px] sm:min-w-[360px] md:min-w-[420px]"
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={s.full_name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-none object-cover border border-gray-200 bg-white"
                      />
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-none bg-indigo-600/10 border border-indigo-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-indigo-600" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-bold text-[15px] sm:text-[16px] text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                          {s.full_name}
                        </p>
                        {c?.code && (
                          <img
                            src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                            srcSet={`https://flagcdn.com/w80/${c.code.toLowerCase()}.png 2x`}
                            alt={c.name}
                            className="h-4 w-6 sm:h-5 sm:w-7 object-cover border border-gray-200 flex-shrink-0"
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {s.company_name || 'Direct Seller'}
                      </p>
                      {since && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{since}</p>
                      )}
                    </div>

                    <ChevronRight className="h-6 w-6 text-gray-300 group-hover:text-indigo-400 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 flex justify-center">
              <Link
                href="/register?type=recommended-direct-seller"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-none bg-indigo-700 hover:bg-indigo-800 text-white font-bold shadow-sm"
              >
                Register as Recommended Direct Seller
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center text-sm text-gray-500 py-6">
            {loadError ? (
              <span className="text-red-600 font-semibold">{loadError}</span>
            ) : (
              'No recommended sellers found right now.'
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function LatestNewsSection() {
  const [items, setItems] = React.useState<LatestNewsItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('news')
          .select('id, title, slug, image_url, created_at, country_name, content')
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(12);
        setItems(
          (data || []).map((n: any) => ({
            id: n.id,
            title: n.title || 'News',
            slug: n.slug || null,
            image_url: n.image_url || null,
            created_at: n.created_at,
            country_name: n.country_name || null,
            excerpt: stripHtml(n.content || '').substring(0, 140),
          }))
        );
      } catch (err) {
        console.error('Error loading latest news:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-scroll horizontally through news cards (one card at a time, smooth)
  React.useEffect(() => {
    const container = scrollRef.current;
    if (!container || items.length <= 3) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      const firstCard = container.firstElementChild as HTMLElement | null;
      if (!firstCard) return;

      const style = window.getComputedStyle(firstCard);
      const marginRight = parseFloat(style.marginRight || '0');
      const cardWidth = firstCard.offsetWidth + marginRight;

      currentIndex = (currentIndex + 1) % items.length;
      const target = currentIndex * cardWidth;

      container.scrollTo({
        left: target,
        behavior: 'smooth',
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [items.length]);

  function formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (!loading && items.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Latest News
        </h2>
        <Link
          href="/news"
          className="hidden sm:inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-800 font-semibold"
        >
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 rounded-none border border-indigo-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-5 sm:p-6 shadow-sm">
        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 min-w-[260px] sm:min-w-[300px] rounded-none border border-gray-200 bg-white animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent pb-2 -mx-1 px-1 snap-x snap-mandatory"
            >
              {items.map((n) => {
                const href = n.slug ? `/news/${n.slug}/${n.id}` : `/news/${n.id}`;
                const dateLabel = formatDate(n.created_at);
                const c = n.country_name ? normalizeCountry(n.country_name) : null;
                return (
                  <Link
                    key={n.id}
                    href={href}
                    className="group bg-white rounded-none border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full min-w-[260px] sm:min-w-[300px] max-w-xs snap-start"
                  >
                    {/* Image */}
                    <div className="h-36 w-full overflow-hidden border-b border-gray-200 bg-gray-50 flex items-center justify-center">
                      {n.image_url ? (
                        <img
                          src={n.image_url}
                          alt={n.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-sky-600/10">
                          <Newspaper className="h-9 w-9 text-sky-700" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col px-4 pt-3 pb-4">
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-500 mb-1.5">
                        {dateLabel && <span>{dateLabel}</span>}
                        {c?.name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {c.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm sm:text-[15px] font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                        {n.title}
                      </p>
                      {n.excerpt && (
                        <p className="mt-2 text-xs sm:text-[13px] text-gray-600 line-clamp-3">
                          {n.excerpt}...
                        </p>
                      )}
                      <span className="mt-3 inline-flex items-center text-xs sm:text-sm font-semibold text-orange-600 group-hover:text-orange-700">
                        Read More
                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-5 flex justify-center sm:hidden">
              <Link
                href="/news"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-none bg-indigo-700 hover:bg-indigo-800 text-white font-bold shadow-sm"
              >
                View all News
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function toFeedItem(
  type: 'blog' | 'classified' | 'news' | 'company',
  raw: any
): BaseFeedItem | null {
  const created_at = raw.created_at || raw.updated_at || new Date().toISOString();
  let title = '';
  let excerpt = '';
  let image_url: string | null = null;
  let href = '';
  let author_id: string | undefined;
  let author_name = '';
  let author_username = '';
  let author_avatar: string | null = null;
  let is_premium = false;
  let is_verified = false;
  let location: string | undefined;
  let likes = 0;
  let views = 0;
  let comments = 0;
  let category_name: string | undefined;

  if (type === 'blog') {
    title = raw.title || '';
    excerpt = stripHtml(raw.content || '').substring(0, 160);
    image_url = raw.cover_image || null;
    href = raw.slug ? `/blog/${raw.slug}` : `/blog/${raw.id}`;
    const author = Array.isArray(raw.author) ? raw.author[0] : raw.author;
    author_id = author?.id || raw.user_id;
    author_name = author?.full_name || author?.username || 'Author';
    author_username = author?.username || '';
    author_avatar = author?.image_url ?? null;
    is_premium = author?.is_premium === true;
    is_verified = author?.is_verified === true;
    views = raw.views ?? raw.view_count ?? 0;
  } else if (type === 'classified') {
    title = raw.title || '';
    excerpt = (raw.description || '').substring(0, 160);
    image_url = raw.image_url || null;
    href = raw.slug ? `/classifieds/${raw.slug}` : `/classifieds/${raw.id}`;
    const user = Array.isArray(raw.user) ? raw.user[0] : raw.user;
    author_id = user?.id || raw.user_id;
    author_name = user?.username || 'Member';
    author_username = user?.username || '';
    author_avatar = user?.image_url ?? null;
    is_premium = user?.is_premium === true || raw.is_premium === true;
    is_verified = user?.is_verified === true;
    likes = raw.likes ?? 0;
    views = raw.view_count ?? 0;
    category_name = raw.category_name;
  } else if (type === 'news') {
    title = raw.title || '';
    excerpt = stripHtml(raw.content || '').substring(0, 160);
    image_url = raw.image_url || null;
    href = raw.slug ? `/news/${raw.slug}/${raw.id}` : `/news/${raw.id}`;
    const author = Array.isArray(raw.author) ? raw.author[0] : raw.author;
    author_id = author?.id || raw.user_id;
    author_name = author?.full_name || author?.username || 'Editor';
    author_username = author?.username || '';
    author_avatar = author?.image_url ?? null;
    is_premium = author?.is_premium === true;
    is_verified = true;
    likes = raw.likes ?? 0;
    views = raw.views ?? 0;
    location = raw.country_name;
    category_name = raw.category?.name;
  } else {
    title = raw.name || '';
    excerpt = (raw.description || '').substring(0, 160);
    image_url = raw.logo_url || null;
    const country = raw.country_name || raw.country || '';
    href = raw.slug && country ? `/company/${encodeURIComponent(country)}/${raw.slug}` : `/companies`;
    author_name = raw.name || 'Company';
    author_avatar = null;
    is_verified = true;
    location = country;
    category_name = raw.category_info?.name;
  }

  return {
    id: `${type}-${raw.id}`,
    type,
    created_at,
    title,
    excerpt,
    image_url,
    href,
    author_id,
    author_name,
    author_username,
    author_avatar,
    is_premium,
    is_verified,
    location,
    likes,
    views,
    comments,
    shares: 0,
    category_name,
  };
}

interface UserProfile {
  full_name: string;
  username: string;
  image_url: string | null;
  seller_bio: string | null;
  country: string | null;
  city: string | null;
  company_id: string | null;
  company_name: string | null;
  company_logo: string | null;
  company_slug: string | null;
  company_country: string | null;
  is_premium: boolean;
  is_verified: boolean;
  profile_views: number;
  post_impressions: number;
}

function resolveProfileAvatar(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  try {
    const { data } = supabase?.storage?.from('avatars')?.getPublicUrl(imageUrl) ?? { data: { publicUrl: null } };
    return (data as any)?.publicUrl ?? null;
  } catch { return null; }
}

export function HomePageContent() {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = React.useState<BaseFeedItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const cursorRef = React.useRef<string | null>(null);
  const loadingRef = React.useRef(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    if (!user?.id) {
      // Guests should see the marketing homepage, not the feed.
      setLoading(false);
      return;
    }
    loadInitialFeed();
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id || !supabase) return;
    (async () => {
      try {
        const { data: p } = await supabase
          .from('profiles')
          .select('full_name, username, image_url, seller_bio, country, city, company_id, is_premium, is_verified')
          .eq('id', user.id)
          .single();
        if (!p) return;

        let companyName: string | null = null;
        let companyLogo: string | null = null;
        let companySlug: string | null = null;
        let companyCountry: string | null = null;
        if (p.company_id) {
          const { data: comp } = await supabase
            .from('mlm_companies')
            .select('name, logo_url, slug, country_name')
            .eq('id', p.company_id)
            .single();
          if (comp) {
            companyName = comp.name;
            companyLogo = comp.logo_url;
            companySlug = comp.slug || null;
            companyCountry = comp.country_name || null;
          }
        }

        const [blogViews, classifiedViews] = await Promise.all([
          supabase.from('blog_posts').select('views', { count: 'exact', head: false }).eq('author_id', user.id),
          supabase.from('classifieds').select('view_count', { count: 'exact', head: false }).eq('user_id', user.id),
        ]);

        const totalImpressions =
          (blogViews.data || []).reduce((s: number, b: any) => s + (b.views || 0), 0) +
          (classifiedViews.data || []).reduce((s: number, c: any) => s + (c.view_count || 0), 0);

        setProfile({
          full_name: p.full_name || p.username || 'User',
          username: p.username || '',
          image_url: p.image_url,
          seller_bio: p.seller_bio || null,
          country: p.country || null,
          city: p.city || null,
          company_id: p.company_id || null,
          company_name: companyName,
          company_logo: companyLogo,
          company_slug: companySlug,
          company_country: companyCountry,
          is_premium: p.is_premium || false,
          is_verified: p.is_verified || false,
          profile_views: Math.floor(Math.random() * 80) + 30,
          post_impressions: totalImpressions,
        });
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    })();
  }, [user?.id]);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadNextPage();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, feedItems.length]);

  async function loadInitialFeed() {
    try {
      const cached = cache.get<BaseFeedItem[]>(CACHE_KEY);
      if (cached && cached.length > 0) {
        setFeedItems(cached);
        cursorRef.current = cached[cached.length - 1].created_at;
        setHasMore(true);
        setLoading(false);
        return;
      }
      await fetchPage(null, true);
    } catch (error: any) {
      console.error('Error loading feed:', error);
      const stale = cache.get<BaseFeedItem[]>(CACHE_KEY);
      if (Array.isArray(stale)) setFeedItems(stale);
    } finally {
      setLoading(false);
    }
  }

  async function loadNextPage() {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      await fetchPage(cursorRef.current, false);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }

  async function fetchPage(cursor: string | null, isInitial: boolean) {
    if (!supabase) return;
    try {
      let blogQ = supabase
        .from('blog_posts')
        .select('*, author:profiles(id, username, full_name, image_url, is_premium, is_verified)')
        .eq('published', true)
        .not('slug', 'is', null)
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_SOURCE);

      let classifiedQ = supabase
        .from('classifieds')
        .select('*, user:profiles(id, username, image_url, is_premium, is_verified)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_SOURCE);

      let newsQ = supabase
        .from('news')
        .select('*, author:profiles(id, username, full_name, image_url, is_premium, is_verified), category:news_categories(id, name)')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_SOURCE);

      let companyQ = supabase
        .from('mlm_companies')
        .select('id, name, description, logo_url, country, country_name, slug, created_at, category_info:company_categories!category(id, name)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_SOURCE);

      if (cursor) {
        blogQ = blogQ.lt('created_at', cursor);
        classifiedQ = classifiedQ.lt('created_at', cursor);
        newsQ = newsQ.lt('created_at', cursor);
        companyQ = companyQ.lt('created_at', cursor);
      }

      const [blogsRes, classifiedsRes, newsRes, companiesRes] = await Promise.all([
        blogQ, classifiedQ, newsQ, companyQ,
      ]);

      const newItems: BaseFeedItem[] = [];
      (blogsRes.data || []).forEach((b: any) => {
        const item = toFeedItem('blog', b);
        if (item) newItems.push(item);
      });
      (classifiedsRes.data || []).forEach((c: any) => {
        const item = toFeedItem('classified', c);
        if (item) newItems.push(item);
      });
      (newsRes.data || []).forEach((n: any) => {
        const item = toFeedItem('news', n);
        if (item) newItems.push(item);
      });
      (companiesRes.data || []).forEach((co: any) => {
        const item = toFeedItem('company', co);
        if (item) newItems.push(item);
      });

      // Strict chronological sort — newest first
      newItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (newItems.length === 0) {
        setHasMore(false);
        return;
      }

      // Advance cursor to the oldest item in this batch
      const oldestItem = newItems[newItems.length - 1];
      cursorRef.current = oldestItem.created_at;

      // If every source returned fewer than ITEMS_PER_SOURCE, we've reached the end
      const allDrained =
        (blogsRes.data?.length || 0) < ITEMS_PER_SOURCE &&
        (classifiedsRes.data?.length || 0) < ITEMS_PER_SOURCE &&
        (newsRes.data?.length || 0) < ITEMS_PER_SOURCE &&
        (companiesRes.data?.length || 0) < ITEMS_PER_SOURCE;
      if (allDrained) setHasMore(false);

      if (isInitial) {
        setFeedItems(newItems);
        cache.set(CACHE_KEY, newItems, CACHE_TTL);
      } else {
        setFeedItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const deduped = newItems.filter((i) => !existingIds.has(i.id));
          return [...prev, ...deduped];
        });
      }
    } catch (error: any) {
      console.error('Error fetching feed page:', error);
    }
  }

  if (!user?.id) {
    return (
      <div className="bg-white">
        <Hero />

        {/* Mobile: show real-time traffic after slider */}
        <div className="block lg:hidden px-4 pt-6">
          <RealTimeTraffic />
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-r from-indigo-100 via-sky-50 to-emerald-100 border border-indigo-200/70 rounded-none p-6 sm:p-8 shadow-md">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                  Discover trusted MLM companies and connect with direct sellers.
                </h2>
                <p className="mt-3 text-gray-600 text-base sm:text-lg">
                  Join MLM Union to explore companies, read community blogs, view classifieds, and stay updated with news.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                  >
                    Create account
                    <ChevronRight className="h-4 w-4 ml-1.5" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold"
                  >
                    Sign in
                  </Link>
                </div>
                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 text-indigo-800 border border-indigo-200 rounded-none">
                    <Users className="h-4 w-4 text-indigo-600" /> Community
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600/10 text-emerald-800 border border-emerald-200 rounded-none">
                    <Building2 className="h-4 w-4 text-emerald-700" /> Companies directory
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-600/10 text-sky-800 border border-sky-200 rounded-none">
                    <Newspaper className="h-4 w-4 text-sky-700" /> News & updates
                  </span>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/companies"
                  className="group rounded-none border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-none bg-indigo-600/10 border border-indigo-200 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                         Browse Top MLM Companies
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Explore profiles, categories, and details.
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-400 ml-auto mt-1" />
                  </div>
                </Link>

                <Link
                  href="/direct-sellers"
                  className="group rounded-none border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-none bg-emerald-600/10 border border-emerald-200 flex items-center justify-center">
                      <UsersRound className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                        Find Top Direct Sellers
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Connect with sellers by niche and location.
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-emerald-400 ml-auto mt-1" />
                  </div>
                </Link>

                <Link
                  href="/blog"
                  className="group rounded-none border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-none bg-violet-600/10 border border-violet-200 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 group-hover:text-violet-700 transition-colors">
                        Read Blogs
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Learn from experiences and industry insights.
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-violet-400 ml-auto mt-1" />
                  </div>
                </Link>

                <Link
                  href="/classifieds"
                  className="group rounded-none border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-none bg-amber-600/10 border border-amber-200 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-amber-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 group-hover:text-amber-800 transition-colors">
                        View Classifieds
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Offers, requests, and local opportunities.
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-amber-400 ml-auto mt-1" />
                  </div>
                </Link>
              </div>

              <RecommendedDirectSellersPreview />
              <LatestNewsSection />
            </div>

            <aside className="space-y-4 lg:sticky lg:top-4">
              {/* Desktop: sidebar widgets */}
              <div className="hidden lg:block">
                <RealTimeTraffic />
              </div>
              <CompanyReviewCard />
              <TopEarners />
              <div className="bg-white rounded-none border border-gray-200 shadow-sm p-4">
                <p className="font-semibold text-gray-900">Want your personalized feed?</p>
                <p className="text-sm text-gray-500 mt-1">
                  Sign in to see the latest blogs, classifieds, news, and companies tailored for you.
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/login"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-none border border-gray-300 hover:bg-gray-50 text-sm font-semibold text-gray-800"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Left sidebar - Profile card + Main menu + Explore */}
          <aside className="lg:w-56 flex-shrink-0 order-2 lg:order-1">
            <div className="sticky top-4 space-y-4">
            {/* Profile card - logged in users only */}
              {profile && (
              <div className="bg-white rounded-none border border-gray-200 shadow-sm overflow-hidden">
                <div className="h-16 bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 relative">
                  {profile.image_url && (
                    <div className="absolute -bottom-6 left-4">
                      <Link href="/profile" className="relative block w-14 h-14">
                        <img
                          src={resolveProfileAvatar(profile.image_url) || ''}
                          alt={profile.full_name}
                          className="w-14 h-14 rounded-full border-2 border-white object-cover bg-white shadow"
                        />
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center border border-white shadow">
                          <Pencil className="h-3 w-3 text-white" />
                        </span>
                      </Link>
                    </div>
                  )}
                  {!profile.image_url && (
                    <div className="absolute -bottom-6 left-4">
                      <Link href="/profile" className="relative w-14 h-14 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center shadow">
                        <User className="h-7 w-7 text-indigo-600" />
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center border border-white shadow">
                          <Pencil className="h-3 w-3 text-white" />
                        </span>
                      </Link>
                    </div>
                  )}
                </div>
                <div className="pt-8 px-4 pb-3">
                  <Link href="/profile" className="block">
                    <h3 className="font-bold text-gray-900 text-[15px] leading-tight hover:text-indigo-600 transition-colors">
                      {profile.full_name}
                    </h3>
                  </Link>
                  {profile.seller_bio && (
                    <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">
                      {profile.seller_bio}
                    </p>
                  )}
                  {(profile.city || profile.country) && (
                    <p className="text-[12px] text-gray-400 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[profile.city, profile.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {profile.company_name && (
                    <Link
                      href={
                        profile.company_slug && profile.company_country
                          ? `/company/${encodeURIComponent(profile.company_country)}/${profile.company_slug}`
                          : '/companies'
                      }
                      className="flex items-center gap-1.5 mt-1.5 group"
                    >
                      {profile.company_logo ? (
                        <img src={profile.company_logo} alt="" className="h-10 w-10 rounded-none border border-gray-200 object-contain bg-white" />
                      ) : (
                        <Building2 className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="text-[12px] text-gray-600 font-medium group-hover:text-indigo-600 transition-colors">{profile.company_name}</span>
                    </Link>
                  )}
                </div>
                <div className="border-t border-gray-100 px-4 py-2.5 space-y-1.5">
                  <Link href="/profile" className="flex items-center justify-between text-[12px] hover:bg-gray-50 -mx-2 px-2 py-1 rounded-none transition-colors">
                    <span className="text-gray-500 flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Profile viewers</span>
                    <span className="text-indigo-600 font-semibold">{profile.profile_views}</span>
                  </Link>
                  <Link href="/dashboard" className="flex items-center justify-between text-[12px] hover:bg-gray-50 -mx-2 px-2 py-1 rounded-none transition-colors">
                    <span className="text-gray-500 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Post impressions</span>
                    <span className="text-indigo-600 font-semibold">{profile.post_impressions}</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="bg-white rounded-none border border-gray-200 shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
              <div className="space-y-1">
                <Link href="/my-blogs" className="flex items-center justify-between py-2 px-3 rounded-none hover:bg-gray-50 text-gray-700 text-sm">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    My Blogs
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
                <Link href="/my-classifieds" className="flex items-center justify-between py-2 px-3 rounded-none hover:bg-gray-50 text-gray-700 text-sm">
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    My Classifieds
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
                <Link href="/my-companies" className="flex items-center justify-between py-2 px-3 rounded-none hover:bg-gray-50 text-gray-700 text-sm">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    My Company
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              </div>
            </div>

            </div>
          </aside>

          {/* Center - Feed: full width on mobile, left-aligned; centered on lg */}
          <div className="flex-1 min-w-0 order-1 lg:order-2 w-full max-w-2xl ml-0 mr-auto lg:mx-0">
            {/* What's New composer */}
            <div className="bg-white rounded-none border border-gray-200 shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <Link href="/blog" className="block w-full text-left px-4 py-2.5 rounded-none border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors text-sm">
                    What&apos;s New?
                  </Link>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <button type="button" className="p-2 rounded-none hover:bg-gray-100" aria-label="Emoji">
                    <Sparkles className="h-5 w-5" />
                  </button>
                  <button type="button" className="p-2 rounded-none hover:bg-gray-100" aria-label="Image">
                    <Image className="h-5 w-5" />
                  </button>
                  <button type="button" className="p-2 rounded-none hover:bg-gray-100" aria-label="More">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Feed list */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-white rounded-none border border-gray-200 p-4 animate-pulse">
                    <div className="flex gap-3 mb-3">
                      <div className="w-12 h-12 rounded-none bg-gray-200" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                        <div className="h-3 bg-gray-100 rounded w-20" />
                      </div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-4" />
                    <div className="h-48 bg-gray-100 rounded-none" />
                  </div>
                ))}
              </div>
            ) : feedItems.length > 0 ? (
              <>
                <div className="space-y-4">
                  {feedItems.flatMap((item, idx) => {
                    const out: React.ReactNode[] = [<FeedCard key={item.id} item={item} />];
                    // After 3rd post: recommended direct sellers + companies
                    if (idx === 2) {
                      out.push(<RecommendedUnconnectedDirectSellersCard key="rec-sellers-once" />);
                      out.push(<RecommendedCompaniesReviewCard key="rec-companies-once" />);
                    }
                    return out;
                  })}
                </div>

                {/* Sentinel for infinite scroll */}
                <div ref={sentinelRef} className="h-1" />

                {loadingMore && (
                  <div className="flex justify-center py-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <svg className="animate-spin h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading more...
                    </div>
                  </div>
                )}

                {!hasMore && feedItems.length > 0 && (
                  <div className="text-center py-6 text-sm text-gray-400">
                    You&apos;re all caught up!
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-none border border-gray-200 shadow-sm p-12 text-center">
                <LayoutGrid className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No posts in your feed yet.</p>
                <p className="text-sm text-gray-400">Check back later for blogs, classifieds, news, and companies.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/blog" className="inline-flex items-center gap-1 text-indigo-600 font-medium text-sm">
                    Blog <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link href="/classifieds" className="inline-flex items-center gap-1 text-indigo-600 font-medium text-sm">
                    Classifieds <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link href="/news" className="inline-flex items-center gap-1 text-indigo-600 font-medium text-sm">
                    News <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Link href="/companies" className="inline-flex items-center gap-1 text-indigo-600 font-medium text-sm">
                    Companies <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar - Widgets */}
          <aside className="lg:w-72 flex-shrink-0 order-3 hidden xl:block">
            <div className="space-y-4 sticky top-4">
              <RealTimeTraffic />

              <CompanyReviewCard />

              <TopEarners />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
