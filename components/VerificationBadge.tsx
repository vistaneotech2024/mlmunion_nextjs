import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface VerificationBadgeProps {
  isVerified: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function VerificationBadge({ isVerified, size = 'md', showLabel = true }: VerificationBadgeProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const badgeClasses = isVerified
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClasses}`}>
      {isVerified ? (
        <CheckCircle className={`${sizeClasses[size]} text-green-500 mr-1`} />
      ) : (
        <XCircle className={`${sizeClasses[size]} text-gray-500 mr-1`} />
      )}
      {showLabel && (
        <span>{isVerified ? 'Verified' : 'Unverified'}</span>
      )}
    </div>
  );
}