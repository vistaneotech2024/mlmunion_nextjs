'use client'

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { ThumbsUp, ThumbsDown, Eye, Share2, ArrowRight, Mail } from 'lucide-react';
import { ClassifiedContactForm } from './ClassifiedContactForm';
import { ClassifiedsListSkeleton } from './skeletons';
import toast from 'react-hot-toast';

interface Classified {
  id: string;
  title: string;
  description: string;
  category: string | null; // UUID or null
  category_name?: string; // Category name from join
  created_at: string;
  user_id: string;
  view_count: number;
  likes: number;
  dislikes: number;
  user_reaction?: 'like' | 'dislike';
  user: {
    username: string;
    id: string;
  };
  slug: string;
  image_url?: string;
  is_premium?: boolean;
}

interface ClassifiedsListProps {
  limit?: number;
  showViewAll?: boolean;
  searchTerm?: string;
  categoryFilter?: string;
  currentPage?: number;
  itemsPerPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onTotalCountChange?: (count: number) => void;
}

export function ClassifiedsList({ 
  limit = 6, 
  showViewAll = true, 
  searchTerm = '', 
  categoryFilter = 'all',
  currentPage = 1,
  itemsPerPage = 12,
  totalCount,
  onPageChange,
  onTotalCountChange
}: ClassifiedsListProps) {
  const [classifieds, setClassifieds] = React.useState<Classified[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showContactForm, setShowContactForm] = React.useState(false);
  const [selectedClassified, setSelectedClassified] = React.useState<{id: string, userId: string} | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  // Use useMemo to prevent unnecessary re-renders
  const userId = user?.id;

  React.useEffect(() => {
    loadClassifieds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, searchTerm, categoryFilter, currentPage, itemsPerPage]);

  async function loadClassifieds() {
    if (!supabase) {
      setLoading(false);
      setClassifieds([]);
      return;
    }
    try {
      setLoading(true);

      // Use simpler query (no category join) so data loads reliably; we attach category names after
      let query = supabase
        .from('classifieds')
        .select('*, user:profiles(username, id)')
        .eq('status', 'active');
      let countQuery = supabase
        .from('classifieds')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (categoryFilter && categoryFilter !== 'all') {
        countQuery = countQuery.eq('category', categoryFilter);
        query = query.eq('category', categoryFilter);
      }
      if (searchTerm) {
        countQuery = countQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      query = query.order('is_premium', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
      if (limit > 0) {
        query = query.limit(limit);
      } else {
        const fetchSize = Math.max(itemsPerPage * 3, itemsPerPage * (currentPage + 1));
        query = query.range(0, fetchSize - 1);
      }

      const [countRes, dataRes] = await Promise.all([countQuery, query]);
      const { count, error: countError } = countRes;
      if (countError) throw countError;
      if (onTotalCountChange && count !== null) {
        onTotalCountChange(count);
      }
      let { data, error } = dataRes;

      if (error) {
        console.error('Error loading classifieds:', error);
        const errorMessage = handleSupabaseError(error, 'Error loading classifieds');
        toast.error(errorMessage);
        setClassifieds([]);
        setLoading(false);
        return;
      }

      if (data) {
        // Normalize user (join can return array)
        data.forEach((item: any) => {
          if (item.user && Array.isArray(item.user)) {
            item.user = item.user[0] || { username: '', id: '' };
          }
        });
        // Fetch category names (we don't join classified_categories so fetch separately)
        const itemsWithoutCategoryName = data.filter((item: any) => item.category);
        if (itemsWithoutCategoryName.length > 0) {
          const categoryIds = [...new Set(itemsWithoutCategoryName.map((item: any) => item.category).filter(Boolean))];
          if (categoryIds.length > 0) {
            const { data: categories } = await supabase
              .from('classified_categories')
              .select('id, name')
              .in('id', categoryIds);
            
            if (categories) {
              const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
              data.forEach((item: any) => {
                if (!item.category_name && item.category && categoryMap.has(item.category)) {
                  item.category_name = categoryMap.get(item.category);
                }
              });
            }
          }
        }
        
        // For pagination mode (limit === 0), apply in-memory sorting and slicing
        // This ensures premium items always appear first, even if database sorting isn't perfect
        if (limit === 0 && itemsPerPage && data.length > 0) {
        // Sort: premium first (is_premium = true), then by latest (created_at descending)
        data.sort((a: any, b: any) => {
          // First sort by premium status (premium first)
          const aPremium = Boolean(a.is_premium);
          const bPremium = Boolean(b.is_premium);
          if (aPremium && !bPremium) return -1;
          if (!aPremium && bPremium) return 1;
          // Then sort by created_at (latest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
          // Apply pagination after sorting
          const from = (currentPage - 1) * itemsPerPage;
          const to = from + itemsPerPage;
          data = data.slice(from, to);
        }
      }

      // Load user reactions if logged in (only if user is available)
      if (userId && data && data.length > 0) {
        const { data: reactions } = await supabase
          .from('classified_reactions')
          .select('classified_id, reaction')
          .in('classified_id', data.map(c => c.id))
          .eq('user_id', userId);

        if (reactions) {
          const reactionMap = new Map(reactions.map(r => [r.classified_id, r.reaction]));
          data.forEach(classified => {
            classified.user_reaction = reactionMap.get(classified.id);
          });
        }
      }

      // REMOVED: View count increment - this should only happen on detail page, not list page
      // This was causing massive performance issues by incrementing views for all items on every page load

      // Set the sorted and mapped data
      setClassifieds(data || []);
      
      // Debug: Log premium count
      if (data) {
        const premiumCount = data.filter((c: any) => c.is_premium === true).length;
        console.log(`Total classifieds: ${data.length}, Premium: ${premiumCount}`);
      }
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading classifieds');
      toast.error(errorMessage);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleReaction = async (classifiedId: string, reaction: 'like' | 'dislike') => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const classified = classifieds.find(c => c.id === classifiedId);
      if (!classified) return;

      if (classified.user_reaction === reaction) {
        // Remove reaction
        const { error: deleteError } = await supabase
          .from('classified_reactions')
          .delete()
          .eq('classified_id', classifiedId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        setClassifieds(prev => prev.map(c => 
          c.id === classifiedId ? {
            ...c,
            [reaction === 'like' ? 'likes' : 'dislikes']: c[reaction === 'like' ? 'likes' : 'dislikes'] - 1,
            user_reaction: undefined
          } : c
        ));
      } else {
        // Handle existing reaction
        if (classified.user_reaction) {
          setClassifieds(prev => prev.map(c =>
            c.id === classifiedId ? {
              ...c,
              [classified.user_reaction === 'like' ? 'likes' : 'dislikes']: 
                c[classified.user_reaction === 'like' ? 'likes' : 'dislikes'] - 1
            } : c
          ));
        }

        // Add new reaction
        const { error: upsertError } = await supabase
          .from('classified_reactions')
          .upsert({
            classified_id: classifiedId,
            user_id: user.id,
            reaction
          });

        if (upsertError) throw upsertError;

        setClassifieds(prev => prev.map(c =>
          c.id === classifiedId ? {
            ...c,
            [reaction === 'like' ? 'likes' : 'dislikes']: 
              c[reaction === 'like' ? 'likes' : 'dislikes'] + 1,
            user_reaction: reaction
          } : c
        ));
      }
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating reaction');
      toast.error(errorMessage);
    }
  };

  const handleShare = async (classified: Classified) => {
    try {
      const shareData = {
        title: classified.title,
        text: classified.description.substring(0, 100) + '...',
        url: `${window.location.origin}/classifieds/${classified.slug}`
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support sharing
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Error sharing classified');
      }
    }
  };

  const handleContactAdvertiser = (classifiedId: string, userId: string) => {
    setSelectedClassified({ id: classifiedId, userId });
    setShowContactForm(true);
  };

  if (loading) {
    return <ClassifiedsListSkeleton count={limit > 0 ? limit : itemsPerPage} />;
  }

  return (
    <div>
      {classifieds.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No opportunities found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classifieds.map((classified) => (
              <div 
                key={classified.id} 
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer h-full flex flex-col group"
                onClick={() => {
                  if (!classified.slug) {
                    console.error('Classified missing slug:', classified.id);
                    toast.error('Invalid classified link');
                    return;
                  }
                  router.push(`/classifieds/${classified.slug}`);
                }}
              >
                <div className="relative w-full h-32 sm:h-36 overflow-hidden bg-gray-100">
                  {classified.image_url ? (
                    <img
                      src={classified.image_url}
                      alt={classified.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                      <span className="text-indigo-500 text-xl font-bold">
                        {classified.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {classified.is_premium && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase shadow-md flex items-center gap-0.5">
                        <span>⭐</span>
                        Premium
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-3.5 flex flex-col flex-grow">
                  <div className="mb-1.5 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">
                      {new Date(classified.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    {classified.category_name && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full whitespace-nowrap">
                        {classified.category_name}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-tight">
                    {classified.title.replace(/<[^>]*>/g, '')}
                  </h3>
                  
                  <div className="mb-2.5 text-gray-600 line-clamp-2 flex-grow text-xs leading-relaxed">
                    {classified.description.replace(/<[^>]*>/g, '').substring(0, 100)}...
                  </div>
                  
                  {/* Reaction and View Icons */}
                  <div className="flex items-center justify-between mb-2.5 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction(classified.id, 'like');
                        }}
                        className={`flex items-center gap-0.5 text-xs ${
                          classified.user_reaction === 'like'
                            ? 'text-green-600'
                            : 'text-gray-500 hover:text-green-600'
                        } transition-colors`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>{classified.likes || 0}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction(classified.id, 'dislike');
                        }}
                        className={`flex items-center gap-0.5 text-xs ${
                          classified.user_reaction === 'dislike'
                            ? 'text-red-600'
                            : 'text-gray-500 hover:text-red-600'
                        } transition-colors`}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                        <span>{classified.dislikes || 0}</span>
                      </button>
                      <div className="flex items-center text-gray-500 text-xs">
                        <Eye className="h-3.5 w-3.5 mr-0.5" />
                        <span>{classified.view_count || 0}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(classified);
                      }}
                      className="text-gray-500 hover:text-indigo-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  
                  {/* Contact Button */}
                  <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
                    {user ? (
                      user.id !== classified.user_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContactAdvertiser(classified.id, classified.user_id);
                          }}
                          className="w-full inline-flex justify-center items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                          <Mail className="h-3.5 w-3.5 mr-1.5" />
                          Contact
                        </button>
                      )
                    ) : (
                      <Link
                        href="/login"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full inline-flex justify-center items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                      >
                        Login to Contact
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showViewAll && limit > 0 && classifieds.length >= limit && (
            <div className="mt-4 text-center">
              <Link
                href="/classifieds"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View All Opportunities
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>
          )}
        </>
      )}

      {showContactForm && selectedClassified && (
        <ClassifiedContactForm
          classifiedId={selectedClassified.id}
          recipientId={selectedClassified.userId}
          onClose={() => {
            setShowContactForm(false);
            setSelectedClassified(null);
          }}
        />
      )}
    </div>
  );
}