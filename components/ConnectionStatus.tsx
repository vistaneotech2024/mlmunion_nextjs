'use client'

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { refreshConnection, isSupabaseConnected } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function ConnectionStatus() {
  const [isRecovering, setIsRecovering] = React.useState(false);

  const handleRetry = async () => {
    setIsRecovering(true);
    try {
      refreshConnection();
      const connected = await isSupabaseConnected();
      if (connected) {
        toast.success('Connection restored!');
        // Component will unmount when connection is restored
      } else {
        toast.error('Connection still unavailable. Please refresh the page.');
      }
    } catch (error) {
      toast.error('Failed to restore connection. Please refresh the page.');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-start z-50 max-w-sm">
      <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium mb-1">Database Connection Error</p>
        <p className="text-sm mb-2">Unable to connect to the database. Data may not load correctly.</p>
        <button
          onClick={handleRetry}
          disabled={isRecovering}
          className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${isRecovering ? 'animate-spin' : ''}`} />
          {isRecovering ? 'Retrying...' : 'Retry Connection'}
        </button>
      </div>
    </div>
  );
}