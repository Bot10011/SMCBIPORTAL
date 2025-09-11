import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/auth';
import toast from 'react-hot-toast';
import { User, Search, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface UserData {
  id: string;
  email: string | null;
  role: UserRole;
  created_at: string;
  last_login?: string | null;
  is_active: boolean;
  display_name?: string;
  avatar_url?: string;
}

const UserOverview: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [userCount, setUserCount] = useState<Record<UserRole | 'all', number>>({
    all: 0,
    superadmin: 0,
    admin: 0,
    registrar: 0,
    program_head: 0,
    instructor: 0,
    student: 0,
  });

  

  useEffect(() => {
    // Filter users based on search term and role filter
    let filtered = users;
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        (user.display_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // First fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email, role, created_at, is_active, display_name, avatar_url, first_name, middle_name, last_name')
        .neq('id', user?.id)
        .order('role', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;
      
      if (profilesData) {
        // Prepare base users list
        const usersWithLogins = profilesData.map(profile => {
          const computedName = (profile.display_name && String(profile.display_name).trim())
            || [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ').trim()
            || profile.email;
          return {
            ...profile,
            display_name: computedName || null,
            last_login: null as string | null
          };
        });

        // Fetch latest login per user from login_sessions
        const userIds = usersWithLogins.map(u => u.id);
        if (userIds.length > 0) {
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('login_sessions')
            .select('user_id, login_time')
            .in('user_id', userIds)
            .order('login_time', { ascending: false });

          if (sessionsError) throw sessionsError;

          if (sessionsData && sessionsData.length > 0) {
            const latestLoginByUser: Record<string, string> = {};
            for (const row of sessionsData as Array<{ user_id: string; login_time: string }>) {
              if (!latestLoginByUser[row.user_id]) {
                latestLoginByUser[row.user_id] = row.login_time;
              }
            }

            usersWithLogins.forEach(u => {
              if (latestLoginByUser[u.id]) {
                u.last_login = latestLoginByUser[u.id];
              }
            });
          }
        }
        
        setUsers(usersWithLogins as UserData[]);
        setFilteredUsers(usersWithLogins as UserData[]);
        
        // Calculate user counts
        const counts = {
          all: usersWithLogins.length,
          superadmin: 0,
          admin: 0,
          registrar: 0,
          program_head: 0,
          instructor: 0,
          student: 0,
        };
        
        usersWithLogins.forEach(user => {
          counts[user.role as UserRole]++;
        });
        
        setUserCount(counts);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Update local state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, is_active: !currentStatus } : user
        )
      );
      
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <h1 className="text-2xl text-red-600 font-bold mb-2">Access Denied</h1>
        <p className="text-red-600">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-5 shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">User Overview</h1>
            <p className="text-white/80 text-sm">Manage users, roles and activity across your organization</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing' : 'Refresh'}
            </button>
            <button
              onClick={() => toast.success('Add User functionality coming soon!')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <User className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        {([
          { key: 'all', label: 'All Users', color: 'blue', value: userCount.all },
          { key: 'admin', label: 'Admins', color: 'rose', value: userCount.admin },
          { key: 'registrar', label: 'Registrars', color: 'green', value: userCount.registrar },
          { key: 'program_head', label: 'Program Heads', color: 'amber', value: userCount.program_head },
          { key: 'instructor', label: 'Instructors', color: 'indigo', value: userCount.instructor },
          { key: 'student', label: 'Students', color: 'teal', value: userCount.student },
        ] as Array<{ key: UserRole | 'all'; label: string; color: string; value: number }>).map(card => (
          <button
            key={card.key}
            onClick={() => setRoleFilter(card.key)}
            className={`group text-left rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-${card.color}-400 ${roleFilter === card.key ? `border-l-4 border-${card.color}-500` : ''}`}
          >
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-xl items-center rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            className="ml-2 w-full border-0 p-0 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-0"
            placeholder="Search by display name or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg bg-gray-100 p-1">
            {(['all','admin','registrar','program_head','instructor','student'] as Array<UserRole | 'all'>).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${roleFilter === r ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-800'}`}
                title={`Filter: ${r}`}
              >
                {r.replace('_',' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">User</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Role</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Created</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Last Login</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Status</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4" colSpan={6}>
                      <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userData) => (
                  <tr key={userData.id} className={`transition hover:bg-gray-50 ${!userData.is_active ? 'bg-gray-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden ring-1 ring-gray-200">
                          {userData.avatar_url ? (
                            <img src={userData.avatar_url} alt={userData.display_name || 'User'} className="h-10 w-10 object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-semibold text-gray-900">{userData.display_name || userData.email || 'No name'}</div>
                          <div className="text-xs text-gray-500">{userData.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        userData.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                        userData.role === 'admin' ? 'bg-rose-100 text-rose-700' :
                        userData.role === 'registrar' ? 'bg-green-100 text-green-700' :
                        userData.role === 'program_head' ? 'bg-amber-100 text-amber-700' :
                        userData.role === 'instructor' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-teal-100 text-teal-700'
                      }`}>
                        {userData.role.replace('_',' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {userData.created_at ? new Date(userData.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {userData.last_login ? new Date(userData.last_login).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${userData.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {userData.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleUserStatus(userData.id, userData.is_active)}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
                          userData.is_active ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {userData.is_active ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Activate
                          </>
                        )}
                      </button>
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

export default UserOverview;
