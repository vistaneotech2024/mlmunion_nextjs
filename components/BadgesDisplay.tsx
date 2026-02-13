import React from 'react';
import { Trophy, Star, Award } from 'lucide-react';
import { getBadgeInfo } from '../utils/badges';

interface BadgesDisplayProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
}

export function BadgesDisplay({ points, size = 'md', showPoints = true }: BadgesDisplayProps) {
  const badge = getBadgeInfo(points);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`inline-flex items-center space-x-2 ${textClasses[size]}`}>
      <div className={`flex items-center px-2.5 py-0.5 rounded-full font-medium bg-${badge.color}-100 text-${badge.color}-800 border border-${badge.color}-200`}>
        <span className="mr-1">{badge.icon}</span>
        <span>{badge.name}</span>
      </div>
      {showPoints && (
        <div className="flex items-center text-gray-500">
          <Trophy className={`${sizeClasses[size]} mr-1`} />
          <span>{points} points</span>
        </div>
      )}
    </div>
  );
}