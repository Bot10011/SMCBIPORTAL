import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, Edit, Trash2, Power } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
// import { useModal } from '../contexts/ModalContext';
import { useModal } from '../contexts/ModalContext';
import ConfirmationDialog from '../components/ConfirmationDialog';
import CreateUserModal from '../components/CreateUserModal';

import { createPortal } from 'react-dom';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  is_active: boolean;
  student_id?: string;
  program_id?: string;
  year_level?: string;
  section?: string;
  enrollment_status?: string;
  department?: string;
  profile_picture_url?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilePictureUrls, setProfilePictureUrls] = useState<Record<string, string | null>>({});
  const { user: currentUser } = useAuth();
  
  // Add back the search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'students' | 'instructors' | 'registrars' | 'program_heads'>('all');
  
  // Add modal state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  
  // Add confirmation dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState<UserProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { setShowEditUserModal, setSelectedUserId } = useModal();
  
  // Memoized filtered users logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'students' ? user.role === 'student' :
        activeTab === 'instructors' ? user.role === 'instructor' :
        activeTab === 'registrars' ? user.role === 'registrar' :
        activeTab === 'program_heads' ? user.role === 'program_head' : true;
      
      const matchesSearch = searchTerm === '' || 
        [user.first_name, user.middle_name, user.last_name, user.suffix]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      
      return matchesTab && matchesSearch;
    });
  }, [users, activeTab, searchTerm]);

  // Memoized user statistics
  const userStats = useMemo(() => {
    const students = users.filter(u => u.role === 'student');
    const instructors = users.filter(u => u.role === 'instructor');
    const admins = users.filter(u => u.role === 'admin');
    const registrars = users.filter(u => u.role === 'registrar');
    const program_heads = users.filter(u => u.role === 'program_head');
    
    return {
      total: users.length,
      students: students.length,
      instructors: instructors.length,
      admins: admins.length,
      registrars: registrars.length,
      program_heads: program_heads.length,
      active: users.filter(u => u.is_active).length,
      inactive: users.filter(u => !u.is_active).length
    };
  }, [users]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('user_profiles')
        .select('*')
        .neq('role', 'superadmin') // Exclude superadmin users
        .order('created_at', { ascending: false });

      if (currentUser?.id) {
        query = query.neq('id', currentUser.id); // Exclude the currently logged-in user
      }

      const { data: users, error } = await query;

      if (error) throw error;
      const sanitized = (users || []).filter(u => (currentUser?.id ? u.id !== currentUser.id : true));
      setUsers(sanitized);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Resolve signed URLs for user profile pictures
  useEffect(() => {
    let isCancelled = false;
    const loadProfilePictures = async () => {
      const usersWithPics = users.filter(u => !!u.profile_picture_url);
      if (usersWithPics.length === 0) return;

      const entries = await Promise.all(
        usersWithPics.map(async (u) => {
          try {
            const { data: signedUrlData, error } = await supabase
              .storage
              .from('avatar')
              .createSignedUrl(u.profile_picture_url as string, 60 * 60);
            if (error) return [u.id, null] as const;
            return [u.id, signedUrlData?.signedUrl ?? null] as const;
          } catch {
            return [u.id, null] as const;
          }
        })
      );

      if (!isCancelled) {
        setProfilePictureUrls((prev) => {
          const next = { ...prev } as Record<string, string | null>;
          entries.forEach(([userId, url]) => {
            next[userId] = url;
          });
          return next;
        });
      }
    };

    loadProfilePictures();
    return () => { isCancelled = true; };
  }, [users]);

  // Add TeacherSubject interface
  interface TeacherSubject {
    id: string;
    section: string;
    academic_year: string;
    semester: string;
    subject_id: string;
    is_active: boolean;
    courses: {
      id: string;
      code: string;
      name: string;
      units: number;
    } | null;
  }

  // Update the state type with proper interface
  const [teacherSubjects, setTeacherSubjects] = useState<Record<string, TeacherSubject[]>>({});

  // Add back the fetchTeacherSubjects function
  const fetchTeacherSubjects = useCallback(async (teacherId: string) => {
    try {
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select(`
          id,
          section,
          academic_year,
          semester,
          subject_id,
          is_active,
          courses (
            id,
            code,
            name,
            units
          )
        `)
        .eq('teacher_id', teacherId)
        .eq('is_active', true);

      if (error) throw error;
      if (data) {
        setTeacherSubjects(prev => ({
          ...prev,
          [teacherId]: (data as unknown[]).map(itemRaw => {
            const item = itemRaw as Record<string, unknown>;
            return {
              ...item,
              courses: Array.isArray(item.courses) ? (item.courses[0] ?? null) : (item.courses ?? null),
            };
          }) as TeacherSubject[],
        }));
      }
    } catch (error) {
      console.error('Error fetching teacher subjects:', error);
      toast.error('Failed to load teacher subjects');
    }
  }, []);

  // Add useEffect to fetch teacher subjects when viewing teachers
  useEffect(() => {
    if (activeTab === 'instructors') {
      const instructors = users.filter(user => user.role === 'instructor');
      instructors.forEach(instructor => {
        if (!teacherSubjects[instructor.id]) {
          fetchTeacherSubjects(instructor.id);
        }
      });
    }
  }, [activeTab, users, fetchTeacherSubjects, teacherSubjects]);

  // Action functions

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUserForAction(user);
    setShowDeleteConfirm(true);
  };

  const handleToggleUserStatus = (user: UserProfile) => {
    setSelectedUserForAction(user);
    setShowToggleConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUserForAction) return;

    try {
      setActionLoading(true);
      try {
        await fetch('/api/delete-auth-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedUserForAction.id })
        });
      } catch (e) {
        console.warn('Auth user delete API failed:', e);
      }
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', selectedUserForAction.id);

      if (error) throw error;

      toast.success('User deleted successfully');
      setUsers(users.filter(u => u.id !== selectedUserForAction.id));
      setShowDeleteConfirm(false);
      setSelectedUserForAction(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmToggleUserStatus = async () => {
    if (!selectedUserForAction) return;

    try {
      setActionLoading(true);
      const newStatus = !selectedUserForAction.is_active;
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: newStatus })
        .eq('id', selectedUserForAction.id);

      if (error) throw error;

      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
      setUsers(users.map(u => 
        u.id === selectedUserForAction.id 
          ? { ...u, is_active: newStatus }
          : u
      ));
      setShowToggleConfirm(false);
      setSelectedUserForAction(null);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUserCreated = () => {
    fetchUsers();
    setShowCreateUserModal(false);
  };

  return (
    <div className="min-h-screen from-blue-50 via-white to-indigo-50 w-full">
      <div className="w-full px-6 py-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="usermanagement-header mb-8"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users w-6 h-6 text-white">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="m22 21-2-2"></path>
                    <path d="M16 16h6"></path>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
                  <p className="text-white/80 text-sm font-medium">Manage and organize all system users efficiently</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/80"></div>
                </div>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateUserModal(true)}
                  className="usermanagement-add-button bg-white/20 backdrop-blur-sm text-white px-6 py-2 rounded-lg hover:bg-white/30 transition-all duration-300 font-semibold flex items-center gap-2 border border-white/30"
                >
                  <UserPlus className="w-4 h-4" />
                  Add New User
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>


        

        {/* Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="usermanagement-tabs mb-6"
        >
          <div className="bg-[#252728] rounded-2xl shadow-lg p-2 border border-gray-700 max-w-full">
            <div className="flex items-center gap-2 md:gap-3 flex-nowrap overflow-x-auto whitespace-nowrap pr-1">
          <div className="flex-1 min-w-[8rem] sm:min-w-[10rem] md:min-w-[14rem] lg:min-w-[16rem] xl:min-w-[20rem] max-w-[28rem]">
            <div className="relative overflow-hidden rounded-xl bg-[#252728] border border-gray-600 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset transition-all duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Search users by full name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-[#1c1c1d] rounded-xl outline-none transition-all duration-200 text-xs sm:text-sm placeholder-gray-400 text-white border-0 focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-none shrink-0 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 md:ml-2 ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-white hover:bg-[#2f3133]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>All Users</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white hidden xl:inline-flex">
                {userStats.total}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-none shrink-0 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 ${
              activeTab === 'students'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-white hover:bg-[#2f3133]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>Students</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white hidden xl:inline-flex">
                {userStats.students}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('instructors')}
            className={`flex-none shrink-0 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 ${
              activeTab === 'instructors'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-indigo-600 hover:bg-[#2f3133]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>Instructor</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white hidden xl:inline-flex">
                {userStats.instructors}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('registrars')}
            className={`flex-none shrink-0 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 ${
              activeTab === 'registrars'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-orange-400 hover:bg-[#2f3133]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>Registrars</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white hidden xl:inline-flex">
                {userStats.registrars}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('program_heads')}
            className={`flex-none shrink-0 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 ${
              activeTab === 'program_heads'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-400 hover:bg-[#2f3133]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>Program Heads</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white hidden xl:inline-flex">
                {userStats.program_heads}
              </span>
            </div>
          </button>
            </div>
          </div>
        </motion.div>

        {/* Table Section - Enhanced with better card layout */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="usermanagement-table w-full"
        >
      <div className="bg-[#252728] rounded-2xl shadow-lg overflow-hidden border border-gray-700 w-full">
        {loading ? (
          <div className="usermanagement-skeleton">
            {/* Header Skeleton */}
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
            </div>
            
            {/* Search Bar Skeleton */}
            <div className="bg-[#252728] rounded-2xl p-6 shadow-lg border border-gray-700 mb-8 animate-pulse">
              <div className="h-12 bg-gray-200 rounded-xl w-full"></div>
            </div>
            
            {/* Tabs Skeleton */}
            <div className="mb-6 animate-pulse">
              <div className="bg-[#252728] rounded-2xl shadow-lg p-1 border border-gray-700">
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex-1 h-12 bg-gray-200 rounded-xl"></div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Table Skeleton */}
            <div className="bg-[#252728] rounded-2xl shadow-lg overflow-hidden border border-gray-700">
              <div className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-48"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                <div className="w-20 h-20 mx-auto mb-4 bg-[#2f3133] rounded-full flex items-center justify-center border-2 border-dashed border-gray-600">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium text-white">
                  {activeTab === 'students' ? 'No students found' : 'No users found'}
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  {activeTab === 'students' 
                    ? 'Add a new student to get started' 
                    : 'Add a new user to get started'}
                </p>
              </motion.div>
            ) : (
              <div className="overflow-x-auto w-full">
                <motion.table 
                  key={activeTab}
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="w-full divide-y divide-gray-200"
                >
                  <thead className="bg-[#2f3133]">
                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">User Information</th>
                  {activeTab === 'all' && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Role & Status</th>
                  )}
                  {activeTab === 'students' && (
                    <>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Academic Info</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                    </>
                  )}
                  {activeTab === 'instructors' && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Department & Subjects</th>
                  )}
                  {activeTab === 'registrars' && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                  )}
                  {activeTab === 'program_heads' && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Department & Status</th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#252728] divide-y divide-gray-700">
                    {filteredUsers.map((user: UserProfile) => (
                      <motion.tr 
                        key={user.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hover:bg-[#2f3133]/50 transition-colors duration-200"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full overflow-hidden shadow-lg flex items-center justify-center">
                              {profilePictureUrls[user.id] ? (
                                <img
                                  src={profilePictureUrls[user.id] as string}
                                  alt={`${[user.first_name, user.last_name].filter(Boolean).join(' ')} profile`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center text-white font-semibold text-lg ${
                                  user.role === 'student' 
                                    ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-green-500/20'
                                    : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20'
                                }`}>
                                  {user.first_name?.charAt(0).toUpperCase() || (user.email?.[0]?.toUpperCase() ?? '?')}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white">
                                {[user.first_name, user.middle_name, user.last_name, user.suffix].filter(Boolean).join(' ')}
                              </div>
                              <div className="text-sm text-gray-300 mt-0.5">{user.email}</div>
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
                                  user.role === 'instructor' ? 'bg-blue-100 text-blue-700' :
                                  user.role === 'student' ? 'bg-green-100 text-green-700' :
                                  user.role === 'registrar' ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-700'}`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            </div>
                          </td>
                        )}
                        {activeTab === 'students' && user.role === 'student' && (
                          <>
                            <td className="px-6 py-5">
                              <div className="flex flex-col gap-1">
                                <div className="text-sm">
                                  <span className="text-gray-400">Program:</span>{' '}
                                  <span className="font-medium text-white">
                                    {user.department ? `${user.department} ${user.year_level || 'N/A'}-${user.section || 'N/A'}` : 'N/A'}
                                  </span>
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
                        {activeTab === 'instructors' && user.role === 'instructor' && (
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <div className="text-xs mb-1">
                                <span className="text-gray-400">Department:</span>{' '}
                                <span className="font-semibold text-white">{user.department || 'N/A'}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-gray-400">Assigned Subjects:</span>
                                {teacherSubjects[user.id] && teacherSubjects[user.id].length > 0 ? (
                                  <div className="mt-0.5 space-y-0.5">
                                    {teacherSubjects[user.id].map((subject) => (
                                                                              <div
                                          key={subject.id}
                                          className="flex flex-col gap-0.5 text-[11px] bg-[#2f3133] rounded mb-0.5 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.08)] border border-gray-600"
                                          style={{ padding: '4px 8px', lineHeight: 1.15 }}
                                        >
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-white">{subject.courses?.code}</span>
                                          <span className="text-gray-400">-</span>
                                          <span className="text-gray-300 truncate max-w-[80px]">{subject.courses?.name}</span>
                                          <span className="text-gray-400">({subject.courses?.units}u)</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                          <span>Sec: {subject.section}</span>
                                          <span>•</span>
                                          <span>{subject.academic_year}</span>
                                          <span>•</span>
                                          <span>{subject.semester}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 ml-1">No subjects assigned</span>
                                )}
                              </div>
                            </div>
                          </td>
                        )}
                        {activeTab === 'registrars' && user.role === 'registrar' && (
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold w-fit ${
                                user.is_active 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  user.is_active ? 'bg-emerald-500' : 'bg-red-500'
                                }`}></span>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                        )}
                        {activeTab === 'program_heads' && user.role === 'program_head' && (
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <div className="text-sm">
                                <span className="text-gray-400">Department:</span>{' '}
                                <span className="font-medium text-white">{user.department || 'N/A'}</span>
                              </div>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold w-fit ${
                                user.is_active 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  user.is_active ? 'bg-emerald-500' : 'bg-red-500'
                                }`}></span>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="usermanagement-action-button p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Edit user"
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setShowEditUserModal(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleToggleUserStatus(user)}
                              className={`usermanagement-action-button p-2 rounded-lg transition-colors duration-200 ${
                                user.is_active 
                                  ? 'text-orange-600 hover:bg-orange-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={user.is_active ? 'Deactivate user' : 'Activate user'}
                            >
                              <Power className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDeleteUser(user)}
                              className="usermanagement-action-button p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
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
        </motion.div>


        {showDeleteConfirm && createPortal(
          <ConfirmationDialog
            isOpen={showDeleteConfirm}
            onClose={() => {
              setShowDeleteConfirm(false);
              setSelectedUserForAction(null);
            }}
            onConfirm={confirmDeleteUser}
            title="Delete User"
            message={`Are you sure you want to delete ${selectedUserForAction ? [selectedUserForAction.first_name, selectedUserForAction.middle_name, selectedUserForAction.last_name].filter(Boolean).join(' ') : 'this user'}? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            type="danger"
            isLoading={actionLoading}
          />,
          document.body
        )}

        {showToggleConfirm && createPortal(
          <ConfirmationDialog
            isOpen={showToggleConfirm}
            onClose={() => {
              setShowToggleConfirm(false);
              setSelectedUserForAction(null);
            }}
            onConfirm={confirmToggleUserStatus}
            title={selectedUserForAction?.is_active ? "Deactivate User" : "Activate User"}
            message={`Are you sure you want to ${selectedUserForAction?.is_active ? 'deactivate' : 'activate'} ${selectedUserForAction ? [selectedUserForAction.first_name, selectedUserForAction.middle_name, selectedUserForAction.last_name].filter(Boolean).join(' ') : 'this user'}?`}
            confirmText={selectedUserForAction?.is_active ? "Deactivate" : "Activate"}
            cancelText="Cancel"
            type="warning"
            isLoading={actionLoading}
          />,
          document.body
        )}

        <CreateUserModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          onUserCreated={handleUserCreated}
        />
      </div>
    </div>
  );
}
