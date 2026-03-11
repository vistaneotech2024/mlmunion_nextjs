'use client';

import React from 'react';
import Link from 'next/link';
import DatePicker from 'react-datepicker';
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

function toUrlSlug(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function ExperienceManagement({ userId, isEditable = true }: ExperienceManagementProps) {
  const [experiences, setExperiences] = React.useState<Experience[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [formData, setFormData] = React.useState<
    Omit<Experience, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  >({
    title: '',
    company: '',
    description: '',
    start_date: '',
    end_date: null,
    is_current: false,
  });
  const [companies, setCompanies] = React.useState<
    Array<{
      id: string;
      name: string;
      logo_url?: string | null;
      slug?: string | null;
      country_name?: string | null;
      country?: string | null;
    }>
  >([]);
  const [loadingCompanies, setLoadingCompanies] = React.useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = React.useState(false);

  React.useEffect(() => {
    if (userId) {
      loadExperiences();
    }
  }, [userId]);

  React.useEffect(() => {
    if (userId) {
      void loadCompanies();
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

  async function loadCompanies() {
    try {
      setLoadingCompanies(true);
      const { data, error } = await supabase
        .from('mlm_companies')
        .select('id, name, logo_url, slug, country_name, country')
        .eq('status', 'approved')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error loading companies for experience:', error);
    } finally {
      setLoadingCompanies(false);
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

  const handleEdit = (experience: Experience) => {
    setFormData({
      title: experience.title,
      company: experience.company || '',
      description: experience.description || '',
      // keep full date (YYYY-MM-DD) so we can show exact day
      start_date: experience.start_date,
      end_date: experience.end_date || null,
      is_current: experience.is_current,
    });
    setEditingId(experience.id || null);
    setShowAddForm(true);
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

    // Dates are stored as full YYYY-MM-DD strings
    const startDate = formData.start_date;
    const endDate = formData.end_date || null;

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

  const totalRoles = experiences.length;
  const currentRoles = experiences.filter((exp) => exp.is_current).length;

  let earliestStart: string | null = null;
  let latestEnd: string | null = null;

  experiences.forEach((exp) => {
    if (!earliestStart || new Date(exp.start_date) < new Date(earliestStart)) {
      earliestStart = exp.start_date;
    }
    const endDate = exp.is_current || !exp.end_date ? new Date().toISOString() : exp.end_date;
    if (!latestEnd || (endDate && new Date(endDate) > new Date(latestEnd))) {
      latestEnd = endDate || latestEnd;
    }
  });

  const overallDuration =
    earliestStart && latestEnd ? getDuration(earliestStart, latestEnd, false) : null;

  const filteredCompanies = React.useMemo(() => {
    if (!formData.company?.trim()) return companies;
    const q = formData.company.toLowerCase();
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, formData.company]);

  if (loading) {
    return (
      <div className="flex justify-center py-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
            <span className="inline-flex h-2 w-2 items-center justify-center rounded-full bg-indigo-50">
              <Briefcase className="h-2 w-2 text-indigo-600" />
            </span>
            <span>Experience</span>
          </h3>
        </div>
        {isEditable && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-full text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Add Experience</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {/* Removed stats summary cards (Total Roles, Current Roles, Experience Span) as requested */}

      {/* Add/Edit Form */}
      {isEditable && showAddForm && (
        <div className="bg-gradient-to-br from-indigo-50 via-white to-slate-50 border border-indigo-100 rounded-xl p-3 sm:p-4 shadow-sm">
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

          <div className="space-y-3">
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
              <div className="mt-1 relative">
                <input
                  type="text"
                  value={formData.company}
                  onFocus={() => setShowCompanyDropdown(true)}
                  onChange={(e) => {
                    setFormData({ ...formData, company: e.target.value });
                    setShowCompanyDropdown(true);
                  }}
                  placeholder="Start typing to search or add company name"
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />

                {showCompanyDropdown && filteredCompanies.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white px-3 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                        Suggested companies
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500 border border-indigo-100">
                          {filteredCompanies.length} found
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCompanyDropdown(false)}
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] text-gray-500 hover:bg-gray-100"
                          aria-label="Hide suggestions"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {filteredCompanies.map((company, index) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, company: company.name });
                          setShowCompanyDropdown(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                        } hover:bg-indigo-50`}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200 overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                          {company.logo_url ? (
                            <img
                              src={company.logo_url}
                              alt={company.name}
                              className="h-full w-full object-contain p-0.5"
                            />
                          ) : (
                            <span className="text-[11px] font-semibold text-indigo-600">
                              {company.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-semibold text-gray-900">
                            {company.name}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            Click to use this company
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {formData.company && (
                <div className="mb-2 mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200 overflow-hidden">
                    {(() => {
                      const selectedCompany = companies.find((c) => c.name === formData.company);
                      if (selectedCompany?.logo_url) {
                        return (
                          <img
                            src={selectedCompany.logo_url}
                            alt={selectedCompany.name}
                            className="h-full w-full object-contain p-0.5"
                          />
                        );
                      }
                      return (
                        <span className="text-[11px] font-semibold text-gray-600">
                          {formData.company.charAt(0).toUpperCase()}
                        </span>
                      );
                    })()}
                  </div>
                  <span className="truncate text-sm font-semibold text-gray-800">
                    {formData.company}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={formData.start_date ? new Date(formData.start_date) : null}
                  onChange={(date: Date | null) => {
                    const value = date ? date.toISOString().substring(0, 10) : '';
                    setFormData({ ...formData, start_date: value });
                  }}
                  onKeyDown={(e) => {
                    const allowedKeys = [
                      'Backspace',
                      'Tab',
                      'ArrowLeft',
                      'ArrowRight',
                      'Delete',
                      'Home',
                      'End',
                      '-',
                    ];
                    if (
                      !/[0-9]/.test(e.key) &&
                      !allowedKeys.includes(e.key)
                    ) {
                      e.preventDefault();
                    }
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="YYYY-MM-DD"
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <DatePicker
                  selected={formData.end_date ? new Date(formData.end_date) : null}
                  onChange={(date: Date | null) => {
                    const value = date ? date.toISOString().substring(0, 10) : null;
                    setFormData({ ...formData, end_date: value });
                  }}
                  onKeyDown={(e) => {
                    const allowedKeys = [
                      'Backspace',
                      'Tab',
                      'ArrowLeft',
                      'ArrowRight',
                      'Delete',
                      'Home',
                      'End',
                      '-',
                    ];
                    if (
                      !/[0-9]/.test(e.key) &&
                      !allowedKeys.includes(e.key)
                    ) {
                      e.preventDefault();
                    }
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="YYYY-MM-DD"
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
        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-8 text-center text-gray-600">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <Briefcase className="h-6 w-6 text-indigo-500" />
          </div>
          <p className="text-sm font-medium">No experiences added yet</p>
          {isEditable && (
            <p className="mt-2 text-xs text-gray-500">
              Start by adding your first role to showcase your journey.
            </p>
          )}
        </div>
      ) : (
        <div className="relative mt-2">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-300 via-indigo-200 to-transparent"></div>
          
          <div className="space-y-8">
            {sortedYears.map((year, yearIndex) => {
              const yearExperiences = groupedExperiences[year];
              return (
                <div key={year} className="relative">
                  {/* Year Header */}
                  <div className="flex items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative z-10 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md ring-2 ring-indigo-100">
                        <span className="text-indigo-700 font-bold text-sm">{year}</span>
                      </div>
                      {/* <h3 className="text-xl font-bold text-gray-900">{year}</h3> */}
                    </div>
                  </div>

                  {/* Experiences for this year */}
                  <div className="ml-6 space-y-6">
                    {yearExperiences.map((experience, expIndex) => {
                      const isLastInYear = expIndex === yearExperiences.length - 1;
                      const isLastOverall = yearIndex === sortedYears.length - 1 && isLastInYear;
                      const matchedCompany = experience.company
                        ? companies.find((c) => c.name === experience.company)
                        : undefined;
                      
                      return (
                        <div
                          key={experience.id}
                          className="relative pl-8 pb-6"
                        >
                          {/* Connecting line */}
                          {!isLastOverall && (
                            <div className="absolute left-0 top-6 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-100 to-transparent"></div>
                          )}
                          
                          {/* Experience dot */}
                          <div className="absolute left-[-2px] top-6 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-md"></div>
                          
                          {/* Experience card */}
                          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-xl p-4 sm:p-5 hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex-1 min-w-0">
                                    {experience.company && (
                                      <Link
                                        href={
                                          matchedCompany
                                            ? `/company/${
                                                toUrlSlug(
                                                  matchedCompany.country_name ||
                                                    matchedCompany.country ||
                                                    ''
                                                ) || 'unknown'
                                              }/${
                                                matchedCompany.slug ||
                                                toUrlSlug(matchedCompany.name || '') ||
                                                matchedCompany.id
                                              }`
                                            : '#'
                                        }
                                        target={matchedCompany ? '_blank' : undefined}
                                        className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 mb-2 hover:bg-indigo-100 transition-colors"
                                      >
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-indigo-100 overflow-hidden">
                                          {matchedCompany?.logo_url ? (
                                            <img
                                              src={matchedCompany.logo_url}
                                              alt={matchedCompany.name}
                                              className="h-full w-full object-contain p-0.5"
                                            />
                                          ) : (
                                            <span className="text-[10px] font-semibold text-indigo-700">
                                              {experience.company.charAt(0).toUpperCase()}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-sm font-semibold text-indigo-800">
                                          {experience.company}
                                        </span>
                                      </Link>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                                        {experience.title}
                                      </h4>
                                      {experience.is_current && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                          Current role
                                        </span>
                                      )}
                                    </div>

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
                                      <span className="text-gray-300">•</span>
                                      <span className="text-xs sm:text-sm font-medium text-gray-700">
                                        {getDuration(
                                          experience.start_date,
                                          experience.end_date,
                                          experience.is_current
                                        )}
                                      </span>
                                    </div>
                                    {experience.description && (
                                      <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap leading-relaxed">
                                        {experience.description}
                                      </p>
                                    )}
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
