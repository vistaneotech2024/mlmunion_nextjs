'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  Plus,
  MessageSquare,
  Eye,
  Edit,
  Star,
  Link as LinkIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { AIClassifiedGenerator } from '@/components/AIClassifiedGenerator';
import { EditClassifiedModal } from '@/components/EditClassifiedModal';
import { UserClassifiedsListSkeleton } from '@/components/skeletons/UserClassifiedsListSkeleton';

interface Classified {
  id: string;
  title: string;
  description: string;
  status: string;
  is_premium?: boolean;
  category?: string;
  view_count?: number;
  created_at: string;
  slug?: string;
  image_url?: string;
}

export function UserClassifiedsPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [classifieds, setClassifieds] = React.useState<Classified[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAIGenerator, setShowAIGenerator] = React.useState(false);
  const [editingClassifiedId, setEditingClassifiedId] = React.useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 12;

  React.useEffect(() => {
    if (user) {
      loadClassifieds();
    }
  }, [user]);

  async function loadClassifieds() {
    try {
      if (!user) return;

      setLoading(true);
      const { data, error } = await supabase
        .from('classifieds')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        const errorMessage = handleSupabaseError(error, 'Error loading classifieds');
        toast.error(errorMessage);
        return;
      }

      setClassifieds(data || []);
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading classifieds');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleStatus = async (classifiedId: string, currentStatus: string) => {
    if (!user) return;

    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    try {
      setTogglingStatus(classifiedId);
      const { error } = await supabase
        .from('classifieds')
        .update({ status: newStatus })
        .eq('id', classifiedId)
        .eq('user_id', user.id);

      if (error) {
        const errorMessage = handleSupabaseError(error, 'Error updating status');
        toast.error(errorMessage);
        return;
      }

      toast.success(`Classified marked as ${newStatus}`);
      loadClassifieds();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating status');
      toast.error(errorMessage);
    } finally {
      setTogglingStatus(null);
    }
  };

  const handleAIGenerated = (
    title: string,
    description: string,
    meta_description?: string,
    meta_keywords?: string,
    focus_keyword?: string
  ) => {
    router.push(
      `/classifieds/new?aiGenerated=true&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`
    );
    setShowAIGenerator(false);
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your classifieds.</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const activeCount = classifieds.filter((c) => c.status === 'active').length;
  const premiumCount = classifieds.filter((c) => c.is_premium).length;

  // Pagination calculations
  const totalPages = Math.ceil(classifieds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClassifieds = classifieds.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">My Classifieds</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
            <button
              onClick={() => setShowAIGenerator(true)}
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
            >
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Generate with AI</span>
              <span className="sm:hidden">AI</span>
            </button>
            <Link
              href="/classifieds/new"
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Create
            </Link>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 mb-0.5 truncate">Total</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{classifieds.length}</p>
              </div>
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 flex-shrink-0 ml-1" />
            </div>
          </div>
          <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 mb-0.5 truncate">Active</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{activeCount}</p>
              </div>
              <LinkIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0 ml-1" />
            </div>
          </div>
          <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 mb-0.5 truncate">Premium</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{premiumCount}</p>
              </div>
              <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 flex-shrink-0 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Classifieds List */}
      {loading ? (
        <UserClassifiedsListSkeleton count={itemsPerPage} />
      ) : classifieds.length === 0 ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 sm:p-8 lg:p-12 text-center">
          <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-2">No Classifieds Yet</h3>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 mb-4 sm:mb-6">
            You haven&apos;t posted any classifieds yet. Start by creating your first one!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowAIGenerator(true)}
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Generate with AI
            </button>
            <Link
              href="/classifieds/new"
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Post Your First Classified
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {currentClassifieds.map((classified) => (
              <div
                key={classified.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Image */}
                <div className="relative h-32 sm:h-40 lg:h-48 bg-gray-100">
                  {classified.image_url ? (
                    <img
                      src={classified.image_url}
                      alt={classified.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.nextElementSibling) {
                          (target.nextElementSibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 ${classified.image_url ? 'hidden' : ''}`}>
                    <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                  </div>

                  {/* Status Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        classified.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                      }`}
                    >
                      {classified.status}
                    </span>
                    {classified.is_premium && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-500 text-white flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Premium
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-4 flex flex-col flex-grow">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                    {classified.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2 flex-grow">
                    {typeof classified.description === 'string'
                      ? classified.description.replace(/<[^>]*>/g, '').substring(0, 100)
                      : ''}
                    {typeof classified.description === 'string' &&
                    classified.description.replace(/<[^>]*>/g, '').length > 100
                      ? '...'
                      : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3 pb-3 border-b border-gray-100">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {classified.view_count || 0}
                    </span>
                    <span>•</span>
                    <span>{new Date(classified.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Action Buttons - Bottom */}
                  <div className="space-y-2 pt-2">
                    {/* Status Toggle Buttons */}
                    <div className="flex items-center gap-2">
                      {classified.status === 'active' ? (
                        <button
                          onClick={() => handleToggleStatus(classified.id, classified.status)}
                          disabled={togglingStatus === classified.id}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-md transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Mark as Inactive"
                        >
                          {togglingStatus === classified.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                              <span className="hidden sm:inline">Active</span>
                              <span className="sm:hidden">Active</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(classified.id, classified.status)}
                          disabled={togglingStatus === classified.id}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Mark as Active"
                        >
                          {togglingStatus === classified.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                              <span className="hidden sm:inline">Inactive</span>
                              <span className="sm:hidden">Inactive</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Other Action Buttons */}
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <Link
                        href={`/classifieds/${classified.slug || classified.id}`}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md transition-colors text-xs sm:text-sm font-medium"
                        title="View"
                      >
                        <Eye className="h-4 w-4 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                        <span className="hidden sm:inline">View</span>
                        <span className="sm:hidden">View</span>
                      </Link>
                      <button
                        onClick={() => setEditingClassifiedId(classified.id)}
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
                Showing {startIndex + 1} to {Math.min(endIndex, classifieds.length)} of {classifieds.length} classifieds
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

      {/* AI Generator Modal */}
      <AIClassifiedGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onGenerated={handleAIGenerated}
      />

      {/* Edit Classified Modal */}
      <EditClassifiedModal
        isOpen={editingClassifiedId !== null}
        onClose={() => setEditingClassifiedId(null)}
        classifiedId={editingClassifiedId}
        onSuccess={() => {
          loadClassifieds();
          setEditingClassifiedId(null);
        }}
      />
    </div>
  );
}
