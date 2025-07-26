import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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

// Type for style objects
type StyleObj = {
  [key: string]: string | number | undefined;
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

// Simple modal for cropping
const CropModal: React.FC<{
  image: string;
  onCancel: () => void;
  onCrop: (croppedBlob: Blob) => void;
  isUploading?: boolean;
}> = ({ image, onCancel, onCrop, isUploading }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });
  // Crop rect: {x, y, w, h} in image coordinates
  const [cropRect, setCropRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  // Drag state
  const [dragMode, setDragMode] = useState<null | 'draw' | 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w'>(null);
  const [dragStart, setDragStart] = useState<{ x: number, y: number, rect: { x: number, y: number, w: number, h: number } | null }>({ x: 0, y: 0, rect: null });

  useEffect(() => {
    if (imgRef.current) {
      imgRef.current.onload = () => {
        setImgDims({ width: imgRef.current!.naturalWidth, height: imgRef.current!.naturalHeight });
        // No initial crop rect; user draws it
        setCropRect(null);
      };
    }
    // Prevent background scroll when modal is open
    document.body.classList.add('overflow-hidden');
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [image]);

  // Convert clientX/Y to image coordinates
  const clientToImg = (clientX: number, clientY: number, imgRect: DOMRect) => {
    const x = clamp((clientX - imgRect.left) * (imgDims.width / imgRect.width), 0, imgDims.width);
    const y = clamp((clientY - imgRect.top) * (imgDims.height / imgRect.height), 0, imgDims.height);
    return { x, y };
  };

  // Mouse/touch handlers for drawing, moving, resizing
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imgRef.current) return;
    const imgRect = imgRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    // If cropRect exists, check if pointer is on edge/corner or inside
    if (cropRect) {
      // Check corners/edges (8px tolerance)
      const px = (val: number) => (val / imgDims.width) * imgRect.width + imgRect.left;
      const py = (val: number) => (val / imgDims.height) * imgRect.height + imgRect.top;
      const tol = 16;
      const corners = [
        { mode: 'resize-nw', x: cropRect.x, y: cropRect.y },
        { mode: 'resize-ne', x: cropRect.x + cropRect.w, y: cropRect.y },
        { mode: 'resize-sw', x: cropRect.x, y: cropRect.y + cropRect.h },
        { mode: 'resize-se', x: cropRect.x + cropRect.w, y: cropRect.y + cropRect.h },
      ];
      for (const c of corners) {
        if (Math.abs(clientX - px(c.x)) < tol && Math.abs(clientY - py(c.y)) < tol) {
          setDragMode(c.mode as typeof dragMode);
          setDragStart({ x: clientX, y: clientY, rect: { ...cropRect } });
          return;
        }
      }
      // Edges
      const edges = [
        { mode: 'resize-n', x1: cropRect.x, y1: cropRect.y, x2: cropRect.x + cropRect.w, y2: cropRect.y },
        { mode: 'resize-s', x1: cropRect.x, y1: cropRect.y + cropRect.h, x2: cropRect.x + cropRect.w, y2: cropRect.y + cropRect.h },
        { mode: 'resize-w', x1: cropRect.x, y1: cropRect.y, x2: cropRect.x, y2: cropRect.y + cropRect.h },
        { mode: 'resize-e', x1: cropRect.x + cropRect.w, y1: cropRect.y, x2: cropRect.x + cropRect.w, y2: cropRect.y + cropRect.h },
      ];
      for (const e_ of edges) {
        if (clientX >= px(e_.x1) - tol && clientX <= px(e_.x2) + tol && clientY >= py(e_.y1) - tol && clientY <= py(e_.y2) + tol) {
          setDragMode(e_.mode as typeof dragMode);
          setDragStart({ x: clientX, y: clientY, rect: { ...cropRect } });
          return;
        }
      }
      // Inside rect
      const left = px(cropRect.x), top = py(cropRect.y), right = px(cropRect.x + cropRect.w), bottom = py(cropRect.y + cropRect.h);
      if (clientX > left && clientX < right && clientY > top && clientY < bottom) {
        setDragMode('move');
        setDragStart({ x: clientX, y: clientY, rect: { ...cropRect } });
        return;
      }
    }
    // Otherwise, start drawing new rect
    setDragMode('draw');
    const { x, y } = clientToImg(clientX, clientY, imgRect);
    setDragStart({ x: clientX, y: clientY, rect: null });
    setCropRect({ x, y, w: 0, h: 0 });
  };

  // Mouse/touch move
  useEffect(() => {
    if (!dragMode) return;
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      if (!imgRef.current) return;
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
      if (dragMode === 'draw' && dragStart) {
        const { x, y } = clientToImg(clientX, clientY, imgRect);
        setCropRect(rect => rect && {
          x: clamp(Math.min(rect.x, x), 0, imgDims.width),
          y: clamp(Math.min(rect.y, y), 0, imgDims.height),
          w: Math.abs(x - rect.x),
          h: Math.abs(y - rect.y)
        });
      } else if (dragMode === 'move' && dragStart && dragStart.rect) {
        const dx = (clientX - dragStart.x) * (imgDims.width / imgRect.width);
        const dy = (clientY - dragStart.y) * (imgDims.height / imgRect.height);
        setCropRect(rect => rect && {
          x: clamp(dragStart.rect!.x + dx, 0, imgDims.width - rect.w),
          y: clamp(dragStart.rect!.y + dy, 0, imgDims.height - rect.h),
          w: rect.w,
          h: rect.h
        });
      } else if (dragMode && dragMode.startsWith('resize') && dragStart && dragStart.rect) {
        let { x, y, w, h } = dragStart.rect;
        const { x: mx, y: my } = clientToImg(clientX, clientY, imgRect);
        switch (dragMode) {
          case 'resize-nw': w += x - mx; h += y - my; x = mx; y = my; break;
          case 'resize-ne': w = mx - x; h += y - my; y = my; break;
          case 'resize-sw': w += x - mx; x = mx; h = my - y; break;
          case 'resize-se': w = mx - x; h = my - y; break;
          case 'resize-n': h += y - my; y = my; break;
          case 'resize-s': h = my - y; break;
          case 'resize-w': w += x - mx; x = mx; break;
          case 'resize-e': w = mx - x; break;
        }
        // Clamp
        if (w < 10) w = 10;
        if (h < 10) h = 10;
        if (x < 0) { w += x; x = 0; }
        if (y < 0) { h += y; y = 0; }
        if (x + w > imgDims.width) w = imgDims.width - x;
        if (y + h > imgDims.height) h = imgDims.height - y;
        setCropRect({ x, y, w, h });
      }
    };
    const upHandler = () => { setDragMode(null); };
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
  }, [dragMode, dragStart, imgDims, cropRect]);

  const handleCrop = () => {
    if (!imgRef.current || !cropRect) return;
    // Find the largest possible square inside the selected rectangle
    const { x, y, w, h } = cropRect;
    const side = Math.min(w, h);
    // Center the square inside the selected rectangle
    const squareX = x + (w - side) / 2;
    const squareY = y + (h - side) / 2;
    // Create a canvas for the square crop
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(
      imgRef.current,
      squareX, squareY, side, side,
      0, 0, 512, 512
    );
    canvas.toBlob(blob => {
      if (blob) onCrop(blob);
    }, 'image/jpeg', 0.95);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm user-select-none touch-none">
      <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-xs sm:max-w-sm flex flex-col items-center relative" style={{ maxHeight: '90vh' }}>
        {/* Uploading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-20 rounded-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-b-transparent mb-2" />
            <span className="text-base font-semibold text-blue-700">Uploading...</span>
          </div>
        )}
        <div className="relative w-full h-64 max-h-[60vw] sm:h-64 sm:max-h-[80vh] bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center select-none touch-none"
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          style={{ WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'none' }}
        >
          <img ref={imgRef} src={image} alt="Crop preview" className="max-w-full max-h-full object-contain" />
          {/* Freeform crop rect overlay */}
          {cropRect && (
            <>
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/10 shadow-lg transition-all duration-200"
                style={{
                  left: `${(cropRect.x / imgDims.width) * 100}%`,
                  top: `${(cropRect.y / imgDims.height) * 100}%`,
                  width: `${(cropRect.w / imgDims.width) * 100}%`,
                  height: `${(cropRect.h / imgDims.height) * 100}%`,
                  zIndex: 10,
                  pointerEvents: 'none',
                  transition: 'all 0.2s cubic-bezier(.4,2,.6,1)',
                }}
              />
              {/* Corners for resizing */}
              {(['nw','ne','sw','se'] as const).map(corner => {
                if (!cropRect) return null;
                const style: StyleObj = {
                  position: 'absolute',
                  width: 16,
                  height: 16,
                  background: '#3b82f6',
                  borderRadius: 8,
                  zIndex: 20,
                  border: '2px solid #fff',
                  boxShadow: '0 2px 8px #0003',
                  touchAction: 'none',
                  transition: 'box-shadow 0.2s, background 0.2s',
                };
                if (corner==='nw') { style.left= (cropRect.x/imgDims.width)*100+'%'; style.top=(cropRect.y/imgDims.height)*100+'%'; }
                if (corner==='ne') { style.left= ((cropRect.x+cropRect.w)/imgDims.width)*100+'%'; style.top=(cropRect.y/imgDims.height)*100+'%'; }
                if (corner==='sw') { style.left= (cropRect.x/imgDims.width)*100+'%'; style.top=((cropRect.y+cropRect.h)/imgDims.height)*100+'%'; }
                if (corner==='se') { style.left= ((cropRect.x+cropRect.w)/imgDims.width)*100+'%'; style.top=((cropRect.y+cropRect.h)/imgDims.height)*100+'%'; }
                style.transform = 'translate(-50%,-50%)';
                return <div key={corner} style={style} onMouseDown={e=>{e.stopPropagation();setDragMode(('resize-'+corner) as typeof dragMode);setDragStart({x:e.clientX,y:e.clientY,rect:{...cropRect}});}} onTouchStart={e=>{e.stopPropagation();setDragMode(('resize-'+corner) as typeof dragMode);setDragStart({x:e.touches[0].clientX,y:e.touches[0].clientY,rect:{...cropRect}});}} />;
              })}
            </>
          )}
        </div>
        {/* Live cropped preview */}
        {cropRect && imgRef.current && (
          <div className="mt-4 flex flex-col items-center">
            <span className="text-xs text-gray-500 mb-1">Preview</span>
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
              <canvas
                ref={el => {
                  if (el && imgRef.current && cropRect && cropRect.w > 0 && cropRect.h > 0) {
                    el.width = 128;
                    el.height = 128;
                    const ctx = el.getContext('2d');
                    if (ctx) {
                      ctx.clearRect(0, 0, 128, 128);
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
                style={{ width: 80, height: 80, objectFit: 'cover', background: '#f3f4f6' }}
              />
            </div>
          </div>
        )}
        <div className="flex gap-4 mt-6">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium">Cancel</button>
          <button onClick={handleCrop} disabled={!cropRect || cropRect.w < 10 || cropRect.h < 10} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">Crop & Save</button>
        </div>
      </div>
    </div>
  );
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
          className="profile-card relative overflow-visible rounded-3xl bg-gradient-to-br from-white via-blue-50 to-purple-50 shadow-xl border border-blue-100 p-0"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-purple-100/20 pointer-events-none rounded-3xl" />
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
                className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-1"
              >
                {processedProfile?.fullName}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base text-gray-500 font-medium mb-2"
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] bg-[#f5f6fa] rounded-xl px-4 py-2 shadow-md shadow-inner" style={{boxShadow: 'inset 0 2px 8px #e0e7ef, 0 1.5px 4px #fff'}}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-500 mb-0.5 sm:mb-0 sm:mr-1">
                <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                Student ID:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-900 truncate">{profile?.student_id ?? 'N/A'}</span>
            </div>
            {/* Program */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] bg-[#f5f6fa] rounded-xl px-4 py-2 shadow-md shadow-inner" style={{boxShadow: 'inset 0 2px 8px #e0e7ef, 0 1.5px 4px #fff'}}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-500 mb-0.5 sm:mb-0 sm:mr-1">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                Program:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-900 truncate">{profile?.department ?? 'N/A'}</span>
            </div>
            {/* Year Level */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] bg-[#f5f6fa] rounded-xl px-4 py-2 shadow-md shadow-inner" style={{boxShadow: 'inset 0 2px 8px #e0e7ef, 0 1.5px 4px #fff'}}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-500 mb-0.5 sm:mb-0 sm:mr-1">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                Year Level:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-900 truncate">{profile?.year_level ?? 'N/A'}</span>
            </div>
            {/* Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] bg-[#f5f6fa] rounded-xl px-4 py-2 shadow-md shadow-inner" style={{boxShadow: 'inset 0 2px 8px #e0e7ef, 0 1.5px 4px #fff'}}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-500 mb-0.5 sm:mb-0 sm:mr-1">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                Section:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-900 truncate">{profile?.section ?? 'N/A'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}; 
