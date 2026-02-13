'use client'

import React from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageCircle, X, Users } from 'lucide-react';
import { ProfileImage } from '../ProfileImage';
import { handleSupabaseError } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface OnlineUser {
  id: string;
  username: string;
  full_name: string;
  image_url?: string;
  last_seen: string;
}

interface OnlineUsersProps {
  onStartChat: (userId: string, username: string, imageUrl?: string) => void;
}

export function OnlineUsers({ onStartChat }: OnlineUsersProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [onlineUsers, setOnlineUsers] = React.useState<OnlineUser[]>([]);
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user?.id) return;

    // Update our own "last_seen" periodically.
    // IMPORTANT: Do NOT subscribe to all other users' profile updates via Realtime here.
    // A high-fanout `profiles` subscription will overload Realtime as your user count grows.
    updateUserPresence();
    const interval = setInterval(updateUserPresence, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.id]);

  // Load online users only when the panel is open.
  React.useEffect(() => {
    if (!user?.id || !isOpen) return;
    loadOnlineUsers();
    const interval = setInterval(loadOnlineUsers, 30_000);
    return () => clearInterval(interval);
  }, [user?.id, isOpen]);

  async function updateUserPresence() {
    if (!user) {
      console.warn('No user found. Skipping updateUserPresence.');
      return;
    }

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        console.warn('No active Supabase session. User probably logged out or session expired.');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        const errorMessage = handleSupabaseError(error, 'Error updating presence');
        console.error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating presence');
      console.error(errorMessage);
    }
  }

  async function loadOnlineUsers() {
    try {
      setLoading(true);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, image_url, last_seen')
        .neq('id', user?.id)
        .gt('last_seen', fiveMinutesAgo)
        .order('username');

      if (error) {
        const errorMessage = handleSupabaseError(error, 'Error loading online users');
        toast.error(errorMessage);
        return;
      }

      setOnlineUsers(data || []);
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading online users');
      toast.error(errorMessage);
      console.error('Error loading online users:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleStartChat = async (onlineUser: OnlineUser) => {
    if (!user) return;
    
    try {
      // Try to create or update the connection (optional, not required for chat)
      // Chat can work without connections, but connections are nice to have
      try {
        const { error: connectionError } = await supabase
          .from('classified_connections')
          .upsert({
            owner_id: onlineUser.id,
            connector_id: user.id,
            status: 'accepted',
            remark: 'Direct chat request'
          }, {
            onConflict: 'owner_id,connector_id'
          });

        if (connectionError) {
          // Don't block chat if connection creation fails
          console.warn('Could not create connection, but continuing with chat:', connectionError);
        }
      } catch (connError) {
        // Connection creation is optional, continue anyway
        console.warn('Connection creation failed, but continuing with chat:', connError);
      }

      // Start the chat
      onStartChat(onlineUser.id, onlineUser.username || onlineUser.full_name, onlineUser.image_url);
      setIsOpen(false); // Close the panel after starting chat
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error starting chat');
      toast.error(errorMessage);
      console.error('Error starting chat:', error);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
      >
        <Users className="h-6 w-6" />
      </button>

      {/* Online Users Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-72 bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-900">Online Users</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : onlineUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No users online
              </div>
            ) : (
              <div className="divide-y">
                {onlineUsers.map((onlineUser) => (
                  <div
                    key={onlineUser.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <ProfileImage
                          imageUrl={onlineUser.image_url}
                          username={onlineUser.username}
                          size="sm"
                        />
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{onlineUser.full_name}</p>
                        <p className="text-sm text-gray-500">@{onlineUser.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartChat(onlineUser)}
                      className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}