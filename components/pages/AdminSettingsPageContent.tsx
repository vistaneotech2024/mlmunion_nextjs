'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Key,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ApiKey {
  id: string;
  provider: 'gpt' | 'gemini' | 'claude' | 'other';
  model: string;
  api_key: string;
  is_active: boolean;
  name: string | null;
  created_at: string;
  updated_at: string;
}

type Provider = 'gpt' | 'gemini' | 'claude' | 'other';

const providerOptions: { value: Provider; label: string }[] = [
  { value: 'gpt', label: 'OpenAI (GPT)' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'claude', label: 'Anthropic Claude' },
  { value: 'other', label: 'Other' },
];

const modelOptions: Record<Provider, string[]> = {
  gpt: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
  gemini: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  claude: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-2', 'claude-instant'],
  other: [],
};

export function AdminSettingsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingKey, setEditingKey] = React.useState<ApiKey | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [showApiKey, setShowApiKey] = React.useState<Record<string, boolean>>({});
  const [formData, setFormData] = React.useState<{
    provider: Provider;
    model: string;
    api_key: string;
    name: string;
    is_active: boolean;
  }>({
    provider: 'gpt',
    model: 'gpt-4',
    api_key: '',
    name: '',
    is_active: false,
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
    void loadApiKeys();
  }, [adminChecked]);

  async function loadApiKeys() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys((data as ApiKey[]) || []);
    } catch (error: any) {
      console.error('Error loading API keys:', error);
      toast.error('Error loading API keys');
    } finally {
      setLoading(false);
    }
  }

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';

    setFormData((prev) => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
    }));

    if (name === 'provider') {
      const provider = value as Provider;
      const defaultModelMap: Record<Provider, string> = {
        gpt: 'gpt-4',
        gemini: 'gemini-pro',
        claude: 'claude-3-opus',
        other: '',
      };
      setFormData((prev) => ({
        ...prev,
        provider,
        model: defaultModelMap[provider] || '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.api_key.trim()) {
      toast.error('API key is required');
      return;
    }

    if (!formData.model.trim()) {
      toast.error('Model is required');
      return;
    }

    try {
      if (editingKey) {
        const { error } = await supabase
          .from('api_keys')
          .update({
            provider: formData.provider,
            model: formData.model,
            api_key: formData.api_key,
            name: formData.name || null,
            is_active: formData.is_active,
          })
          .eq('id', editingKey.id);

        if (error) throw error;
        toast.success('API key updated successfully');
      } else {
        const { error } = await supabase
          .from('api_keys')
          .insert([
            {
              provider: formData.provider,
              model: formData.model,
              api_key: formData.api_key,
              name: formData.name || null,
              is_active: formData.is_active,
            },
          ]);

        if (error) throw error;
        toast.success('API key created successfully');
      }

      setShowModal(false);
      void loadApiKeys();
    } catch (error: any) {
      console.error('Error saving API key:', error);
      toast.error(error.message || 'Error saving API key');
    }
  };

  const handleEdit = (key: ApiKey) => {
    setEditingKey(key);
    setFormData({
      provider: key.provider,
      model: key.model,
      api_key: key.api_key,
      name: key.name || '',
      is_active: key.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('API key deleted successfully');
      void loadApiKeys();
    } catch (error: any) {
      console.error('Error deleting API key:', error);
      toast.error('Error deleting API key');
    }
  };

  const handleToggleActive = async (key: ApiKey) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !key.is_active })
        .eq('id', key.id);

      if (error) throw error;
      toast.success(`API key ${!key.is_active ? 'activated' : 'deactivated'}`);
      void loadApiKeys();
    } catch (error: any) {
      console.error('Error updating API key status:', error);
      toast.error('Error updating API key status');
    }
  };

  const handleAddNew = () => {
    setEditingKey(null);
    setFormData({
      provider: 'gpt',
      model: 'gpt-4',
      api_key: '',
      name: '',
      is_active: false,
    });
    setShowModal(true);
  };

  const toggleShowApiKey = (id: string) => {
    setShowApiKey((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`;
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
            <h2 className="text-2xl font-bold text-gray-900">API Keys Settings</h2>
            <p className="text-gray-600 mt-1">Manage AI service API keys for classified generation</p>
          </div>
          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add API Key
          </button>
        </div>

        {/* API Keys Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">No API keys configured</p>
                      <p className="text-sm mb-4">Add an API key to enable AI-powered classified generation</p>
                      <button
                        type="button"
                        onClick={handleAddNew}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First API Key
                      </button>
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((key) => (
                    <tr key={key.id} className={key.is_active ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-indigo-100 rounded-md">
                            <Key className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 capitalize">{key.provider}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{key.model}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{key.name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-mono text-gray-600">
                            {showApiKey[key.id] ? key.api_key : maskApiKey(key.api_key)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleShowApiKey(key.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title={showApiKey[key.id] ? 'Hide' : 'Show'}
                          >
                            {showApiKey[key.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(key)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            key.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {key.is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              In Use
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(key)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(key.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        {apiKeys.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Settings className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">How it works</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Click &quot;Mark in Use&quot; to activate an API key for classified generation</li>
                    <li>Only one API key per provider+model combination can be active at a time</li>
                    <li>The active API key will be used automatically when generating classifieds with AI</li>
                    <li>API keys are stored securely and only accessible to administrators</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingKey ? 'Edit API Key' : 'Add API Key'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider *
                </label>
                <select
                  name="provider"
                  value={formData.provider}
                  onChange={handleFormChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {providerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model *
                </label>
                {formData.provider === 'other' ? (
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleFormChange}
                    required
                    placeholder="Enter model name"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <select
                    name="model"
                    value={formData.model}
                    onChange={handleFormChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {modelOptions[formData.provider].map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key *
                </label>
                <textarea
                  name="api_key"
                  value={formData.api_key}
                  onChange={handleFormChange}
                  required
                  rows={3}
                  placeholder="Enter your API key"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your API key is stored securely and encrypted
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="e.g., Production GPT-4 Key"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  A friendly name to identify this API key
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={handleFormChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Mark as active (Use this key for AI generation)
                </label>
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
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingKey ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

