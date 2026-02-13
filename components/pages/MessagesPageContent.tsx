'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { ProfileImage } from '@/components/ProfileImage';
import { Search, Send, Star, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  userId: string;
  username: string;
  fullName: string;
  imageUrl?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  lastSeen?: string;
}

export function MessagesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [manualConversations, setManualConversations] = React.useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const manualConversationsRef = React.useRef<Conversation[]>([]);

  const mergeConversations = React.useCallback((fetched: Conversation[], manual: Conversation[]) => {
    const map = new Map<string, Conversation>();
    fetched.forEach((c) => map.set(c.userId, c));
    manual.forEach((c) => {
      if (!map.has(c.userId)) map.set(c.userId, c);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, []);

  React.useEffect(() => {
    manualConversationsRef.current = manualConversations;
  }, [manualConversations]);

  React.useEffect(() => {
    if (manualConversations.length === 0) return;
    setConversations((prev) => mergeConversations(prev, manualConversations));
  }, [manualConversations, mergeConversations]);

  const upsertManualConversation = React.useCallback(
    async (payload: { userId: string; username?: string; fullName?: string; imageUrl?: string }) => {
      const { userId, username, fullName, imageUrl } = payload;
      if (!userId) return;

      let userFullName = fullName || username || 'Unknown';
      let userImageUrl = imageUrl;
      let userUsername = username || 'Unknown';
      let lastSeen: string | undefined;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, image_url, username, last_seen')
          .eq('id', userId)
          .single();
        if (profileData) {
          userFullName = profileData.full_name || userFullName;
          userImageUrl = profileData.image_url || userImageUrl;
          userUsername = profileData.username || userUsername;
          lastSeen = profileData.last_seen || undefined;
        }
      } catch {
        // use passed values
      }

      const manualConv: Conversation = {
        userId,
        username: userUsername,
        fullName: userFullName,
        imageUrl: userImageUrl,
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isOnline: false,
        lastSeen,
      };

      setManualConversations((prev) => {
        const exists = prev.some((c) => c.userId === userId);
        if (exists) return prev.map((c) => (c.userId === userId ? { ...c, ...manualConv } : c));
        return [manualConv, ...prev];
      });
    },
    []
  );

  const urlUserIdProcessedRef = React.useRef(false);
  // Open conversation from URL query (e.g. /messages?userId=xxx&username=yyy)
  React.useEffect(() => {
    if (!user || authLoading) return;
    const userId = searchParams.get('userId');
    if (!userId || urlUserIdProcessedRef.current) return;
    urlUserIdProcessedRef.current = true;
    const username = searchParams.get('username') || undefined;
    const fullName = searchParams.get('fullName') || undefined;
    const imageUrl = searchParams.get('imageUrl') || undefined;
    setSelectedConversation(userId);
    upsertManualConversation({ userId, username, fullName, imageUrl });
    router.replace('/messages', { scroll: false });
  }, [user, authLoading, searchParams]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    loadConversations();
  }, [user, authLoading]);

  React.useEffect(() => {
    if (selectedConversation && user?.id) {
      loadMessages(selectedConversation);
      const subscription = subscribeToMessages(selectedConversation);
      return () => {
        void subscription.unsubscribe();
      };
    }
  }, [selectedConversation, user?.id]);

  React.useEffect(() => {
    scrollToBottom();
    if (messages.length > 0 && selectedConversation) markMessagesAsRead(selectedConversation);
  }, [messages, selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function loadConversations() {
    if (!user) return;
    try {
      setLoading(true);
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(
          `id,sender_id,recipient_id,content,created_at,read_at,sender:profiles!sender_id(id,username,full_name,image_url,last_seen),recipient:profiles!recipient_id(id,username,full_name,image_url,last_seen)`
        )
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      const conversationMap = new Map<
        string,
        {
          userId: string;
          username: string;
          fullName: string;
          imageUrl?: string;
          lastMessage: string;
          lastMessageTime: string;
          unreadCount: number;
          lastSeen?: string;
        }
      >();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      messagesData?.forEach((msg: any) => {
        const isSender = msg.sender_id === user.id;
        const otherUser = isSender ? msg.recipient : msg.sender;
        const userId = isSender ? msg.recipient_id : msg.sender_id;
        if (!otherUser || !userId) return;

        const existing = conversationMap.get(userId);
        const messageTime = new Date(msg.created_at);
        const isUnread = !isSender && !msg.read_at;

        if (!existing || messageTime > new Date(existing.lastMessageTime)) {
          const isOnline = otherUser.last_seen && new Date(otherUser.last_seen) > new Date(fiveMinutesAgo);
          conversationMap.set(userId, {
            userId,
            username: otherUser.username || 'Unknown',
            fullName: otherUser.full_name || otherUser.username || 'Unknown',
            imageUrl: otherUser.image_url,
            lastMessage: msg.content,
            lastMessageTime: msg.created_at,
            unreadCount: (existing?.unreadCount || 0) + (isUnread ? 1 : 0),
            lastSeen: otherUser.last_seen,
          });
        } else if (isUnread) {
          existing.unreadCount += 1;
        }
      });

      const conversationsList = Array.from(conversationMap.values()).sort(
        (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      const withOnline = conversationsList.map((c) => ({
        ...c,
        isOnline: !!c.lastSeen && new Date(c.lastSeen) > new Date(fiveMinutesAgo),
      }));

      setConversations(mergeConversations(withOnline, manualConversationsRef.current));

      if (!selectedConversation && conversationsList.length > 0 && !searchParams.get('userId')) {
        setSelectedConversation(conversationsList[0].userId);
      }
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast.error(handleSupabaseError(error, 'Error loading conversations'));
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(userId: string) {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error('Error loading messages');
    }
  }

  function subscribeToMessages(userId: string) {
    if (!user) return { unsubscribe: () => {} };
    const channelName = `messages_page_${user.id}_${userId}`;
    const channel = supabase.channel(channelName, { config: { broadcast: { self: true } } });
    return channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id}))`,
        },
        (payload) => {
          if (payload.new) {
            const newMessage = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((msg) => msg.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            loadConversations();
          }
        }
      )
      .subscribe();
  }

  async function markMessagesAsRead(userId: string) {
    if (!user) return;
    try {
      await supabase.rpc('mark_messages_read', {
        p_recipient_id: user.id,
        p_sender_id: userId,
      });
      loadConversations();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedConversation) return;
    const messageContent = newMessage.trim();
    setNewMessage('');
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ sender_id: user.id, recipient_id: selectedConversation, content: messageContent }])
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setMessages((prev) => [...prev, data as Message]);
        loadConversations();
      }
      inputRef.current?.focus();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Error sending message');
      setNewMessage(messageContent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatLastSeen = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const diffMs = new Date().getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 5) return 'Active now';
    if (diffHours < 1) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.fullName.toLowerCase().includes(q) ||
      conv.username.toLowerCase().includes(q) ||
      conv.lastMessage.toLowerCase().includes(q)
    );
  });

  const selectedConv = conversations.find((c) => c.userId === selectedConversation);
  const isOnline =
    selectedConv?.lastSeen && new Date(selectedConv.lastSeen) > new Date(Date.now() - 5 * 60 * 1000);
  const quickReplies = ['How are you?', 'Hello', 'Hi'];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Please log in to view messages</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex max-w-5xl mx-auto" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Left Panel - Conversation List */}
        <div
          className="w-64 md:w-72 border-r border-gray-200 bg-white flex flex-col"
          style={{ height: 'calc(100vh - 120px)' }}
        >
          <div className="px-3 md:px-4 py-3 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Messaging</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conversation) => (
                  <button
                    type="button"
                    key={conversation.userId}
                    onClick={() => setSelectedConversation(conversation.userId)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedConversation === conversation.userId ? 'bg-green-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <ProfileImage
                          imageUrl={conversation.imageUrl}
                          username={conversation.username}
                          size="sm"
                        />
                        {conversation.isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conversation.fullName}
                          </p>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatTime(conversation.lastMessageTime)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-600 truncate">{conversation.lastMessage}</p>
                          {conversation.unreadCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-indigo-600 text-white text-xs font-medium rounded-full flex-shrink-0">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Active Chat */}
        <div className="flex-1 flex flex-col bg-white" style={{ height: 'calc(100vh - 120px)' }}>
          {selectedConversation && selectedConv ? (
            <>
              <div className="px-3 md:px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ProfileImage
                      imageUrl={selectedConv.imageUrl}
                      username={selectedConv.username}
                      size="sm"
                    />
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">{selectedConv.fullName}</h2>
                    <p className="text-xs text-gray-500">
                      {isOnline ? 'Active now' : formatLastSeen(selectedConv.lastSeen)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Star className="h-5 w-5 text-gray-400" />
                  </button>
                  <button type="button" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <MoreVertical className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">No messages yet. Start the conversation!</div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] ${
                          message.sender_id === user.id
                            ? 'bg-indigo-600 text-white rounded-l-lg rounded-tr-lg'
                            : 'bg-gray-100 text-gray-900 rounded-r-lg rounded-tl-lg'
                        } px-3 py-1.5 text-sm`}
                      >
                        <p className="break-words">{message.content}</p>
                        <div className="flex items-center justify-end mt-1 space-x-2">
                          <span className="text-xs opacity-75">{formatTime(message.created_at)}</span>
                          {message.sender_id === user.id && (
                            <span className="text-xs">{message.read_at ? '✓✓' : '✓'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              {messages.length === 0 && (
                <div className="px-3 md:px-4 pb-2">
                  <div className="flex gap-2">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        onClick={() => {
                          setNewMessage(reply);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="px-3 md:px-4 py-3 border-t border-gray-200">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a message..."
                    rows={1}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    style={{ minHeight: '36px', maxHeight: '100px' }}
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500 text-lg">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
