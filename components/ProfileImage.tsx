import React from 'react';
import { User } from 'lucide-react';

interface ProfileImageProps {
  imageUrl?: string | null;
  username: string;
  size?: 'sm' | 'md' | 'lg';
  showInfo?: boolean;
  fullName?: string;
}

export function ProfileImage({ imageUrl, username, size = 'md', showInfo = false, fullName }: ProfileImageProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex items-center ${showInfo ? 'space-x-4' : ''}`}>
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className={`${iconSizes[size]} text-indigo-600`} />
        )}
      </div>
      {showInfo && (
        <div>
          {fullName && <h3 className="font-semibold text-gray-900">{fullName}</h3>}
          <p className="text-sm text-gray-500">@{username}</p>
        </div>
      )}
    </div>
  );
}