import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/auth';
import { Activity, AlertCircle, Clock, Filter, Search, Download, Calendar, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuditLog {
  id: string;
  userId: string;
  username: string;
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
      // In a real application, this would fetch from a real audit logs table
      // For demo purposes, we'll generate some sample data
      
      const demoLogs: AuditLog[] = generateDemoLogs();
      setLogs(demoLogs);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to fetch audit logs');
      setLoading(false);
    }
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

    const roles: UserRole[] = ['superadmin', 'admin', 'registrar', 'program_head', 'teacher', 'student'];
    const statuses: ('success' | 'warning' | 'error')[] = ['success', 'warning', 'error'];
    
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
        username: `user${Math.floor(Math.random() * 1000)}`,
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
        log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Audit Logs</h1>
      
      {/* Filters and Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Action Type Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as LogFilter)}
              className="block w-full md:w-48 pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="all">All Actions</option>
              <option value="login">Login Events</option>
              <option value="user-management">User Management</option>
              <option value="data-change">Data Changes</option>
              <option value="settings">Settings Changes</option>
              <option value="error">Errors</option>
            </select>
            
            {/* Date Range Filters */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">From:</span>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
              />
              <span className="text-sm text-gray-500">To:</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-md"
              />
            </div>
          </div>
          
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </button>
        </div>
        
        {/* Active Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {searchTerm && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100">
              Search: {searchTerm}
              <button 
                onClick={() => setSearchTerm('')}
                className="ml-1 text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {actionFilter !== 'all' && (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100">
              Action: {actionFilter}
              <button 
                onClick={() => setActionFilter('all')}
                className="ml-1 text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100">
            Date: {dateRange.start} to {dateRange.end}
          </div>
        </div>
      </div>
      
      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No logs found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md bg-blue-100 text-blue-500">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {log.action.charAt(0).toUpperCase() + log.action.slice(1).replace('-', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.username}</div>
                      <div className="text-xs text-gray-500 capitalize">{log.userRole}</div>
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(log.status)}`}>
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
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
