'use client'

import React from 'react';
import { ChatPopup } from './ChatPopup';
import { OnlineUsers } from './OnlineUsers';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Chat {
  userId: string;
  username: string;
  imageUrl?: string;
}

export function ChatContainer() {
  const { user } = useAuth();
  const [activeChats, setActiveChats] = React.useState<Chat[]>([]);
  const [onlineStatuses, setOnlineStatuses] = React.useState<Record<string, boolean>>({});
  const [typingUsers, setTypingUsers] = React.useState<Record<string, boolean>>({});
  const [typingTimeout, setTypingTimeout] = React.useState<Record<string, NodeJS.Timeout>>({});
  const [initialLoadDone, setInitialLoadDone] = React.useState(false);
  const [showChat, setShowChat] = React.useState(false);
  const typingChannelRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (!user || !showChat) return;

    const loadInitialChats = async () => {
      await loadChats();
      setInitialLoadDone(true);
    };

    loadInitialChats();

    // Subscribe to real-time chat updates
    const messageSubscription = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        // Explicitly type payload as any to satisfy TypeScript during build
        (payload: any) => {
          const row = payload?.new as { sender_id?: string; recipient_id?: string } | null;
          if (!row) return;
          if (row.sender_id === user.id || row.recipient_id === user.id) {
            void loadChats();
          }
        },
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingSubscription = supabase
      .channel('typing_indicators')
      .on(
        'broadcast',
        { event: 'typing' },
        ({ payload }) => {
          if (payload.userId !== user.id) {
            setTypingUsers(prev => ({ ...prev, [payload.userId]: true }));
            setTimeout(() => {
              setTypingUsers(prev => ({ ...prev, [payload.userId]: false }));
            }, 3000);
          }
        }
      )
      .subscribe();
    typingChannelRef.current = typingSubscription;

    // Subscribe to online status changes
    const onlineSubscription = supabase
      .channel('online_users')
      .on(
        'presence',
        { event: 'sync' },
        () => {
          updateOnlineStatuses();
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
      typingSubscription.unsubscribe();
      onlineSubscription.unsubscribe();
      typingChannelRef.current = null;
    };
  }, [user, showChat]);

  const loadChats = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          sender_id,
          recipient_id,
          sender:profiles!sender_id(username, image_url),
          recipient:profiles!recipient_id(username, image_url)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        const errorMessage = handleSupabaseError(error, 'Error loading chats');
        toast.error(errorMessage);
        return;
      }

      const uniqueChats = new Map<string, Chat>();
      
      data?.forEach((message: any) => {
        const isRecipient = message.sender_id === user.id;
        const rawOtherUser = isRecipient ? message.recipient : message.sender;
        const otherUser = (Array.isArray(rawOtherUser) ? rawOtherUser[0] : rawOtherUser) as {
          username?: string;
          image_url?: string;
        } | null;
        const userId: string = isRecipient ? message.recipient_id : message.sender_id;

        if (!userId || !otherUser) return;

        if (!uniqueChats.has(userId)) {
          uniqueChats.set(userId, {
            userId,
            username: otherUser.username ?? '',
            imageUrl: otherUser.image_url ?? undefined,
          });
        }
      });

      setActiveChats(Array.from(uniqueChats.values()));
      updateOnlineStatuses();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading chats');
      toast.error(errorMessage);
      console.error('Error loading chats:', error);
    }
  };

  const updateOnlineStatuses = async () => {
    if (activeChats.length === 0) return;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('profiles')
      .select('id, last_seen')
      .in('id', activeChats.map(chat => chat.userId))
      .gt('last_seen', fiveMinutesAgo);

    if (data) {
      const statuses: Record<string, boolean> = {};
      data.forEach(profile => {
        statuses[profile.id] = true;
      });
      setOnlineStatuses(statuses);
    }
  };

  const handleTyping = async (userId: string) => {
    if (!typingTimeout[userId]) {
      // IMPORTANT: Reuse the existing subscribed channel.
      // Creating a new channel per keystroke leaks realtime connections and will overload Supabase.
      if (!typingChannelRef.current) return;

      await typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user?.id }
      });

      const timeout = setTimeout(() => {
        setTypingTimeout(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[userId];
          return newTimeouts;
        });
      }, 3000);

      setTypingTimeout(prev => ({
        ...prev,
        [userId]: timeout
      }));
    }
  };

  const closeChat = (userId: string) => {
    setActiveChats(prev => prev.filter(chat => chat.userId !== userId));
    setOnlineStatuses(prev => {
      const newStatuses = { ...prev };
      delete newStatuses[userId];
      return newStatuses;
    });
  };

  const startChat = async (userId: string, username: string, imageUrl?: string) => {
    setShowChat(true);
    if (!initialLoadDone) return;
    if (!activeChats.find(chat => chat.userId === userId)) {
      setActiveChats(prev => [...prev, { userId, username, imageUrl }]);
      updateOnlineStatuses();
    }
  };

  React.useEffect(() => {
    if (!initialLoadDone) return;

    const handleStartChat = (event: CustomEvent) => {
      const { userId, username, imageUrl } = event.detail;
      startChat(userId, username, imageUrl);
    };

    window.addEventListener('startChat', handleStartChat as EventListener);
    return () => {
      window.removeEventListener('startChat', handleStartChat as EventListener);
    };
  }, [initialLoadDone]);

  if (!user) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50">
      {/* Online Users Button */}
      <div className="fixed bottom-4 right-6">
        <OnlineUsers onStartChat={startChat} />
      </div>
      
      {/* Chat Windows */}
      {showChat && (
        <div className="fixed bottom-0 right-24 flex items-end space-x-4 p-4">
          {activeChats.map((chat) => (
            <ChatPopup
              key={`chat-${chat.userId}`}
              recipientId={chat.userId}
              recipientName={chat.username}
              recipientImage={chat.imageUrl}
              onClose={() => closeChat(chat.userId)}
              isOnline={onlineStatuses[chat.userId] || false}
              isTyping={typingUsers[chat.userId] || false}
              onTyping={() => handleTyping(chat.userId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}