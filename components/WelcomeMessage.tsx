'use client'

import React from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { badges, getBadgeInfo } from '../utils/badges';

interface UserProfile {
  full_name: string;
  points: number;
}

export function WelcomeMessage() {
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isVisible, setIsVisible] = React.useState(true);

  const loadProfile = React.useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, points')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setProfile(data);
    }
  }, [user]);

  // Set up real-time subscription for profile updates
  React.useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        () => {
          loadProfile();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, loadProfile]);

  // Initial load
  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Auto-dismiss after 5 seconds
  React.useEffect(() => {
    if (profile && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [profile, isVisible]);

  if (!user || !profile || !isVisible) return null;

  const badge = getBadgeInfo(profile.points);
  const nextBadge = badges.find(b => b.minPoints > profile.points);
  const progressPercentage = nextBadge 
    ? Math.min((profile.points / nextBadge.minPoints) * 100, 100)
    : 100;

  return (
    <div 
      className={`fixed top-3 left-3 right-3 mx-auto max-w-[360px] sm:top-20 sm:left-auto sm:right-8 sm:mx-0 sm:max-w-none sm:w-[340px] z-50 transform transition-all duration-500 ease-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+1rem)] opacity-0'
      }`}
    >
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-lg shadow-2xl overflow-hidden border border-blue-400/30">
        {/* Golden decorative border */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent pointer-events-none" />
        
        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2.5 right-2.5 z-10 text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1.5 sm:p-1 transition-all duration-200"
          aria-label="Close"
        >
          <X className="h-4 w-4 sm:h-4 sm:w-4" />
        </button>

        {/* Content */}
        <div className="p-4 sm:p-4.5 relative">
          {/* Welcome message */}
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 text-center">
            Welcome back, {profile.full_name}!
          </h3>

          {/* Badge section with golden crown */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative mb-2">
              <div className="text-4xl sm:text-4xl animate-pulse filter drop-shadow-lg">
                {badge.icon}
              </div>
              {/* Golden glow effect */}
              <div className="absolute inset-0 text-4xl sm:text-4xl opacity-50 blur-sm">
                {badge.icon}
              </div>
            </div>
            <span className="text-xl sm:text-xl font-bold bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
              {badge.name}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="bg-blue-900/50 rounded-full h-3 sm:h-3 w-full overflow-hidden border border-blue-400/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${progressPercentage}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>

          {/* Points information */}
          <p className="text-xs sm:text-sm text-blue-100 text-center font-medium">
            You have <span className="text-yellow-300 font-bold">{profile.points}</span> points
            {nextBadge && (
              <span className="block mt-1">
                <span className="text-yellow-300 font-bold">{nextBadge.minPoints - profile.points}</span> points to{' '}
                <span className="text-yellow-300 font-bold">{nextBadge.name}</span>
              </span>
            )}
          </p>
        </div>

        {/* Bottom golden accent line */}
        <div className="h-0.5 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400" />
      </div>

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}