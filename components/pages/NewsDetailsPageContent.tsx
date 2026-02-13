'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { ThumbsUp, ThumbsDown, Share2, Eye, ArrowLeft } from 'lucide-react';
import { NewsDetailSkeleton } from '@/components/skeletons';
import { handleSupabaseError } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  image_url: string;
  author?: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
    image_url?: string;
    id?: string;
  };
  created_at: string;
  likes: number;
  dislikes: number;
  views: number;
  user_reaction?: 'like' | 'dislike';
  slug?: string;
  meta_description?: string | null;
  meta_keywords?: string | null;
  focus_keyword?: string | null;
}

interface RelatedArticle {
  id: string;
  title: string;
  slug?: string;
  image_url?: string;
  created_at: string;
  categoryId?: string;
  categoryName?: string;
}

interface CategoryNews {
  category: string;
  articles: { id: string; title: string; slug?: string; image_url?: string; created_at: string }[];
}

type Props = { slug: string; id: string };

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getFirst100Words(htmlContent: string): string {
  const text = (htmlContent || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  const words = text.split(/\s+/).slice(0, 100);
  return words.join(' ');
}

export function NewsDetailsPageContent({ slug, id }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [article, setArticle] = React.useState<NewsArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = React.useState<RelatedArticle[]>([]);
  const [categoryNews, setCategoryNews] = React.useState<CategoryNews[]>([]);
  const [loading, setLoading] = React.useState(true);
  const userId = user?.id;

  React.useEffect(() => {
    const slugOrId = id || slug;
    if (slugOrId) loadArticle(slugOrId, id);
  }, [slug, id]);

  async function loadArticle(articleSlugOrId: string, articleId?: string) {
    try {
      setLoading(true);
      const cacheKey = `news_detail_${articleId || articleSlugOrId}`;
      const cached = cache.get<NewsArticle>(cacheKey);
      if (cached) {
        setArticle(cached);
        setLoading(false);
        loadRelatedArticles(cached);
        loadTopNewsByCategory(cached);
        if (userId && cached.id) loadUserReaction(cached.id);
        return;
      }

      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const fetchById = articleId || uuidPattern.test(articleSlugOrId);

      let { data, error } = fetchById
        ? await supabase
            .from('news')
            .select(`*, author:profiles(username, full_name, avatar_url, image_url, id), category:news_categories(id, name)`)
            .eq('id', articleId || articleSlugOrId)
            .eq('published', true)
            .limit(1)
            .maybeSingle()
        : await supabase
            .from('news')
            .select(`*, author:profiles(username, full_name, avatar_url, image_url, id), category:news_categories(id, name)`)
            .eq('slug', articleSlugOrId)
            .eq('published', true)
            .limit(1)
            .maybeSingle();

      if (!data && !error && !fetchById && uuidPattern.test(articleSlugOrId)) {
        const res = await supabase
          .from('news')
          .select(`*, author:profiles(username, full_name, avatar_url, image_url, id), category:news_categories(id, name)`)
          .eq('id', articleSlugOrId)
          .eq('published', true)
          .limit(1)
          .maybeSingle();
        data = res.data;
        error = res.error;
      }

      if (error) throw error;
      if (!data) {
        router.push('/news');
        return;
      }

      const canonicalSlug = (data as any).slug || (data as any).id;
      if (!articleId && (data as any).slug && (data as any).slug !== articleSlugOrId) {
        router.replace(`/news/${canonicalSlug}/${(data as any).id}`);
        return;
      }

      const authorResolved = Array.isArray((data as any).author) ? (data as any).author[0] : (data as any).author;
      const mapped = { ...data, author: authorResolved } as NewsArticle;

      cache.set(cacheKey, mapped, 5 * 60 * 1000);
      (async () => {
        try {
          await supabase.rpc('increment_news_views', { article_id: (data as any).id });
        } catch (err: any) {
          console.error('Error incrementing view count:', err);
        }
      })();
      setArticle(mapped);

      const promises: Promise<any>[] = [loadRelatedArticles(mapped), loadTopNewsByCategory(mapped)];
      if (userId && (data as any).id) promises.push(loadUserReaction((data as any).id));
      Promise.all(promises).catch((err) => console.error('Error loading related data:', err));
    } catch (error: any) {
      toast.error(handleSupabaseError(error, 'Error loading article'));
      router.push('/news');
    } finally {
      setLoading(false);
    }
  }

  async function loadRelatedArticles(currentArticle?: NewsArticle) {
    const articleToUse = currentArticle || article;
    if (!articleToUse) return;
    const relatedCacheKey = `news_related_${articleToUse.id}`;
    const cached = cache.get<RelatedArticle[]>(relatedCacheKey);
    if (cached) {
      setRelatedArticles(cached);
      return;
    }
    const categoriesCacheKey = 'news_categories';
    let allCategories = cache.getPersistent<Array<{ id: string; name: string }>>(categoriesCacheKey);
    if (!allCategories) {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('news_categories')
        .select('id, name')
        .eq('is_active', 1)
        .order('name', { ascending: true })
        .limit(20);
      if (categoriesError) return;
      allCategories = categoriesData || [];
      if (allCategories.length > 0) cache.setPersistent(categoriesCacheKey, allCategories, 30 * 60 * 1000);
    }
    if (!allCategories?.length) {
      setRelatedArticles([]);
      return;
    }
    const categoriesToLoad = allCategories.slice(0, 6);
    const latestNewsPromises = categoriesToLoad.map(async (cat) => {
      const { data: latestNewsData } = await supabase
        .from('news')
        .select('id, title, slug, image_url, created_at')
        .eq('published', true)
        .eq('news_category', cat.id)
        .neq('id', articleToUse.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestNewsData) return { categoryId: cat.id, categoryName: cat.name, ...latestNewsData };
      return null;
    });
    const resolvedNews = (await Promise.all(latestNewsPromises)).filter(Boolean) as RelatedArticle[];
    setRelatedArticles(resolvedNews);
    cache.set(relatedCacheKey, resolvedNews, 10 * 60 * 1000);
  }

  async function loadTopNewsByCategory(currentArticle?: NewsArticle) {
    const articleToUse = currentArticle || article;
    const categoryNewsCacheKey = `news_category_news_${articleToUse?.id || 'all'}`;
    const cached = cache.get<CategoryNews[]>(categoryNewsCacheKey);
    if (cached) {
      setCategoryNews(cached);
      return;
    }
    const categoriesCacheKey = 'news_categories';
    let allCategories = cache.getPersistent<Array<{ id: string; name: string }>>(categoriesCacheKey);
    if (!allCategories) {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('news_categories')
        .select('id, name')
        .eq('is_active', 1)
        .order('name', { ascending: true })
        .limit(10);
      if (categoriesError) return;
      allCategories = categoriesData || [];
      if (allCategories.length > 0) cache.setPersistent(categoriesCacheKey, allCategories, 30 * 60 * 1000);
    }
    if (!allCategories?.length) {
      setCategoryNews([]);
      return;
    }
    const categoriesToLoad = allCategories.slice(0, 8);
    const categoryNewsData: (CategoryNews | null)[] = await Promise.all(
      categoriesToLoad.map(async (category) => {
        let query = supabase
          .from('news')
          .select('id, title, slug, image_url, created_at, news_category')
          .eq('published', true)
          .eq('news_category', category.id)
          .order('created_at', { ascending: false })
          .limit(3);
        if (articleToUse) query = query.neq('id', articleToUse.id);
        const { data, error } = await query;
        if (error) return null;
        return {
          category: category.name,
          articles: (data || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            image_url: item.image_url,
            created_at: item.created_at,
          })),
        };
      })
    );
    const filtered = categoryNewsData
      .filter((cat): cat is CategoryNews => cat !== null && cat.articles.length > 0)
      .sort((a, b) => a.category.localeCompare(b.category));
    setCategoryNews(filtered);
    cache.set(categoryNewsCacheKey, filtered, 10 * 60 * 1000);
  }

  async function loadUserReaction(articleId: string) {
    if (!userId) return;
    try {
      const { data: reactions } = await supabase
        .from('news_reactions')
        .select('reaction')
        .eq('news_id', articleId)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      if (reactions?.reaction) {
        setArticle((prev) => (prev ? { ...prev, user_reaction: reactions.reaction } : null));
      }
    } catch (error) {
      console.error('Error loading user reaction:', error);
    }
  }

  const handleReaction = async (reaction: 'like' | 'dislike') => {
    if (!user || !article) {
      router.push('/login');
      return;
    }
    try {
      if (article.user_reaction === reaction) {
        const { error: deleteError } = await supabase
          .from('news_reactions')
          .delete()
          .eq('news_id', article.id)
          .eq('user_id', user.id);
        if (deleteError) throw deleteError;
        setArticle({
          ...article,
          [reaction === 'like' ? 'likes' : 'dislikes']: article[reaction === 'like' ? 'likes' : 'dislikes'] - 1,
          user_reaction: undefined,
        });
        cache.clear(`news_detail_${article.slug}`);
      } else {
        const newLikes = article.likes - (article.user_reaction === 'like' ? 1 : 0);
        const newDislikes = article.dislikes - (article.user_reaction === 'dislike' ? 1 : 0);
        const { error: upsertError } = await supabase.from('news_reactions').upsert({
          news_id: article.id,
          user_id: user.id,
          reaction,
        });
        if (upsertError) throw upsertError;
        setArticle({
          ...article,
          likes: newLikes + (reaction === 'like' ? 1 : 0),
          dislikes: newDislikes + (reaction === 'dislike' ? 1 : 0),
          user_reaction: reaction,
        });
        cache.clear(`news_detail_${article.slug}`);
      }
    } catch (error: any) {
      toast.error(handleSupabaseError(error, 'Error updating reaction'));
    }
  };

  const handleShare = async () => {
    if (!article) return;
    try {
      const shareData = { title: article.title, text: article.content.substring(0, 100) + '...', url: typeof window !== 'undefined' ? window.location.href : '' };
      if (typeof navigator !== 'undefined' && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '');
          toast.success('Link copied to clipboard!');
        }
      }
    }
  };

  if (loading) return <NewsDetailSkeleton />;
  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Article not found</h2>
          <Link href="/news" className="text-indigo-600 hover:text-indigo-500">Return to News</Link>
        </div>
      </div>
    );
  }

  const authorResolved = Array.isArray(article.author) ? article.author[0] : article.author;
  const authorName = authorResolved?.full_name || authorResolved?.username || 'Author';
  const profileImage = authorResolved?.image_url || authorResolved?.avatar_url;
  const authorAvatarUrl = !profileImage
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=6366f1&color=fff&size=128`
    : profileImage.startsWith('http://') || profileImage.startsWith('https://')
      ? profileImage
      : supabase.storage.from('avatars').getPublicUrl(profileImage).data.publicUrl;

  return (
    <>
      <style>{`
        .latest-news-scrollbar::-webkit-scrollbar { width: 8px; }
        .latest-news-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .latest-news-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .latest-news-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="min-h-screen bg-white py-2 md:py-4">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
            <div className="lg:col-span-2">
              <Link href="/news" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-3 md:mb-4 group text-sm">
                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                <span>Back</span>
              </Link>

              <article itemScope itemType="https://schema.org/NewsArticle" className="bg-white overflow-hidden">
                <div className="mb-4 md:mb-6">
                  <img
                    src={article.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1200'}
                    alt={article.title}
                    className="w-full h-auto object-cover rounded-lg"
                    itemProp="image"
                  />
                </div>

                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4" itemProp="headline">
                  {article.title}
                </h1>

                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-300">
                    <img src={authorAvatarUrl} alt={authorName} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-gray-600 text-xs md:text-sm">
                    <div className="font-medium text-gray-900">{authorName}</div>
                    <div className="text-xs">
                      {new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className="mb-4 md:mb-6">
                  <div className="text-base md:text-lg font-medium text-gray-900 leading-relaxed" itemProp="description">
                    {getFirst100Words(article.content)}
                    {getFirst100Words(article.content).split(' ').length >= 100 && '...'}
                  </div>
                </div>

                <div
                  className="prose prose-sm sm:prose-base md:prose-lg max-w-none text-gray-800 mb-4 md:mb-6 leading-relaxed wysiwyg"
                  itemProp="articleBody"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />

                <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border-t border-gray-200 pt-4 md:pt-6">
                  <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                    <button
                      onClick={() => handleReaction('like')}
                      className={`flex items-center gap-1.5 md:gap-2 text-sm md:text-base ${article.user_reaction === 'like' ? 'text-green-600' : 'text-gray-500 hover:text-green-600'} transition-colors`}
                    >
                      <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
                      <span>{article.likes}</span>
                    </button>
                    <button
                      onClick={() => handleReaction('dislike')}
                      className={`flex items-center gap-1.5 md:gap-2 text-sm md:text-base ${article.user_reaction === 'dislike' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'} transition-colors`}
                    >
                      <ThumbsDown className="h-4 w-4 md:h-5 md:w-5" />
                      <span>{article.dislikes}</span>
                    </button>
                    <div className="flex items-center text-gray-500 text-sm md:text-base">
                      <Eye className="h-4 w-4 md:h-5 md:w-5 mr-1" />
                      <span>{article.views}</span>
                    </div>
                  </div>
                  <button onClick={handleShare} className="text-gray-500 hover:text-indigo-600 p-1.5 md:p-2 hover:bg-gray-100 transition-colors rounded">
                    <Share2 className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </div>
              </article>
            </div>

            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-4">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">Latest News Article</h2>
                {relatedArticles.length > 0 ? (
                  <div className="max-h-[400px] md:max-h-[600px] overflow-y-auto pr-2 space-y-3 md:space-y-4 latest-news-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                    {relatedArticles.map((relatedArticle) => (
                      <Link
                        key={relatedArticle.id}
                        href={`/news/${relatedArticle.slug || relatedArticle.id}/${relatedArticle.id}`}
                        className="block group hover:bg-gray-50 p-2 md:p-3 rounded-lg transition-colors border border-gray-200"
                      >
                        {relatedArticle.categoryName && (
                          <div className="text-xs font-semibold text-blue-600 mb-1.5 md:mb-2">{relatedArticle.categoryName}</div>
                        )}
                        {relatedArticle.image_url && (
                          <div className="w-full h-24 md:h-32 mb-2 overflow-hidden rounded-md">
                            <img src={relatedArticle.image_url} alt={relatedArticle.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <h3 className="text-xs md:text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-1">{relatedArticle.title}</h3>
                        <p className="text-xs text-gray-500">{formatDate(relatedArticle.created_at)}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 md:py-8 text-gray-500 text-sm">No other articles available</div>
                )}
              </div>
            </div>
          </div>

          {categoryNews.length > 0 && (
            <div className="mt-8 md:mt-12 lg:mt-16 border-t border-gray-200 pt-6 md:pt-8 lg:pt-12">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 lg:mb-8">Top News by Category</h2>
              <div className="space-y-8 md:space-y-10 lg:space-y-12">
                {categoryNews.map((categoryData) => (
                  <div key={categoryData.category}>
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 md:mb-6">{categoryData.category}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
                      {categoryData.articles.map((newsItem) => (
                        <Link
                          key={newsItem.id}
                          href={`/news/${newsItem.slug || newsItem.id}/${newsItem.id}`}
                          className="group bg-white rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 border border-gray-200"
                        >
                          <div className="relative w-full h-40 md:h-48 overflow-hidden bg-gray-200">
                            <img
                              src={newsItem.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=800'}
                              alt={newsItem.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3 md:p-4 bg-white">
                            <div className="text-xs md:text-sm text-gray-600 mb-1.5 md:mb-2">{formatDate(newsItem.created_at)}</div>
                            <h4 className="text-sm md:text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-tight">{newsItem.title}</h4>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
