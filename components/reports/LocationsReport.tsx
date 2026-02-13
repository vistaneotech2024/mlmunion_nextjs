'use client'

import React from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, TrendingUp, ArrowDown, ArrowUp } from 'lucide-react';
import * as XLSX from 'xlsx';

interface LocationStats {
  totalCountries: number;
  totalStates: number;
  totalCities: number;
  activeLocations: number;
  inactiveLocations: number;
  recentlyAdded: number;
}

export function LocationsReport() {
  const [stats, setStats] = React.useState<LocationStats>({
    totalCountries: 0,
    totalStates: 0,
    totalCities: 0,
    activeLocations: 0,
    inactiveLocations: 0,
    recentlyAdded: 0
  });

  React.useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [countries, states, cities] = await Promise.all([
      supabase.from('countries').select('*', { count: 'exact' }),
      supabase.from('states').select('*', { count: 'exact' }),
      supabase.from('cities').select('*', { count: 'exact' })
    ]);

    const activeLocations = (countries.data?.filter(c => c.is_active).length || 0) +
                           (states.data?.filter(s => s.is_active).length || 0) +
                           (cities.data?.filter(c => c.is_active).length || 0);

    const totalLocations = (countries.count || 0) + (states.count || 0) + (cities.count || 0);

    setStats({
      totalCountries: countries.count || 0,
      totalStates: states.count || 0,
      totalCities: cities.count || 0,
      activeLocations,
      inactiveLocations: totalLocations - activeLocations,
      recentlyAdded: 0 // You can implement this based on created_at timestamps
    });
  }

  const exportReport = () => {
    const reportData = [
      ['Location Type', 'Total', 'Active', 'Inactive'],
      ['Countries', stats.totalCountries, stats.activeLocations, stats.inactiveLocations],
      ['States', stats.totalStates, 0, 0],
      ['Cities', stats.totalCities, 0, 0]
    ];

    const ws = XLSX.utils.aoa_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Locations Report');
    XLSX.writeFile(wb, 'locations_report.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Location Statistics</h2>
        <button
          onClick={exportReport}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <MapPin className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Locations</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalCountries + stats.totalStates + stats.totalCities}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Countries: {stats.totalCountries}</span>
              <span>States: {stats.totalStates}</span>
              <span>Cities: {stats.totalCities}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Locations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeLocations}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm text-green-600">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span>{((stats.activeLocations / (stats.activeLocations + stats.inactiveLocations)) * 100).toFixed(1)}% active</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <ArrowDown className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactive Locations</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inactiveLocations}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm text-red-600">
              <ArrowDown className="h-4 w-4 mr-1" />
              <span>{((stats.inactiveLocations / (stats.activeLocations + stats.inactiveLocations)) * 100).toFixed(1)}% inactive</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}