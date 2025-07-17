import React, { useEffect, useRef, useState } from 'react';
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
}> = ({ image, onCancel, onCrop }) => {
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
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full flex flex-col items-center">
        <div className="relative w-64 h-64 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center select-none touch-none"
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
  const [touchActive, setTouchActive] = useState(false);

  const handleProfileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  // Handle crop and upload
  const handleCropAndUpload = async (croppedBlob: Blob) => {
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
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-inner shadow-inner-strong border border-blue-100"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 to-purple-100/30 pointer-events-none" />
        <div className="relative p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8">
          {/* Profile Picture Section */}
          <motion.div 
            whileHover={{ scale: 1.04 }}
            className="relative group shadow-inner rounded-2xl"
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
              />
            )}
            <div
              className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-gradient-to-br from-purple-200 to-blue-200 shadow-inner flex items-center justify-center cursor-pointer transition-all duration-300 group outline-none"
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
                if (touchActive) {
                  setTouchActive(false);
                  return;
                }
                if (!isUploading) fileInputRef.current?.click();
                if (isTouchDevice()) {
                  setShowOverlay(true);
                  if (overlayTimeout.current) clearTimeout(overlayTimeout.current);
                  overlayTimeout.current = setTimeout(() => setShowOverlay(false), 1800);
                }
              }}
              onTouchStart={() => {
                setTouchActive(true);
                if (!isUploading) fileInputRef.current?.click();
                setShowOverlay(true);
                if (overlayTimeout.current) clearTimeout(overlayTimeout.current);
                overlayTimeout.current = setTimeout(() => setShowOverlay(false), 1800);
              }}
              style={{ outline: 'none' }}
            >
              {/* Animated colored ring on hover/focus/tap */}
              <motion.div
                initial={false}
                animate={(showOverlay || isUploading) ? { scale: 1.08, boxShadow: '0 0 0 4px #6366f1, 0 8px 32px 0 rgba(99,102,241,0.15)' } : { scale: 1, boxShadow: '0 2px 12px 0 rgba(0,0,0,0.06)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="absolute inset-0 w-full h-full rounded-2xl pointer-events-none z-20"
                style={{ border: '2px solid transparent' }}
              />
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
              {/* Profile image or placeholder */}
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                  style={{ zIndex: 0, objectFit: 'cover', objectPosition: 'center', aspectRatio: '1/1', background: '#f3f4f6' }}
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
              ) : (
                <UserCircle className="absolute inset-0 w-full h-full text-purple-300" style={{ zIndex: 0 }} />
              )}
              {/* Overlay always covers the entire area */}
              <AnimatePresence>
                {(showOverlay || isUploading) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-600/80 to-purple-600/80 backdrop-blur-[6px] flex flex-col items-center justify-center gap-2 z-30 rounded-2xl"
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
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="flex items-center justify-center mb-2"
                        >
                          <div className="bg-white/30 backdrop-blur-lg rounded-full p-3 shadow-lg flex items-center justify-center border border-white/30">
                            <Camera className="w-8 h-8 text-white drop-shadow" />
                          </div>
                        </motion.div>
                        <span className="text-sm text-white font-medium px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm shadow">
                          {profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
                        </span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Hide overlay after file selection */}
              {showOverlay && (
                <div
                  tabIndex={-1}
                  style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'transparent' }}
                  onClick={() => setShowOverlay(false)}
                />
              )}
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
              {profile?.last_name} {profile?.middle_name ? profile.middle_name + ' ' : ''}{profile?.first_name}
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
       className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {/* Student ID */}
        <div className="flex flex-col items-center bg-white rounded-2xl shadow-inner shadow-inner-strong border border-blue-100 p-4 sm:p-6 gap-1 sm:gap-2 transition-all">
          <div className="p-2 sm:p-3 rounded-full bg-blue-50 mb-1 sm:mb-2">
            <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div className="text-xs text-gray-500">Student ID</div>
          <div className="text-base sm:text-lg font-bold text-gray-900">{profile?.student_id ?? 'N/A'}</div>
        </div>
        {/* Program */}
        <div className="flex flex-col items-center bg-white rounded-2xl shadow-inner shadow-inner-strong border border-blue-100 p-4 sm:p-6 gap-1 sm:gap-2 transition-all">
          <div className="p-2 sm:p-3 rounded-full bg-purple-50 mb-1 sm:mb-2">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
          </div>
          <div className="text-xs text-gray-500">Program</div>
          <div className="text-base sm:text-lg font-bold text-gray-900">{profile?.department ?? 'N/A'}</div>
        </div>
        {/* Year Level */}
        <div className="flex flex-col items-center bg-white rounded-2xl shadow-inner shadow-inner-strong border border-blue-100 p-4 sm:p-6 gap-1 sm:gap-2 transition-all">
          <div className="p-2 sm:p-3 rounded-full bg-green-50 mb-1 sm:mb-2">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          </div>
          <div className="text-xs text-gray-500">Year Level</div>
          <div className="text-base sm:text-lg font-bold text-gray-900">{profile?.year_level ?? 'N/A'}</div>
        </div>
        {/* Section */}
        <div className="flex flex-col items-center bg-white rounded-2xl shadow-inner shadow-inner-strong border border-blue-100 p-4 sm:p-6 gap-1 sm:gap-2 transition-all">
          <div className="p-2 sm:p-3 rounded-full bg-yellow-50 mb-1 sm:mb-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
          </div>
          <div className="text-xs text-gray-500">Section</div>
          <div className="text-base sm:text-lg font-bold text-gray-900">{profile?.section ?? 'N/A'}</div>
        </div>
      </motion.div>
    </div>
  );
}; 
