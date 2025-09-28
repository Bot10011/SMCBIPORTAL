import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Mail, Edit3, Save, X, Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface UserEmail {
  id: string;
  email: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role: string;
  department?: string;
  year_level?: string;
  section?: string;
  is_active: boolean;
}

const EmailManagement: React.FC = () => {
  const [users, setUsers] = useState<UserEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentDept, setCurrentDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Fetch all users with their email information from auth.users via API
  useEffect(() => {
    const fetchUsers = async (attempt = 1) => {
      setLoading(true);
      setError(null);
      setIsRetrying(attempt > 1);
      
      try {
        const response = await fetch('http://localhost:3000/api/get-auth-users');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data.users || []);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        console.error('Error fetching users:', err);
        
        // Check if it's a connection error and we haven't exceeded max retries
        const isConnectionError = err instanceof TypeError && err.message.includes('Failed to fetch');
        const maxRetries = 3;
        
        if (isConnectionError && attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          setRetryCount(attempt);
          setTimeout(() => {
            fetchUsers(attempt + 1);
          }, delay);
          return;
        }
        
        // Set appropriate error message
        if (isConnectionError) {
          setError('Unable to connect to API server. Please make sure the API server is running on port 3000. You can start it with: npm run dev:api');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load users');
        }
      } finally {
        setLoading(false);
        setIsRetrying(false);
      }
    };
    
    fetchUsers();
  }, []);

  // Get unique year levels for filters
  const yearOptions = useMemo(() => Array.from(new Set(users.map(u => u.year_level).filter(Boolean))), [users]);

  // Load current Program Head department
  useEffect(() => {
    const loadDept = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const authUser = userData?.user;
        if (!authUser) return;

        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('department')
          .eq('id', authUser.id)
          .single();

        if (!error && profile?.department) {
          setCurrentDept(profile.department);
        }
      } catch {
        // ignore, default shows none until dept known
      }
    };
    loadDept();
  }, []);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    const normalize = (v?: string) => (v || '').trim().toLowerCase();
    const searchNorm = normalize(search);
    const filterDeptNorm = normalize(currentDept);
    const filterYearNorm = normalize(filterYear);

    return users.filter(user => {
      const displayNameNorm = normalize(user.display_name);
      const firstNameNorm = normalize(user.first_name);
      const lastNameNorm = normalize(user.last_name);
      const emailNorm = normalize(user.email);
      const deptMatches = !filterDeptNorm || normalize(user.department) === filterDeptNorm;
      const yearMatches = !filterYearNorm || normalize(user.year_level) === filterYearNorm;
      const searchMatches =
        !searchNorm ||
        displayNameNorm.includes(searchNorm) ||
        firstNameNorm.includes(searchNorm) ||
        lastNameNorm.includes(searchNorm) ||
        emailNorm.includes(searchNorm);

      return searchMatches && deptMatches && yearMatches;
    });
  }, [users, search, currentDept, filterYear]);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if email is unique
  const isEmailUnique = (email: string, excludeUserId?: string): boolean => {
    return !users.some(user => 
      user.id !== excludeUserId && 
      user.email.toLowerCase() === email.toLowerCase()
    );
  };

  // Start editing email
  const startEditing = (user: UserEmail) => {
    setEditingUserId(user.id);
    setEditingEmail(user.email);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingEmail('');
  };

  // Save email changes
  const saveEmail = async (userId: string, newEmail: string) => {
    if (!isValidEmail(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!isEmailUnique(newEmail, userId)) {
      toast.error('This email is already in use by another user');
      return;
    }

    setSaving(userId);
    try {
      const response = await fetch('http://localhost:3000/api/update-auth-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update email');
      }

      toast.success('Email updated successfully');

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, email: newEmail } : user
        )
      );

      setEditingUserId(null);
      setEditingEmail('');
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update email');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br via-white to-indigo-50 py-8 px-2 md:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white tracking-tight">Student Email Management</h4>
                  <p className="text-white/80 text-sm font-medium">View and edit student email addresses.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="rounded-xl px-4 py-2 flex items-center gap-2 bg-white/15 border border-white/25 text-white shadow-sm">
                  <span className="font-bold text-lg">{users.length}</span>
                  <span className="text-sm">Total Students</span>
                </div>
                <div className="rounded-xl px-4 py-2 flex items-center gap-2 bg-white/15 border border-white/25 text-white shadow-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-200" />
                  <span className="font-semibold text-sm">{users.filter(u => u.is_active).length} Active</span>
                </div>
                <div className="rounded-xl px-4 py-2 flex items-center gap-2 bg-white/15 border border-white/25 text-white shadow-sm">
                  <AlertCircle className="w-5 h-5 text-amber-200" />
                  <span className="font-semibold text-sm">{users.filter(u => !u.is_active).length} Inactive</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Connection Error:</strong> {error}
                {retryCount > 0 && (
                  <div className="mt-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Retrying... (Attempt {retryCount}/3)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/80 rounded-2xl shadow-lg p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-full">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                className="bg-transparent outline-none text-gray-700 w-full"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Department filter removed: auto-filter by current Program Head department */}
            <select
              className="w-full bg-gray-100 rounded-lg px-3 py-2 text-gray-700 outline-none border-none shadow-sm transition-all"
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
            >
              <option value="">All Year Levels</option>
              {yearOptions.map(year => (
                <option key={year} value={year as string}>{year}</option>
              ))}
            </select>
        
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="bg-white/90 rounded-2xl shadow p-4 flex items-center justify-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> 
              {isRetrying ? `Retrying connection... (${retryCount}/3)` : 'Loading students...'}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white/90 rounded-2xl shadow p-6 text-center text-gray-400">No students found.</div>
          ) : (
            filteredUsers.map(user => (
              <div key={user.id} className="bg-white/90 rounded-2xl shadow p-4">
                <div className="flex items-start gap-3">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name || user.email}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {user.display_name ? user.display_name.charAt(0).toUpperCase() : 
                       (user.first_name?.charAt(0) || '') + (user.last_name?.charAt(0) || '')}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-gray-800 truncate">
                        {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
                    
                    {editingUserId === user.id ? (
                      <div className="space-y-2">
                        <input
                          type="email"
                          value={editingEmail}
                          onChange={e => setEditingEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter new email"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEmail(user.id, editingEmail)}
                            disabled={saving === user.id}
                            className="flex-1 bg-green-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            {saving === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex-1 bg-gray-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-sm text-gray-600 truncate">{user.email}</div>
                        <button
                          onClick={() => startEditing(user)}
                          className="bg-blue-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit Email
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table (Desktop) */}
        <div className="hidden md:block bg-white/90 rounded-2xl shadow-xl overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 table-auto">
            <thead className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">User</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Department</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                    <span className="text-gray-500">
                      {isRetrying ? `Retrying connection... (${retryCount}/3)` : 'Loading students...'}
                    </span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">No students found.</td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-blue-50 transition-all">
                    <td className="px-6 py-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.display_name || user.email}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {user.display_name ? user.display_name.charAt(0).toUpperCase() : 
                           (user.first_name?.charAt(0) || '') + (user.last_name?.charAt(0) || '')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 font-semibold text-gray-800">
                      {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                    </td>
                    <td className="px-6 py-3">
                      {editingUserId === user.id ? (
                        <input
                          type="email"
                          value={editingEmail}
                          onChange={e => setEditingEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter new email"
                        />
                      ) : (
                        <span className="text-gray-600">{user.email}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-700">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap hidden lg:table-cell">{user.department || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {editingUserId === user.id ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => saveEmail(user.id, editingEmail)}
                            disabled={saving === user.id}
                            className="bg-green-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                          >
                            {saving === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="bg-gray-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(user)}
                          className="bg-blue-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmailManagement;
