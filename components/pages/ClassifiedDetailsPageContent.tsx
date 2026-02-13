'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { Clock, User, Tag, Globe, ThumbsUp, ThumbsDown, Eye, Mail, ArrowLeft, CheckCircle, Shield, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { SocialShare } from '@/components/SocialShare';
import { ClassifiedContactForm } from '@/components/ClassifiedContactForm';
import { PromotionalCards } from '@/components/PromotionalCards';
import { ClassifiedDetailSkeleton } from '@/components/skeletons';
import { handleSupabaseError } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Classified {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  created_at: string;
  user_id: string;
  view_count: number;
  likes: number;
  dislikes: number;
  user_reaction?: 'like' | 'dislike';
  user: {
    username: string;
    email: string;
    id: string;
    image_url?: string;
    avatar_url?: string;
    full_name?: string;
  };
  slug: string;
  image_url?: string;
  meta_description?: string | null;
  meta_keywords?: string | null;
  focus_keyword?: string | null;
  is_premium?: boolean;
  category_info?: {
    id: string;
    name: string;
  };
  category_name?: string;
}

type Props = {
  slug: string;
};

export function ClassifiedDetailsPageContent({ slug }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [classified, setClassified] = React.useState<Classified | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showContactForm, setShowContactForm] = React.useState(false);
  const [isDirectSeller, setIsDirectSeller] = React.useState(false);
  const [isOwner, setIsOwner] = React.useState(false);
  const [premiumClassifieds, setPremiumClassifieds] = React.useState<Classified[]>([]);
  const [latestClassifieds, setLatestClassifieds] = React.useState<Classified[]>([]);

  React.useEffect(() => {
    if (slug) {
      loadClassified(slug);
    }
  }, [slug]);

  async function loadClassified(classifiedSlug: string) {
    try {
      setLoading(true);

      const cacheKey = `classified_detail_${classifiedSlug}`;
      const cached = cache.get<Classified>(cacheKey);
      if (cached) {
        setClassified(cached);
        setLoading(false);
        if (cached.id) {
          loadPremiumAndLatestClassifieds(cached.id);
          if (user) {
            setIsOwner(cached.user_id === user.id);
            loadUserReaction(cached.id);
            loadUserDirectSellerStatus();
          }
        }
        return;
      }

      let { data, error } = await supabase
        .from('classifieds')
        .select(`
          *,
          user:profiles(username, email, id, image_url, avatar_url, full_name),
          category_info:classified_categories(id, name)
        `)
        .eq('slug', classifiedSlug)
        .maybeSingle();

      if (!data && !error) {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPattern.test(classifiedSlug)) {
          const { data: idData, error: idError } = await supabase
            .from('classifieds')
            .select(`
              *,
              user:profiles(username, email, id, image_url, avatar_url, full_name),
              category_info:classified_categories(id, name)
            `)
            .eq('id', classifiedSlug)
            .maybeSingle();

          if (idError) throw idError;
          if (!idData) throw new Error('Classified not found');
          if (idData.slug && idData.slug !== classifiedSlug) {
            router.replace(`/classifieds/${idData.slug}`);
            return;
          }
          data = idData;
        } else {
          throw new Error('Classified not found');
        }
      } else {
        if (error) throw error;
        if (!data) throw new Error('Classified not found');
      }

      if (data) {
        if ((data as any).category_info) {
          (data as any).category_name = (data as any).category_info.name;
        }
        cache.set(cacheKey, data, 5 * 60 * 1000);
        (async () => {
          try {
            await supabase.rpc('increment_classified_views', { slug_or_id: (data as any).slug || (data as any).id });
          } catch (err: any) {
            console.error('Error incrementing view count:', err);
          }
        })();
        setClassified(data);
        const promises: Promise<any>[] = [loadPremiumAndLatestClassifieds((data as any).id)];
        if (user) {
          setIsOwner((data as any).user_id === user.id);
          promises.push(loadUserReaction((data as any).id), loadUserDirectSellerStatus());
        }
        Promise.all(promises).catch((err) => console.error('Error loading related data:', err));
      }
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading classified');
      toast.error(errorMessage);
      router.push('/classifieds');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!user || !classified) return;
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this classified? This action cannot be undone.')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('classifieds')
        .delete()
        .eq('id', classified.id)
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Classified deleted successfully');
      router.push('/classifieds');
    } catch (error: any) {
      toast.error(handleSupabaseError(error, 'Error deleting classified'));
    }
  };

  const handleReaction = async (reaction: 'like' | 'dislike') => {
    if (!user || !classified) {
      router.push('/login');
      return;
    }
    try {
      if (classified.user_reaction === reaction) {
        const { error: deleteError } = await supabase
          .from('classified_reactions')
          .delete()
          .eq('classified_id', classified.id)
          .eq('user_id', user.id);
        if (deleteError) throw deleteError;
        setClassified({
          ...classified,
          [reaction === 'like' ? 'likes' : 'dislikes']: classified[reaction === 'like' ? 'likes' : 'dislikes'] - 1,
          user_reaction: undefined,
        });
        cache.clear(`classified_detail_${classified.slug}`);
      } else {
        const newLikes = classified.likes - (classified.user_reaction === 'like' ? 1 : 0);
        const newDislikes = classified.dislikes - (classified.user_reaction === 'dislike' ? 1 : 0);
        const { error: upsertError } = await supabase.from('classified_reactions').upsert({
          classified_id: classified.id,
          user_id: user.id,
          reaction,
        });
        if (upsertError) throw upsertError;
        setClassified({
          ...classified,
          likes: newLikes + (reaction === 'like' ? 1 : 0),
          dislikes: newDislikes + (reaction === 'dislike' ? 1 : 0),
          user_reaction: reaction,
        });
        cache.clear(`classified_detail_${classified.slug}`);
      }
    } catch (error: any) {
      toast.error(handleSupabaseError(error, 'Error updating reaction'));
    }
  };

  async function loadPremiumAndLatestClassifieds(currentId: string) {
    try {
      const relatedCacheKey = `classified_related_${currentId}`;
      const cached = cache.get<{ premium: Classified[]; latest: Classified[] }>(relatedCacheKey);
      if (cached) {
        setPremiumClassifieds(cached.premium);
        setLatestClassifieds(cached.latest);
        return;
      }
      const [premiumResult, latestResult] = await Promise.all([
        supabase
          .from('classifieds')
          .select(`*, user:profiles(username, id), category_info:classified_categories(id, name)`)
          .eq('status', 'active')
          .eq('is_premium', true)
          .neq('id', currentId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('classifieds')
          .select(`*, user:profiles(username, id), category_info:classified_categories(id, name)`)
          .eq('status', 'active')
          .neq('id', currentId)
          .neq('is_premium', true)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      const premiumData = premiumResult.data || [];
      const latestData = latestResult.data || [];
      premiumData.forEach((item: any) => {
        if (item.category_info) item.category_name = item.category_info.name;
      });
      latestData.forEach((item: any) => {
        if (item.category_info) item.category_name = item.category_info.name;
      });
      setPremiumClassifieds(premiumData);
      setLatestClassifieds(latestData);
      cache.set(relatedCacheKey, { premium: premiumData, latest: latestData }, 10 * 60 * 1000);
    } catch (error: any) {
      console.error('Error loading premium and latest classifieds:', error);
    }
  }

  async function loadUserReaction(classifiedId: string) {
    if (!user) return;
    try {
      const { data: reaction } = await supabase
        .from('classified_reactions')
        .select('reaction')
        .eq('classified_id', classifiedId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (reaction) {
        setClassified((prev) => (prev ? { ...prev, user_reaction: reaction.reaction } : null));
      }
    } catch (error) {
      console.error('Error loading user reaction:', error);
    }
  }

  async function loadUserDirectSellerStatus() {
    if (!user) return;
    try {
      const { data: profile } = await supabase.from('profiles').select('is_direct_seller').eq('id', user.id).single();
      setIsDirectSeller(profile?.is_direct_seller || false);
    } catch (error) {
      console.error('Error loading user direct seller status:', error);
    }
  }

  if (loading) {
    return <ClassifiedDetailSkeleton />;
  }

  if (!classified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Classified not found</h2>
          <Link href="/classifieds" className="text-indigo-600 hover:text-indigo-500">
            Return to Classifieds
          </Link>
        </div>
      </div>
    );
  }

  const userObj = Array.isArray(classified.user) ? classified.user[0] : classified.user;
  const authorName = userObj?.full_name || userObj?.username || 'User';
  const profileImage = userObj?.image_url || userObj?.avatar_url;
  const authorAvatarUrl = !profileImage
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=6366f1&color=fff&size=128`
    : profileImage.startsWith('http://') || profileImage.startsWith('https://')
      ? profileImage
      : supabase.storage.from('avatars').getPublicUrl(profileImage).data.publicUrl;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-6 md:pb-12">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <Link
            href="/classifieds"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-3 md:mb-4 group text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-5 mr-1 md:mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Classifieds
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
            <div className="lg:col-span-2">
              <article className="bg-white shadow-xl overflow-hidden border border-indigo-50">
                {classified.image_url && (
                  <div className="relative h-48 sm:h-64 md:h-96 overflow-hidden">
                    <img src={classified.image_url} alt={classified.title} className="w-full h-full object-cover" />
                    {classified.is_premium === true && (
                      <div className="absolute top-2 md:top-4 right-2 md:right-4 z-10">
                        <span className="bg-yellow-500 text-white text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-full uppercase shadow-lg flex items-center gap-1 md:gap-1.5">
                          <span>⭐</span>
                          Premium
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-3 md:p-4 lg:p-6 xl:p-8 relative">
                  {classified.is_premium === true && !classified.image_url && (
                    <div className="absolute top-2 md:top-4 right-2 md:right-4 z-10">
                      <span className="bg-yellow-500 text-white text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-full uppercase shadow-lg flex items-center gap-1 md:gap-1.5">
                        <span>⭐</span>
                        Premium
                      </span>
                    </div>
                  )}
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4 leading-tight">{classified.title}</h1>

                  <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:gap-4 text-gray-500 mb-4 md:mb-6 lg:mb-8 border-b border-gray-100 pb-4 md:pb-6 text-xs md:text-sm">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-300">
                        <img src={authorAvatarUrl} alt={authorName} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-medium text-gray-900 text-xs md:text-sm">{authorName}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3.5 w-3.5 md:h-4 md:h-5 mr-1 md:mr-2 text-indigo-500" />
                      <span>{new Date(classified.created_at).toLocaleDateString()}</span>
                    </div>
                    {classified.category_name && (
                      <div className="flex items-center">
                        <Tag className="h-3.5 w-3.5 md:h-4 md:h-5 mr-1 md:mr-2 text-indigo-500" />
                        <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs md:text-sm font-medium">
                          {classified.category_name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Eye className="h-3.5 w-3.5 md:h-4 md:h-5 mr-1 md:mr-2 text-indigo-500" />
                      <span>{classified.view_count} views</span>
                    </div>
                  </div>

                  <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none mb-4 md:mb-6 lg:mb-8">
                    <div
                      className="text-gray-700 leading-relaxed text-sm md:text-base"
                      dangerouslySetInnerHTML={{ __html: classified.description }}
                    />
                  </div>

                  {classified.url && (
                    <a
                      href={classified.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 md:px-6 py-2 md:py-3 border border-transparent text-sm md:text-base font-medium rounded-lg shadow-md text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transform hover:-translate-y-0.5 transition-all duration-200 mb-4 md:mb-6 lg:mb-8"
                    >
                      <Globe className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2" />
                      Visit Website
                    </a>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border-t border-gray-100 pt-4 md:pt-6">
                    <div className="flex items-center gap-3 md:gap-4 lg:gap-6 mb-2 sm:mb-0">
                      <button
                        onClick={() => handleReaction('like')}
                        className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-full text-sm md:text-base ${
                          classified.user_reaction === 'like' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100 hover:text-green-600'
                        } transition-colors`}
                      >
                        <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
                        <span className="font-medium">{classified.likes}</span>
                      </button>
                      <button
                        onClick={() => handleReaction('dislike')}
                        className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-full text-sm md:text-base ${
                          classified.user_reaction === 'dislike' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:bg-gray-100 hover:text-red-600'
                        } transition-colors`}
                      >
                        <ThumbsDown className="h-4 w-4 md:h-5 md:w-5" />
                        <span className="font-medium">{classified.dislikes}</span>
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
                      <div className="w-full sm:w-auto">
                        <SocialShare
                          title={classified.title}
                          text={classified.description.replace(/<[^>]*>/g, '').substring(0, 100) + '...'}
                          url={typeof window !== 'undefined' ? window.location.href : ''}
                        />
                      </div>
                      {user ? (
                        isOwner && isDirectSeller ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/classifieds/edit/${classified.id}`)}
                              className="inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 border border-indigo-300 rounded-lg shadow-sm text-xs md:text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50 transition-all duration-200"
                            >
                              <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
                              Edit
                            </button>
                            <button
                              onClick={handleDelete}
                              className="inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 border border-red-300 rounded-lg shadow-sm text-xs md:text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-all duration-200"
                            >
                              <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
                              Delete
                            </button>
                          </div>
                        ) : user.id !== classified.user_id ? (
                          <button
                            onClick={() => setShowContactForm(true)}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 md:px-6 py-2 md:py-3 border border-transparent rounded-lg shadow-md text-xs md:text-sm lg:text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transform hover:-translate-y-0.5 transition-all duration-200"
                          >
                            <Mail className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2" />
                            Contact Advertiser
                          </button>
                        ) : null
                      ) : (
                        <Link
                          href="/login"
                          className="w-full sm:w-auto inline-flex justify-center items-center px-4 md:px-6 py-2 md:py-3 border border-transparent rounded-lg shadow-md text-xs md:text-sm lg:text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transform hover:-translate-y-0.5 transition-all duration-200"
                        >
                          Login to Contact
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </article>
              <PromotionalCards />
            </div>

            <div className="space-y-3 md:space-y-4 lg:space-y-6">
              <div className="bg-white shadow-lg p-3 md:p-4 lg:p-6 border border-indigo-50 transform transition-all duration-300 hover:shadow-xl">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
                  <User className="h-4 w-4 md:h-5 md:w-5 text-indigo-500 mr-1.5 md:mr-2" />
                  About the Advertiser
                </h2>
                <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                  <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border-2 border-indigo-300">
                    <img src={authorAvatarUrl} alt={authorName} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm md:text-base">{authorName}</h3>
                    <p className="text-xs md:text-sm text-gray-500">Member since {new Date(classified.created_at).getFullYear()}</p>
                    <div className="mt-1 flex items-center">
                      <div className="flex-shrink-0 h-3 w-3 md:h-4 md:w-4 rounded-full bg-green-500"></div>
                      <p className="ml-1 md:ml-1.5 text-xs font-medium text-green-600">Online</p>
                    </div>
                  </div>
                </div>
                {user ? (
                  user.id !== classified.user_id && (
                    <button
                      onClick={() => setShowContactForm(true)}
                      className="w-full inline-flex justify-center items-center px-3 md:px-4 py-2 md:py-3 border border-transparent rounded-lg shadow-md text-xs md:text-sm lg:text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <Mail className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2" />
                      Contact Advertiser
                    </button>
                  )
                ) : (
                  <Link
                    href="/login"
                    className="w-full inline-flex justify-center items-center px-3 md:px-4 py-2 md:py-3 border border-transparent rounded-lg shadow-md text-xs md:text-sm lg:text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Login to Contact
                  </Link>
                )}
              </div>

              <div className="bg-white shadow-lg p-3 md:p-4 lg:p-6 border border-indigo-50 transform transition-all duration-300 hover:shadow-xl">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
                  <Shield className="h-4 w-4 md:h-5 md:w-5 text-indigo-500 mr-1.5 md:mr-2" />
                  Safety Tips
                </h2>
                <ul className="space-y-2 md:space-y-3 text-gray-600 text-xs md:text-sm">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-1.5 md:mr-2 flex-shrink-0 mt-0.5" />
                    <span>Research the company before joining</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-1.5 md:mr-2 flex-shrink-0 mt-0.5" />
                    <span>Verify income claims with documentation</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-1.5 md:mr-2 flex-shrink-0 mt-0.5" />
                    <span>Understand the compensation plan</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-amber-500 mr-1.5 md:mr-2 flex-shrink-0 mt-0.5" />
                    <span>Be wary of high startup costs</span>
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-amber-500 mr-1.5 md:mr-2 flex-shrink-0 mt-0.5" />
                    <span>Never share financial information</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-3 md:p-4 lg:p-6 border border-indigo-100 transform transition-all duration-300 hover:shadow-lg">
                <h2 className="text-lg md:text-xl font-semibold text-indigo-900 mb-2 md:mb-3">Post Your Opportunity</h2>
                <p className="text-xs md:text-sm text-indigo-700 mb-3 md:mb-4 lg:mb-5">Have a network marketing opportunity to share? Create your own classified ad.</p>
                <Link
                  href="/classifieds/new"
                  className="w-full inline-flex justify-center items-center px-3 md:px-4 py-2 md:py-3 border border-transparent rounded-lg shadow-md text-xs md:text-sm lg:text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Post a Classified
                </Link>
              </div>
            </div>
          </div>

          {(premiumClassifieds.length > 0 || latestClassifieds.length > 0) && (
            <div className="mt-8 md:mt-12 lg:mt-16 border-t border-gray-200 pt-6 md:pt-8 lg:pt-12">
              {premiumClassifieds.length > 0 && (
                <div className="mb-8 md:mb-10 lg:mb-12">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Premium Opportunities</h2>
                  <div className="overflow-x-auto pb-4">
                    <div className="flex gap-3 md:gap-4 lg:gap-6 min-w-max">
                      {premiumClassifieds.map((item) => (
                        <Link
                          key={item.id}
                          href={`/classifieds/${item.slug || item.id}`}
                          className="group bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 flex-shrink-0 w-56 md:w-64 lg:w-72"
                        >
                          {item.image_url && (
                            <div className="relative w-full h-32 md:h-36 lg:h-40 overflow-hidden">
                              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <div className="absolute top-1.5 md:top-2 right-1.5 md:right-2 z-10">
                                <span className="bg-yellow-500 text-white text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full uppercase shadow-lg flex items-center gap-0.5 md:gap-1">
                                  <span>⭐</span>
                                  Premium
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="p-3 md:p-4">
                            {item.category_name && (
                              <span className="text-[10px] md:text-xs font-semibold text-indigo-600 mb-1.5 md:mb-2 block">{item.category_name}</span>
                            )}
                            <h3 className="text-xs md:text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors mb-1.5 md:mb-2">
                              {item.title.replace(/<[^>]*>/g, '')}
                            </h3>
                            <p className="text-[10px] md:text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {latestClassifieds.length > 0 && (
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Latest Opportunities</h2>
                  <div className="overflow-x-auto pb-4">
                    <div className="flex gap-3 md:gap-4 lg:gap-6 min-w-max">
                      {latestClassifieds.map((item) => (
                        <Link
                          key={item.id}
                          href={`/classifieds/${item.slug || item.id}`}
                          className="group bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 flex-shrink-0 w-56 md:w-64 lg:w-72"
                        >
                          {item.image_url && (
                            <div className="relative w-full h-32 md:h-36 lg:h-40 overflow-hidden">
                              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                          )}
                          <div className="p-3 md:p-4">
                            {item.category_name && (
                              <span className="text-[10px] md:text-xs font-semibold text-indigo-600 mb-1.5 md:mb-2 block">{item.category_name}</span>
                            )}
                            <h3 className="text-xs md:text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors mb-1.5 md:mb-2">
                              {item.title.replace(/<[^>]*>/g, '')}
                            </h3>
                            <p className="text-[10px] md:text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showContactForm && (
        <ClassifiedContactForm
          classifiedId={classified.id}
          recipientId={classified.user_id}
          onClose={() => setShowContactForm(false)}
        />
      )}
    </>
  );
}
