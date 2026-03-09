'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Repeat2, Heart, BarChart2, Bookmark, Upload, MoreHorizontal, UserPlus, Check, Clock, Star, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export type FeedItemType = 'blog' | 'classified' | 'news' | 'company';

export interface BaseFeedItem {
  id: string;
  type: FeedItemType;
  created_at: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  href: string;
  author_id?: string;
  author_name: string;
  author_username?: string;
  author_avatar: string | null;
  is_premium?: boolean;
  is_verified?: boolean;
  location?: string;
  likes?: number;
  views?: number;
  comments?: number;
  shares?: number;
  category_name?: string;
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) {
    const m = Math.floor(diffInSeconds / 60);
    return `${m}m`;
  }
  if (diffInSeconds < 86400) {
    const h = Math.floor(diffInSeconds / 3600);
    return `${h}h`;
  }
  const d = Math.floor(diffInSeconds / 86400);
  return `${d}d`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toString();
}

function VerifiedBadge({ premium }: { premium?: boolean }) {
  if (premium) {
    return (
      <svg viewBox="0 0 22 22" className="h-[18px] w-[18px] flex-shrink-0" aria-label="Premium verified">
        <defs>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        <circle cx="11" cy="11" r="11" fill="url(#gold-grad)" />
        <path d="M6.5 11.5L9.5 14.5L15.5 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 22 22" className="h-[18px] w-[18px] flex-shrink-0" aria-label="Verified">
      <circle cx="11" cy="11" r="11" fill="#1D9BF0" />
      <path d="M6.5 11.5L9.5 14.5L15.5 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function resolveAvatarUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  try {
    const { data } = supabase?.storage?.from('avatars')?.getPublicUrl(imageUrl) ?? { data: { publicUrl: null } };
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

function getTypeBadge(type: FeedItemType): string {
  switch (type) {
    case 'blog': return 'Blog';
    case 'classified': return 'Classified';
    case 'news': return 'News';
    case 'company': return 'Company';
  }
}

function getSpotlightLabel(type: FeedItemType): string {
  switch (type) {
    case 'blog': return 'BLOG SPOTLIGHT';
    case 'classified': return 'CLASSIFIED SPOTLIGHT';
    case 'news': return 'NEWS SPOTLIGHT';
    default: return 'SPOTLIGHT';
  }
}

type ConnectStatus = 'none' | 'pending' | 'accepted' | 'loading';

export interface FeedCardProps {
  item: BaseFeedItem;
}

export function FeedCard({ item }: FeedCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const avatarUrl = resolveAvatarUrl(item.author_avatar);
  const displayName = item.author_name || item.author_username || 'Unknown';
  const handle = item.author_username ? `@${item.author_username}` : '';
  const isPremium = item.is_premium === true;
  const isVerified = item.is_verified === true || item.type === 'news' || item.type === 'company';

  const authorId = item.author_id;
  const showConnect = !!authorId && item.type !== 'company' && authorId !== user?.id;

  const [connectStatus, setConnectStatus] = React.useState<ConnectStatus>('none');

  React.useEffect(() => {
    if (showConnect && user?.id && authorId) {
      checkConnection(authorId);
    }
  }, [user?.id, authorId]);

  async function checkConnection(ownerId: string) {
    if (!user?.id || !supabase) return;
    try {
      const { data } = await supabase
        .from('classified_connections')
        .select('status')
        .or(
          `and(owner_id.eq.${ownerId},connector_id.eq.${user.id}),and(owner_id.eq.${user.id},connector_id.eq.${ownerId})`
        )
        .limit(1);
      if (data && data.length > 0) {
        const s = data[0].status;
        if (s === 'accepted') setConnectStatus('accepted');
        else if (s === 'pending') setConnectStatus('pending');
      }
    } catch {
      // silent
    }
  }

  async function handleConnect(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push('/login');
      return;
    }
    if (!authorId || !supabase) return;
    if (connectStatus !== 'none') return;

    setConnectStatus('loading');
    try {
      const { error } = await supabase.from('classified_connections').insert({
        owner_id: authorId,
        connector_id: user.id,
        status: 'pending',
        remark: 'Connection request from feed',
      });
      if (error) {
        if (error.code === '23505') {
          setConnectStatus('pending');
          toast('Connection request already sent', { icon: '👍' });
          return;
        }
        throw error;
      }
      setConnectStatus('pending');
      toast.success('Connection request sent!');
    } catch (err: any) {
      console.error('Error sending connection request:', err);
      toast.error('Failed to send request');
      setConnectStatus('none');
    }
  }

  return (
    <article className="bg-white border border-gray-200 rounded-xl hover:bg-gray-50/50 transition-colors">
      <div className="flex gap-3 p-4">
        {/* Avatar */}
        <Link href={item.href} className="flex-shrink-0">
          {item.type === 'company' && item.image_url ? (
            <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
              <img src={item.image_url} alt={displayName} className="w-full h-full object-cover" />
            </div>
          ) : avatarUrl ? (
            <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100">
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0">
              <Link href={item.href} className="flex items-center gap-1 min-w-0">
                <span className="font-bold text-[15px] text-gray-900 truncate">{displayName}</span>
                {(isVerified || isPremium) && <VerifiedBadge premium={isPremium} />}
              </Link>
              {handle && (
                <span className="text-gray-500 text-[15px] truncate hidden sm:inline">{handle}</span>
              )}
              <span className="text-gray-500 text-[15px]">&middot;</span>
              <span className="text-gray-500 text-[15px] whitespace-nowrap">{getTimeAgo(item.created_at)}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {item.type === 'company' && (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white text-xs font-semibold transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Star className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Review</span>
                </Link>
              )}
              {showConnect && connectStatus === 'none' && (
                <button
                  type="button"
                  onClick={handleConnect}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white text-xs font-semibold transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Connect</span>
                </button>
              )}
              {showConnect && connectStatus === 'loading' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-300 text-gray-400 text-xs font-semibold">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </span>
              )}
              {showConnect && connectStatus === 'pending' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-amber-400 text-amber-600 text-xs font-semibold">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pending</span>
                </span>
              )}
              {showConnect && connectStatus === 'accepted' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-green-500 text-green-600 text-xs font-semibold">
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Connected</span>
                </span>
              )}
              <button type="button" className="p-1.5 rounded-full hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors" aria-label="More">
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>

          {/* "From" line for type context */}
          <div className="flex items-center gap-1.5 mt-0.5 text-[13px]">
            <span className="text-gray-500">From</span>
            <span className="font-semibold text-gray-700">{getTypeBadge(item.type)}</span>
            {item.category_name && (
              <>
                <span className="text-gray-400">&middot;</span>
                <span className="text-gray-500">{item.category_name}</span>
              </>
            )}
          </div>

          {/* Content */}
          <Link href={item.href} className="block mt-1.5">
            <h3 className="text-[15px] font-semibold text-gray-900 leading-snug">{item.title}</h3>
            {item.excerpt && (
              <p className="text-[15px] text-gray-700 leading-relaxed mt-0.5 line-clamp-3">{item.excerpt}</p>
            )}
          </Link>

          {/* Image */}
          {item.type !== 'company' && (
            <Link href={item.href} className="block mt-3">
              <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full max-h-[340px] object-cover"
                  />
                ) : (
                  <div className="w-full px-8 py-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-semibold tracking-[0.25em] text-indigo-300/80 uppercase mb-3">
                      {getSpotlightLabel(item.type)}
                    </span>
                    <h4 className="text-lg sm:text-xl font-extrabold leading-snug uppercase bg-gradient-to-r from-indigo-300 via-purple-300 to-emerald-300 bg-clip-text text-transparent line-clamp-3">
                      {item.title}
                    </h4>
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Read more */}
          <Link
            href={item.href}
            className="inline-flex items-center gap-1 mt-3 text-indigo-600 hover:text-indigo-700 text-sm font-semibold transition-colors"
          >
            Read more
            <ChevronRight className="h-4 w-4" />
          </Link>

          {/* Engagement bar */}
          <div className="flex items-center justify-between mt-2 max-w-md -ml-2">
            <button type="button" className="group flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
              <span className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                <MessageCircle className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[13px]">{item.comments ? formatCount(item.comments) : ''}</span>
            </button>
            <button type="button" className="group flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors">
              <span className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                <Repeat2 className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[13px]">{item.shares ? formatCount(item.shares) : ''}</span>
            </button>
            <button type="button" className="group flex items-center gap-1 text-gray-500 hover:text-pink-500 transition-colors">
              <span className="p-2 rounded-full group-hover:bg-pink-50 transition-colors">
                <Heart className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[13px]">{item.likes ? formatCount(item.likes) : ''}</span>
            </button>
            <button type="button" className="group flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
              <span className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                <BarChart2 className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[13px]">{item.views ? formatCount(item.views) : ''}</span>
            </button>
            <div className="flex items-center gap-0">
              <button type="button" className="p-2 rounded-full text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors" aria-label="Bookmark">
                <Bookmark className="h-[18px] w-[18px]" />
              </button>
              <button type="button" className="p-2 rounded-full text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors" aria-label="Share">
                <Upload className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
