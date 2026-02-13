'use client'

import React from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RichTextEditor } from './RichTextEditor';
import { ImageUpload } from './ImageUpload';
import { handleSupabaseError } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useCachedBlogCategories } from '../hooks/useCachedBlogCategories';

interface BlogFormData {
  title: string;
  content: string;
  category: string;
  published: boolean;
  cover_image: string;
  meta_description: string;
  meta_keywords: string;
  focus_keyword: string;
}

interface EditBlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  blogId: string;
  onSuccess: () => void;
}

export function EditBlogModal({ isOpen, onClose, blogId, onSuccess }: EditBlogModalProps) {
  const { user } = useAuth();
  const { categories } = useCachedBlogCategories();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
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

  // Load blog data when modal opens
  React.useEffect(() => {
    if (isOpen && blogId && user) {
      loadBlog();
    } else if (!isOpen) {
      // Reset form when modal closes
      reset();
    }
  }, [isOpen, blogId, user]);

  async function loadBlog() {
    if (!user || !blogId) return;

    try {
      setLoading(true);
      
      // Try to load by id (most common case)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let query = supabase
        .from('blog_posts')
        .select('*')
        .eq('id', blogId)
        .maybeSingle();

      // If not a UUID, try as slug
      if (!uuidPattern.test(blogId)) {
        query = supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', blogId)
          .maybeSingle();
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (!data) {
        toast.error('Blog post not found');
        onClose();
        return;
      }

      // Check if user owns this blog post
      if (data.author_id !== user.id) {
        toast.error('You can only edit your own blog posts');
        onClose();
        return;
      }

      // Set form values
      setValue('title', data.title || '');
      setValue('content', data.content || '');
      setValue('category', data.category || '');
      setValue('published', data.published || false);
      setValue('cover_image', data.cover_image || '');
      setValue('meta_description', data.meta_description || '');
      setValue('meta_keywords', data.meta_keywords || '');
      setValue('focus_keyword', data.focus_keyword || '');
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading blog post');
      toast.error(errorMessage);
      onClose();
    } finally {
      setLoading(false);
    }
  }

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

  const onSubmit = async (data: BlogFormData) => {
    if (!blogId || !user) return;

    try {
      setSaving(true);
      
      // Generate slug from title
      const newSlug = generateSlug(data.title);
      
      const updateData = {
        title: data.title,
        content: data.content,
        category: data.category,
        published: data.published,
        cover_image: data.cover_image || null,
        slug: newSlug, // Update slug when title changes
        meta_description: data.meta_description || null,
        meta_keywords: data.meta_keywords || null,
        focus_keyword: data.focus_keyword || null
      };

      const { error } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', blogId)
        .eq('author_id', user.id); // Ensure user owns the blog

      if (error) throw error;

      toast.success('Blog post updated successfully');
      onSuccess(); // Refresh the list
      onClose();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating blog post');
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
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
              <h3 className="text-lg font-medium text-gray-900">Edit Blog Post</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="px-4 pt-4 pb-4 sm:p-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
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
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 flex-shrink-0">
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={loading || saving}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

