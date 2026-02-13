'use client'

import React from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

interface CompanyStats {
  totalCompanies: number;
  approvedCompanies: number;
  pendingCompanies: number;
  recentlyAdded: number;
}

export function CompaniesReport() {
  const [stats, setStats] = React.useState<CompanyStats>({
    totalCompanies: 0,
    approvedCompanies: 0,
    pendingCompanies: 0,
    recentlyAdded: 0
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
        { count: totalCompanies },
        { count: approvedCompanies },
        { count: pendingCompanies },
        { count: recentlyAdded }
      ] = await Promise.all([
        supabase.from('mlm_companies').select('*', { count: 'exact', head: true }),
        supabase.from('mlm_companies').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('mlm_companies').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('mlm_companies').select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString())
      ]);

      setStats({
        totalCompanies: totalCompanies || 0,
        approvedCompanies: approvedCompanies || 0,
        pendingCompanies: pendingCompanies || 0,
        recentlyAdded: recentlyAdded || 0
      });
    } catch (error) {
      console.error('Error loading company stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const exportReport = () => {
    // Implementation for exporting report
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
        <h2 className="text-lg font-semibold text-gray-900">Company Statistics</h2>
        <button
          onClick={exportReport}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link 
          href="/admin/companies?filter=all"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Companies</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalCompanies}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/companies?filter=approved"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.approvedCompanies}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/companies?filter=pending"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingCompanies}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/companies?filter=recent"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last 30 Days</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.recentlyAdded}</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}