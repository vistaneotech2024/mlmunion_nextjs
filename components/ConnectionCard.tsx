'use client'

import React from 'react';
import { ProfileImage } from './ProfileImage';
import { MessageCircle, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ConnectionCardProps {
  connection: {
    id: string;
    status: string;
    user: {
      id: string;
      username: string;
      full_name: string;
      image_url?: string;
      last_seen: string;
    };
    remark?: string;
    created_at: string;
  };
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onRemove?: (id: string) => void;
  onStartChat?: (userId: string, username: string, imageUrl?: string) => void;
  isPending?: boolean;
}

export function ConnectionCard({ 
  connection, 
  onAccept, 
  onReject, 
  onRemove, 
  onStartChat,
  isPending = false
}: ConnectionCardProps) {
  const isOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  const online = isOnline(connection.user.last_seen);

  return (
    <div className="bg-white shadow-sm p-3 md:p-6 hover:shadow-md transition-shadow rounded-lg border border-gray-200">
      <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
        <div className="relative flex-shrink-0">
          <ProfileImage
            imageUrl={connection.user.image_url}
            username={connection.user.username}
            size="md"
          />
          {online && (
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 md:h-3 md:w-3 bg-green-400 rounded-full border-2 border-white"></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm md:text-base text-gray-900 truncate">{connection.user.full_name}</h3>
          <p className="text-xs md:text-sm text-gray-500 truncate">@{connection.user.username}</p>
          <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1">
            {isPending 
              ? `Requested ${new Date(connection.created_at).toLocaleDateString()}`
              : `Connected since ${new Date(connection.created_at).toLocaleDateString()}`
            }
          </p>
        </div>
      </div>
      
      {connection.remark && (
        <div className="mb-3 md:mb-4 p-2 md:p-3 bg-gray-50 rounded-md text-gray-700 text-xs md:text-sm">
          <p className="italic line-clamp-2">&ldquo;{connection.remark}&rdquo;</p>
        </div>
      )}
      
      <div className="flex justify-end space-x-1.5 md:space-x-2">
        {isPending ? (
          <>
            <button
              onClick={() => onAccept?.(connection.id)}
              className="p-1.5 md:p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
              title="Accept"
            >
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <button
              onClick={() => onReject?.(connection.id)}
              className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Reject"
            >
              <XCircle className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onStartChat?.(connection.user.id, connection.user.username, connection.user.image_url)}
              className="p-1.5 md:p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              title="Start Chat"
            >
              <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <button
              onClick={() => onRemove?.(connection.id)}
              className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Remove Connection"
            >
              <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}