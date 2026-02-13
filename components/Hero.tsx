'use client'

import React from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { HeroSkeleton } from './skeletons';
import { ArrowRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const CACHE_KEY = 'hero_banners';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface HeroBanner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  cta_text: string;
  cta_link: string;
  active: boolean;
  order: number;
}

const DEFAULT_BANNERS: HeroBanner[] = [
  {
    id: '1',
    title: 'Build Your Network Marketing Empire',
    description: 'Connect with like-minded entrepreneurs and grow your business',
    image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1920',
    cta_text: 'Get Started',
    cta_link: '/register',
    active: true,
    order: 0
  },
  {
    id: '2',
    title: 'Share Your Success Story',
    description: 'Write blogs and inspire others in their journey',
    image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=1920',
    cta_text: 'Start Writing',
    cta_link: '/blog/new',
    active: true,
    order: 1
  }
];

export function Hero() {
  const [banners, setBanners] = React.useState<HeroBanner[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const retryCount = React.useRef(0);
  const maxRetries = 3;

  const loadBanners = React.useCallback(async () => {
    try {
      // Check cache first
      const cached = cache.get<HeroBanner[]>(CACHE_KEY);
      if (cached) {
        setBanners(cached);
        setError(null);
        setLoading(false);
        
        // Load fresh data in background
        fetchAndCacheBanners();
        return;
      }

      await fetchAndCacheBanners();
    } catch (error: any) {
      console.error('Error loading banners:', error);
      // Try to use cached data even if expired
      const staleCache = cache.get<HeroBanner[]>(CACHE_KEY);
      if (staleCache) {
        setBanners(staleCache);
        setError(null);
      } else {
        setError(error.message);
        // Retry logic
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 5000); // Exponential backoff
          setTimeout(loadBanners, delay);
        } else {
          // Fall back to default banners after max retries
          setBanners(DEFAULT_BANNERS);
          setError(null);
        }
      }
    } finally {
      setLoading(false);
    }

    async function fetchAndCacheBanners() {
      try {
        const { data, error } = await supabase
          .from('hero_banners')
          .select('*')
          .eq('active', true)
          .order('order', { ascending: true });

        if (error) {
          const errorMessage = handleSupabaseError(error, 'Error loading banners');
          throw new Error(errorMessage);
        }

        const bannersData = data || DEFAULT_BANNERS;
        setBanners(bannersData);
        setError(null);
        // Cache the result
        cache.set(CACHE_KEY, bannersData, CACHE_TTL);
      } catch (error: any) {
        console.error('Error fetching fresh banners:', error);
        throw error;
      }
    }
  }, []);

  React.useEffect(() => {
    loadBanners();

    // Set up real-time subscription for banner updates
    // Only refresh if admin makes changes
    const subscription = supabase
      .channel('hero_banners_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hero_banners'
        },
        () => {
          // Clear cache and reload when banners are updated
          cache.clear(CACHE_KEY);
          loadBanners();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadBanners]);

  if (loading) {
    return <HeroSkeleton />;
  }

  if (error) {
    console.error('Banner loading error:', error);
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        navigation={{
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        }}
        pagination={{ 
          clickable: true,
          bulletClass: 'swiper-pagination-bullet !bg-white/50',
          bulletActiveClass: 'swiper-pagination-bullet-active !bg-white'
        }}
        autoplay={{ delay: 5000 }}
        className="h-[400px] sm:h-[500px] md:h-[600px]"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div className="relative h-full">
              <img
                src={banner.image_url}
                alt={banner.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 to-indigo-900/70" />
              <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6">
                <div className="text-center text-white max-w-4xl w-full">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 leading-tight">
                    {banner.title}
                  </h1>
                  <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-indigo-100 px-2 sm:px-0">
                    {banner.description}
                  </p>
                  
                  {banner.cta_link ? (
                    <Link
                      href={banner.cta_link}
                      className="inline-flex items-center px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg text-base sm:text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-lg hover:shadow-xl"
                    >
                      {banner.cta_text}
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg text-base sm:text-lg font-semibold bg-indigo-600 text-white">
                      {banner.cta_text}
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* Custom Navigation Buttons - Hidden on mobile */}
      <style>{`
        .swiper-button-next,
        .swiper-button-prev {
          color: white;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          backdrop-filter: blur(10px);
        }
        .swiper-button-next:after,
        .swiper-button-prev:after {
          font-size: 20px;
        }
        .swiper-button-next:hover,
        .swiper-button-prev:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        @media (max-width: 640px) {
          .swiper-button-next,
          .swiper-button-prev {
            display: none;
          }
        }
        .swiper-pagination {
          bottom: 20px !important;
        }
        .swiper-pagination-bullet {
          width: 10px;
          height: 10px;
          margin: 0 4px;
        }
      `}</style>
    </div>
  );
}