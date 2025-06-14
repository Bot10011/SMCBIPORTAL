import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import UserActions from '../components/UserActions';

interface Program {
  id: number;
  code: string;
  name: string;
  description?: string;
  department?: string;
}

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
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add back the search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'students' | 'teachers'>('all');
  
  // Add modal state
  const { setShowCreateUserModal, setShowEditUserModal, setShowMessageModal, setSelectedUserId } = useModal();
  
  // Add filtered users logic
  const filteredUsers = users.filter(user => {
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'students' ? user.role === 'student' :
      activeTab === 'teachers' ? user.role === 'teacher' : true;
    
    const matchesSearch = searchTerm === '' || 
      [user.first_name, user.middle_name, user.last_name, user.suffix]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

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
  const fetchTeacherSubjects = async (teacherId: string) => {
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
  };

  // Add useEffect to fetch teacher subjects when viewing teachers
  useEffect(() => {
    if (activeTab === 'teachers') {
      const teachers = users.filter(user => user.role === 'teacher');
      teachers.forEach(teacher => {
        if (!teacherSubjects[teacher.id]) {
          fetchTeacherSubjects(teacher.id);
        }
      });
    }
  }, [activeTab, users]);

  const handleEditUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowEditUserModal(true);
  };

  const handleMessageUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowMessageModal(true);
  };

  return (
    <div className="container mx-auto p-6">
      {/* User Management Header with inner shadow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl shadow-inner border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">User Management</h2>
          <p className="text-gray-500 text-sm">Manage and organize all system users</p>
        </div>
        <button
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 w-full sm:w-auto"
          onClick={() => setShowCreateUserModal(true)}
        >
          <UserPlus className="w-5 h-5" /> Add New User
        </button>
      </div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users by full name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-10 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tabs */}
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
          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'teachers'
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span>Teachers</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                {users.filter(u => u.role === 'teacher').length}
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
                      {activeTab === 'teachers' && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Department & Subjects</th>
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
                                    {programs.find(p => p.id.toString() === user.program_id?.toString())?.name || 'N/A'}
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
                        {activeTab === 'teachers' && user.role === 'teacher' && (
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <div className="text-xs mb-1">
                                <span className="text-gray-500">Department:</span>{' '}
                                <span className="font-semibold text-gray-900">{user.department || 'N/A'}</span>
                              </div>
                              <div className="text-xs">
                                <span className="text-gray-500">Assigned Subjects:</span>
                                {teacherSubjects[user.id] && teacherSubjects[user.id].length > 0 ? (
                                  <div className="mt-0.5 space-y-0.5">
                                    {teacherSubjects[user.id].map((subject) => (
                                      <div
                                        key={subject.id}
                                        className="flex flex-col gap-0.5 text-[11px] bg-gray-100 rounded mb-0.5 shadow-inner border border-gray-200"
                                        style={{ padding: '4px 8px', lineHeight: 1.15 }}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-gray-900">{subject.courses?.code}</span>
                                          <span className="text-gray-500">-</span>
                                          <span className="text-gray-700 truncate max-w-[80px]">{subject.courses?.name}</span>
                                          <span className="text-gray-400">({subject.courses?.units}u)</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
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
                        <td className="px-6 py-5">
                          <UserActions
                            user={user}
                            onEdit={handleEditUser}
                            onMessage={handleMessageUser}
                            onUserUpdate={fetchUsers}
                          />
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
    </div>
  );
}
