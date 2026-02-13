'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ImageUpload } from '@/components/ImageUpload';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { triggerSitemapRegeneration } from '@/lib/sitemap';
import { useAuth } from '@/contexts/AuthContext';

interface BlogCategory {
  id: string;
  name: string;
  is_active: number;
}

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

function generateSlug(title: string): string {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  slug = slug.replace(/^-+|-+$/g, '');
  return slug;
}

export function AdminEditBlogPageContent() {
  const params = useParams<{ id: string }>();
  const blogId = params?.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [adminChecked, setAdminChecked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [blogCategories, setBlogCategories] = React.useState<BlogCategory[]>([]);
  const [companies, setCompanies] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingCompanies, setLoadingCompanies] = React.useState(true);
  const [originalTitle, setOriginalTitle] = React.useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BlogFormData>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      content: '',
      category: '',
      published: false,
      cover_image: '',
      company_id: '',
      meta_description: '',
      meta_keywords: '',
      focus_keyword: '',
    },
  });

  const content = watch('content');
  const coverImage = watch('cover_image');
  const currentTitle = watch('title');

  // Admin check
  React.useEffect(() => {
    if (typeof window === 'undefined' || authLoading) return;
    if (!user) {
      router.replace('/admin/login');
      return;
    }
    void (async () => {
      try {
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
        if (!(data as { is_admin?: boolean } | null)?.is_admin) {
          router.replace('/admin/login');
          return;
        }
        setAdminChecked(true);
      } catch {
        router.replace('/admin/login');
      }
    })();
  }, [user, authLoading, router]);

  // Register content for validation
  React.useEffect(() => {
    register('content', {
      required: 'Content is required',
      validate: (value) => {
        if (!value || !value.trim() || value === '<p></p>' || value === '<br>') return 'Content is required';
        const text = value.replace(/<[^>]*>/g, '').trim();
        if (!text) return 'Content is required';
        return true;
      },
    });
  }, [register]);

  React.useEffect(() => {
    if (!adminChecked) return;
    loadBlogCategories();
    loadCompanies();
  }, [adminChecked]);

  React.useEffect(() => {
    if (!adminChecked) return;
    if (!blogId) return;
    loadBlog(blogId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminChecked, blogId]);

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

  async function loadBlogCategories() {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('id, name, is_active')
        .eq('is_active', 1)
        .order('name', { ascending: true });

      if (error) throw error;
      setBlogCategories(data || []);
    } catch (error: any) {
      console.error('Error loading blog categories:', error);
    }
  }

  async function loadBlog(id: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).single();
      if (error) throw error;

      setOriginalTitle(data?.title || '');
      setValue('title', data?.title || '');
      setValue('content', data?.content || '');
      setValue('category', data?.category || '');
      setValue('published', !!data?.published);
      setValue('cover_image', data?.cover_image || '');
      setValue('company_id', data?.company_id || '');
      setValue('meta_description', data?.meta_description || '');
      setValue('meta_keywords', data?.meta_keywords || '');
      setValue('focus_keyword', data?.focus_keyword || '');
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading blog post');
      toast.error(errorMessage);
      router.push('/admin/blogs');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: BlogFormData) => {
    if (!blogId) {
      toast.error('Blog post ID is missing');
      return;
    }

    if (!data.title || !data.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!data.category) {
      toast.error('Category is required');
      return;
    }
    const contentText = data.content ? data.content.replace(/<[^>]*>/g, '').trim() : '';
    if (!data.content || !data.content.trim() || !contentText) {
      toast.error('Content is required');
      return;
    }

    try {
      setLoading(true);

      const trimmedTitle = data.title.trim();
      const updateData: any = {
        title: trimmedTitle,
        content: data.content,
        category: data.category || null,
        published: data.published,
        cover_image: data.cover_image || null,
        company_id: data.company_id || null,
        meta_description: data.meta_description?.trim() || null,
        meta_keywords: data.meta_keywords?.trim() || null,
        focus_keyword: data.focus_keyword?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // If title changed, regenerate slug (ensure unique)
      if (trimmedTitle !== originalTitle) {
        let newSlug = generateSlug(trimmedTitle);

        const { data: existingBlog, error: slugError } = await supabase
          .from('blog_posts')
          .select('id')
          .eq('slug', newSlug)
          .neq('id', blogId)
          .maybeSingle();
        if (slugError) throw slugError;

        if (existingBlog) {
          let counter = 1;
          let uniqueSlug = `${newSlug}-${counter}`;
          while (true) {
            const { data: checkBlog, error: checkError } = await supabase
              .from('blog_posts')
              .select('id')
              .eq('slug', uniqueSlug)
              .neq('id', blogId)
              .maybeSingle();
            if (checkError) throw checkError;
            if (!checkBlog) break;
            counter++;
            uniqueSlug = `${newSlug}-${counter}`;
          }
          newSlug = uniqueSlug;
        }

        updateData.slug = newSlug;
      }

      const { error } = await supabase.from('blog_posts').update(updateData).eq('id', blogId);
      if (error) throw error;

      toast.success('Blog post updated successfully');
      if (data.published) triggerSitemapRegeneration().catch(console.error);
      router.push('/admin/blogs');
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating blog post');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!adminChecked && (authLoading || !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }
  if (!adminChecked) return null;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => router.push('/admin/blogs')}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Blogs
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Edit Blog Post</h1>
            {currentTitle ? (
              <p className="mt-2 text-sm text-gray-600">
                URL slug preview: <span className="font-mono text-indigo-700">/blog/{generateSlug(currentTitle)}</span>
              </p>
            ) : null}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                {...register('title', { required: 'Title is required' })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category *</label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Category</option>
                  {blogCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Company (optional)</label>
                <select
                  {...register('company_id')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loadingCompanies}
                >
                  <option value="">{loadingCompanies ? 'Loading companies...' : 'Select Company'}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
              <ImageUpload
                bucket="blog-images"
                folder={`admin/blogs/${blogId}/`}
                onUpload={(url) => setValue('cover_image', url)}
                currentImage={coverImage || undefined}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Meta Description</label>
                <textarea
                  {...register('meta_description')}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Focus Keyword</label>
                <input
                  type="text"
                  {...register('focus_keyword')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Meta Keywords</label>
              <input
                type="text"
                {...register('meta_keywords')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">Comma separated keywords.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Content *</label>
              <RichTextEditor
                value={content}
                onChange={(value) => setValue('content', value)}
                className="min-h-[320px]"
              />
              {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center">
                <input type="checkbox" {...register('published')} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                <span className="ml-2 text-sm text-gray-700">Published</span>
              </label>

              <div className="flex items-center gap-3">
                <Link
                  href="/admin/blogs"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

