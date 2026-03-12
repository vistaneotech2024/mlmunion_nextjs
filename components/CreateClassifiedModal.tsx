'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ImageUpload } from '@/components/ImageUpload';
import { RichTextEditor } from '@/components/RichTextEditor';
import { AIClassifiedGenerator } from '@/components/AIClassifiedGenerator';
import { handleSupabaseError } from '@/lib/supabase';
import { generateEnglishSlugFromTitle } from '@/lib/openai';

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

interface CreateClassifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    title?: string;
    description?: string;
    meta_description?: string;
    meta_keywords?: string;
    focus_keyword?: string;
  };
}

export function CreateClassifiedModal({ isOpen, onClose, onSuccess, initialData }: CreateClassifiedModalProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const [showAIGenerator, setShowAIGenerator] = React.useState(false);
  const [classifiedCategories, setClassifiedCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [companies, setCompanies] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingCompanies, setLoadingCompanies] = React.useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
    reset,
  } = useForm<ClassifiedFormData>({
    defaultValues: {
      description: '',
    },
    mode: 'onChange',
  });

  const imageUrl = watch('image_url');

  React.useEffect(() => {
    if (!isOpen) return;
    loadClassifiedCategories();
    loadCompanies();
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    if (!initialData) return;
    if (initialData.title) setValue('title', initialData.title);
    if (initialData.description) setValue('description', initialData.description);
    if (initialData.meta_description) setValue('meta_description', initialData.meta_description);
    if (initialData.meta_keywords) setValue('meta_keywords', initialData.meta_keywords);
    if (initialData.focus_keyword) setValue('focus_keyword', initialData.focus_keyword);
  }, [initialData, isOpen, setValue]);

  React.useEffect(() => {
    if (!isOpen) {
      reset();
      setShowAIGenerator(false);
    }
  }, [isOpen, reset]);

  async function loadClassifiedCategories() {
    try {
      const { data, error } = await supabase
        .from('classified_categories')
        .select('id, name')
        .eq('is_active', 1)
        .order('name', { ascending: true });
      if (error) throw error;
      setClassifiedCategories(data || []);
    } catch (e: any) {
      console.error('Error loading classified categories:', e);
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
    } catch (e: any) {
      console.error('Error loading companies:', e);
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
    setShowAIGenerator(false);
    toast.success('AI-generated content loaded! Complete the form to post your classified.');
  };

  const generateSlugFallback = (title: string): string => {
    const normalized = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x00-\x7F]/g, ' ');
    let slug = normalized
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    slug = slug.replace(/^-+|-+$/g, '');
    return slug || 'classified';
  };

  const generateFinalSlug = async (title: string, metaDescription?: string): Promise<string> => {
    try {
      const aiSlug = await generateEnglishSlugFromTitle(title, metaDescription);
      if (aiSlug) return aiSlug;
    } catch (e) {
      console.error('Error generating AI slug for classified:', e);
    }
    return generateSlugFallback(title);
  };

  async function awardClassifiedPostPoints(userId: string) {
    try {
      const { data: activityData, error: activityError } = await supabase
        .from('point_activities')
        .select('points')
        .eq('action', 'classified_post')
        .maybeSingle();

      if (!activityError && activityData && activityData.points > 0) {
        const { error: pointsError } = await supabase.rpc('award_points', {
          user_id: userId,
          points_to_award: activityData.points,
          action: 'classified_post',
        });
        if (!pointsError) toast.success(`+${activityData.points} points! Thanks for posting a classified ad!`);
        return;
      }

      // fallback
      const { error: pointsError } = await supabase.rpc('award_points', {
        user_id: userId,
        points_to_award: 5,
        action: 'classified_post',
      });
      if (!pointsError) toast.success('+5 points! Thanks for posting a classified ad!');
    } catch (e) {
      console.error('Error awarding points for classified post:', e);
    }
  }

  const onSubmit = async (data: ClassifiedFormData) => {
    if (!user) return;
    if (submitting) return;

    try {
      setSubmitting(true);

      const slug = await generateFinalSlug(data.title, data.meta_description);

      const { error } = await supabase.from('classifieds').insert([
        {
          user_id: user.id,
          title: data.title,
          description: data.description,
          category: data.category,
          url: data.url,
          image_url: data.image_url || null,
          slug,
          status: 'active',
          company_id: data.company_id || null,
          meta_description: data.meta_description?.trim() || null,
          meta_keywords: data.meta_keywords?.trim() || null,
          focus_keyword: data.focus_keyword?.trim() || null,
        },
      ]);
      if (error) throw error;

      await awardClassifiedPostPoints(user.id);
      toast.success('Classified posted successfully!');
      onSuccess();
      onClose();
    } catch (e: any) {
      const msg = handleSupabaseError(e, 'Error posting classified');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white border border-gray-200 shadow-xl rounded-none overflow-hidden p-6">
          <p className="text-gray-700 font-semibold">Please log in to post a classified.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 py-4">
          <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />

          <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Post Free Classified</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAIGenerator(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate with AI
                  </button>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500" aria-label="Close">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-4 pt-4 pb-4 sm:p-6 overflow-y-auto flex-1">
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
                      recommendedSize="1200x630"
                      allowedTypes={['JPG', 'PNG', 'WEBP']}
                      enableCrop
                      cropWidth={1200}
                      cropHeight={630}
                      required={false}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Title *</label>
                  <input
                    type="text"
                    {...register('title', {
                      required: 'Title is required',
                      minLength: { value: 10, message: 'Title must be at least 10 characters' },
                      maxLength: { value: 100, message: 'Title must not exceed 100 characters' },
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    {...register('category', { required: 'Category is required' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a category</option>
                    {classifiedCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Website URL *</label>
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
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.url && <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Related Company (Optional)</label>
                  <select
                    {...register('company_id')}
                    disabled={loadingCompanies}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">No Company (General Opportunity)</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <RichTextEditor
                    value={watch('description') || ''}
                    onChange={(value) => {
                      setValue('description', value, { shouldValidate: true });
                      const textContent = value.replace(/<[^>]*>/g, '').trim();
                      if (textContent.length < 50) {
                        setError('description', { type: 'manual', message: 'Description must be at least 50 characters' });
                      } else {
                        clearErrors('description');
                      }
                    }}
                    className="min-h-[300px]"
                  />
                  {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    {watch('description') ? watch('description').replace(/<[^>]*>/g, '').length : 0} characters (minimum 50)
                  </p>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900">SEO Settings</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                    <textarea
                      {...register('meta_description')}
                      rows={3}
                      maxLength={160}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">{watch('meta_description')?.length || 0}/160 characters</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
                    <input
                      type="text"
                      {...register('meta_keywords')}
                      placeholder="keyword1, keyword2, keyword3"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keyword</label>
                    <input
                      type="text"
                      {...register('focus_keyword')}
                      placeholder="Primary keyword"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={submitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Classified'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <AIClassifiedGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onGenerated={handleAIGenerated}
      />
    </>
  );
}

