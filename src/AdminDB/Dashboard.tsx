import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Settings, Bell, ShieldAlert, Activity, Database, BookOpen, GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import Announcement from './Announcement';

// Import admin-specific components and styles
import UserManagement from './UserManagement';
import CourseManagement from './CourseManagement';
import ProgramManagement from './ProgramManagement';
import './dashboard.css';

// Page Transition Indicator Component
const PageTransitionIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 z-50"
        />
      )}
    </AnimatePresence>
  );
};

// Create a functional SystemSettings component
const SystemSettings = () => {
  const [settings, setSettings] = useState({
    systemName: 'SMCBI Student Portal',
    maintenanceMode: false,
    emailNotifications: true,
    autoBackup: true,
    sessionTimeout: 30,
    maxFileSize: 10
  });
  const [loading, setLoading] = useState(true);

  // Fetch settings from DB on mount
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (error) {
        toast.error('Failed to load settings');
      } else if (data) {
        setSettings({
          systemName: data.system_name,
          maintenanceMode: data.maintenance_mode,
          emailNotifications: data.email_notifications,
          autoBackup: data.auto_backup,
          sessionTimeout: data.session_timeout,
          maxFileSize: data.max_file_size
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  // Update setting in DB
  const handleSettingChange = async (key: string, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    const updateObj: Record<string, unknown> = {};
    switch (key) {
      case 'systemName': updateObj.system_name = value; break;
      case 'maintenanceMode': updateObj.maintenance_mode = value; break;
      case 'emailNotifications': updateObj.email_notifications = value; break;
      case 'autoBackup': updateObj.auto_backup = value; break;
      case 'sessionTimeout': updateObj.session_timeout = value; break;
      case 'maxFileSize': updateObj.max_file_size = value; break;
      default: break;
    }
    const { error } = await supabase
      .from('system_settings')
      .update(updateObj)
      .eq('id', 1);
    if (error) {
      toast.error('Failed to update setting');
    } else {
      toast.success('Setting updated successfully');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings w-6 h-6 text-white">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">System Settings</h2>
                <p className="text-white/80 text-sm font-medium">Configure system preferences and security settings</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80"></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">General Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">System Name</label>
              <input
                type="text"
                value={settings.systemName}
                onChange={(e) => handleSettingChange('systemName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                <p className="text-xs text-gray-500">Temporarily disable system access</p>
              </div>
              <button
                onClick={() => handleSettingChange('maintenanceMode', !settings.maintenanceMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Security Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                <p className="text-xs text-gray-500">Receive security alerts</p>
              </div>
              <button
                onClick={() => handleSettingChange('emailNotifications', !settings.emailNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.emailNotifications ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="5"
                max="120"
              />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Backup Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto Backup</label>
                <p className="text-xs text-gray-500">Automatically backup data daily</p>
              </div>
              <button
                onClick={() => handleSettingChange('autoBackup', !settings.autoBackup)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoBackup ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoBackup ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max File Size (MB)</label>
              <input
                type="number"
                value={settings.maxFileSize}
                onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="50"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Dashboard Card Component with real data
const DashboardCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}> = ({ title, value, subtitle, icon, color, delay = 0 }) => {
  const [count, setCount] = useState(0);
  const numericValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : value;
  
  useEffect(() => {
    if (isNaN(numericValue)) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 1500, 1);
      const currentCount = Math.floor(progress * numericValue);
      
      setCount(currentCount);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    const timeoutId = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);
    }, delay * 1000);
    
    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(timeoutId);
    };
  }, [numericValue, delay]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-white rounded-xl shadow-md overflow-hidden border-l-4 ${color} card-hover-effect`}
      whileHover={{ 
        y: -5, 
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        transition: { duration: 0.3 }
      }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-800">
              {isNaN(numericValue) ? value : count.toLocaleString()}
            </h3>
            <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-lg ${color.replace('border', 'bg').replace('-600', '-100')}`}>
            <motion.div 
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                repeatDelay: 3,
                ease: "easeInOut" 
              }}
            >
              {icon}
            </motion.div>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div 
              className={`h-1.5 rounded-full ${color.replace('border', 'bg')}`}
              initial={{ width: 0 }}
              animate={{ width: "70%" }}
              transition={{ duration: 1.2, delay: delay + 0.5 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Admin Dashboard Overview Component with real data
const DashboardOverview: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalPrograms: 0,
    activeUsers: 0
  });
  const [recentActivity, setRecentActivity] = useState<Array<{
    type: string;
    message: string;
    time: string;
    icon: React.ComponentType<{ className?: string }>;
  }>>([]);
  const [notifications, setNotifications] = useState<Array<{
    id: number;
    type: string;
    message: string;
    time: string;
    read: boolean;
  }>>([]);

  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    // Removed auto-refresh interval to prevent periodic refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Memoized dashboard data fetching
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch real data from Supabase
      const [usersResponse, coursesResponse, programsResponse] = await Promise.all([
        supabase.from('user_profiles').select('*').neq('role', 'superadmin'),
        supabase.from('courses').select('*'),
        supabase.from('programs').select('*')
      ]);

      const totalUsers = usersResponse.data?.length || 0;
      const totalCourses = coursesResponse.data?.length || 0;
      const totalPrograms = programsResponse.data?.length || 0;
      const activeUsers = usersResponse.data?.filter((u: { is_active: boolean }) => u.is_active).length || 0;

      setStats({
        totalUsers,
        totalCourses,
        totalPrograms,
        activeUsers
      });

      // Generate recent activity (in a real app, this would come from a logs table)
      const activities = [
        { type: 'user', message: 'New user registered', time: '2 hours ago', icon: Users },
        { type: 'course', message: 'Course updated', time: '4 hours ago', icon: BookOpen },
        { type: 'program', message: 'Program created', time: '6 hours ago', icon: GraduationCap },
        { type: 'system', message: 'System backup completed', time: '8 hours ago', icon: Database },
        { type: 'user', message: 'User profile updated', time: '10 hours ago', icon: Users }
      ];

      setRecentActivity(activities);

      // Generate notifications
      const newNotifications = [
        { id: 1, type: 'info', message: 'System maintenance scheduled for tonight', time: '1 hour ago', read: false },
        { id: 2, type: 'success', message: 'Database backup completed successfully', time: '2 hours ago', read: false },
        { id: 3, type: 'warning', message: 'Storage usage is at 75%', time: '4 hours ago', read: true },
        { id: 4, type: 'error', message: 'Failed login attempt detected', time: '6 hours ago', read: true }
      ];

      setNotifications(newNotifications);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoized notification handling
  const markNotificationAsRead = useCallback((id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  // Memoized unread count
  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length, 
    [notifications]
  );



  return (
    <div className="p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="decorative-circle decorative-circle-1" />
      <div className="decorative-circle decorative-circle-2" />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="admindashboard-header mb-8"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-dashboard w-6 h-6 text-white">
                  <rect width="7" height="9" x="3" y="3" rx="1"></rect>
                  <rect width="7" height="5" x="14" y="3" rx="1"></rect>
                  <rect width="7" height="9" x="14" y="12" rx="1"></rect>
                  <rect width="7" height="5" x="3" y="16" rx="1"></rect>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Admin Dashboard</h1>
                <p className="text-white/80 text-sm font-medium">Welcome back, {user?.first_name || 'Admin'}! Here's what's happening with your portal today.</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80"></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchDashboardData}
                className="admindashboard-refresh-button bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all duration-300 font-semibold flex items-center gap-2 border border-white/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw w-4 h-4">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                  <path d="M3 21v-5h5"></path>
                </svg>
                Refresh
              </motion.button>
              <div className="relative">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30">
                  <Bell className="w-5 h-5 text-white cursor-pointer" />
                  {unreadCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center text-[10px] font-bold"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <div className="admindashboard-skeleton">
            {/* Header Skeleton */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            </motion.div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-gray-200 animate-pulse"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    </div>
                    <div className="mt-4">
                      <div className="h-1.5 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recent Activity and Notifications Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div 
                className="bg-white p-6 rounded-xl shadow-md col-span-2 h-[300px] animate-pulse"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-48 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div 
                className="bg-white p-6 rounded-xl shadow-md h-[300px] animate-pulse"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-full mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="admindashboard-stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <DashboardCard 
                title="Total Users" 
                value={stats.totalUsers} 
                subtitle="↑ 12% from last month" 
                icon={<Users className="w-6 h-6 text-indigo-600" />}
                color="border-indigo-600"
                delay={0.1}
              />
              <DashboardCard 
                title="Active Courses" 
                value={stats.totalCourses} 
                subtitle="↑ 5% from last week" 
                icon={<BookOpen className="w-6 h-6 text-green-600" />}
                color="border-green-600"
                delay={0.2}
              />
              <DashboardCard 
                title="Total Programs" 
                value={stats.totalPrograms} 
                subtitle="Active programs" 
                icon={<GraduationCap className="w-6 h-6 text-blue-600" />}
                color="border-blue-600"
                delay={0.3}
              />
              <DashboardCard 
                title="Active Users" 
                value={stats.activeUsers} 
                subtitle="Currently online" 
                icon={<Activity className="w-6 h-6 text-purple-600" />}
                color="border-purple-600"
                delay={0.4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div 
                className="admindashboard-activity-card bg-white p-6 rounded-xl shadow-md card-hover-effect col-span-2 h-[300px]"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
                <div className="space-y-4 overflow-y-auto h-[220px] custom-dashboard-scrollbar pr-2">
                  {recentActivity.map((activity, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 + (i * 0.1) }}
                      whileHover={{ 
                        scale: 1.02, 
                        boxShadow: '0 4px 8px -2px rgba(0, 0, 0, 0.1)' 
                      }}
                      className="p-3 bg-gray-50 rounded-lg cursor-pointer transition-all duration-300"
                    >
                      <div className="flex items-start space-x-3">
                        <motion.div 
                          className={`p-2 rounded-full ${
                            activity.type === 'user' ? 'bg-blue-100' : 
                            activity.type === 'course' ? 'bg-green-100' : 
                            activity.type === 'program' ? 'bg-purple-100' : 'bg-amber-100'
                          }`}
                          whileHover={{ scale: 1.1 }}
                        >
                          <activity.icon className={`w-4 h-4 ${
                            activity.type === 'user' ? 'text-blue-600' : 
                            activity.type === 'course' ? 'text-green-600' : 
                            activity.type === 'program' ? 'text-purple-600' : 'text-amber-600'
                          }`} />
                        </motion.div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              <motion.div 
                className="admindashboard-notifications-card bg-white p-6 rounded-xl shadow-md h-[300px] card-hover-effect"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                  <div className="relative">
                    <Bell className="w-5 h-5 text-gray-400" />
                    {unreadCount > 0 && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ 
                          scale: [1, 1.2, 1],
                          boxShadow: [
                            '0 0 0 0 rgba(239, 68, 68, 0.7)',
                            '0 0 0 5px rgba(239, 68, 68, 0)', 
                            '0 0 0 0 rgba(239, 68, 68, 0.7)'
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-4 overflow-y-auto h-[220px] custom-dashboard-scrollbar pr-2">
                  {notifications.map((notification, i) => (
                    <motion.div 
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 + (i * 0.1) }}
                      whileHover={{ 
                        scale: 1.02, 
                        boxShadow: '0 4px 8px -2px rgba(0, 0, 0, 0.1)' 
                      }}
                      onClick={() => markNotificationAsRead(notification.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                        notification.read ? 'bg-gray-50' : 'bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <motion.div 
                          className={`p-2 rounded-full ${
                            notification.type === 'info' ? 'bg-blue-100' : 
                            notification.type === 'success' ? 'bg-green-100' : 
                            notification.type === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                          }`}
                          whileHover={{ scale: 1.1 }}
                        >
                          <div className={`w-4 h-4 ${
                            notification.type === 'info' ? 'text-blue-600' : 
                            notification.type === 'success' ? 'text-green-600' : 
                            notification.type === 'warning' ? 'text-yellow-600' : 'text-red-600'
                          }`} />
                        </motion.div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            notification.read ? 'text-gray-600' : 'text-gray-800'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.time}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  // State to track route changes for page transitions
  const [routeKey, setRouteKey] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Page transition variants
  const pageVariants = {
    initial: {
      opacity: 0,
      x: 20,
      filter: "blur(5px)",
    },
    in: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
    },
    out: {
      opacity: 0,
      x: -20,
      filter: "blur(5px)",
    }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5
  } as const;

  useEffect(() => {
    // Update route key and trigger transition indicator
    setIsTransitioning(true);
    setRouteKey(location.pathname);
    
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <DashboardLayout>
      <PageTransitionIndicator isActive={isTransitioning} />
      <AnimatePresence mode="wait">
        <motion.div
          key={routeKey}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          className="h-full w-full custom-dashboard-scrollbar"
          onAnimationStart={() => setIsTransitioning(true)}
          onAnimationComplete={() => setIsTransitioning(false)}
        >
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/courses" element={<CourseManagement />} />
            <Route path="/announcements" element={<Announcement />} />
            <Route path="/program-management" element={<ProgramManagement />} />
            <Route path="/settings" element={<SystemSettings />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default AdminDashboard;
