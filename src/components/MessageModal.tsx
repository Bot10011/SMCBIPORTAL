import React, { useEffect, useState } from 'react';
import { X, Loader2, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useModal } from '../contexts/ModalContext';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export default function MessageModal() {
  const { showMessageModal, setShowMessageModal, selectedUserId } = useModal();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (showMessageModal && selectedUserId) {
      fetchUserData();
    }
  }, [showMessageModal, selectedUserId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name')
        .eq('id', selectedUserId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !message.trim()) return;

    try {
      setSending(true);
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          receiver_id: selectedUserId,
          content: message.trim(),
          is_read: false
        });

      if (error) throw error;

      toast.success('Message sent successfully');
      setMessage('');
      setShowMessageModal(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!showMessageModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Send Message</h2>
          <button
            onClick={() => setShowMessageModal(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : user ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Recipient Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">To:</div>
                <div className="font-medium text-gray-900">
                  {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                </div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-12 text-gray-500">
              User not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
