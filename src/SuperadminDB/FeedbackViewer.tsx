import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckCircle, Archive, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Feedback {
  id: string;
  user_id: string;
  first_impression: string;
  likes: string;
  created_at: string;
  status: 'pending' | 'reviewed' | 'archived';
  user?: {
    first_name: string;
    last_name: string;
  };
}

export const FeedbackViewer: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'archived'>('all');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('id, user_id, first_impression, likes, created_at, status')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const fixedData = (data || []).map((item: any) => ({
        ...item,
        user: Array.isArray(item.user) ? item.user[0] : item.user
      }));
      setFeedbacks(fixedData);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFeedbackStatus = async (id: string, newStatus: Feedback['status']) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchFeedbacks(); // Refresh the list
    } catch (error) {
      console.error('Error updating feedback status:', error);
    }
  };

  const filteredFeedbacks = feedbacks.filter(feedback => 
    filter === 'all' ? true : feedback.status === filter
  );

  // Add counts for each status
  const pendingCount = feedbacks.filter(f => f.status === 'pending').length;
  const reviewedCount = feedbacks.filter(f => f.status === 'reviewed').length;
  const archivedCount = feedbacks.filter(f => f.status === 'archived').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-5 text-white shadow-lg"
      >
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Student Feedback</h2>
              <p className="text-sm opacity-90">Review and manage student feedback submissions</p>
            </div>
          </div>
          <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-white/90 text-blue-700' 
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                All
                <span className="ml-2 text-xs font-semibold opacity-80">{feedbacks.length}</span>
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === 'pending' 
                    ? 'bg-white/90 text-yellow-700' 
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                Pending
                <span className="ml-2 text-xs font-semibold opacity-80">{pendingCount}</span>
              </button>
              <button
                onClick={() => setFilter('reviewed')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === 'reviewed' 
                    ? 'bg-white/90 text-green-700' 
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                Reviewed
                <span className="ml-2 text-xs font-semibold opacity-80">{reviewedCount}</span>
              </button>
              <button
                onClick={() => setFilter('archived')}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === 'archived' 
                    ? 'bg-white/90 text-gray-700' 
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                Archived
                <span className="ml-2 text-xs font-semibold opacity-80">{archivedCount}</span>
              </button>
          </div>
        </div>
      </motion.div>

      {/* Feedback List */}
      {loading ? (
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      ) : (
        <AnimatePresence>
          {filteredFeedbacks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-gray-200 bg-white py-12 text-center shadow-sm"
            >
              <p className="text-gray-500">No feedback submissions found.</p>
            </motion.div>
          ) : (
            <div className="grid gap-3">
              {filteredFeedbacks.map((feedback) => (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {feedback.user ? `${feedback.user.first_name} ${feedback.user.last_name}` : 'Anonymous User'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(feedback.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {feedback.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                        {feedback.status === 'reviewed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3" />
                            Reviewed
                          </span>
                        )}
                        {feedback.status === 'archived' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <Archive className="w-3 h-3" />
                            Archived
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {feedback.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateFeedbackStatus(feedback.id, 'reviewed')}
                            className="rounded-lg bg-green-50 px-3 py-1 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
                          >
                            Mark as Reviewed
                          </button>
                          <button
                            onClick={() => updateFeedbackStatus(feedback.id, 'archived')}
                            className="rounded-lg bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                          >
                            Archive
                          </button>
                        </>
                      )}
                      {feedback.status === 'reviewed' && (
                        <button
                          onClick={() => updateFeedbackStatus(feedback.id, 'archived')}
                          className="rounded-lg bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                        >
                          Archive
                        </button>
                      )}
                      {feedback.status === 'archived' && (
                        <button
                          onClick={() => updateFeedbackStatus(feedback.id, 'reviewed')}
                          className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">First Impression</h4>
                      <p className="text-gray-600 whitespace-pre-wrap">{feedback.first_impression}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">What They Liked</h4>
                      <p className="text-gray-600 whitespace-pre-wrap">{feedback.likes}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}; 
