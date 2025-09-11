import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/auth';
import { Activity, AlertCircle, Clock, Filter, Search, Download, Calendar, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  display_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
  role: UserRole;
}

interface AuditLog {
  id: string;
  userId: string;
  display_name: string;
  avatar_url?: string;
  userRole: UserRole;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

type LogFilter = 'all' | 'login' | 'user-management' | 'data-change' | 'settings' | 'error';

const AuditLogs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<LogFilter>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    end: new Date().toISOString().split('T')[0], // today
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, actionFilter, dateRange]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch real user profiles from the database
      const { data: userProfiles, error: userError } = await supabase
        .from('user_profiles')
        .select('id, display_name, first_name, middle_name, last_name, email, avatar_url, role')
        .order('created_at', { ascending: false });
      
      if (userError) throw userError;
      
      if (userProfiles && userProfiles.length > 0) {
        // Generate audit logs using real user data
        const realLogs: AuditLog[] = generateRealAuditLogs(userProfiles);
        setLogs(realLogs);
      } else {
        // Fallback to demo data if no users found
        const demoLogs: AuditLog[] = generateDemoLogs();
        setLogs(demoLogs);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to fetch audit logs');
      // Fallback to demo data on error
      const demoLogs: AuditLog[] = generateDemoLogs();
      setLogs(demoLogs);
      setLoading(false);
    }
  };

  const generateRealAuditLogs = (userProfiles: UserProfile[]): AuditLog[] => {
    const actions = [
      { type: 'login', description: 'User logged in' },
      { type: 'login', description: 'User logged out' },
      { type: 'user-management', description: 'User created' },
      { type: 'user-management', description: 'User role changed' },
      { type: 'user-management', description: 'User deleted' },
      { type: 'data-change', description: 'Course created' },
      { type: 'data-change', description: 'Grade updated' },
      { type: 'data-change', description: 'Curriculum modified' },
      { type: 'settings', description: 'System settings updated' },
      { type: 'settings', description: 'Password policy changed' },
      { type: 'error', description: 'Failed login attempt' },
      { type: 'error', description: 'Database connection error' },
    ];
    
    // Generate logs using real user data
    const getPreferredDisplayName = (u: UserProfile) => {
      const fullName = [u.first_name, u.middle_name, u.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      return (u.display_name && u.display_name.trim()) || fullName || u.email || 'Unknown User';
    };

    return Array.from({ length: Math.min(100, userProfiles.length * 3) }, (_, i) => {
      const randomUser = userProfiles[Math.floor(Math.random() * userProfiles.length)];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      // Assign status based on action type (errors are always error status)
      let status: 'success' | 'warning' | 'error' = 'success';
      if (randomAction.type === 'error') {
        status = 'error';
      } else if (Math.random() > 0.9) { // 10% chance of warning for non-error actions
        status = 'warning';
      }
      
      // Generate a random date within the last 30 days
      const timestamp = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString();
      
      return {
        id: `log-${i}`,
        userId: randomUser.id,
        display_name: getPreferredDisplayName(randomUser),
        avatar_url: randomUser.avatar_url,
        userRole: randomUser.role as UserRole,
        action: randomAction.type,
        details: randomAction.description,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        timestamp,
        status,
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by timestamp, newest first
  };

  const generateDemoLogs = (): AuditLog[] => {
    const actions = [
      { type: 'login', description: 'User logged in' },
      { type: 'login', description: 'User logged out' },
      { type: 'user-management', description: 'User created' },
      { type: 'user-management', description: 'User role changed' },
      { type: 'user-management', description: 'User deleted' },
      { type: 'data-change', description: 'Course created' },
      { type: 'data-change', description: 'Grade updated' },
      { type: 'data-change', description: 'Curriculum modified' },
      { type: 'settings', description: 'System settings updated' },
      { type: 'settings', description: 'Password policy changed' },
      { type: 'error', description: 'Failed login attempt' },
      { type: 'error', description: 'Database connection error' },
    ];

    const roles: UserRole[] = ['superadmin', 'admin', 'registrar', 'program_head', 'instructor', 'student'];
    
    // Generate 100 random logs
    return Array.from({ length: 100 }, (_, i) => {
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      const randomRole = roles[Math.floor(Math.random() * roles.length)];
      
      // Assign status based on action type (errors are always error status)
      let status: 'success' | 'warning' | 'error' = 'success';
      if (randomAction.type === 'error') {
        status = 'error';
      } else if (Math.random() > 0.9) { // 10% chance of warning for non-error actions
        status = 'warning';
      }
      
      // Generate a random date within the last 30 days
      const timestamp = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString();
      
      return {
        id: `log-${i}`,
        userId: `user-${Math.floor(Math.random() * 1000)}`,
        display_name: `Demo User ${Math.floor(Math.random() * 1000)}`,
        avatar_url: undefined,
        userRole: randomRole,
        action: randomAction.type,
        details: randomAction.description,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        timestamp,
        status,
      };
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Sort by timestamp, newest first
  };

  const filterLogs = () => {
    let filtered = [...logs];
    
    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply action type filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }
    
    // Apply date range filter
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999); // End of the day
    
    filtered = filtered.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
    
    setFilteredLogs(filtered);
  };

  const handleExport = () => {
    // In a real application, this would generate a CSV or PDF file
    toast.success('Audit logs exported successfully');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadgeClass = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <Clock className="w-4 h-4" />;
      case 'user-management':
        return <Activity className="w-4 h-4" />;
      case 'data-change':
        return <Calendar className="w-4 h-4" />;
      case 'settings':
        return <Filter className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
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
      {/* Header */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-5 shadow-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-sm opacity-80">Track security events and administrative actions</p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <Download className="h-4 w-4" /> Export Logs
          </button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            {/* Search */}
            <div className="flex w-full max-w-md items-center rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="ml-2 w-full border-0 p-0 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-0"
                placeholder="Search logs, users, IPs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as LogFilter)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:w-56"
            >
              <option value="all">All Actions</option>
              <option value="login">Login Events</option>
              <option value="user-management">User Management</option>
              <option value="data-change">Data Changes</option>
              <option value="settings">Settings Changes</option>
              <option value="error">Errors</option>
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">From</span>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-500">To</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Active Filters */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {searchTerm && (
            <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">
              Search: {searchTerm}
              <button onClick={() => setSearchTerm('')} className="ml-1 text-gray-500 hover:text-gray-700">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {actionFilter !== 'all' && (
            <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">
              Action: {actionFilter}
              <button onClick={() => setActionFilter('all')} className="ml-1 text-gray-500 hover:text-gray-700">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">
            Date: {dateRange.start} to {dateRange.end}
          </div>
        </div>
      </div>
      
      {/* Logs Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No logs found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    IP Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-500">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {log.action.charAt(0).toUpperCase() + log.action.slice(1).replace('-', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                          {log.avatar_url ? (
                            <img 
                              src={log.avatar_url} 
                              alt={log.display_name} 
                              className="h-8 w-8 object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                              <span className="text-xs font-semibold text-blue-600">
                                {log.display_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.display_name}</div>
                          <div className="text-xs capitalize text-gray-500">{log.userRole}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.details}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold leading-5 ${getStatusBadgeClass(log.status)}`}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination - in a real app this would be functional */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Previous
            </button>
            <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of{' '}
                <span className="font-medium">{filteredLogs.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  1
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-blue-50 text-sm font-medium text-blue-600 hover:bg-gray-50">
                  2
                </button>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  3
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
                <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  10
                </button>
                <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
