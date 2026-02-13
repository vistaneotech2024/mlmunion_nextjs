'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Plus, Edit, Trash2, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface PointActivity {
  id: string;
  action: string;
  points: number;
  description: string;
}

export function AdminPointsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [pointActivities, setPointActivities] = React.useState<PointActivity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingActivity, setEditingActivity] = React.useState<PointActivity | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    action: '',
    points: 0,
    description: '',
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
    void loadPointActivities();
  }, [adminChecked]);

  async function loadPointActivities() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('point_activities')
        .select('*')
        .order('action', { ascending: true });

      if (error) throw error;
      setPointActivities((data as PointActivity[]) || []);
    } catch (error: any) {
      console.error('Error loading point activities:', error);
      toast.error('Error loading point activities');
    } finally {
      setLoading(false);
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'points' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingActivity) {
        const { error } = await supabase
          .from('point_activities')
          .update({
            action: formData.action,
            points: formData.points,
            description: formData.description,
          })
          .eq('id', editingActivity.id);

        if (error) throw error;
        toast.success('Point activity updated successfully');
      } else {
        const { error } = await supabase
          .from('point_activities')
          .insert([
            {
              action: formData.action,
              points: formData.points,
              description: formData.description,
            },
          ]);

        if (error) throw error;
        toast.success('Point activity created successfully');
      }

      setShowModal(false);
      void loadPointActivities();
    } catch (error: any) {
      console.error('Error saving point activity:', error);
      toast.error('Error saving point activity');
    }
  };

  const handleEdit = (activity: PointActivity) => {
    setEditingActivity(activity);
    setFormData({
      action: activity.action,
      points: activity.points,
      description: activity.description,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this point activity?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('point_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Point activity deleted successfully');
      void loadPointActivities();
    } catch (error: any) {
      console.error('Error deleting point activity:', error);
      toast.error('Error deleting point activity');
    }
  };

  const handleAddNew = () => {
    setEditingActivity(null);
    setFormData({
      action: '',
      points: 0,
      description: '',
    });
    setShowModal(true);
  };

  const exportToExcel = () => {
    const data = pointActivities.map((activity) => ({
      Action: activity.action,
      Points: activity.points,
      Description: activity.description,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Point Activities');
    XLSX.writeFile(wb, 'point_activities.xlsx');
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
            <h2 className="text-2xl font-bold text-gray-900">Points Management</h2>
            <p className="text-gray-600 mt-1">Configure point values for user activities</p>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleAddNew}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
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

        {/* Warning message */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Important:</strong> Changing point values will affect all users. Points are not retroactively
                adjusted for past activities.
              </p>
            </div>
          </div>
        </div>

        {/* Point Activities Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Activity
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Points
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pointActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{activity.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{activity.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{activity.points}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(activity)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(activity.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pointActivities.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No point activities found. Click &quot;Add Activity&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingActivity ? 'Edit Point Activity' : 'Add Point Activity'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Activity Code</label>
                <input
                  type="text"
                  name="action"
                  value={formData.action}
                  onChange={handleFormChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="blog_post"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use snake_case format (e.g., blog_post, profile_update)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Create a blog post"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Points</label>
                <input
                  type="number"
                  name="points"
                  value={formData.points}
                  onChange={handleFormChange}
                  required
                  min={0}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
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
                  {editingActivity ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

