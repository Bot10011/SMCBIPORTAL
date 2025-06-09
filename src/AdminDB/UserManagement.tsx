import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Loader2, ChevronLeft, ChevronRight, CheckCircle2, Users, Edit, Trash2, Ban, Undo2, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const studentTypes = ['Regular', 'Irregular', 'Transferee', 'Returnee'];
const enrollmentStatuses = ['Enrolled', 'Pending',];
const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const semesters = ['1st Semester', '2nd Semester'];

interface Program {
  id: number;
  code: string;
  name: string;
  description?: string;
  department?: string;
}

// Add gender options
const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Prefer not to say', label: 'Prefer not to say' }
];

// Add these types at the top with other interfaces
interface UserProfile {
  id: string;
  email: string;
  role: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  is_active: boolean;
  student_id?: string;
  gender?: string;
  birthdate?: string;
  phone?: string;
  address?: string;
  program_id?: string;
  year_level?: string;
  section?: string;
  school_year?: string;
  semester?: string;
  enrollment_status?: string;
  student_type?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    program_id: '',
    // Student fields
    student_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    gender: '',
    birthdate: '',
    phone: '',
    address: '',
    course: '',
    year_level: '',
    student_type: '',
    enrollment_status: '',
    section: '',
    school_year: '',
    semester: '',
    emergency_name: '',
    emergency_relationship: '',
    emergency_phone: '',
  });
  const steps = [
    'Account Info',
    ...(form.role === 'student' ? ['Basic Info', 'Academic Info', 'Emergency Contact', 'Review'] : ['Review'])
  ];

  // Add state for editing
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Remove showPasswordValidation state since we'll always show the requirements
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    hasNumber: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasSpecialChar: false,
    matches: false
  });

  // Password validation items with icons
  const passwordRequirements = [
    { key: 'length', text: 'At least 8 characters', icon: Check },
    { key: 'hasNumber', text: 'Contains a number', icon: Check },
    { key: 'hasUpperCase', text: 'Contains an uppercase letter', icon: Check },
    { key: 'hasLowerCase', text: 'Contains a lowercase letter', icon: Check },
    { key: 'hasSpecialChar', text: 'Contains a special character', icon: Check }
  ];

  // Add state to track if requirements should be shown
  const [showRequirements, setShowRequirements] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [phoneError, setPhoneError] = useState<string>('');
  const [emergencyPhoneError, setEmergencyPhoneError] = useState<string>('');

  // Add state for edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Add confirmation dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [userToAction, setUserToAction] = useState<UserProfile | null>(null);

  // Add edit form state
  const [editForm, setEditForm] = useState({
    email: '',
    role: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    gender: '',
    birthdate: '',
    phone: '',
    address: '',
    program_id: '',
    student_id: '',
    year_level: '',
    student_type: '',
    enrollment_status: '',
    section: '',
    school_year: '',
    semester: '',
    emergency_name: '',
    emergency_relationship: '',
    emergency_phone: '',
  });

  // Update debounce function with proper types
  const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Update the email uniqueness check function
  const checkEmailUniqueness = async (email: string): Promise<void> => {
    if (!email || email.trim() === '') {
      setEmailStatus('idle');
      return;
    }

    // Validate email format first (username part only)
    const emailRegex = /^[a-zA-Z0-9._-]+$/;
    if (!emailRegex.test(email)) {
      setEmailStatus('invalid');
      return;
    }

    // Create the full email with domain
    const fullEmail = `${email}@smcbi.edu.ph`;

    setEmailStatus('checking');
    try {
      // Check in user_profiles table with full email
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', fullEmail); // Check the full email including domain

      if (profileError) {
        throw new Error(profileError.message);
      }

      const isUnique = !profileData || profileData.length === 0;
      setEmailStatus(isUnique ? 'valid' : 'invalid');

      if (!isUnique) {
        toast.error('This email is already registered in the system.');
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Failed to check email: ${error.message}`);
      } else {
        toast.error('Failed to check email availability');
      }
      setEmailStatus('invalid');
    }
  };

  // Create debounced version of email check
  const debouncedEmailCheck = debounce(checkEmailUniqueness, 500);

  // Add function to generate student ID
  const generateStudentId = async (): Promise<string> => {
    // Get random number between 100000-999999 (6 digits)
    const randomNum = Math.floor(Math.random() * 900000) + 100000;
    
    // Format: C###### (e.g., C123456)
    const studentId = `C${randomNum}`;
    
    // Check if ID already exists - don't use single() as it causes 406 errors when no results found
    const { data } = await supabase
      .from('user_profiles')
      .select('student_id')
      .eq('student_id', studentId);
    
    // If ID exists (data has elements), generate a new one
    if (data && data.length > 0) {
      return generateStudentId();
    }
    
    return studentId;
  };

  // Update phone validation
  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(phone);
  };

  // Update phone handlers
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Format the number as user types
    let formattedNumber = '';
    if (digitsOnly.length > 0) {
      // If starts with 9, add 0 prefix
      if (digitsOnly.startsWith('9')) {
        formattedNumber = '0' + digitsOnly.slice(0, 10);
      } else if (digitsOnly.startsWith('0')) {
        // If already starts with 0, keep it
        formattedNumber = digitsOnly.slice(0, 11);
      } else {
        // If starts with anything else, add 0 and 9
        formattedNumber = '09' + digitsOnly.slice(0, 9);
      }
    }
    
    setForm(f => ({ ...f, phone: formattedNumber }));
    setPhoneError('');
    
    // Validate and set error message
    if (formattedNumber && !validatePhoneNumber(formattedNumber)) {
      if (!phoneError) {
        setPhoneError('Please enter a valid Philippine mobile number (e.g., 9502376954)');
      }
    } else {
      setPhoneError('');
    }
  };

  const handleEmergencyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Format the number as user types
    let formattedNumber = '';
    if (digitsOnly.length > 0) {
      // If starts with 9, add 0 prefix
      if (digitsOnly.startsWith('9')) {
        formattedNumber = '0' + digitsOnly.slice(0, 10);
      } else if (digitsOnly.startsWith('0')) {
        // If already starts with 0, keep it
        formattedNumber = digitsOnly.slice(0, 11);
      } else {
        // If starts with anything else, add 0 and 9
        formattedNumber = '09' + digitsOnly.slice(0, 9);
      }
    }
    
    setForm(f => ({ ...f, emergency_phone: formattedNumber }));
    setEmergencyPhoneError('');
    
    // Validate and set error message
    if (formattedNumber && !validatePhoneNumber(formattedNumber)) {
      if (!emergencyPhoneError) {
        setEmergencyPhoneError('Please enter a valid Philippine mobile number (e.g., 9502376954)');
      }
    } else {
      setEmergencyPhoneError('');
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('role', 'superadmin') // Exclude superadmin users
        .neq('id', user?.id) // Exclude current admin's own account
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUsers();
    fetchPrograms();
  }, [fetchUsers]);

  async function fetchPrograms() {
    const { data, error } = await supabase.from('programs').select('*').order('name');
    if (error) {
      toast.error('Failed to load programs: ' + error.message);
    } else {
      setPrograms(data || []);
    }
  }

  // Add password validation function
  const validatePassword = (password: string, confirmPassword: string) => {
    setPasswordValidation({
      length: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      matches: password === confirmPassword && password !== ''
    });
  };

  // Add a function to check if all password requirements are met
  const areAllRequirementsMet = () => {
    return Object.entries(passwordValidation)
      .filter(([key]) => key !== 'matches') // Exclude the matches check
      .every(([_, value]) => value === true);
  };

  // Update handleCreateUser to handle auth uniqueness during signup
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    
    // Email validation
    const emailToCheck = form.email.trim();
    const fullEmail = `${emailToCheck}@smcbi.edu.ph`;
    
    console.log('Starting user creation process...');
    console.log('Email:', fullEmail);
    console.log('Program:', form.program_id);
    console.log('Role:', form.role);
    
    try {
      // Check format first
      const emailRegex = /^[a-zA-Z0-9._-]+$/;
      if (!emailRegex.test(emailToCheck)) {
        toast.error('Please enter a valid email username (letters, numbers, dots, underscores, and hyphens only).');
        return;
      }

      setCreating(true);
      
      // Check if user already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('user_profiles')
        .select('email')
        .ilike('email', fullEmail);

      if (checkError) {
        console.error('Error checking existing user:', checkError);
        toast.error('Error checking if user exists. Please try again.');
        setCreating(false);
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        toast.error('A user with this email already exists.');
        setCreating(false);
        return;
      }
      
      // 1. Create user in Supabase Auth
      console.log('Creating user in auth system...');
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: fullEmail,
        password: form.password,
      });

      if (signUpError) {
        console.error('Auth signup error:', signUpError);
        if (signUpError.message.includes('already registered')) {
          toast.error('This email is already registered in the authentication system.');
        } else {
          toast.error(`Authentication error: ${signUpError.message}`);
        }
        return;
      }

      if (!user?.id) {
        console.error('No user ID returned from signup');
        throw new Error('User ID not returned from sign up');
      }

      console.log('Auth user created successfully. User ID:', user.id);

      // 2. Create user profile
      const now = new Date().toISOString();
      const profileData = {
        id: user.id,
        email: fullEmail,
        role: form.role,
        first_name: form.first_name,
        last_name: form.last_name,
        middle_name: form.middle_name || null,
        suffix: form.suffix || null,
        is_active: true,
        created_at: now,
        updated_at: now,
        created_by: user.id,
        // Student specific fields
        student_id: form.role === 'student' ? form.student_id : null,
        gender: form.role === 'student' ? form.gender : null,
        birthdate: form.role === 'student' ? form.birthdate : null,
        phone: form.role === 'student' ? form.phone : null,
        address: form.role === 'student' ? form.address : null,
        program_id: form.role === 'student' ? form.program_id : null,
        year_level: form.role === 'student' ? form.year_level : null,
        section: form.role === 'student' ? form.section : null,
        school_year: form.role === 'student' ? form.school_year : null,
        semester: form.role === 'student' ? form.semester : null,
        enrollment_status: form.role === 'student' ? form.enrollment_status : null,
        student_type: form.role === 'student' ? form.student_type : null,
        emergency_contact_name: form.role === 'student' ? form.emergency_name : null,
        emergency_contact_relationship: form.role === 'student' ? form.emergency_relationship : null,
        emergency_contact_phone: form.role === 'student' ? form.emergency_phone : null
      };

      console.log('Attempting to create user profile with data:', profileData);

      // Insert into user_profiles table
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // If profile creation fails, we should clean up the auth user
        await supabase.auth.admin.deleteUser(user.id);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      console.log('User profile created successfully:', profile);

      toast.success('User created successfully!');
      setShowModal(false);
      setForm({ 
        email: '', 
        password: '', 
        confirmPassword: '', 
        role: 'student',
        program_id: '',
        student_id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        gender: '',
        birthdate: '',
        phone: '',
        address: '',
        course: '',
        year_level: '',
        student_type: '',
        enrollment_status: '',
        section: '',
        school_year: '',
        semester: '',
        emergency_name: '',
        emergency_relationship: '',
        emergency_phone: ''
      });
      fetchUsers();

    } catch (error) {
      console.error('Error in user creation process:', error);
      if (error instanceof Error) {
        toast.error(`Failed to create user: ${error.message}`);
      } else {
        toast.error('Failed to create user. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  }

  function canProceed() {
    if (step === 0) {
      const isPasswordValid = Object.values(passwordValidation).every(v => v === true);
      const basicFieldsValid = Boolean(
        form.email?.trim() && 
        form.password && 
        form.confirmPassword && 
        form.role
      );
      // Only check program_id for non-student roles
      const programValid = form.role === 'student' ? true : Boolean(form.program_id);
      return basicFieldsValid && isPasswordValid && programValid;
    }
    if (form.role === 'student') {
      if (step === 1) {
        return Boolean(
          form.student_id?.trim() && 
          form.first_name?.trim() && 
          form.last_name?.trim() && 
          form.gender?.trim() && 
          form.birthdate
        );
      }
      if (step === 2) {
        // Check all required academic fields
        const hasRequiredFields = Boolean(
          form.course?.trim() && 
          form.year_level?.trim() && 
          form.student_type?.trim() && 
          form.enrollment_status?.trim()
        );
        return hasRequiredFields;
      }
      if (step === 3) {
        return Boolean(
          form.emergency_name?.trim() && 
          form.emergency_phone?.trim()
        );
      }
    }
    return true;
  }

  // Update the handlers with proper types and confirmations
  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleDeleteClick = (user: UserProfile) => {
    setUserToAction(user);
    setShowDeleteConfirm(true);
  };

  const handleBanClick = (user: UserProfile) => {
    setUserToAction(user);
    setShowBanConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToAction) return;
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userToAction.id);

      if (error) throw error;

      // Also delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(userToAction.id);
      if (authError) throw authError;

      toast.success(`User ${userToAction.email} has been deleted successfully`);
      fetchUsers();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Failed to delete user: ${error.message}`);
      } else {
        toast.error('Failed to delete user');
      }
    } finally {
      setShowDeleteConfirm(false);
      setUserToAction(null);
    }
  };

  const handleBanConfirm = async () => {
    if (!userToAction) return;
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !userToAction.is_active })
        .eq('id', userToAction.id);

      if (error) throw error;

      toast.success(`User ${userToAction.email} has been ${userToAction.is_active ? 'banned' : 'unbanned'} successfully`);
      fetchUsers();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Failed to update user status: ${error.message}`);
      } else {
        toast.error('Failed to update user status');
      }
    } finally {
      setShowBanConfirm(false);
      setUserToAction(null);
    }
  };

  // Add useEffect to auto-generate student ID when role is student
  useEffect(() => {
    const generateStudentIdOnRoleChange = async () => {
      if (form.role === 'student' && !form.student_id) {
        setIsGeneratingId(true);
        try {
          const newId = await generateStudentId();
          setForm(f => ({ ...f, student_id: newId }));
        } catch {
          toast.error('Failed to generate student ID');
        } finally {
          setIsGeneratingId(false);
        }
      }
    };

    generateStudentIdOnRoleChange();
  }, [form.role]); // Only run when role changes

  // Add validation for emergency contact fields
  const validateEmergencyName = (value: string): boolean => {
    // Allow letters, spaces, and common name characters
    return /^[a-zA-Z .'-]+$/.test(value);
  };

  const validateEmergencyRelationship = (value: string): boolean => {
    // Allow letters, spaces, and common relationship terms
    return /^[a-zA-Z .'-]+$/.test(value);
  };

  // Add handlers for emergency contact fields
  const handleEmergencyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || validateEmergencyName(value)) {
      setForm(f => ({ ...f, emergency_name: value }));
    }
  };

  const handleEmergencyRelationshipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || validateEmergencyRelationship(value)) {
      setForm(f => ({ ...f, emergency_relationship: value }));
    }
  };

  // Add function to handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdating(true);
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          first_name: editForm.first_name,
          middle_name: editForm.middle_name || null,
          last_name: editForm.last_name,
          suffix: editForm.suffix || null,
          role: editForm.role,
          gender: editForm.gender || null,
          birthdate: editForm.birthdate || null,
          phone: editForm.phone || null,
          address: editForm.address || null,
          program_id: editForm.program_id || null,
          student_id: editForm.student_id || null,
          year_level: editForm.year_level || null,
          student_type: editForm.student_type || null,
          enrollment_status: editForm.enrollment_status || null,
          section: editForm.section || null,
          school_year: editForm.school_year || null,
          semester: editForm.semester || null,
          emergency_contact_name: editForm.emergency_name || null,
          emergency_contact_relationship: editForm.emergency_relationship || null,
          emergency_contact_phone: editForm.emergency_phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      toast.success('User updated successfully!');
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Failed to update user: ${error.message}`);
      } else {
        toast.error('Failed to update user');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Add function to initialize edit form when editing user is set
  useEffect(() => {
    if (editingUser) {
      setEditForm({
        email: editingUser.email,
        role: editingUser.role,
        first_name: editingUser.first_name,
        middle_name: editingUser.middle_name || '',
        last_name: editingUser.last_name,
        suffix: editingUser.suffix || '',
        gender: editingUser.gender || '',
        birthdate: editingUser.birthdate || '',
        phone: editingUser.phone || '',
        address: editingUser.address || '',
        program_id: editingUser.program_id || '',
        student_id: editingUser.student_id || '',
        year_level: editingUser.year_level || '',
        student_type: editingUser.student_type || '',
        enrollment_status: editingUser.enrollment_status || '',
        section: editingUser.section || '',
        school_year: editingUser.school_year || '',
        semester: editingUser.semester || '',
        emergency_name: editingUser.emergency_contact_name || '',
        emergency_relationship: editingUser.emergency_contact_relationship || '',
        emergency_phone: editingUser.emergency_contact_phone || '',
      });
    }
  }, [editingUser]);

  // Add new state for active tab
  const [activeTab, setActiveTab] = useState<'all' | 'students'>('all');
  
  // Add filtered users based on active tab
  const filteredUsers = users.filter(user => 
    activeTab === 'all' ? true : user.role === 'student'
  );

  // Add sections array
  const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header Section - Enhanced with better spacing and shadow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">User Management</h2>
          <p className="text-gray-500 text-sm">Manage and organize all system users</p>
        </div>
        <button
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 w-full sm:w-auto"
          onClick={() => setShowModal(true)}
        >
          <UserPlus className="w-5 h-5" /> Add New User
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 bg-white rounded-2xl shadow-lg p-1 border border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'all'
                ? 'bg-blue-50 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>All Users</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                {users.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'students'
                ? 'bg-green-50 text-green-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>Students</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                {users.filter(u => u.role === 'student').length}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Table Section - Enhanced with better card layout */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
              <p className="text-gray-500 text-sm">Loading users...</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredUsers.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="text-center py-20 text-gray-500"
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-200">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-gray-700">
                  {activeTab === 'students' ? 'No students found' : 'No users found'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {activeTab === 'students' 
                    ? 'Add a new student to get started' 
                    : 'Add a new user to get started'}
                </p>
              </motion.div>
            ) : (
              <div className="overflow-x-auto">
                <motion.table 
                  key={activeTab}
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="min-w-full divide-y divide-gray-200"
                >
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User Information</th>
                      {activeTab === 'all' && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role & Status</th>
                      )}
                      {activeTab === 'students' && (
                        <>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Academic Info</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        </>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user: UserProfile) => (
                      <motion.tr 
                        key={user.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hover:bg-gray-50/50 transition-colors duration-200"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-lg ${
                              user.role === 'student' 
                                ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/20'
                                : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20'
                            }`}>
                              {user.first_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {[user.first_name, user.middle_name, user.last_name, user.suffix].filter(Boolean).join(' ')}
                              </div>
                              <div className="text-sm text-gray-500 mt-0.5">{user.email}</div>
                              {user.role === 'student' && (
                                <div className="text-xs text-gray-400 mt-1">ID: {user.student_id}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        {activeTab === 'all' && (
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold w-fit
                                ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                  user.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                                  user.role === 'student' ? 'bg-green-100 text-green-700' :
                                  user.role === 'registrar' ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-700'}`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold w-fit
                                ${user.is_active 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-red-100 text-red-700'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  user.is_active ? 'bg-emerald-500' : 'bg-red-500'
                                }`}></span>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                        )}
                        {activeTab === 'students' && user.role === 'student' && (
                          <>
                            <td className="px-6 py-5">
                              <div className="flex flex-col gap-1">
                                <div className="text-sm">
                                  <span className="text-gray-500">Program:</span>{' '}
                                  <span className="font-medium text-gray-900">
                                    {programs.find(p => p.id === user.program_id)?.name || 'N/A'}
                                  </span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-500">Year Level:</span>{' '}
                                  <span className="font-medium text-gray-900">{user.year_level || 'N/A'}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-500">Section:</span>{' '}
                                  <span className="font-medium text-gray-900">{user.section || 'N/A'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col gap-2">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold w-fit
                                  ${user.enrollment_status === 'Enrolled' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-yellow-100 text-yellow-700'}`}>
                                  {user.enrollment_status || 'N/A'}
                                </span>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold w-fit
                                  ${user.is_active 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-red-100 text-red-700'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    user.is_active ? 'bg-emerald-500' : 'bg-red-500'
                                  }`}></span>
                                  {user.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEditUser(user)} 
                              className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-all duration-200 hover:scale-110" 
                              title="Edit User"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(user)} 
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-all duration-200 hover:scale-110" 
                              title="Delete User"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleBanClick(user)} 
                              className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
                                user.is_active 
                                  ? 'hover:bg-yellow-50 text-yellow-600' 
                                  : 'hover:bg-green-50 text-green-600'
                              }`}
                              title={user.is_active ? 'Ban User' : 'Unban User'}
                            >
                              {user.is_active ? (
                                <Ban className="w-5 h-5" />
                              ) : (
                                <Undo2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </motion.table>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Create New User</h3>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => { setShowModal(false); setStep(0); }}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Progress Steps */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {steps.map((label, i) => (
                    <React.Fragment key={label}>
                      <div className={`flex items-center gap-2 min-w-fit ${i === step ? 'text-blue-600' : 'text-gray-400'}`}>
                        {i < step ? (
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          </div>
                        ) : (
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs
                            ${i === step ? 'border-blue-600 text-blue-600' : 'border-gray-300'}`}>
                            {i + 1}
                          </div>
                        )}
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className="w-8 h-0.5 bg-gray-200" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <form className="space-y-6" onSubmit={handleCreateUser}>
                  {/* Step 1: Account Info */}
                  {step === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="space-y-4">
                        <div className="flex flex-col items-center justify-center mb-8">
                          <div className="w-full max-w-md text-center">
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Role</label>
                            <select 
                              className="w-full border-2 border-blue-500 rounded-lg px-4 py-2.5 bg-blue-50 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm text-center" 
                              required 
                              value={form.role} 
                              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                            >
                              <option value="" className="text-center">Select Role</option>
                              <option value="student" className="text-center">Student</option>
                              <option value="admin" className="text-center">Admin</option>
                              <option value="teacher" className="text-center">Teacher</option>
                              <option value="registrar" className="text-center">Registrar</option>
                              <option value="program_head" className="text-center">Program Head</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              className={`w-full border rounded-lg px-3 py-2 mt-1 pr-24 ${
                                emailStatus === 'invalid' ? 'border-red-500 bg-red-50' :
                                emailStatus === 'valid' ? 'border-green-500 bg-green-50' :
                                emailStatus === 'checking' ? 'border-blue-500 bg-blue-50' :
                                'border-gray-300'
                              }`}
                              required 
                              value={form.email} 
                              onChange={e => {
                                // Remove any domain if user types it
                                const value = e.target.value.replace(/@.*$/, '');
                                setForm(f => ({ ...f, email: value }));
                                debouncedEmailCheck(value);
                              }}
                              placeholder="Enter email username"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 mt-1">
                              {emailStatus === 'checking' && (
                                <div className="flex items-center gap-1 text-blue-500 text-xs mr-2">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Checking...</span>
                                </div>
                              )}
                              {emailStatus === 'valid' && (
                                <div className="flex items-center gap-1 text-green-500 text-xs mr-2">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Available</span>
                                </div>
                              )}
                              {emailStatus === 'invalid' && (
                                <div className="flex items-center gap-1 text-red-500 text-xs mr-2">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Taken</span>
                                </div>
                              )}
                              <span className="text-gray-500 text-sm">@smcbi.edu.ph</span>
                            </div>
                          </div>
                          {emailStatus === 'invalid' && (
                            <p className="mt-1 text-xs text-red-500">
                              This email is already in use. Please choose a different username.
                            </p>
                          )}
                          {form.email && form.email.trim() !== '' && !/^[a-zA-Z0-9._-]+$/.test(form.email) && (
                            <p className="mt-1 text-xs text-red-500">
                              Email username can only contain letters, numbers, dots, underscores, and hyphens.
                              The domain @smcbi.edu.ph will be automatically added.
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-[1fr_1fr_1fr_80px] gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">First Name</label>
                            <input 
                              type="text" 
                              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                              required 
                              value={form.first_name} 
                              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                              style={{ 
                                fontSize: form.first_name.length > 15 ? '0.875rem' : '1rem',
                                lineHeight: '1.5'
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                            <input 
                              type="text" 
                              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                              value={form.middle_name} 
                              onChange={e => setForm(f => ({ ...f, middle_name: e.target.value }))}
                              style={{ 
                                fontSize: form.middle_name.length > 15 ? '0.875rem' : '1rem',
                                lineHeight: '1.5'
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Last Name</label>
                            <input 
                              type="text" 
                              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                              required 
                              value={form.last_name} 
                              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                              style={{ 
                                fontSize: form.last_name.length > 15 ? '0.875rem' : '1rem',
                                lineHeight: '1.5'
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Suffix</label>
                            <input 
                              type="text" 
                              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                              value={form.suffix} 
                              onChange={e => setForm(f => ({ ...f, suffix: e.target.value }))}
                              placeholder="e.g. Jr., Sr., III"
                              style={{ 
                                fontSize: form.suffix.length > 15 ? '0.875rem' : '1rem',
                                lineHeight: '1.5'
                              }}
                            />
                          </div>
                        </div>

                        {/* Show full name preview with tooltip */}
                        {(form.first_name || form.middle_name || form.last_name) && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="text-sm">
                              <span className="font-semibold text-blue-700">Full Name: </span>
                              <span className="text-blue-900 truncate cursor-help" 
                                title={`${form.first_name} ${form.middle_name} ${form.last_name} ${form.suffix}`.trim()}
                              >
                                {[form.first_name, form.middle_name, form.last_name, form.suffix].filter(Boolean).join(' ')}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Only show Program field for non-student roles, but exclude admin and registrar */}
                        {form.role !== 'student' && form.role !== 'admin' && form.role !== 'registrar' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Program</label>
                            <select 
                              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                              required
                              value={form.program_id} 
                              onChange={e => setForm(f => ({ ...f, program_id: e.target.value }))}
                            >
                              <option value="">Select a program</option>
                              {programs.map(program => (
                                <option key={program.id} value={program.id}>
                                  {program.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <div className="relative">
                              <input 
                                type={showPassword ? "text" : "password"}
                                className={`w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pr-10 ${
                                  areAllRequirementsMet() ? 'border-green-500' : ''
                                }`}
                                required 
                                value={form.password} 
                                onChange={e => {
                                  const value = e.target.value;
                                  setForm(f => ({ ...f, password: value }));
                                  validatePassword(value, form.confirmPassword);
                                  setShowRequirements(value.length === 0 || !areAllRequirementsMet());
                                }}
                                onFocus={() => {
                                  if (!areAllRequirementsMet()) {
                                    setShowRequirements(true);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                              >
                                {showPassword ? (
                                  <EyeOff className="w-5 h-5" />
                                ) : (
                                  <Eye className="w-5 h-5" />
                                )}
                              </button>
                              {areAllRequirementsMet() && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="absolute right-10 top-1/2 -translate-y-1/2 text-green-600"
                                >
                                  <Check className="w-5 h-5" />
                                </motion.div>
                              )}
                            </div>
                          </div>

                          {/* Password Requirements List with AnimatePresence */}
                          <AnimatePresence>
                            {showRequirements && !areAllRequirementsMet() && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-medium text-gray-700 mb-3">Password Requirements</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {passwordRequirements.map(({ key, text }) => (
                                      <motion.div
                                        key={key}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center gap-2"
                                      >
                                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-200 ${
                                          passwordValidation[key as keyof typeof passwordValidation]
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-gray-100 text-gray-400'
                                        }`}>
                                          {passwordValidation[key as keyof typeof passwordValidation] ? (
                                            <Check className="w-3 h-3" />
                                          ) : (
                                            <AlertCircle className="w-3 h-3" />
                                          )}
                                        </div>
                                        <span className={`text-sm transition-colors duration-200 ${
                                          passwordValidation[key as keyof typeof passwordValidation]
                                            ? 'text-green-600'
                                            : 'text-gray-500'
                                        }`}>
                                          {text}
                                        </span>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <div className="relative">
                              <input 
                                type={showConfirmPassword ? "text" : "password"}
                                className={`w-full border rounded-lg px-3 py-2 mt-1 transition-all duration-200 pr-10 ${
                                  form.confirmPassword
                                    ? passwordValidation.matches
                                      ? 'border-green-500 focus:ring-2 focus:ring-green-500 focus:border-green-500'
                                      : 'border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500'
                                    : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                }`}
                                required 
                                value={form.confirmPassword} 
                                onChange={e => {
                                  setForm(f => ({ ...f, confirmPassword: e.target.value }));
                                  validatePassword(form.password, e.target.value);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="w-5 h-5" />
                                ) : (
                                  <Eye className="w-5 h-5" />
                                )}
                              </button>
                              {form.confirmPassword && !passwordValidation.matches && (
                                <div className="mt-2 text-red-600 text-sm flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                  <span>Passwords do not match</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {/* Step 2: Basic Info (student) */}
                  {form.role === 'student' && step === 1 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <h4 className="text-lg font-semibold text-blue-700 mb-2">Basic Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Student ID Number</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              className="w-full border rounded px-3 py-2 mt-1 bg-gray-50" 
                              required 
                              value={form.student_id} 
                              readOnly 
                              placeholder={isGeneratingId ? "Generating ID..." : "Student ID will be generated automatically"}
                            />
                            {isGeneratingId && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Sex/Gender</label>
                          <select 
                            className="w-full border rounded px-3 py-2 mt-1" 
                            required 
                            value={form.gender} 
                            onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
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
                          <label className="block text-sm font-medium text-gray-700">Birthdate</label>
                          <input 
                            type="date" 
                            className="w-full border rounded px-3 py-2 mt-1" 
                            required 
                            value={form.birthdate} 
                            onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} 
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center mt-1 pointer-events-none">
                              <span className="text-gray-500">+63</span>
                            </div>
                            <input 
                              type="tel" 
                              className={`w-full border rounded px-3 py-2 mt-1 pl-12 ${
                                phoneError ? 'border-red-500' : 'border-gray-300'
                              }`}
                              required
                              value={form.phone}
                              onChange={handlePhoneChange}
                              placeholder="9XXXXXXXXX"
                              maxLength={11}
                              pattern="[0-9]*"
                              title="Please enter a valid Philippine mobile number (e.g., 9502376954)"
                            />
                          </div>
                          {phoneError && (
                            <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Home Address</label>
                          <input 
                            type="text" 
                            className="w-full border rounded px-3 py-2 mt-1" 
                            value={form.address} 
                            onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {/* Step 3: Academic Info (student) */}
                  {form.role === 'student' && step === 2 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <h4 className="text-lg font-semibold text-blue-700 mb-2">Academic Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Course/Program</label>
                          <select 
                            className="w-full border rounded px-3 py-2 mt-1" 
                            required
                            value={form.course} 
                            onChange={e => {
                              const selectedProgram = programs.find(p => p.name === e.target.value);
                              setForm(f => ({ 
                                ...f, 
                                course: e.target.value,
                                program_id: selectedProgram?.id ? String(selectedProgram.id) : ''
                              }));
                            }}
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
                          <label className="block text-sm font-medium text-gray-700">Year Level</label>
                          <select 
                            className="w-full border rounded px-3 py-2 mt-1" 
                            required
                            value={form.year_level} 
                            onChange={e => setForm(f => ({ ...f, year_level: e.target.value }))}
                          >
                            <option value="">Select Year</option>
                            {yearLevels.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Student Type</label>
                          <select className="w-full border rounded px-3 py-2 mt-1" value={form.student_type} onChange={e => setForm(f => ({ ...f, student_type: e.target.value }))}>
                            <option value="">Select Type</option>
                            {studentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Enrollment Status</label>
                          <select className="w-full border rounded px-3 py-2 mt-1" value={form.enrollment_status} onChange={e => setForm(f => ({ ...f, enrollment_status: e.target.value }))}>
                            <option value="">Select Status</option>
                            {enrollmentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Section</label>
                          <input type="text" className="w-full border rounded px-3 py-2 mt-1" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">School Year</label>
                          <input type="text" className="w-full border rounded px-3 py-2 mt-1" placeholder="e.g. 2025-2026" value={form.school_year} onChange={e => setForm(f => ({ ...f, school_year: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Semester</label>
                          <select className="w-full border rounded px-3 py-2 mt-1" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}>
                            <option value="">Select Semester</option>
                            {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {/* Step 4: Emergency Contact (student) */}
                  {form.role === 'student' && step === 3 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <h4 className="text-lg font-semibold text-blue-700 mb-2">Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                          <input 
                            type="text" 
                            className="w-full border rounded px-3 py-2 mt-1" 
                            required
                            value={form.emergency_name} 
                            onChange={handleEmergencyNameChange}
                            placeholder="Enter full name"
                            pattern="[a-zA-Z .'-]+"
                            title="Please enter a valid name (letters, spaces, dots, apostrophes, and hyphens only)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Relationship</label>
                          <input 
                            type="text" 
                            className="w-full border rounded px-3 py-2 mt-1" 
                            required
                            value={form.emergency_relationship} 
                            onChange={handleEmergencyRelationshipChange}
                            placeholder="e.g., Parent, Sibling, Guardian"
                            pattern="[a-zA-Z .'-]+"
                            title="Please enter a valid relationship (letters, spaces, dots, apostrophes, and hyphens only)"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center mt-1 pointer-events-none">
                              <span className="text-gray-500">+63</span>
                            </div>
                            <input 
                              type="tel" 
                              className={`w-full border rounded px-3 py-2 mt-1 pl-12 ${
                                emergencyPhoneError ? 'border-red-500' : 'border-gray-300'
                              }`}
                              required
                              value={form.emergency_phone} 
                              onChange={handleEmergencyPhoneChange}
                              placeholder="9XXXXXXXXX"
                              maxLength={11}
                              pattern="[0-9]*"
                              title="Please enter a valid Philippine mobile number (e.g., 9502376954)"
                            />
                          </div>
                          {emergencyPhoneError && (
                            <p className="text-red-500 text-xs mt-1">{emergencyPhoneError}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {/* Step 5: Review & Submit */}
                  {((form.role === 'student' && step === 4) || (form.role !== 'student' && step === 1)) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <h4 className="text-lg font-semibold text-blue-700 mb-2">Review Information</h4>
                      <div className="space-y-2 text-sm">
                         <div><b>Name:</b> {`${form.first_name} ${form.middle_name ? form.middle_name + ' ' : ''}${form.last_name}${form.suffix ? ' ' + form.suffix : ''}`}</div>
                        <div><b>Email:</b> {form.email}@smcbi.edu.ph</div>
                        <div><b>Program:</b> {programs.find(p => p.id === Number(form.program_id))?.name || 'N/A'}</div>
                        <div><b>Role:</b> {form.role}</div>
                     
                        {form.role === 'student' && <>
                          <div><b>Student ID:</b> {form.student_id}</div>
                          <div><b>Gender:</b> {form.gender}</div>
                          <div><b>Birthdate:</b> {form.birthdate}</div>
                          <div><b>Phone:</b> {form.phone}</div>
                          <div><b>Address:</b> {form.address}</div>
                          <div><b>Course:</b> {form.course}</div>
                          <div><b>Year Level:</b> {form.year_level}</div>
                          <div><b>Student Type:</b> {form.student_type}</div>
                          <div><b>Enrollment Status:</b> {form.enrollment_status}</div>
                          <div><b>Section:</b> {form.section}</div>
                          <div><b>School Year:</b> {form.school_year}</div>
                          <div><b>Semester:</b> {form.semester}</div>
                          <div><b>Emergency Contact:</b> {form.emergency_name} ({form.emergency_relationship}) - {form.emergency_phone}</div>
                        </>}
                      </div>
                    </motion.div>
                  )}
                  {/* Navigation Buttons */}
                  <div className="flex justify-between gap-4 pt-4 border-t border-gray-200">
                    {step > 0 && (
                      <button 
                        type="button" 
                        className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
                        onClick={() => setStep(s => s - 1)}
                      >
                        <ChevronLeft className="w-5 h-5" />
                        Back
                      </button>
                    )}
                    {((form.role === 'student' && step < 4) || (form.role !== 'student' && step < 1)) && (
                      <button 
                        type="button" 
                        className="ml-auto px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!canProceed()}
                        onClick={() => setStep(s => s + 1)}
                      >
                        Next
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                    {(((form.role === 'student' && step === 4) || (form.role !== 'student' && step === 1))) && (
                      <button 
                        type="submit" 
                        className="w-full sm:w-auto ml-auto px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                        disabled={creating}
                      >
                        {creating ? (
                          <>
                            <Loader2 className="animate-spin w-5 h-5" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-5 h-5" />
                            Create User
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && userToAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Deletion</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete {userToAction.email}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToAction(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete User
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ban/Unban Confirmation Modal */}
      <AnimatePresence>
        {showBanConfirm && userToAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm {userToAction.is_active ? 'Ban' : 'Unban'}
              </h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to {userToAction.is_active ? 'ban' : 'unban'} {userToAction.email}?
                {userToAction.is_active 
                  ? ' This will prevent the user from accessing the system.'
                  : ' This will restore the user\'s access to the system.'}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowBanConfirm(false);
                    setUserToAction(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBanConfirm}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    userToAction.is_active 
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {userToAction.is_active ? 'Ban User' : 'Unban User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Edit User</h3>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleEditSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 mt-1 bg-gray-50"
                        value={editForm.email}
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <select
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        value={editForm.role}
                        onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                        required
                      >
                        <option value="">Select Role</option>
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                        <option value="teacher">Teacher</option>
                        <option value="registrar">Registrar</option>
                        <option value="program_head">Program Head</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name</label>
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        value={editForm.first_name}
                        onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        value={editForm.middle_name}
                        onChange={e => setEditForm(f => ({ ...f, middle_name: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        value={editForm.last_name}
                        onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Suffix</label>
                      <input
                        type="text"
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        value={editForm.suffix}
                        onChange={e => setEditForm(f => ({ ...f, suffix: e.target.value }))}
                        placeholder="e.g. Jr., Sr., III"
                      />
                    </div>

                    {editForm.role === 'student' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Student ID</label>
                          <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.student_id}
                            onChange={e => setEditForm(f => ({ ...f, student_id: e.target.value }))}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Gender</label>
                          <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.gender}
                            onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
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
                          <label className="block text-sm font-medium text-gray-700">Birthdate</label>
                          <input
                            type="date"
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.birthdate}
                            onChange={e => setEditForm(f => ({ ...f, birthdate: e.target.value }))}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                          <input
                            type="tel"
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.phone}
                            onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Address</label>
                          <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.address}
                            onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Program</label>
                          <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.program_id}
                            onChange={e => setEditForm(f => ({ ...f, program_id: e.target.value }))}
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
                          <label className="block text-sm font-medium text-gray-700">Year Level</label>
                          <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.year_level}
                            onChange={e => setEditForm(f => ({ ...f, year_level: e.target.value }))}
                            required
                          >
                            <option value="">Select Year</option>
                            {yearLevels.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Student Type</label>
                          <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.student_type}
                            onChange={e => setEditForm(f => ({ ...f, student_type: e.target.value }))}
                            required
                          >
                            <option value="">Select Type</option>
                            {studentTypes.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Enrollment Status</label>
                          <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.enrollment_status}
                            onChange={e => setEditForm(f => ({ ...f, enrollment_status: e.target.value }))}
                            required
                          >
                            <option value="">Select Status</option>
                            {enrollmentStatuses.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Section</label>
                          <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.section}
                            onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">School Year</label>
                          <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.school_year}
                            onChange={e => setEditForm(f => ({ ...f, school_year: e.target.value }))}
                            placeholder="e.g. 2025-2026"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Semester</label>
                          <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.semester}
                            onChange={e => setEditForm(f => ({ ...f, semester: e.target.value }))}
                          >
                            <option value="">Select Semester</option>
                            {semesters.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <h4 className="text-lg font-semibold text-blue-700 mb-2">Emergency Contact</h4>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                          <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.emergency_name}
                            onChange={e => setEditForm(f => ({ ...f, emergency_name: e.target.value }))}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Relationship</label>
                          <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.emergency_relationship}
                            onChange={e => setEditForm(f => ({ ...f, emergency_relationship: e.target.value }))}
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Emergency Phone</label>
                          <input
                            type="tel"
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={editForm.emergency_phone}
                            onChange={e => setEditForm(f => ({ ...f, emergency_phone: e.target.value }))}
                            required
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingUser(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Update User
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}