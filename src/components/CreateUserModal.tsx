import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { sanitizeTextInput } from '../utils/validation';
import { createPortal } from 'react-dom';

interface Program {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface Department {
  code: string;
}

interface CreateUserForm {
  email: string;
  role: 'teacher' | 'student' | 'registrar' | 'program_head';
  first_name: string;
  middle_name?: string;
  last_name: string;
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
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  password: string;
  // confirmPassword removed
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
  student: {
    requiredFields: [
      'email', 'role', 'first_name', 'last_name', 'password',
      'student_id', 'gender', 'birthdate', 'phone', 'address',
      'program_id', 'year_level', 'student_type', 'enrollment_status',
      'section', 'semester', 'school_year',
      'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone'
    ],
    optionalFields: ['middle_name', 'suffix']
  },
  teacher: {
    requiredFields: [
      'email', 'role', 'first_name', 'last_name', 'password',
      'gender', 'birthdate', 'phone', 'address', 'department'
    ],
    optionalFields: ['middle_name', 'suffix']
  },
  registrar: {
    requiredFields: [
      'email', 'role', 'first_name', 'last_name', 'password',
      'gender', 'birthdate', 'phone', 'address'
    ],
    optionalFields: ['middle_name', 'suffix']
  },
  program_head: {
    requiredFields: [
      'email', 'role', 'first_name', 'last_name', 'password',
      'gender', 'birthdate', 'phone', 'address', 'department'
    ],
    optionalFields: ['middle_name', 'suffix']
  }
};

// Update the userProfile type
interface UserProfile {
  id: string;
  email: string;
  role: CreateUserForm['role'];
  first_name: string;
  last_name: string;
  is_active: boolean;
  middle_name: string | null;
  suffix: string | null;
  department: string | null;
  program_id: number | null;
  student_id: string | null;
  year_level: string | null;
  section: string | null;
  semester: string | null;
  student_type: string | null;
  enrollment_status: string | null;
  gender: string | null;
  birthdate: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
  school_year: string | null;
  created_at: string;
  updated_at: string;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
  // Form state
  const [form, setForm] = useState<CreateUserForm>({
    email: '',
    role: 'student',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    is_active: true,
    department: '',
    program_id: '',
    student_id: '',
    year_level: '',
    student_type: '',
    enrollment_status: '',
    section: '',
    school_year: '',
    semester: '',
    gender: '',
    birthdate: '',
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    password: 'TempPass@123', // Set default password
    // confirmPassword removed
  });

  // UI state
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [phoneError, setPhoneError] = useState('');
  const [emergencyPhoneError, setEmergencyPhoneError] = useState('');
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  // Data state
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);

  // Constants
  const getSteps = (role: string) => {
    if (role === 'student') {
      return ['Account Information', 'Basic Information', 'Academic Information', 'Emergency Contact', 'Review'];
    }
    return ['Account Information', 'Basic Information', 'Review'];
  };

  const [steps, setSteps] = useState<string[]>(getSteps(form.role));
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },

  ];
  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const studentTypes = ['Regular', 'Irregular', 'Transferee'];
  const enrollmentStatuses = ['enrolled', 'not_enrolled'];
  const semesters = ['1st Semester', '2nd Semester'];
  const sectionOptions = ['A', 'B', 'C', 'D'];

  // Add academic years array
  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
    `${currentYear + 2}-${currentYear + 3}`
  ];

  // Remove password validation state and requirements
  // Remove passwordValidation, passwordRequirements, showRequirements, and related logic

  // Phone validation state
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Add state for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Reset form function
  const resetForm = () => {
    setForm({
      email: '',
      role: 'student',
      first_name: '',
      middle_name: '',
      last_name: '',
      suffix: '',
      is_active: true,
      department: '',
      program_id: '',
      student_id: '',
      year_level: '',
      student_type: '',
      enrollment_status: '',
      section: '',
      school_year: '',
      semester: '',
      gender: '',
      birthdate: '',
      phone: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_relationship: '',
      emergency_contact_phone: '',
      password: 'TempPass@123',
    });
    setStep(0);
    setEmailStatus('idle');
    setPhoneError('');
    setEmergencyPhoneError('');
    setPhoneTouched(false);
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
        .select('id, code, name, description')
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
        .select('code')
        .order('code');
      
      if (error) throw error;
      
      // Get unique department codes and filter out any null/undefined values
      const uniqueDepartments = Array.from(new Set(data?.filter(program => program.code).map(program => program.code) || []))
        .map(code => ({ code }));
      
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

  // Remove areAllRequirementsMet and validatePassword functions

  // Phone validation handler
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setForm(prev => ({ ...prev, phone: value }));
      if (phoneTouched) {
        setPhoneError(value.length === 11 ? '' : 'Phone number must be 11 digits');
      }
    }
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    if (form.phone) {
      setPhoneError(form.phone.length === 11 ? '' : 'Phone number must be 11 digits');
    }
  };

  // Emergency contact phone validation
  const handleEmergencyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setForm(prev => ({ ...prev, emergency_contact_phone: value }));
      setEmergencyPhoneError(value.length === 11 ? '' : 'Phone number must be 11 digits');
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

    // Validate phone numbers
    if (form.phone && !/^\d{11}$/.test(form.phone)) {
      errors.push('Phone number must be exactly 11 digits');
    }

    if (form.role === 'student' && form.emergency_contact_phone && !/^\d{11}$/.test(form.emergency_contact_phone)) {
      errors.push('Emergency contact phone number must be exactly 11 digits');
    }

    // Validate student-specific fields
    if (form.role === 'student') {
      if (form.student_id && !/^C\d{6}$/.test(form.student_id)) {
        errors.push('Invalid student ID format. Must start with C followed by 6 digits');
      }
      
      if (form.school_year && !/^\d{4}-\d{4}$/.test(form.school_year)) {
        errors.push('School year must be in format YYYY-YYYY');
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

      // Create auth user with email confirmation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${form.email}@smcbi.edu.ph`,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: form.role,
            first_name: form.first_name,
            last_name: form.last_name
          }
        }
      });

      if (authError) {
              toast.error(authError.message || 'Error creating auth user.');
      setCreating(false);
      resetForm();
      if (onUserCreated) onUserCreated(); else onClose();
      return;
      }

      // Prepare the user profile object with proper typing
      const userProfile: UserProfile = {
        id: authData.user?.id || '',
        email: `${form.email}@smcbi.edu.ph`,
        role: form.role,
        first_name: form.first_name,
        last_name: form.last_name,
        is_active: form.is_active,
        middle_name: form.middle_name || null,
        suffix: form.suffix || null,
        department: form.department || null,
        program_id: form.program_id ? Number(form.program_id) : null,
        student_id: form.student_id || null,
        year_level: form.year_level || null,
        section: form.section || null,
        semester: form.semester || null,
        student_type: form.student_type || null,
        enrollment_status: form.enrollment_status || null,
        gender: form.gender || null,
        birthdate: form.birthdate || null,
        phone: form.phone || null,
        address: form.address || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_relationship: form.emergency_contact_relationship || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        school_year: form.school_year || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Remove null values
      Object.keys(userProfile).forEach(key => {
        if (userProfile[key as keyof UserProfile] === null) {
          delete userProfile[key as keyof UserProfile];
        }
      });

      // Insert user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([userProfile]);

      if (profileError) {
        toast.error(profileError.message || 'Error saving user profile.');
        setCreating(false);
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
    if (step === 0) {
      return (
        form.email &&
        form.role &&
        form.first_name &&
        form.last_name &&
        emailStatus === 'valid'
      );
    }

    const requirements = roleRequirements[form.role];
    const currentStepFields = getFieldsForStep(step, form.role);
    
    return currentStepFields.every(field => {
      if (requirements.requiredFields.includes(field)) {
        return !!form[field];
      }
      return true;
    });
  };

  // Add this helper function
  const getFieldsForStep = (step: number, role: CreateUserForm['role']): (keyof CreateUserForm)[] => {
    if (role === 'student') {
      switch (step) {
        case 1:
          return ['student_id', 'gender', 'birthdate', 'phone', 'address'];
        case 2:
          return ['program_id', 'year_level', 'student_type', 'enrollment_status', 'section', 'semester', 'school_year'];
        case 3:
          return ['emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone'];
        default:
          return [];
      }
    } else {
      switch (step) {
        case 1:
          return ['gender', 'birthdate', 'phone', 'address', 'department'];
        default:
          return [];
      }
    }
  };

  // Get max step based on role
  const getMaxStep = () => {
    return form.role === 'student' ? 4 : 2;
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
                        onChange={e => setForm(prev => ({ ...prev, role: e.target.value as CreateUserForm['role'] }))}
                        required
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        {/* Admin role temporarily disabled */}
                        {/* <option value="admin">Admin</option> */}
                        <option value="registrar">Registrar</option>

                        <option value="program_head">Program Head</option>

                      </select>
                    </div>

                    {/* Update the department selection dropdown */}

                    {(form.role === 'teacher' || form.role === 'program_head') && (

                  

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">

                          Department <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={`w-full max-w-xs mx-auto border-2 rounded-lg px-3 py-2 text-center appearance-none bg-white shadow-sm ${
                            form.department ? 'border-green-500 bg-green-50' : 'border-gray-500'
                          } ${isLoadingDepartments ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.department ? '#10b981' : '#6b7280 !important' }}
                          value={form.department}
                          onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
                          required
                          disabled={isLoadingDepartments}
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept.code} value={dept.code}>
                              {dept.code}
                            </option>
                          ))}
                        </select>
                        {isLoadingDepartments && (
                          <p className="mt-1 text-sm text-gray-500 text-center">Loading departments...</p>
                        )}
                      </div>
                    )}

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

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        <input
                          type="text"
                          className="w-full border-2 border-gray-500 rounded-lg px-3 py-2 mt-1 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm text-gray-500"
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                          value={form.first_name}
                          onChange={e => setForm(prev => ({ ...prev, first_name: sanitizeTextInput(e.target.value) }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                        <input
                          type="text"
                          className="w-full border-2 border-gray-500 rounded-lg px-3 py-2 mt-1 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm text-gray-500"
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                          value={form.last_name}
                          onChange={e => setForm(prev => ({ ...prev, last_name: sanitizeTextInput(e.target.value) }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                        <input
                          type="text"
                          className="w-full border-2 border-gray-500 rounded-lg px-3 py-2 mt-1 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm text-gray-500"
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                          value={form.middle_name}
                          onChange={e => setForm(prev => ({ ...prev, middle_name: sanitizeTextInput(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Suffix</label>
                        <input
                          type="text"
                          className="w-full border-2 border-gray-500 rounded-lg px-3 py-2 mt-1 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm text-gray-500"
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                          value={form.suffix}
                          onChange={e => setForm(prev => ({ ...prev, suffix: e.target.value }))}
                          placeholder="e.g., Jr., Sr., III"
                        />
                      </div>
                    </div>

                    {/* Remove password and confirm password fields from the modal UI, replace with a single read-only password field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="text"
                        className="w-full border-2 border-gray-500 rounded-lg px-3 py-2 mt-1 bg-gray-100 text-gray-500 cursor-not-allowed focus:border-gray-600 focus:ring-2 focus:ring-gray-600/20 transition-all duration-200 shadow-sm"
                        style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                        value={form.password}
                        readOnly
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-500">Default password is <span className="font-mono">TempPass@123</span>. User will be required to change this on first login.</p>
                    </div>

                    {/* Remove confirm password field and password requirements indicator from the UI */}
                  </motion.div>
                )}

                {/* Step 2: Basic Information */}
                {step === 1 && (
                  <motion.div
                    key="basic-info"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {form.role === 'student' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                          <div className="relative">
                            <input
                              type="text"
                              className="w-full border-2 border-gray-500 rounded-lg px-3 py-2 bg-white font-mono text-center text-sm shadow-sm"
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
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                        <select
                          className="w-full border-2 border-gray-500 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-500"
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                          value={form.gender}
                          onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}
                          required
                        >
                          <option value="">Select Gender</option>
                          {genderOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
                        <input
                          type="date"
                          className="w-full border-2 border-gray-500 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-500"
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                          value={form.birthdate}
                          onChange={e => setForm(prev => ({ ...prev, birthdate: e.target.value }))}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                          type="tel"
                          className={`w-full border-2 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-500 ${
                            phoneTouched && phoneError ? 'border-red-500 bg-red-50' : 'border-gray-500'
                          }`}
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: phoneTouched && phoneError ? '#ef4444' : '#6b7280 !important' }}
                          value={form.phone}
                          onChange={handlePhoneChange}
                          onBlur={handlePhoneBlur}
                          maxLength={11}
                          required
                        />
                        {phoneTouched && phoneError && (
                          <p className="mt-0.5 text-xs text-red-500">{phoneError}</p>
                        )}
                      </div>

                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea
                          className="w-full border-2 border-gray-500 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-500"
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: '#6b7280 !important' }}
                          value={form.address}
                          onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                          rows={2}
                          required
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Academic Information (for students) */}
                {step === 2 && form.role === 'student' && (
                  <motion.div
                    key="academic-info"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Program <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={`w-full border-2 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-500 ${
                            form.program_id ? 'border-green-500 bg-green-50' : 'border-gray-500'
                          }`}
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.program_id ? '#10b981' : '#6b7280 !important' }}
                          value={form.program_id}
                          onChange={e => setForm(prev => ({ ...prev, program_id: e.target.value }))}
                          required
                        >
                          <option value="">Select Program</option>
                          {programs.map(program => (
                            <option key={program.id} value={program.id}>
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
                          School Year <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={`w-full border-2 rounded-lg px-3 py-2 text-sm bg-white shadow-sm text-gray-500 ${
                            form.school_year ? 'border-green-500 bg-green-50' : 'border-gray-500'
                          }`}
                          style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.school_year ? '#10b981' : '#6b7280 !important' }}
                          value={form.school_year}
                          onChange={e => setForm(prev => ({ ...prev, school_year: e.target.value }))}
                          required
                        >
                          <option value="">Select School Year</option>
                          {academicYears.map(year => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Emergency Contact (for students) */}
                {step === 3 && form.role === 'student' && (
                  <motion.div
                    key="emergency-contact"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Emergency Contact Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full border-2 rounded-lg px-3 py-2 mt-1 bg-white shadow-sm text-gray-500 ${
                          form.emergency_contact_name ? 'border-green-500 bg-green-50' : 'border-gray-500'
                        }`}
                        style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.emergency_contact_name ? '#10b981' : '#6b7280 !important' }}
                        value={form.emergency_contact_name}
                        onChange={e => setForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Relationship <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full border-2 rounded-lg px-3 py-2 mt-1 bg-white shadow-sm text-gray-500 ${
                          form.emergency_contact_relationship ? 'border-green-500 bg-green-50' : 'border-gray-500'
                        }`}
                        style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.emergency_contact_relationship ? '#10b981' : '#6b7280 !important' }}
                        value={form.emergency_contact_relationship}
                        onChange={e => setForm(prev => ({ ...prev, emergency_contact_relationship: e.target.value }))}
                        placeholder="e.g., Parent, Sibling, Guardian"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Emergency Contact Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        className={`w-full border-2 rounded-lg px-3 py-2 mt-1 bg-white shadow-sm text-gray-500 ${
                          form.emergency_contact_phone && !emergencyPhoneError 
                            ? 'border-green-500 bg-green-50' 
                            : emergencyPhoneError 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-500'
                        }`}
                        style={{ borderStyle: 'solid !important', borderWidth: '2px !important', borderColor: form.emergency_contact_phone && !emergencyPhoneError ? '#10b981' : emergencyPhoneError ? '#ef4444' : '#6b7280 !important' }}
                        value={form.emergency_contact_phone}
                        onChange={handleEmergencyPhoneChange}
                        
                        maxLength={11}
                        required
                      />
                      {emergencyPhoneError && (
                        <p className="mt-1 text-sm text-red-500">{emergencyPhoneError}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Review (for students) or Step 3: Review (for others) */}
                {((form.role === 'student' && step === 4) || (form.role !== 'student' && step === 2)) && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-4"
                  >
                    <h4 className="text-lg font-semibold text-blue-700 mb-4">Review Information</h4>
                    
                    {/* Account Information */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h5 className="font-medium text-gray-900 mb-2">Account Information</h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Full Name</p>
                          <p className="font-medium">
                            {[form.first_name, form.middle_name, form.last_name, form.suffix]
                              .filter(Boolean)
                              .join(' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{form.email}@smcbi.edu.ph</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Role</p>
                          <p className="font-medium capitalize">{form.role}</p>
                        </div>
                      </div>
                    </div>

                    {/* Basic Information */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h5 className="font-medium text-gray-900 mb-2">Basic Information</h5>
                      <div className="grid grid-cols-2 gap-4">

                        {(form.role === 'teacher' || form.role === 'program_head') && (

                       
                          <div>
                            <p className="text-sm text-gray-500">Department</p>
                            <p className="font-medium">{form.department}</p>
                          </div>
                        )}
                        {form.role === 'student' && (
                          <div>
                            <p className="text-sm text-gray-500">Student ID</p>
                            <p className="font-medium">{form.student_id}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-500">Gender</p>
                          <p className="font-medium capitalize">{form.gender}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Birthdate</p>
                          <p className="font-medium">{form.birthdate}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone Number</p>
                          <p className="font-medium">{form.phone}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium">{form.address}</p>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information (for students) */}
                    {form.role === 'student' && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <h5 className="font-medium text-gray-900 mb-2">Academic Information</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Program</p>
                            <p className="font-medium">
                              {programs.find(p => p.id.toString() === form.program_id)?.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Year Level</p>
                            <p className="font-medium">{form.year_level}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Student Type</p>
                            <p className="font-medium">{form.student_type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Enrollment Status</p>
                            <p className="font-medium">
                              {form.enrollment_status?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Section</p>
                            <p className="font-medium">Section {form.section}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Semester</p>
                            <p className="font-medium">{form.semester}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">School Year</p>
                            <p className="font-medium">{form.school_year || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Emergency Contact (for students) */}
                    {form.role === 'student' && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <h5 className="font-medium text-gray-900 mb-2">Emergency Contact</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Contact Name</p>
                            <p className="font-medium">{form.emergency_contact_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Relationship</p>
                            <p className="font-medium">{form.emergency_contact_relationship}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Contact Phone</p>
                            <p className="font-medium">{form.emergency_contact_phone}</p>
                          </div>
                        </div>
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
                    disabled={creating}
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

