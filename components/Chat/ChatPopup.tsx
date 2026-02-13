'use client'

import React from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Maximize2, Minimize2, Send, Circle } from 'lucide-react';
import { ProfileImage } from '../ProfileImage';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface ChatPopupProps {
  recipientId: string;
  recipientName: string;
  recipientImage?: string;
  onClose: () => void;
  isOnline?: boolean;
  isTyping?: boolean;
  onTyping?: () => void;
}

export function ChatPopup({ 
  recipientId, 
  recipientName, 
  recipientImage, 
  onClose, 
  isOnline,
  isTyping,
  onTyping 
}: ChatPopupProps) {
  const { user } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [minimized, setMinimized] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!user || !recipientId) return;
    
    loadMessages();
    const subscription = subscribeToMessages();
    return () => {
      subscription.unsubscribe();
    };
  }, [recipientId, user?.id]);

  React.useEffect(() => {
    scrollToBottom();
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function loadMessages() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user?.id},recipient_id.eq.${recipientId}),` +
          `and(sender_id.eq.${recipientId},recipient_id.eq.${user?.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error('Error loading messages');
    } finally {
      setLoading(false);
    }
  }

  function subscribeToMessages() {
    if (!user) return { unsubscribe: () => {} };
    
    const channelName = `chat_popup_${user.id}_${recipientId}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true }
      }
    });
    
    return channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id}))`
        },
        (payload) => {
          if (payload.new) {
            const newMessage = payload.new as Message;
            setMessages(prev => {
              // Check if message already exists to avoid duplicates
              if (prev.some(msg => msg.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();
  }

  async function markMessagesAsRead() {
    if (!user || !recipientId) return;
    
    try {
      const { error } = await supabase.rpc('mark_messages_read', {
        p_recipient_id: user.id,
        p_sender_id: recipientId
      });
      
      if (error) {
        console.error('Error marking messages as read:', error);
      } else {
        // Update local state to reflect read status
        setMessages(prev => prev.map(msg => 
          msg.sender_id === recipientId && !msg.read_at
            ? { ...msg, read_at: new Date().toISOString() }
            : msg
        ));
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    onTyping?.();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !recipientId) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            recipient_id: recipientId,
            content: messageContent
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Add message to local state immediately
      if (data) {
        setMessages(prev => [...prev, data as Message]);
      }
      
      inputRef.current?.focus();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Error sending message');
      // Restore message on error
      setNewMessage(messageContent);
    }
  };

  return (
    <div className={`w-72 md:w-80 bg-white rounded-t-lg shadow-lg ${minimized ? 'h-12' : 'h-[400px]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-indigo-600 text-white rounded-t-lg cursor-pointer"
           onClick={() => setMinimized(!minimized)}>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <ProfileImage
              imageUrl={recipientImage}
              username={recipientName}
              size="sm"
            />
            {isOnline && (
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div>
            <span className="font-medium">{recipientName}</span>
            {isTyping && (
              <p className="text-xs text-indigo-100">typing...</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {minimized ? (
            <Maximize2 className="h-4 w-4" />
          ) : (
            <Minimize2 className="h-4 w-4" />
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="hover:text-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="h-[300px] overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${
                    message.sender_id === user?.id
                      ? 'bg-indigo-600 text-white rounded-l-lg rounded-tr-lg'
                      : 'bg-gray-100 text-gray-900 rounded-r-lg rounded-tl-lg'
                  } px-4 py-2`}>
                    <p className="break-words">{message.content}</p>
                    <div className="flex items-center justify-end mt-1 space-x-2">
                      <span className="text-xs opacity-75">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                      {message.sender_id === user?.id && (
                        <span className="text-xs">
                          {message.read_at ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-white">
            <div className="flex items-center space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="p-2 text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}