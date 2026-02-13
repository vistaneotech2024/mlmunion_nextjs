'use client'

import React from 'react';
import { supabase } from '@/lib/supabase';
import { UserCheck, MapPin, Star, Award, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

interface DirectSellerStats {
  totalSellers: number;
  verifiedSellers: number;
  premiumSellers: number;
  recentSellers: number;
  locationBreakdown: { [key: string]: number };
  specialtyBreakdown: { [key: string]: number };
}

export function DirectSellersReport() {
  const [stats, setStats] = React.useState<DirectSellerStats>({
    totalSellers: 0,
    verifiedSellers: 0,
    premiumSellers: 0,
    recentSellers: 0,
    locationBreakdown: {},
    specialtyBreakdown: {}
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
        { count: totalSellers },
        { count: verifiedSellers },
        { count: premiumSellers },
        { count: recentSellers },
        { data: sellerLocations },
        { data: sellerSpecialties }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_direct_seller', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .eq('is_direct_seller', true)
          .eq('is_verified', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .eq('is_direct_seller', true)
          .eq('is_premium', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .eq('is_direct_seller', true)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase.from('profiles').select('country, state, city').eq('is_direct_seller', true),
        supabase.from('profiles').select('specialties').eq('is_direct_seller', true)
      ]);

      // Calculate location breakdown
      const locationBreakdown: { [key: string]: number } = {};
      sellerLocations?.forEach(seller => {
        if (seller.country) {
          locationBreakdown[seller.country] = (locationBreakdown[seller.country] || 0) + 1;
        }
      });

      // Calculate specialty breakdown
      const specialtyBreakdown: { [key: string]: number } = {};
      sellerSpecialties?.forEach(seller => {
        if (seller.specialties) {
          seller.specialties.forEach((specialty: string) => {
            specialtyBreakdown[specialty] = (specialtyBreakdown[specialty] || 0) + 1;
          });
        }
      });

      setStats({
        totalSellers: totalSellers || 0,
        verifiedSellers: verifiedSellers || 0,
        premiumSellers: premiumSellers || 0,
        recentSellers: recentSellers || 0,
        locationBreakdown,
        specialtyBreakdown
      });
    } catch (error) {
      console.error('Error loading direct seller stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const exportReport = () => {
    const reportData = [
      ['Metric', 'Count'],
      ['Total Direct Sellers', stats.totalSellers],
      ['Verified Sellers', stats.verifiedSellers],
      ['Premium Sellers', stats.premiumSellers],
      ['Recent Sellers (30 days)', stats.recentSellers],
      [''],
      ['Location Breakdown', ''],
      ...Object.entries(stats.locationBreakdown).map(([location, count]) => [location, count]),
      [''],
      ['Specialty Breakdown', ''],
      ...Object.entries(stats.specialtyBreakdown).map(([specialty, count]) => [specialty, count])
    ];

    const ws = XLSX.utils.aoa_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Direct Sellers Report');
    XLSX.writeFile(wb, 'direct_sellers_report.xlsx');
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
        <h2 className="text-lg font-semibold text-gray-900">Direct Sellers Statistics</h2>
        <button
          onClick={exportReport}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link 
          href="/admin/direct-sellers?filter=all"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sellers</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalSellers}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/direct-sellers?filter=verified"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <Award className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.verifiedSellers}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/direct-sellers?filter=premium"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Premium</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.premiumSellers}</p>
            </div>
          </div>
        </Link>

        <Link 
          href="/admin/direct-sellers?filter=recent"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last 30 Days</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.recentSellers}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Location Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.locationBreakdown).map(([location, count]) => (
            <div key={location} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">{location}</span>
              </div>
              <span className="font-semibold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Specialty Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Specialty Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats.specialtyBreakdown).map(([specialty, count]) => (
            <div key={specialty} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 mr-2" />
                <span className="text-gray-600">{specialty}</span>
              </div>
              <span className="font-semibold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}