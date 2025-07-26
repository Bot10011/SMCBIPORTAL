import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { PlusCircle, Edit, Trash2, X, Search, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './dashboard.css';

interface Program {
  id: number;
  code: string;
  name: string;
  description: string;
  major: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ProgramManagement: React.FC = () => {  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProgram, setNewProgram] = useState({ 
    name: '', 
    code: '', 
    description: '',
    major: '',
    is_active: true
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
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

  // Auto-generate program code when name changes
  useEffect(() => {
    if (newProgram.name.trim()) {
      const generatedCode = generateProgramCode(newProgram.name);
      console.log('Generating code for:', newProgram.name, '→', generatedCode);
      setNewProgram(prev => ({ ...prev, code: generatedCode }));
    } else {
      setNewProgram(prev => ({ ...prev, code: '' }));
    }
  }, [newProgram.name]);

  // Memoized filtered programs
  const filteredPrograms = useMemo(() => {
    if (searchQuery.trim() === '') {
      return programs;
    }
    
    const lowercaseQuery = searchQuery.toLowerCase();
    return programs.filter(
      program => 
        program.code.toLowerCase().includes(lowercaseQuery) ||
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

  // Memoized database operations
  const fetchPrograms = useCallback(async () => {
    try {
      console.log('Starting to fetch programs...');
      setLoading(true);
      const { data, error } = await supabase
        .from('programs')
        .select('id, code, name, description, major, is_active, created_at, updated_at')
        .order('code', { ascending: true });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Setting programs data:', data);
      console.log('First program data structure:', data?.[0]);
      console.log('Program data keys:', data?.[0] ? Object.keys(data[0]) : 'No data');
      setPrograms(data || []);
    } catch (err: Error | unknown) {
      console.error('Error in fetchPrograms:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      console.log('Finishing fetchPrograms, setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPrograms();
  }, [fetchPrograms]);

  const handleAddNew = useCallback(() => {
    setIsAddingNew(true);
    setNewProgram({ name: '', code: '', description: '', major: '', is_active: true });
  }, []);

  const handleCancelAdd = useCallback(() => {
    setIsAddingNew(false);
  }, []);

  const handleEdit = useCallback((program: Program) => {
    setEditingProgram(program);
    setIsEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingProgram(null);
    setIsEditing(false);
  }, []);

  const handleDelete = useCallback(async (program: Program) => {
    if (!confirm(`Are you sure you want to delete the program "${program.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', program.id);

      if (error) throw error;

      setPrograms(prev => prev.filter(p => p.id !== program.id));
      alert('Program deleted successfully!');
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Error deleting program. Please try again.');
    }
  }, []);

  const handleSubmitNew = useCallback(async () => {
    if (!newProgram.name.trim()) {
      setError('Program name is required');
      return;
    }
    
    if (!newProgram.description.trim()) {
      setError('Program description is required');
      return;
    }

    try {
      // Generate program code if not already generated
      let programCode = newProgram.code;
      if (!programCode.trim()) {
        programCode = generateProgramCode(newProgram.name);
      }

      const { data, error } = await supabase
        .from('programs')
        .insert([
          {
            name: newProgram.name,
            code: programCode,
            description: newProgram.description,
            major: newProgram.major,
            is_active: newProgram.is_active,
          },
        ])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Successfully inserted program:', data);
      setPrograms([...(data || []), ...programs]);
      setIsAddingNew(false);
      setNewProgram({ name: '', code: '', description: '', major: '', is_active: true });
      fetchPrograms(); // Refresh the list
    } catch (err: Error | unknown) {
      console.error('Error in handleSubmitNew:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }, [newProgram, programs, fetchPrograms]);

  const handleUpdateProgram = useCallback(async () => {
    if (!editingProgram) return;

    if (!editingProgram.name.trim()) {
      setError('Program name is required');
      return;
    }
    
    if (!editingProgram.description.trim()) {
      setError('Program description is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('programs')
        .update({
          name: editingProgram.name,
          description: editingProgram.description,
          major: editingProgram.major,
          is_active: editingProgram.is_active,
        })
        .eq('id', editingProgram.id);

      if (error) throw error;

      setPrograms(prev => prev.map(p => p.id === editingProgram.id ? editingProgram : p));
      setIsEditing(false);
      setEditingProgram(null);
      alert('Program updated successfully!');
    } catch (error) {
      console.error('Error updating program:', error);
      alert('Error updating program. Please try again.');
    }
  }, [editingProgram]);



  // Function to generate program code from name, using PREFIX-###### format
  const generateProgramCode = (name: string): string => {
    if (!name) return '';
    const prefix = name.trim().toUpperCase();
    const timestamp = Date.now().toString().slice(-6); // Get last 6 digits of timestamp
    const result = `${prefix}-${timestamp}`;
    console.log('generateProgramCode input:', name, 'prefix:', prefix, 'result:', result);
    return result;
  };

  if (loading && !refreshing) {
    console.log('Rendering loading state');
    return (
      <div className="programmanagement-skeleton container mx-auto p-6">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-80 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>

                  {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Controls Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 animate-pulse">
          <div className="relative w-full md:w-1/3">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
            <div className="h-10 w-40 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100 animate-pulse">
          <div className="h-12 bg-gray-200"></div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-40"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('Rendering error state:', error);
  }

  return (
    <div className="container mx-auto p-6">
  

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-lg">
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
                <p className="text-white/80 text-sm font-medium">Create and manage academic programs with auto-generated codes</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80"></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="programmanagement-stats-card bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Programs</p>
              <p className="text-2xl font-bold text-gray-900">{programStats.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <PlusCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="programmanagement-stats-card bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-bold text-green-600">{programStats.active}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="programmanagement-stats-card bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">With Description</p>
              <p className="text-2xl font-bold text-purple-600">{programStats.withDescription}</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="programmanagement-stats-card bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Without Description</p>
              <p className="text-2xl font-bold text-orange-600">{programStats.withoutDescription}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="programmanagement-stats-card bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Inactive</p>
              <p className="text-2xl font-bold text-gray-500">{programStats.inactive}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

              <div className="programmanagement-controls flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full md:w-1/3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Search by code, name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefresh}
            className="programmanagement-refresh-button flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddNew}
            className="programmanagement-add-button flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-blue-600 transition-all shadow-md"
          >
            <PlusCircle size={18} />
            Add New Program
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 flex justify-between items-center"
          >
            <div className="flex items-center">
              <span className="font-medium">{error}</span>
            </div>
            <button
              className="text-red-700 hover:text-red-900"
              onClick={() => setError(null)}
            >
              <X size={18} />
            </button>
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
                      Program Code * <span className="text-xs text-gray-500">(Auto-generated)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newProgram.code}
                        className="w-full p-3 pl-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-gray-600"
                        placeholder={newProgram.name ? `Will generate: ${newProgram.name.toUpperCase()}-######` : "Enter program name first"}
                        readOnly
                        onChange={(e) => console.log('Code field value:', e.target.value)}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-xs text-green-600 bg-green-100 py-1 px-2 rounded-full font-medium">Auto</span>
                      </div>
                    </div>
                  </div>
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
                      Program Code <span className="text-xs text-gray-500">(Read-only)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editingProgram.code}
                        className="w-full p-3 pl-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 text-gray-600"
                        readOnly
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-xs text-gray-600 bg-gray-100 py-1 px-2 rounded-full font-medium">Fixed</span>
                      </div>
                    </div>
                  </div>
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="programmanagement-table bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100"
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-indigo-600 to-blue-500">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                Program Code
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                Program Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                Description
              </th>

              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                Active
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                Updated At
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-white uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPrograms.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  {searchQuery ? 
                    <div className="flex flex-col items-center">
                      <Search className="h-8 w-8 text-gray-400 mb-2" />
                      <p>No programs match your search criteria.</p>
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="mt-2 text-indigo-600 hover:text-indigo-800"
                      >
                        Clear search
                      </button>
                    </div> : 
                    <div className="flex flex-col items-center">
                      <PlusCircle className="h-8 w-8 text-gray-400 mb-2" />
                      <p>No programs found. Add a new program to get started.</p>
                    </div>
                  }
                </td>
              </tr>
            ) : (
              filteredPrograms.map((program, index) => (
                <tr key={program.id || index} className="programmanagement-table-row hover:bg-indigo-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-700">
                    <span className="bg-indigo-100 text-indigo-800 py-1 px-3 rounded-full text-xs font-semibold">
                      {program.code || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{program.name || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-700">{program.description || 'N/A'}</span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-700">{program.is_active ? 'Yes' : 'No'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {program.created_at ? new Date(program.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {program.updated_at ? new Date(program.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(program)}
                        className="programmanagement-action-button p-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors duration-200"
                        title="Edit Program"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(program)}
                        className="programmanagement-action-button p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-200"
                        title="Delete Program"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default ProgramManagement;
