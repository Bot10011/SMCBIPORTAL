import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useModal } from '../contexts/ModalContext';
import toast from 'react-hot-toast';
import ConfirmationDialog from './ConfirmationDialog';

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
  program_id?: number | null;
  student_id?: string | null;
  year_level?: string | null;
  student_type?: string | null;
  enrollment_status?: string | null;
  section?: string | null;
  school_year?: string | null;
  semester?: string | null;
  gender?: string;
  birthdate?: string;
  phone?: string;
  address?: string;
  email?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  student_status?: string | null;
  profile_picture_url?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  password_changed?: boolean;
}

interface Program {
  id: number;
  name: string;
}

export default function EditUserModal() {
  const { showEditUserModal, setShowEditUserModal, selectedUserId, onEditUserModalClose } = useModal();
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
  // Removed editing state for auth email
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const emailMeasureRef = useRef<HTMLSpanElement | null>(null);

  const getEmailFontSizeClass = (): string => 'text-base';

  // Auto-fit email font size precisely using a hidden measurement span
  useEffect(() => {
    const input = emailInputRef.current;
    if (!input) return;

    // Create measurement element once
    if (!emailMeasureRef.current) {
      const span = document.createElement('span');
      span.style.position = 'absolute';
      span.style.visibility = 'hidden';
      span.style.whiteSpace = 'pre';
      span.style.pointerEvents = 'none';
      document.body.appendChild(span);
      emailMeasureRef.current = span;
    }

    const measure = emailMeasureRef.current!;
    const computed = window.getComputedStyle(input);
    const defaultSizePx = parseFloat(computed.fontSize) || 16;
    const minPx = 10;

    // Copy relevant font styles to the measurement span
    measure.style.fontFamily = computed.fontFamily;
    measure.style.fontWeight = computed.fontWeight;
    measure.style.letterSpacing = computed.letterSpacing;
    measure.style.padding = '0';
    measure.style.border = '0';

    // Available width inside the input (clientWidth already excludes borders)
    const paddingLeft = parseFloat(computed.paddingLeft) || 0;
    const paddingRight = parseFloat(computed.paddingRight) || 0;
    const availableWidth = input.clientWidth - paddingLeft - paddingRight;

    // Start from default font size and shrink until content fits
    let size = defaultSizePx;
    input.style.fontSize = `${size}px`;
    measure.style.fontSize = `${size}px`;
    measure.textContent = emailInput || '';

    let safety = 24;
    while (measure.offsetWidth > availableWidth && size > minPx && safety > 0) {
      size -= 1;
      measure.style.fontSize = `${size}px`;
      input.style.fontSize = `${size}px`;
      safety -= 1;
    }

    // Expand back toward default if there is extra room (for shorter text)
    while (measure.offsetWidth < availableWidth && size < defaultSizePx && safety > 0) {
      size += 1;
      measure.style.fontSize = `${size}px`;
      // If we exceed, step back one
      if (measure.offsetWidth > availableWidth) {
        size -= 1;
        measure.style.fontSize = `${size}px`;
        break;
      }
      input.style.fontSize = `${size}px`;
      safety -= 1;
    }

    const handleResize = () => {
      // Re-run on resize to maintain fitting
      setEmailInput((prev) => prev); // trigger effect without changing value
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [emailInput, showEditUserModal]);

  // Normalize year level to numeric string so values like
  // "1", "1st Year" both render as the same selected option
  const normalizeYearLevel = (value?: string | null): string => {
    if (!value) return '';
    const map: Record<string, string> = {
      '1': '1', '2': '2', '3': '3', '4': '4',
      '1st Year': '1', '2nd Year': '2', '3rd Year': '3', '4th Year': '4'
    };
    return map[value] ?? value;
  };

  useEffect(() => {
    let isMounted = true;
    
    if (showEditUserModal && selectedUserId) {
      console.log('EditUserModal: Opening modal for user ID:', selectedUserId);
      
      if (isMounted) {
        fetchUserData();
        fetchPrograms();
      }
    }
    
    return () => {
      isMounted = false;
    };
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
      
      // Fetch user profile data including all fields
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          role,
          first_name,
          middle_name,
          last_name,
          suffix,
          is_active,
          department,
          program_id,
          student_id,
          year_level,
          student_type,
          enrollment_status,
          section,
          school_year,
          semester,
          gender,
          birthdate,
          phone,
          address,
          email,
          emergency_contact_name,
          emergency_contact_relationship,
          emergency_contact_phone,
          student_status,
          profile_picture_url,
          created_by,
          created_at,
          updated_at,
          password_changed
        `)
        .eq('id', selectedUserId)
        .single();

      if (error) throw error;
      console.log('EditUserModal: User data loaded:', data);
      console.log('EditUserModal: User role:', data.role);
      console.log('EditUserModal: User department:', data.department);
      
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
        .select('id, name')
        .order('name');

      if (error) throw error;
      
      // Filter out any programs with invalid IDs or names
      const validPrograms = (data || []).filter(program => 
        program && 
        typeof program.id === 'number' && 
        program.id > 0 && 
        program.name && 
        typeof program.name === 'string' && 
        program.name.trim() !== ''
      );
      
      console.log('Valid programs:', validPrograms);
      setPrograms(validPrograms);
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

  // Comprehensive data validation function
  const validateAndCleanData = (data: Partial<UserProfile>, userRole: string) => {
    const cleanedData = { ...data };
    
    if (userRole === 'student') {
      // Validate and clean student-specific fields
      const validEnrollmentStatuses = ['pending', 'enrolled', 'active', 'approved', 'returned', 'dropped'];
      const validStudentStatuses = ['active', 'inactive', 'graduated', 'transferred', 'dropped'];
      const validYearLevels = ['1', '2', '3', '4', '1st Year', '2nd Year', '3rd Year', '4th Year'];
      const validSemesters = ['1st Semester', '2nd Semester'];
      const validStudentTypes = ['Freshman', 'Regular', 'Irregular', 'Transferee'];
      const validSections = ['A', 'B', 'C', 'D'];
      
      // Enrollment Status validation
      if (cleanedData.enrollment_status && !validEnrollmentStatuses.includes(cleanedData.enrollment_status)) {
        cleanedData.enrollment_status = 'enrolled'; // Safe default
        console.warn('Invalid enrollment_status corrected to default value');
      }
      
      // Student Status validation
      if (cleanedData.student_status && !validStudentStatuses.includes(cleanedData.student_status)) {
        cleanedData.student_status = 'active'; // Safe default
        console.warn('Invalid student_status corrected to default value');
      }
      
      // Year Level validation
      if (cleanedData.year_level && !validYearLevels.includes(cleanedData.year_level)) {
        cleanedData.year_level = '1st Year'; // Safe default
        console.warn('Invalid year_level corrected to default value');
      }
      
      // Semester validation
      if (cleanedData.semester && !validSemesters.includes(cleanedData.semester)) {
        cleanedData.semester = '1st Semester'; // Safe default
        console.warn('Invalid semester corrected to default value');
      }
      
      // Student Type validation
      if (cleanedData.student_type && !validStudentTypes.includes(cleanedData.student_type)) {
        cleanedData.student_type = 'Regular'; // Safe default
        console.warn('Invalid student_type corrected to default value');
      }
      
      // Section validation
      if (cleanedData.section && !validSections.includes(cleanedData.section)) {
        cleanedData.section = 'A'; // Safe default
        console.warn('Invalid section corrected to default value');
      }
      
      // Ensure required student fields have values
      if (!cleanedData.enrollment_status) {
        cleanedData.enrollment_status = 'enrolled';
      }
      if (!cleanedData.student_status) {
        cleanedData.student_status = 'active';
      }
      
    } else {
      // For non-student users, ensure all student-specific fields are NULL
      cleanedData.enrollment_status = null;
      cleanedData.student_status = null;
      cleanedData.year_level = null;
      cleanedData.semester = null;
      cleanedData.student_type = null;
      cleanedData.section = null;
      cleanedData.school_year = null;
      cleanedData.student_id = null;
      cleanedData.program_id = null;
    }
    
    return cleanedData;
  };

  // Enhanced form validation
  const validateFormData = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (user?.role === 'student') {
      // Validate student-specific fields
      const validEnrollmentStatuses = ['pending', 'enrolled', 'active', 'approved', 'returned', 'dropped'];
      const validStudentStatuses = ['active', 'inactive', 'graduated', 'transferred', 'dropped'];
      const validYearLevels = ['1', '2', '3', '4', '1st Year', '2nd Year', '3rd Year', '4th Year'];
      const validSemesters = ['1st Semester', '2nd Semester'];
      
      if (formData.enrollment_status && !validEnrollmentStatuses.includes(formData.enrollment_status)) {
        errors.push('Invalid enrollment status selected');
      }
      
      if (formData.student_status && !validStudentStatuses.includes(formData.student_status)) {
        errors.push('Invalid student status selected');
      }
      
      if (formData.year_level && !validYearLevels.includes(formData.year_level)) {
        errors.push('Invalid year level selected');
      }
      
      if (formData.semester && !validSemesters.includes(formData.semester)) {
        errors.push('Invalid semester selected');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      setShowEditUserModal(false);
      return;
    }
    
    // Comprehensive form validation
    const validation = validateFormData();
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }
    
    setShowSaveConfirm(true);
  };

  const handleSaveConfirm = async () => {
    if (!selectedUserId) return;

    try {
      setSaving(true);
  
      // Comprehensive data cleaning and validation
      const cleanedData = validateAndCleanData(formData, user?.role || '');
      
      // Log what we're sending to database for debugging
      console.log('Sending cleaned data to database:', cleanedData);
      
      // Update user profile in database with cleaned data
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(cleanedData)
        .eq('id', selectedUserId);

      if (profileError) {
        console.error('Database update error:', profileError);
        throw profileError;
      }

      toast.success('User profile updated successfully.');
      // Call the callback if it exists, then close the modal
      if (onEditUserModalClose) {
        console.log('EditUserModal: Calling callback to refresh user list');
        onEditUserModalClose();
      }
      setShowEditUserModal(false);
    } catch (error) {
      console.error('Error updating user:', error);
      
      // Enhanced error handling
      if (error && typeof error === 'object' && 'message' in error) {
        toast.error(`Update failed: ${error.message}`);
      } else {
        toast.error('Failed to update user. Please try again.');
      }
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
  if (!selectedUserId || !showEditUserModal) {
    console.log('EditUserModal: No selectedUserId or modal not shown');
    return null;
  }

  return (
    <AnimatePresence>
      {showEditUserModal && (
        <motion.div
          key={`modal-${selectedUserId}`}
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="bg-white/95 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-black/5"
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1"></div>
                <div className="flex flex-col items-center justify-center flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Edit User</h2>
                  {user && (
                    <p className="text-sm text-gray-500 mt-1">
                      Role: <span className="font-medium text-blue-600 capitalize">{user.role}</span>
                    </p>
                  )}
                  {(user && (user.role === 'instructor' || user.role === 'program_head')) && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Department: <span className="font-medium text-gray-900">{(formData.department || '').trim() || 'Not set'}</span>
                    </p>
                  )}
                </div>
                <div className="flex-1 flex justify-end">
                  <button
                    onClick={() => setShowEditUserModal(false)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    aria-label="Close modal"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : user ? (
                <form onSubmit={handleSubmit} className="space-y-4 premium-form">
                  {/* Student Information */}
                  {user.role === 'student' && (
                    <div className="space-y-6">
                      {/* Academic Information */}
                      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                            <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                          </svg>
                          Academic Information
                        </h3>
                        
                        {/* Email Address - First field */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-600 mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            ref={emailInputRef}
                            className={`w-full px-3 py-1.5 rounded-lg border-2 border-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-gray-500 ${getEmailFontSizeClass()}`}
                            placeholder="user@email.com"
                            style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Student ID
                            </label>
                            <input
                              type="text"
                              value={formData.student_id || ''}
                              readOnly
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-gray-500 bg-gray-100 text-gray-500 cursor-not-allowed focus:border-gray-600 focus:ring-2 focus:ring-gray-600/20 transition-all duration-200 shadow-sm"
                              placeholder={isGeneratingId ? "Generating..." : "Loading..."}
                              style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              School Year
                            </label>
                            <input
                              type="text"
                              value={formData.school_year || ''}
                              readOnly
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-gray-500 bg-gray-100 text-gray-500 cursor-not-allowed focus:border-gray-600 focus:ring-2 focus:ring-gray-600/20 transition-all duration-200 shadow-sm"
                              placeholder="2024-2025"
                              style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                            />
                          </div>
                          <div>
<label className="block text-sm font-medium text-gray-600 mb-1">
  Program
</label>
<select
  value={formData.department || ''}
  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
  className="w-full px-3 py-1.5 rounded-lg border-2 border-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-gray-500"
  style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
>
  <option value="">Select Program</option>
  {programs.map((program) => (
    <option key={`program-${program.id}`} value={program.name}>
      {program.name}
    </option>
  ))}
</select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Year Level
                            </label>
                            <select
                              value={normalizeYearLevel(formData.year_level)}
                              onChange={(e) => setFormData({ ...formData, year_level: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-gray-500"
                              style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                            >
                              <option value="">Select Year Level</option>
                              <option value="1">1st Year</option>
                              <option value="2">2nd Year</option>
                              <option value="3">3rd Year</option>
                              <option value="4">4th Year</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Student Type
                            </label>
                            <select
                              value={formData.student_type || ''}
                              onChange={(e) => setFormData({ ...formData, student_type: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-gray-500"
                              style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                            >
                              <option value="">Select Type</option>
                              <option value="Freshman">Freshman</option>
                              <option value="Regular">Regular</option>
                              <option value="Irregular">Irregular</option>
                              <option value="Transferee">Transferee</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Enrollment Status
                            </label>
                            <select
                              value={formData.enrollment_status || ''}
                              onChange={(e) => setFormData({ ...formData, enrollment_status: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-gray-500"
                              style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                            >
                              <option value="">Select Status</option>
                              <option value="enrolled">Enrolled</option>
                              <option value="pending">Pending</option>
                              <option value="not_enrolled">Not Enrolled</option>
                             
                          
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Section
                            </label>
                            <select
                              value={formData.section || ''}
                              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-gray-500"
                              style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                            >
                              <option value="">Select Section</option>
                              <option value="A">Section A</option>
                              <option value="B">Section B</option>
                              <option value="C">Section C</option>
                              <option value="D">Section D</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Semester
                            </label>
                            <select
                              value={formData.semester || ''}
                              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-gray-500"
                              style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                            >
                              <option value="">Select Semester</option>
                              <option value="1st Semester">1st Semester</option>
                              <option value="2nd Semester">2nd Semester</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">
                              Student Status
                            </label>
                            <select
                               value={formData.student_status || ''}
                              onChange={(e) => setFormData({ ...formData, student_status: e.target.value })}
                              className="w-full px-3 py-1.5 rounded-lg border-2 border-gray-500 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-gray-500"
                              style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                            >
                              <option value="">Select Status</option>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="graduated">Graduated</option>
                              <option value="transferred">Transferred</option>
                              <option value="dropped">Dropped</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      </div>
               
                
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowEditUserModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !hasChanges}
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
