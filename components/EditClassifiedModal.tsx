'use client'

import React from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ImageUpload } from './ImageUpload';
import { RichTextEditor } from './RichTextEditor';
import { handleSupabaseError } from '@/lib/supabase';
import { triggerSitemapRegeneration } from '../lib/sitemap';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface ClassifiedFormData {
  title: string;
  description: string;
  category: string;
  url: string;
  image_url?: string;
  meta_description?: string;
  meta_keywords?: string;
  focus_keyword?: string;
}

interface EditClassifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  classifiedId: string | null;
  onSuccess: () => void;
}

export function EditClassifiedModal({ isOpen, onClose, classifiedId, onSuccess }: EditClassifiedModalProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<ClassifiedFormData>({
    defaultValues: {
      description: ''
    }
  });
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [categories, setCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const imageUrl = watch('image_url');
  const isSubmittingRef = React.useRef(false);

  React.useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (classifiedId) {
        loadClassified(classifiedId);
      }
    } else {
      reset();
    }
  }, [isOpen, classifiedId]);

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from('classified_categories')
        .select('id, name')
        .eq('is_active', 1)
        .order('name');

      if (error) {
        console.warn('Could not load categories from database:', error);
        setCategories([
          { id: 'health', name: 'Health & Wellness' },
          { id: 'beauty', name: 'Beauty' },
          { id: 'finance', name: 'Finance' },
          { id: 'other', name: 'Other' }
        ]);
      } else if (data && data.length > 0) {
        setCategories(data);
      } else {
        setCategories([
          { id: 'health', name: 'Health & Wellness' },
          { id: 'beauty', name: 'Beauty' },
          { id: 'finance', name: 'Finance' },
          { id: 'other', name: 'Other' }
        ]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([
        { id: 'health', name: 'Health & Wellness' },
        { id: 'beauty', name: 'Beauty' },
        { id: 'finance', name: 'Finance' },
        { id: 'other', name: 'Other' }
      ]);
    }
  }

  async function loadClassified(classifiedId: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classifieds')
        .select('*')
        .eq('id', classifiedId)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Classified not found');
        onClose();
        return;
      }

      // Check ownership
      if (data.user_id !== user?.id) {
        toast.error('You do not have permission to edit this classified');
        onClose();
        return;
      }

      // Set form values
      setValue('title', data.title || '');
      setValue('description', data.description || '');
      setValue('category', data.category || '');
      setValue('url', data.url || '');
      setValue('image_url', data.image_url || '');
      setValue('meta_description', data.meta_description || '');
      setValue('meta_keywords', data.meta_keywords || '');
      setValue('focus_keyword', data.focus_keyword || '');
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading classified');
      toast.error(errorMessage);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const generateSlug = (title: string): string => {
    let slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    slug = slug.replace(/^-+|-+$/g, '');
    return slug;
  };

  const onSubmit = async (data: ClassifiedFormData) => {
    if (!user || !classifiedId) return;
    
    if (saving || isSubmittingRef.current) {
      return;
    }

    try {
      isSubmittingRef.current = true;
      setSaving(true);
      
      const slug = generateSlug(data.title);
      
      const { error } = await supabase
        .from('classifieds')
        .update({
          title: data.title.trim(),
          description: data.description,
          category: data.category,
          url: data.url.trim(),
          image_url: data.image_url || null,
          slug: slug,
          meta_description: data.meta_description?.trim() || null,
          meta_keywords: data.meta_keywords?.trim() || null,
          focus_keyword: data.focus_keyword?.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', classifiedId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Classified updated successfully!');
      triggerSitemapRegeneration().catch(console.error);
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating classified');
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      isSubmittingRef.current = false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Edit Classified</h3>
            <button
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 p-2"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                {/* Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">Image</label>
                  <ImageUpload
                    bucket="classified-images"
                    folder={user ? `${user.id}/` : ''}
                    onUpload={(url) => setValue('image_url', url)}
                    currentImage={imageUrl}
                    className="w-full"
                    maxSize="5MB"
                    recommendedSize="800x600"
                    allowedTypes={["JPG", "PNG", "WEBP"]}
                    required={false}
                  />
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    {...register("title", { 
                      required: "Title is required",
                      minLength: {
                        value: 10,
                        message: "Title must be at least 10 characters"
                      },
                      maxLength: {
                        value: 100,
                        message: "Title must not exceed 100 characters"
                      }
                    })}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm sm:text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.title.message}</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Category
                  </label>
                  <select
                    {...register("category", { required: "Category is required" })}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm sm:text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.category.message}</p>
                  )}
                </div>

                {/* URL */}
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    {...register("url", {
                      required: "Website URL is required",
                      pattern: {
                        value: /^https?:\/\/.+/,
                        message: "Please enter a valid URL starting with http:// or https://"
                      }
                    })}
                    placeholder="https://example.com"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm sm:text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.url && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.url.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Description
                  </label>
                  <div className="mt-1">
                    <RichTextEditor
                      value={watch('description') || ''}
                      onChange={(value) => {
                        setValue('description', value, { shouldValidate: true });
                      }}
                      className="min-h-[200px] sm:min-h-[300px]"
                    />
                  </div>
                  {errors.description && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.description.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {watch('description') ? watch('description').replace(/<[^>]*>/g, '').length : 0} characters (minimum 50)
                  </p>
                </div>

                {/* SEO Fields */}
                <div className="border-t pt-4 sm:pt-6 space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">SEO Settings</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Description (for search results)
                    </label>
                    <textarea
                      {...register("meta_description")}
                      rows={3}
                      maxLength={160}
                      placeholder="Brief description of the classified (recommended: 150-160 characters)"
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm sm:text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {watch('meta_description')?.length || 0}/160 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      {...register("meta_keywords")}
                      placeholder="keyword1, keyword2, keyword3"
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm sm:text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Separate keywords with commas
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Focus Keyword
                    </label>
                    <input
                      type="text"
                      {...register("focus_keyword")}
                      placeholder="Primary keyword for this classified"
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm sm:text-base focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-md shadow-sm text-sm sm:text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-transparent rounded-md shadow-sm text-sm sm:text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




















