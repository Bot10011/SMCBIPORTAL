import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { UserPlus, Lock, CheckCircle, XCircle, Search, Loader2, UserX, UserCheck } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';

const DEFAULT_AVATAR = '/img/user-avatar.png';

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  year_level?: string;
  section?: string;
  department?: string;
  is_active: boolean;
  enrollment_status?: string;
  profile_picture_url?: string;
  password_changed?: boolean;
}

const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const statuses = ['pending', 'enrolled', 'active', 'approved', 'returned', 'dropped'];

const UserManagement: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [resetModal, setResetModal] = useState<{ open: boolean; student: StudentProfile | null }>({ open: false, student: null });
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [profilePicUrls, setProfilePicUrls] = useState<Record<string, string>>({});
  const [resetEmailLoading, setResetEmailLoading] = useState(false);

  // Fetch all students
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });
      if (error) {
        toast.error('Failed to load students');
        setLoading(false);
        return;
      }
      setStudents(data || []);
      setLoading(false);
    };
    fetchStudents();
  }, []);

  // Fetch signed URLs for profile pictures
  useEffect(() => {
    const fetchProfilePics = async () => {
      const urlMap: Record<string, string> = {};
      await Promise.all(
        students.map(async (student) => {
          if (student.profile_picture_url) {
            try {
              const { data, error } = await supabase.storage
                .from('avatar')
                .createSignedUrl(student.profile_picture_url, 60 * 60);
              if (!error && data?.signedUrl) {
                urlMap[student.id] = data.signedUrl;
              } else {
                urlMap[student.id] = DEFAULT_AVATAR;
              }
            } catch {
              urlMap[student.id] = DEFAULT_AVATAR;
            }
          } else {
            urlMap[student.id] = DEFAULT_AVATAR;
          }
        })
      );
      setProfilePicUrls(urlMap);
    };
    if (students.length > 0) fetchProfilePics();
  }, [students]);

  // Unique sections and departments for filters
  const sectionOptions = useMemo(() => Array.from(new Set(students.map(s => s.section).filter(Boolean))), [students]);
  const deptOptions = useMemo(() => Array.from(new Set(students.map(s => s.department).filter(Boolean))), [students]);

  // Filtering logic
  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchesSearch =
        !search ||
        s.first_name.toLowerCase().includes(search.toLowerCase()) ||
        s.last_name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      const matchesYear = !filterYear || s.year_level === filterYear;
      const matchesSection = !filterSection || s.section === filterSection;
      const matchesStatus = !filterStatus || s.enrollment_status === filterStatus;
      const matchesDept = !filterDept || s.department === filterDept;
      return matchesSearch && matchesYear && matchesSection && matchesStatus && matchesDept;
    });
  }, [students, search, filterYear, filterSection, filterStatus, filterDept]);

  // Password validation
  const validatePassword = (pw: string) => {
    if (pw.length < 8) return 'At least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'At least one uppercase letter';
    if (!/[a-z]/.test(pw)) return 'At least one lowercase letter';
    if (!/\d/.test(pw)) return 'At least one number';
    return '';
  };

  // Handle password reset (requires service role key for admin API)
  const handleResetPassword = async () => {
    if (!resetModal.student) return;
    const errorMsg = validatePassword(resetPassword);
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }
    setResetLoading(true);
    try {
      // This requires service role key (not available on client). Show message instead.
      toast.error('Password reset requires admin privileges. Please use the admin panel or contact IT.');
      // If you have a backend API, call it here.
      // After success, update password_changed in user_profiles:
      // await supabase.from('user_profiles').update({ password_changed: false }).eq('id', resetModal.student.id);
      setResetModal({ open: false, student: null });
      setResetPassword('');
    } finally {
      setResetLoading(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (student: StudentProfile) => {
    setActionLoading(student.id);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !student.is_active })
        .eq('id', student.id);
      if (error) throw error;
      setStudents(students => students.map(s => s.id === student.id ? { ...s, is_active: !s.is_active } : s));
      toast.success(`Student ${!student.is_active ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  // Add handler for sending password reset email
  const handleSendResetEmail = async () => {
    if (!resetModal.student) return;
    setResetEmailLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetModal.student.email);
      if (error) throw error;
      toast.success('Password reset email sent!');
    } catch {
      toast.error('Failed to send reset email.');
    } finally {
      setResetEmailLoading(false);
    }
  };

  // UI
  return (
    <div className="min-h-screen bg-gradient-to-br  via-white to-indigo-50 py-8 px-2 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1 flex items-center gap-2">
              <UserPlus className="w-8 h-8 text-blue-600" /> Student Management
            </h1>
            <p className="text-gray-500 text-sm">View, filter, and manage all registered students. Reset passwords and control access with a premium experience.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="bg-white/80 rounded-xl shadow px-4 py-2 flex items-center gap-2">
              <span className="text-blue-600 font-bold text-lg">{students.length}</span>
              <span className="text-gray-600 text-sm">Total Students</span>
            </div>
            <div className="bg-green-50 rounded-xl shadow px-4 py-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-semibold text-sm">{students.filter(s => s.is_active).length} Active</span>
            </div>
            <div className="bg-yellow-50 rounded-xl shadow px-4 py-2 flex items-center gap-2">
              <UserX className="w-5 h-5 text-yellow-600" />
              <span className="text-yellow-700 font-semibold text-sm">{students.filter(s => !s.is_active).length} Inactive</span>
            </div>
          </div>
        </div>
        {/* Filters */}
        <div className="bg-white/80 rounded-2xl shadow-lg p-4 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="bg-transparent outline-none text-gray-700 w-40 md:w-56"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="filter-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {yearLevels.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="filter-select" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
            <option value="">All Sections</option>
            {sectionOptions.map(s => <option key={s} value={s as string}>{s}</option>)}
          </select>
          <select className="filter-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {deptOptions.map(d => <option key={d} value={d as string}>{d}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        {/* Table */}
        <div className="bg-white/90 rounded-2xl shadow-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Profile</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Section</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                    <span className="text-gray-500">Loading students...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">No students found.</td>
                </tr>
              ) : (
                filtered.map(student => (
                  <tr key={student.id} className="hover:bg-blue-50 transition-all">
                    <td className="px-6 py-3">
                      <img
                        src={profilePicUrls[student.id] || DEFAULT_AVATAR}
                        alt="avatar"
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-100 shadow"
                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                      />
                    </td>
                    <td className="px-6 py-3 font-semibold text-gray-800">{student.first_name} {student.last_name}</td>
                    <td className="px-6 py-3 text-gray-600">{student.email}</td>
                    <td className="px-6 py-3 text-gray-700">{student.year_level || '-'}</td>
                    <td className="px-6 py-3 text-gray-700">{student.section || '-'}</td>
                    <td className="px-6 py-3 text-gray-700">{student.department || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${student.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{student.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-6 py-3 text-center flex gap-2 justify-center items-center">
                      <button
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow hover:scale-105 transition-all flex items-center gap-1"
                        onClick={() => setResetModal({ open: true, student })}
                        title="Reset Password"
                      >
                        <Lock className="w-4 h-4" /> Reset
                      </button>
                      <button
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow flex items-center gap-1 transition-all ${student.is_active ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        onClick={() => handleToggleActive(student)}
                        disabled={actionLoading === student.id}
                        title={student.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {actionLoading === student.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : student.is_active ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                        {student.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Password Reset Modal */}
      {resetModal.open && resetModal.student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative animate-fade-in">
            <button
              onClick={() => setResetModal({ open: false, student: null })}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" /> Reset Password
            </h2>
            <div className="mb-4">
              <p className="text-gray-700 mb-2">Reset password for <span className="font-semibold">{resetModal.student.first_name} {resetModal.student.last_name}</span> ({resetModal.student.email})</p>
              <div className="relative mb-2">
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm pr-12"
                  placeholder="Enter new password..."
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  disabled={resetLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none"
                  tabIndex={-1}
                  onClick={() => setShowResetPassword(v => !v)}
                  aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                >
                  {showResetPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="text-xs text-gray-500 mb-2">Password must be at least 8 characters, include uppercase, lowercase, and a number.</div>
              <button
                onClick={handleSendResetEmail}
                className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={resetEmailLoading}
                type="button"
              >
                {resetEmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Send Password Reset Email
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResetModal({ open: false, student: null })}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg"
                disabled={resetLoading}
              >Cancel</button>
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
                disabled={resetLoading}
              >
                {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Reset Password
              </button>
            </div>
            <div className="mt-3 text-xs text-yellow-600 bg-yellow-50 rounded-lg px-3 py-2">
              <b>Note:</b> Password reset requires admin privileges. Please use the admin panel or contact IT if you do not have access.
            </div>
          </div>
        </div>
      )}
      <style>{`
        .filter-select {
          @apply bg-gray-100 rounded-lg px-3 py-2 text-gray-700 outline-none border-none shadow-sm transition-all;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default UserManagement;
