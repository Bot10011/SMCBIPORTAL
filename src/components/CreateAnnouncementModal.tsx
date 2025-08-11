import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  X, 
  Save,
  Upload,
  Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Helper function to check storage bucket configuration
const checkStorageBucket = async () => {
  try {
    const { error } = await supabase.storage
      .from('announcement')
      .list('', { limit: 1 });
    
    if (error) {
      console.error('Storage bucket check failed:', error);
      return false;
    }
    
    console.log('Storage bucket is accessible');
    return true;
  } catch (error) {
    console.error('Storage bucket check error:', error);
    return false;
  }
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AnnouncementFormData {
  title: string;
  content: string;
  author: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  image?: File | string;
  is_active: boolean;
}

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAnnouncement?: Announcement | null;
  onSuccess: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', color: 'text-red-600 bg-red-50 border-red-200' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50 border-green-200' }
];

const CATEGORY_OPTIONS = [
  'General',
  'Enrollment',
  'Academic',
  'Services',
  'Events',
  'System',
  'Emergency'
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
  editingAnnouncement,
  onSuccess
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    content: '',
    author: '',
    priority: 'medium',
    category: 'General',
    image: undefined,
    is_active: true
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================
  
  const uploadImageToStorage = async (file: File): Promise<string> => {
    try {
      // First check if storage bucket is accessible
      const bucketAccessible = await checkStorageBucket();
      if (!bucketAccessible) {
        // Fallback: Convert image to base64 and store in database
        console.log('Storage bucket not accessible, using base64 fallback');
        return await convertImageToBase64(file);
      }

      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2);
      const fileName = `${timestamp}-${randomString}.${fileExt}`;
      
      // Create folder structure: announcement/images/filename
      const folderPath = 'images';
      const fullPath = `${folderPath}/${fileName}`;
      
      console.log('Uploading file:', file.name, 'to path:', fullPath);
      
      const { error } = await supabase.storage
        .from('announcement')
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        // Fallback to base64 if storage upload fails
        console.log('Storage upload failed, using base64 fallback');
        return await convertImageToBase64(file);
      }

      // Get public URL with folder structure
      const { data: { publicUrl } } = supabase.storage
        .from('announcement')
        .getPublicUrl(fullPath);

      console.log('Uploaded image URL:', publicUrl);
      console.log('Full path:', fullPath);
      
      // Verify the upload was successful by checking if the file exists
      const { data: fileCheck } = await supabase.storage
        .from('announcement')
        .list(folderPath, {
          limit: 100,
          offset: 0,
          search: fileName
        });

      if (!fileCheck || fileCheck.length === 0) {
        console.error('File not found after upload');
        // Fallback to base64 if verification fails
        console.log('File verification failed, using base64 fallback');
        return await convertImageToBase64(file);
      }

      console.log('File upload verified successfully');
      
      // Test if the URL is actually accessible by creating a test image
      const testImage = new Image();
      testImage.crossOrigin = 'anonymous';
      
      return new Promise((resolve) => {
        testImage.onload = () => {
          console.log('Storage URL is accessible');
          resolve(publicUrl);
        };
        testImage.onerror = async () => {
          console.log('Storage URL failed to load, using base64 fallback');
          const base64Url = await convertImageToBase64(file);
          resolve(base64Url);
        };
        testImage.src = publicUrl;
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      // Fallback to base64 if all else fails
      console.log('Upload failed, using base64 fallback');
      return await convertImageToBase64(file);
    }
  };

  // Fallback function to convert image to base64
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        console.log('Image converted to base64');
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const createAnnouncement = async (): Promise<void> => {
    try {
      setUploadProgress(10);
      
      let imageUrl = null;
      
      // Upload image if provided
      if (formData.image && typeof formData.image === 'object') {
        setUploadProgress(30);
        imageUrl = await uploadImageToStorage(formData.image as File);
        setUploadProgress(70);
      } else if (typeof formData.image === 'string') {
        imageUrl = formData.image;
      }

      setUploadProgress(90);

      const announcementData = {
        title: formData.title,
        content: formData.content,
        author: formData.author,
        priority: formData.priority,
        category: formData.category,
        image: imageUrl,
        is_active: formData.is_active,
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('announcements')
        .insert([announcementData]);

      if (error) throw error;
      
      setUploadProgress(100);
      toast.success('Announcement created successfully');
      onClose();
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    } finally {
      setUploadProgress(0);
    }
  };

  const updateAnnouncement = async (): Promise<void> => {
    if (!editingAnnouncement) return;

    try {
      setUploadProgress(10);
      
      let imageUrl = editingAnnouncement.image || null;
      
      // Upload new image if provided
      if (formData.image && typeof formData.image === 'object') {
        setUploadProgress(30);
        imageUrl = await uploadImageToStorage(formData.image as File);
        setUploadProgress(70);
      } else if (typeof formData.image === 'string') {
        imageUrl = formData.image;
      }

      setUploadProgress(90);

      const updateData = {
        title: formData.title,
        content: formData.content,
        author: formData.author,
        priority: formData.priority,
        category: formData.category,
        image: imageUrl,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('announcements')
        .update(updateData)
        .eq('id', editingAnnouncement.id);

      if (error) throw error;
      
      setUploadProgress(100);
      toast.success('Announcement updated successfully');
      onClose();
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast.error('Failed to update announcement');
    } finally {
      setUploadProgress(0);
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (editingAnnouncement) {
      updateAnnouncement();
    } else {
      createAnnouncement();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (): void => {
    setFormData({ ...formData, image: undefined });
    setImagePreview(null);
  };

  const resetForm = (): void => {
    setFormData({
      title: '',
      content: '',
      author: '',
      priority: 'medium',
      category: 'General',
      image: undefined,
      is_active: true
    });
    setImagePreview(null);
    setUploadProgress(0);
  };

  const handleModalClose = (): void => {
    onClose();
    resetForm();
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  React.useEffect(() => {
    if (editingAnnouncement) {
      setFormData({
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
        author: editingAnnouncement.author,
        priority: editingAnnouncement.priority,
        category: editingAnnouncement.category,
        image: editingAnnouncement.image || '',
        is_active: editingAnnouncement.is_active
      });
      // Set image preview if editing
      if (editingAnnouncement.image) {
        setImagePreview(editingAnnouncement.image);
      }
    } else {
      resetForm();
    }
  }, [editingAnnouncement]);

  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100000
          }}
          onClick={handleModalClose}
        >
          <motion.div
            className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden border border-white/20"
            initial={{ scale: 0.8, opacity: 0, y: 30, rotateX: -15 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30, rotateX: -15 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30,
              duration: 0.4
            }}
            style={{
              backdropFilter: 'blur(20px)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              transformStyle: 'preserve-3d'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
                         <div className="flex items-center justify-between p-3 border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {editingAnnouncement ? 'Update announcement details' : 'Add a new announcement to the portal'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleModalClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
                                                                             <form onSubmit={handleSubmit} className="p-3 space-y-3">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                     <div className="relative">
                                           <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Title *
                        {formData.title && (
                          <span className="ml-2 text-green-500">✓</span>
                        )}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                        placeholder="Enter announcement title"
                      />
                   </div>

                                     <div className="relative">
                                           <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Author *
                        {formData.author && (
                          <span className="ml-2 text-green-500">✓</span>
                        )}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                        placeholder="Enter author name"
                      />
                   </div>
                </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                     <div className="relative">
                                           <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Priority *
                        {formData.priority && (
                          <span className="ml-2 text-green-500">✓</span>
                        )}
                      </label>
                      <select
                        required
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                      >
                       {PRIORITY_OPTIONS.map(option => (
                         <option key={option.value} value={option.value}>{option.label}</option>
                       ))}
                     </select>
                   </div>

                                     <div className="relative">
                                           <label className="block text-xs font-medium text-gray-700 mb-0.5">
                        Category *
                        {formData.category && (
                          <span className="ml-2 text-green-500">✓</span>
                        )}
                      </label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                      >
                       {CATEGORY_OPTIONS.map(category => (
                         <option key={category} value={category}>{category}</option>
                       ))}
                     </select>
                   </div>
                </div>

                             <div>
                                   <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Banner Image (Optional)
                  </label>
                 <div className="space-y-1">
                  {/* Image Upload Area */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                                         <label
                       htmlFor="image-upload"
                       className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-gray-300 rounded-md cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                     >
                      {imagePreview ? (
                        <div className="relative w-full h-full">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                  
                  {/* Upload Progress */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

                                                             <div className="relative">
                                       <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Content *
                      {formData.content && (
                        <span className="ml-2 text-green-500">✓</span>
                      )}
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 text-sm"
                      placeholder="Enter announcement content"
                    />
                   <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                     {formData.content.length} characters
                   </div>
                 </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-xs text-gray-700">
                  Active (visible to users)
                </label>
              </div>

                                                             {/* Modal Actions */}
                                   <div className="flex justify-end gap-3 pt-3 border-t border-gray-200/50">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all duration-200 flex items-center gap-2 hover:scale-105 shadow-md hover:shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    {editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
                  </button>
                </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render at root level for maximum z-index
  return isOpen ? createPortal(modalContent, document.body) : null;
};

export default CreateAnnouncementModal; 
