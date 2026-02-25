'use client';

import React from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Trash2, Calendar, Briefcase, FileText, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface Experience {
  id?: string;
  user_id: string;
  title: string;
  company?: string;
  description?: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ExperienceManagementProps {
  userId: string;
  isEditable?: boolean;
}

export function ExperienceManagement({ userId, isEditable = true }: ExperienceManagementProps) {
  const [experiences, setExperiences] = React.useState<Experience[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [formData, setFormData] = React.useState<Omit<Experience, 'id' | 'user_id' | 'created_at' | 'updated_at'>>({
    title: '',
    company: '',
    description: '',
    start_date: '',
    end_date: null,
    is_current: false,
  });

  React.useEffect(() => {
    if (userId) {
      loadExperiences();
    }
  }, [userId]);

  async function loadExperiences() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_experiences')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setExperiences(data || []);
    } catch (error: any) {
      console.error('Error loading experiences:', error);
      toast.error('Error loading experiences');
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      company: '',
      description: '',
      start_date: '',
      end_date: null,
      is_current: false,
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  // Helper function to convert YYYY-MM-DD format to YYYY-MM format for month input
  const convertDateToMonth = (dateValue: string): string => {
    if (!dateValue) return '';
    // If already in YYYY-MM format, return as is
    if (dateValue.match(/^\d{4}-\d{2}$/)) {
      return dateValue;
    }
    // Convert YYYY-MM-DD to YYYY-MM
    return dateValue.substring(0, 7);
  };

  const handleEdit = (experience: Experience) => {
    setFormData({
      title: experience.title,
      company: experience.company || '',
      description: experience.description || '',
      start_date: convertDateToMonth(experience.start_date),
      end_date: experience.end_date ? convertDateToMonth(experience.end_date) : null,
      is_current: experience.is_current,
    });
    setEditingId(experience.id || null);
    setShowAddForm(true);
  };

  // Helper function to convert YYYY-MM format to YYYY-MM-01 (first day of month)
  const convertMonthToDate = (monthValue: string): string => {
    if (!monthValue) return '';
    // If already in YYYY-MM-DD format, return as is
    if (monthValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return monthValue;
    }
    // Convert YYYY-MM to YYYY-MM-01
    return `${monthValue}-01`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.start_date) {
      toast.error('Start date is required');
      return;
    }

    if (!formData.is_current && !formData.end_date) {
      toast.error('End date is required if not current position');
      return;
    }

    // Convert month inputs to proper date format
    const startDate = convertMonthToDate(formData.start_date);
    const endDate = formData.end_date ? convertMonthToDate(formData.end_date) : null;

    if (endDate && startDate > endDate) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      if (editingId) {
        // Update existing experience
        const { error } = await supabase
          .from('user_experiences')
          .update({
            title: formData.title.trim(),
            company: formData.company?.trim() || null,
            description: formData.description?.trim() || null,
            start_date: startDate,
            end_date: formData.is_current ? null : endDate,
            is_current: formData.is_current,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)
          .eq('user_id', userId);

        if (error) throw error;
        toast.success('Experience updated successfully');
      } else {
        // Create new experience
        const { error } = await supabase.from('user_experiences').insert([
          {
            user_id: userId,
            title: formData.title.trim(),
            company: formData.company?.trim() || null,
            description: formData.description?.trim() || null,
            start_date: startDate,
            end_date: formData.is_current ? null : endDate,
            is_current: formData.is_current,
          },
        ]);

        if (error) throw error;
        toast.success('Experience added successfully');
      }

      resetForm();
      loadExperiences();
    } catch (error: any) {
      console.error('Error saving experience:', error);
      const errorMessage = error.message || 'Error saving experience';
      if (error.message?.includes('relation "user_experiences" does not exist')) {
        toast.error('Database table not found. Please run the migration: 20260220154933_create_user_experiences.sql');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this experience?')) return;

    try {
      const { error } = await supabase.from('user_experiences').delete().eq('id', id).eq('user_id', userId);

      if (error) throw error;
      toast.success('Experience deleted successfully');
      loadExperiences();
    } catch (error: any) {
      console.error('Error deleting experience:', error);
      toast.error('Error deleting experience');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const getYear = (dateString: string): number => {
    return new Date(dateString).getFullYear();
  };

  const getDuration = (start: string, end: string | null | undefined, isCurrent: boolean) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const years = endDate.getFullYear() - startDate.getFullYear();
    const months = endDate.getMonth() - startDate.getMonth();
    let totalMonths = years * 12 + months;
    if (totalMonths < 0) totalMonths = 0;

    if (totalMonths < 12) {
      return `${totalMonths} ${totalMonths === 1 ? 'month' : 'months'}`;
    } else {
      const years = Math.floor(totalMonths / 12);
      const remainingMonths = totalMonths % 12;
      if (remainingMonths === 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}`;
      }
      return `${years} ${years === 1 ? 'year' : 'years'} ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
    }
  };

  // Group experiences by start year
  const groupExperiencesByYear = () => {
    const grouped: { [year: number]: Experience[] } = {};
    
    experiences.forEach((exp) => {
      const startYear = getYear(exp.start_date);
      
      if (!grouped[startYear]) {
        grouped[startYear] = [];
      }
      grouped[startYear].push(exp);
    });

    // Sort experiences within each year by start date (newest first)
    Object.keys(grouped).forEach((year) => {
      grouped[parseInt(year)].sort((a, b) => {
        const dateA = new Date(b.start_date).getTime();
        const dateB = new Date(a.start_date).getTime();
        return dateA - dateB;
      });
    });

    return grouped;
  };

  const groupedExperiences = groupExperiencesByYear();
  const sortedYears = Object.keys(groupedExperiences)
    .map(Number)
    .sort((a, b) => b - a); // Sort years descending (newest first)

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-indigo-600" />
          Experience
        </h3>
        {isEditable && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Experience
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isEditable && showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">
              {editingId ? 'Edit Experience' : 'Add Experience'}
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Sales Manager, Network Marketing Leader"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Company name (optional)"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="month"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                  disabled={formData.is_current}
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_current"
                checked={formData.is_current}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    is_current: e.target.checked,
                    end_date: e.target.checked ? null : formData.end_date,
                  });
                }}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="is_current" className="ml-2 block text-sm text-gray-900">
                I currently work here
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your role and achievements..."
                rows={4}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {editingId ? 'Update' : 'Add'} Experience
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Experiences Timeline */}
      {experiences.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">No experiences added yet.</p>
          {isEditable && (
            <p className="text-xs mt-1">Click &quot;Add Experience&quot; to get started.</p>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-indigo-200"></div>
          
          <div className="space-y-8">
            {sortedYears.map((year, yearIndex) => {
              const yearExperiences = groupedExperiences[year];
              return (
                <div key={year} className="relative">
                  {/* Year Header */}
                  <div className="flex items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative z-10 w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">{year}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{year}</h3>
                    </div>
                  </div>

                  {/* Experiences for this year */}
                  <div className="ml-6 space-y-6">
                    {yearExperiences.map((experience, expIndex) => {
                      const isLastInYear = expIndex === yearExperiences.length - 1;
                      const isLastOverall = yearIndex === sortedYears.length - 1 && isLastInYear;
                      
                      return (
                        <div
                          key={experience.id}
                          className="relative pl-8 pb-6"
                        >
                          {/* Connecting line */}
                          {!isLastOverall && (
                            <div className="absolute left-0 top-6 bottom-0 w-0.5 bg-indigo-200"></div>
                          )}
                          
                          {/* Experience dot */}
                          <div className="absolute left-[-2px] top-6 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-md"></div>
                          
                          {/* Experience card */}
                          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-start gap-3">
                                  <div className="mt-1">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                      <Briefcase className="h-5 w-5 text-indigo-600" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-semibold text-gray-900">{experience.title}</h4>
                                    {experience.company && (
                                      <p className="text-sm font-medium text-gray-700 mt-0.5">{experience.company}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                                      <Calendar className="h-4 w-4" />
                                      <span>
                                        {formatDate(experience.start_date)} -{' '}
                                        {experience.is_current ? (
                                          <span className="text-indigo-600 font-medium">Present</span>
                                        ) : experience.end_date ? (
                                          formatDate(experience.end_date)
                                        ) : (
                                          'Present'
                                        )}
                                      </span>
                                      <span className="text-gray-400">•</span>
                                      <span>{getDuration(experience.start_date, experience.end_date, experience.is_current)}</span>
                                    </div>
                                    {experience.description && (
                                      <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{experience.description}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isEditable && (
                                <div className="flex items-center gap-2 ml-4">
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(experience)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => experience.id && handleDelete(experience.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
