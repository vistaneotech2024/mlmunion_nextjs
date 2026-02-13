'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Crown,
  Plus,
  Edit,
  Trash2,
  Save,
  ArrowUp,
  ArrowDown,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface Rank {
  id: string;
  name: string;
  icon: string;
  color: string;
  min_points: number;
  benefits: string[];
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
  '👑',
  '🏆',
  '🥇',
  '🥈',
  '🥉',
  '⭐',
  '🌟',
  '💎',
  '🔥',
  '⚡',
  '🚀',
  '🌈',
  '🎯',
  '🎖️',
  '🏅',
] as const;

export function AdminRanksPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [ranks, setRanks] = React.useState<Rank[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingRank, setEditingRank] = React.useState<Rank | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    icon: '👑',
    color: 'blue',
    min_points: 0,
    benefits: [''],
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
    void loadRanks();
  }, [adminChecked]);

  async function loadRanks() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ranks')
        .select('*')
        .order('min_points', { ascending: true });

      if (error) throw error;
      setRanks((data as Rank[]) || []);
    } catch (error: any) {
      console.error('Error loading ranks:', error);
      toast.error('Error loading ranks');
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

  const handleBenefitChange = (index: number, value: string) => {
    const newBenefits = [...formData.benefits];
    newBenefits[index] = value;
    setFormData((prev) => ({ ...prev, benefits: newBenefits }));
  };

  const addBenefit = () => {
    setFormData((prev) => ({ ...prev, benefits: [...prev.benefits, ''] }));
  };

  const removeBenefit = (index: number) => {
    if (formData.benefits.length <= 1) return;
    const newBenefits = [...formData.benefits];
    newBenefits.splice(index, 1);
    setFormData((prev) => ({ ...prev, benefits: newBenefits }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const filteredBenefits = formData.benefits.filter((benefit) => benefit.trim() !== '');

      if (editingRank) {
        const { error } = await supabase
          .from('ranks')
          .update({
            name: formData.name,
            icon: formData.icon,
            color: formData.color,
            min_points: formData.min_points,
            benefits: filteredBenefits,
            description: formData.description,
            order: formData.order,
          })
          .eq('id', editingRank.id);

        if (error) throw error;
        toast.success('Rank updated successfully');
      } else {
        const { error } = await supabase
          .from('ranks')
          .insert([
            {
              name: formData.name,
              icon: formData.icon,
              color: formData.color,
              min_points: formData.min_points,
              benefits: filteredBenefits,
              description: formData.description,
              order: ranks.length,
            },
          ]);

        if (error) throw error;
        toast.success('Rank created successfully');
      }

      setShowModal(false);
      void loadRanks();
    } catch (error: any) {
      console.error('Error saving rank:', error);
      toast.error('Error saving rank');
    }
  };

  const handleEdit = (rank: Rank) => {
    setEditingRank(rank);
    setFormData({
      name: rank.name,
      icon: rank.icon,
      color: rank.color,
      min_points: rank.min_points,
      benefits: rank.benefits.length > 0 ? rank.benefits : [''],
      description: rank.description,
      order: rank.order,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this rank?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ranks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Rank deleted successfully');
      void loadRanks();
    } catch (error: any) {
      console.error('Error deleting rank:', error);
      toast.error('Error deleting rank');
    }
  };

  const handleAddNew = () => {
    setEditingRank(null);
    setFormData({
      name: '',
      icon: '👑',
      color: 'blue',
      min_points: 0,
      benefits: [''],
      description: '',
      order: ranks.length,
    });
    setShowModal(true);
  };

  const handleMoveOrder = async (rank: Rank, direction: 'up' | 'down') => {
    const currentIndex = ranks.findIndex((r) => r.id === rank.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= ranks.length) return;

    try {
      const otherRank = ranks[newIndex];

      await Promise.all([
        supabase
          .from('ranks')
          .update({ order: otherRank.order })
          .eq('id', rank.id),
        supabase
          .from('ranks')
          .update({ order: rank.order })
          .eq('id', otherRank.id),
      ]);

      toast.success('Rank order updated');
      void loadRanks();
    } catch (error: any) {
      console.error('Error updating rank order:', error);
      toast.error('Error updating rank order');
    }
  };

  const exportToExcel = () => {
    const data = ranks.map((rank) => ({
      Name: rank.name,
      Icon: rank.icon,
      Color: rank.color,
      'Minimum Points': rank.min_points,
      Benefits: rank.benefits.join(', '),
      Description: rank.description,
      Order: rank.order,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ranks');
    XLSX.writeFile(wb, 'ranks.xlsx');
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
            <h2 className="text-2xl font-bold text-gray-900">Ranks Management</h2>
            <p className="text-gray-600 mt-1">Configure user ranks and their benefits</p>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleAddNew}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rank
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

        {/* Ranks List */}
        <div className="space-y-6">
          {ranks.map((rank) => (
            <div key={rank.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-4">
                    <div
                      className={`flex items-center justify-center h-12 w-12 rounded-full bg-${rank.color}-100 text-${rank.color}-600 text-2xl`}
                    >
                      {rank.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{rank.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{rank.min_points} points required</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(rank, 'up')}
                      disabled={ranks.indexOf(rank) === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(rank, 'down')}
                      disabled={ranks.indexOf(rank) === ranks.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 mt-4">{rank.description}</p>

                {rank.benefits && rank.benefits.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Benefits:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {rank.benefits.map((benefit, index) => (
                        <li key={index} className="text-gray-600">
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    type="button"
                    onClick={() => handleEdit(rank)}
                    className="p-2 text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rank.id)}
                    className="p-2 text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {ranks.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No ranks found</h3>
            <p className="text-gray-500 mb-4">Create ranks to recognize user achievements</p>
            <button
              type="button"
              onClick={handleAddNew}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Rank
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingRank ? 'Edit Rank' : 'Add Rank'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Rank Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Bronze"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Icon</label>
                <div className="mt-1 grid grid-cols-5 gap-2">
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
                  rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Description of this rank and how to achieve it"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Benefits</label>
                  <button
                    type="button"
                    onClick={addBenefit}
                    className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add Benefit
                  </button>
                </div>
                <div className="mt-1 space-y-2">
                  {formData.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) => handleBenefitChange(index, e.target.value)}
                        className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        placeholder={`Benefit ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeBenefit(index)}
                        disabled={formData.benefits.length <= 1}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        <MinusCircle className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
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
                  {editingRank ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

