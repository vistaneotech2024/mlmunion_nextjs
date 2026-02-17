'use client';

import React from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import { Hero } from '@/components/Hero';
import { ClassifiedsList } from '@/components/ClassifiedsList';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { BlogListSkeleton } from '@/components/skeletons';
import {
  Trophy,
  Star,
  Building2,
  MessageSquare,
  CheckCircle,
  Users,
  TrendingUp,
  ArrowRight,
  DollarSign,
  ChevronRight,
  FileText,
} from 'lucide-react';
import 'swiper/css';
import 'swiper/css/navigation';

interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  duration?: number;
}

function AnimatedCounter({ end, suffix = '', duration = 2000 }: AnimatedCounterProps) {
  const [count, setCount] = React.useState(0);
  const [hasAnimated, setHasAnimated] = React.useState(false);
  const counterRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (hasAnimated) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateCounter();
          }
        });
      },
      { threshold: 0.3 }
    );
    if (counterRef.current) observer.observe(counterRef.current);
    return () => {
      if (counterRef.current) observer.unobserve(counterRef.current);
    };
  }, [hasAnimated]);

  const animateCounter = () => {
    const startTime = Date.now();
    const startValue = 0;
    const updateCounter = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (end - startValue) * easeOutQuart);
      setCount(currentValue);
      if (progress < 1) requestAnimationFrame(updateCounter);
      else setCount(end);
    };
    requestAnimationFrame(updateCounter);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      const thousands = num / 1000;
      if (thousands % 1 === 0) return `${thousands.toFixed(0)}K`;
      return `${thousands.toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div ref={counterRef} className="text-3xl sm:text-4xl font-bold text-white mb-2">
      {formatNumber(count)}
      {suffix}
    </div>
  );
}

const CACHE_KEY = 'homepage_blogs';
const CACHE_TTL = 5 * 60 * 1000;

export function HomePageContent() {
  const [blogs, setBlogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadBlogs();
  }, []);

  async function loadBlogs() {
    try {
      const cached = cache.get<any[]>(CACHE_KEY);
      if (cached) {
        setBlogs(cached);
        setLoading(false);
        fetchFreshBlogs();
        return;
      }
      await fetchFreshBlogs();
    } catch (error: any) {
      console.error('Error loading blogs:', error);
      const staleCache = cache.get<any[]>(CACHE_KEY);
      if (Array.isArray(staleCache)) setBlogs(staleCache);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFreshBlogs() {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*, author:profiles(username)')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) {
        console.error('Error loading blogs:', error);
        return;
      }
      const blogsData = data || [];
      setBlogs(blogsData);
      cache.set(CACHE_KEY, blogsData, CACHE_TTL);
    } catch (error: any) {
      console.error('Error fetching fresh blogs:', error);
    }
  }

  return (
    <>
      <Hero />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {/* Top Earners Spotlight */}
          <div className="bg-gradient-to-br from-indigo-700 to-blue-500 rounded-xl shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative">
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-yellow-300 bg-opacity-20 p-2.5 sm:p-3 rounded-full">
                  <Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-300" />
                </div>
                <div className="bg-indigo-800 bg-opacity-50 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium text-white">
                  500+ Top Performers
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3">Top Earners Spotlight</h3>
              <p className="text-sm sm:text-base text-indigo-100 mb-4">
                Discover how top performers are earning $10,000+ monthly in network marketing.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-300 mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-white">Success stories & strategies</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-300 mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-white">Verified income reports</span>
                </div>
              </div>
              <Link
                href="/top-earners"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 sm:py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-white text-sm sm:text-base font-medium transition-colors"
              >
                <span>View Top Earners</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </div>
            <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-yellow-400 bg-opacity-20 -z-10" />
            <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-blue-400 bg-opacity-20 -z-10" />
          </div>

          {/* Premium Seller Promotion */}
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-yellow-300 bg-opacity-30" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-amber-700 bg-opacity-20" />
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
              <div className="bg-red-500 text-white text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full animate-pulse">
                Limited Time
              </div>
            </div>
            <div className="p-5 sm:p-6 relative z-10">
              <div className="bg-amber-300 bg-opacity-20 p-2.5 sm:p-3 rounded-full inline-block mb-4">
                <Star className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3">Premium Seller</h3>
              <p className="text-sm sm:text-base text-amber-100 mb-4">
                Verify your income and get exclusive benefits as a premium seller.
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-white mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-white">Verified income badge</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-white mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-white">Featured in search results</span>
                </div>
              </div>
              <Link
                href="/income-verification"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 sm:py-2 bg-white text-amber-600 hover:bg-amber-50 rounded-lg text-sm sm:text-base font-medium transition-colors"
              >
                <span>Upgrade Now</span>
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </div>
            <div className="absolute -top-10 -left-10 w-20 h-60 bg-white opacity-10 rotate-12 transform-gpu animate-shine" />
          </div>

          {/* MLM Companies Directory */}
          <div className="bg-white shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 md:col-span-2">
            <div className="p-5 sm:p-6">
              <div className="bg-indigo-100 p-2.5 sm:p-3 rounded-full inline-block mb-4">
                <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">MLM Companies Directory</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                Explore legitimate network marketing opportunities with top-rated companies.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="bg-gray-100 rounded-md p-2 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-800">Herbalife</span>
                </div>
                <div className="bg-gray-100 rounded-md p-2 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-800">Amway</span>
                </div>
                <div className="bg-gray-100 rounded-md p-2 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-800">Avon</span>
                </div>
                <div className="bg-gray-100 rounded-md p-2 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-800">doTERRA</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                  <span>Verified Reviews</span>
                </div>
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1 text-indigo-500" />
                  <span>Growth Metrics</span>
                </div>
              </div>
              <Link
                href="/companies"
                className="inline-flex items-center justify-between w-full px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm sm:text-base font-medium transition-colors"
              >
                <span>Browse Companies</span>
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Classifieds Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 sm:mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Network Marketing Opportunities</h2>
              <p className="text-xs sm:text-sm text-gray-600">Find your next business opportunity or post your own classified ad</p>
            </div>
            <Link
              href="/my-classifieds"
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Post Free Ad
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div className="lg:col-span-3">
              <ClassifiedsList limit={3} showViewAll={true} />
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-100">
                <h3 className="text-base font-semibold text-indigo-900 mb-2">Post Your Opportunity</h3>
                <p className="text-xs sm:text-sm text-indigo-700 mb-4">Have a network marketing opportunity to share? Create your own classified ad.</p>
                <Link
                  href="/my-classifieds"
                  className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Post a Classified
                </Link>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Popular Categories</h3>
                <div className="space-y-2">
                  <Link href="/classifieds?category=health" className="flex items-center justify-between p-2.5 bg-gray-50 rounded-md hover:bg-indigo-50 transition-colors group">
                    <span className="text-xs sm:text-sm text-gray-700 group-hover:text-indigo-600">Health & Wellness</span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                  </Link>
                  <Link href="/classifieds?category=beauty" className="flex items-center justify-between p-2.5 bg-gray-50 rounded-md hover:bg-indigo-50 transition-colors group">
                    <span className="text-xs sm:text-sm text-gray-700 group-hover:text-indigo-600">Beauty</span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                  </Link>
                  <Link href="/classifieds?category=finance" className="flex items-center justify-between p-2.5 bg-gray-50 rounded-md hover:bg-indigo-50 transition-colors group">
                    <span className="text-xs sm:text-sm text-gray-700 group-hover:text-indigo-600">Finance</span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                  </Link>
                  <Link href="/classifieds" className="flex items-center justify-between p-2.5 bg-gray-50 rounded-md hover:bg-indigo-50 transition-colors group">
                    <span className="text-xs sm:text-sm text-gray-700 group-hover:text-indigo-600">View All Categories</span>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                  </Link>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                <Link
                  href="/direct-sellers"
                  className="inline-flex items-center text-sm text-green-700 hover:text-green-800 font-medium transition-colors"
                >
                  <span>Find Verified Sellers</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Latest Blogs Section */}
        <div className="mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Latest Blog Posts</h2>
              <p className="text-xs sm:text-sm text-gray-600">Insights and tips from experienced network marketers</p>
            </div>
            <Link
              href="/blog"
              className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              View All
            </Link>
          </div>
          {loading ? (
            <BlogListSkeleton count={4} />
          ) : blogs.length > 0 ? (
            <div className="relative">
              <Swiper
                modules={[Autoplay, Navigation]}
                spaceBetween={16}
                slidesPerView={1}
                slidesPerGroup={1}
                centeredSlides={false}
                breakpoints={{
                  640: { slidesPerView: 2, slidesPerGroup: 1, spaceBetween: 16, centeredSlides: false },
                  1024: { slidesPerView: 3, slidesPerGroup: 1, spaceBetween: 20, centeredSlides: false },
                  1280: { slidesPerView: 4, slidesPerGroup: 1, spaceBetween: 20, centeredSlides: false },
                }}
                autoplay={{ delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }}
                speed={1000}
                loop={blogs.length > 8}
                loopAdditionalSlides={blogs.length > 8 ? 4 : 0}
                watchSlidesProgress={true}
                navigation={{
                  nextEl: '.blog-swiper-button-next',
                  prevEl: '.blog-swiper-button-prev',
                }}
                className="blog-swiper"
              >
                {blogs.map((blog: any) => {
                  if (!blog.slug) return null;
                  return (
                    <SwiperSlide key={blog.id}>
                      <Link href={`/blog/${blog.slug || blog.id}`} className="group block h-full">
                        <article className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-indigo-300 transition-all duration-200 h-full flex flex-col">
                          <div className="relative w-full h-32 sm:h-36 overflow-hidden bg-gray-100">
                            {blog.cover_image ? (
                              <img
                                src={blog.cover_image}
                                alt={blog.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                                <span className="text-indigo-500 text-2xl font-bold">{blog.title.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3 sm:p-4 flex flex-col flex-grow">
                            <div className="mb-1.5">
                              <span className="text-xs text-gray-500">
                                {new Date(blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-tight">
                              {blog.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 flex-grow mb-3 leading-relaxed">
                              {(blog.content || '').replace(/<[^>]*>/g, '').substring(0, 100)}...
                            </p>
                            <div className="mt-auto pt-2 border-t border-gray-100">
                              <span className="text-indigo-600 font-medium flex items-center text-xs sm:text-sm group-hover:translate-x-1 transition-transform">
                                Read More <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-1" />
                              </span>
                            </div>
                          </div>
                        </article>
                      </Link>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
              <button type="button" className="blog-swiper-button-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-50 transition-colors border border-gray-200 hidden lg:flex" aria-label="Previous">
                <ChevronRight className="h-5 w-5 text-gray-700 rotate-180" />
              </button>
              <button type="button" className="blog-swiper-button-next absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-50 transition-colors border border-gray-200 hidden lg:flex" aria-label="Next">
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>
              <style>{`
                .blog-swiper { padding: 0 50px; }
                @media (max-width: 1024px) { .blog-swiper { padding: 0 20px; } }
                @media (max-width: 640px) { .blog-swiper { padding: 0; } }
                .blog-swiper-button-prev, .blog-swiper-button-next { opacity: 0.8; }
                .blog-swiper-button-prev:hover, .blog-swiper-button-next:hover { opacity: 1; }
                .blog-swiper-button-prev.swiper-button-disabled, .blog-swiper-button-next.swiper-button-disabled { opacity: 0.3; cursor: not-allowed; }
              `}</style>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No blog posts available.</p>
            </div>
          )}
          <div className="mt-4 sm:mt-5 text-center sm:hidden">
            <Link
              href="/blog"
              className="inline-flex items-center px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View All Posts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-12 sm:mt-16 bg-gradient-to-r from-indigo-900 to-blue-800 rounded-xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8 md:p-12">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Join Our Growing Community</h2>
              <p className="text-base sm:text-lg md:text-xl text-indigo-200 max-w-3xl mx-auto px-2">
                Connect with thousands of network marketers and find your next opportunity
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
              <div className="text-center">
                <AnimatedCounter end={500} suffix="+" />
                <p className="text-sm sm:text-base text-indigo-200">MLM Companies</p>
              </div>
              <div className="text-center">
                <AnimatedCounter end={10000} suffix="+" />
                <p className="text-sm sm:text-base text-indigo-200">Direct Sellers</p>
              </div>
              <div className="text-center">
                <AnimatedCounter end={5000} suffix="+" />
                <p className="text-sm sm:text-base text-indigo-200">Opportunities</p>
              </div>
              <div className="text-center">
                <AnimatedCounter end={20000} suffix="+" />
                <p className="text-sm sm:text-base text-indigo-200">Monthly Visitors</p>
              </div>
            </div>
            <div className="mt-8 sm:mt-10 text-center">
              <Link
                href="/signup"
                className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 border border-transparent rounded-lg shadow-lg text-sm sm:text-base font-medium text-indigo-900 bg-white hover:bg-indigo-50"
              >
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Join Now - It&apos;s Free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
