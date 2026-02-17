'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { MapPin, Calendar, Globe, Star as StarIcon, ArrowLeft, ChevronUp, ChevronDown, DollarSign, Newspaper, Briefcase, Eye, ThumbsUp, BookOpen } from 'lucide-react';
import { SocialShare } from '@/components/SocialShare';
import { handleSupabaseError } from '@/lib/supabase';
import { CompanyDetailSkeleton } from '@/components/skeletons';
import toast from 'react-hot-toast';
import { showPointsNotification } from '@/components/PointsNotification';
import { VerificationBadge } from '@/components/VerificationBadge';
import { BadgesDisplay } from '@/components/BadgesDisplay';

interface Company {
  id: string;
  name: string;
  logo_url: string;
  country: string;
  country_name: string;
  state: string;
  city: string;
  category: string;
  established: number;
  description: string;
  headquarters: string;
  website: string;
  status: string;
  view_count: number;
  slug: string;
  meta_description?: string | null;
  meta_keywords?: string | null;
  focus_keyword?: string | null;
}

interface Rating {
  average_rating: number;
  total_votes: number;
}

interface Review {
  id: string;
  company_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  user: {
    username: string;
    full_name?: string;
    image_url?: string;
    avatar_url?: string;
  };
}

type CompanyDetailsPageContentProps = {
  country_name: string;
  slug: string;
};

export function CompanyDetailsPageContent({ country_name, slug }: CompanyDetailsPageContentProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [company, setCompany] = React.useState<Company | null>(null);
  const [rating, setRating] = React.useState<Rating | null>(null);
  const [userRating, setUserRating] = React.useState<number>(0);
  const [userReview, setUserReview] = React.useState<string>('');
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [voting, setVoting] = React.useState(false);
  const [submittingReview, setSubmittingReview] = React.useState(false);
  const [showReviewForm, setShowReviewForm] = React.useState(false);
  const [reviewsToShow, setReviewsToShow] = React.useState(5);
  const [showEditReviewSection, setShowEditReviewSection] = React.useState(false);
  const [canVote, setCanVote] = React.useState<boolean | null>(null);
  const [voteMessage, setVoteMessage] = React.useState<string>('');
  const [lastVoteDate, setLastVoteDate] = React.useState<string | null>(null);
  const [showVoteModal, setShowVoteModal] = React.useState(false);
  const [selectedVoteRating, setSelectedVoteRating] = React.useState<number>(0);
  const [voteCount, setVoteCount] = React.useState<number>(0);
  const [recommendedSellers, setRecommendedSellers] = React.useState<any[]>([]);
  const [loadingSellers, setLoadingSellers] = React.useState(false);
  const [relatedNews, setRelatedNews] = React.useState<any[]>([]);
  const [loadingNews, setLoadingNews] = React.useState(false);
  const [newsToShow, setNewsToShow] = React.useState(3);
  const [allRelatedNews, setAllRelatedNews] = React.useState<any[]>([]);
  const [relatedClassifieds, setRelatedClassifieds] = React.useState<any[]>([]);
  const [loadingClassifieds, setLoadingClassifieds] = React.useState(false);
  const [classifiedsToShow, setClassifiedsToShow] = React.useState(3);
  const [allRelatedClassifieds, setAllRelatedClassifieds] = React.useState<any[]>([]);
  const [relatedBlogs, setRelatedBlogs] = React.useState<any[]>([]);
  const [loadingBlogs, setLoadingBlogs] = React.useState(false);
  const [blogsToShow, setBlogsToShow] = React.useState(3);
  const [allRelatedBlogs, setAllRelatedBlogs] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState<'news' | 'classifieds' | 'blogs'>('news');

  // Helper function to convert country name to URL-friendly slug
  const countryNameToSlug = (name: string): string => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  async function loadVoteCount(companyId: string) {
    try {
      const voteCountCacheKey = `company_vote_count_${companyId}`;
      const cachedVoteCount = cache.get<number>(voteCountCacheKey);
      
      if (cachedVoteCount !== undefined && cachedVoteCount !== null) {
        setVoteCount(cachedVoteCount);
        return;
      }

      const { data, error } = await supabase
        .rpc('get_company_vote_count', { company_id: companyId });

      if (error) {
        console.error('Error loading vote count:', error);
        setVoteCount(0);
        return;
      }

      const count = data || 0;
      setVoteCount(count);
      
      // Cache the vote count for 1 minute
      cache.set(voteCountCacheKey, count, 1 * 60 * 1000);
    } catch (error: any) {
      console.error('Error loading vote count:', error);
      setVoteCount(0);
    }
  }

  async function loadRating(companyId: string) {
    try {
      // Check cache first
      const ratingCacheKey = `company_rating_${companyId}`;
      const cachedRating = cache.get<{ average_rating: number, total_votes: number }>(ratingCacheKey);
      
      if (cachedRating) {
        setRating(cachedRating);
        return;
      }

      const { data, error } = await supabase
        .rpc('get_company_rating', { company_id: companyId });

      if (error) {
        console.error('Error loading rating:', error);
        // Set default rating if error occurs
        setRating({ average_rating: 0, total_votes: 0 });
        return;
      }
      
      // Handle different response formats
      let ratingData: { average_rating: number, total_votes: number };
      
      if (data) {
        // If data is an object with average_rating and total_votes
        if (typeof data === 'object' && 'average_rating' in data) {
          ratingData = {
            average_rating: data.average_rating || 0,
            total_votes: data.total_votes || 0
          };
        } else {
          // If data is an array, take the first element
          const rating = Array.isArray(data) ? data[0] : data;
          ratingData = {
            average_rating: rating?.average_rating || 0,
            total_votes: rating?.total_votes || 0
          };
        }
      } else {
        // Set default if no data
        ratingData = { average_rating: 0, total_votes: 0 };
      }

      setRating(ratingData);
      
      // Cache the rating for 1 minute
      cache.set(ratingCacheKey, ratingData, 1 * 60 * 1000);
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading rating');
      console.error(errorMessage);
      // Set default rating on error
      setRating({ average_rating: 0, total_votes: 0 });
    }
  }

  async function loadUserRating(companyId: string) {
    try {
      // Load user's vote (voting = true) separately from review
      const { data: voteData, error: voteError } = await supabase
        .from('company_votes')
        .select('rating, created_at')
        .eq('company_id', companyId)
        .eq('user_id', user?.id)
        .eq('voting', true)
        .maybeSingle();

      if (voteError && voteError.code !== 'PGRST116') throw voteError;
      
      if (voteData) {
        setUserRating(voteData.rating || 0);
        if (voteData.created_at) {
          setLastVoteDate(voteData.created_at);
        }
      } else {
        setUserRating(0);
      }

      // Load user's review separately (can exist without vote)
      const { data: reviewData, error: reviewError } = await supabase
        .from('company_votes')
        .select('review')
        .eq('company_id', companyId)
        .eq('user_id', user?.id)
        .not('review', 'is', null)
        .maybeSingle();

      if (reviewError && reviewError.code !== 'PGRST116') throw reviewError;
      setUserReview(reviewData?.review || '');
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading user rating');
      console.error(errorMessage);
    }
  }

  async function checkVotingEligibility(companyId: string) {
    if (!user || !companyId) {
      setCanVote(false);
      setVoteMessage('Please log in to vote');
      return;
    }

    try {
      // First try using the RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('can_user_vote_company', {
          p_user_id: user.id,
          p_company_id: companyId
        });

      if (!rpcError && rpcData) {
        const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        setCanVote(result?.can_vote || false);
        setVoteMessage(result?.message || '');
        if (result?.last_vote_date) {
          setLastVoteDate(result.last_vote_date);
        }
        return;
      }

      // Fallback: Check directly from table if RPC doesn't exist
      // Check for votes (voting = true only)
      const { data: voteData, error: voteError } = await supabase
        .from('company_votes')
        .select('created_at, voting')
        .eq('company_id', companyId)
        .eq('user_id', user.id)
        .eq('voting', true) // Only check votes where voting is explicitly true
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (voteError && voteError.code !== 'PGRST116') {
        throw voteError;
      }

      if (!voteData) {
        // No vote exists, user can vote
        setCanVote(true);
        setVoteMessage('You can vote for this company');
        setLastVoteDate(null);
      } else {
        // Check if vote was more than 1 year ago
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const voteDate = new Date(voteData.created_at);

        if (voteDate < oneYearAgo) {
          setCanVote(true);
          setVoteMessage('You can vote for this company again');
          setLastVoteDate(voteData.created_at);
        } else {
          const nextVoteDate = new Date(voteDate);
          nextVoteDate.setFullYear(nextVoteDate.getFullYear() + 1);
          setCanVote(false);
          setVoteMessage(`You can vote for this company again after ${nextVoteDate.toLocaleDateString()}`);
          setLastVoteDate(voteData.created_at);
        }
      }
    } catch (error: any) {
      console.error('Error checking voting eligibility:', error);
      // Set default state on error
      setCanVote(false);
      setVoteMessage('Unable to check voting eligibility. Please try again later.');
    }
  }

  async function loadRecommendedSellers(companyId: string) {
    try {
      setLoadingSellers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, image_url, avatar_url, country, state, city, seller_bio, specialties, points, is_verified, is_premium, is_income_verified, income_level')
        .eq('company_id', companyId)
        .eq('is_premium', true)
        .eq('is_direct_seller', true)
        .order('points', { ascending: false })
        .limit(8);

      if (error) throw error;
      setRecommendedSellers(data || []);
    } catch (error: any) {
      console.error('Error loading recommended sellers:', error);
      setRecommendedSellers([]);
    } finally {
      setLoadingSellers(false);
    }
  }

  async function loadRelatedNews(companyId: string) {
    try {
      setLoadingNews(true);
      const { data, error } = await supabase
        .from('news')
        .select(`
          id, 
          title, 
          slug, 
          image_url, 
          content,
          created_at, 
          views, 
          likes,
          author:profiles(username, full_name),
          category:news_categories(id, name)
        `)
        .eq('company_id', companyId)
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const newsData = data || [];
      setAllRelatedNews(newsData);
      setRelatedNews(newsData.slice(0, newsToShow));
    } catch (error: any) {
      console.error('Error loading related news:', error);
      setAllRelatedNews([]);
      setRelatedNews([]);
    } finally {
      setLoadingNews(false);
    }
  }

  // Format time ago helper function (same as NewsPage)
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  // Strip HTML tags helper function (same as NewsPage)
  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const handleLoadMoreNews = () => {
    const nextCount = newsToShow + 3;
    setNewsToShow(nextCount);
    setRelatedNews(allRelatedNews.slice(0, nextCount));
  };

  async function loadRelatedClassifieds(companyId: string) {
    try {
      setLoadingClassifieds(true);
      const { data, error } = await supabase
        .from('classifieds')
        .select('id, title, slug, image_url, created_at, view_count, likes, description')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const classifiedsData = data || [];
      setAllRelatedClassifieds(classifiedsData);
      setRelatedClassifieds(classifiedsData.slice(0, 3)); // Show initial 3
    } catch (error: any) {
      console.error('Error loading related classifieds:', error);
      setAllRelatedClassifieds([]);
      setRelatedClassifieds([]);
    } finally {
      setLoadingClassifieds(false);
    }
  }

  const handleLoadMoreClassifieds = () => {
    const nextCount = classifiedsToShow + 3;
    setClassifiedsToShow(nextCount);
    setRelatedClassifieds(allRelatedClassifieds.slice(0, nextCount));
  };

  async function loadRelatedBlogs(companyId: string) {
    try {
      setLoadingBlogs(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, cover_image, created_at, view_count, likes, content')
        .eq('company_id', companyId)
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const blogsData = data || [];
      setAllRelatedBlogs(blogsData);
      setRelatedBlogs(blogsData.slice(0, 3)); // Show initial 3
    } catch (error: any) {
      console.error('Error loading related blogs:', error);
      setAllRelatedBlogs([]);
      setRelatedBlogs([]);
    } finally {
      setLoadingBlogs(false);
    }
  }

  const handleLoadMoreBlogs = () => {
    const nextCount = blogsToShow + 3;
    setBlogsToShow(nextCount);
    setRelatedBlogs(allRelatedBlogs.slice(0, nextCount));
  };

  // Set default tab based on available content
  React.useEffect(() => {
    if (allRelatedNews.length > 0 && activeTab === 'news') {
      // Already on news tab, keep it
      return;
    }
    if (allRelatedClassifieds.length > 0 && activeTab === 'classifieds') {
      // Already on classifieds tab, keep it
      return;
    }
    if (allRelatedBlogs.length > 0 && activeTab === 'blogs') {
      // Already on blogs tab, keep it
      return;
    }
    
    // Set default tab based on what's available
    if (allRelatedNews.length > 0) {
      setActiveTab('news');
    } else if (allRelatedClassifieds.length > 0) {
      setActiveTab('classifieds');
    } else if (allRelatedBlogs.length > 0) {
      setActiveTab('blogs');
    }
  }, [allRelatedNews.length, allRelatedClassifieds.length, allRelatedBlogs.length]);

  async function loadReviews(companyId: string) {
    try {
      const { data, error } = await supabase
        .from('company_votes')
        .select(`
          id,
          company_id,
          user_id,
          rating,
          review,
          created_at,
          user:profiles!user_id(username, full_name, image_url, avatar_url)
        `)
        .eq('company_id', companyId)
        .not('review', 'is', null)
        .neq('review', '') // Ensure review is not empty string
        .or('voting.is.null,voting.eq.false') // Only get reviews (voting=false or null), not votes (voting=true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Map the data to ensure correct structure
      const mappedReviews = (data || []).map((item: any) => ({
        id: item.id,
        company_id: item.company_id,
        user_id: item.user_id,
        rating: item.rating,
        review: item.review,
        created_at: item.created_at,
        user: Array.isArray(item.user) ? item.user[0] : item.user
      }));
      
      setReviews(mappedReviews as Review[]);
      // Reset reviews to show when loading new reviews
      setReviewsToShow(5);
    } catch (error: any) {
      console.error('Error loading reviews:', error);
    }
  }

  async function loadCompany(countryNameSlug: string, companySlug: string) {
    try {
      setLoading(true);

      // Check cache first
      const cacheKey = `company_${companySlug}`;
      const cached = cache.get<Company>(cacheKey);
      
      if (cached) {
        // Verify that the country_name matches
        const companyCountrySlug = countryNameToSlug(cached.country_name || cached.country);
        if (companyCountrySlug !== countryNameSlug) {
          // Redirect to correct URL if country name doesn't match
          router.replace(`/company/${companyCountrySlug}/${companySlug}`);
          return;
        }

        setCompany(cached);

        // Load rating, user rating, vote count, reviews, recommended sellers, related news, related classifieds, and related blogs in parallel (these change frequently, so don't cache)
        await Promise.all([
          loadRating(cached.id),
          loadVoteCount(cached.id),
          user && loadUserRating(cached.id),
          user && checkVotingEligibility(cached.id),
          loadReviews(cached.id),
          loadRecommendedSellers(cached.id),
          loadRelatedNews(cached.id),
          loadRelatedClassifieds(cached.id),
          loadRelatedBlogs(cached.id)
        ]);

        // Increment view count (async, don't wait)
        (async () => {
          try {
            await supabase.rpc('increment_company_views', { slug_or_id: companySlug });
          } catch (error) {
            console.error('Error incrementing view count:', error);
          }
        })();
        
        setLoading(false);
        return;
      }

      // Fetch from database
      // Increment view count (async, don't wait)
      (async () => {
        try {
          await supabase.rpc('increment_company_views', { slug_or_id: companySlug });
        } catch (error) {
          console.error('Error incrementing view count:', error);
        }
      })();

      const { data, error } = await supabase
        .from('mlm_companies')
        .select(`
          id,
          name,
          logo_url,
          country,
          country_name,
          state,
          city,
          category,
          established,
          description,
          headquarters,
          website,
          status,
          view_count,
          slug,
          meta_description,
          meta_keywords,
          focus_keyword
        `)
        .eq('slug', companySlug)
        .single();

      if (error) throw error;

      // Verify that the country_name matches (case-insensitive slug comparison)
      const companyCountrySlug = countryNameToSlug(data.country_name || data.country);
      if (companyCountrySlug !== countryNameSlug) {
        // Redirect to correct URL if country name doesn't match
        router.replace(`/company/${companyCountrySlug}/${companySlug}`);
        return;
      }

      setCompany(data);

      // Cache company data for 5 minutes
      cache.set(cacheKey, data, 5 * 60 * 1000);

      // Load rating, user rating, vote count, reviews, recommended sellers, related news, related classifieds, and related blogs in parallel
      await Promise.all([
        loadRating(data.id),
        loadVoteCount(data.id),
        user && loadUserRating(data.id),
        user && checkVotingEligibility(data.id),
        loadReviews(data.id),
        loadRecommendedSellers(data.id),
        loadRelatedNews(data.id),
        loadRelatedClassifieds(data.id),
        loadRelatedBlogs(data.id)
      ]);
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading company details');
      toast.error(errorMessage);
      router.push('/companies');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (country_name && slug) {
      loadCompany(country_name, slug);
    }
  }, [country_name, slug, user]);

  const handleVote = async (rating: number) => {
    if (!user || !company) {
      router.push('/login');
      return;
    }

    // Check if user can vote (1-year restriction)
    if (canVote === false) {
      toast.error(voteMessage || 'You can only vote for this company once per year');
      return;
    }

    try {
      setVoting(true);

      // Use the RPC function to submit vote with 1-year restriction
      const { data, error } = await supabase
        .rpc('submit_company_vote', {
          p_user_id: user.id,
          p_company_id: company.id,
          p_rating: rating,
          p_review: null,
          p_voting: true
        });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result?.success) {
        toast.error(result?.message || 'Failed to submit vote');
        // Refresh voting eligibility
        await checkVotingEligibility(company.id);
        return;
      }

      setUserRating(rating);
      setCanVote(false);
      setVoteMessage('You have already voted for this company');

      // Award points for voting
      // Since canVote was true, this is a new vote (either first time or after 1 year)
      // Get point value from database for "voting" action
      try {
        const { data: activityData, error: activityError } = await supabase
          .from('point_activities')
          .select('points')
          .eq('action', 'voting')
          .maybeSingle();

        if (!activityError && activityData && activityData.points > 0) {
          const { error: pointsError, data: pointsResult } = await supabase.rpc('award_points', {
            user_id: user.id,
            points_to_award: activityData.points,
            action: 'voting'
          });

          if (pointsError) {
            console.error('Error awarding points for voting:', pointsError);
          } else {
            console.log(`Successfully awarded ${activityData.points} points for voting`);
            showPointsNotification(activityData.points, 'Thanks for voting!');
          }
        } else {
          console.warn('Voting activity not found or has 0 points:', { activityData, activityError });
          // Fallback: try with default value if not found
          const { error: pointsError } = await supabase.rpc('award_points', {
          user_id: user.id,
          points_to_award: 5,
            action: 'voting'
        });
          if (!pointsError) {
            showPointsNotification(5, 'Thanks for voting!');
          }
        }
      } catch (error: any) {
        console.error('Error awarding points for voting:', error);
      }

      // Invalidate rating cache since rating changed
      cache.clear(`company_rating_${company.id}`);
      // Clear companies list cache to refresh ratings
      cache.clear(/^companies_/);
      
      // Reload the overall rating, vote count, user rating, and voting eligibility
      // Don't reload reviews when voting - reviews are separate
      await Promise.all([
        loadRating(company.id),
        loadVoteCount(company.id),
        loadUserRating(company.id),
        checkVotingEligibility(company.id)
      ]);
      
      toast.success('Vote submitted successfully!');
      setShowVoteModal(false);
      setSelectedVoteRating(0);
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error submitting vote');
      toast.error(errorMessage);
    } finally {
      setVoting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !company) {
      const returnUrl = window.location.pathname + window.location.search;
      localStorage.setItem('returnUrl', returnUrl);
      toast('Please log in first to write a review');
      router.push('/login');
      return;
    }

    if (!userRating || userRating === 0) {
      toast.error('Please select a rating first');
      return;
    }

    if (!userReview.trim()) {
      toast.error('Please write a review');
      return;
    }

    try {
      setSubmittingReview(true);

      // Check if record exists, then update or insert
      const { data: existingVote, error: checkError } = await supabase
        .from('company_votes')
        .select('id, review')
        .eq('company_id', company.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      // Check if this is the first time adding a review (review was null/empty before)
      const hadReviewBefore = existingVote?.review && existingVote.review.trim() !== '';
      const isFirstReview = !hadReviewBefore;

      console.log('Review submission debug:', {
        existingVote: existingVote ? { id: existingVote.id, hadReview: hadReviewBefore } : null,
        isFirstReview,
        userReview: userReview.trim().substring(0, 50) + '...'
      });

      if (existingVote) {
        // Update existing record (review, not a vote - set voting to false)
        const { error: updateError } = await supabase
          .from('company_votes')
          .update({
            rating: userRating,
            review: userReview.trim(),
            voting: false // This is a review, not a vote
          })
          .eq('id', existingVote.id);

        if (updateError) throw updateError;

        // Award points if this is the first time adding a review
        if (isFirstReview) {
          console.log('Awarding points for first review (update case)');
          try {
            // Get point value from database
            const { data: activityData, error: activityError } = await supabase
              .from('point_activities')
              .select('points')
              .eq('action', 'company_review')
              .maybeSingle();

            console.log('Activity data:', { activityData, activityError });

            if (!activityError && activityData && activityData.points > 0) {
              const { error: pointsError, data: pointsResult } = await supabase.rpc('award_points', {
                user_id: user.id,
                points_to_award: activityData.points,
                action: 'company_review'
              });
              
              console.log('Points award result:', { pointsError, pointsResult });
              
              if (pointsError) {
                console.error('Error awarding points for company review:', pointsError);
              } else {
                console.log(`Successfully awarded ${activityData.points} points for company review`);
                showPointsNotification(activityData.points, 'Thanks for reviewing this company!');
              }
            } else {
              console.warn('Company review activity not found or has 0 points:', { activityData, activityError });
              // Fallback: try with default value
              const { error: pointsError } = await supabase.rpc('award_points', {
                user_id: user.id,
                points_to_award: 10,
                action: 'company_review'
              });
              if (pointsError) {
                console.error('Error awarding points with fallback:', pointsError);
              } else {
                showPointsNotification(10, 'Thanks for reviewing this company!');
              }
            }
          } catch (error: any) {
            console.error('Error awarding points for company review:', error);
          }
        } else {
          console.log('Not awarding points - user already had a review');
        }
      } else {
        // Insert new record (review, not a vote - set voting to false)
        const { error: insertError } = await supabase
          .from('company_votes')
          .insert({
            company_id: company.id,
            user_id: user.id,
            rating: userRating,
            review: userReview.trim(),
            voting: false // This is a review, not a vote
          });

        if (insertError) throw insertError;

        // Award points for submitting a new company review
        console.log('Awarding points for first review (insert case)');
        try {
          // Get point value from database
          const { data: activityData, error: activityError } = await supabase
            .from('point_activities')
            .select('points')
            .eq('action', 'company_review')
            .maybeSingle();

          console.log('Activity data:', { activityData, activityError });

          if (!activityError && activityData && activityData.points > 0) {
            const { error: pointsError, data: pointsResult } = await supabase.rpc('award_points', {
              user_id: user.id,
              points_to_award: activityData.points,
              action: 'company_review'
            });
            
            console.log('Points award result:', { pointsError, pointsResult });
            
            if (pointsError) {
              console.error('Error awarding points for company review:', pointsError);
            } else {
              console.log(`Successfully awarded ${activityData.points} points for company review`);
              showPointsNotification(activityData.points, 'Thanks for reviewing this company!');
            }
          } else {
            console.warn('Company review activity not found or has 0 points:', { activityData, activityError });
            // Fallback: try with default value
            const { error: pointsError } = await supabase.rpc('award_points', {
              user_id: user.id,
              points_to_award: 10,
              action: 'company_review'
            });
            if (pointsError) {
              console.error('Error awarding points with fallback:', pointsError);
            } else {
              console.log('Successfully awarded 10 points (fallback) for company review');
              showPointsNotification(10, 'Thanks for reviewing this company!');
            }
          }
        } catch (error: any) {
          console.error('Error awarding points for company review:', error);
        }
      }

      // Reload reviews and user rating
      // Don't reload vote count when submitting review - votes and reviews are separate
      await Promise.all([
        loadReviews(company.id),
        loadUserRating(company.id)
      ]);

      setShowReviewForm(false);
      // Invalidate caches since review was added
      cache.clear(`company_rating_${company.id}`);
      if (company.slug) {
        cache.clear(`company_${company.slug}`);
      }
      // Clear companies list cache to refresh ratings
      cache.clear(/^companies_/);
      toast.success('Review submitted successfully!');
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error submitting review');
      toast.error(errorMessage);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user || !company) {
      return;
    }

    if (!window.confirm('Are you sure you want to delete your review?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('company_votes')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id);

      if (error) throw error;

      setUserRating(0);
      setUserReview('');

      // Reload reviews, rating, and vote count
      await Promise.all([
        loadRating(company.id),
        loadVoteCount(company.id),
        loadReviews(company.id),
        loadUserRating(company.id)
      ]);

      // Invalidate caches since review was deleted
      cache.clear(`company_rating_${company.id}`);
      if (company.slug) {
        cache.clear(`company_${company.slug}`);
      }
      // Clear companies list cache to refresh ratings
      cache.clear(/^companies_/);
      toast.success('Review deleted successfully!');
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error deleting review');
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return <CompanyDetailSkeleton />;
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Company not found</h2>
          <Link href="/companies" className="text-indigo-600 hover:text-indigo-500">
            Return to Companies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-2 md:py-4">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <Link
            href="/companies"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-3 md:mb-4 group text-sm md:text-base"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Companies
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-1">
            {/* Main Info */}
            <div className="md:col-span-2">
              <div className="bg-white border border-gray-200 overflow-hidden relative">
                {/* Voting count in top right */}
                <div className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 md:px-4 py-1.5 md:py-2 rounded-lg shadow-sm z-10">
                  <span className="text-base md:text-lg font-semibold text-indigo-700">{voteCount}</span>
                </div>
                <div className="p-3 md:p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 mb-3 md:mb-4">
                    <div className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 flex items-center justify-center bg-white border border-gray-200 rounded overflow-hidden flex-shrink-0">
                      {company.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={company.name}
                          className="w-full h-full object-contain p-2"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 text-lg md:text-xl lg:text-2xl font-bold">${company.name.charAt(0).toUpperCase()}</div>`;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg md:text-xl lg:text-2xl font-bold">
                          {company.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">{company.name}</h1>
                      <div className="flex items-center mt-1 md:mt-2">
                        <div className="flex items-center flex-wrap gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <StarIcon
                                key={star}
                              className={`h-4 w-4 md:h-5 md:w-5 ${
                                rating && star <= Math.round(rating.average_rating || 0)
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300 fill-gray-300'
                                }`}
                              />
                            ))}
                          {rating && rating.total_votes > 0 ? (
                            <span className="ml-1 md:ml-2 text-xs md:text-sm text-gray-600">
                              ({rating.total_votes} {rating.total_votes === 1 ? 'review' : 'reviews'})
                            </span>
                          ) : (
                            <span className="ml-1 md:ml-2 text-xs md:text-sm text-gray-500">
                              (No reviews yet)
                            </span>
                          )}
                          </div>
                      </div>
                      
                      {/* Company Details - Location, Established, Website */}
                      <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-2 md:mt-3 text-sm md:text-base">
                        {company.headquarters && (
                          <div className="flex items-center text-gray-600">
                            <MapPin className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 mr-1.5 flex-shrink-0" />
                            <span className="break-words">{company.headquarters}</span>
                          </div>
                        )}
                        {company.established && (
                          <div className="flex items-center text-gray-600">
                            <Calendar className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 mr-1.5 flex-shrink-0" />
                            <span>Established {company.established}</span>
                          </div>
                        )}
                        {company.website && (
                          <div className="flex items-center">
                            <Globe className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 mr-1.5 flex-shrink-0" />
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-700 break-all font-medium"
                            >
                              Visit Website
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm md:text-base text-gray-700 leading-relaxed">
                    <p className="whitespace-pre-wrap">{company.description}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Info */}
            <div className="space-y-3 md:space-y-1">
              {/* Vote and Review Section - Combined */}
              <div className="bg-white border border-gray-200">
                <div className="p-3 md:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base md:text-lg font-semibold">Vote and Review</h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-indigo-50 rounded-lg">
                      <span className="text-sm md:text-base font-semibold text-indigo-700">{voteCount}</span>
                    </div>
                  </div>
                  
                  {!user ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">Please log in to vote and review this company</p>
                      <Link
                        href="/login"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            const returnUrl = window.location.pathname + window.location.search;
                            localStorage.setItem('returnUrl', returnUrl);
                          }
                        }}
                        className="block w-full px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-center"
                      >
                        Log In to Vote & Review
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Voting Section */}
                      {canVote === null ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500">Checking voting eligibility...</p>
                        </div>
                      ) : canVote === false ? (
                        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">{voteMessage}</p>
                          {lastVoteDate && (
                            <p className="text-xs text-gray-500">
                              Last voted: {new Date(lastVoteDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {!showVoteModal ? (
                            <button
                              onClick={() => setShowVoteModal(true)}
                              disabled={voting}
                              className="w-full px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              Vote Now
                            </button>
                          ) : (
                            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                              <div>
                                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                                  Select Your Rating
                                </label>
                                <div className="flex gap-1 justify-center">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setSelectedVoteRating(star)}
                                      className="focus:outline-none transition-transform hover:scale-110"
                                      disabled={voting}
                                    >
                                      <StarIcon
                                        className={`h-8 w-8 md:h-10 md:w-10 ${
                                          star <= selectedVoteRating
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300 fill-gray-300'
                                        }`}
                                      />
                                    </button>
                                  ))}
                                </div>
                                {selectedVoteRating > 0 && (
                                  <p className="text-xs text-center text-gray-600 mt-2">
                                    You selected {selectedVoteRating} {selectedVoteRating === 1 ? 'star' : 'stars'}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    if (selectedVoteRating > 0) {
                                      handleVote(selectedVoteRating);
                                    } else {
                                      toast.error('Please select a rating');
                                    }
                                  }}
                                  disabled={voting || selectedVoteRating === 0}
                                  className="flex-1 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                                >
                                  {voting ? 'Submitting...' : 'Submit Vote'}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowVoteModal(false);
                                    setSelectedVoteRating(0);
                                  }}
                                  disabled={voting}
                                  className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          {userRating > 0 && !showVoteModal && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-600 text-center">
                                Your current vote: {userRating} {userRating === 1 ? 'star' : 'stars'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Review Section */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm md:text-base font-semibold text-gray-900">
                            {userReview ? 'Edit Your Review' : 'Write a Review'}
                          </h4>
                          {user && (
                            <button
                              onClick={() => setShowEditReviewSection(!showEditReviewSection)}
                              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                              title={showEditReviewSection ? 'Hide' : 'Show'}
                            >
                              {showEditReviewSection ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </button>
                          )}
                        </div>
                        
                        {showEditReviewSection && (
                          <>
                            {!showReviewForm && !userReview ? (
                              <button
                                onClick={() => setShowReviewForm(true)}
                                className="w-full px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                              >
                                Write Review
                              </button>
                            ) : (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                    Your Rating
                                  </label>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        onClick={() => setUserRating(star)}
                                        disabled={voting || submittingReview}
                                        className={`p-0.5 focus:outline-none transition-colors ${
                                          star <= (userRating || 0)
                                            ? 'text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      >
                                        <StarIcon className="h-5 w-5 fill-current" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                    Your Review
                                  </label>
                                  <textarea
                                    value={userReview}
                                    onChange={(e) => setUserReview(e.target.value)}
                                    disabled={submittingReview}
                                    placeholder="Share your experience with this company..."
                                    className="w-full px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                    rows={4}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSubmitReview}
                                    disabled={submittingReview || !userRating || !userReview.trim()}
                                    className="flex-1 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {submittingReview ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
                                  </button>
                                  {showReviewForm && !userReview && (
                                    <button
                                      onClick={() => {
                                        setShowReviewForm(false);
                                      }}
                                      disabled={submittingReview}
                                      className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="bg-white border border-gray-200">
                <div className="p-3 md:p-4">
                  <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">
                    Reviews ({reviews.length})
                  </h2>

                {reviews.length === 0 ? (
                  <div className="text-center py-4 md:py-6">
                    <p className="text-gray-500 text-xs md:text-sm">No reviews yet. Be the first to review this company!</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 md:space-y-4">
                      {reviews.slice(0, reviewsToShow).map((review) => (
                        <div key={review.id} className="border-b border-gray-200 pb-3 md:pb-4 last:border-b-0">
                          <div className="flex items-start gap-2 md:gap-3">
                            {/* User Avatar */}
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-300">
                              <img
                                src={(() => {
                                  const profileImage = review.user.image_url || review.user.avatar_url;
                                  if (!profileImage) {
                                    return `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user.full_name || review.user.username || 'User')}&background=6366f1&color=fff&size=128`;
                                  }
                                  if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
                                    return profileImage;
                                  }
                                  const { data } = supabase.storage.from('avatars').getPublicUrl(profileImage);
                                  return data.publicUrl;
                                })()}
                                alt={review.user.full_name || review.user.username || 'User'}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div>
                                  <h4 className="font-medium text-gray-900 text-xs md:text-sm">
                                    {review.user.full_name || review.user.username}
                                  </h4>
                                  <p className="text-xs text-gray-500">
                                    {new Date(review.created_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                </div>
                                {user && user.id === review.user_id && (
                                  <button
                                    onClick={() => {
                                      // Load user's review data into the form for editing
                                      setUserRating(review.rating);
                                      setUserReview(review.review || '');
                                      setShowReviewForm(true);
                                    }}
                                    className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                                  >
                                    Update
                                  </button>
                                )}
                              </div>

                              {/* Rating Stars */}
                              <div className="flex items-center gap-0.5 mb-1.5 md:mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <StarIcon
                                    key={star}
                                    className={`h-3 w-3 md:h-3.5 md:w-3.5 ${
                                      star <= review.rating
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300 fill-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>

                              {/* Review Text */}
                              <p className="text-xs md:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {review.review}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {reviews.length > reviewsToShow && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setReviewsToShow(reviews.length)}
                          className="px-4 py-2 text-xs md:text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          Show More Reviews ({reviews.length - reviewsToShow} more)
                        </button>
                      </div>
                    )}
                  </>
                )}
                </div>
              </div>

              {/* Recommended Direct Sellers Section */}
              {recommendedSellers.length > 0 && (
                <div className="bg-white border border-gray-200">
                  <div className="p-3 md:p-4">
                    <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">
                      Recommended Direct Sellers ({recommendedSellers.length})
                    </h2>
                    {loadingSellers ? (
                      <div className="space-y-3 md:space-y-1">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="bg-gray-100 rounded-lg p-4 animate-pulse">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-full bg-gray-200"></div>
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3 md:space-y-1">
                        {recommendedSellers.map((seller) => (
                          <Link
                            key={seller.id}
                            href={`/recommended-direct-sellers/${seller.username}`}
                            className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden hover:shadow-md hover:bg-indigo-50 transition-shadow transition-colors duration-200 relative flex items-center gap-4 p-3 md:p-4"
                          >
                            {/* Verification Badge */}
                            {seller.is_verified && (
                              <div className="absolute top-2 right-2 z-10">
                                <VerificationBadge isVerified={true} size="sm" showLabel={false} />
                              </div>
                            )}
                            
                            {/* Income Verification Badge */}
                            {seller.is_income_verified && (
                              <div className="absolute top-2 left-2 z-10">
                                <div className="flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                  <DollarSign className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                                  <span className="hidden sm:inline">Income Verified</span>
                                  <span className="sm:hidden">Verified</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Profile Image */}
                            <div className="flex-shrink-0">
                              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 md:border-4 border-indigo-50">
                                {seller.image_url || seller.avatar_url ? (
                                  <img
                                    src={seller.image_url || seller.avatar_url}
                                    alt={seller.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                                    <span className="text-lg md:text-xl font-bold text-indigo-500">
                                      {seller.full_name?.charAt(0) || seller.username?.charAt(0) || 'U'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Seller Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1 line-clamp-1">
                                {seller.full_name || seller.username}
                              </h3>
                              
                              {/* Location with Flag */}
                              {(seller.city || seller.state || seller.country) && (
                                <div className="flex items-center text-xs md:text-sm text-gray-500 mb-2">
                                  <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 flex-shrink-0" />
                                  <span className="line-clamp-1 flex items-center gap-1">
                                    {seller.country && (
                                      <img
                                        src={`https://flagcdn.com/w20/${seller.country.toLowerCase()}.png`}
                                        alt={`${seller.country} flag`}
                                        className="w-4 h-3 md:w-5 md:h-4 object-cover border border-gray-200 flex-shrink-0 mr-1"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <span>
                                      {[seller.city, seller.state, seller.country].filter(Boolean).join(', ') || 'Location not set'}
                                    </span>
                                  </span>
                                </div>
                              )}
                              
                              {/* Specialties */}
                              {seller.specialties && seller.specialties.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {seller.specialties.slice(0, 3).map((specialty: string, index: number) => (
                                    <span
                                      key={index}
                                      className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium line-clamp-1"
                                    >
                                      {specialty}
                                    </span>
                                  ))}
                                  {seller.specialties.length > 3 && (
                                    <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-medium">
                                      +{seller.specialties.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {/* Points */}
                              <div className="flex items-center">
                                <BadgesDisplay points={seller.points || 0} size="sm" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Share Section */}
              <div className="bg-white border border-gray-200">
                <div className="p-3 md:p-4">
                  <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Share Company</h3>
                <div className="flex justify-center">
                  <SocialShare
                    title={company.name}
                    text={company.description.substring(0, 100) + '...'}
                    url={window.location.href}
                  />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed Content Section - News, Classifieds, Blogs */}
          {(allRelatedNews.length > 0 || allRelatedClassifieds.length > 0 || allRelatedBlogs.length > 0) && (
            <div className="mt-3 md:mt-1">
              <div className="bg-white border border-gray-200">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200">
                  <div className="flex overflow-x-auto scrollbar-hide">
                    {allRelatedNews.length > 0 && (
                      <button
                        onClick={() => setActiveTab('news')}
                        className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
                          activeTab === 'news'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Newspaper className="h-4 w-4 md:h-5 md:w-5" />
                        <span>Latest Company News</span>
                        {allRelatedNews.length > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            activeTab === 'news' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {allRelatedNews.length}
                          </span>
                        )}
                      </button>
                    )}
                    {allRelatedClassifieds.length > 0 && (
                      <button
                        onClick={() => setActiveTab('classifieds')}
                        className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
                          activeTab === 'classifieds'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Briefcase className="h-4 w-4 md:h-5 md:w-5" />
                        <span>Related Classifieds</span>
                        {allRelatedClassifieds.length > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            activeTab === 'classifieds' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {allRelatedClassifieds.length}
                          </span>
                        )}
                      </button>
                    )}
                    {allRelatedBlogs.length > 0 && (
                      <button
                        onClick={() => setActiveTab('blogs')}
                        className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
                          activeTab === 'blogs'
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                        <span>Related Blog Posts</span>
                        {allRelatedBlogs.length > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            activeTab === 'blogs' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {allRelatedBlogs.length}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-3 md:p-4">
                  {/* Latest Company News Tab */}
                  {activeTab === 'news' && allRelatedNews.length > 0 && (
                    <>
                  {loadingNews ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                          <div className="h-40 sm:h-44 md:h-48 bg-gray-200"></div>
                          <div className="p-3 md:p-4 lg:p-5 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                        {relatedNews.map((newsItem: any) => {
                          // Get source (use author name or default)
                          const source = newsItem.author?.full_name || newsItem.author?.username || 'MLM Union';
                          const description = newsItem.content ? stripHtml(newsItem.content).substring(0, 120) + '...' : '';

                          return (
                            <article 
                              key={newsItem.id} 
                              className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                            >
                              <Link href={`/news/${newsItem.slug || newsItem.id}`} className="block">
                                {/* Image with Category Tag Overlay */}
                                <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                                  <img
                                    src={newsItem.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1024'}
                                    alt={newsItem.title}
                                    className="w-full h-full object-cover"
                                  />
                                  {/* Category Tag - Blue Pill at Top Left */}
                                  <div className="absolute top-2 md:top-3 left-2 md:left-3">
                                    <span className="bg-blue-600 text-white text-[10px] md:text-xs font-semibold px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase">
                                      {newsItem.category?.name || 'Uncategorized'}
                                    </span>
                                  </div>
                                </div>

                                {/* Card Content */}
                                <div className="p-3 md:p-4 lg:p-5">
                                  {/* Title */}
                                  <h2 className="text-base md:text-lg font-bold text-gray-900 mb-1.5 md:mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                                    {newsItem.title}
                                  </h2>

                                  {/* Source & Time */}
                                  <div className="flex items-center text-xs md:text-sm text-gray-500 mb-2 md:mb-3">
                                    <span className="font-medium truncate">{source}</span>
                                    <span className="mx-1 md:mx-2">•</span>
                                    <span className="whitespace-nowrap">{getTimeAgo(newsItem.created_at)}</span>
                                  </div>

                                  {/* Description Snippet */}
                                  <p className="text-xs md:text-sm text-gray-600 line-clamp-2 md:line-clamp-3 leading-relaxed">
                                    {description}
                                  </p>
                                </div>
                              </Link>
                            </article>
                          );
                        })}
                      </div>
                      
                      {/* Load More Button */}
                      {allRelatedNews.length > newsToShow && (
                        <div className="mt-6 md:mt-8 lg:mt-12 flex justify-center">
                          <button
                            onClick={handleLoadMoreNews}
                            className="inline-flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-3 bg-white border border-gray-300 rounded-lg text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            Load More Articles
                            <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 rotate-180" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  </>
                  )}

                  {/* Related Classifieds Tab */}
                  {activeTab === 'classifieds' && allRelatedClassifieds.length > 0 && (
                    <>
                      {loadingClassifieds ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-48"></div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {relatedClassifieds.map((classified: any) => {
                          const description = stripHtml(classified.description || '');
                          return (
                            <Link
                              key={classified.id}
                              href={`/classifieds/${classified.slug}`}
                              className="group block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-indigo-300 transition-all"
                            >
                              <article className="h-full flex flex-col">
                                {/* Image */}
                                <div className="relative w-full h-32 md:h-40 overflow-hidden bg-gray-100">
                                  {classified.image_url ? (
                                    <img
                                      src={classified.image_url}
                                      alt={classified.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center"><span class="text-indigo-500 text-2xl font-bold">' + classified.title.charAt(0).toUpperCase() + '</span></div>';
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                                      <span className="text-indigo-500 text-2xl font-bold">
                                        {classified.title.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Content */}
                                <div className="p-3 md:p-4 flex-1 flex flex-col">
                                  {/* Title */}
                                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1.5 md:mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                    {classified.title}
                                  </h3>

                                  {/* Time */}
                                  <div className="flex items-center text-xs md:text-sm text-gray-500 mb-2 md:mb-3">
                                    <span className="whitespace-nowrap">{getTimeAgo(classified.created_at)}</span>
                                  </div>

                                  {/* Description Snippet */}
                                  <p className="text-xs md:text-sm text-gray-600 line-clamp-2 md:line-clamp-3 leading-relaxed flex-grow">
                                    {description.substring(0, 100)}...
                                  </p>

                                  {/* Stats */}
                                  <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-100 text-xs md:text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                      <span>{classified.view_count || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <ThumbsUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                      <span>{classified.likes || 0}</span>
                                    </div>
                                  </div>
                                </div>
                              </article>
                            </Link>
                          );
                        })}
                      </div>
                      
                      {/* Load More Button */}
                      {allRelatedClassifieds.length > classifiedsToShow && (
                        <div className="mt-6 md:mt-8 lg:mt-12 flex justify-center">
                          <button
                            onClick={handleLoadMoreClassifieds}
                            className="inline-flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-3 bg-white border border-gray-300 rounded-lg text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            Load More Opportunities ({allRelatedClassifieds.length - classifiedsToShow} more)
                            <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 rotate-180" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  </>
                  )}

                  {/* Related Blog Posts Tab */}
                  {activeTab === 'blogs' && allRelatedBlogs.length > 0 && (
                    <>
                      {loadingBlogs ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-gray-100 animate-pulse rounded-lg h-48"></div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {relatedBlogs.map((blog: any) => {
                              const description = stripHtml(blog.content || '');
                              return (
                                <Link
                                  key={blog.id}
                                  href={`/blog/${blog.slug || blog.id}`}
                                  className="group block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-indigo-300 transition-all"
                                >
                                  <article className="h-full flex flex-col">
                                    {/* Image */}
                                    <div className="relative w-full h-32 md:h-40 overflow-hidden bg-gray-100">
                                      {blog.cover_image ? (
                                        <img
                                          src={blog.cover_image}
                                          alt={blog.title}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent) {
                                              parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center"><span class="text-indigo-500 text-2xl font-bold">' + blog.title.charAt(0).toUpperCase() + '</span></div>';
                                            }
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                                          <span className="text-indigo-500 text-2xl font-bold">
                                            {blog.title.charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-3 md:p-4 flex-1 flex flex-col">
                                      {/* Title */}
                                      <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1.5 md:mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                        {blog.title}
                                      </h3>

                                      {/* Time */}
                                      <div className="flex items-center text-xs md:text-sm text-gray-500 mb-2 md:mb-3">
                                        <span className="whitespace-nowrap">{getTimeAgo(blog.created_at)}</span>
                                      </div>

                                      {/* Description Snippet */}
                                      <p className="text-xs md:text-sm text-gray-600 line-clamp-2 md:line-clamp-3 leading-relaxed flex-grow">
                                        {description.substring(0, 100)}...
                                      </p>

                                      {/* Stats */}
                                      <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-100 text-xs md:text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                          <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                          <span>{blog.view_count || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <ThumbsUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                          <span>{blog.likes || 0}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </article>
                                </Link>
                              );
                            })}
                          </div>
                          
                          {/* Load More Button */}
                          {allRelatedBlogs.length > blogsToShow && (
                            <div className="mt-6 md:mt-8 lg:mt-12 flex justify-center">
                              <button
                                onClick={handleLoadMoreBlogs}
                                className="inline-flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-3 bg-white border border-gray-300 rounded-lg text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                              >
                                Load More Blog Posts ({allRelatedBlogs.length - blogsToShow} more)
                                <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 rotate-180" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}