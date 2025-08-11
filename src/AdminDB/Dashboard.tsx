import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Settings, Bell, Activity, Database, BookOpen, GraduationCap } from 'lucide-react';
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
    systemVersion: '1.0.0',
    maintenanceMode: false,
    emailNotifications: true,
    autoBackup: true,
    sessionTimeout: 30,
    maxFileSize: 10,
    userRegistration: true,
    emailVerification: true,
    passwordPolicy: 'strong',
    maxLoginAttempts: 5,
    backupFrequency: 'daily',
    dataRetention: 365,
    systemLogs: true,
    debugMode: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Removed System Information state and UI
  const { user } = useAuth();
  const [accountProfile, setAccountProfile] = useState<{ first_name?: string; last_name?: string; middle_name?: string } | null>(null);
  type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';
  const [passwordForm, setPasswordForm] = useState<{ currentPassword: string; newPassword: string; confirmPassword: string }>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordInputChange = (field: PasswordField, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdatePassword = async () => {
    try {
      if (!user?.email) {
        toast.error('No user email found');
        return;
      }
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        toast.error('Please fill out all password fields');
        return;
      }
      if (passwordForm.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
      setChangingPassword(true);

      // Verify current password by re-authenticating
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword
      });
      if (verifyError) {
        toast.error('Current password is incorrect');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (updateError) {
        toast.error('Failed to update password');
        return;
      }
      toast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Error updating password:', err);
      toast.error('An error occurred while updating password');
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    const fetchAccountProfile = async () => {
      try {
        if (!user?.id) return;
        const { data, error } = await supabase
          .from('user_profiles')
          .select('first_name,last_name,middle_name')
          .eq('id', user.id)
          .single();
        if (error) return;
        setAccountProfile(data);
      } catch {
        // silent fail
      }
    };
    fetchAccountProfile();
  }, [user?.id]);

  // Fetch settings from DB on mount
  useEffect(() => {
    fetchSettings();
    // removed: fetchSystemInfo();
  }, []);

  const fetchSettings = async () => {
    try {
      // Try to fetch from database first
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } else if (data) {
        setSettings({
          systemName: data.system_name || 'SMCBI Student Portal',
          systemVersion: data.system_version || '1.0.0',
          maintenanceMode: data.maintenance_mode || false,
          emailNotifications: data.email_notifications || true,
          autoBackup: data.auto_backup || true,
          sessionTimeout: data.session_timeout || 30,
          maxFileSize: data.max_file_size || 10,
          userRegistration: data.user_registration || true,
          emailVerification: data.email_verification || true,
          passwordPolicy: data.password_policy || 'strong',
          maxLoginAttempts: data.max_login_attempts || 5,
          backupFrequency: data.backup_frequency || 'daily',
          dataRetention: data.data_retention || 365,
          systemLogs: data.system_logs || true,
          debugMode: data.debug_mode || false
        });
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
    } finally {
      setLoading(false);
    }
  };

  // removed: fetchSystemInfo

  // Update setting in DB
  const handleSettingChange = async (key: string, value: unknown) => {
    try {
      setSaving(true);
      
      // Update local state immediately for better UX
      setSettings(prev => ({ ...prev, [key]: value }));
      
      // Prepare update object
      const updateObj: Record<string, unknown> = {};
      switch (key) {
        case 'systemName': updateObj.system_name = value; break;
        case 'systemVersion': updateObj.system_version = value; break;
        case 'maintenanceMode': updateObj.maintenance_mode = value; break;
        case 'emailNotifications': updateObj.email_notifications = value; break;
        case 'autoBackup': updateObj.auto_backup = value; break;
        case 'sessionTimeout': updateObj.session_timeout = value; break;
        case 'maxFileSize': updateObj.max_file_size = value; break;
        case 'userRegistration': updateObj.user_registration = value; break;
        case 'emailVerification': updateObj.email_verification = value; break;
        case 'passwordPolicy': updateObj.password_policy = value; break;
        case 'maxLoginAttempts': updateObj.max_login_attempts = value; break;
        case 'backupFrequency': updateObj.backup_frequency = value; break;
        case 'dataRetention': updateObj.data_retention = value; break;
        case 'systemLogs': updateObj.system_logs = value; break;
        case 'debugMode': updateObj.debug_mode = value; break;
        default: break;
      }

      // Try to update existing record
      const { error } = await supabase
        .from('system_settings')
        .update(updateObj)
        .eq('id', 1);

      // If no record exists, create one
      if (error && error.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('system_settings')
          .insert([{ id: 1, ...updateObj }]);
        
        if (insertError) {
          throw insertError;
        }
      } else if (error) {
        throw error;
      }

      toast.success('Setting updated successfully');
      
      // Log the change for audit purposes
      console.log(`Setting updated: ${key} = ${value}`);
      
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
      
      // Revert local state on error
      fetchSettings();
    } finally {
      setSaving(false);
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
         <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-lg neumorphic-soft">
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
                <p className="text-white/80 text-sm font-medium">Configure system preferences</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80"></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Account */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="neumorphic-dark p-6 lg:col-span-2"
        style={{ backgroundColor: '#2f3133' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">User Account</h3>
        </div>
        
        <div className="space-y-6">
          {/* User Profile Section */}
          <div className="bg-[#2f3133] rounded-lg p-6 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-200 mb-6 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              User Profile
            </h4>
            
            {/* Profile Header */}
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {accountProfile?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-purple-400 text-sm font-medium uppercase tracking-wide">{user?.role || 'Administrator'}</span>
                </div>
                <h5 className="text-xl font-bold text-white mb-2">
                  {`${accountProfile?.first_name ?? ''} ${accountProfile?.middle_name ?? ''} ${accountProfile?.last_name ?? ''}`.trim() || 'User Profile'}
                </h5>
                <p className="text-gray-400 text-sm">{user?.email || 'No email available'}</p>
              </div>
            </div>

           

            {/* Name Edit Section */}
            <div className="bg-[#252728] rounded-lg p-4 border border-gray-600">
              <h5 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Edit Profile Name
              </h5>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={`${accountProfile?.first_name ?? ''} ${accountProfile?.middle_name ?? ''} ${accountProfile?.last_name ?? ''}`.trim()}
                    onChange={(e) => {
                      // Handle name change logic here
                      console.log('Name changed:', e.target.value);
                    }}
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg bg-[#1c1c1d] text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Name
                </button>
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="bg-[#2f3133] rounded-lg p-5 border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-200 mb-5 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              Change Password
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#252728] text-white placeholder-gray-400 text-sm"
                  disabled={changingPassword}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#252728] text-white placeholder-gray-400 text-sm"
                  disabled={changingPassword}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:grid-cols-1">
                <label className="block text-sm font-medium text-gray-300">Confirm Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#252728] text-white placeholder-gray-400 text-sm"
                  disabled={changingPassword}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleUpdatePassword}
                disabled={changingPassword}
                className={`px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 ${
                  changingPassword ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-600'
                }`}
              >
                {changingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Update Password
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="neumorphic-dark p-6"
          style={{ backgroundColor: '#2f3133' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">General Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">System Name</label>
              <input
                type="text"
                value={settings.systemName}
                onChange={(e) => handleSettingChange('systemName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#2f3133] text-white placeholder-gray-400"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">System Version</label>
              <input
                type="text"
                value={settings.systemVersion}
                onChange={(e) => handleSettingChange('systemVersion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#2f3133] text-white placeholder-gray-400"
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Maintenance Mode</label>
                <p className="text-xs text-gray-400">Temporarily disable system access</p>
              </div>
              <button
                onClick={() => handleSettingChange('maintenanceMode', !settings.maintenanceMode)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-600'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </motion.div>

        

        {/* Backup & System Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="neumorphic-dark p-6"
          style={{ backgroundColor: '#2f3133' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Backup & System</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Auto Backup</label>
                <p className="text-xs text-gray-400">Automatically backup data</p>
              </div>
              <button
                onClick={() => handleSettingChange('autoBackup', !settings.autoBackup)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoBackup ? 'bg-purple-600' : 'bg-gray-600'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoBackup ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Backup Frequency</label>
              <select
                value={settings.backupFrequency}
                onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#2f3133] text-white"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Data Retention (days)</label>
              <input
                type="number"
                value={settings.dataRetention}
                onChange={(e) => handleSettingChange('dataRetention', parseInt(e.target.value))}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#2f3133] text-white"
                min="30"
                max="1095"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max File Size (MB)</label>
              <input
                type="number"
                value={settings.maxFileSize}
                onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#2f3133] text-white"
                min="1"
                max="50"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">System Logs</label>
                <p className="text-xs text-gray-400">Enable system logging</p>
              </div>
              <button
                onClick={() => handleSettingChange('systemLogs', !settings.systemLogs)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.systemLogs ? 'bg-green-600' : 'bg-gray-600'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.systemLogs ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-300">Debug Mode</label>
                <p className="text-xs text-gray-400">Enable debug logging</p>
              </div>
              <button
                onClick={() => handleSettingChange('debugMode', !settings.debugMode)}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.debugMode ? 'bg-yellow-600' : 'bg-gray-600'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.debugMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
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
      className={`neumorphic-dark rounded-xl overflow-hidden border-l-4 ${color}`}
      style={{ backgroundColor: '#252728' }}

    >
              <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">{title}</p>
              <h3 className="mt-1 text-2xl font-bold text-white">
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
          <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
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
                onClick={fetchDashboardData}
                className="admindashboard-refresh-button bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 border border-white/30"
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
                className="admindashboard-activity-card neumorphic-dark p-6 rounded-xl col-span-2 h-[300px]"
                style={{ backgroundColor: '#252728' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="space-y-4 overflow-y-auto h-[220px] custom-dashboard-scrollbar pr-2">
                  {recentActivity.map((activity, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 + (i * 0.1) }}
                      className="p-3 bg-[#252728] rounded-lg cursor-pointer"
                    >
                      <div className="flex items-start space-x-3">
                        <div 
                          className={`p-2 rounded-full ${
                            activity.type === 'user' ? 'bg-blue-900' : 
                            activity.type === 'course' ? 'bg-green-900' : 
                            activity.type === 'program' ? 'bg-purple-900' : 'bg-amber-900'
                          }`}
                        >
                          <activity.icon className={`w-4 h-4 ${
                            activity.type === 'user' ? 'text-blue-400' : 
                            activity.type === 'course' ? 'text-green-400' : 
                            activity.type === 'program' ? 'text-purple-400' : 'text-amber-400'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              <motion.div 
                className="admindashboard-notifications-card neumorphic-dark p-6 rounded-xl h-[300px]"
                style={{ backgroundColor: '#252728' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Notifications</h3>
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
                      onClick={() => markNotificationAsRead(notification.id)}
                      className={`p-3 rounded-lg cursor-pointer ${
                        notification.read ? 'bg-[#252728]' : 'bg-[#2f3133]'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div 
                          className={`p-2 rounded-full ${
                            notification.type === 'info' ? 'bg-blue-900' : 
                            notification.type === 'success' ? 'bg-green-900' : 
                            notification.type === 'warning' ? 'bg-yellow-900' : 'bg-red-900'
                          }`}
                        >
                          <div className={`w-4 h-4 ${
                            notification.type === 'info' ? 'text-blue-400' : 
                            notification.type === 'success' ? 'text-green-400' : 
                            notification.type === 'warning' ? 'text-yellow-400' : 'text-red-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            notification.read ? 'text-gray-300' : 'text-white'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {notification.time}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full" />
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
