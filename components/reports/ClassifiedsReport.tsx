'use client'

import React from 'react';
import { supabase } from '@/lib/supabase';
import { MessageSquare, TrendingUp, Tag, Users, Star } from 'lucide-react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

interface ClassifiedStats {
  totalClassifieds: number;
  premiumClassifieds: number;
  totalConnections: number;
  recentClassifieds: number;
  activeClassifieds: number;
  categoryBreakdown: { [key: string]: number };
}

export function ClassifiedsReport() {
  const [stats, setStats] = React.useState<ClassifiedStats>({
    totalClassifieds: 0,
    premiumClassifieds: 0,
    totalConnections: 0,
    recentClassifieds: 0,
    activeClassifieds: 0,
    categoryBreakdown: {}
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
        { count: totalClassifieds },
        { count: premiumClassifieds },
        { count: recentClassifieds },
        { data: connections },
        { data: categories }
      ] = await Promise.all([
        supabase.from('classifieds').select('*', { count: 'exact', head: true }),
        supabase.from('classifieds').select('*', { count: 'exact', head: true }).eq('is_premium', true),
        supabase.from('classifieds').select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('classified_connections').select('*', { count: 'exact' }),
        supabase.from('classifieds').select('category')
      ]);

      // Calculate category breakdown
      const breakdown: { [key: string]: number } = {};
      categories?.forEach(item => {
        if (item.category) {
          breakdown[item.category] = (breakdown[item.category] || 0) + 1;
        }
      });

      setStats({
        totalClassifieds: totalClassifieds || 0,
        premiumClassifieds: premiumClassifieds || 0,
        totalConnections: connections?.length || 0,
        recentClassifieds: recentClassifieds || 0,
        activeClassifieds: totalClassifieds || 0, // You can modify this based on your active/inactive logic
        categoryBreakdown: breakdown
      });
    } catch (error) {
      console.error('Error loading classified stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const exportReport = () => {
    const reportData = [
      ['Metric', 'Count'],
      ['Total Classifieds', stats.totalClassifieds],
      ['Premium Classifieds', stats.premiumClassifieds],
      ['Total Connections', stats.totalConnections],
      ['Recent Classifieds (30 days)', stats.recentClassifieds],
      ['Active Classifieds', stats.activeClassifieds],
      [''],
      ['Category Breakdown', ''],
      ...Object.entries(stats.categoryBreakdown).map(([category, count]) => [category, count])
    ];

    const ws = XLSX.utils.aoa_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Classifieds Report');
    XLSX.writeFile(wb, 'classifieds_report.xlsx');
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
        <h2 className="text-lg font-semibold text-gray-900">Classifieds Statistics</h2>
        <button
          onClick={exportReport}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link 
          href="/admin/classifieds?filter=all"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Classifieds</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalClassifieds}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/classifieds?filter=premium"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Premium</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.premiumClassifieds}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/classifieds?filter=connections"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Connections</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalConnections}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/classifieds?filter=recent"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last 30 Days</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.recentClassifieds}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
            <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">{category}</span>
              <span className="font-semibold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}