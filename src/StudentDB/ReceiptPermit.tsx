import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileText, 
  File, 
  Trash2, 
  Upload, 
  Download, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Calendar,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDOM from 'react-dom';

const BUCKET = 'receipt.permit';
const FOLDER_RECEIPT = 'Tuition-Receipt';
const FOLDER_PERMIT = 'Exam-Permit';



const ReceiptPermit: React.FC = () => {
  const { user } = useAuth();
  type StorageFile = { 
    name: string; 
    id?: string; 
    updated_at?: string; 
    created_at?: string; 
    last_accessed_at?: string; 
    metadata?: Record<string, unknown>; 
    folder: string 
  };
  
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [modalImage, setModalImage] = useState<{ url: string; name: string } | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<StorageFile[]>([]);
  const [permitFiles, setPermitFiles] = useState<StorageFile[]>([]);
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; fileName: string; folder: string } | null>(null);
  const [imageLoading, setImageLoading] = useState<{ [key: string]: boolean }>({});
  const [selectedUploadType, setSelectedUploadType] = useState<'receipt' | 'permit'>('receipt');
  const [uploadAnimation, setUploadAnimation] = useState<{
    show: boolean;
    file: File | null;
    type: 'receipt' | 'permit';
    startPosition: { x: number; y: number };
    endPosition: { x: number; y: number };
  } | null>(null);

  // Download handler for image preview modal
  const downloadImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!modalImage) return;
    const link = document.createElement('a');
    link.href = modalImage.url;
    link.download = modalImage.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [modalImage]);

  // Fetch files from both folders and get signed URLs
  useEffect(() => {
    if (!user) return;
    
    let isMounted = true; // Prevent state updates if component unmounts
    
    const fetchFiles = async () => {
      setError(null);
      let allReceiptFiles: StorageFile[] = [];
      let allPermitFiles: StorageFile[] = [];
      const urlMap: { [key: string]: string } = {};
      const newImageErrors: { [key: string]: boolean } = {};
      const newImageLoading: { [key: string]: boolean } = {};
      
      try {
        for (const folder of [FOLDER_RECEIPT, FOLDER_PERMIT]) {
          console.log(`Fetching files from folder: ${user.id}/${folder}/`);
          
          const { data, error } = await supabase.storage
            .from(BUCKET)
            .list(`${user.id}/${folder}/`, { limit: 100 });
          
          if (error && error.message !== 'The resource was not found') {
            console.error(`Error fetching from ${folder}:`, error);
            if (isMounted) {
              setError(`Error fetching ${folder}: ${error.message}`);
            }
          }
          
          if (data && data.length > 0) {
            console.log(`Found ${data.length} files in ${folder}`, data);
            
            for (const f of data) {
              const key = f.name + folder;
              
              // Generate signed URL
              const { data: urlData, error: urlError } = await supabase.storage
                .from(BUCKET)
                .createSignedUrl(`${user.id}/${folder}/${f.name}`, 60 * 60 * 24);
              
              if (urlError) {
                console.error(`Error creating signed URL for ${f.name}:`, urlError);
              }
              
              // Set loading state for images
              if (urlData?.signedUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)) {
                newImageLoading[key] = true;
                console.log(`Signed URL for image ${f.name}:`, urlData.signedUrl);
              }
              
              urlMap[key] = urlData?.signedUrl || '#';
            }
            
            if (folder === FOLDER_RECEIPT) {
              const receiptFilesWithFolder = data.map(f => ({ 
                ...f, 
                folder,
                created_at: f.created_at || new Date().toISOString(),
                updated_at: f.updated_at || new Date().toISOString()
              }));
              allReceiptFiles = allReceiptFiles.concat(receiptFilesWithFolder);
            }
            if (folder === FOLDER_PERMIT) {
              const permitFilesWithFolder = data.map(f => ({ 
                ...f, 
                folder,
                created_at: f.created_at || new Date().toISOString(),
                updated_at: f.updated_at || new Date().toISOString()
              }));
              allPermitFiles = allPermitFiles.concat(permitFilesWithFolder);
            }
          }
        }
        
        // Only update state if component is still mounted
        if (isMounted) {
          setReceiptFiles(allReceiptFiles);
          setPermitFiles(allPermitFiles);
          setSignedUrls(urlMap);
          setImageErrors(newImageErrors);
          setImageLoading(newImageLoading);
          console.log('All receipt files:', allReceiptFiles);
          console.log('All permit files:', allPermitFiles);
          console.log('Signed URLs map:', urlMap);
        }
      } catch (err) {
        console.error('Error in fetchFiles:', err);
        if (isMounted) {
          setError('Failed to fetch files. Please try again.');
        }
      }
    };
    
    fetchFiles();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, refresh]);

  useEffect(() => {
    // Remove document.body class manipulation for modal open/close
    // No longer needed since modals will only overlay main content
    return () => {};
  }, [deleteConfirm]);


  // Enhanced file validation
  const validateFile = useCallback((file: File): { valid: boolean; message: string } => {
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return { valid: false, message: 'File size must be less than 5MB' };
    }

    // Only allow image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, message: 'Only image files (JPG, PNG, GIF, WebP) are allowed' };
    }

    return { valid: true, message: 'File is valid' };
  }, []);

  // Upload to correct folder
  const handleUpload = useCallback(async (file: File, type: 'receipt' | 'permit') => {
    setError(null);
    setSuccess(null);
    if (!user) return;
    
    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    
    // Start upload animation
    const uploadButton = document.querySelector('[data-upload-button]') as HTMLElement;
    const targetSection = document.querySelector(`[data-section="${type}"]`) as HTMLElement;
    
    if (uploadButton && targetSection) {
      const buttonRect = uploadButton.getBoundingClientRect();
      const sectionRect = targetSection.getBoundingClientRect();
      
      setUploadAnimation({
        show: true,
        file,
        type,
        startPosition: {
          x: buttonRect.left + buttonRect.width / 2,
          y: buttonRect.top + buttonRect.height / 2
        },
        endPosition: {
          x: sectionRect.left + sectionRect.width / 2,
          y: sectionRect.top + sectionRect.height / 2
        }
      });
    }
    
    setUploading(true);
    
    const folder = type === 'receipt' ? FOLDER_RECEIPT : FOLDER_PERMIT;
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9,._'-]/g, '');
    const filePath = `${user.id}/${folder}/${timestamp}-${sanitizedName}`;
    
    // Enhanced metadata for better organization
    const uploadMetadata = {
      originalName: file.name,
      contentType: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadType: type,
      tags: type === 'receipt' ? ['receipt', 'tuition', 'payment'] : ['permit', 'exam']
    };
    
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        metadata: uploadMetadata
      });
    
    setUploading(false);
    
    if (error) {
      setError(error.message);
      setUploadAnimation(null);
    } else {
      const documentType = type === 'receipt' ? 'Tuition Receipt' : 'Exam Permit';
      setSuccess(`${documentType} uploaded successfully!`);
      setRefresh(r => !r);
      
      // Hide animation after 1.5 seconds
      setTimeout(() => {
        setUploadAnimation(null);
      }, 1500);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    }
  }, [user?.id, refresh]);





  // Delete from correct folder
  const handleDelete = useCallback(async (fileName: string, folder: string) => {
    if (!user) return;
    setError(null);
    setUploading(true);
    
    try {
      const { error } = await supabase.storage
        .from(BUCKET)
        .remove([`${user.id}/${folder}/${fileName}`]);
      
      if (error) {
        setError(`Failed to delete file: ${error.message}`);
      } else {
        // Clear any cached URLs for this file
        setSignedUrls(prev => {
          const newUrls = { ...prev };
          delete newUrls[fileName + folder];
          return newUrls;
        });
        
        // Clear any loading states for this file
        setImageLoading(prev => {
          const newLoading = { ...prev };
          delete newLoading[fileName + folder];
          return newLoading;
        });
        
        // Clear any error states for this file
        setImageErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fileName + folder];
          return newErrors;
        });
        
        // Refresh the file list
        setRefresh(r => !r);
      }
    } catch (err) {
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }, [user?.id, refresh]);

  // Handle delete confirmation
  const handleDeleteClick = (fileName: string, folder: string) => {
    setDeleteConfirm({ show: true, fileName, folder });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm) {
      await handleDelete(deleteConfirm.fileName, deleteConfirm.folder);
      setDeleteConfirm(null);
    }
  };

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  // Memoized data processing
  const processedFiles = useMemo(() => {
    return {
      receiptFiles: receiptFiles.map(file => ({
        ...file,
        isImage: /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name),
        fileKey: file.name + file.folder,
        url: signedUrls[file.name + file.folder],
        isLoading: imageLoading[file.name + file.folder],
        hasError: imageErrors[file.name + file.folder]
      })),
      permitFiles: permitFiles.map(file => ({
        ...file,
        isImage: /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name),
        fileKey: file.name + file.folder,
        url: signedUrls[file.name + file.folder],
        isLoading: imageLoading[file.name + file.folder],
        hasError: imageErrors[file.name + file.folder]
      }))
    };
  }, [receiptFiles, permitFiles, signedUrls, imageLoading, imageErrors]);

  // Modal for image preview




  // Loading state with enhanced skeleton
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br via-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Header Skeleton */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-inner shadow-inner-strong border border-blue-100 mb-12">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                    <div className="w-6 h-6 bg-white/30 rounded animate-pulse"></div>
                  </div>
                  <div>
                    <div className="h-8 w-48 bg-white/20 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-white/20 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Content Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
            {/* Receipt Section Skeleton */}
            <div className="bg-white/90 rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                <div className="h-6 w-32 bg-blue-200 rounded animate-pulse"></div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="flex-1">
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Upload Section Skeleton */}
            <div className="bg-white/90 rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center">
              <div className="mb-4">
                <div className="inline-block p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex gap-2">
                    <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mx-auto mb-3"></div>
              <div className="w-32 h-10 bg-gray-200 rounded-lg animate-pulse mx-auto mb-2"></div>
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div>
            </div>

            {/* Permit Section Skeleton */}
            <div className="bg-white/90 rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b border-gray-200">
                <div className="h-6 w-32 bg-green-200 rounded animate-pulse"></div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="flex-1">
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Premium Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="receipt-permit-header relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-inner shadow-inner-strong border border-blue-100 mb-12"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Document Management</h1>
                  <p className="text-white/80 text-sm font-medium">Upload and manage your tuition receipts and exam permits securely</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/80">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Error and Success Display */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </motion.div>
          )}
          

          
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              className="fixed top-4 right-4 z-[9999] bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl border border-green-400 max-w-sm"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-white flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">{success}</p>
                  <p className="text-green-100 text-sm">File has been uploaded successfully</p>
                </div>
                <button
                  onClick={() => setSuccess(null)}
                  className="ml-auto p-1 hover:bg-green-600 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

                {/* Main Content Section - Horizontal Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
          {/* Tuition Receipts */}
          <div data-section="receipt" className="bg-white/90 rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-blue-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tuition Receipts
                <span className="ml-auto text-sm font-medium text-blue-700 bg-blue-200 px-2 py-1 rounded-full">
                  {receiptFiles.length}
                </span>
              </h3>
            </div>
            <div className="p-6">
              {receiptFiles.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full mb-3">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <p className="text-gray-500 font-medium text-sm">No tuition receipts uploaded yet</p>
                  <p className="text-xs text-gray-400 mt-1">Upload your first receipt to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {processedFiles.receiptFiles.map((file, index) => {
                    if (!file || !file.name) return null;
                    return (
                                              <div key={`receipt-${file.name}-${file.folder}-${index}`} className="receipt-file-item bg-gray-50 rounded-lg border border-gray-200 p-2">
                          <div className="flex items-center gap-2">
                            {file.isImage && !file.hasError ? (
                              <button
                                onClick={() => setModalImage({ url: file.url, name: file.name })}
                                className="relative block focus:outline-none group flex-shrink-0"
                              >
                                {file.isLoading && (
                                  <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center z-10">
                                    <Loader2 className="w-3 h-3 animate-spin text-gray-600" />
                                  </div>
                                )}
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  className="w-8 h-8 object-cover rounded-lg border shadow-sm transition-all duration-200 group-hover:scale-105"
                                  onLoad={() => {
                                    setImageLoading(prev => ({ ...prev, [file.fileKey]: false }));
                                    console.log('Receipt image loaded successfully:', file.url);
                                  }}
                                  onError={() => {
                                    setImageErrors(prev => ({ ...prev, [file.fileKey]: true }));
                                    setImageLoading(prev => ({ ...prev, [file.fileKey]: false }));
                                    console.error('Receipt image failed to load:', file.url);
                                  }}
                                  loading="lazy"
                                />
                              </button>
                            ) : (
                              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0">
                                <File className="text-gray-400 w-4 h-4" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                {file.created_at ? new Date(file.created_at).toLocaleDateString() : '—'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {file.isImage && !file.hasError && (
                                <button
                                  onClick={() => setModalImage({ url: file.url, name: file.name })}
                                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                  title="Preview"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteClick(file.name, file.folder)}
                                disabled={uploading}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                </div>
              )}
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white/90 rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center">
            {/* Document Type Selector */}
            <div className="mb-4">
              <div className="inline-block p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedUploadType('receipt')}
                    className={`px-3 py-2 rounded-lg font-medium transition-all duration-300 border-2 text-sm ${
                      selectedUploadType === 'receipt'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>Receipt</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedUploadType('permit')}
                    className={`px-3 py-2 rounded-lg font-medium transition-all duration-300 border-2 text-sm ${
                      selectedUploadType === 'permit'
                        ? 'bg-green-600 text-white border-green-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>Permit</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div>
              <p className="text-gray-600 mb-3 text-sm">
                {selectedUploadType === 'receipt' 
                  ? 'Upload tuition payment receipts'
                  : 'Upload exam permits'
                }
              </p>
              
              <button
                data-upload-button
                onClick={() => receiptInputRef.current?.click()}
                disabled={uploading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  uploading 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : selectedUploadType === 'receipt'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Choose File
                  </>
                )}
              </button>
              
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleUpload(file, selectedUploadType);
                  }
                }}
                disabled={uploading}
              />
              
              <p className="text-xs text-gray-500 mt-2">
                Max 5MB per file
              </p>
            </div>
          </div>

          {/* Exam Permits */}
          <div data-section="permit" className="bg-white/90 rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-green-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Exam Permits
                <span className="ml-auto text-sm font-medium text-green-700 bg-green-200 px-2 py-1 rounded-full">
                  {permitFiles.length}
                </span>
              </h3>
            </div>
            <div className="p-6">
              {permitFiles.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-50 rounded-full mb-3">
                    <FileText className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-gray-500 font-medium text-sm">No exam permits uploaded yet</p>
                  <p className="text-xs text-gray-400 mt-1">Upload your first permit to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {processedFiles.permitFiles.map((file, index) => {
                    if (!file || !file.name) return null;
                    
                    return (
                      <div key={`permit-${file.name}-${file.folder}-${index}`} className="permit-file-item bg-gray-50 rounded-lg border border-gray-200 p-2">
                        <div className="flex items-center gap-2">
                          {file.isImage && !file.hasError ? (
                            <button
                              onClick={() => setModalImage({ url: file.url, name: file.name })}
                              className="relative block focus:outline-none group flex-shrink-0"
                            >
                              {file.isLoading && (
                                <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center z-10">
                                  <Loader2 className="w-3 h-3 animate-spin text-gray-600" />
                                </div>
                              )}
                              <img
                                src={file.url}
                                alt={file.name}
                                className="w-8 h-8 object-cover rounded-lg border shadow-sm transition-all duration-200 group-hover:scale-105"
                                onLoad={() => {
                                  setImageLoading(prev => ({ ...prev, [file.fileKey]: false }));
                                }}
                                onError={() => {
                                  setImageErrors(prev => ({ ...prev, [file.fileKey]: true }));
                                  setImageLoading(prev => ({ ...prev, [file.fileKey]: false }));
                                }}
                                loading="lazy"
                              />
                            </button>
                          ) : (
                            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0">
                              <File className="text-gray-400 w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {file.created_at ? new Date(file.created_at).toLocaleDateString() : '—'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {file.isImage && !file.hasError && (
                              <button
                                onClick={() => setModalImage({ url: file.url, name: file.name })}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Preview"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteClick(file.name, file.folder)}
                              disabled={uploading}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Portal) */}
      {typeof window !== 'undefined' && deleteConfirm && ReactDOM.createPortal(
        <AnimatePresence>
          <>
            {/* Backdrop to block all interaction with the app/sidebar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm pointer-events-auto"
              aria-hidden="true"
            />
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center modal-allow"
              aria-modal="true"
              role="dialog"
              tabIndex={-1}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white/90 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <Trash2 className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Delete File</h3>
                      <p className="text-sm text-gray-500">This action cannot be undone</p>
                    </div>
                  </div>
                  {/* Show image preview or file icon */}
                  <div className="flex flex-col items-center mb-4">
                    {(() => {
                      const fileKey = deleteConfirm.fileName + deleteConfirm.folder;
                      const url = signedUrls[fileKey];
                      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(deleteConfirm.fileName) && url) {
                        return (
                          <img
                            src={url}
                            alt={deleteConfirm.fileName}
                            className="w-32 h-32 object-contain rounded-lg border mb-2 shadow"
                          />
                        );
                      } else {
                        return (
                          <div className="w-24 h-24 flex items-center justify-center bg-gray-100 rounded-lg border mb-2">
                            <File className="w-10 h-10 text-gray-400" />
                          </div>
                        );
                      }
                    })()}
                  </div>
                  <p className="text-gray-600 mb-6 text-center">
                    Are you sure you want to delete this file?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteCancel}
                      className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={uploading}
                      className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </div>
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        </AnimatePresence>,
        document.getElementById('modal-root') as HTMLElement
      )}

      {/* Upload Animation */}
      <AnimatePresence>
        {uploadAnimation && (
          <motion.div
            initial={{ 
              opacity: 1,
              scale: 0.5,
              x: uploadAnimation.startPosition.x,
              y: uploadAnimation.startPosition.y
            }}
            animate={{ 
              opacity: [1, 0.8, 0],
              scale: [0.5, 1.2, 0.8],
              x: uploadAnimation.endPosition.x,
              y: uploadAnimation.endPosition.y
            }}
            transition={{ 
              duration: 1.5,
              ease: "easeInOut"
            }}
            className="fixed z-[9999] pointer-events-none"
            style={{
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              {/* File icon */}
              <div className={`w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center ${
                uploadAnimation.type === 'receipt' 
                  ? 'bg-blue-50 border-blue-300' 
                  : 'bg-green-50 border-green-300'
              }`}>
                <FileText className={`w-6 h-6 ${
                  uploadAnimation.type === 'receipt' ? 'text-blue-500' : 'text-green-500'
                }`} />
              </div>
              
              {/* Trailing effect */}
              <motion.div
                initial={{ opacity: 0.6, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={`absolute inset-0 rounded-lg ${
                  uploadAnimation.type === 'receipt' ? 'bg-blue-200' : 'bg-green-200'
                }`}
              />
              
              {/* Success sparkle */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.3 }}
                className="absolute -top-1 -right-1"
              >
                <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal (Portal) */}
      {typeof window !== 'undefined' && modalImage && ReactDOM.createPortal(
        <AnimatePresence>
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm pointer-events-auto"
              aria-hidden="true"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center"
            >
              <div className="bg-white/90 rounded-2xl shadow-2xl max-w-md w-auto mx-4 relative overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Image Preview</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalImage(null)}
                    className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90 top-2 right-2 sm:top-3 sm:right-3"
                    aria-label="Close Image Preview"
                    style={{ backgroundColor: 'rgb(239, 68, 68)', boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px', zIndex: 50 }}
                  >
                    ×
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex justify-center">
                    <img
                      src={modalImage.url}
                      alt={modalImage.name}
                      className="max-h-[60vh] max-w-[90vw] rounded-lg shadow-lg object-contain"
                      style={{ maxWidth: '400px' }}
                      onLoad={() => console.log('Image loaded successfully:', modalImage.url)}
                      onError={() => console.error('Image failed to load:', modalImage.url)}
                    />
                  </div>
                </div>
                <div className="flex justify-center gap-3 p-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={downloadImage}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        </AnimatePresence>,
        document.getElementById('modal-root') as HTMLElement
      )}
    </div>
  );
};

export { ReceiptPermit };
