'use client';

import React from 'react';
import { supabase } from '@/lib/supabase';

interface AboutContent {
  id: string;
  content: string;
  last_updated: string;
}

export function AboutUsPageContent() {
  const [content, setContent] = React.useState<AboutContent | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadContent();
  }, []);

  async function loadContent() {
    try {
      const { data, error } = await supabase
        .from('page_content')
        .select('*')
        .eq('page', 'about')
        .single();

      if (error && (error as any).code !== 'PGRST116') throw error;
      setContent(data as AboutContent | null);
    } catch (error) {
      console.error('Error loading about content:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">About Us</h1>
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: content?.content || 'Content coming soon...' }}
            />
            {content?.last_updated && (
              <p className="mt-8 text-sm text-gray-500">
                Last updated: {new Date(content.last_updated).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

