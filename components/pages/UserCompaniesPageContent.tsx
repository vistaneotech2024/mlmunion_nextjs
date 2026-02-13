'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Building2, Eye, Edit, ChevronLeft, ChevronRight, Image as ImageIcon, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { CompaniesListSkeleton } from '@/components/skeletons/CompaniesListSkeleton';
import { CreateCompanyModal } from '@/components/CreateCompanyModal';
import { EditCompanyModal } from '@/components/EditCompanyModal';

interface Company {
  id: string;
  name: string;
  logo_url: string;
  country: string;
  country_name?: string;
  category: string;
  category_name?: string;
  established: number;
  description: string;
  status: string;
  slug?: string;
  website?: string;
  view_count?: number;
  created_at: string;
  category_info?: {
    id: string;
    name: string;
  };
}

export function UserCompaniesPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [editingCompanyId, setEditingCompanyId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 12;

  React.useEffect(() => {
    if (user) {
      loadCompanies();
    }
  }, [user]);

  async function loadCompanies() {
    try {
      if (!user) return;

      setLoading(true);
      const { data, error } = await supabase
        .from('mlm_companies')
        .select(
          `
          *,
          category_info:company_categories!category(id, name)
        `
        )
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        const errorMessage = handleSupabaseError(error, 'Error loading companies');
        toast.error(errorMessage);
        return;
      }

      setCompanies(data || []);
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading companies');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your companies.</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const approvedCount = companies.filter((c) => c.status === 'approved').length;
  const pendingCount = companies.filter((c) => c.status === 'pending').length;

  // Pagination calculations
  const totalPages = Math.ceil(companies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCompanies = companies.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to convert country name to URL-friendly slug
  const countryNameToSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-700 mb-2 sm:mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
          <span>Back</span>
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">My Companies</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Add Company
            </button>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 mb-0.5 truncate">Total</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{companies.length}</p>
              </div>
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0 ml-1" />
            </div>
          </div>
          <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 mb-0.5 truncate">Approved</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{approvedCount}</p>
              </div>
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0 ml-1" />
            </div>
          </div>
          <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 mb-0.5 truncate">Pending</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
              <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 flex-shrink-0 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Companies List */}
      {loading ? (
        <CompaniesListSkeleton count={itemsPerPage} />
      ) : companies.length === 0 ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 sm:p-8 lg:p-12 text-center">
          <Building2 className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-2">No Companies Yet</h3>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 mb-4 sm:mb-6">
            You haven&apos;t added any companies yet. Start by adding your first one!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Add Your First Company
          </button>
        </div>
      ) : (
        <>
          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {currentCompanies.map((company) => (
              <div key={company.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                {/* Logo */}
                <div className="relative h-32 sm:h-40 lg:h-48 bg-gray-100 p-4 flex items-center justify-center">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.nextElementSibling) {
                          (target.nextElementSibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 ${company.logo_url ? 'hidden' : ''}`}>
                    <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        company.status === 'approved'
                          ? 'bg-green-500 text-white'
                          : company.status === 'pending'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-500 text-white'
                      }`}
                    >
                      {company.status === 'approved' ? 'Approved' : company.status === 'pending' ? 'Pending' : 'Rejected'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4 flex flex-col flex-grow">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">{company.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2 flex-grow">
                    {company.description?.substring(0, 100)}
                    {company.description && company.description.length > 100 ? '...' : ''}
                  </p>
                  {company.category_info && (
                    <div className="mb-2">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded">
                        {company.category_info.name}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                    {company.established && (
                      <>
                        <span>Est. {company.established}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{new Date(company.created_at).toLocaleDateString()}</span>
                    {company.view_count !== undefined && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {company.view_count || 0}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      {company.slug && company.status === 'approved' && (
                        <Link
                          href={`/company/${countryNameToSlug(company.country_name || company.country)}/${company.slug}`}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md transition-colors text-xs sm:text-sm font-medium"
                          title="View"
                        >
                          <Eye className="h-4 w-4 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          <span className="hidden sm:inline">View</span>
                          <span className="sm:hidden">View</span>
                        </Link>
                      )}
                      <button
                        onClick={() => setEditingCompanyId(company.id)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors text-xs sm:text-sm font-medium"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                        <span className="sm:hidden">Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-4 border-t border-gray-200">
              <div className="text-xs sm:text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, companies.length)} of {companies.length} companies
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 sm:p-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, index, array) => {
                      // Add ellipsis
                      const prevPage = array[index - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;

                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="px-2 text-gray-500">...</span>}
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`min-w-[2rem] sm:min-w-[2.5rem] px-2 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                              currentPage === page
                                ? 'bg-indigo-600 text-white'
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 sm:p-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadCompanies();
        }}
      />

      {/* Edit Company Modal */}
      {editingCompanyId && (
        <EditCompanyModal
          isOpen={!!editingCompanyId}
          onClose={() => setEditingCompanyId(null)}
          companyId={editingCompanyId}
          onSuccess={() => {
            loadCompanies();
            setEditingCompanyId(null);
          }}
        />
      )}
    </div>
  );
}
