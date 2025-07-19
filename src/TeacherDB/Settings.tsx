import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, BadgeCheck, UserCircle, Briefcase, Camera } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop';

function getCroppedImg(
  imageSrc: string,
  crop: { x: number; y: number },
  zoom: number,
  aspect: number,
  croppedAreaPixels: { width: number; height: number; x: number; y: number }
): Promise<Blob> {
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
      if (!ctx) {
        reject(new Error('Canvas context is null'));
        return;
      }
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
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | undefined>(undefined);

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

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
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
        .upload(filePath, croppedBlob as Blob, {
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
    return <div className="flex justify-center items-center h-64 bg-gradient-to-br from-gray-100 via-white to-blue-100">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="text-red-500 text-center mt-20">Profile not found</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-100 flex items-center justify-center py-10">
      {/* Crop Modal */}
      <AnimatePresence>
        {showCrop && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 w-[95vw] max-w-lg flex flex-col items-center gap-6 relative border border-gray-200">
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
                  className="w-32 accent-blue-500"
                />
                <span className="text-xs text-gray-500">Zoom</span>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowCrop(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
                <button onClick={handleCropSave} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 shadow-md" disabled={isUploading}>{isUploading ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="w-full flex justify-center">
        <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200 p-12 flex flex-col items-center gap-10 max-w-xl w-full mt-10 mb-10">
          {/* Profile Picture Section */}
          <div className="relative group mb-2">
            <div 
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 shadow-xl flex items-center justify-center overflow-hidden border-4 border-white/70 transition-all duration-300 hover:scale-105"
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
                <UserCircle className="w-20 h-20 sm:w-28 sm:h-28 text-gray-200" />
              )}
              {/* Upload Overlay */}
              <AnimatePresence>
                {isHovering && !showCrop && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-white/80 backdrop-blur-lg flex flex-col items-center justify-center gap-2 border border-blue-100 rounded-full shadow-lg"
                  >
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    ) : (
                      <>
                        <div className="p-2 rounded-full bg-blue-100">
                          <Camera className="w-8 h-8 text-blue-500" />
                        </div>
                        <span className="text-xs text-blue-700 font-semibold px-3 py-1 rounded-full bg-blue-100 shadow">
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
          <div className="w-full flex flex-col items-center gap-2">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight text-center mb-1">
              {profile.first_name} {profile.middle_name ? profile.middle_name + ' ' : ''}{profile.last_name}
            </h3>
            <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-3 py-1 mt-1 mb-3 font-semibold shadow">{profile.role}</span>
            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-6 mt-6">
              <div className="flex flex-col items-center sm:items-start gap-3 flex-1">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-lg text-gray-700 font-medium">{profile.email}</span>
                </div>
                {profile.department && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                    <span className="text-lg text-gray-700 font-medium">Program: {profile.department}</span>
                  </div>
                )}
              </div>
              <div className="hidden sm:block h-16 w-px bg-gray-200 mx-4"></div>
              <div className="flex flex-col items-center sm:items-start gap-3 flex-1">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="w-5 h-5 text-gray-400" />
                  <span className={
                    "font-semibold px-3 py-1 rounded-full shadow " +
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
