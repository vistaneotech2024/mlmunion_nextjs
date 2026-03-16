'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { ThumbsUp, ThumbsDown, Eye, ArrowLeft } from 'lucide-react';
import { SocialShare } from '@/components/SocialShare';
import { BlogDetailSkeleton } from '@/components/skeletons';
import { useCachedBlogCategories } from '@/hooks/useCachedBlogCategories';
import { handleSupabaseError } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Blog {
  id: string;
  title: string;
  content: string;
  category: string | null;
  category_name?: string;
  created_at: string;
  author: {
    username: string;
    full_name?: string;
    avatar_url?: string;
    image_url?: string;
  };
  view_count: number;
  likes: number;
  dislikes: number;
  user_reaction?: 'like' | 'dislike';
  slug: string;
  cover_image?: string;
  meta_description?: string | null;
  meta_keywords?: string | null;
  focus_keyword?: string | null;
}

interface BlogComment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username: string | null;
    full_name: string | null;
    image_url: string | null;
    avatar_url: string | null;
  } | null;
}

function BlogCoverFallback({ title }: { title: string }) {
  return (
    <div className="relative w-full h-48 sm:h-64 md:h-96 mb-4 md:mb-6 overflow-hidden rounded-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center px-4 sm:px-6">
      <div className="text-center space-y-1 sm:space-y-2">
        <div className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-[0.25em] text-slate-300 uppercase">
          Blog Spotlight
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight md:tracking-[0.06em] bg-gradient-to-r from-indigo-300 via-purple-300 to-emerald-300 text-transparent bg-clip-text leading-tight drop-shadow-lg line-clamp-3">
          {title}
        </h1>
      </div>
    </div>
  );
}

type Props = {
  slug: string;
};

/** Normalize HTML so escaped &lt;br&gt; / &lt;br/&gt; render as line breaks instead of visible "br" text. */
function normalizeBlogHtml(html: string): string {
  if (!html || typeof html !== 'string') return html;
  return html.replace(/&lt;br\s*\/?&gt;/gi, '<br />');
}

export function BlogDetailsPageContent({ slug }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [blog, setBlog] = React.useState<Blog | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [relatedBlogs, setRelatedBlogs] = React.useState<Blog[]>([]);
  const { categories } = useCachedBlogCategories();
  const [latestBlogs, setLatestBlogs] = React.useState<Blog[]>([]);
  const userId = user?.id;

  const [comments, setComments] = React.useState<BlogComment[]>([]);
  const [commentsLoading, setCommentsLoading] = React.useState(false);
  const [newComment, setNewComment] = React.useState('');
  const [submittingComment, setSubmittingComment] = React.useState(false);
  const commentInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const commentsSectionRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (slug) loadBlog(slug);
  }, [slug]);

  async function loadBlog(blogSlugOrId: string) {
    try {
      setLoading(true);

      const cacheKey = `blog_detail_${blogSlugOrId}`;
      const cached = cache.get<Blog>(cacheKey);
      if (cached) {
        const canonicalSlug = cached.slug || cached.id;
        if (blogSlugOrId && blogSlugOrId !== canonicalSlug) {
          router.replace(`/blog/${canonicalSlug}`);
          return;
        }
        setBlog(cached);
        setLoading(false);
        loadRelatedBlogs(cached);
        loadLatestBlogs(cached);
        if (userId && cached.id) {
          loadUserReaction(cached.id);
        }
        return;
      }

      let data: any = null;
      let error: any = null;

      if (!data && !error) {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const fetchById = uuidPattern.test(blogSlugOrId);
        const res = await supabase
          .from('blog_posts')
          .select(`
            *,
            author:profiles(username, full_name, avatar_url, image_url),
            category_info:blog_categories(id, name)
          `)
          .eq(fetchById ? 'id' : 'slug', blogSlugOrId)
          .maybeSingle();
        data = res.data;
        error = res.error;
      }

      if (error) throw error;
      if (!data) throw new Error('Blog post not found');

      const canonicalSlug = (data.slug as string) || data.id;
      if (blogSlugOrId && blogSlugOrId !== canonicalSlug) {
        router.replace(`/blog/${canonicalSlug}`);
        return;
      }

      const blogWithCategory = {
        ...data,
        category_name: (data as any).category_info?.name ?? (Array.isArray((data as any).category_info) ? (data as any).category_info[0]?.name : null),
      };
      const authorResolved = Array.isArray(blogWithCategory.author) ? blogWithCategory.author[0] : blogWithCategory.author;
      const mapped = { ...blogWithCategory, author: authorResolved || { username: '' } } as Blog;

      cache.set(cacheKey, mapped, 5 * 60 * 1000);

      (async () => {
        try {
          await supabase.rpc('increment_blog_views', { slug_or_id: (data as any).id ?? (data as any).slug });
        } catch (err: any) {
          console.error('Error incrementing view count:', err);
        }
      })();

      setBlog(mapped);
      if ((data as any).id) {
        loadComments((data as any).id);
      }

      const promises: Promise<any>[] = [];
      if ((data as any).category) {
        promises.push(loadRelatedBlogs(mapped));
      }
      promises.push(loadLatestBlogs(mapped));
      if (userId && (data as any).id) {
        promises.push(loadUserReaction((data as any).id));
      }
      Promise.all(promises).catch((err) => console.error('Error loading related data:', err));
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading blog post');
      toast.error(errorMessage);
      router.push('/blog');
    } finally {
      setLoading(false);
    }
  }

  async function loadComments(blogId: string) {
    if (!supabase) return;
    try {
      setCommentsLoading(true);
      const { data, error } = await supabase
        .from('blog_comments')
        .select('id, content, created_at, user:profiles(id, username, full_name, image_url, avatar_url)')
        .eq('blog_id', blogId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const mapped = (data || []).map((c: any) => ({
        ...c,
        user: Array.isArray(c.user) ? c.user[0] : c.user,
      })) as BlogComment[];
      setComments(mapped);
    } catch (e) {
      console.error('Error loading comments:', e);
    } finally {
      setCommentsLoading(false);
    }
  }

  // If URL has #comments (from feed comment icon), scroll and focus input
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#comments') return;
    const el = commentsSectionRef.current;
    if (!el) return;
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 80;
      window.scrollTo({ top: offset, behavior: 'smooth' });
      commentInputRef.current?.focus();
    }, 200);
  }, []);

  async function submitComment() {
    if (!blog?.id || !supabase) return;
    const text = newComment.trim();
    if (!text) return;
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      setSubmittingComment(true);
      const { error } = await supabase.from('blog_comments').insert({
        blog_id: blog.id,
        user_id: user.id,
        content: text,
      });
      if (error) throw error;
      setNewComment('');
      await loadComments(blog.id);
      // Award points for commenting (best-effort)
      try {
        await supabase.rpc('award_points', { user_id: user.id, points: 2, action: 'blog_comment' });
      } catch {
        // ignore
      }
    } catch (e: any) {
      const msg = handleSupabaseError(e, 'Failed to post comment');
      toast.error(msg);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function loadRelatedBlogs(currentBlog?: Blog) {
    try {
      const blogToUse = currentBlog || blog;
      if (!blogToUse || !blogToUse.category) return;

      const relatedCacheKey = `blog_related_${blogToUse.id}`;
      const cached = cache.get<Blog[]>(relatedCacheKey);
      if (cached) {
        setRelatedBlogs(cached);
        return;
      }

      const { data: related } = await supabase
        .from('blog_posts')
        .select(`
          id, title, content, category, created_at, slug, cover_image,
          author:profiles(username),
          category_info:blog_categories(id, name)
        `)
        .eq('published', true)
        .eq('category', blogToUse.category)
        .neq('id', blogToUse.id)
        .not('slug', 'is', null)
        .order('created_at', { ascending: false })
        .limit(4);

      if (related) {
        const relatedWithCategories = related.map((r: any) => ({
          ...r,
          category_name: r.category_info?.name ?? (Array.isArray(r.category_info) ? r.category_info[0]?.name : null),
          author: Array.isArray(r.author) ? r.author[0] : r.author,
        }));
        setRelatedBlogs(relatedWithCategories as Blog[]);
        cache.set(relatedCacheKey, relatedWithCategories, 10 * 60 * 1000);
      }
    } catch (error) {
      console.error('Error loading related blogs:', error);
    }
  }

  async function loadLatestBlogs(currentBlog?: Blog) {
    try {
      const blogToUse = currentBlog || blog;
      const currentBlogId = blogToUse?.id;

      const latestBlogsCacheKey = `blog_latest_blogs_${currentBlogId || 'all'}`;
      const cached = cache.get<Blog[]>(latestBlogsCacheKey);
      if (cached) {
        const filtered = currentBlogId ? cached.filter((item) => item.id !== currentBlogId) : cached;
        setLatestBlogs(filtered);
        return;
      }

      let query = supabase
        .from('blog_posts')
        .select(`
          id, title, content, category, created_at, slug, cover_image,
          view_count, likes, dislikes,
          author:profiles(username, full_name, avatar_url, image_url),
          category_info:blog_categories(id, name)
        `)
        .eq('published', true)
        .not('slug', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (currentBlogId) {
        query = query.neq('id', currentBlogId);
      }

      const { data: latestBlogsData, error } = await query;
      if (error) throw error;

      if (latestBlogsData) {
        const blogsWithCategory = latestBlogsData.map((b: any) => ({
          ...b,
          category_name: b.category_info?.name ?? (Array.isArray(b.category_info) ? b.category_info[0]?.name : null),
          author: Array.isArray(b.author) ? b.author[0] : b.author,
        })) as Blog[];
        const filtered = currentBlogId ? blogsWithCategory.filter((item) => item.id !== currentBlogId) : blogsWithCategory;
        setLatestBlogs(filtered);
        cache.set(latestBlogsCacheKey, filtered, 10 * 60 * 1000);
      }
    } catch (error) {
      console.error('Error loading latest blogs:', error);
    }
  }

  async function loadUserReaction(blogId: string) {
    if (!userId) return;
    try {
      const { data: reaction } = await supabase
        .from('blog_reactions')
        .select('reaction')
        .eq('blog_id', blogId)
        .eq('user_id', userId)
        .maybeSingle();

      if (reaction?.reaction) {
        setBlog((prev) => (prev ? { ...prev, user_reaction: reaction.reaction } : null));
      }
    } catch (error) {
      console.error('Error loading user reaction:', error);
    }
  }

  const handleReaction = async (reaction: 'like' | 'dislike') => {
    if (!user || !blog) {
      router.push('/login');
      return;
    }

    try {
      if (blog.user_reaction === reaction) {
        const { error: deleteError } = await supabase
          .from('blog_reactions')
          .delete()
          .eq('blog_id', blog.id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        setBlog({
          ...blog,
          [reaction === 'like' ? 'likes' : 'dislikes']: blog[reaction === 'like' ? 'likes' : 'dislikes'] - 1,
          user_reaction: undefined,
        });
        cache.clear(`blog_detail_${blog.id}`);
      } else {
        const newLikes = blog.likes - (blog.user_reaction === 'like' ? 1 : 0);
        const newDislikes = blog.dislikes - (blog.user_reaction === 'dislike' ? 1 : 0);

        const { error: upsertError } = await supabase.from('blog_reactions').upsert({
          blog_id: blog.id,
          user_id: user.id,
          reaction,
        });

        if (upsertError) throw upsertError;

        setBlog({
          ...blog,
          likes: newLikes + (reaction === 'like' ? 1 : 0),
          dislikes: newDislikes + (reaction === 'dislike' ? 1 : 0),
          user_reaction: reaction,
        });
        cache.clear(`blog_detail_${blog.id}`);
      }
    } catch (error: any) {
      toast.error(handleSupabaseError(error, 'Error updating reaction'));
    }
  };

  if (loading) {
    return <BlogDetailSkeleton />;
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Blog post not found</h2>
          <Link href="/blog" className="text-indigo-600 hover:text-indigo-500">
            Return to Blog
          </Link>
        </div>
      </div>
    );
  }

  const authorResolved = Array.isArray(blog.author) ? blog.author[0] : blog.author;
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
        .explore-more-scrollbar::-webkit-scrollbar { width: 8px; }
        .explore-more-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .explore-more-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .explore-more-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="min-h-screen bg-white py-2 md:py-4">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
            <div className="lg:col-span-2">
              <Link
                href="/blog"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-3 md:mb-4 group text-sm"
              >
                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                <span>Back</span>
              </Link>

              <article className="bg-white overflow-hidden">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">{blog.title}</h1>

                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                  <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-300">
                    <img
                      src={authorAvatarUrl}
                      alt={authorName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-gray-600 text-xs md:text-sm">
                    <div className="font-medium text-gray-900">{authorName}</div>
                    <div className="text-xs">
                      {new Date(blog.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                {blog.cover_image ? (
                  <div className="relative w-full mb-4 md:mb-6 overflow-hidden rounded-lg aspect-[1200/630]">
                    <img src={blog.cover_image} alt={blog.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <BlogCoverFallback title={blog.title} />
                )}

                <div
                  className="prose prose-sm sm:prose-base md:prose-lg max-w-none mb-4 md:mb-6 text-gray-700 leading-relaxed wysiwyg blog-content-tight"
                  dangerouslySetInnerHTML={{ __html: normalizeBlogHtml(blog.content) }}
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border-t pt-4 md:pt-6">
                  <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                    <button
                      onClick={() => handleReaction('like')}
                      className={`flex items-center gap-1.5 md:gap-2 text-sm md:text-base ${
                        blog.user_reaction === 'like' ? 'text-green-600' : 'text-gray-500 hover:text-green-600'
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
                      <span>{blog.likes}</span>
                    </button>
                    <button
                      onClick={() => handleReaction('dislike')}
                      className={`flex items-center gap-1.5 md:gap-2 text-sm md:text-base ${
                        blog.user_reaction === 'dislike' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                      }`}
                    >
                      <ThumbsDown className="h-4 w-4 md:h-5 md:w-5" />
                      <span>{blog.dislikes}</span>
                    </button>
                    <div className="flex items-center text-gray-500 text-sm md:text-base">
                      <Eye className="h-4 w-4 md:h-5 md:w-5 mr-1" />
                      <span>{blog.view_count} views</span>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto">
                    <SocialShare
                      title={blog.title}
                      text={blog.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...'}
                      url={typeof window !== 'undefined' ? window.location.href : ''}
                    />
                  </div>
                </div>

                {/* Comments */}
                <div id="comments" ref={commentsSectionRef} className="border-t mt-5 pt-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="text-base md:text-lg font-bold text-gray-900">
                      Comments {comments.length ? `(${comments.length})` : ''}
                    </h2>
                    <button
                      type="button"
                      onClick={() => blog?.id && loadComments(blog.id)}
                      className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-none p-3 md:p-4">
                    <textarea
                      ref={commentInputRef}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={user ? 'Write a comment…' : 'Login to write a comment…'}
                      disabled={!user || submittingComment}
                      className="w-full min-h-[90px] rounded-none border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      maxLength={2000}
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-400">{newComment.trim().length}/2000</span>
                      <button
                        type="button"
                        onClick={submitComment}
                        disabled={!user || submittingComment || newComment.trim().length === 0}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-none bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold"
                      >
                        {submittingComment ? 'Posting…' : 'Post Comment'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {commentsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-16 bg-gray-50 border border-gray-200 rounded-none animate-pulse" />
                        ))}
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-sm text-gray-500">No comments yet. Be the first to comment.</div>
                    ) : (
                      comments.map((c) => {
                        const u = c.user;
                        const name = u?.full_name || u?.username || 'User';
                        const avatar =
                          u?.image_url ||
                          u?.avatar_url ||
                          (u?.username ? `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=6366f1&color=fff&size=128` : null);
                        return (
                          <div key={c.id} className="bg-white border border-gray-200 rounded-none p-3 md:p-4">
                            <div className="flex items-start gap-3">
                              {avatar ? (
                                <img
                                  src={avatar}
                                  alt={name}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-white flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                                  <span className="text-indigo-700 font-bold">{name.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-gray-900 truncate">{name}</p>
                                  <span className="text-xs text-gray-400">
                                    {new Date(c.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">
                                  {c.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </article>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white p-3 md:p-4 lg:p-6 lg:sticky lg:top-4">
                <div className="mb-6 md:mb-8">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">Explore more.</h2>
                  <div
                    className="max-h-[400px] md:max-h-[600px] overflow-y-auto pr-2 explore-more-scrollbar"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}
                  >
                    {latestBlogs.length > 0 && (
                      <div className="space-y-3 md:space-y-4">
                        {latestBlogs.map((latestBlog) => (
                          <Link
                            key={latestBlog.id}
                            href={`/blog/${latestBlog.slug || latestBlog.id}`}
                            className="block group hover:bg-gray-50 p-2 md:p-3 rounded-lg transition-colors border border-gray-200"
                          >
                            {latestBlog.cover_image && (
                              <div className="w-full mb-2 overflow-hidden rounded-md aspect-[1200/630]">
                                <img
                                  src={latestBlog.cover_image}
                                  alt={latestBlog.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            )}
                            <h3 className="text-xs md:text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-1">
                              {latestBlog.title}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {new Date(latestBlog.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
