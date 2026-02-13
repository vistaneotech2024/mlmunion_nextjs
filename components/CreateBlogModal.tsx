'use client'

import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RichTextEditor } from './RichTextEditor';
import { ImageUpload } from './ImageUpload';
import { AIBlogGenerator } from './AIBlogGenerator';
import { handleSupabaseError } from '@/lib/supabase';
import { triggerSitemapRegeneration } from '../lib/sitemap';
import { showPointsNotification } from './PointsNotification';
import toast from 'react-hot-toast';
import { useCachedBlogCategories } from '../hooks/useCachedBlogCategories';

interface BlogFormData {
  title: string;
  content: string;
  category: string;
  published: boolean;
  cover_image: string;
  company_id?: string;
  meta_description: string;
  meta_keywords: string;
  focus_keyword: string;
}

interface CreateBlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    title?: string;
    content?: string;
    meta_description?: string;
    meta_keywords?: string;
    focus_keyword?: string;
  };
}

export function CreateBlogModal({ isOpen, onClose, onSuccess, initialData }: CreateBlogModalProps) {
  const { user } = useAuth();
  const { categories } = useCachedBlogCategories();
  const [submitting, setSubmitting] = React.useState(false);
  const [showAIGenerator, setShowAIGenerator] = React.useState(false);
  const [companies, setCompanies] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingCompanies, setLoadingCompanies] = React.useState(true);
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<BlogFormData>({
    defaultValues: {
      published: false,
      content: '',
      category: '',
      cover_image: '',
      meta_description: '',
      meta_keywords: '',
      focus_keyword: ''
    }
  });
  const content = watch('content');
  const coverImage = watch('cover_image');
  const title = watch('title');

  // Load companies on mount
  React.useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoadingCompanies(true);
      const { data, error } = await supabase
        .from('mlm_companies')
        .select('id, name')
        .eq('status', 'approved')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error loading companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  }

  // Reset form when modal closes or load initial data when opening
  React.useEffect(() => {
    if (!isOpen) {
      reset();
      setShowAIGenerator(false);
    } else if (initialData) {
      // Load initial data if provided (e.g., from AI generator)
      if (initialData.title) setValue('title', initialData.title);
      if (initialData.content) setValue('content', initialData.content);
      if (initialData.meta_description) setValue('meta_description', initialData.meta_description);
      if (initialData.meta_keywords) setValue('meta_keywords', initialData.meta_keywords);
      if (initialData.focus_keyword) setValue('focus_keyword', initialData.focus_keyword);
    }
  }, [isOpen, reset, initialData, setValue]);

  // Handle AI-generated content
  const handleAIGenerated = (title: string, content: string, meta_description?: string, meta_keywords?: string, focus_keyword?: string) => {
    setValue('title', title);
    setValue('content', content);
    if (meta_description) setValue('meta_description', meta_description);
    if (meta_keywords) setValue('meta_keywords', meta_keywords);
    if (focus_keyword) setValue('focus_keyword', focus_keyword);
    setShowAIGenerator(false);
    toast.success('AI-generated content loaded! Complete the form to post your blog.');
  };

  // Helper function to generate slug from title
  const generateSlug = (title: string): string => {
    let slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    slug = slug.replace(/^-+|-+$/g, '');
    return slug;
  };

  // Helper function to award points for blog post creation
  async function awardBlogPostPoints(userId: string) {
    console.log('Awarding points for blog post creation');
    try {
      // Get point value from database
      const { data: activityData, error: activityError } = await supabase
        .from('point_activities')
        .select('points')
        .eq('action', 'blog_post')
        .maybeSingle();

      console.log('Activity data:', { activityData, activityError });

      if (!activityError && activityData && activityData.points > 0) {
        const { error: pointsError, data: pointsResult } = await supabase.rpc('award_points', {
          user_id: userId,
          points_to_award: activityData.points,
          action: 'blog_post'
        });
        
        console.log('Points award result:', { pointsError, pointsResult });
        
        if (pointsError) {
          console.error('Error awarding points for blog post:', pointsError);
        } else {
          console.log(`Successfully awarded ${activityData.points} points for blog post`);
          showPointsNotification(activityData.points, 'Thanks for creating a blog post!');
        }
      } else {
        console.warn('Blog post activity not found or has 0 points:', { activityData, activityError });
        // Fallback: try with default value
        const { error: pointsError } = await supabase.rpc('award_points', {
          user_id: userId,
          points_to_award: 10,
          action: 'blog_post'
        });
        if (pointsError) {
          console.error('Error awarding points with fallback:', pointsError);
        } else {
          showPointsNotification(10, 'Thanks for creating a blog post!');
        }
      }
    } catch (pointsError: any) {
      console.error('Error awarding points for blog post:', pointsError);
      // Don't fail the submission if points fail
    }
  }

  const onSubmit = async (data: BlogFormData) => {
    if (!user) return;
    
    try {
      setSubmitting(true);

      // Generate slug from title
      const slug = generateSlug(data.title);

      // Prepare the data object with only valid fields
      const blogData = {
        author_id: user.id,
        title: data.title,
        content: data.content,
        category: data.category,
        published: data.published,
        cover_image: data.cover_image || null,
        company_id: data.company_id || null,
        slug: slug,
        meta_description: data.meta_description?.trim() || null,
        meta_keywords: data.meta_keywords?.trim() || null,
        focus_keyword: data.focus_keyword?.trim() || null
      };

      const { error, data: insertedData } = await supabase
        .from('blog_posts')
        .insert([blogData])
        .select('id, title, content, category, published, cover_image, slug');

      if (error) {
        // If error is due to duplicate slug, try without slug (let trigger handle it)
        if (error.code === '23505' && error.message.includes('slug')) {
          const { slug: _slug, ...blogDataWithoutSlug } = blogData;
          
          const { error: retryError, data: retryData } = await supabase
            .from('blog_posts')
            .insert([blogDataWithoutSlug])
            .select('id, title, content, category, published, cover_image, slug');
          
          if (retryError) {
            const errorMessage = handleSupabaseError(retryError, 'Error creating blog post');
            throw new Error(errorMessage);
          }
          
          // Use the retry data
          if (retryData && retryData[0]) {
            // Award points for creating a blog post (retry case)
            await awardBlogPostPoints(user.id);
            
            toast.success('Blog post created successfully! (Slug auto-generated)');
            // Trigger sitemap regeneration in background
            if (data.published) {
              triggerSitemapRegeneration().catch(console.error);
            }
            onSuccess();
            onClose();
            return;
          }
        } else {
          const errorMessage = handleSupabaseError(error, 'Error creating blog post');
          throw new Error(errorMessage);
        }
      }

      // Award points for creating a blog post
      await awardBlogPostPoints(user.id);

      toast.success('Blog post created successfully!');
      // Trigger sitemap regeneration in background if published
      if (data.published) {
        triggerSitemapRegeneration().catch(console.error);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating blog post:', error);
      toast.error(error.message || 'Error creating blog post');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 py-4">
          {/* Background overlay */}
          <div 
            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
            onClick={onClose}
          />

          {/* Modal panel */}
          <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Create New Blog Post</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAIGenerator(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate with AI
                  </button>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="px-4 pt-4 pb-4 sm:p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title *</label>
                  <input
                    type="text"
                    {...register("title", { required: "Title is required" })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                  )}
                  {title && (
                    <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-xs text-gray-500 mb-1">Auto-generated URL slug:</p>
                      <p className="text-sm font-mono text-indigo-600">
                        /blog/{generateSlug(title)}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    {...register("category", { required: "Category is required" })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Related Company (Optional)</label>
                  <select
                    {...register("company_id")}
                    disabled={loadingCompanies}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">No Company (General Blog Post)</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select a company if this blog post is related to a specific MLM company
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Content *</label>
                  <RichTextEditor
                    value={content}
                    onChange={(value) => setValue('content', value)}
                    className="min-h-[300px]"
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
                  <ImageUpload
                    bucket="blog-images"
                    folder={`${user?.id}/`}
                    onUpload={(url) => setValue('cover_image', url)}
                    currentImage={coverImage}
                    className="w-full"
                    maxSize="5MB"
                    recommendedSize="1200x630"
                    allowedTypes={["JPG", "PNG", "WEBP"]}
                    required={false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                  <p className="text-xs text-gray-500 mb-2">A brief description for search results (recommended: 150-160 characters)</p>
                  <textarea
                    {...register("meta_description")}
                    rows={3}
                    maxLength={160}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter meta description for search results..."
                  />
                  <p className="mt-1 text-xs text-gray-400">{watch('meta_description')?.length || 0}/160 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
                  <p className="text-xs text-gray-500 mb-2">Comma-separated keywords for SEO</p>
                  <input
                    type="text"
                    {...register("meta_keywords")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keyword</label>
                  <p className="text-xs text-gray-500 mb-2">The main keyword you want to rank for</p>
                  <input
                    type="text"
                    {...register("focus_keyword")}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter focus keyword"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register("published")}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Publish immediately
                  </label>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={submitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Post'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Generator Modal */}
      <AIBlogGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onGenerated={handleAIGenerated}
      />
    </>
  );
}

