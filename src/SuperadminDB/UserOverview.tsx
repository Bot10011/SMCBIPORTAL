import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/auth';
import toast from 'react-hot-toast';
import { User, Search, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface UserData {
  id: string;
  email: string | null;
  username: string | null;
  role: UserRole;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
  first_name?: string;
  last_name?: string;
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
    teacher: 0,
    student: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search term and role filter
    let filtered = users;
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('id', user?.id)
        .order('role', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setUsers(data as UserData[]);
        setFilteredUsers(data as UserData[]);
        
        // Calculate user counts
        const counts = {
          all: data.length,
          superadmin: 0,
          admin: 0,
          registrar: 0,
          program_head: 0,
          teacher: 0,
          student: 0,
        };
        
        data.forEach(user => {
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
  };

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
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">User Overview</h1>
      
      {/* User Count Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        <div 
          className={`bg-white p-4 rounded-lg shadow border-l-4 ${
            roleFilter === 'all' ? 'border-blue-500' : 'border-gray-200'
          } cursor-pointer hover:bg-gray-50`}
          onClick={() => setRoleFilter('all')}
        >
          <p className="text-sm text-gray-500">All Users</p>
          <p className="text-2xl font-bold text-gray-800">{userCount.all}</p>
        </div>
        
      
        <div 
          className={`bg-white p-4 rounded-lg shadow border-l-4 ${
            roleFilter === 'admin' ? 'border-red-500' : 'border-gray-200'
          } cursor-pointer hover:bg-gray-50`}
          onClick={() => setRoleFilter('admin')}
        >
          <p className="text-sm text-gray-500">Admins</p>
          <p className="text-2xl font-bold text-gray-800">{userCount.admin}</p>
        </div>
        
        <div 
          className={`bg-white p-4 rounded-lg shadow border-l-4 ${
            roleFilter === 'registrar' ? 'border-green-500' : 'border-gray-200'
          } cursor-pointer hover:bg-gray-50`}
          onClick={() => setRoleFilter('registrar')}
        >
          <p className="text-sm text-gray-500">Registrars</p>
          <p className="text-2xl font-bold text-gray-800">{userCount.registrar}</p>
        </div>
        
        <div 
          className={`bg-white p-4 rounded-lg shadow border-l-4 ${
            roleFilter === 'program_head' ? 'border-yellow-500' : 'border-gray-200'
          } cursor-pointer hover:bg-gray-50`}
          onClick={() => setRoleFilter('program_head')}
        >
          <p className="text-sm text-gray-500">Program Heads</p>
          <p className="text-2xl font-bold text-gray-800">{userCount.program_head}</p>
        </div>
        
        <div 
          className={`bg-white p-4 rounded-lg shadow border-l-4 ${
            roleFilter === 'teacher' ? 'border-indigo-500' : 'border-gray-200'
          } cursor-pointer hover:bg-gray-50`}
          onClick={() => setRoleFilter('teacher')}
        >
          <p className="text-sm text-gray-500">Teachers</p>
          <p className="text-2xl font-bold text-gray-800">{userCount.teacher}</p>
        </div>
        
        <div 
          className={`bg-white p-4 rounded-lg shadow border-l-4 ${
            roleFilter === 'student' ? 'border-teal-500' : 'border-gray-200'
          } cursor-pointer hover:bg-gray-50`}
          onClick={() => setRoleFilter('student')}
        >
          <p className="text-sm text-gray-500">Students</p>
          <p className="text-2xl font-bold text-gray-800">{userCount.student}</p>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button
          onClick={fetchUsers}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>
      
      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userData) => (
                  <tr key={userData.id} className={!userData.is_active ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {(userData.first_name || userData.last_name)
                              ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
                              : (userData.email || 'No email')}
                          </div>
                          <div className="text-sm text-gray-500">{userData.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${userData.role === 'superadmin' ? 'bg-purple-100 text-purple-800' : 
                        userData.role === 'admin' ? 'bg-red-100 text-red-800' : 
                        userData.role === 'registrar' ? 'bg-green-100 text-green-800' :
                        userData.role === 'program_head' ? 'bg-yellow-100 text-yellow-800' :
                        userData.role === 'teacher' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-blue-100 text-blue-800'}`}>
                        {userData.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(userData.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userData.last_login ? new Date(userData.last_login).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        userData.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {userData.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleUserStatus(userData.id, userData.is_active)}
                        className={`inline-flex items-center px-3 py-1 rounded-md text-sm ${
                          userData.is_active 
                            ? 'text-red-700 bg-red-100 hover:bg-red-200' 
                            : 'text-green-700 bg-green-100 hover:bg-green-200'
                        }`}
                      >
                        {userData.is_active ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
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
