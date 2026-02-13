'use client'

import React from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { generateBlogDescription } from '../lib/openai';
import { RichTextEditor } from './RichTextEditor';
import toast from 'react-hot-toast';

interface AIBlogGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (title: string, content: string, meta_description?: string, meta_keywords?: string, focus_keyword?: string) => void;
}

export function AIBlogGenerator({ isOpen, onClose, onGenerated }: AIBlogGeneratorProps) {
  const [title, setTitle] = React.useState('');
  const [shortDescription, setShortDescription] = React.useState('');
  const [generatedTitle, setGeneratedTitle] = React.useState('');
  const [generatedContent, setGeneratedContent] = React.useState('');
  const [seoKeywords, setSeoKeywords] = React.useState<string[]>([]);
  const [generatedMetaDescription, setGeneratedMetaDescription] = React.useState('');
  const [generatedMetaKeywords, setGeneratedMetaKeywords] = React.useState('');
  const [generatedFocusKeyword, setGeneratedFocusKeyword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [step, setStep] = React.useState<'input' | 'generated'>('input');

  const handleGenerate = async () => {
    if (!shortDescription.trim()) {
      toast.error('Please provide a topic description');
      return;
    }

    if (shortDescription.length < 50) {
      toast.error('Topic description should be at least 50 characters');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting AI blog generation with:', { title: title.trim() || 'Auto-generate', shortDescription: shortDescription.trim() });
      
      const result = await generateBlogDescription({
        title: title.trim() || undefined,
        shortDescription: shortDescription.trim()
      });
      
      console.log('AI blog generation successful:', result);
      setGeneratedTitle(result.title);
      setGeneratedContent(result.description);
      setSeoKeywords(result.seoKeywords);
      setGeneratedMetaDescription(result.meta_description || '');
      setGeneratedMetaKeywords(result.meta_keywords || '');
      setGeneratedFocusKeyword(result.focus_keyword || '');
      setStep('generated');
      toast.success('SEO-optimized blog content generated successfully!');
    } catch (error: any) {
      console.error('Generation error details:', {
        error,
        message: error?.message,
        stack: error?.stack
      });
      toast.error(error?.message || 'Failed to generate blog content. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseGenerated = () => {
    if (generatedContent) {
      onGenerated(
        generatedTitle || title, 
        generatedContent,
        generatedMetaDescription,
        generatedMetaKeywords,
        generatedFocusKeyword
      );
      handleClose();
    }
  };

  const handleClose = () => {
    setTitle('');
    setShortDescription('');
    setGeneratedTitle('');
    setGeneratedContent('');
    setSeoKeywords([]);
    setGeneratedMetaDescription('');
    setGeneratedMetaKeywords('');
    setGeneratedFocusKeyword('');
    setStep('input');
    onClose();
  };

  const handleRegenerate = () => {
    setGeneratedContent('');
    setStep('input');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <h3 className="text-lg font-medium text-gray-900">Generate Blog Post with AI</h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {step === 'input' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title (Optional - AI will generate SEO-optimized title if left empty)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Top 10 Network Marketing Strategies for Success (or leave empty for AI-generated SEO title)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to let AI generate an SEO-optimized title (60-70 characters)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blog Topic Description *
                  </label>
                  <textarea
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="Provide a brief description of the blog topic (minimum 50 characters). This will be used to generate a comprehensive blog post with 5-8 paragraphs."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {shortDescription.length} characters (minimum 50)
                  </p>
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
                        Generate Blog Post
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-sm text-green-800 font-medium mb-2">
                    ✓ SEO-optimized blog content generated successfully!
                  </p>
                  <p className="text-xs text-green-700">
                    Review and edit if needed, then proceed to create your blog post. The content includes proper HTML formatting, headings, and SEO optimization.
                  </p>
                </div>

                {generatedTitle && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Generated SEO Title
                    </label>
                    <input
                      type="text"
                      value={generatedTitle}
                      onChange={(e) => setGeneratedTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-blue-50"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {generatedTitle.length} characters (SEO optimal: 60-70 characters)
                    </p>
                  </div>
                )}

                {/* SEO Fields */}
                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-900">SEO Settings</h4>
                  
                  {generatedMetaDescription && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Meta Description
                      </label>
                      <textarea
                        value={generatedMetaDescription}
                        onChange={(e) => setGeneratedMetaDescription(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-blue-50"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {generatedMetaDescription.length}/160 characters (SEO optimal: 150-160)
                      </p>
                    </div>
                  )}

                  {generatedMetaKeywords && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Meta Keywords (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={generatedMetaKeywords}
                        onChange={(e) => setGeneratedMetaKeywords(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-blue-50"
                        placeholder="keyword1, keyword2, keyword3"
                      />
                    </div>
                  )}

                  {generatedFocusKeyword && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Focus Keyword
                      </label>
                      <input
                        type="text"
                        value={generatedFocusKeyword}
                        onChange={(e) => setGeneratedFocusKeyword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-blue-50"
                        placeholder="Main keyword for SEO"
                      />
                    </div>
                  )}

                  {seoKeywords.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SEO Keywords Detected
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {seoKeywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-md"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generated Blog Content (5-8 paragraphs, ~150-250 words each)
                  </label>
                  <div className="mt-1">
                    <RichTextEditor
                      value={generatedContent}
                      onChange={(value) => setGeneratedContent(value)}
                      className="min-h-[400px]"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {generatedContent ? generatedContent.replace(/<[^>]*>/g, '').split(/\s+/).length : 0} words | {generatedContent ? generatedContent.replace(/<[^>]*>/g, '').length : 0} characters
                  </p>
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
                    disabled={!generatedContent.trim()}
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
























