'use client'

import React from 'react';
import { X, Mail, Phone, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ProfileImage } from './ProfileImage';
import toast from 'react-hot-toast';

interface Contact {
  id: string;
  classified_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  sender: {
    username: string;
    email: string;
    phone_number: string;
    image_url?: string;
  };
  classified: {
    title: string;
  };
}

export function ContactPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const subscriptionRef = React.useRef<any>(null);

  React.useEffect(() => {
    // Cleanup any previous subscription when user changes / panel closes
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    if (!user || !isOpen) return;

    loadContacts();
    subscriptionRef.current = subscribeToContacts();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [user?.id, isOpen]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('classified_contacts')
        .select(`
          *,
          sender:profiles!sender_id(username, email, phone_number, image_url),
          classified:classifieds(title)
        `)
        .eq('recipient_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Error loading contacts');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToContacts = () => {
    const subscription = supabase
      .channel('contacts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classified_contacts',
          filter: `recipient_id=eq.${user?.id}`
        },
        () => {
          loadContacts();
        }
      )
      .subscribe();

    return subscription;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg z-50">
      <div className="h-full flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Contact Information</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No contacts yet
            </div>
          ) : (
            <div className="divide-y">
              {contacts.map(contact => (
                <div key={contact.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-3 mb-3">
                    <ProfileImage
                      imageUrl={contact.sender.image_url}
                      username={contact.sender.username}
                      size="sm"
                    />
                    <div>
                      <h3 className="font-medium">{contact.sender.username}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(contact.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">
                    Re: {contact.classified.title}
                  </p>
                  <p className="text-gray-700 mb-4">{contact.message}</p>

                  <div className="space-y-2">
                    <a
                      href={`mailto:${contact.sender.email}`}
                      className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {contact.sender.email}
                    </a>
                    {contact.sender.phone_number && (
                      <a
                        href={`tel:${contact.sender.phone_number}`}
                        className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {contact.sender.phone_number}
                      </a>
                    )}
                    <button
                      onClick={() => {
                        const event = new CustomEvent('startChat', {
                          detail: {
                            userId: contact.sender_id,
                            username: contact.sender.username,
                            imageUrl: contact.sender.image_url
                          }
                        });
                        window.dispatchEvent(event);
                      }}
                      className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Start Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}