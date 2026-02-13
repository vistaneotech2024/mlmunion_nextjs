'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, ArrowUp, ArrowDown, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  active: boolean;
  order: number;
}

export function AdminFAQPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [faqs, setFaqs] = React.useState<FAQ[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingFaq, setEditingFaq] = React.useState<FAQ | null>(null);
  const [showModal, setShowModal] = React.useState(false);
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
    void loadFaqs();
  }, [adminChecked]);

  async function loadFaqs() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setFaqs((data as FAQ[]) || []);
    } catch (error: any) {
      console.error('Error loading FAQs:', error);
      toast.error('Error loading FAQs');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const faqData = {
        question: formData.get('question') as string,
        answer: formData.get('answer') as string,
        category: formData.get('category') as string,
        active: true,
        order: editingFaq ? editingFaq.order : faqs.length,
      };

      if (editingFaq) {
        const { error } = await supabase
          .from('faqs')
          .update(faqData)
          .eq('id', editingFaq.id);

        if (error) throw error;
        toast.success('FAQ updated successfully');
      } else {
        const { error } = await supabase
          .from('faqs')
          .insert([faqData]);

        if (error) throw error;
        toast.success('FAQ created successfully');
      }

      setShowModal(false);
      setEditingFaq(null);
      void loadFaqs();
    } catch (error: any) {
      console.error('Error saving FAQ:', error);
      toast.error('Error saving FAQ');
    }
  };

  const toggleActive = async (faq: FAQ) => {
    try {
      const { error } = await supabase
        .from('faqs')
        .update({ active: !faq.active })
        .eq('id', faq.id);

      if (error) throw error;
      toast.success(`FAQ ${faq.active ? 'hidden' : 'published'}`);
      void loadFaqs();
    } catch (error: any) {
      console.error('Error toggling FAQ:', error);
      toast.error('Error updating FAQ');
    }
  };

  const deleteFaq = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('FAQ deleted successfully');
      void loadFaqs();
    } catch (error: any) {
      console.error('Error deleting FAQ:', error);
      toast.error('Error deleting FAQ');
    }
  };

  const moveOrder = async (faq: FAQ, direction: 'up' | 'down') => {
    const currentIndex = faqs.findIndex((f) => f.id === faq.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= faqs.length) return;

    try {
      const otherFaq = faqs[newIndex];
      await Promise.all([
        supabase
          .from('faqs')
          .update({ order: otherFaq.order })
          .eq('id', faq.id),
        supabase
          .from('faqs')
          .update({ order: faq.order })
          .eq('id', otherFaq.id),
      ]);

      toast.success('FAQ order updated');
      void loadFaqs();
    } catch (error: any) {
      console.error('Error updating FAQ order:', error);
      toast.error('Error updating FAQ order');
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Manage FAQs</h2>
          <button
            type="button"
            onClick={() => {
              setEditingFaq(null);
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add FAQ
          </button>
        </div>

        {/* FAQs List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="divide-y">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-6">
                    <h3 className="font-medium text-gray-900">{faq.question}</h3>
                    <p className="mt-1 text-sm text-gray-500">{faq.answer}</p>
                    <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {faq.category}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => moveOrder(faq, 'up')}
                      disabled={faqs.indexOf(faq) === 0}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ArrowUp className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveOrder(faq, 'down')}
                      disabled={faqs.indexOf(faq) === faqs.length - 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ArrowDown className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(faq)}
                      className={`p-2 ${faq.active ? 'text-green-600' : 'text-gray-400'} hover:text-green-700`}
                    >
                      {faq.active ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFaq(faq);
                        setShowModal(true);
                      }}
                      className="p-2 text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFaq(faq.id)}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingFaq ? 'Edit FAQ' : 'Create FAQ'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Question</label>
                <input
                  type="text"
                  name="question"
                  defaultValue={editingFaq?.question}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Answer</label>
                <textarea
                  name="answer"
                  defaultValue={editingFaq?.answer}
                  required
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  name="category"
                  defaultValue={editingFaq?.category}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">Select Category</option>
                  <option value="General">General</option>
                  <option value="Account">Account</option>
                  <option value="Companies">Companies</option>
                  <option value="Direct Sellers">Direct Sellers</option>
                  <option value="Payments">Payments</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingFaq(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingFaq ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

