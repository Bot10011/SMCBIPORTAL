import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { PlusCircle, Edit, Trash2, X, Search, RefreshCw, AlertCircle } from 'lucide-react';
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
  }, []);

  // Manage body scroll when modal is open
  useEffect(() => {
    if (isAddingNew || isEditing) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isAddingNew, isEditing]);

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
    const withDescription = programs.filter(p => p.description && p.description.trim() !== '').length;
    const withoutDescription = total - withDescription;
    
    return {
      total,
      active,
      inactive,
      withDescription,
      withoutDescription
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

  const handleDelete = useCallback(async (program: Program) => {
    if (!confirm(`Are you sure you want to delete the program "${program.name}"?`)) {
      console.log('❌ [handleDelete] User cancelled deletion');
      return;
    }

    try {
      console.log('🗑️ [handleDelete] Deleting program:', { id: program.id, name: program.name });
      
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', program.id);

      if (error) {
        console.error('❌ [handleDelete] Supabase error:', error);
        throw error;
      }

      console.log('✅ [handleDelete] Program deleted successfully');
      setPrograms(prev => prev.filter(p => p.id !== program.id));
      alert('Program deleted successfully!');
    } catch (error: unknown) {
      console.error('💥 [handleDelete] Error caught:', error);
      logError(error, 'deleteProgram', { 
        programId: program.id, 
        programName: program.name,
        timestamp: new Date().toISOString()
      });
      alert('Error deleting program. Please try again.');
    }
  }, [logError]);

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
      alert('Program updated successfully!');
    } catch (error: unknown) {
      console.error('💥 [handleUpdateProgram] Error caught:', error);
      logError(error, 'updateProgram', { 
        programId: editingProgram.id,
        programData: editingProgram,
        timestamp: new Date().toISOString()
      });
      alert('Error updating program. Please try again.');
    }
  }, [editingProgram, clearError, logError]);

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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-[#252728] rounded-xl p-4 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
                  <div className="h-6 bg-gray-700 rounded w-12"></div>
                </div>
                <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Controls Skeleton */}
        <div className="bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 p-6 mb-6 animate-pulse">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-1/3">
              <div className="h-12 bg-gray-700 rounded-lg"></div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <div className="h-10 w-24 bg-gray-700 rounded-lg"></div>
              <div className="h-10 w-40 bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 overflow-hidden animate-pulse">
          <div className="h-12 bg-gray-700"></div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 bg-gray-700 rounded w-20"></div>
                  <div className="h-4 bg-gray-700 rounded w-32"></div>
                  <div className="h-4 bg-gray-700 rounded w-40"></div>
                  <div className="h-4 bg-gray-700 rounded w-24"></div>
                  <div className="h-4 bg-gray-700 rounded w-16"></div>
                  <div className="h-4 bg-gray-700 rounded w-20"></div>
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
    <div className="p-6 min-h-screen bg-gradient-to-br  ">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-lg shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text w-6 h-6 text-white">
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                  <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                  <path d="M10 9H8"></path>
                  <path d="M16 13H8"></path>
                  <path d="M16 17H8"></path>
                </svg>
              </div>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="programmanagement-stats-card bg-[#252728] rounded-xl p-4 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300 mb-1">Total Programs</p>
              <p className="text-2xl font-bold text-white">{programStats.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center border border-blue-700/50">
              <PlusCircle className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="programmanagement-stats-card bg-[#252728] rounded-xl p-4 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300 mb-1">Active</p>
              <p className="text-2xl font-bold text-green-400">{programStats.active}</p>
            </div>
            <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center border border-green-700/50">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="programmanagement-stats-card bg-[#252728] rounded-xl p-4 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300 mb-1">With Description</p>
              <p className="text-2xl font-bold text-purple-400">{programStats.withDescription}</p>
            </div>
            <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center border border-purple-700/50">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="programmanagement-stats-card bg-[#252728] rounded-xl p-4 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300 mb-1">Without Description</p>
              <p className="text-2xl font-bold text-orange-400">{programStats.withoutDescription}</p>
            </div>
            <div className="w-10 h-10 bg-orange-900/30 rounded-lg flex items-center justify-center border border-orange-700/50">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="programmanagement-stats-card bg-[#252728] rounded-xl p-4 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300 mb-1">Inactive</p>
              <p className="text-2xl font-bold text-gray-400">{programStats.inactive}</p>
            </div>
            <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center border border-gray-600/50">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="programmanagement-controls bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="pl-10 pr-4 py-3 w-full bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.05)]"
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
              className="programmanagement-refresh-button flex items-center gap-2 bg-gray-700 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors shadow-[2px_2px_4px_rgba(0,0,0,0.2),-1px_-1px_3px_rgba(255,255,255,0.15)]"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddNew}
              className="programmanagement-add-button flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-[2px_2px_4px_rgba(0,0,0,0.2),-1px_-1px_3px_rgba(255,255,255,0.15)]"
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
                  className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90 top-2 right-2 sm:top-3 sm:right-3"
                  aria-label="Close Program Modal"
                  style={{ backgroundColor: 'rgb(239, 68, 68)', boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px', zIndex: 50 }}
                >
                  ×
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
                  className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90 top-2 right-2 sm:top-3 sm:right-3"
                  aria-label="Close Edit Modal"
                  style={{ backgroundColor: 'rgb(239, 68, 68)', boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px', zIndex: 50 }}
                >
                  ×
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
      <div className="bg-[#252728] rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.3),-1px_-1px_4px_rgba(255,255,255,0.2)] border border-gray-300 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-full divide-y divide-gray-600">
            <thead className="bg-gradient-to-r from-indigo-600 to-blue-500">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Program Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Active
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Updated At
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#252728] divide-y divide-gray-600">
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    {searchQuery ? 
                      <div className="flex flex-col items-center">
                        <Search className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-white">No programs match your search criteria.</p>
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="mt-2 text-blue-400 hover:text-blue-300"
                        >
                          Clear search
                        </button>
                      </div> : 
                      <div className="flex flex-col items-center">
                        <PlusCircle className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-white">No programs found. Add a new program to get started.</p>
                      </div>
                    }
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((program, index) => (
                  <tr key={program.id || index} className="programmanagement-table-row hover:bg-gray-700/50 transition-colors duration-150">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-white">{program.name || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300 break-words">{program.description || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-300">{program.is_active ? 'Yes' : 'No'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-400">{program.created_at ? new Date(program.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-400">{program.updated_at ? new Date(program.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(program)}
                          className="programmanagement-action-button p-1 rounded-full bg-blue-900/30 text-blue-400 hover:bg-blue-800/50 transition-colors duration-200 border border-blue-700/50"
                          title="Edit Program"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(program)}
                          className="programmanagement-action-button p-1 rounded-full bg-red-900/30 text-red-400 hover:bg-red-800/50 transition-colors duration-200 border border-red-700/50"
                          title="Delete Program"
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
  );
};

export default ProgramManagement;
