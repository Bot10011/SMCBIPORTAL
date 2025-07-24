import React, { useEffect, useState } from 'react';
import { X, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useModal } from '../contexts/ModalContext';
import toast from 'react-hot-toast';
import ConfirmationDialog from './ConfirmationDialog';
import { sanitizeTextInput } from '../utils/validation';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';

interface UserProfile {
  id: string;
  role: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  is_active: boolean;
  department?: string;
  program_id?: string;
  student_id?: string;
  year_level?: string;
  student_type?: string;
  enrollment_status?: string;
  section?: string;
  school_year?: string;
  semester?: string;
  gender?: string;
  birthdate?: string;
  phone?: string;
  address?: string;
  email?: string; // Added email to interface
}

interface Program {
  id: number;
  code: string;
  name: string;
}

export default function EditUserModal() {
  const { showEditUserModal, setShowEditUserModal, selectedUserId } = useModal();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  // Removed editing state for auth email

  useEffect(() => {
    if (showEditUserModal && selectedUserId) {
      console.log('EditUserModal: Opening modal for user ID:', selectedUserId);
      fetchUserData();
      fetchPrograms();
    }
  }, [showEditUserModal, selectedUserId]);

  useEffect(() => {
    // Check if form data has changed from original user data
    if (user) {
      const hasFormChanges = Object.keys(formData).some(key => {
        const typedKey = key as keyof UserProfile;
        return formData[typedKey] !== user[typedKey];
      });
      setHasChanges(hasFormChanges || emailInput !== authEmail);
    }
  }, [formData, user, emailInput, authEmail]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      console.log('EditUserModal: Fetching user data for ID:', selectedUserId);
      
      // Fetch user profile data including email
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', selectedUserId)
        .single();

      if (error) throw error;
      console.log('EditUserModal: User data loaded:', data);
      setUser(data);
      setFormData(data);
      setAuthEmail(data.email || '');
      setEmailInput(data.email || '');
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('Failed to load user data');
      setUser(null); // Set user to null to show error state
      setAuthEmail('');
      setEmailInput('');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, code, name')
        .order('name');

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
    }
  };

  // Removed updateAuthEmail, startEditingAuthEmail, and cancelEditingAuthEmail handlers

  // Student ID generation function (same logic as Program Head)
  const generateStudentId = async () => {
    setIsGeneratingId(true);
    try {
      if (formData.school_year && formData.first_name && formData.last_name) {
        // Extract last two digits of school year start
        const match = formData.school_year.match(/(\d{4})/);
        if (!match) {
          setFormData(prev => ({ ...prev, student_id: '' }));
          return;
        }
        const yearPrefix = match[1].slice(-2);
        
        // Query how many students are already enrolled in this school year
        const { count, error } = await supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .ilike('student_id', `C-${yearPrefix}%`);
        
        let regNum = 1;
        if (!error && typeof count === 'number') {
          regNum = count + 1;
        }
        
        const regNumStr = regNum.toString().padStart(4, '0');
        const studentId = `C-${yearPrefix}${regNumStr}`;
        
        setFormData(prev => ({ ...prev, student_id: studentId }));
        setHasChanges(true);
      } else {
        setFormData(prev => ({ ...prev, student_id: '' }));
      }
    } catch (error) {
      console.error('Error generating student ID:', error);
      toast.error('Failed to generate student ID. Please try again.');
    } finally {
      setIsGeneratingId(false);
    }
  };

  // Auto-generate Student ID when required fields change (same logic as Program Head)
  useEffect(() => {
    if (user?.role === 'student' && formData.school_year && formData.first_name && formData.last_name && !formData.student_id) {
      generateStudentId();
    }
  }, [formData.school_year, formData.first_name, formData.last_name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      setShowEditUserModal(false);
      return;
    }
    setShowSaveConfirm(true);
  };



  const handleSaveConfirm = async () => {
    if (!selectedUserId) return;

    try {
      setSaving(true);
      setEmailError(null);
      
      // Update user profile in database (excluding email field)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(formData)
        .eq('id', selectedUserId);

      if (profileError) throw profileError;

      // If email was changed, call the internal API route
      if (emailInput !== authEmail) {
        setEmailSaving(true);
        try {
          const response = await axios.post('https://api-topaz-one-89.vercel.app/', {
            userId: selectedUserId,
            newEmail: emailInput,
          }, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (response.data.success) {
            setAuthEmail(emailInput);
            toast.success('Email updated successfully.');
          } else {
            throw new Error(response.data.error || 'Unknown error');
          }
        } catch (err: unknown) {
          let errorMsg = 'Failed to update email';
          if (axios.isAxiosError(err)) {
            errorMsg = err.response?.data?.error || err.message || errorMsg;
          } else if (err instanceof Error) {
            errorMsg = err.message;
          }
          setEmailError(errorMsg);
          toast.error('Failed to update email');
          setSaving(false);
          setEmailSaving(false);
          return;
        } finally {
          setEmailSaving(false);
        }
      }

      toast.success('User profile updated successfully.');
      setShowEditUserModal(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setSaving(false);
      setShowSaveConfirm(false);
    }
  };

  if (!showEditUserModal) return null;

  // Debug information
  console.log('EditUserModal render state:', {
    showEditUserModal,
    selectedUserId,
    loading,
    user: user ? 'loaded' : 'not loaded'
  });

  // Don't show modal if no user ID is selected
  if (!selectedUserId) {
    console.log('EditUserModal: No selectedUserId provided');
    return null;
  }

  return (
    <AnimatePresence>
      {showEditUserModal && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 bg-white/10 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Edit User</h2>
              <button
                onClick={() => setShowEditUserModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : user ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={formData.first_name || ''}
                        onChange={(e) => setFormData({ ...formData, first_name: sanitizeTextInput(e.target.value) })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        value={formData.middle_name || ''}
                        onChange={(e) => setFormData({ ...formData, middle_name: sanitizeTextInput(e.target.value) })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.last_name || ''}
                        onChange={(e) => setFormData({ ...formData, last_name: sanitizeTextInput(e.target.value) })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Suffix
                      </label>
                      <input
                        type="text"
                        value={formData.suffix || ''}
                        onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      {/* Authentication Email Info */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={emailInput}
                          onChange={e => setEmailInput(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="user@email.com"
                          disabled={emailSaving}
                        />
                        {emailError && <div className="text-red-500 text-xs mt-1">{emailError}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Role-specific fields */}
                  {user.role === 'student' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Student ID
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.student_id || ''}
                            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="C-YY####"
                          />
                          <button
                            type="button"
                            onClick={generateStudentId}
                            disabled={isGeneratingId}
                            className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {isGeneratingId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          School Year
                        </label>
                        <input
                          type="text"
                          value={formData.school_year || ''}
                          onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="2024-2025"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Program
                        </label>
                        <select
                          value={formData.program_id || ''}
                          onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Program</option>
                          {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Year Level
                        </label>
                        <select
                          value={formData.year_level || ''}
                          onChange={(e) => setFormData({ ...formData, year_level: e.target.value })}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Year Level</option>
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="4th Year">4th Year</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {(user.role === 'teacher' || user.role === 'program_head') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={formData.department || ''}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Active Account</span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowEditUserModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !hasChanges}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-medium mb-2">User not found</p>
                  <p className="text-sm">Unable to load user data. Please try again or contact support.</p>
                  <button
                    onClick={() => setShowEditUserModal(false)}
                    className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Close Modal
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      {/* Save Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={handleSaveConfirm}
        title="Save Changes"
        message={`Are you sure you want to save the changes for ${user?.first_name || 'this user'}?`}
        confirmText="Save Changes"
        type="info"
        isLoading={saving}
      />
    </AnimatePresence>
  );
} 
