import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, File, Trash2 } from 'lucide-react';

const BUCKET = 'receipt.permit';
const FOLDER_RECEIPT = 'Tuition-Receipt';
const FOLDER_PERMIT = 'Exam-Permit';

function getFileIcon(fileName: string) {
  if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <File className="text-blue-400 w-5 h-5" />;
  if (fileName.match(/\.pdf$/i)) return <File className="text-red-500 w-5 h-5" />;
  if (fileName.match(/\.(txt|doc|docx)$/i)) return <FileText className="text-gray-500 w-5 h-5" />;
  return <File className="text-gray-400 w-5 h-5" />;
}

const ReceiptPermit: React.FC = () => {
  const { user } = useAuth();
  type StorageFile = { name: string; id?: string; updated_at?: string; created_at?: string; last_accessed_at?: string; metadata?: Record<string, unknown>; folder: string };
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [modalImage, setModalImage] = useState<{ url: string; name: string } | null>(null);
  // Add useState for separate files
  const [receiptFiles, setReceiptFiles] = useState<StorageFile[]>([]);
  const [permitFiles, setPermitFiles] = useState<StorageFile[]>([]);
  const [signedUrls, setSignedUrls] = useState<{ [key: string]: string }>({});
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; fileName: string; folder: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [fileValidation, setFileValidation] = useState<{ [key: string]: { valid: boolean; message: string } }>({});
  const [imageLoading, setImageLoading] = useState<{ [key: string]: boolean }>({});
  const [imageCache, setImageCache] = useState<{ [key: string]: string }>({});

  // Fetch files from both folders and get signed URLs
  useEffect(() => {
    if (!user) return;
    const fetchFiles = async () => {
      setError(null);
      let allReceiptFiles: StorageFile[] = [];
      let allPermitFiles: StorageFile[] = [];
      const urlMap: { [key: string]: string } = {};
      const newImageErrors: { [key: string]: boolean } = {};
      const newImageLoading: { [key: string]: boolean } = {};
      
      for (const folder of [FOLDER_RECEIPT, FOLDER_PERMIT]) {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .list(`${user.id}/${folder}/`, { limit: 100 });
        if (error && error.message !== 'The resource was not found') setError(error.message);
        if (data) {
          for (const f of data) {
            const key = f.name + folder;
            // Generate signed URL with longer expiration for better caching
            const { data: urlData } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(`${user.id}/${folder}/${f.name}`, 60 * 60 * 24);
            
            // Validate image files and preload for better performance
            if (urlData?.signedUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)) {
              newImageLoading[key] = true;
              
              // Check if image is already cached
              if (imageCache[key]) {
                urlMap[key] = imageCache[key];
                newImageLoading[key] = false;
                continue;
              }
              
              try {
                const img = new Image();
                img.onload = () => {
                  setImageCache(prev => ({ ...prev, [key]: urlData.signedUrl }));
                  newImageLoading[key] = false;
                };
                img.onerror = () => {
                  newImageErrors[key] = true;
                  newImageLoading[key] = false;
                };
                img.src = urlData.signedUrl;
              } catch {
                newImageErrors[key] = true;
                newImageLoading[key] = false;
              }
            }
            
            urlMap[key] = urlData?.signedUrl || '#';
          }
          if (folder === FOLDER_RECEIPT) allReceiptFiles = allReceiptFiles.concat(data.map(f => ({ ...f, folder })));
          if (folder === FOLDER_PERMIT) allPermitFiles = allPermitFiles.concat(data.map(f => ({ ...f, folder })));
        }
      }
      setReceiptFiles(allReceiptFiles);
      setPermitFiles(allPermitFiles);
      setSignedUrls(urlMap);
      setImageErrors(newImageErrors);
      setImageLoading(newImageLoading);
    };
    fetchFiles();
  }, [user, refresh]);

  // Enhanced file validation
  const validateFile = (file: File): { valid: boolean; message: string } => {
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return { valid: false, message: 'File size must be less than 5MB' };
    }

    // Only allow image files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, message: 'Only image files (JPG, PNG, GIF, WebP) are allowed' };
    }

    return { valid: true, message: '' };
  };

  // Upload to correct folder
  const handleUpload = async (file: File, type: 'receipt' | 'permit') => {
    setError(null);
    if (!user) return;
    
    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    
    // Set validation message for user feedback
    const fileKey = `${file.name}-${type}`;
    setFileValidation(prev => ({ ...prev, [fileKey]: validation }));
    
    setUploading(true);
    setUploadProgress(prev => ({ ...prev, [fileKey]: 0 }));
    
    const folder = type === 'receipt' ? FOLDER_RECEIPT : FOLDER_PERMIT;
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9, '_-]/g, '');
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
    setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }));
    
    if (error) setError(error.message);
    else setRefresh(r => !r);
    
    // Clear validation message after successful upload
    setTimeout(() => {
      setFileValidation(prev => {
        const newState = { ...prev };
        delete newState[fileKey];
        return newState;
      });
    }, 3000); // Clear after 3 seconds
  };

  // Update file input handlers
  const handleReceiptFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileKey = `${file.name}-receipt`;
      setFileValidation(prev => ({ ...prev, [fileKey]: validateFile(file) }));
      handleUpload(file, 'receipt');
    }
  };
  const handlePermitFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileKey = `${file.name}-permit`;
      setFileValidation(prev => ({ ...prev, [fileKey]: validateFile(file) }));
      handleUpload(file, 'permit');
    }
  };

  // Delete from correct folder
  const handleDelete = async (fileName: string, folder: string) => {
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
  };

  // Handle delete confirmation
  const handleDeleteClick = (fileName: string, folder: string) => {
    console.log('Delete clicked for:', fileName, folder); // Debug log
    setDeleteConfirm({ show: true, fileName, folder });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm) {
      console.log('Confirming delete for:', deleteConfirm.fileName, deleteConfirm.folder); // Debug log
      await handleDelete(deleteConfirm.fileName, deleteConfirm.folder);
      setDeleteConfirm(null);
    }
  };

  const handleDeleteCancel = () => {
    console.log('Delete cancelled'); // Debug log
    setDeleteConfirm(null);
  };

  // Modal for image preview
  const ImageModal = ({ url, name, onClose }: { url: string; name: string; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-white rounded-lg shadow-xl p-4 max-w-lg w-full relative flex flex-col items-center">
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-red-500 text-2xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <img
          src={url}
          alt={name}
          className="max-h-[60vh] max-w-full rounded mb-4 border shadow"
        />
        <div className="flex gap-3 w-full justify-center">
          <a
            href={url}
            download={name}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold shadow transition"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <div className="flex items-center justify-center w-16 ">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-2">
                Upload Documents
              </h1>
              <p className="text-lg text-gray-600">
                Tuition Receipt & Exam Permit Management
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Supported formats: JPG, PNG, GIF, WebP (Max 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 001-8-8 8 0018 8 8 0018-8 8 001-8 8zM8.707 7.293a1 1 000-1.414 1.414L8.586 10l-1.293.293 10 10 1.414-1.414L10 11.414l-1.293-1.293-10-10z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tuition Receipt Upload */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-blue-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tuition Receipt Upload
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File
                  </label>
              <button
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium text-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-12"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                    {uploading ? 'Uploading...' : 'Choose Tuition Receipt'}
              </button>
                  {/* File validation feedback */}
                  {fileValidation[`${inputRef.current?.files?.[0]?.name || ''}`] && (
                    <div className={`mt-2 rounded text-xs ${
                      fileValidation[`${inputRef.current?.files?.[0]?.name || ''}`].valid 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {fileValidation[`${inputRef.current?.files?.[0]?.name || ''}`].message}
                    </div>
                  )}
                  {/* Upload progress */}
                  {uploadProgress[`${inputRef.current?.files?.[0]?.name || ''}`] && uploadProgress[`${inputRef.current?.files?.[0]?.name || ''}`] > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[`${inputRef.current?.files?.[0]?.name || ''}`]}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Uploading... {uploadProgress[`${inputRef.current?.files?.[0]?.name || ''}`]}%
                      </p>
                    </div>
                  )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                    onChange={handleReceiptFileInput}
                disabled={uploading}
              />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Upload your receipt for record-keeping and easy access if the original is lost.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Exam Permit Upload */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-green-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Exam Permit Upload
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File
                  </label>
                  <label className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium text-sm hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center h-12">
                    {uploading ? 'Uploading...' : 'Choose Exam Permit'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                      onChange={handlePermitFileInput}
                  disabled={uploading}
                />
              </label>
                  {/* File validation feedback for permit */}
                  {fileValidation[`${inputRef.current?.files?.[0]?.name || ''}`] && (
                    <div className={`mt-2 rounded text-xs ${
                      fileValidation[`${inputRef.current?.files?.[0]?.name || ''}`].valid 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {fileValidation[`${inputRef.current?.files?.[0]?.name || ''}`].message}
                    </div>
                  )}
                  {/* Upload progress for permit */}
                  {uploadProgress[`${inputRef.current?.files?.[0]?.name || ''}`] && uploadProgress[`${inputRef.current?.files?.[0]?.name || ''}`] > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[`${inputRef.current?.files?.[0]?.name || ''}`]}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Uploading... {uploadProgress[`${inputRef.current?.files?.[0]?.name || ''}`]}%
                      </p>
                    </div>
                  )}
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Note:</strong> Upload your permit to keep a backup in case the original is misplaced.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {uploading && (
          <div className="mb-8 flex justify-center">
            <div className="bg-white rounded-lg border border-gray-200 px-6 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-700 font-medium">Uploading your file...</span>
              </div>
            </div>
          </div>
        )}

        {/* Files Display Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Tuition Receipts Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w0">
            <div className="px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Tuition Receipts</h3>
            </div>
            <div className="overflow-x-auto max-w-full">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {receiptFiles.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <FileText className="w-8 h-8 text-gray-300 mb-2" />
                          <p>No tuition receipts uploaded yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    receiptFiles.map(file => (
                      <tr key={file.name + file.folder} className="hover:bg-gray-50">
                        <td className="px-2">
                          <div className="flex items-center">
                        {/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name) ? (
                          imageErrors[file.name + file.folder] ? (
                                <div className="flex items-center justify-center w-12 h-12 border rounded bg-gray-100">
                                  <span className="text-gray-400 text-xs">Error</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                                  className="block focus:outline-none relative"
                              onClick={() => setModalImage({ url: signedUrls[file.name + file.folder] || '#', name: file.name })}
                            >
                                  {imageLoading[file.name + file.folder] && (
                                    <div className="absolute inset-0 bg-gray-200 rounded flex items-center justify-center z-10">
                                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                  )}
                              <img
                                src={signedUrls[file.name + file.folder] || '#'}
                                alt={file.name}
                                    className="w-12 h-12 object-cover rounded border shadow-sm transition-opacity duration-200"
                                    onLoad={() => setImageLoading(prev => ({ ...prev, [file.name + file.folder]: false }))}
                                    onError={() => {
                                  setImageErrors(prev => ({ ...prev, [file.name + file.folder]: true }));
                                      setImageLoading(prev => ({ ...prev, [file.name + file.folder]: false }));
                                }}
                                    loading="lazy"
                                    decoding="async"
                              />
                            </button>
                          )
                        ) : (
                              <div className="flex items-center">
                                {getFileIcon(file.name)}
                                <div className="ml-2:ml-3 min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-gray-500 hidden sm:block">
                                    {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {file.created_at ? new Date(file.created_at).toLocaleDateString() : '—'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm text-gray-500">
                          {file.created_at ? new Date(file.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-2">
                          <button
                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                            onClick={() => handleDeleteClick(file.name, file.folder)}
                            disabled={uploading}
                            title="Delete file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Exam Permits Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w0">
            <div className="px-6 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Exam Permits</h3>
            </div>
            <div className="overflow-x-auto max-w-full">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {permitFiles.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <FileText className="w-8 h-8 text-gray-300 mb-2" />
                          <p>No exam permits uploaded yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    permitFiles.map(file => (
                      <tr key={file.name + file.folder} className="hover:bg-gray-50">
                        <td className="px-2">
                          <div className="flex items-center">
                            {/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name) ? (
                              imageErrors[file.name + file.folder] ? (
                                <div className="flex items-center justify-center w-12 h-12 border rounded bg-gray-100">
                                  <span className="text-gray-400 text-xs">Error</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="block focus:outline-none relative"
                                  onClick={() => setModalImage({ url: signedUrls[file.name + file.folder] || '#', name: file.name })}
                                >
                                  {imageLoading[file.name + file.folder] && (
                                    <div className="absolute inset-0 bg-gray-200 rounded flex items-center justify-center z-10">
                                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                  )}
                                  <img
                                    src={signedUrls[file.name + file.folder] || '#'}
                                    alt={file.name}
                                    className="w-12 h-12 object-cover rounded border shadow-sm transition-opacity duration-200"
                                    onLoad={() => setImageLoading(prev => ({ ...prev, [file.name + file.folder]: false }))}
                                    onError={() => {
                                      setImageErrors(prev => ({ ...prev, [file.name + file.folder]: true }));
                                      setImageLoading(prev => ({ ...prev, [file.name + file.folder]: false }));
                                    }}
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </button>
                              )
                            ) : (
                              <div className="flex items-center">
                                {getFileIcon(file.name)}
                                <div className="ml-2:ml-3 min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-gray-500 hidden sm:block">
                                    {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {file.created_at ? new Date(file.created_at).toLocaleDateString() : '—'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                      </td>
                        <td className="px-2 sm:px-4 py-3 text-sm text-gray-500">
                          {file.created_at ? new Date(file.created_at).toLocaleDateString() : '—'}
                      </td>
                        <td className="px-2">
                        <button
                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                            onClick={() => handleDeleteClick(file.name, file.folder)}
                          disabled={uploading}
                          title="Delete file"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Delete File</h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete "{deleteConfirm.fileName}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                onClick={handleDeleteCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={handleDeleteConfirm}
                disabled={uploading}
              >
                {uploading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for image preview */}
      {modalImage && (
        <ImageModal url={modalImage.url} name={modalImage.name} onClose={() => setModalImage(null)} />
      )}
    </div>
  );
};

export { ReceiptPermit };
