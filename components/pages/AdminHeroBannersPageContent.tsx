'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ImageUpload } from '@/components/ImageUpload';
import { Plus, ArrowUp, ArrowDown, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface HeroBanner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  cta_text: string;
  cta_link: string;
  active: boolean;
  order: number;
}

export function AdminHeroBannersPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [banners, setBanners] = React.useState<HeroBanner[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingBanner, setEditingBanner] = React.useState<HeroBanner | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [tempImageUrl, setTempImageUrl] = React.useState<string>('');
  const [adminChecked, setAdminChecked] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || authLoading) return;
    if (!user) {
      router.replace('/admin/login');
      return;
    }
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
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
    if (adminChecked) loadBanners();
  }, [adminChecked]);

  React.useEffect(() => {
    if (editingBanner) {
      setTempImageUrl(editingBanner.image_url);
    } else {
      setTempImageUrl('');
    }
  }, [editingBanner]);

  async function loadBanners() {
    try {
      const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error('Error loading banners:', error);
      toast.error('Error loading banners');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const bannerData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        cta_text: formData.get('cta_text') as string,
        cta_link: formData.get('cta_link') as string,
        active: true,
        order: editingBanner ? editingBanner.order : banners.length,
        image_url: tempImageUrl || editingBanner?.image_url,
      };

      if (!editingBanner && !bannerData.image_url) {
        toast.error('Please upload an image');
        return;
      }

      if (editingBanner) {
        const { error } = await supabase
          .from('hero_banners')
          .update(bannerData)
          .eq('id', editingBanner.id);

        if (error) throw error;
        toast.success('Banner updated successfully');
      } else {
        const { error } = await supabase.from('hero_banners').insert([bannerData]);

        if (error) throw error;
        toast.success('Banner created successfully');
      }

      setShowModal(false);
      setEditingBanner(null);
      setTempImageUrl('');
      loadBanners();
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Error saving banner');
    }
  };

  const toggleActive = async (banner: HeroBanner) => {
    try {
      const { error } = await supabase
        .from('hero_banners')
        .update({ active: !banner.active })
        .eq('id', banner.id);

      if (error) throw error;
      toast.success(`Banner ${banner.active ? 'deactivated' : 'activated'}`);
      loadBanners();
    } catch (error) {
      console.error('Error toggling banner:', error);
      toast.error('Error updating banner');
    }
  };

  const deleteBanner = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;

    try {
      const { error } = await supabase.from('hero_banners').delete().eq('id', id);

      if (error) throw error;
      toast.success('Banner deleted successfully');
      loadBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error('Error deleting banner');
    }
  };

  const moveOrder = async (banner: HeroBanner, direction: 'up' | 'down') => {
    const currentIndex = banners.findIndex((b) => b.id === banner.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= banners.length) return;

    try {
      const otherBanner = banners[newIndex];
      await Promise.all([
        supabase.from('hero_banners').update({ order: otherBanner.order }).eq('id', banner.id),
        supabase.from('hero_banners').update({ order: banner.order }).eq('id', otherBanner.id),
      ]);
      toast.success('Banner order updated');
      loadBanners();
    } catch (error) {
      console.error('Error updating banner order:', error);
      toast.error('Error updating banner order');
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
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
          <h2 className="text-2xl font-bold text-gray-900">Manage Hero Banners</h2>
          <button
            onClick={() => {
              setEditingBanner(null);
              setTempImageUrl('');
              setShowModal(true);
            }}
            className="inline-flex items-center px-5 py-3 md:px-4 md:py-2 border border-transparent rounded-md shadow-sm text-base md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-6 w-6 md:h-4 md:w-4 mr-2" />
            Add Banner
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-20 h-14 md:w-24 md:h-16 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base md:text-lg font-medium text-gray-900 break-words">
                      {banner.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{banner.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto justify-end md:justify-start">
                  <button
                    onClick={() => moveOrder(banner, 'up')}
                    disabled={banners.indexOf(banner) === 0}
                    className="p-3 md:p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 rounded-full hover:bg-gray-100 transition-colors"
                    title="Move Up"
                  >
                    <ArrowUp className="h-6 w-6 md:h-5 md:w-5" />
                  </button>
                  <button
                    onClick={() => moveOrder(banner, 'down')}
                    disabled={banners.indexOf(banner) === banners.length - 1}
                    className="p-3 md:p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 rounded-full hover:bg-gray-100 transition-colors"
                    title="Move Down"
                  >
                    <ArrowDown className="h-6 w-6 md:h-5 md:w-5" />
                  </button>
                  <button
                    onClick={() => toggleActive(banner)}
                    className={`p-3 md:p-2 rounded-full transition-colors ${
                      banner.active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={banner.active ? 'Deactivate' : 'Activate'}
                  >
                    {banner.active ? (
                      <Eye className="h-6 w-6 md:h-5 md:w-5" />
                    ) : (
                      <EyeOff className="h-6 w-6 md:h-5 md:w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditingBanner(banner);
                      setShowModal(true);
                    }}
                    className="p-3 md:p-2 text-blue-600 hover:text-blue-700 rounded-full hover:bg-blue-50 transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-6 w-6 md:h-5 md:w-5" />
                  </button>
                  <button
                    onClick={() => deleteBanner(banner.id)}
                    className="p-3 md:p-2 text-red-600 hover:text-red-700 rounded-full hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-6 w-6 md:h-5 md:w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-5 md:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl md:text-lg font-semibold mb-4">
              {editingBanner ? 'Edit Banner' : 'Create Banner'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-base md:text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingBanner?.title}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 md:p-2 text-base md:text-sm"
                />
              </div>

              <div>
                <label className="block text-base md:text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={editingBanner?.description}
                  required
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 md:p-2 text-base md:text-sm"
                />
              </div>

              <div>
                <label className="block text-base md:text-sm font-medium text-gray-700 mb-1">
                  Banner Image
                </label>
                {editingBanner?.image_url && (
                  <div className="mt-2 mb-4">
                    <p className="text-base md:text-sm text-gray-500 mb-2">Current image:</p>
                    <img
                      src={editingBanner.image_url}
                      alt="Current banner"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                <ImageUpload
                  bucket="hero-banners"
                  onUpload={setTempImageUrl}
                  currentImage={tempImageUrl}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base md:text-sm font-medium text-gray-700 mb-1">
                    CTA Text
                  </label>
                  <input
                    type="text"
                    name="cta_text"
                    defaultValue={editingBanner?.cta_text}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 md:p-2 text-base md:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-base md:text-sm font-medium text-gray-700 mb-1">
                    CTA Link
                  </label>
                  <input
                    type="text"
                    name="cta_link"
                    defaultValue={editingBanner?.cta_link}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 md:p-2 text-base md:text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 sticky bottom-0 bg-white pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBanner(null);
                    setTempImageUrl('');
                  }}
                  className="w-full sm:w-auto px-5 py-3 md:px-4 md:py-2 border border-gray-300 rounded-md text-base md:text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-3 md:px-4 md:py-2 border border-transparent rounded-md shadow-sm text-base md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingBanner ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
