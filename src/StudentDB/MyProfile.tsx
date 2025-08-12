import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCircle, 
  Hash,
  BookOpen,
  Calendar,
  Users,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  course?: string;
  enrollment_date?: string;
  year_level?: string;
  student_id?: string;
  program_id?: number;
  section?: string; // ensure section is included
  enrollment_status?: 'enrolled' | 'not_enrolled' | 'pending';
  department?: string; // ensure department is included
};



// Utility to detect touch device
const isTouchDevice = () => {
  return (typeof window !== 'undefined') && (
    'ontouchstart' in window ||
    (navigator.maxTouchPoints > 0)
  );
};

// Utility to clamp a value between min and max
function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(val, max));
}

// Facebook-style profile picture crop modal
const CropModal: React.FC<{
  image: string;
  onCancel: () => void;
  onCrop: (croppedBlob: Blob) => void;
  isUploading?: boolean;
}> = ({ image, onCancel, onCrop, isUploading }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });
  const [cropRect, setCropRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, rect: { x: 0, y: 0, w: 0, h: 0 } });

  useEffect(() => {
    if (imgRef.current) {
      imgRef.current.onload = () => {
        const { naturalWidth, naturalHeight } = imgRef.current!;
        setImgDims({ width: naturalWidth, height: naturalHeight });
        
        // Create initial centered square crop (Facebook style)
        const size = Math.min(naturalWidth, naturalHeight) * 0.8; // 80% of smaller dimension
        const x = (naturalWidth - size) / 2;
        const y = (naturalHeight - size) / 2;
        setCropRect({ x, y, w: size, h: size });
      };
    }
    // Prevent background scroll when modal is open
    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [image]);



  // Handle pointer down for moving and resizing
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imgRef.current || !cropRect) return;
    const imgRect = imgRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    

    
    // Check if click is on corner handles (for resizing)
    const handleSize = 20;
    const corners = [
      { x: cropRect.x, y: cropRect.y }, // top-left
      { x: cropRect.x + cropRect.w, y: cropRect.y }, // top-right
      { x: cropRect.x, y: cropRect.y + cropRect.h }, // bottom-left
      { x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h } // bottom-right
    ];
    
    for (const corner of corners) {
      const cornerX = (corner.x / imgDims.width) * imgRect.width + imgRect.left;
      const cornerY = (corner.y / imgDims.height) * imgRect.height + imgRect.top;
      
      if (Math.abs(clientX - cornerX) < handleSize && Math.abs(clientY - cornerY) < handleSize) {
        setIsDragging(true);
        setDragMode('resize');
        setDragStart({ x: clientX, y: clientY, rect: { ...cropRect } });
        return;
      }
    }
    
    // Check if click is inside crop area (for moving)
    const left = (cropRect.x / imgDims.width) * imgRect.width + imgRect.left;
    const top = (cropRect.y / imgDims.height) * imgRect.height + imgRect.top;
    const right = ((cropRect.x + cropRect.w) / imgDims.width) * imgRect.width + imgRect.left;
    const bottom = ((cropRect.y + cropRect.h) / imgDims.height) * imgRect.height + imgRect.top;
    
    if (clientX > left && clientX < right && clientY > top && clientY < bottom) {
      setIsDragging(true);
      setDragMode('move');
      setDragStart({ x: clientX, y: clientY, rect: { ...cropRect } });
    }
  };

  // Handle drag for moving and resizing
  useEffect(() => {
    if (!isDragging) return;
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      if (!imgRef.current || !cropRect) return;
      const imgRect = imgRef.current.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return;
      }
      
      if (dragMode === 'move') {
        // Move the crop area
        const dx = (clientX - dragStart.x) * (imgDims.width / imgRect.width);
        const dy = (clientY - dragStart.y) * (imgDims.height / imgRect.height);
        
        setCropRect(rect => rect && {
          x: clamp(dragStart.rect.x + dx, 0, imgDims.width - rect.w),
          y: clamp(dragStart.rect.y + dy, 0, imgDims.height - rect.h),
          w: rect.w,
          h: rect.h
        });
      } else if (dragMode === 'resize') {
        // Resize the crop area (maintain square aspect ratio)
        const imgX = (clientX - imgRect.left) * (imgDims.width / imgRect.width);
        const imgY = (clientY - imgRect.top) * (imgDims.height / imgRect.height);
        
        // Calculate new size based on distance from center
        const centerX = dragStart.rect.x + dragStart.rect.w / 2;
        const centerY = dragStart.rect.y + dragStart.rect.h / 2;
        const distanceX = Math.abs(imgX - centerX);
        const distanceY = Math.abs(imgY - centerY);
        const newSize = Math.max(distanceX, distanceY) * 2;
        
        // Ensure minimum size and stay within bounds
        const minSize = 50;
        const maxSize = Math.min(imgDims.width, imgDims.height);
        const clampedSize = clamp(newSize, minSize, maxSize);
        
        const newX = centerX - clampedSize / 2;
        const newY = centerY - clampedSize / 2;
        
        setCropRect({
          x: clamp(newX, 0, imgDims.width - clampedSize),
          y: clamp(newY, 0, imgDims.height - clampedSize),
          w: clampedSize,
          h: clampedSize
        });
      }
    };
    
    const upHandler = () => { 
      setIsDragging(false); 
      setDragMode(null);
    };
    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('touchmove', moveHandler);
    window.addEventListener('mouseup', upHandler);
    window.addEventListener('touchend', upHandler);
    window.addEventListener('touchcancel', upHandler);
    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
      window.removeEventListener('touchend', upHandler);
      window.removeEventListener('touchcancel', upHandler);
    };
  }, [isDragging, dragMode, dragStart, imgDims, cropRect]);

  const handleCrop = () => {
    if (!imgRef.current || !cropRect) return;
    // Find the largest possible square inside the selected rectangle
    const { x, y, w, h } = cropRect;
    const side = Math.min(w, h);
    // Center the square inside the selected rectangle
    const squareX = x + (w - side) / 2;
    const squareY = y + (h - side) / 2;
    
    // Calculate optimal output size for profile picture
    // Use 256x256 for better performance and file size
    const outputSize = 256;
    
    // Create a canvas for the square crop
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(
      imgRef.current,
      squareX, squareY, side, side,
      0, 0, outputSize, outputSize
    );
    canvas.toBlob(blob => {
      if (blob) onCrop(blob);
    }, 'image/jpeg', 0.9);
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm user-select-none touch-none p-4" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        zIndex: 99999,
        width: '100vw',
        height: '100vh'
      }}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-xs sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl flex flex-col items-center relative" 
        style={{ 
          maxHeight: '95vh', 
          position: 'relative',
          zIndex: 100000,
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.1)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
        }}
      >
        {/* Uploading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-20 rounded-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-b-transparent mb-2" />
            <span className="text-base font-semibold text-blue-700">Uploading...</span>
          </div>
        )}
        {/* Instructions for desktop/tablet */}
        <div className="mb-4 sm:mb-6 text-center w-full">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2">Crop Your Profile Picture</h3>
          <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
            Click and drag to select an area, or use the corner handles to resize
          </p>
          <p className="text-sm text-gray-600 sm:hidden">
            Touch and drag to select an area, or use the corner handles to resize
          </p>
        </div>
        <div className="relative w-full h-64 max-h-[60vw] sm:h-96 md:h-[500px] lg:h-[600px] xl:h-[700px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden flex items-center justify-center select-none touch-none border border-gray-200"
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          style={{ 
            WebkitUserSelect: 'none', 
            userSelect: 'none', 
            touchAction: 'none',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <img ref={imgRef} src={image} alt="Crop preview" className="max-w-full max-h-full object-contain" />
          {/* Facebook-style crop overlay with resize handles */}
          {cropRect && (
            <>
              {/* Semi-transparent overlay outside crop area */}
              <div 
                className="absolute inset-0 bg-black/50"
                style={{ zIndex: 5 }}
              />
              {/* Crop area (clear) */}
              <div
                className="absolute border-2 border-white shadow-lg"
                style={{
                  left: `${(cropRect.x / imgDims.width) * 100}%`,
                  top: `${(cropRect.y / imgDims.height) * 100}%`,
                  width: `${(cropRect.w / imgDims.width) * 100}%`,
                  height: `${(cropRect.h / imgDims.height) * 100}%`,
                  zIndex: 10,
                  background: 'transparent',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
              />
              {/* Corner resize handles */}
              {[
                { x: cropRect.x, y: cropRect.y }, // top-left
                { x: cropRect.x + cropRect.w, y: cropRect.y }, // top-right
                { x: cropRect.x, y: cropRect.y + cropRect.h }, // bottom-left
                { x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h } // bottom-right
              ].map((corner, index) => (
                <div
                  key={index}
                  className="absolute w-5 h-5 bg-white border-2 border-blue-500 rounded-full shadow-lg cursor-nwse-resize"
                  style={{
                    left: `${(corner.x / imgDims.width) * 100}%`,
                    top: `${(corner.y / imgDims.height) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 15,
                  }}
                />
              ))}
            </>
          )}
        </div>
        {/* Live cropped preview */}
        {cropRect && imgRef.current && (
          <div className="mt-4 sm:mt-6 flex flex-col items-center">
            <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-700 mb-2 sm:mb-3">Profile Picture Preview</span>
            <div className="w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-xl overflow-hidden border-2 border-gray-300 bg-gray-50 flex items-center justify-center shadow-lg">
              <canvas
                ref={el => {
                  if (el && imgRef.current && cropRect && cropRect.w > 0 && cropRect.h > 0) {
                    el.width = 128;
                    el.height = 128;
                    const ctx = el.getContext('2d');
                    if (ctx) {
                      ctx.clearRect(0, 0, 128, 128);
                      // Enable image smoothing for better preview quality
                      ctx.imageSmoothingEnabled = true;
                      ctx.imageSmoothingQuality = 'high';
                      // Find the largest possible square inside the selected rectangle
                      const { x, y, w, h } = cropRect;
                      const side = Math.min(w, h);
                      const squareX = x + (w - side) / 2;
                      const squareY = y + (h - side) / 2;
                      ctx.drawImage(
                        imgRef.current,
                        squareX, squareY, side, side,
                        0, 0, 128, 128
                      );
                    }
                  }
                }}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  background: '#f3f4f6',
                  borderRadius: '12px'
                }}
              />
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3 text-center">
              This is how your profile picture will appear
            </p>
          </div>
        )}
        <div className="flex gap-4 sm:gap-6 mt-6 sm:mt-8 w-full">
          <button 
            onClick={onCancel} 
            className="flex-1 px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-4 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold sm:text-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
          >
            Cancel
          </button>
          <button 
            onClick={handleCrop} 
            disabled={!cropRect || cropRect.w < 10 || cropRect.h < 10} 
            className="flex-1 px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
          >
            Crop & Save
          </button>
        </div>
      </div>
    </div>
  );

  // Use React Portal to render modal at document body level
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

export const MyProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayTimeout = useRef<NodeJS.Timeout | null>(null);
  const [cropModalImage, setCropModalImage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleProfileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    // Show crop modal with preview
    const previewUrl = URL.createObjectURL(file);
    setCropModalImage(previewUrl);
  }, [user?.id]);

  // Handle crop and upload
  const handleCropAndUpload = useCallback(async (croppedBlob: Blob) => {
    if (!user?.id) return;
    setIsUploading(true);
    setCropModalImage(null);
    try {
      // Get the current image path from the profile
      const oldImagePath = profile?.profile_picture_url;
      // Create a unique file name
      const fileName = `${Date.now()}.jpg`;
      const filePath = `profile-pictures/${user.id}/${fileName}`;
      // Show preview immediately
      const previewUrl = URL.createObjectURL(croppedBlob);
      setProfilePictureUrl(previewUrl);
      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, croppedBlob, {
          cacheControl: '3600',
          upsert: true
        });
      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload profile picture');
        throw uploadError;
      }
      // Download the file to create a blob URL
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('avatar')
        .download(filePath);
      if (downloadError) {
        console.error('Download error:', downloadError);
        toast.error('Failed to download uploaded image');
        throw downloadError;
      }
      if (!fileData) {
        throw new Error('No file data received after upload');
      }
      // Create a blob URL from the downloaded file
      const blob = new Blob([fileData], { type: 'image/jpeg' });
      const blobUrl = URL.createObjectURL(blob);
      // Update user profile with the file path
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_picture_url: filePath })
        .eq('id', user.id);
      if (updateError) {
        console.error('Update profile error:', updateError);
        toast.error('Failed to update profile with new image');
        throw updateError;
      }
      // Delete the old image from storage if it exists and is different from the new one
      if (oldImagePath && oldImagePath !== filePath) {
        await supabase.storage.from('avatar').remove([oldImagePath]);
      }
      // Update local state with the blob URL
      setProfilePictureUrl(blobUrl);
      // Clean up the old blob URL if it exists
      if (profilePictureUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(profilePictureUrl);
      }
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  }, [user?.id, profile?.profile_picture_url, profilePictureUrl]);

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

  // Memoized profile data processing
  const processedProfile = useMemo(() => {
    if (!profile) return null;
    return {
      ...profile,
      fullName: `${profile.last_name} ${profile.middle_name ? profile.middle_name + ' ' : ''}${profile.first_name}`,
      enrollmentStatus: profile.enrollment_status === 'enrolled' ? 'enrolled' : 'not_enrolled'
    };
  }, [profile]);

  if (loading) {
    if (isOffline) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-blue-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657A8 8 0 1 0 7.05 7.05m10.607 9.607A8 8 0 0 1 7.05 7.05m9.9 9.9L7.05 7.05" />
          </svg>
          <div className="text-2xl font-bold text-gray-500 mb-2">You are offline</div>
          <div className="text-gray-400 mb-8">Please check your internet connection.</div>
        </div>
      );
    }
    return (
      <div className="min-h-screen via-white to-purple-50 py-10 px-2 sm:px-0">
        <div className="max-w-3xl mx-auto space-y-10">
          {/* Enhanced Profile Card Skeleton */}
          <div className="relative overflow-visible rounded-3xl bg-gradient-to-br from-white via-blue-50 to-purple-50 shadow-xl border border-blue-100 p-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-purple-100/20 pointer-events-none rounded-3xl" />
            <div className="relative flex flex-col sm:flex-row items-center gap-8 px-8 sm:px-14 pt-10 sm:pt-14 pb-2">
              {/* Profile Picture Skeleton with shimmer effect */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gray-200 animate-pulse overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                     style={{ animation: 'shimmer 2s infinite' }} />
              </div>
              {/* Info Skeleton with staggered animation */}
              <div className="flex-1 text-center sm:text-left space-y-3">
                <div className="h-10 w-56 bg-gray-200 rounded-lg mb-3 animate-pulse mx-auto sm:mx-0" 
                     style={{ animationDelay: '0.1s' }} />
                <div className="h-6 w-72 bg-gray-200 rounded-lg mb-3 animate-pulse mx-auto sm:mx-0" 
                     style={{ animationDelay: '0.2s' }} />
                <div className="mt-6 flex justify-center sm:justify-start">
                  <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-gray-200 animate-pulse w-36 h-10" 
                       style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </div>
            {/* Info Boxes Skeleton with staggered loading */}
            <div className="
              w-full
              grid grid-cols-2 gap-5 items-stretch
              sm:flex sm:flex-row sm:items-center sm:justify-center sm:gap-6
              px-8 py-4 min-h-[80px] z-10 mb-3
            ">
              {[1,2,3,4].map(i => (
                <div key={i} 
                     className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] bg-gray-200 rounded-xl px-4 py-2 animate-pulse"
                     style={{ animationDelay: `${0.1 * i}s` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-red-500">Profile not found</div>;
  }

  return (
    <div className="min-h-screen  via-white to-purple-50 py-10 px-2 sm:px-0">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="profile-card relative overflow-visible rounded-3xl bg-[#252728] p-0"
          style={{ boxShadow: '-6px -6px 12px rgba(255,255,255,0.03), 6px 6px 12px rgba(0,0,0,0.4)' }}
        >
          
          <div className="relative flex flex-col sm:flex-row items-center gap-8 px-8 sm:px-14 pt-10 sm:pt-14 pb-2">
            {/* Profile Picture Section */}
            <motion.div
              whileHover={{ scale: 1.04 }}
              className="profile-interactive relative group flex flex-col items-center"
            >
              {/* Crop modal */}
              {cropModalImage && (
                <CropModal
                  image={cropModalImage}
                  onCancel={() => {
                    setCropModalImage(null);
                    setIsUploading(false);
                  }}
                  onCrop={handleCropAndUpload}
                  isUploading={isUploading}
                />
              )}
              <div
                className="profile-picture relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-purple-200 to-blue-200 shadow-lg flex items-center justify-center cursor-pointer group outline-none border-4 border-white ring-4 ring-blue-200 hover:ring-blue-400 focus:ring-blue-400"
                aria-label="Upload profile photo"
                tabIndex={0}
                onMouseEnter={() => {
                  if (!isTouchDevice()) setShowOverlay(true);
                }}
                onMouseLeave={() => {
                  if (!isTouchDevice()) setShowOverlay(false);
                }}
                onFocus={() => {
                  if (!isTouchDevice()) setShowOverlay(true);
                }}
                onBlur={() => {
                  if (!isTouchDevice()) setShowOverlay(false);
                }}
                onClick={() => {
                  if (!isUploading) fileInputRef.current?.click();
                  if (isTouchDevice()) {
                    setShowOverlay(true);
                    if (overlayTimeout.current) clearTimeout(overlayTimeout.current);
                    overlayTimeout.current = setTimeout(() => setShowOverlay(false), 1800);
                  }
                }}
                onTouchStart={() => {
                  if (!isUploading) fileInputRef.current?.click();
                  setShowOverlay(true);
                  if (overlayTimeout.current) clearTimeout(overlayTimeout.current);
                  overlayTimeout.current = setTimeout(() => setShowOverlay(false), 1800);
                }}
                style={{ outline: 'none' }}
              >
                {/* Profile image or placeholder */}
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                    style={{ zIndex: 0, objectFit: 'cover', objectPosition: 'center', aspectRatio: '1/1', background: '#f3f4f6' }}
                    onError={() => {
                      setProfilePictureUrl(null);
                    }}
                  />
                ) : (
                  <UserCircle className="absolute inset-0 w-full h-full text-purple-200" style={{ zIndex: 0 }} />
                )}
                {/* Edit icon overlay */}
               
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isUploading}
                  tabIndex={-1}
                  onClick={e => e.stopPropagation()}
                  aria-label="Choose profile photo"
                />
                {/* Overlay always covers the entire area */}
                <AnimatePresence>
                  {(showOverlay || isUploading) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-600/80 to-purple-600/80 backdrop-blur-[6px] flex flex-col items-center justify-center gap-2 z-30 rounded-full"
                      style={{ cursor: isUploading ? 'not-allowed' : 'pointer', boxShadow: '0 8px 32px 0 rgba(99,102,241,0.15)' }}
                    >
                      {isUploading ? (
                        <>
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-b-transparent mb-2 shadow-lg" />
                            <span className="text-base font-semibold text-white drop-shadow">Uploading...</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-white font-medium px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm shadow">
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
                className="text-3xl sm:text-4xl font-extrabold text-white mb-1"
              >
                {processedProfile?.fullName}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base text-white font-medium mb-2"
              >
                {profile?.email}
              </motion.p>
              {/* Status Pill */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4 flex justify-center sm:justify-start"
              >
                <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full shadow bg-white border ${processedProfile?.enrollmentStatus === 'enrolled' ? 'border-green-200' : 'border-red-200'}`}
                >
                  {processedProfile?.enrollmentStatus === 'enrolled' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-base font-semibold text-green-600">Enrolled</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-base font-semibold text-red-600">Not Enrolled</span>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
          {/* Student Info Row as card footer, Neumorphism style, fully visible */}
          <div className="
            w-full
            grid grid-cols-2 gap-5 items-stretch
            sm:flex sm:flex-row sm:items-center sm:justify-center sm:gap-6
            px-8 py-4 min-h-[80px] z-10 mb-3
          ">
            {/* Student ID */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-[#252728]" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-300 mb-0.5 sm:mb-0 sm:mr-1">
                <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                Student ID:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-100 truncate">{profile?.student_id ?? 'N/A'}</span>
            </div>
            {/* Program */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-[#252728]" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-300 mb-0.5 sm:mb-0 sm:mr-1">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                Program:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-100 truncate">{profile?.department ?? 'N/A'}</span>
            </div>
            {/* Year Level */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-[#252728]" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-300 mb-0.5 sm:mb-0 sm:mr-1">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                Year Level:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-100 truncate">{profile?.year_level ?? 'N/A'}</span>
            </div>
            {/* Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-[#252728]" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-300 mb-0.5 sm:mb-0 sm:mr-1">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                Section:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-100 truncate">{profile?.section ?? 'N/A'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}; 
