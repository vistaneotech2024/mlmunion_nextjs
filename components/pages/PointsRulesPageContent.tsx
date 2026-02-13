'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, ArrowLeft, Clock, UserPlus, Link as LinkIcon } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';

interface PointActivity {
  id: string;
  action: string;
  points: number;
  description: string;
}

interface PointsHistory {
  id: string;
  points: number;
  description: string;
  created_at: string;
  activity: {
    action: string;
    description: string;
  } | null;
}

export function PointsRulesPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [pointActivities, setPointActivities] = React.useState<PointActivity[]>([]);
  const [pointsHistory, setPointsHistory] = React.useState<PointsHistory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [referralLink, setReferralLink] = React.useState('');
  const [copyingReferral, setCopyingReferral] = React.useState(false);
  const [referralCopied, setReferralCopied] = React.useState(false);
  const [userProfile, setUserProfile] = React.useState<{ username: string } | null>(null);

  React.useEffect(() => {
    loadPointActivities();
    if (user) {
      loadPointsHistory();
      loadUserProfile();
    }
  }, [user]);

  async function loadUserProfile() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      if (!error && data) setUserProfile(data);
    } catch (e) {
      console.error('Error loading user profile:', e);
    }
  }

  React.useEffect(() => {
    if (user && userProfile?.username && typeof window !== 'undefined') {
      setReferralLink(`${window.location.origin}/signup?ref=${encodeURIComponent(userProfile.username)}`);
    } else {
      setReferralLink('');
    }
  }, [user, userProfile]);

  async function handleCopyReferralLink() {
    if (!referralLink) return;
    try {
      setCopyingReferral(true);
      await navigator.clipboard.writeText(referralLink);
      setReferralCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setReferralCopied(false), 2000);
    } catch (e) {
      console.error('Error copying referral link:', e);
      toast.error('Failed to copy referral link. You can copy it manually.');
    } finally {
      setCopyingReferral(false);
    }
  }

  async function loadPointActivities() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('point_activities')
        .select('*')
        .order('points', { ascending: false });
      if (error) throw error;
      setPointActivities(data || []);
    } catch (e: any) {
      console.error('Error loading point activities:', e);
      toast.error('Error loading points rules');
    } finally {
      setLoading(false);
    }
  }

  async function loadPointsHistory() {
    if (!user) return;
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('points_history')
        .select(
          `id,points,description,created_at,activity:point_activities(action,description)`
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        points: item.points,
        description: item.description || item.activity?.description || 'Points awarded',
        created_at: item.created_at,
        activity: item.activity,
      }));
      setPointsHistory(transformedData);
    } catch (e: any) {
      console.error('Error loading points history:', e);
      toast.error('Error loading points history');
    } finally {
      setLoadingHistory(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
          <div className="mb-4">
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="bg-gray-100 border-l-4 border-gray-300 p-3 mb-4 rounded animate-pulse">
            <div className="h-4 w-full bg-gray-200 rounded" />
          </div>
          <div className={`grid gap-4 ${user ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {user && (
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="h-48 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="divide-y divide-gray-200">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
                          <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                        </div>
                        <div className="h-8 w-16 bg-gray-200 rounded-full animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="divide-y divide-gray-200">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                      </div>
                      <div className="h-10 w-20 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-indigo-600 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-white p-2 rounded-full border-2 border-yellow-400 shadow-sm">
              <img src="/coin.gif" alt="Coins" className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Points Rules</h1>
              <p className="text-gray-600 mt-1 text-sm">
                Discover how to earn points through various activities
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <Trophy className="h-4 w-4 text-blue-400" />
            </div>
            <div className="ml-2">
              <p className="text-xs text-blue-700">
                <strong>How it works:</strong> Complete activities to earn points. Points help you level
                up, unlock badges, and gain recognition in the community!
              </p>
            </div>
          </div>
        </div>

        {user && (
          <div className="bg-white shadow-sm rounded-lg border border-indigo-100 p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <UserPlus className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Invite friends & earn 250 points
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Share your personal referral link. When a friend signs up successfully using your
                    link, you earn <span className="font-semibold text-yellow-600">250 points</span>.
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[260px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Your referral link
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center">
                      <LinkIcon className="h-4 w-4 text-gray-400" />
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={referralLink || 'Loading...'}
                      className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-md text-xs sm:text-sm bg-gray-50 text-gray-700"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyReferralLink}
                    disabled={!referralLink || copyingReferral}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {referralCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`grid gap-4 ${user ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {user && (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden order-1 lg:order-1">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Your Points History</h2>
                </div>
              </div>

              {pointsHistory.length > 0 && !loadingHistory && (
                <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-yellow-50">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart
                      data={pointsHistory
                        .slice(0, 10)
                        .reverse()
                        .map((h, idx) => ({
                          date: new Date(h.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          }),
                          points: h.points,
                          fullDate: new Date(h.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }),
                          activity: h.activity?.action
                            ? h.activity.action
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (l: string) => l.toUpperCase())
                            : 'Points Awarded',
                          description: h.description,
                          index: idx,
                        }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FCD34D" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#6B7280' }}
                        stroke="#9CA3AF"
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} stroke="#9CA3AF" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload?.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border-2 border-yellow-400 rounded-lg shadow-lg p-3 min-w-[200px]">
                                <div className="flex items-center space-x-2 mb-2">
                                  <div className="bg-white p-1 rounded-full border-2 border-yellow-400">
                                    <img src="/coin.gif" alt="Coin" className="h-4 w-4" />
                                  </div>
                                  <span className="font-bold text-lg text-gray-800">
                                    +{data.points} points
                                  </span>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="text-gray-600">
                                    <span className="font-semibold">Activity:</span> {data.activity}
                                  </div>
                                  <div className="text-gray-500">
                                    <span className="font-semibold">Date:</span> {data.fullDate}
                                  </div>
                                  {data.description && (
                                    <div className="text-gray-500 italic">{data.description}</div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="points"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPoints)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {loadingHistory ? (
                  <div className="divide-y divide-gray-200">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
                            <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                          </div>
                          <div className="h-8 w-16 bg-gray-200 rounded-full animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pointsHistory.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Trophy className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      No points history yet. Start earning points by completing activities!
                    </p>
                  </div>
                ) : (
                  pointsHistory.map((history) => (
                    <div key={history.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="flex-shrink-0">
                              <div className="bg-white p-1.5 rounded-full border-2 border-yellow-400 shadow-sm">
                                <img src="/coin.gif" alt="Coin" className="h-4 w-4" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {history.description}
                              </p>
                              {history.activity && (
                                <p className="text-xs text-gray-500 mt-0.5 capitalize">
                                  {history.activity.action.replace(/_/g, ' ')}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(history.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <div className="bg-white border-2 border-yellow-400 text-gray-800 px-3 py-1.5 rounded-full font-bold text-sm shadow-sm">
                            +{history.points}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div
            className={`bg-white shadow-sm rounded-lg overflow-hidden ${
              user ? 'order-2 lg:order-2' : 'order-1'
            }`}
          >
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Points Rules</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {pointActivities.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Trophy className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No point activities found.</p>
                </div>
              ) : (
                pointActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="flex-shrink-0">
                            <div className="bg-white p-1.5 rounded-full border-2 border-yellow-400 shadow-sm">
                              <img src="/coin.gif" alt="Coin" className="h-5 w-5" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-900 capitalize">
                              {activity.action.replace(/_/g, ' ')}
                            </h3>
                            <p className="text-gray-600 text-sm mt-0.5">{activity.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <div className="bg-white border-2 border-yellow-400 text-gray-800 px-3 py-1.5 rounded-full font-bold text-base shadow-sm">
                          +{activity.points}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Points are awarded automatically when you complete activities. Check your dashboard to
            track your progress!
          </p>
        </div>
      </div>
    </div>
  );
}
