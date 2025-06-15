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
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50 rounded-2xl -z-10"></div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100/80 shadow-inner">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Student Feedback</h2>
                <p className="text-gray-600">Review and manage student feedback submissions</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
                <span className="ml-2 text-xs font-semibold text-gray-500">{feedbacks.length}</span>
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'pending' 
                    ? 'bg-yellow-100 text-yellow-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Pending
                <span className="ml-2 text-xs font-semibold text-yellow-700">{pendingCount}</span>
              </button>
              <button
                onClick={() => setFilter('reviewed')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'reviewed' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Reviewed
                <span className="ml-2 text-xs font-semibold text-green-700">{reviewedCount}</span>
              </button>
              <button
                onClick={() => setFilter('archived')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'archived' 
                    ? 'bg-gray-200 text-gray-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Archived
                <span className="ml-2 text-xs font-semibold text-gray-700">{archivedCount}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feedback List */}
      {loading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse h-48 bg-gray-200 rounded-xl" />
          ))}
        </div>
      ) : (
        <AnimatePresence>
          {filteredFeedbacks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100"
            >
              <p className="text-gray-500">No feedback submissions found.</p>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {filteredFeedbacks.map((feedback) => (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
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
                            className="px-3 py-1 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            Mark as Reviewed
                          </button>
                          <button
                            onClick={() => updateFeedbackStatus(feedback.id, 'archived')}
                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            Archive
                          </button>
                        </>
                      )}
                      {feedback.status === 'reviewed' && (
                        <button
                          onClick={() => updateFeedbackStatus(feedback.id, 'archived')}
                          className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Archive
                        </button>
                      )}
                      {feedback.status === 'archived' && (
                        <button
                          onClick={() => updateFeedbackStatus(feedback.id, 'reviewed')}
                          className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
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


