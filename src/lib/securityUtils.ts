import { supabase } from './supabase';

// Application-level security utilities
// Use these functions to check permissions before making database calls

export interface UserProfile {
  id: string;
  email: string;
  role: 'teacher' | 'student' | 'registrar' | 'program_head' | 'admin' | 'superadmin';
  first_name: string;
  last_name: string;
  is_active: boolean;
  // ... other fields
}

/**
 * Get current user's profile
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
};

/**
 * Check if current user can view a specific profile
 */
export const canViewProfile = async (targetUserId: string): Promise<boolean> => {
  const currentUser = await getCurrentUserProfile();
  if (!currentUser) return false;

  // Users can always view their own profile
  if (currentUser.id === targetUserId) return true;

  // Admins can view all profiles
  if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;

  // Teachers can view their students' profiles
  if (currentUser.role === 'teacher') {
    // Add logic to check if target user is a student in teacher's courses
    // This would require checking enrollments table
    return false; // Implement based on your course structure
  }

  // Program heads can view students in their program
  if (currentUser.role === 'program_head') {
    // Add logic to check if target user is in the same program
    return false; // Implement based on your program structure
  }

  return false;
};

/**
 * Check if current user can update a specific profile
 */
export const canUpdateProfile = async (targetUserId: string): Promise<boolean> => {
  const currentUser = await getCurrentUserProfile();
  if (!currentUser) return false;

  // Users can always update their own profile
  if (currentUser.id === targetUserId) return true;

  // Admins can update all profiles
  if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;

  return false;
};

/**
 * Check if current user can create new users
 */
export const canCreateUsers = async (): Promise<boolean> => {
  const currentUser = await getCurrentUserProfile();
  if (!currentUser) return false;

  // Only admins and superadmins can create users
  return currentUser.role === 'admin' || currentUser.role === 'superadmin';
};

/**
 * Check if current user can delete users
 */
export const canDeleteUsers = async (): Promise<boolean> => {
  const currentUser = await getCurrentUserProfile();
  if (!currentUser) return false;

  // Only superadmins can delete users
  return currentUser.role === 'superadmin';
};

/**
 * Get profiles based on user's role and permissions
 */
export const getProfilesByRole = async (): Promise<UserProfile[]> => {
  const currentUser = await getCurrentUserProfile();
  if (!currentUser) return [];

  // Admins and superadmins can see all profiles
  if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
    const { data } = await supabase.from('user_profiles').select('*');
    return data || [];
  }

  // Other roles see limited data
  if (currentUser.role === 'teacher') {
    // Teachers see students in their courses
    // This would require joining with enrollments/courses table
    const { data } = await supabase.from('user_profiles').select('*').eq('role', 'student');
    return data || [];
  }

  if (currentUser.role === 'program_head') {
    // Program heads see students in their program
    const { data } = await supabase.from('user_profiles').select('*').eq('role', 'student');
    return data || [];
  }

  // Regular users only see their own profile
  const { data } = await supabase.from('user_profiles').select('*').eq('id', currentUser.id);
  return data || [];
};

/**
 * Secure wrapper for database operations
 */
export const secureQuery = async <T>(
  operation: () => Promise<{ data: T | null; error: unknown }>,
  permissionCheck: () => Promise<boolean>
): Promise<{ data: T | null; error: unknown }> => {
  const hasPermission = await permissionCheck();
  if (!hasPermission) {
    return {
      data: null,
      error: { message: 'Access denied' }
    };
  }

  return operation();
}; 