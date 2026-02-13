'use client';

import React from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Link as LinkIcon, Settings, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface PageContent {
  id: string;
  page: string;
  title: string;
  content: string;
  slug: string;
  is_published: boolean;
  is_main_nav: boolean;
  is_footer: boolean;
  footer_column: number;
  nav_order: number;
  parent_page: string | null;
  last_updated: string;
  meta_description: string;
  meta_keywords: string;
}

interface PageFormData {
  title: string;
  content: string;
  slug: string;
  is_published: boolean;
  is_main_nav: boolean;
  is_footer: boolean;
  footer_column: number;
  nav_order: number;
  parent_page: string | null;
  meta_description: string;
  meta_keywords: string;
}

export function AdminPagesPageContent() {
  const [pages, setPages] = React.useState<PageContent[]>([]);
  const [selectedPage, setSelectedPage] = React.useState<string | null>(null);
  const [content, setContent] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [editingPage, setEditingPage] = React.useState<PageContent | null>(null);
  const [formData, setFormData] = React.useState<PageFormData>({
    title: '',
    content: '',
    slug: '',
    is_published: true,
    is_main_nav: false,
    is_footer: false,
    footer_column: 1,
    nav_order: 0,
    parent_page: null,
    meta_description: '',
    meta_keywords: ''
  });
  const [activeTab, setActiveTab] = React.useState<'content' | 'navigation' | 'seo'>('content');
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  React.useEffect(() => {
    loadPages();
  }, []);

  React.useEffect(() => {
    if (selectedPage) {
      loadPageContent(selectedPage);
    }
  }, [selectedPage]);

  async function loadPages() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('page_content')
        .select('*')
        .order('nav_order', { ascending: true });

      if (error) throw error;
      setPages(data || []);
      
      // Select the first page by default if none is selected
      if (data && data.length > 0 && !selectedPage) {
        setSelectedPage(data[0].page);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
      toast.error('Error loading pages');
    } finally {
      setLoading(false);
    }
  }

  async function loadPageContent(pageName: string) {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('page_content')
        .select('*')
        .eq('page', pageName)
        .single();

      if (error && (error as any).code !== 'PGRST116') throw error;
      if (data) {
        setContent(data.content);
        setEditingPage(data as PageContent);
      } else {
        setContent('');
        setEditingPage(null);
      }
    } catch (error) {
      console.error('Error loading page content:', error);
      toast.error('Error loading page content');
    } finally {
      setLoading(false);
    }
  }

  const saveContent = async () => {
    if (!selectedPage || !editingPage) return;
    
    try {
      setSaving(true);

      const { error } = await supabase
        .from('page_content')
        .update({
          content: content,
          last_updated: new Date().toISOString()
        })
        .eq('id', editingPage.id);

      if (error) throw error;
      toast.success('Content saved successfully');
      loadPages();
    } catch (error: any) {
      console.error('Error saving content:', error);
      toast.error('Error saving content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateOrUpdatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Generate slug if not provided
      let slug = formData.slug;
      if (!slug && formData.title) {
        slug = formData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      
      // Generate page identifier if not editing
      const pageIdentifier = editingPage ? editingPage.page : slug;
      
      const pageData = {
        page: pageIdentifier,
        title: formData.title,
        content: formData.content || '<p>Content goes here</p>',
        slug: slug,
        is_published: formData.is_published,
        is_main_nav: formData.is_main_nav,
        is_footer: formData.is_footer,
        footer_column: formData.footer_column,
        nav_order: formData.nav_order,
        parent_page: formData.parent_page,
        meta_description: formData.meta_description,
        meta_keywords: formData.meta_keywords,
        last_updated: new Date().toISOString()
      };
      
      if (editingPage) {
        // Update existing page
        const { error } = await supabase
          .from('page_content')
          .update(pageData)
          .eq('id', editingPage.id);
          
        if (error) throw error;
        toast.success('Page updated successfully');
      } else {
        // Create new page
        const { error } = await supabase
          .from('page_content')
          .insert([pageData]);
          
        if (error) throw error;
        toast.success('Page created successfully');
      }
      
      setShowModal(false);
      loadPages();
    } catch (error: any) {
      console.error('Error saving page:', error);
      toast.error('Error saving page. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPage = (page: PageContent) => {
    setEditingPage(page);
    setFormData({
      title: page.title || '',
      content: page.content || '',
      slug: page.slug || '',
      is_published: page.is_published !== false,
      is_main_nav: page.is_main_nav || false,
      is_footer: page.is_footer || false,
      footer_column: page.footer_column || 1,
      nav_order: page.nav_order || 0,
      parent_page: page.parent_page,
      meta_description: page.meta_description || '',
      meta_keywords: page.meta_keywords || ''
    });
    setShowModal(true);
  };

  const handleNewPage = () => {
    setEditingPage(null);
    setFormData({
      title: '',
      content: '',
      slug: '',
      is_published: true,
      is_main_nav: false,
      is_footer: false,
      footer_column: 1,
      nav_order: pages.length,
      parent_page: null,
      meta_description: '',
      meta_keywords: ''
    });
    setShowModal(true);
  };

  const handleTogglePublish = async (page: PageContent) => {
    try {
      const { error } = await supabase
        .from('page_content')
        .update({ is_published: !page.is_published })
        .eq('id', page.id);

      if (error) throw error;
      toast.success(`Page ${page.is_published ? 'unpublished' : 'published'}`);
      loadPages();
    } catch (error: any) {
      console.error('Error toggling page status:', error);
      toast.error('Error updating page status');
    }
  };

  const handleDeletePage = async () => {
    if (!editingPage) return;
    
    try {
      const { error } = await supabase
        .from('page_content')
        .delete()
        .eq('id', editingPage.id);

      if (error) throw error;
      toast.success('Page deleted successfully');
      setShowDeleteConfirm(false);
      setShowModal(false);
      
      // If the deleted page was selected, select another page
      if (selectedPage === editingPage.page) {
        const remainingPages = pages.filter(p => p.id !== editingPage.id);
        if (remainingPages.length > 0) {
          setSelectedPage(remainingPages[0].page);
        } else {
          setSelectedPage(null);
        }
      }
      
      loadPages();
    } catch (error: any) {
      console.error('Error deleting page:', error);
      toast.error('Error deleting page');
    }
  };

  const handleMoveOrder = async (page: PageContent, direction: 'up' | 'down') => {
    const currentIndex = pages.findIndex(p => p.id === page.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= pages.length) return;
    
    try {
      const otherPage = pages[newIndex];
      
      // Swap nav_order values
      await Promise.all([
        supabase
          .from('page_content')
          .update({ nav_order: otherPage.nav_order })
          .eq('id', page.id),
        supabase
          .from('page_content')
          .update({ nav_order: page.nav_order })
          .eq('id', otherPage.id)
      ]);
      
      toast.success('Page order updated');
      loadPages();
    } catch (error: any) {
      console.error('Error updating page order:', error);
      toast.error('Error updating page order');
    }
  };

  const getParentPages = () => {
    return pages.filter(page => !page.parent_page && (!editingPage || page.id !== editingPage.id));
  };

  if (loading && pages.length === 0) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-2xl sm:text-xl font-bold text-gray-900">Manage Pages</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleNewPage}
              className="inline-flex items-center px-5 py-3 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-6 w-6 sm:h-4 sm:w-4 mr-2" />
              Add Page
            </button>
            {selectedPage && editingPage && (
              <button
                onClick={saveContent}
                disabled={saving}
                className="inline-flex items-center px-5 py-3 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-6 w-6 sm:h-4 sm:w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Content'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Pages List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Pages</h3>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {pages.map((page) => (
                <div 
                  key={page.id} 
                  className={`p-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer ${
                    selectedPage === page.page ? 'bg-indigo-50' : ''
                  }`}
                  onClick={() => setSelectedPage(page.page)}
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="font-medium text-gray-900">{page.title || page.page}</h4>
                      {!page.is_published && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">
                          Draft
                        </span>
                      )}
                      {page.is_main_nav && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                          Nav
                        </span>
                      )}
                      {page.is_footer && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                          Footer
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">/{page.slug || page.page}</p>
                  </div>
                  <div className="flex space-x-2 sm:space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveOrder(page, 'up');
                      }}
                      disabled={pages.indexOf(page) === 0}
                      className="p-3 sm:p-1 rounded-full text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ArrowUp className="h-6 w-6 sm:h-4 sm:w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveOrder(page, 'down');
                      }}
                      disabled={pages.indexOf(page) === pages.length - 1}
                      className="p-3 sm:p-1 rounded-full text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ArrowDown className="h-6 w-6 sm:h-4 sm:w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePublish(page);
                      }}
                      className={`p-3 sm:p-1 rounded-full ${
                        page.is_published ? 'text-green-600' : 'text-gray-400'
                      } hover:text-green-700`}
                    >
                      {page.is_published ? <Eye className="h-6 w-6 sm:h-4 sm:w-4" /> : <EyeOff className="h-6 w-6 sm:h-4 sm:w-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPage(page);
                      }}
                      className="p-3 sm:p-1 rounded-full text-blue-600 hover:text-blue-700"
                    >
                      <Settings className="h-6 w-6 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content Editor */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm overflow-hidden">
            {selectedPage && editingPage ? (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">{editingPage.title || editingPage.page}</h3>
                    <p className="text-sm text-gray-500">/{editingPage.slug || editingPage.page}</p>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-2">
                    <a
                      href={`/${editingPage.slug || editingPage.page}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 sm:px-3 sm:py-1 border border-gray-300 rounded-md text-base sm:text-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <LinkIcon className="h-5 w-5 sm:h-4 sm:w-4 mr-1" />
                      View
                    </a>
                    <button
                      onClick={() => handleEditPage(editingPage)}
                      className="inline-flex items-center px-4 py-2 sm:px-3 sm:py-1 border border-gray-300 rounded-md text-base sm:text-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Settings className="h-5 w-5 sm:h-4 sm:w-4 mr-1" />
                      Settings
                    </button>
                  </div>
                </div>
                <div className="p-4 flex-grow">
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    className="min-h-[600px]"
                  />
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                {pages.length === 0 ? (
                  <div>
                    <p className="mb-4">No pages found. Create your first page to get started.</p>
                    <button
                      onClick={handleNewPage}
                      className="inline-flex items-center px-5 py-3 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="h-6 w-6 sm:h-4 sm:w-4 mr-2" />
                      Add Page
                    </button>
                  </div>
                ) : (
                  <p>Select a page from the list to edit its content</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingPage ? 'Edit Page' : 'Create Page'}
            </h3>
            
            <div className="mb-4 border-b">
              <div className="flex space-x-2 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('content')}
                  className={`px-5 py-3 sm:px-4 sm:py-2 text-base sm:text-sm ${
                    activeTab === 'content'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Basic Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('navigation')}
                  className={`px-5 py-3 sm:px-4 sm:py-2 text-base sm:text-sm ${
                    activeTab === 'navigation'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Navigation
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('seo')}
                  className={`px-5 py-3 sm:px-4 sm:py-2 text-base sm:text-sm ${
                    activeTab === 'seo'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  SEO
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateOrUpdatePage} className="space-y-4">
              {activeTab === 'content' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Page Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleFormChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">URL Slug</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                        /
                      </span>
                      <input
                        type="text"
                        name="slug"
                        value={formData.slug}
                        onChange={handleFormChange}
                        placeholder="page-url-slug"
                        className="flex-1 block w-full rounded-none rounded-r-md border border-gray-300 p-2"
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Leave blank to auto-generate from title
                    </p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_published"
                      name="is_published"
                      checked={formData.is_published}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_published" className="ml-2 block text-sm text-gray-900">
                      Published
                    </label>
                  </div>
                </>
              )}

              {activeTab === 'navigation' && (
                <>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_main_nav"
                      name="is_main_nav"
                      checked={formData.is_main_nav}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_main_nav" className="ml-2 block text-sm text-gray-900">
                      Show in Main Navigation
                    </label>
                  </div>

                  {formData.is_main_nav && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Navigation Order</label>
                        <input
                          type="number"
                          name="nav_order"
                          value={formData.nav_order}
                          onChange={handleFormChange}
                          min={0}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">Parent Page</label>
                        <select
                          name="parent_page"
                          value={formData.parent_page || ''}
                          onChange={handleFormChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        >
                          <option value="">None (Top Level)</option>
                          {getParentPages().map(page => (
                            <option key={page.id} value={page.page}>
                              {page.title || page.page}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_footer"
                      name="is_footer"
                      checked={formData.is_footer}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_footer" className="ml-2 block text-sm text-gray-900">
                      Show in Footer
                    </label>
                  </div>

                  {formData.is_footer && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Footer Column</label>
                      <select
                        name="footer_column"
                        value={formData.footer_column}
                        onChange={handleFormChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      >
                        <option value={1}>Column 1</option>
                        <option value={2}>Column 2</option>
                        <option value={3}>Column 3</option>
                        <option value={4}>Column 4</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'seo' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Meta Description</label>
                    <textarea
                      name="meta_description"
                      value={formData.meta_description}
                      onChange={handleFormChange}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="Brief description for search engines"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Recommended: 150-160 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Meta Keywords</label>
                    <input
                      type="text"
                      name="meta_keywords"
                      value={formData.meta_keywords}
                      onChange={handleFormChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      placeholder="keyword1, keyword2, keyword3"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Comma-separated keywords
                    </p>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:space-x-3 mt-6 pt-4 border-t">
                <div>
                  {editingPage && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full sm:w-auto px-5 py-3 sm:px-4 sm:py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 text-base sm:text-sm font-medium"
                    >
                      Delete Page
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full sm:w-auto px-5 py-3 sm:px-4 sm:py-2 border border-gray-300 rounded-md text-base sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-5 py-3 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : (editingPage ? 'Update Page' : 'Create Page')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this page? This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full sm:w-auto px-5 py-3 sm:px-4 sm:py-2 border border-gray-300 rounded-md text-base sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePage}
                className="w-full sm:w-auto px-5 py-3 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

