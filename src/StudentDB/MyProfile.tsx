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
  XCircle
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
    <div className="max-w-[1400px] mx-auto space-y-6 px-4 sm:px-6">
      {/* Header Section with enhanced styling */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 via-white to-blue-50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)]"
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative p-6 sm:p-8 shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)] bg-white/50 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* Profile Picture Section */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="relative group"
            >
              <div 
                className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 shadow-[inset_4px_4px_16px_rgba(180,180,255,0.15),inset_-4px_-4px_16px_rgba(255,255,255,0.8)] flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[inset_6px_6px_20px_rgba(180,180,255,0.2),inset_-6px_-6px_20px_rgba(255,255,255,0.9)]"
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
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-purple-50/20"></div>
                  </>
                ) : (
                  <UserCircle className="w-24 h-24 sm:w-32 sm:h-32 text-purple-400" />
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
            <div className="flex-1 text-center sm:text-left">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
              >
                {profile?.first_name} {profile?.middle_name ? profile.middle_name + ' ' : ''}{profile?.last_name}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-1 text-sm text-gray-600"
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
                <div className="w-40 h-8 rounded-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] bg-white flex items-center justify-center gap-2">
                  {profile?.enrollment_status === 'enrolled' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">
                        Enrolled
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-600">
                        Not Enrolled
                      </span>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Student Information Grid - More Compact */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {/* Student ID */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="p-1.5 rounded-md bg-purple-50">
                    <Hash className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Student ID</p>
                    <p className="text-sm font-medium text-gray-900">{profile?.student_id ?? 'N/A'}</p>
                  </div>
                </div>

                {/* Program */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="p-1.5 rounded-md bg-blue-50">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Program</p>
                    <p className="text-sm font-medium text-gray-900">
                      {program?.code ?? 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Year Level */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="p-1.5 rounded-md bg-green-50">
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Year Level</p>
                    <p className="text-sm font-medium text-gray-900">{profile?.year_level ?? 'N/A'}</p>
                  </div>
                </div>

                {/* Section */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="p-1.5 rounded-md bg-yellow-50">
                    <Users className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Section</p>
                    <p className="text-sm font-medium text-gray-900">{profile?.section ?? 'N/A'}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Profile Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex justify-center"
      >
      </motion.div>
    </div>
  );
}; 
