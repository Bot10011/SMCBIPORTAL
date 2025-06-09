import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { User, Mail, BadgeCheck, UserCircle, Briefcase } from 'lucide-react';

interface TeacherProfile {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  role: string;
  department?: string;
  is_active: boolean;
}

const TeacherSettings: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <UserCircle className="text-blue-500" /> Teacher Settings
      </h2>
      <motion.div whileHover={{ scale: 1.02 }} className="bg-white shadow-lg rounded-xl p-6 max-w-md mx-auto transition-all border border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <UserCircle className="w-14 h-14 text-blue-400 animate-pulse" />
          <div>
            <h3 className="text-xl font-semibold text-blue-700">
              {profile.first_name} {profile.middle_name ? profile.middle_name + ' ' : ''}{profile.last_name}
            </h3>
            <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-1">{profile.role}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-700">
            <Mail className="w-5 h-5 text-gray-400" /> {profile.email}
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <User className="w-5 h-5 text-gray-400" /> Username: {profile.username}
          </div>
          {profile.department && (
            <div className="flex items-center gap-2 text-gray-700">
              <Briefcase className="w-5 h-5 text-gray-400" /> Department: {profile.department}
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-700">
            <BadgeCheck className="w-5 h-5 text-gray-400" />
            Status:
            <span className={
              "font-medium px-2 py-1 rounded " +
              (profile.is_active
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500')
            }>
              {profile.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TeacherSettings; 