import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCircle, 
  Camera, 
  Hash,
  BookOpen,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';

interface Program {
  id: number;
  code: string;
  name: string;
  description?: string;
}

type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  course?: string;
  enrollment_date?: string;
  year_level?: string;
  student_id?: string;
  program_id?: number;
  section?: string;
  enrollment_status?: 'enrolled' | 'not_enrolled' | 'pending';
};

export const MyProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);

  const handleProfileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      setIsUploading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${user.id}/${fileName}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Download the file to create a blob URL
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('avatar')
        .download(filePath);

      if (downloadError) {
        console.error('Download error:', downloadError);
        throw downloadError;
      }

      if (!fileData) {
        throw new Error('No file data received after upload');
      }

      // Create a blob URL from the downloaded file
      const blob = new Blob([fileData], { type: file.type });
      const blobUrl = URL.createObjectURL(blob);

      // Update user profile with the file path
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_picture_url: filePath })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update profile error:', updateError);
        throw updateError;
      }

      // Update local state with the blob URL
      setProfilePictureUrl(blobUrl);

      // Clean up the old blob URL if it exists
      if (profilePictureUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(profilePictureUrl);
      }

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  // Add cleanup for blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (profilePictureUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(profilePictureUrl);
      }
    };
  }, [profilePictureUrl]);

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
          
          // Fetch program details if program_id exists
          if (data.program_id) {
            const { data: programData, error: programError } = await supabase
              .from('programs')
              .select('*')
              .eq('id', data.program_id)
              .single();

            if (programError) throw programError;
            setProgram(programData);
          }

          if (data?.profile_picture_url) {
            try {
              // First verify the file exists
              const { data: fileData, error: fileError } = await supabase.storage
                .from('avatar')
                .download(data.profile_picture_url);

              if (fileError) {
                console.error('Error downloading file:', fileError);
                setProfilePictureUrl(null);
                return;
              }

              if (!fileData) {
                console.error('No file data received');
                setProfilePictureUrl(null);
                return;
              }

              // Create a blob URL from the downloaded file
              const blob = new Blob([fileData], { type: 'image/jpeg' });
              const blobUrl = URL.createObjectURL(blob);
              setProfilePictureUrl(blobUrl);

            } catch (error) {
              console.error('Error handling profile picture:', error);
              setProfilePictureUrl(null);
            }
          }
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
    <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-8 py-8">
      {/* Premium Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-2xl border border-blue-100"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 to-purple-100/30 pointer-events-none" />
        <div className="absolute top-0 right-0 m-6 opacity-30">
          <Sparkles className="w-16 h-16 text-blue-300" />
        </div>
        <div className="relative p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8">
          {/* Profile Picture Section */}
          <motion.div 
            whileHover={{ scale: 1.04 }}
            className="relative group shadow-xl rounded-2xl"
          >
            <div 
              className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-gradient-to-br from-purple-200 to-blue-200 shadow-lg flex items-center justify-center overflow-hidden cursor-pointer border-4 border-white hover:border-blue-200 transition-all duration-300"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isUploading}
              />
              {profilePictureUrl ? (
                <>
                  <img 
                    src={profilePictureUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const imgElement = e.target as HTMLImageElement;
                      console.error('Error loading profile image:', {
                        url: imgElement.src,
                        error: e,
                        currentSrc: imgElement.currentSrc,
                        complete: imgElement.complete,
                        naturalWidth: imgElement.naturalWidth,
                        naturalHeight: imgElement.naturalHeight
                      });
                      setProfilePictureUrl(null);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30" />
                </>
              ) : (
                <UserCircle className="w-28 h-28 sm:w-36 sm:h-36 text-purple-300" />
              )}
              {/* Upload Overlay */}
              <AnimatePresence>
                {isHovering && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-purple-600/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-sm text-white font-medium px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm">
                          {profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
                        </span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Profile Info Section */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent drop-shadow-sm"
            >
              {profile?.first_name} {profile?.middle_name ? profile.middle_name + ' ' : ''}{profile?.last_name}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base text-gray-600 font-medium"
            >
              {profile?.email}
            </motion.p>
            {/* Status Box */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4 flex justify-center sm:justify-start"
            >
              <div className="w-44 h-10 rounded-xl shadow-inner bg-white flex items-center justify-center gap-2 border border-blue-100">
                {profile?.enrollment_status === 'enrolled' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-base font-semibold text-green-600">
                      Enrolled
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-base font-semibold text-red-600">
                      Not Enrolled
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Student Information Grid - Premium Card Style */}
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Student ID */}
        <div className="flex flex-col items-center bg-white rounded-2xl shadow-lg border border-blue-100 p-6 gap-2 hover:shadow-2xl transition-all">
          <div className="p-3 rounded-full bg-blue-50 mb-2">
            <Hash className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-xs text-gray-500">Student ID</div>
          <div className="text-lg font-bold text-gray-900">{profile?.student_id ?? 'N/A'}</div>
        </div>
        {/* Program */}
        <div className="flex flex-col items-center bg-white rounded-2xl shadow-lg border border-blue-100 p-6 gap-2 hover:shadow-2xl transition-all">
          <div className="p-3 rounded-full bg-purple-50 mb-2">
            <BookOpen className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-xs text-gray-500">Program</div>
          <div className="text-lg font-bold text-gray-900">{program?.code ?? 'N/A'}</div>
        </div>
        {/* Year Level */}
        <div className="flex flex-col items-center bg-white rounded-2xl shadow-lg border border-blue-100 p-6 gap-2 hover:shadow-2xl transition-all">
          <div className="p-3 rounded-full bg-green-50 mb-2">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-xs text-gray-500">Year Level</div>
          <div className="text-lg font-bold text-gray-900">{profile?.year_level ?? 'N/A'}</div>
        </div>
        {/* Section */}
        <div className="flex flex-col items-center bg-white rounded-2xl shadow-lg border border-blue-100 p-6 gap-2 hover:shadow-2xl transition-all">
          <div className="p-3 rounded-full bg-yellow-50 mb-2">
            <Users className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="text-xs text-gray-500">Section</div>
          <div className="text-lg font-bold text-gray-900">{profile?.section ?? 'N/A'}</div>
        </div>
      </motion.div>
    </div>
  );
}; 
