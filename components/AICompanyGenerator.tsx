'use client';

import React from 'react';
import Image from 'next/image';
import { X, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { generateCompanyDescription } from '@/lib/openai';

interface AICompanyGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (
    name: string,
    description: string,
    meta_description?: string,
    meta_keywords?: string,
    focus_keyword?: string
  ) => void;
}

export function AICompanyGenerator({ isOpen, onClose, onGenerated }: AICompanyGeneratorProps) {
  const [name, setName] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const languageOptions = [
    'English', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Indonesian',
    'Urdu', 'Arabic', 'Bengali', 'Chinese', 'Russian', 'Japanese', 'Korean', 'Turkish', 'Italian', 'Vietnamese',
    'Other',
  ] as const;
  type LanguageOption = (typeof languageOptions)[number];
  const [language, setLanguage] = React.useState<LanguageOption>('English');
  const [loading, setLoading] = React.useState(false);
  const [step, setStep] = React.useState<'input' | 'generated'>('input');

  const [generatedName, setGeneratedName] = React.useState('');
  const [generatedDescription, setGeneratedDescription] = React.useState('');
  const [generatedMetaDescription, setGeneratedMetaDescription] = React.useState('');
  const [generatedMetaKeywords, setGeneratedMetaKeywords] = React.useState('');
  const [generatedFocusKeyword, setGeneratedFocusKeyword] = React.useState('');

  const handleGenerate = async () => {
    if (!shortDescription.trim()) {
      toast.error('Please provide a description');
      return;
    }
    if (shortDescription.length < 50) {
      toast.error('Description should be at least 50 characters');
      return;
    }

    try {
      setLoading(true);
      const result = await generateCompanyDescription({
        title: name.trim() || undefined,
        shortDescription: shortDescription.trim(),
        language,
      });

      setGeneratedName(result.name || name.trim());
      setGeneratedDescription(result.description || '');
      setGeneratedMetaDescription(result.meta_description || '');
      setGeneratedMetaKeywords(result.meta_keywords || '');
      setGeneratedFocusKeyword(result.focus_keyword || '');
      setStep('generated');
      toast.success('Company content generated successfully!');
    } catch (e: any) {
      console.error('Company generation error:', e);
      toast.error(e?.message || 'Failed to generate company content.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseGenerated = () => {
    if (!generatedDescription.trim()) return;
    onGenerated(
      generatedName || name,
      generatedDescription,
      generatedMetaDescription,
      generatedMetaKeywords,
      generatedFocusKeyword
    );
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setShortDescription('');
    setGeneratedName('');
    setGeneratedDescription('');
    setGeneratedMetaDescription('');
    setGeneratedMetaKeywords('');
    setGeneratedFocusKeyword('');
    setStep('input');
    onClose();
  };

  const handleRegenerate = () => {
    setGeneratedDescription('');
    setStep('input');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-md vista-ai-loader">
              <div className="flex flex-col items-center gap-4 px-6 py-8 rounded-lg bg-white/90 border border-gray-200 shadow-lg">
                <div className="w-20 h-20 flex items-center justify-center">
                  <Image src="/mlm_union.png" alt="MLM Union" width={80} height={80} className="object-contain" priority />
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="wrapper" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="text-sm font-semibold text-purple-700">Generating company content…</div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <h3 className="text-lg font-medium text-gray-900">Generate Company Profile with AI</h3>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            {step === 'input' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Example Wellness Pvt Ltd"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as LanguageOption)}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    {languageOptions.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang === 'Other' ? 'Other (follow context language)' : lang}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brief Context *</label>
                  <textarea
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Describe the company, niche, products, and unique value (min 50 chars)."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">{shortDescription.length} characters (minimum 50)</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={loading || shortDescription.length < 50}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-sm text-green-800 font-medium">✓ Company content generated successfully!</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={generatedName}
                    onChange={(e) => setGeneratedName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-blue-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={generatedDescription}
                    onChange={(e) => setGeneratedDescription(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-blue-50"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                    <textarea
                      value={generatedMetaDescription}
                      onChange={(e) => setGeneratedMetaDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-blue-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
                    <input
                      type="text"
                      value={generatedMetaKeywords}
                      onChange={(e) => setGeneratedMetaKeywords(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-blue-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keyword</label>
                    <input
                      type="text"
                      value={generatedFocusKeyword}
                      onChange={(e) => setGeneratedFocusKeyword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-blue-50"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleRegenerate}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={handleUseGenerated}
                    disabled={!generatedDescription.trim()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Use This Content
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

