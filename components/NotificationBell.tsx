'use client'

import React from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
  Info,
  Trophy,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  // Optional fields for richer UI (if your DB has them)
  type?: string | null;
  image_url?: string | null;
  // Store the related entity ID for direct navigation
  related_id?: string | null;
  related_type?: string | null;
}

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notificationAvatars, setNotificationAvatars] = React.useState<Record<string, string | null>>({});
  const [loading, setLoading] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const subscriptionRef = React.useRef<any>(null);
  const showDropdownRef = React.useRef(false);

  React.useEffect(() => {
    showDropdownRef.current = showDropdown;
  }, [showDropdown]);

  const getIconForNotification = (notification: Notification) => {
    const type = (notification.type || '').toLowerCase();
    const title = (notification.title || '').toLowerCase();
    const message = (notification.message || '').toLowerCase();

    if (type.includes('points') || title.includes('points')) return Trophy;
    if (type.includes('success') || title.includes('approved')) return CheckCircle2;
    if (type.includes('warning') || title.includes('warning')) return AlertCircle;
    if (type.includes('info') || title.includes('info')) return Info;
    if (message.includes('new message') || title.includes('message')) return Bell;

    return Bell;
  };

  React.useEffect(() => {
    if (user?.id) {
      loadNotifications();
      const subscription = subscribeToNotifications();
      
      // Cleanup subscription on unmount or user change
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
      setNotificationAvatars({});
      setUnreadCount(0);
    }
  }, [user?.id]);

  React.useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const loadAvatarForNotification = React.useCallback(async (notification: Notification) => {
    // Example: "You have a new contact request from username regarding your classified: Title"
    const match = notification.message.match(/from (.+?) regarding your classified/i);
    if (!match) {
      setNotificationAvatars(prev => {
        if (prev.hasOwnProperty(notification.id)) return prev;
        return { ...prev, [notification.id]: null };
      });
      return;
    }

    const username = match[1].trim();

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('image_url')
        .eq('username', username)
        .single();

      if (error || !data?.image_url) {
        setNotificationAvatars(prev => {
          if (prev.hasOwnProperty(notification.id)) return prev;
          return { ...prev, [notification.id]: null };
        });
        return;
      }

      let imageUrl = data.image_url as string;
      let finalUrl = imageUrl;

      // If it's not already a full URL, treat it as a storage path
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(imageUrl);
        finalUrl = urlData.publicUrl;
      }

      setNotificationAvatars(prev => {
        if (prev.hasOwnProperty(notification.id)) return prev;
        return { ...prev, [notification.id]: finalUrl };
      });
    } catch (err) {
      console.error('Error loading avatar for notification:', err);
      setNotificationAvatars(prev => {
        if (prev.hasOwnProperty(notification.id)) return prev;
        return { ...prev, [notification.id]: null };
      });
    }
  }, []);

  // Load profile pictures for notifications based on their content (e.g. sender username in message)
  React.useEffect(() => {
    if (!user || notifications.length === 0) return;

    // Load avatars for notifications that don't have them yet
    notifications.forEach(notification => {
      // Check if avatar already loaded
      if (!notificationAvatars.hasOwnProperty(notification.id)) {
        loadAvatarForNotification(notification);
      }
    });
  }, [notifications, user, loadAvatarForNotification, notificationAvatars]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20); // Increased limit for better UX

      if (error) throw error;
      
      // Update notifications, avoiding duplicates
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNotifications = (data || []).filter(n => !existingIds.has(n.id));
        return [...newNotifications, ...prev].slice(0, 20); // Keep only latest 20
      });
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return null;

    // Unsubscribe from previous subscription if exists
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Use a stable channel name per user to avoid creating endless new channels.
    const channelName = `notifications_${user.id}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Check if notification already exists to avoid duplicates
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotification.id)) {
              return prev;
            }
            
            // Add new notification at the beginning and limit to 20
            const updated = [newNotification, ...prev].slice(0, 20);
            return updated;
          });
          
          // Load avatar for new notification
          loadAvatarForNotification(newNotification);
          
          // Play sound and show toast only if dropdown is not open
          if (!showDropdownRef.current) {
            playNotificationSound();
            toast.success('New notification received!', {
              duration: 3000,
              icon: '🔔',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          
          // Update the notification in the list
          setNotifications(prev =>
            prev.map(n =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Remove deleted notification from the list
          setNotifications(prev =>
            prev.filter(n => n.id !== payload.old.id)
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to notifications channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to notifications channel');
        }
      });

    subscriptionRef.current = subscription;
    return subscription;
  };

  const playNotificationSound = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/notification.mp3');
    }
    audioRef.current.play().catch(error => {
      console.error('Error playing notification sound:', error);
    });
  };

  const getNotificationUrl = async (notification: Notification): Promise<string> => {
    const title = notification.title.toLowerCase();
    const message = notification.message.toLowerCase();

    try {
      // Income verification notifications
      if (title.includes('income verification')) {
        return '/income-verification';
      }

      // Classified contact notifications - query classified_contacts table to get classified_id
      if (title.includes('contact request') || message.includes('regarding your classified')) {
        try {
          // Find the most recent classified_contact for this user
          const { data: contacts, error: contactsError } = await supabase
            .from('classified_contacts')
            .select('classified_id')
            .eq('recipient_id', user?.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!contactsError && contacts && contacts.length > 0 && contacts[0]?.classified_id) {
            // Get the slug from the classified
            const { data: classifiedData, error: classifiedError } = await supabase
              .from('classifieds')
              .select('slug')
              .eq('id', contacts[0].classified_id)
              .single();
            
            if (!classifiedError && classifiedData?.slug) {
              return `/classifieds/${classifiedData.slug}`;
            }
          }

          // If query fails, try extracting title from message
          const match = notification.message.match(/regarding your classified:\s*(.+?)(?:\s*$|\.)/i);
          if (match) {
            const classifiedTitle = match[1].trim();
            const { data: classifiedData, error: classifiedError } = await supabase
              .from('classifieds')
              .select('slug')
              .ilike('title', `%${classifiedTitle}%`)
              .eq('status', 'active')
              .limit(1)
              .single();
            
            if (!classifiedError && classifiedData?.slug) {
              return `/classifieds/${classifiedData.slug}`;
            }
          }
        } catch (error) {
          console.error('Error finding classified from contact:', error);
        }
        // Fallback to messages page
        return '/messages';
      }

      // Message notifications
      if (title.includes('message') || message.includes('new message')) {
        return '/messages';
      }

      // Points notifications
      if (title.includes('points') || message.includes('points')) {
        return '/dashboard';
      }

      // Blog post created notifications
      if (title.includes('blog post created')) {
        // Extract blog title from message
        const match = notification.message.match(/blog post "([^"]+)"/i);
        if (match) {
          const blogTitle = match[1];
          try {
            const { data: blogData, error: blogError } = await supabase
              .from('blog_posts')
              .select('id, slug')
              .ilike('title', `%${blogTitle}%`)
              .eq('author_id', user?.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (!blogError && blogData?.id) {
              const slug = blogData.slug || blogData.id;
              return `/blog/${slug}/${blogData.id}`;
            }
          } catch (error) {
            console.error('Error finding blog:', error);
          }
        }
        return '/blog';
      }

      // Classified posted notifications
      if (title.includes('classified posted')) {
        // Extract classified title from message
        const match = notification.message.match(/classified "([^"]+)"/i);
        if (match) {
          const classifiedTitle = match[1];
          try {
            const { data: classifiedData, error: classifiedError } = await supabase
              .from('classifieds')
              .select('slug')
              .ilike('title', `%${classifiedTitle}%`)
              .eq('user_id', user?.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (!classifiedError && classifiedData?.slug) {
              return `/classifieds/${classifiedData.slug}`;
            }
          } catch (error) {
            console.error('Error finding classified:', error);
          }
        }
        return '/classifieds';
      }

      // Company submitted notifications
      if (title.includes('company submitted')) {
        // Extract company name from message
        const match = notification.message.match(/company "([^"]+)"/i);
        if (match) {
          const companyName = match[1];
          try {
            const { data: companyData, error: companyError } = await supabase
              .from('mlm_companies')
              .select('slug, country_name')
              .ilike('name', `%${companyName}%`)
              .eq('submitted_by', user?.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (!companyError && companyData?.slug && companyData?.country_name) {
              return `/company/${companyData.country_name}/${companyData.slug}`;
            }
          } catch (error) {
            console.error('Error finding company:', error);
          }
        }
        return '/companies';
      }

      // Blog/News/Classified/Company approval notifications
      if (title.includes('approved') || title.includes('rejected')) {
        // Try to extract slug or ID from message
        const slugMatch = notification.message.match(/['"]([^'"]+)['"]/);
        if (slugMatch) {
          const slug = slugMatch[1];
          if (message.includes('blog')) {
            return `/blog/${slug}`;
          }
          if (message.includes('news')) {
            return `/news/${slug}`;
          }
          if (message.includes('classified')) {
            return `/classifieds/${slug}`;
          }
        }
        
        // Fallback to list pages
        if (message.includes('blog')) {
          return '/blog';
        }
        if (message.includes('news')) {
          return '/news';
        }
        if (message.includes('classified')) {
          return '/classifieds';
        }
        if (message.includes('company')) {
          return '/companies';
        }
      }

      // Default to dashboard
      return '/dashboard';
    } catch (error) {
      console.error('Error determining notification URL:', error);
      return '/dashboard';
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read first
      await markAsRead(notification.id);
      
      // Close dropdown
      setShowDropdown(false);
      
      // Get the URL and navigate
      const url = await getNotificationUrl(notification);
      
      // Small delay to ensure state updates
      setTimeout(() => {
        router.push(url);
      }, 100);
    } catch (error) {
      console.error('Error handling notification click:', error);
      toast.error('Error navigating to notification');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      // Optimistically update local state (real-time subscription will confirm)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      
      // Optimistically update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl z-50 border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <Bell className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <p className="text-xs text-gray-500">
                  {loading ? 'Loading...' : unreadCount > 0
                    ? `${unreadCount} unread`
                    : "You're all caught up"}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                title="Mark all as read"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-indigo-50/50' : 'bg-white'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="relative flex-shrink-0">
                    {(() => {
                      const avatarUrl = notificationAvatars[notification.id];

                      return (
                        <div className="relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-indigo-100 bg-indigo-50 flex items-center justify-center">
                          {avatarUrl ? (
                            <>
                              <img
                                src={avatarUrl}
                                alt="Profile"
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-indigo-600 flex items-center justify-center ring-2 ring-white shadow-sm">
                                {React.createElement(getIconForNotification(notification), {
                                  className: 'h-2.5 w-2.5 text-white',
                                })}
                              </div>
                            </>
                          ) : (
                            React.createElement(getIconForNotification(notification), {
                              className: 'h-5 w-5 text-indigo-600',
                            })
                          )}
                        </div>
                      );
                    })()}

                    {/* Unread indicator */}
                    {!notification.read && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-2 ring-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {notification.title}
                      </h4>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                      <Clock3 className="h-3 w-3" />
                      <span>
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}