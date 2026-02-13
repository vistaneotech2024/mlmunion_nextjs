'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ImageUpload } from '@/components/ImageUpload';
import { RichTextEditor } from '@/components/RichTextEditor';

interface ClassifiedFormData {
  title: string;
  description: string;
  category: string;
  status: string;
  is_premium: boolean;
  image_url?: string;
  url?: string;
  company_id?: string;
  meta_description?: string;
  meta_keywords?: string;
  focus_keyword?: string;
}

export function AdminEditClassifiedPageContent() {
  const params = useParams<{ id: string }>();
  const classifiedId = params?.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [adminChecked, setAdminChecked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [classifiedCategories, setClassifiedCategories] = React.useState<Array<{ id: string; name: string }>>(
    []
  );
  const [companies, setCompanies] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingCompanies, setLoadingCompanies] = React.useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClassifiedFormData>({
    defaultValues: {
      description: '',
      status: 'active',
      is_premium: false,
    },
  });
  const imageUrl = watch('image_url');
  const description = watch('description');

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

  React.useEffect(() => {
    if (!adminChecked) return;
    loadClassifiedCategories();
    loadCompanies();
  }, [adminChecked]);

  React.useEffect(() => {
    if (!adminChecked) return;
    if (!classifiedId) return;
    loadClassified(classifiedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminChecked, classifiedId]);

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

  async function loadClassified(id: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('classifieds').select('*').eq('id', id).single();

      if (error) throw error;
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          setValue(key as keyof ClassifiedFormData, value as any);
        });
      }
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading classified');
      toast.error(errorMessage);
      router.push('/admin/classifieds');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: ClassifiedFormData) => {
    if (!classifiedId) {
      toast.error('Classified ID is missing');
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
    const plainDescription = data.description ? data.description.replace(/<[^>]*>/g, '').trim() : '';
    if (!data.description || !data.description.trim() || !plainDescription) {
      toast.error('Description is required');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('classifieds')
        .update({
          title: data.title.trim(),
          description: data.description,
          category: data.category,
          status: data.status,
          is_premium: data.is_premium,
          image_url: data.image_url || null,
          url: data.url || null,
          company_id: data.company_id || null,
          meta_description: data.meta_description?.trim() || null,
          meta_keywords: data.meta_keywords?.trim() || null,
          focus_keyword: data.focus_keyword?.trim() || null,
        })
        .eq('id', classifiedId);

      if (error) throw error;

      toast.success('Classified updated successfully');
      router.push('/admin/classifieds');
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating classified');
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => router.push('/admin/classifieds')}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Classifieds
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Edit Classified</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
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
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                {...register('title', { required: 'Title is required' })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <RichTextEditor
                value={description || ''}
                onChange={(value) => setValue('description', value, { shouldValidate: true })}
                className="min-h-[300px]"
              />
              {errors.description && (
                <p className="mt-2 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Website URL</label>
              <input
                type="url"
                {...register('url')}
                placeholder="https://example.com"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
              {errors.url && <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Related Company (Optional)</label>
              <select
                {...register('company_id')}
                disabled={loadingCompanies}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">Select Category</option>
                  {classifiedCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                )}
                {classifiedCategories.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    No categories available. Please create categories first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  {...register('status', { required: 'Status is required' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  {...register('is_premium')}
                  className="h-4 w-4 text-yellow-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Mark as Premium</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Meta Description</label>
              <textarea
                {...register('meta_description')}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Meta Keywords</label>
                <input
                  type="text"
                  {...register('meta_keywords')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Comma separated"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Focus Keyword</label>
                <input
                  type="text"
                  {...register('focus_keyword')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/admin/classifieds')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

