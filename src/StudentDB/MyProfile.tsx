import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { motion } from 'framer-motion';
import { User, Mail, BadgeCheck, UserCircle } from 'lucide-react';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

export const MyProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (user?.id) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="text-red-500">Profile not found</div>;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 via-transparent to-blue-50/50 rounded-2xl -z-10"></div>
        <div className="p-6 sm:p-8 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-100/80 shadow-[inset_2px_2px_8px_rgba(180,180,255,0.15),inset_-2px_-2px_8px_rgba(255,255,255,0.8)]">
            <UserCircle className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h2>
        </div>
      </motion.div>
      {/* Profile Card */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="animate-pulse h-48 bg-gray-200 rounded-xl" />
          ))}
        </div>
      ) : profile ? (
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-100 rounded-2xl p-10 max-w-2xl mx-auto transition-all border border-gray-100 shadow-[inset_8px_8px_24px_rgba(180,180,255,0.12),inset_-8px_-8px_24px_rgba(255,255,255,0.9)]">
          <div className="flex flex-col sm:flex-row items-center gap-8 mb-8">
            <div className="flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 shadow-[inset_4px_4px_16px_rgba(180,180,255,0.15),inset_-4px_-4px_16px_rgba(255,255,255,0.8)]">
              <UserCircle className="w-20 h-20 text-purple-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-purple-700 mb-1">
                {profile.first_name} {profile.middle_name ? profile.middle_name + ' ' : ''}{profile.last_name}
              </h3>
              <span className="text-xs bg-purple-100 text-purple-700 rounded px-2 py-1 mb-2 inline-block shadow-[inset_2px_2px_6px_rgba(180,180,255,0.10),inset_-2px_-2px_6px_rgba(255,255,255,0.7)]">{profile.role}</span>
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center gap-2 text-gray-700 bg-gray-50 rounded-xl px-4 py-2 shadow-[inset_2px_2px_8px_rgba(180,180,255,0.10),inset_-2px_-2px_8px_rgba(255,255,255,0.7)]">
                  <Mail className="w-5 h-5 text-gray-400" /> {profile.email}
                </div>
                <div className="flex items-center gap-2 text-gray-700 bg-gray-50 rounded-xl px-4 py-2 shadow-[inset_2px_2px_8px_rgba(180,180,255,0.10),inset_-2px_-2px_8px_rgba(255,255,255,0.7)]">
                  <User className="w-5 h-5 text-gray-400" /> Username: {profile.username}
                </div>
                <div className="flex items-center gap-2 text-gray-700 bg-gray-50 rounded-xl px-4 py-2 shadow-[inset_2px_2px_8px_rgba(180,180,255,0.10),inset_-2px_-2px_8px_rgba(255,255,255,0.7)]">
                  <BadgeCheck className="w-5 h-5 text-gray-400" />
                  Status:
                  <span className={
                    "font-medium px-2 py-1 rounded shadow-[inset_1px_1px_4px_rgba(180,180,255,0.10),inset_-1px_-1px_4px_rgba(255,255,255,0.7)] " +
                    (profile.student_status === 'regular'
                      ? 'bg-green-100 text-green-700'
                      : profile.student_status === 'irregular'
                      ? 'bg-yellow-100 text-yellow-700'
                      : profile.student_status === 'transferee'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500')
                  }>
                    {profile.student_status || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-100 rounded-2xl shadow-[inset_4px_4px_16px_rgba(180,180,255,0.12),inset_-4px_-4px_16px_rgba(255,255,255,0.9)] border border-gray-100">
          <div className="p-4 rounded-full bg-gray-50 mb-4 shadow-[inset_2px_2px_8px_rgba(180,180,255,0.10),inset_-2px_-2px_8px_rgba(255,255,255,0.7)]">
            <UserCircle className="w-12 h-12 text-gray-400 animate-bounce" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Profile Data Found</h3>
          <p className="text-gray-500 text-center max-w-md">
            We couldn't find your profile information. Please contact support if this is unexpected.
          </p>
        </div>
      )}
    </div>
  );
}; 
