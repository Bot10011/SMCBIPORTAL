import React, { useEffect, useState } from 'react';
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
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPrograms(programs);
      return;
    }
    
    const lowercaseQuery = searchQuery.toLowerCase();
    const filtered = programs.filter(
      program => 
        program.code.toLowerCase().includes(lowercaseQuery) ||
        program.name.toLowerCase().includes(lowercaseQuery) ||
        program.description.toLowerCase().includes(lowercaseQuery)
    );
    setFilteredPrograms(filtered);
  }, [searchQuery, programs]);

  const fetchPrograms = async () => {
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
      setFilteredPrograms(data || []);
    } catch (err: Error | unknown) {
      console.error('Error in fetchPrograms:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      console.log('Finishing fetchPrograms, setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPrograms();
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setNewProgram({ name: '', code: '', description: '', major: '', is_active: true });
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
  };

  const handleSubmitNew = async () => {
    if (!newProgram.name.trim()) {
      setError('Program name is required');
      return;
    }
    
    if (!newProgram.code.trim()) {
      setError('Program code is required and could not be generated. Please check the program name.');
      return;
    }
    // Enforce code length limit
    if (newProgram.code.length > 10) {
      setError('Program code must be at most 10 characters.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('programs')
        .insert([
          {
            name: newProgram.name,
            code: newProgram.code.toUpperCase().substring(0, 10), // enforce limit
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
  };

  // Function to generate program code from name, using PREFIX-YYMMDD, max 10 chars
  type CodeDateOptions = { date?: Date };
  const generateProgramCode = (name: string, options: CodeDateOptions = {}): string => {
    if (!name) return '';
    const now = options.date || new Date();
    const year = now.getFullYear().toString().slice(2); // last 2 digits
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const datePart = `${year}${month}${day}`; // YYMMDD
    // Calculate max length for name part
    const maxNameLength = 10 - 1 - datePart.length; // 1 for dash
    let namePart = name.toLowerCase().replace(/\s+/g, '').substring(0, maxNameLength);
    if (!namePart) namePart = datePart;
    return `${namePart}-${datePart}`;
  };

  if (loading && !refreshing) {
    console.log('Rendering loading state');
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-indigo-600 font-medium">Loading programs...</span>
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Program Management</h1>
        <p className="text-gray-600">Manage academic programs and their details</p>
      </motion.div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
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
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-blue-600 transition-all shadow-md"
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

      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white p-6 mb-6 rounded-lg shadow-md border border-gray-100"
          >
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Program</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>                
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Program Code * <span className="text-xs text-gray-500">(Auto-generated from name)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newProgram.code}
                    onChange={(e) => {
                      setNewProgram({ ...newProgram, code: e.target.value.toUpperCase() });
                    }}
                    className="w-full p-3 pl-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                    placeholder="Auto-generated from program name"
                    readOnly
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-xs text-indigo-600 bg-indigo-100 py-1 px-2 rounded-full">Auto</span>
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
                    const name = e.target.value;
                    const newState = { ...newProgram, name };
                    if (name) {
                      try {
                        const code = generateProgramCode(name);
                        newState.code = code;
                      } catch {
                        setError('Could not generate a unique program code. Please try a different program name.');
                        newState.code = '';
                      }
                    } else {
                      newState.code = '';
                    }
                    setNewProgram(newState);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter full program name"
                />
              </div>
              <div className="md:col-span-2">
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Major
                </label>
                <input
                  type="text"
                  value={newProgram.major}
                  onChange={(e) =>
                    setNewProgram({ ...newProgram, major: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter program major"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Active
                </label>
                <input
                  type="checkbox"
                  checked={newProgram.is_active}
                  onChange={(e) =>
                    setNewProgram({ ...newProgram, is_active: e.target.checked })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCancelAdd}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmitNew}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-colors shadow-md"
                >
                  Save Program
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-100"
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
                Major
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
                <tr key={program.id || index} className="hover:bg-indigo-50 transition-colors duration-150">
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
                    <span className="text-gray-700">{program.major || 'N/A'}</span>
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
                      <button className="p-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200">
                        <Edit size={18} />
                      </button>
                      <button className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200">
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
