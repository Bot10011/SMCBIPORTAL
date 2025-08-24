import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

import { createPortal } from 'react-dom';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';

interface Program {
  id: number;
  name: string;
  description?: string;
}

interface Department {
  name: string; 
}

interface CreateUserForm {
  email: string;
  role: 'instructor' | 'student' | 'registrar' | 'program_head' | '';
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
  student_status?: string;
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated?: () => void;
}

interface RoleRequirements {
  requiredFields: (keyof CreateUserForm)[];
  optionalFields: (keyof CreateUserForm)[];
}

const roleRequirements: Record<CreateUserForm['role'], RoleRequirements> = {
  '': {
    requiredFields: [],
    optionalFields: []
  },
  student: {
    requiredFields: [
      'email', 'role', 'department', 'year_level', 'student_type', 
      'enrollment_status', 'section', 'semester'
    ],
    optionalFields: []
  },
  instructor: {
    requiredFields: [
      'email', 'role'
    ],
    optionalFields: []
  },
  registrar: {
    requiredFields: [
      'email', 'role'
    ],
    optionalFields: []
  },
  program_head: {
    requiredFields: [
      'email', 'role'
    ],
    optionalFields: []
  }
};

// Update the userProfile type
interface UserProfile {
  id: string;
  email: string;
  role: CreateUserForm['role'];
  is_active: boolean;
  department: string | null;
  program_id: number | null;
  student_id: string | null;
  year_level: string | null;
  section: string | null;
  semester: string | null;
  student_type: string | null;
  enrollment_status: string | null;
  school_year: string | null;
  student_status: string | null;
  created_at: string;
  updated_at: string;
}

// Isolated Supabase client for user creation that won't affect the main auth session
const createUserClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      // Use a unique storage key to avoid cross-client broadcast collisions
      storageKey: 'sb-create-user-client'
    }
  }
);

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
  // Auto-generate current academic year
  const currentYear = new Date().getFullYear();
  const currentAcademicYear = `${currentYear}-${currentYear + 1}`;

  // Form state
  const [form, setForm] = useState<CreateUserForm>({
    email: '',
    role: '',
    is_active: true,
    department: '',
    program_id: '',
    student_id: '',
    year_level: '',
    student_type: '',
    enrollment_status: '',
    section: '',
    school_year: currentAcademicYear,
    semester: '',
    student_status: 'active'
  });

  // UI state
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  // Data state
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);

  // Constants
  const getSteps = (role: string) => {
    if (role === 'student') {
      return ['Role Selection', 'Academic Information'];
    }
    return ['Role Selection', 'Department & Email'];
  };

  const [steps, setSteps] = useState<string[]>(getSteps(form.role));
  const yearLevels = ['1', '2', '3', '4'];
  const studentTypes = ['Freshman', 'Regular', 'Irregular', 'Transferee'];
  const enrollmentStatuses = ['pending', 'enrolled', 'active', 'approved', 'returned', 'dropped'];
  const semesters = ['1st Semester', '2nd Semester'];
  const sectionOptions = ['A', 'B', 'C', 'D'];

  // Add state for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { setCreatingUserFlag } = useAuth();

  // Reset form function
  const resetForm = () => {
    setForm({
      email: '',
      role: '',
      is_active: true,
      department: '',
      program_id: '',
      student_id: '',
      year_level: '',
      student_type: '',
      enrollment_status: '',
      section: '',
      school_year: currentAcademicYear,
      semester: '',
      student_status: 'active'
    });
    setStep(0);
    setEmailStatus('idle');
    setShowConfirmation(false);
  };

  // Manage body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      // Reset form when modal is closed
      resetForm();
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // Fetch programs and departments on mount
  useEffect(() => {
    fetchPrograms();
    fetchDepartments();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, description')
        .order('name');
      
      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
    }
  };

  const fetchDepartments = async () => {
    try {
      setIsLoadingDepartments(true);
      const { data, error } = await supabase
        .from('programs')
        .select('name')
        .order('name');
      
      if (error) throw error;
      
      // Get unique department names and filter out any null/undefined values
      const uniqueDepartments = Array.from(new Set(data?.filter(program => program.name).map(program => program.name) || []))
        .map(name => ({ name }));
      
      setDepartments(uniqueDepartments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  // Email validation
  const debouncedEmailCheck = async (email: string) => {
    if (!email) {
      setEmailStatus('idle');
      return;
    }

    setEmailStatus('checking');
    try {
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .ilike('email', `${email.toLowerCase()}@smcbi.edu.ph`);

      if (error) throw error;
      setEmailStatus(count && count > 0 ? 'invalid' : 'valid');
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailStatus('invalid');
    }
  };

  // Add debounce effect for email checking
  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.email) {
        debouncedEmailCheck(form.email);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [form.email]);

  // Update the email input field to show validation status
  const getEmailInputClasses = () => {
    const baseClasses = "w-full border-2 rounded-lg px-3 py-2 mt-1 pr-24 bg-white shadow-sm";
    switch (emailStatus) {
      case 'invalid':
        return `${baseClasses} border-red-500 bg-red-50`;
      case 'valid':
        return `${baseClasses} border-green-500 bg-green-50`;
      case 'checking':
        return `${baseClasses} border-blue-500 bg-blue-50`;
      default:
        return `${baseClasses} border-gray-500`;
    }
  };

  // Add this useEffect to auto-generate ID when role is student
  useEffect(() => {
    if (form.role === 'student' && !form.student_id) {
      generateStudentId();
    }
  }, [form.role]);

  // Update the generateStudentId function
  const generateStudentId = async () => {
    setIsGeneratingId(true);
    try {
      const year = new Date().getFullYear().toString().slice(-2);
      let attempts = 0;
      const maxAttempts = 5;
      let isUnique = false;
      let newId: string = `C${year}0000`; // Initialize with a default value

      while (!isUnique && attempts < maxAttempts) {
        // Generate a random 4-digit number
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        newId = `C${year}${randomNum}`;

        // Check if ID exists using a count query
        const { count, error } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', newId);

        if (error) {
          console.error('Error checking student ID:', error);
          throw error;
        }

        // If count is 0, the ID is unique
        if (count === 0) {
          isUnique = true;
        }

        attempts++;
      }

      if (!isUnique) {
        throw new Error('Failed to generate unique ID after multiple attempts');
      }

      setForm(prev => ({ ...prev, student_id: newId }));
    } catch (error) {
      console.error('Error generating student ID:', error);
      toast.error('Failed to generate student ID. Please try again.');
    } finally {
      setIsGeneratingId(false);
    }
  };

  // Update the form submission to include ID uniqueness check
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Remove areAllRequirementsMet and confirmPassword checks

    // Show confirmation dialog instead of submitting directly
    setShowConfirmation(true);
  };

  // Add this validation function
  const validateRoleBasedFields = (form: CreateUserForm): { isValid: boolean; errors: string[] } => {
    const requirements = roleRequirements[form.role];
    const errors: string[] = [];

    // Check required fields
    requirements.requiredFields.forEach(field => {
      if (!form[field]) {
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        errors.push(`${fieldName} is required for ${form.role} role`);
      }
    });

    // Validate email format and convert to lowercase
    if (form.email) {
      if (!/^[a-zA-Z0-9._-]+$/.test(form.email)) {
        errors.push('Email can only contain letters, numbers, dots, underscores, and hyphens');
      } else {
        // Convert email to lowercase for consistency
        form.email = form.email.toLowerCase();
      }
    }

    // Validate student-specific fields
    if (form.role === 'student') {
      if (form.student_id && !/^C\d{6}$/.test(form.student_id)) {
        errors.push('Invalid student ID format. Must start with C followed by 6 digits');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Update the handleConfirmSubmit function
  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);
    
    // Validate role-based fields
    const validation = validateRoleBasedFields(form);
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    setCreating(true);
    setCreatingUserFlag(true); // Set flag to ignore auth state changes
    
    try {
      // Additional check for student ID uniqueness
      if (form.role === 'student') {
        // Check student ID using count query
        const { count: idCount, error: idError } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', form.student_id);

        if (idError) {
          toast.error('Error checking student ID.');
          setCreating(false);
          setCreatingUserFlag(false); // Reset flag
          resetForm();
          if (onUserCreated) onUserCreated(); else onClose();
          return;
        }

        if (idCount && idCount > 0) {
          toast.error('Student ID already exists. Please try again.');
          await generateStudentId();
          setCreating(false);
          return;
        }

        // Check email using count query with case-insensitive comparison
        const { count: emailCount, error: emailError } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .ilike('email', `${form.email.toLowerCase()}@smcbi.edu.ph`);

        if (emailError) {
          toast.error('Error checking email.');
          setCreating(false);
          setCreatingUserFlag(false); // Reset flag
          resetForm();
          if (onUserCreated) onUserCreated(); else onClose();
          return;
        }

        if (emailCount && emailCount > 0) {
          toast.error('Email already exists. Please choose a different email.');
          setCreating(false);
          return;
        }
      }

      // Create auth user using isolated client so admin session is not affected
      const { data: authData, error: authError } = await createUserClient.auth.signUp({
        email: `${form.email}@smcbi.edu.ph`,
        password: 'TempPass@123',
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: form.role
          }
        }
      });

      if (authError) {
        toast.error(authError.message || 'Error creating auth user.');
        setCreating(false);
        setCreatingUserFlag(false); // Reset flag
        resetForm();
        if (onUserCreated) onUserCreated(); else onClose();
        return;
      }

      const newUserId = authData.user?.id || '';
      if (!newUserId) {
        toast.error('Failed to get new user ID.');
        setCreating(false);
        setCreatingUserFlag(false); // Reset flag
        resetForm();
        if (onUserCreated) onUserCreated(); else onClose();
        return;
      }

      // Prepare the user profile object with proper typing
      const userProfile: UserProfile = {
        id: newUserId,
        email: `${form.email}@smcbi.edu.ph`,
        role: form.role,
        is_active: form.is_active,
        department: form.department || null,
        program_id: null, // Set to null since we're using department instead
        student_id: form.role === 'student' ? (form.student_id || null) : null,
        year_level: form.year_level || null,
        section: form.section || null,
        semester: form.semester || null,
        student_type: form.student_type || null,
        enrollment_status: form.enrollment_status || null,
        school_year: form.school_year || null,
        student_status: form.student_status || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Remove null values
      Object.keys(userProfile).forEach(key => {
        if (userProfile[key as keyof UserProfile] === null) {
          delete userProfile[key as keyof UserProfile];
        }
      });

      // Insert user profile using admin's session
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([userProfile]);

      if (profileError) {
        toast.error(profileError.message || 'Error saving user profile.');
        setCreating(false);
        setCreatingUserFlag(false); // Reset flag
        resetForm();
        if (onUserCreated) onUserCreated(); else onClose();
        return;
      }

      toast.success('User created successfully.');
      resetForm();
      if (onUserCreated) onUserCreated();
      else onClose();
      
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      toast.error(errorMessage);
      resetForm();
      if (onUserCreated) onUserCreated(); else onClose();
    } finally {
      setCreating(false);
      setCreatingUserFlag(false); // Reset flag
    }
  };

  // Update steps when role changes
  useEffect(() => {
    setSteps(getSteps(form.role));
    // Reset step to 0 when role changes
    setStep(0);
  }, [form.role]);

  // Update canProceed function to use role-based validation
  const canProceed = () => {
    console.log('canProceed debug:', { step, email: form.email, role: form.role, emailStatus });
    
    if (step === 0) {
      // For Step 0, only require role selection - email can be empty
      const canGo = form.role !== '';
      console.log('Step 0 can proceed:', canGo, { role: form.role !== '' });
      return canGo;
    }

    // For step 1, check if all required fields for the role are filled
    if (step === 1) {
      const requirements = roleRequirements[form.role];
      if (!requirements) return false;
      
      // Check if all required fields are filled
      const allRequiredFieldsFilled = requirements.requiredFields.every(field => {
        const value = form[field];
        return value !== '' && value !== null && value !== undefined;
      });
      
      console.log('Step 1 can proceed:', allRequiredFieldsFilled, { 
        requiredFields: requirements.requiredFields,
        formValues: form,
        allRequiredFieldsFilled 
      });
      
      return allRequiredFieldsFilled;
    }

    return false;
  };

  // Get max step based on role
  const getMaxStep = () => {
    return 1; // Always 2 steps (0 and 1)
  };

  // Check if all required fields are filled for the current role
  const areAllRequiredFieldsFilled = () => {
    const requirements = roleRequirements[form.role];
    if (!requirements) return false;
    
    return requirements.requiredFields.every(field => {
      const value = form[field];
      return value !== '' && value !== null && value !== undefined;
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative z-[10000]"
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Create New User</h3>
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={onClose}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 pt-3 pb-2 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between overflow-x-auto pb-2 gap-2">
              {steps.map((label, i) => (
                <React.Fragment key={label}>
                  <motion.div 
                    className={`flex flex-col items-center gap-1 min-w-fit cursor-pointer transition-all duration-300 ${
                      i === step ? 'text-blue-600 scale-102' : 
                      i < step ? 'text-green-600' : 'text-gray-400'
                    }`}
                    onClick={() => i <= step && setStep(i)}
                    whileHover={{ scale: i <= step ? 1.01 : 1 }}
                    whileTap={{ scale: i <= step ? 0.99 : 1 }}
                  >
                    <motion.div 
                      className={`relative w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${
                        i < step 
                          ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/20' 
                          : i === step 
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20 border border-white' 
                            : 'bg-white border border-gray-300 shadow-gray-100'
                      }`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ 
                        scale: i === step ? 1.02 : 1, 
                        opacity: 1,
                        y: i === step ? -0.5 : 0
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 20,
                        delay: i * 0.1 
                      }}
                    >
                      {i < step ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </motion.div>
                      ) : (
                        <span className={`text-[10px] font-bold ${
                          i === step ? 'text-white' : 'text-gray-500'
                        }`}>
                          {i + 1}
                        </span>
                      )}
                      
                      {/* Active step indicator */}
                      {i === step && (
                        <motion.div
                          className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-600 rounded-full border border-white"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        />
                      )}
                    </motion.div>
                    
                    <motion.div 
                      className="text-center"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 + 0.2 }}
                    >
                      <span className={`text-[8px] font-semibold block ${
                        i === step ? 'text-blue-700' : 
                        i < step ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        Step {i + 1}
                      </span>
                      <span className={`text-[8px] font-medium mt-0.5 block max-w-12 leading-tight ${
                        i === step ? 'text-blue-600' : 
                        i < step ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {label}
                      </span>
                    </motion.div>
                  </motion.div>
                  
                  {/* Progress line */}
                  {i < steps.length - 1 && (
                    <motion.div 
                      className="flex-1 h-0.5 bg-gray-200 rounded-full relative overflow-hidden"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                    >
                      <motion.div 
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                          i < step 
                            ? 'bg-gradient-to-r from-green-500 to-green-600 w-full' 
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ 
                          width: i < step ? '100%' : i === step ? '50%' : '0%' 
                        }}
                        transition={{ 
                          duration: 0.8, 
                          delay: i * 0.1 + 0.4,
                          ease: "easeInOut"
                        }}
                      />
                    </motion.div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form className="space-y-6">
              {/* Step 1: Account Information */}
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="account-info"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-4"
                  >
                    <div className="text-center">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <select
                        className="w-full max-w-xs mx-auto border-2 border-gray-500 rounded-lg px-3 py-2 text-center appearance-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm"
                        style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                        value={form.role}
                        onChange={e => {
                          console.log('Role changed from', form.role, 'to', e.target.value);
                          setForm(prev => ({ ...prev, role: e.target.value as CreateUserForm['role'] }));
                        }}
                        required
                      >
                        <option value="">Select Role</option>
                        <option value="student">Student</option>
                        <option value="instructor">Instructor</option>
                        {/* Admin role temporarily disabled */}
                        {/* <option value="admin">Admin</option> */}
                        <option value="registrar">Registrar</option>
                        <option value="program_head">Program Head</option>
                      </select>
                    </div>








                  </motion.div>
                )}

                {/* Step 2: Academic Information (for students) / Department (for instructors/program heads) */}
                {step === 1 && (
                  <motion.div
                    key="academic-info"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-4"
                  >
                    {/* Email field for all roles */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <div className="relative">
                        <input
                          type="text"
                          className={`${getEmailInputClasses()} border-2 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200`}
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: emailStatus === 'valid' ? '#10b981' : emailStatus === 'invalid' ? '#ef4444' : emailStatus === 'checking' ? '#3b82f6' : '#6b7280 !important' }}
                          value={form.email}
                          onChange={e => {
                            const value = e.target.value.replace(/@.*$/, '');
                            setForm(prev => ({ ...prev, email: value }));
                          }}
                          placeholder="Enter email username"
                          required
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {emailStatus === 'checking' && (
                            <div className="flex items-center gap-1 text-blue-500 text-xs">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Checking...</span>
                            </div>
                          )}
                          {emailStatus === 'valid' && (
                            <div className="flex items-center gap-1 text-green-500 text-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Available</span>
                            </div>
                          )}
                          {emailStatus === 'invalid' && (
                            <div className="flex items-center gap-1 text-red-500 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              <span>{form.email.match(/^[a-zA-Z0-9._-]+$/) ? 'Email taken' : 'Invalid format'}</span>
                            </div>
                          )}
                          <span className="text-gray-500 text-sm">@smcbi.edu.ph</span>
                        </div>
                      </div>
                      {emailStatus === 'invalid' && (
                        <p className="mt-1 text-sm text-red-500">
                          {form.email.match(/^[a-zA-Z0-9._-]+$/) 
                            ? 'This email is already registered'
                            : 'Email can only contain letters, numbers, dots, underscores, and hyphens'}
                        </p>
                      )}
                    </div>

                    {form.role === 'student' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                          <div className="relative">
                            <input
                              type="text"
                              className="w-full border-2 border-gray-500 rounded-lg px-3 py-3 bg-white font-mono text-center text-sm shadow-sm"
                              style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                              value={form.student_id || ''}
                              readOnly
                              placeholder={isGeneratingId ? "Generating..." : "Loading..."}
                            />
                            {isGeneratingId && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Program <span className="text-red-500">*</span>
                          </label>
                          <select
                            className={`w-full border-2 rounded-lg px-3 py-3 text-sm bg-white shadow-sm text-gray-500 ${
                              form.department ? 'border-green-500 bg-green-50' : 'border-gray-500'
                            }`}
                            style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.department ? '#10b981' : '#6b7280 !important' }}
                            value={form.department}
                            onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
                            required
                          >
                            <option value="">Select Program</option>
                            {programs.map(program => (
                              <option key={program.id} value={program.name}>
                                {program.name}
                              </option>
                            ))}
                          </select>
                        </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Year Level <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={`w-full border-2 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-500 ${
                            form.year_level ? 'border-green-500 bg-green-50' : 'border-gray-500'
                          }`}
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.year_level ? '#10b981' : '#6b7280 !important' }}
                          value={form.year_level}
                          onChange={e => setForm(prev => ({ ...prev, year_level: e.target.value }))}
                          required
                        >
                          <option value="">Select Year Level</option>
                          {yearLevels.map(level => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Student Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={`w-full border-2 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-500 ${
                            form.student_type ? 'border-green-500 bg-green-50' : 'border-gray-500'
                          }`}
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.student_type ? '#10b981' : '#6b7280 !important' }}
                          value={form.student_type}
                          onChange={e => setForm(prev => ({ ...prev, student_type: e.target.value }))}
                          required
                        >
                          <option value="">Select Type</option>
                          {studentTypes.map(type => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Enrollment Status <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={`w-full border-2 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-500 ${
                            form.enrollment_status ? 'border-green-500 bg-green-50' : 'border-gray-500'
                          }`}
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.enrollment_status ? '#10b981' : '#6b7280 !important' }}
                          value={form.enrollment_status}
                          onChange={e => setForm(prev => ({ ...prev, enrollment_status: e.target.value }))}
                          required
                        >
                          <option value="">Select Status</option>
                          {enrollmentStatuses.map(status => (
                            <option key={status} value={status}>
                              {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Section <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={`w-full border-2 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-500 ${
                            form.section ? 'border-green-500 bg-green-50' : 'border-gray-500'
                          }`}
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.section ? '#10b981' : '#6b7280 !important' }}
                          value={form.section}
                          onChange={e => setForm(prev => ({ ...prev, section: e.target.value }))}
                          required
                        >
                          <option value="">Select Section</option>
                          {sectionOptions.map(section => (
                            <option key={section} value={section}>
                              Section {section}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Semester <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={`w-full border-2 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-500 ${
                            form.semester ? 'border-green-500 bg-green-50' : 'border-gray-500'
                          }`}
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.semester ? '#10b981' : '#6b7280 !important' }}
                          value={form.semester}
                          onChange={e => setForm(prev => ({ ...prev, semester: e.target.value }))}
                          required
                        >
                          <option value="">Select Semester</option>
                          {semesters.map(sem => (
                            <option key={sem} value={sem}>
                              {sem}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Academic Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full border-2 border-gray-500 rounded-lg px-3 py-3 text-sm bg-gray-100 text-gray-500 cursor-not-allowed shadow-sm"
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                          value={form.school_year}
                          readOnly
                          disabled
                        />
                   
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {form.role !== 'registrar' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department <span className="text-red-500">*</span>
                          </label>
                          <select
                            className="w-full border-2 border-gray-500 rounded-lg px-3 py-3 text-sm bg-white shadow-sm text-gray-500"
                            style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                            value={form.department}
                            onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
                            required
                            disabled={isLoadingDepartments}
                          >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                              <option key={dept.name} value={dept.name}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                          {isLoadingDepartments && (
                            <p className="mt-1 text-sm text-gray-500 text-center">Loading departments...</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
                )}





              </AnimatePresence>

              {/* Confirmation Dialog */}
              {showConfirmation && createPortal(
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[10001]"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm User Creation</h3>
                    <p className="text-gray-600 mb-4">
                      Are you sure you want to create this user account? Please review all information carefully before proceeding.
                    </p>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowConfirmation(false)}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSubmit}
                        disabled={creating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {creating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Confirm & Create
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>,
                document.body
              )}

              {/* Navigation Buttons */}
              <motion.div 
                className="flex items-center justify-between pt-4 border-t border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {step > 0 && (
                  <motion.button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </motion.button>
                )}
                {step < getMaxStep() ? (
                  <motion.button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="ml-auto flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    disabled={creating || !areAllRequiredFieldsFilled()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    className="ml-auto flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        Create User
                      </>
                    )}
                  </motion.button>
                )}
              </motion.div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default CreateUserModal; 

