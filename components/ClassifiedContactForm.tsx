'use client'

import React from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Mail, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContactFormData {
  message: string;
}

interface ClassifiedContactFormProps {
  classifiedId: string;
  recipientId: string;
  onClose: () => void;
}

export function ClassifiedContactForm({ classifiedId, recipientId, onClose }: ClassifiedContactFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ContactFormData>();
  const { user } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (data: ContactFormData) => {
    if (!user) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('classified_contacts')
        .insert({
          classified_id: classifiedId,
          sender_id: user.id,
          recipient_id: recipientId,
          message: data.message.trim()
        });

      if (error) throw error;

      toast.success('Message sent successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Contact Advertiser</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Message
            </label>
            <div className="relative">
              <div className="absolute left-3 top-3">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                {...register("message", {
                  required: "Message is required",
                  minLength: {
                    value: 20,
                    message: "Message must be at least 20 characters"
                  },
                  maxLength: {
                    value: 1000,
                    message: "Message cannot exceed 1000 characters"
                  }
                })}
                rows={6}
                className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Write your message here..."
              />
            </div>
            {errors.message && (
              <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}