'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ImageUpload } from '@/components/ImageUpload';
import { RichTextEditor } from '@/components/RichTextEditor';
import { AIClassifiedGenerator } from '@/components/AIClassifiedGenerator';
import { handleSupabaseError } from '@/lib/supabase';
import { ArrowLeft, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface ClassifiedFormData {
  title: string;
  description: string;
  category: string;
  url: string;
  image_url?: string;
  company_id?: string;
  meta_description?: string;
  meta_keywords?: string;
  focus_keyword?: string;
}

export function NewClassifiedPageContent() {
  const { register, handleSubmit, setValue, watch, setError, clearErrors, formState: { errors } } = useForm<ClassifiedFormData>({
    defaultValues: {
      description: '',
    },
    mode: 'onChange',
  });
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [classifiedCategories, setClassifiedCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [companies, setCompanies] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingCompanies, setLoadingCompanies] = React.useState(true);
  const imageUrl = watch('image_url');
  const [showAIGenerator, setShowAIGenerator] = React.useState(false);
  const [isAIGenerated, setIsAIGenerated] = React.useState(false);
  const isSubmittingRef = React.useRef(false);

  React.useEffect(() => {
    loadClassifiedCategories();
    loadCompanies();
  }, []);

  // Check if data was passed from AI generator via URL params
  React.useEffect(() => {
    const aiGenerated = searchParams.get('aiGenerated') === 'true';
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    const meta_description = searchParams.get('meta_description');
    const meta_keywords = searchParams.get('meta_keywords');
    const focus_keyword = searchParams.get('focus_keyword');

    if (aiGenerated && title && description) {
      setValue('title', decodeURIComponent(title));
      setValue('description', decodeURIComponent(description));
      if (meta_description) setValue('meta_description', decodeURIComponent(meta_description));
      if (meta_keywords) setValue('meta_keywords', decodeURIComponent(meta_keywords));
      if (focus_keyword) setValue('focus_keyword', decodeURIComponent(focus_keyword));
      setIsAIGenerated(true);
      toast.success('AI-generated content loaded! Complete the form to post your classified.');
      // Clean up URL params
      router.replace('/classifieds/new', { scroll: false });
    }
  }, [searchParams, setValue, router]);

  async function loadClassifiedCategories() {
    try {
      const { data, error } = await supabase
        .from('classified_categories')
        .select('id, name')
        .eq('is_active', 1)
        .order('name', { ascending: true });

      if (error) throw error;
      setClassifiedCategories(data || []);
    } catch (error: any) {
      console.error('Error loading classified categories:', error);
    }
  }

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

  const handleAIGenerated = (
    title: string,
    description: string,
    meta_description?: string,
    meta_keywords?: string,
    focus_keyword?: string
  ) => {
    setValue('title', title);
    setValue('description', description);
    if (meta_description) setValue('meta_description', meta_description);
    if (meta_keywords) setValue('meta_keywords', meta_keywords);
    if (focus_keyword) setValue('focus_keyword', focus_keyword);
    setIsAIGenerated(true);
    toast.success('AI-generated content loaded! Complete the form to post your classified.');
  };

  // Helper function to generate slug from title
  const generateSlug = (title: string): string => {
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    slug = slug.replace(/^-+|-+$/g, '');
    return slug;
  };

  // Helper function to award points for classified post creation
  async function awardClassifiedPostPoints(userId: string) {
    console.log('Awarding points for classified post creation');
    try {
      const { data: activityData, error: activityError } = await supabase
        .from('point_activities')
        .select('points')
        .eq('action', 'classified_post')
        .maybeSingle();

      console.log('Activity data:', { activityData, activityError });

      if (!activityError && activityData && activityData.points > 0) {
        const { error: pointsError } = await supabase.rpc('award_points', {
          user_id: userId,
          points_to_award: activityData.points,
          action: 'classified_post',
        });

        if (pointsError) {
          console.error('Error awarding points for classified post:', pointsError);
        } else {
          console.log(`Successfully awarded ${activityData.points} points for classified post`);
          toast.success(`+${activityData.points} points! Thanks for posting a classified ad!`);
        }
      } else {
        console.warn('Classified post activity not found or has 0 points:', { activityData, activityError });
        const { error: pointsError } = await supabase.rpc('award_points', {
          user_id: userId,
          points_to_award: 5,
          action: 'classified_post',
        });
        if (!pointsError) {
          toast.success('+5 points! Thanks for posting a classified ad!');
        }
      }
    } catch (pointsError: any) {
      console.error('Error awarding points for classified post:', pointsError);
    }
  }

  const onSubmit = async (data: ClassifiedFormData) => {
    if (!user) return;

    if (loading || isSubmittingRef.current) {
      return;
    }

    try {
      isSubmittingRef.current = true;
      setLoading(true);

      const slug = generateSlug(data.title);

      const { error, data: insertedData } = await supabase
        .from('classifieds')
        .insert([
          {
            user_id: user.id,
            title: data.title,
            description: data.description,
            category: data.category,
            url: data.url,
            image_url: data.image_url || null,
            slug: slug,
            status: 'active',
            company_id: data.company_id || null,
            meta_description: data.meta_description?.trim() || null,
            meta_keywords: data.meta_keywords?.trim() || null,
            focus_keyword: data.focus_keyword?.trim() || null,
          },
        ])
        .select('id, title, slug');

      if (error) throw error;

      await awardClassifiedPostPoints(user.id);

      if (insertedData && insertedData[0]) {
        const classifiedTitle = insertedData[0].title;
        try {
          await supabase.rpc('create_notification', {
            p_user_id: user.id,
            p_title: 'Classified Posted',
            p_message: `Your classified "${classifiedTitle}" has been posted successfully!`,
          });
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

      toast.success('Classified posted successfully!');
      router.push('/classifieds');
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error posting classified');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-sm overflow-hidden p-6 text-center">
            <p className="text-gray-600 mb-4">Please log in to post a classified.</p>
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <Link
                  href="/classifieds"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  title="Back to Classifieds"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Post New Opportunity</h1>
                  {isAIGenerated && (
                    <div className="flex items-center gap-2 mt-1">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-purple-600 font-medium">AI-Generated Content</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAIGenerator(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate with AI
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <div className="mt-1">
                  <ImageUpload
                    bucket="classified-images"
                    folder={user ? `${user.id}/` : ''}
                    onUpload={(url) => setValue('image_url', url)}
                    currentImage={imageUrl}
                    className="w-full"
                    maxSize="5MB"
                    recommendedSize="800x600"
                    allowedTypes={['JPG', 'PNG', 'WEBP']}
                    required={false}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  {...register('title', {
                    required: 'Title is required',
                    minLength: {
                      value: 10,
                      message: 'Title must be at least 10 characters',
                    },
                    maxLength: {
                      value: 100,
                      message: 'Title must not exceed 100 characters',
                    },
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {errors.title && <p className="mt-2 text-sm text-red-600">{errors.title.message}</p>}
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Select a category</option>
                  {classifiedCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {classifiedCategories.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">No categories available. Please create categories first.</p>
                )}
                {errors.category && <p className="mt-2 text-sm text-red-600">{errors.category.message}</p>}
              </div>

              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                  Website URL
                </label>
                <input
                  type="url"
                  {...register('url', {
                    required: 'Website URL is required',
                    pattern: {
                      value: /^https?:\/\/.+/,
                      message: 'Please enter a valid URL starting with http:// or https://',
                    },
                  })}
                  placeholder="https://example.com"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {errors.url && <p className="mt-2 text-sm text-red-600">{errors.url.message}</p>}
              </div>

              <div>
                <label htmlFor="company_id" className="block text-sm font-medium text-gray-700">
                  Related Company (Optional)
                </label>
                <select
                  {...register('company_id')}
                  disabled={loadingCompanies}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">No Company (General Opportunity)</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select a company if this opportunity is related to a specific MLM company
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <div className="mt-1">
                  <RichTextEditor
                    value={watch('description') || ''}
                    onChange={(value) => {
                      setValue('description', value, { shouldValidate: true });
                      const textContent = value.replace(/<[^>]*>/g, '').trim();
                      if (textContent.length < 50) {
                        setError('description', {
                          type: 'manual',
                          message: 'Description must be at least 50 characters',
                        });
                      } else {
                        clearErrors('description');
                      }
                    }}
                    className="min-h-[300px]"
                  />
                </div>
                {errors.description && <p className="mt-2 text-sm text-red-600">{errors.description.message}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  {watch('description') ? watch('description').replace(/<[^>]*>/g, '').length : 0} characters (minimum
                  50)
                </p>
              </div>

              {/* SEO Fields Section */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">SEO Settings</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Description (for search results)
                  </label>
                  <textarea
                    {...register('meta_description')}
                    rows={3}
                    maxLength={160}
                    placeholder="Brief description of the classified (recommended: 150-160 characters)"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">{watch('meta_description')?.length || 0}/160 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    {...register('meta_keywords')}
                    placeholder="keyword1, keyword2, keyword3"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate keywords with commas</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keyword</label>
                  <input
                    type="text"
                    {...register('focus_keyword')}
                    placeholder="Primary keyword for this classified"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.push('/classifieds')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Posting...' : 'Post Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* AI Generator Modal */}
      <AIClassifiedGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onGenerated={handleAIGenerated}
      />
    </div>
  );
}
