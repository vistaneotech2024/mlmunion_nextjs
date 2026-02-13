'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Medal, Plus, Edit, Trash2, Save, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  min_points: number;
  description: string;
  order: number;
}

const colorOptions = [
  { value: 'gray', label: 'Gray' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'red', label: 'Red' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'purple', label: 'Purple' },
  { value: 'pink', label: 'Pink' },
] as const;

const iconOptions = [
  '🏆',
  '🥇',
  '🥈',
  '🥉',
  '⭐',
  '🌟',
  '🔥',
  '💎',
  '👑',
  '🎖️',
  '🏅',
  '🎯',
  '🚀',
  '⚡',
  '🌱',
  '🌿',
  '🌳',
] as const;

export function AdminBadgesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [badges, setBadges] = React.useState<Badge[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingBadge, setEditingBadge] = React.useState<Badge | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    icon: '🏆',
    color: 'blue',
    min_points: 0,
    description: '',
    order: 0,
  });
  const [adminChecked, setAdminChecked] = React.useState(false);

  // Admin guard
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
    void loadBadges();
  }, [adminChecked]);

  async function loadBadges() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('min_points', { ascending: true });

      if (error) throw error;
      setBadges((data as Badge[]) || []);
    } catch (error: any) {
      console.error('Error loading badges:', error);
      toast.error('Error loading badges');
    } finally {
      setLoading(false);
    }
  }

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'min_points' || name === 'order' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingBadge) {
        const { error } = await supabase
          .from('badges')
          .update({
            name: formData.name,
            icon: formData.icon,
            color: formData.color,
            min_points: formData.min_points,
            description: formData.description,
            order: formData.order,
          })
          .eq('id', editingBadge.id);

        if (error) throw error;
        toast.success('Badge updated successfully');
      } else {
        const { error } = await supabase
          .from('badges')
          .insert([
            {
              name: formData.name,
              icon: formData.icon,
              color: formData.color,
              min_points: formData.min_points,
              description: formData.description,
              order: badges.length,
            },
          ]);

        if (error) throw error;
        toast.success('Badge created successfully');
      }

      setShowModal(false);
      void loadBadges();
    } catch (error: any) {
      console.error('Error saving badge:', error);
      toast.error('Error saving badge');
    }
  };

  const handleEdit = (badge: Badge) => {
    setEditingBadge(badge);
    setFormData({
      name: badge.name,
      icon: badge.icon,
      color: badge.color,
      min_points: badge.min_points,
      description: badge.description,
      order: badge.order,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this badge?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Badge deleted successfully');
      void loadBadges();
    } catch (error: any) {
      console.error('Error deleting badge:', error);
      toast.error('Error deleting badge');
    }
  };

  const handleAddNew = () => {
    setEditingBadge(null);
    setFormData({
      name: '',
      icon: '🏆',
      color: 'blue',
      min_points: 0,
      description: '',
      order: badges.length,
    });
    setShowModal(true);
  };

  const handleMoveOrder = async (badge: Badge, direction: 'up' | 'down') => {
    const currentIndex = badges.findIndex((b) => b.id === badge.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= badges.length) return;

    try {
      const otherBadge = badges[newIndex];

      await Promise.all([
        supabase
          .from('badges')
          .update({ order: otherBadge.order })
          .eq('id', badge.id),
        supabase
          .from('badges')
          .update({ order: badge.order })
          .eq('id', otherBadge.id),
      ]);

      toast.success('Badge order updated');
      void loadBadges();
    } catch (error: any) {
      console.error('Error updating badge order:', error);
      toast.error('Error updating badge order');
    }
  };

  const exportToExcel = () => {
    const data = badges.map((badge) => ({
      Name: badge.name,
      Icon: badge.icon,
      Color: badge.color,
      'Minimum Points': badge.min_points,
      Description: badge.description,
      Order: badge.order,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Badges');
    XLSX.writeFile(wb, 'badges.xlsx');
  };

  if (!adminChecked && (authLoading || !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!adminChecked) {
    return null;
  }

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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Badges Management</h2>
            <p className="text-gray-600 mt-1">Configure badges that users can earn based on points</p>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleAddNew}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Badge
            </button>
            <button
              type="button"
              onClick={exportToExcel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Export to Excel
            </button>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge) => (
            <div key={badge.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center h-10 w-10 rounded-full bg-${badge.color}-100 text-${badge.color}-600 text-xl`}
                    >
                      {badge.icon}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{badge.name}</h3>
                      <p className="text-sm text-gray-500">{badge.min_points} points required</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(badge, 'up')}
                      disabled={badges.indexOf(badge) === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(badge, 'down')}
                      disabled={badges.indexOf(badge) === badges.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{badge.description}</p>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(badge)}
                    className="p-2 text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(badge.id)}
                    className="p-2 text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {badges.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Medal className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No badges found</h3>
            <p className="text-gray-500 mb-4">Create badges to reward users for their activities</p>
            <button
              type="button"
              onClick={handleAddNew}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Badge
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingBadge ? 'Edit Badge' : 'Add Badge'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Badge Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Newcomer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Icon</label>
                <div className="mt-1 grid grid-cols-6 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                      className={`h-10 w-10 flex items-center justify-center text-xl rounded-md ${
                        formData.icon === icon
                          ? `bg-${formData.color}-100 border-2 border-${formData.color}-500`
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Color</label>
                <select
                  name="color"
                  value={formData.color}
                  onChange={handleFormChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  {colorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center space-x-2">
                  <div className={`h-6 w-6 rounded-full bg-${formData.color}-500`} />
                  <span className="text-sm text-gray-500">Selected color</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Points Required</label>
                <input
                  type="number"
                  name="min_points"
                  value={formData.min_points}
                  onChange={handleFormChange}
                  required
                  min={0}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Description of this badge and how to earn it"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4 mr-2 inline" />
                  {editingBadge ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

