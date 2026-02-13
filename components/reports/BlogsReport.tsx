'use client'

import React from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, TrendingUp, Eye, BarChart2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

interface BlogStats {
  totalPosts: number;
  totalViews: number;
  recentPosts: number;
  publishedPosts: number;
  draftPosts: number;
}

export function BlogsReport() {
  const [stats, setStats] = React.useState<BlogStats>({
    totalPosts: 0,
    totalViews: 0,
    recentPosts: 0,
    publishedPosts: 0,
    draftPosts: 0
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        { count: totalPosts },
        { count: publishedPosts },
        { count: draftPosts },
        { count: recentPosts }
      ] = await Promise.all([
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('published', true),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('published', false),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString())
      ]);

      // For total views, we'll need to implement view tracking in the database
      // For now, we'll use a placeholder
      const totalViews = 0;

      setStats({
        totalPosts: totalPosts || 0,
        totalViews,
        recentPosts: recentPosts || 0,
        publishedPosts: publishedPosts || 0,
        draftPosts: draftPosts || 0
      });
    } catch (error) {
      console.error('Error loading blog stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const exportReport = () => {
    const reportData = [
      ['Metric', 'Count'],
      ['Total Posts', stats.totalPosts],
      ['Published Posts', stats.publishedPosts],
      ['Draft Posts', stats.draftPosts],
      ['Recent Posts (30 days)', stats.recentPosts],
      ['Total Views', stats.totalViews]
    ];

    const ws = XLSX.utils.aoa_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Blog Report');
    XLSX.writeFile(wb, 'blog_report.xlsx');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Blog Statistics</h2>
        <button
          onClick={exportReport}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link 
          href="/admin/blogs?filter=all"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Posts</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalPosts}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/blogs?filter=views"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalViews}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/blogs?filter=recent"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent Posts</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.recentPosts}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/blogs?filter=drafts"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <BarChart2 className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Published/Draft</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.publishedPosts}/{stats.draftPosts}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Additional statistics or charts can be added here */}
    </div>
  );
}