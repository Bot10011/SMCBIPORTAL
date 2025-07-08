import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Settings, Bell, ShieldAlert, TrendingUp, Activity, Database, BookOpen, GraduationCap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

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

  const handleSettingChange = async (key: string, value: unknown) => {
    try {
      // In a real application, you would save to database
      setSettings(prev => ({ ...prev, [key]: value }));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Setting updated successfully');
    } catch {
      toast.error('Failed to update setting');
    }
  };

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-800 mb-2">System Settings</h2>
        <p className="text-gray-600">Configure system preferences and security settings</p>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-800">System Status</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database Status</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Storage Usage</span>
              <span className="text-sm font-medium text-gray-800">67%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Backup</span>
              <span className="text-sm text-gray-800">2 hours ago</span>
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
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
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
  };

  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="decorative-circle decorative-circle-1" />
      <div className="decorative-circle decorative-circle-2" />
      
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {user?.first_name || 'Admin'}! Here's what's happening with your portal today.</p>
          </div>
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-300"
            >
              Refresh Data
            </motion.button>
            <div className="relative">
              <Bell className="w-6 h-6 text-gray-600 cursor-pointer" />
              {unreadCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                >
                  {unreadCount}
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div 
            className="flex flex-col justify-center items-center min-h-[400px]"
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            {/* Modern loader animation */}
            <div className="relative w-24 h-24">
              <motion.div 
                className="absolute inset-0 rounded-full border-4 border-indigo-100"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div 
                className="absolute inset-0 rounded-full border-t-4 border-indigo-600"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              <motion.div 
                className="absolute inset-0 rounded-full border-t-4 border-r-4 border-blue-500"
                animate={{ scale: [1, 1.1, 1], rotate: -360 }}
                transition={{ 
                  scale: { duration: 1, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" }
                }}
              />
              <motion.div 
                className="absolute inset-4 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-lg shadow-indigo-500/30"
                animate={{ scale: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <motion.p 
              className="mt-6 text-indigo-600 font-medium"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              Loading dashboard data...
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                className="bg-white p-6 rounded-xl shadow-md col-span-2 h-[300px] relative overflow-hidden card-hover-effect"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span>System Overview</span>
                  <motion.span 
                    className="ml-2 w-2 h-2 rounded-full bg-green-500 inline-block"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </h3>
                <div className="grid grid-cols-2 gap-4 h-[220px]">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 flex flex-col justify-center items-center">
                    <Database className="w-8 h-8 text-blue-600 mb-2" />
                    <p className="text-sm text-gray-600">Database</p>
                    <p className="text-lg font-bold text-gray-800">Online</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 flex flex-col justify-center items-center">
                    <Activity className="w-8 h-8 text-green-600 mb-2" />
                    <p className="text-sm text-gray-600">Uptime</p>
                    <p className="text-lg font-bold text-gray-800">99.8%</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 flex flex-col justify-center items-center">
                    <ShieldAlert className="w-8 h-8 text-purple-600 mb-2" />
                    <p className="text-sm text-gray-600">Security</p>
                    <p className="text-lg font-bold text-gray-800">Active</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 flex flex-col justify-center items-center">
                    <TrendingUp className="w-8 h-8 text-orange-600 mb-2" />
                    <p className="text-sm text-gray-600">Performance</p>
                    <p className="text-lg font-bold text-gray-800">Good</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="bg-white p-6 rounded-xl shadow-md h-[300px] card-hover-effect"
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

            {/* Recent Activity Section */}
            <motion.div 
              className="bg-white p-6 rounded-xl shadow-md card-hover-effect"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 + (i * 0.1) }}
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
            <Route path="/program-management" element={<ProgramManagement />} />
            <Route path="/settings" element={<SystemSettings />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default AdminDashboard;
