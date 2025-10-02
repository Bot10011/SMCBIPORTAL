import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { PlusCircle, Edit, Trash2, X, Search, RefreshCw, AlertCircle, ClipboardList, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './dashboard.css';

interface Program {
  id: number;
  name: string;
  description: string;
  major: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ProgramManagement: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProgram, setNewProgram] = useState({ 
    name: '', 
    description: '',
    major: '',
    is_active: true
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingConfirmed, setIsDeletingConfirmed] = useState(false);
  const [deleteButtonClicked, setDeleteButtonClicked] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Error logging function
  const logError = useCallback((error: unknown, context: string, additionalData?: unknown) => {
    const errorObj = error as { message?: string; code?: string; details?: string; hint?: string };
    
    setError(errorObj?.message || 'Unknown error');
    
    // Log to console for debugging
    console.error(`🚨 ProgramManagement Error: ${context}`, {
      message: errorObj?.message || 'Unknown error',
      code: errorObj?.code || 'UNKNOWN',
      details: errorObj?.details || undefined,
      hint: errorObj?.hint || undefined,
      timestamp: new Date(),
      operation: context,
      userContext: additionalData ? { ...additionalData as object, timestamp: new Date().toISOString() } : undefined
    });
  }, []);

  // Get current user info for error context
  const getCurrentUserInfo = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, role, email')
          .eq('id', user.id)
          .single();
        
        return {
          id: user.id,
          email: user.email,
          role: profile?.role || 'No role assigned',
          profileId: profile?.id
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch programs function
  const fetchPrograms = useCallback(async () => {
    try {
      console.log('🔄 [fetchPrograms] Starting to fetch programs...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [fetchPrograms] Supabase error:', error);
        throw error;
      }

      console.log('✅ [fetchPrograms] Setting programs data:', data);
      console.log('📋 [fetchPrograms] First program data structure:', data?.[0]);
      console.log('🔑 [fetchPrograms] Program data keys:', data?.[0] ? Object.keys(data[0]) : []);
      
      setPrograms(data || []);
    } catch (err: unknown) {
      console.error('💥 [fetchPrograms] Error caught:', err);
      logError(err, 'fetchPrograms', { 
        programsCount: programs.length,
        timestamp: new Date().toISOString()
      });
    } finally {
      console.log('🏁 [fetchPrograms] Finishing, setting loading to false');
      setLoading(false);
    }
  }, [logError, programs.length]);

  // Submit new program
  const submitNewProgram = useCallback(async (programData: { name: string; description: string; major: string; is_active: boolean }) => {
    try {
      const userInfo = await getCurrentUserInfo();
      if (!userInfo) {
        throw new Error('Unable to get user information');
      }

      const { data, error } = await supabase
        .from('programs')
        .insert([programData])
        .select('*');

      if (error) {
        logError(error, 'submitNewProgram', { programData, timestamp: new Date().toISOString() });
        throw error;
      }

      return data;
    } catch (error: unknown) {
      logError(error, 'submitNewProgram', { programData, timestamp: new Date().toISOString() });
      throw error;
    }
  }, [logError, getCurrentUserInfo]);

  // Handle submit new program
  const handleSubmitNew = useCallback(async () => {
    try {
      // Validation
      if (!newProgram.name.trim()) {
        const error = { message: 'Program name is required', code: 'VALIDATION_ERROR' };
        logError(error, 'validation', { field: 'name', value: newProgram.name });
        return;
      }
      
      if (!newProgram.description.trim()) {
        const error = { message: 'Program description is required', code: 'VALIDATION_ERROR' };
        logError(error, 'validation', { field: 'description', value: newProgram.description });
        return;
      }

      const data = await submitNewProgram(newProgram);
      setPrograms([...(data || []), ...programs]);
      setIsAddingNew(false);
      setNewProgram({ name: '', description: '', major: '', is_active: true });
      clearError();
      fetchPrograms(); // Refresh the list
    } catch (err: unknown) {
      console.error('💥 [handleSubmitNew] Error caught:', err);
      logError(err, 'submitNewProgram', { 
        programData: newProgram,
        timestamp: new Date().toISOString()
      });
    }
  }, [newProgram, programs, fetchPrograms, clearError, logError, submitNewProgram]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  // Manage body scroll when modal is open
  useEffect(() => {
    if (isAddingNew || isEditing || isDeleting || showSuccessModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isAddingNew, isEditing, isDeleting, showSuccessModal]);

  // Memoized filtered programs
  const filteredPrograms = useMemo(() => {
    if (searchQuery.trim() === '') {
      return programs;
    }
    
    const lowercaseQuery = searchQuery.toLowerCase();
    return programs.filter(
      program => 
        program.name.toLowerCase().includes(lowercaseQuery) ||
        program.description.toLowerCase().includes(lowercaseQuery)
    );
  }, [searchQuery, programs]);

  // Memoized program statistics
  const programStats = useMemo(() => {
    const total = programs.length;
    const active = programs.filter(p => p.is_active).length;
    const inactive = total - active;
    
    return {
      total,
      active,
      inactive
    };
  }, [programs]);

  const handleRefresh = useCallback(() => {
    console.log('🔄 [handleRefresh] Manual refresh triggered');
    setRefreshing(true);
    fetchPrograms();
  }, [fetchPrograms]);

  const handleAddNew = useCallback(() => {
    console.log('➕ [handleAddNew] Opening add new program modal');
    setIsAddingNew(true);
    setNewProgram({ name: '', description: '', major: '', is_active: true });
    clearError();
  }, [clearError]);

  const handleCancelAdd = useCallback(() => {
    console.log('❌ [handleCancelAdd] Cancelling add new program');
    setIsAddingNew(false);
    clearError();
  }, [clearError]);

  const handleEdit = useCallback((program: Program) => {
    console.log('✏️ [handleEdit] Editing program:', { id: program.id, name: program.name });
    setEditingProgram(program);
    setIsEditing(true);
    clearError();
  }, [clearError]);

  const handleCancelEdit = useCallback(() => {
    console.log('❌ [handleCancelEdit] Cancelling edit');
    setEditingProgram(null);
    setIsEditing(false);
    clearError();
  }, [clearError]);

  // Success modal handlers
  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  }, []);

  const closeSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    setSuccessMessage('');
  }, []);

  const handleDeleteClick = useCallback((program: Program) => {
    // Prevent double-clicking
    if (deleteButtonClicked) {
      console.log('🚫 [handleDeleteClick] Double-click prevented');
      return;
    }
    
    console.log('🗑️ [handleDeleteClick] Opening delete modal for program:', { id: program.id, name: program.name });
    setDeleteButtonClicked(true);
    setDeletingProgram(program);
    setIsDeleting(true);
    setDeleteConfirmationText('');
    setIsDeletingConfirmed(false);
    clearError();
    
    // Reset double-click protection after a short delay
    setTimeout(() => {
      setDeleteButtonClicked(false);
    }, 1000);
  }, [deleteButtonClicked, clearError]);

  const handleCancelDelete = useCallback(() => {
    console.log('❌ [handleCancelDelete] Cancelling delete');
    setDeletingProgram(null);
    setIsDeleting(false);
    setDeleteConfirmationText('');
    setIsDeletingConfirmed(false);
    setDeleteButtonClicked(false);
    clearError();
  }, [clearError]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingProgram) {
      console.warn('⚠️ [handleConfirmDelete] No deleting program set');
      return;
    }

    // Additional safety check - require confirmation text
    if (!isDeletingConfirmed) {
      console.warn('⚠️ [handleConfirmDelete] Delete not confirmed by user');
      return;
    }

    try {
      console.log('🗑️ [handleConfirmDelete] Deleting program:', { id: deletingProgram.id, name: deletingProgram.name });
      
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', deletingProgram.id);

      if (error) {
        console.error('❌ [handleConfirmDelete] Supabase error:', error);
        throw error;
      }

      console.log('✅ [handleConfirmDelete] Program deleted successfully');
      setPrograms(prev => prev.filter(p => p.id !== deletingProgram.id));
      setIsDeleting(false);
      setDeletingProgram(null);
      setDeleteConfirmationText('');
      setIsDeletingConfirmed(false);
      setDeleteButtonClicked(false);
      clearError();
      showSuccess('Program deleted successfully!');
    } catch (error: unknown) {
      console.error('💥 [handleConfirmDelete] Error caught:', error);
      logError(error, 'deleteProgram', { 
        programId: deletingProgram.id, 
        programName: deletingProgram.name,
        timestamp: new Date().toISOString()
      });
      alert('Error deleting program. Please try again.');
    }
  }, [deletingProgram, isDeletingConfirmed, clearError, logError, showSuccess]);

  // Handle confirmation text input
  const handleConfirmationTextChange = useCallback((text: string) => {
    setDeleteConfirmationText(text);
    // Check if the confirmation text matches the program name
    if (deletingProgram && text.trim().toUpperCase() === deletingProgram.name.trim().toUpperCase()) {
      setIsDeletingConfirmed(true);
    } else {
      setIsDeletingConfirmed(false);
    }
  }, [deletingProgram]);

  const handleUpdateProgram = useCallback(async () => {
    if (!editingProgram) {
      console.warn('⚠️ [handleUpdateProgram] No editing program set');
      return;
    }

    try {
      console.log('💾 [handleUpdateProgram] Starting to update program:', { id: editingProgram.id, name: editingProgram.name });
      
      // Validation
      if (!editingProgram.name.trim()) {
        const error = { message: 'Program name is required', code: 'VALIDATION_ERROR' };
        logError(error, 'validation', { field: 'name', value: editingProgram.name });
        return;
      }
      
      if (!editingProgram.description.trim()) {
        const error = { message: 'Program description is required', code: 'VALIDATION_ERROR' };
        logError(error, 'validation', { field: 'description', value: editingProgram.description });
        return;
      }

      const { error } = await supabase
        .from('programs')
        .update({
          name: editingProgram.name,
          description: editingProgram.description,
          major: editingProgram.major,
          is_active: editingProgram.is_active,
        })
        .eq('id', editingProgram.id);

      if (error) {
        console.error('❌ [handleUpdateProgram] Supabase error:', error);
        throw error;
      }

      console.log('✅ [handleUpdateProgram] Program updated successfully');
      setPrograms(prev => prev.map(p => p.id === editingProgram.id ? editingProgram : p));
      setIsEditing(false);
      setEditingProgram(null);
      clearError();
      showSuccess('Program updated successfully!');
    } catch (error: unknown) {
      console.error('💥 [handleUpdateProgram] Error caught:', error);
      logError(error, 'updateProgram', { 
        programId: editingProgram.id,
        programData: editingProgram,
        timestamp: new Date().toISOString()
      });
      alert('Error updating program. Please try again.');
    }
  }, [editingProgram, clearError, logError, showSuccess]);

  if (loading && !refreshing) {
    console.log('🔄 Rendering loading state');
    return (
      <div className="programmanagement-skeleton container mx-auto p-6">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-80 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-96"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/90 rounded-xl p-4 shadow-lg border border-gray-200 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                  <div className="h-6 bg-gray-300 rounded w-12"></div>
                </div>
                <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Controls Skeleton */}
        <div className="bg-white/90 rounded-xl shadow-lg border border-gray-200 p-6 mb-6 animate-pulse">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-1/3">
              <div className="h-12 bg-gray-300 rounded-lg"></div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <div className="h-10 w-24 bg-gray-300 rounded-lg"></div>
              <div className="h-10 w-40 bg-gray-300 rounded-lg"></div>
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white/90 rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-pulse">
          <div className="h-12 bg-gray-300"></div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                  <div className="h-4 bg-gray-300 rounded w-32"></div>
                  <div className="h-4 bg-gray-300 rounded w-40"></div>
                  <div className="h-4 bg-gray-300 rounded w-24"></div>
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Rendering error state:', error);
  }

  return (
    <div className="min-h-screen  from-blue-50 via-white to-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
        <div style={{
          background: '#00171f',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '8px 8px 16px rgba(0,0,0,0.1), -8px -8px 16px rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <ClipboardList className="w-8 h-8 text-white" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-1">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Program Management</h1>
                <p className="text-white/80 text-sm font-medium">Create and manage academic programs</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80"></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div style={{
          background: '#00A7E1',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '8px 8px 16px rgba(0,0,0,0.1), -8px -8px 16px rgba(255,255,255,0.5)'
        }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 mb-1">Total Programs</p>
              <p className="text-2xl font-bold text-white">{programStats.total}</p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#00A7E1',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.5)'
            }}>
              <PlusCircle className="w-5 h-5 text-[#ffffff]" />
            </div>
          </div>
        </div>
        <div style={{
          background: '#00A7E1',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '8px 8px 16px rgba(0,0,0,0.1), -8px -8px 16px rgba(255,255,255,0.5)'
        }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 mb-1">Active</p>
              <p className="text-2xl font-bold text-white">{programStats.active}</p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#00A7E1',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.5)'
            }}>
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <div style={{
          background: '#00A7E1',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '8px 8px 16px rgba(0,0,0,0.1), -8px -8px 16px rgba(255,255,255,0.5)'
        }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 mb-1">Inactive</p>
              <p className="text-2xl font-bold text-white">{programStats.inactive}</p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#00A7E1',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.5)'
            }}>
              <XCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
        borderRadius: '12px',
        boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.1), inset -4px -4px 8px rgba(255,255,255,0.8)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="pl-10 pr-4 py-3 w-full border-0 rounded-lg focus:outline-none text-gray-800 placeholder-gray-500"
              style={{
                background: '#ffffff',
                boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.8)'
              }}
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRefresh}
              className="flex items-center gap-2 text-gray-700 px-4 py-2 rounded-lg transition-all"
              style={{
                background: '#ffffff',
                boxShadow: '6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.5)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'inset 4px 4px 8px rgba(0,0,0,0.1), inset -4px -4px 8px rgba(255,255,255,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.5)';
              }}
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddNew}
              className="flex items-center gap-2 text-white px-4 py-2 rounded-lg transition-all"
              style={{
                background: '#2563eb',

              
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'inset 4px 4px 8px rgba(0,0,0,0.1), inset -4px -4px 8px rgba(255,255,255,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.5)';
              }}
            >
              <PlusCircle size={18} />
              Add New Program
            </motion.button>
          </div>
        </div>
      </div>

      {/* Enhanced Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-800">Error Occurred</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                  
                  {/* Debug Information (only shown in debug mode) */}
                  {/* {debugMode && errorDetails && (
                    <div className="mt-3 p-3 bg-red-100 rounded border border-red-200">
                      <h4 className="font-medium text-red-800 text-sm mb-2">Debug Information:</h4>
                      <div className="text-xs text-red-700 space-y-1">
                        <div><strong>Operation:</strong> {errorDetails.operation}</div>
                        <div><strong>Error Code:</strong> {errorDetails.code || 'N/A'}</div>
                        <div><strong>Timestamp:</strong> {errorDetails.timestamp.toLocaleString()}</div>
                        {errorDetails.details && (
                          <div><strong>Details:</strong> {errorDetails.details}</div>
                        )}
                        {errorDetails.hint && (
                          <div><strong>Hint:</strong> {errorDetails.hint}</div>
                        )}
                        {errorDetails.userContext ? (
                          <div><strong>Context:</strong> {JSON.stringify(errorDetails.userContext, null, 2)}</div>
                        ) : null}
                      </div>
                    </div>
                  )} */}
                </div>
              </div>
              <div className="flex gap-2">
                {/* {debugMode && (
                  <button
                    onClick={() => {
                      console.log('🔍 Full error details:', errorDetails);
                      console.log('🔍 Current programs state:', programs);
                      console.log('🔍 Current user context:', getCurrentUserInfo());
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                    title="Log debug info to console"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                )} */}
                <button
                  onClick={clearError}
                  className="text-red-700 hover:text-red-900"
                  title="Dismiss error"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add New Program Modal */}
      {isAddingNew && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="programmanagement-modal fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="programmanagement-modal-content bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative mx-4"
            >
              <div className="relative">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Program</h2>
                <button
                  onClick={handleCancelAdd}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  aria-label="Close Program Modal"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitNew(); }} className="programmanagement-modal space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Program Name *
                    </label>
                    <input
                      type="text"
                      value={newProgram.name}
                      onChange={(e) => {
                        setNewProgram({ ...newProgram, name: e.target.value.toUpperCase() });
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter full program name (e.g., BSIT)"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={newProgram.description}
                    onChange={(e) =>
                      setNewProgram({ ...newProgram, description: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter program description"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={newProgram.is_active}
                    onChange={(e) =>
                      setNewProgram({ ...newProgram, is_active: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Active Program
                  </label>
                </div>
                
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancelAdd}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-lg hover:from-indigo-700 hover:to-blue-600 transition-colors shadow-md"
                  >
                    Save Program
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Edit Program Modal */}
      {isEditing && editingProgram && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="programmanagement-modal-content bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative mx-4"
            >
              <div className="relative">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Program</h2>
                <button
                  onClick={handleCancelEdit}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
                  aria-label="Close Edit Modal"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateProgram(); }} className="programmanagement-modal space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Program Name *
                    </label>
                    <input
                      type="text"
                      value={editingProgram.name}
                      onChange={(e) => {
                        setEditingProgram(prev => prev ? { ...prev, name: e.target.value.toUpperCase() } : null);
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter full program name (e.g., BSIT)"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Description *
                  </label>
                  <textarea
                    value={editingProgram.description}
                    onChange={(e) =>
                      setEditingProgram(prev => prev ? { ...prev, description: e.target.value } : null)
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter program description"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="edit_is_active"
                    checked={editingProgram.is_active}
                    onChange={(e) =>
                      setEditingProgram(prev => prev ? { ...prev, is_active: e.target.checked } : null)
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                    Active Program
                  </label>
                </div>
                
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                  <motion.button
                    type="button"
                    onClick={handleCancelEdit}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-md"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-lg hover:from-indigo-700 hover:to-blue-600 transition-colors shadow-md"
                  >
                    Update Program
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* TABLE - COMPACT AND ZOOM-FRIENDLY */}
      <div style={{
        background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
        borderRadius: '12px',
        boxShadow: '8px 8px 16px rgba(0,0,0,0.1), -8px -8px 16px rgba(255,255,255,0.5)',
        overflow: 'hidden'
      }}>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-full divide-y divide-gray-200">
            <thead style={{
              background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.8)'
            }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#374151' }}>
                  Program Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#374151' }}>
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#374151' }}>
                  Active
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#374151' }}>
                  Created At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: '#374151' }}>
                  Updated At
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: '#374151' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody style={{
              background: '#ffffff',
              boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.05)'
            }} className="divide-y divide-gray-200">
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    {searchQuery ? 
                      <div className="flex flex-col items-center">
                        <Search className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-700">No programs match your search criteria.</p>
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="mt-2 text-blue-600 hover:text-blue-500"
                        >
                          Clear search
                        </button>
                      </div> : 
                      <div className="flex flex-col items-center">
                        <PlusCircle className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-700">No programs found. Add a new program to get started.</p>
                      </div>
                    }
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((program, index) => (
                  <tr key={program.id || index} className="programmanagement-table-row hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-800">{program.name || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600 break-words">{program.description || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-600">{program.is_active ? 'Yes' : 'No'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-500">{program.created_at ? new Date(program.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-500">{program.updated_at ? new Date(program.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(program)}
                          className="p-1 rounded-full transition-all duration-200"
                          style={{
                            background: '#2563eb',
                            color: 'white',
                            boxShadow: '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.5)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.5)';
                          }}
                          title="Edit Program"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(program)}
                          disabled={deleteButtonClicked}
                          className="p-1 rounded-full transition-all duration-200"
                          style={{
                            background: deleteButtonClicked ? '#9ca3af' : '#ef4444',
                            color: 'white',
                            boxShadow: deleteButtonClicked ? 'inset 2px 2px 4px rgba(0,0,0,0.1)' : '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.5)',
                            cursor: deleteButtonClicked ? 'not-allowed' : 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            if (!deleteButtonClicked) {
                              e.currentTarget.style.boxShadow = 'inset 2px 2px 4px rgba(0,0,0,0.1), inset -2px -2px 4px rgba(255,255,255,0.5)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!deleteButtonClicked) {
                              e.currentTarget.style.boxShadow = '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.5)';
                            }
                          }}
                          title={deleteButtonClicked ? "Please wait..." : "Delete Program"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleting && deletingProgram && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl relative mx-4"
            >
              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Delete Program</h2>
                    <p className="text-gray-600 text-sm">This action cannot be undone</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-700 mb-2">
                    Are you sure you want to delete the program:
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="font-semibold text-gray-900">{deletingProgram.name}</p>
                    {deletingProgram.description && (
                      <p className="text-sm text-gray-600 mt-1">{deletingProgram.description}</p>
                    )}
                  </div>
                  
                  {/* Additional Safety Measure */}
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-red-800 mb-2">⚠️ Safety Confirmation Required</h4>
                        <p className="text-sm text-red-700 mb-3">
                          To prevent accidental deletion, please type the program name exactly as shown above:
                        </p>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={deleteConfirmationText}
                            onChange={(e) => handleConfirmationTextChange(e.target.value)}
                            placeholder={`Type "${deletingProgram.name}" to confirm`}
                            className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors ${
                              isDeletingConfirmed 
                                ? 'border-green-300 bg-green-50 text-green-800' 
                                : 'border-red-300 bg-red-50 text-red-800'
                            } focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500`}
                          />
                          {isDeletingConfirmed ? (
                            <p className="text-sm text-green-700 flex items-center gap-2">
                              <span className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                              </span>
                              Confirmation successful
                            </p>
                          ) : (
                            <p className="text-sm text-red-600">
                              Program name must match exactly to enable deletion
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <motion.button
                    type="button"
                    onClick={handleCancelDelete}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={!isDeletingConfirmed}
                    whileHover={isDeletingConfirmed ? { scale: 1.03 } : {}}
                    whileTap={isDeletingConfirmed ? { scale: 0.98 } : {}}
                    className={`px-6 py-3 rounded-lg transition-colors shadow-md ${
                      isDeletingConfirmed
                        ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Delete Program
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Success Modal */}
      {showSuccessModal && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl relative mx-4"
            >
              <div className="relative">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Success!</h2>
                    <p className="text-gray-600 text-sm">Operation completed successfully</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-700 text-center">
                    {successMessage}
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <motion.button
                    type="button"
                    onClick={closeSuccessModal}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                  >
                    Continue
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default ProgramManagement;
