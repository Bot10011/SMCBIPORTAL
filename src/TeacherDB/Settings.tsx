import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, BadgeCheck, UserCircle, Briefcase, Camera } from 'lucide-react';
import Cropper from 'react-easy-crop';

function getCroppedImg(imageSrc, crop, zoom, aspect, croppedAreaPixels) {
  // Utility to crop the image using canvas
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg');
    };
    image.onerror = (e) => reject(e);
  });
}

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
  profile_picture_url?: string;
}

const TeacherSettings: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Cropper state
  const [showCrop, setShowCrop] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

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
          if (data?.profile_picture_url) {
            const { data: signedUrlData, error: signedUrlError } = await supabase
              .storage
              .from('avatar')
              .createSignedUrl(data.profile_picture_url, 60 * 60);
            if (!signedUrlError && signedUrlData?.signedUrl) {
              setProfilePictureUrl(signedUrlData.signedUrl);
            } else {
              setProfilePictureUrl(null);
            }
          } else {
            setProfilePictureUrl(null);
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

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleProfileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async () => {
    if (!selectedImage || !croppedAreaPixels || !user?.id) return;
    try {
      setIsUploading(true);
      const croppedBlob = await getCroppedImg(selectedImage, crop, zoom, 1, croppedAreaPixels);
      const fileExt = 'jpeg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, croppedBlob, {
          cacheControl: '3600',
          upsert: true
        });
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from('avatar')
        .createSignedUrl(filePath, 60 * 60);
      if (!signedUrlError && signedUrlData?.signedUrl) {
        setProfilePictureUrl(signedUrlData.signedUrl);
      } else {
        setProfilePictureUrl(null);
      }
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_picture_url: filePath })
        .eq('id', user.id);
      if (updateError) {
        console.error('Update profile error:', updateError);
        throw updateError;
      }
      setShowCrop(false);
      setSelectedImage(null);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="text-red-500">Profile not found</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      {/* Crop Modal */}
      <AnimatePresence>
        {showCrop && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white rounded-2xl shadow-lg p-6 w-[90vw] max-w-md flex flex-col items-center gap-4 relative">
              <div className="w-full aspect-square relative bg-gray-100 rounded-xl overflow-hidden">
                <Cropper
                  image={selectedImage!}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="round"
                  showGrid={false}
                />
              </div>
              <div className="flex gap-4 w-full items-center justify-center mt-2">
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-xs text-gray-500">Zoom</span>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowCrop(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
                <button onClick={handleCropSave} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" disabled={isUploading}>{isUploading ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-xl mx-auto space-y-10 px-4 sm:px-0 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 flex flex-col items-center gap-8">
          {/* Profile Picture Section */}
          <div className="relative group mb-2">
            <div 
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gray-50 shadow-sm flex items-center justify-center overflow-hidden border border-gray-200"
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
                <img 
                  src={profilePictureUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={() => setProfilePictureUrl(null)}
                />
              ) : (
                <UserCircle className="w-16 h-16 sm:w-24 sm:h-24 text-gray-200" />
              )}
              {/* Upload Overlay */}
              <AnimatePresence>
                {isHovering && !showCrop && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-2 border border-blue-100"
                  >
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-200"></div>
                    ) : (
                      <>
                        <div className="p-2 rounded-full bg-blue-50">
                          <Camera className="w-7 h-7 text-blue-400" />
                        </div>
                        <span className="text-xs text-blue-600 font-medium px-3 py-1 rounded-full bg-blue-50">
                          {profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
                        </span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {/* Profile Info Section */}
          <div className="w-full flex flex-col items-center gap-1">
            <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight text-center">
              {profile.first_name} {profile.middle_name ? profile.middle_name + ' ' : ''}{profile.last_name}
            </h3>
            <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-1 mt-1 mb-2">{profile.role}</span>
            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
              <div className="flex flex-col items-center sm:items-start gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-base text-gray-700 font-light">{profile.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-base text-gray-700 font-light">Username: {profile.email}</span>
                </div>
                {profile.department && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                    <span className="text-base text-gray-700 font-light">Department: {profile.department}</span>
                  </div>
                )}
              </div>
              <div className="hidden sm:block h-16 w-px bg-gray-200 mx-2"></div>
              <div className="flex flex-col items-center sm:items-start gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-gray-400" />
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
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TeacherSettings; 
