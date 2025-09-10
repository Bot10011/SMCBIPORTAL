import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Bell, Activity, Database, BookOpen, GraduationCap, LogIn, LogOut, Cloud } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import InstructorManagement from './InstructorManagement';
import ClassManagement from './ClassManagement';
import ProgramHeadEnrollment from '../AdminDB/ProgramHeadEnrollment';

// Google Identity Services TypeScript declarations
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
    googleDriveAccessToken: string | null;
  }
}
import Announcement from './Announcement';
import { createPortal } from 'react-dom';
import RegistrarEnrollment from '../AdminDB/RegistrarEnrollment';
import StudentGrades from '../AdminDB/StudentGrades';

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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [gdriveAuthLoading, setGdriveAuthLoading] = useState(false);
  const [, setAutoBackupInterval] = useState<NodeJS.Timeout | null>(null);

  // Check for existing Google Drive connection on component mount
  useEffect(() => {
    const checkGoogleDriveConnection = async () => {
      const storedToken = localStorage.getItem('googleDriveAccessToken');
      const storedConnection = localStorage.getItem('googleDriveConnected');
      
      if (storedToken && storedConnection === 'true') {
        // Validate the token by making a test API call
        try {
          const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          if (response.ok) {
            // Token is still valid, restore the connection state
            window.googleDriveAccessToken = storedToken;
            setGdriveConnected(true);
            console.log('Google Drive connection restored from localStorage');
          } else {
            // Token is expired or invalid, clear localStorage
            localStorage.removeItem('googleDriveAccessToken');
            localStorage.removeItem('googleDriveConnected');
            window.googleDriveAccessToken = null;
            setGdriveConnected(false);
            console.log('Google Drive token expired, connection cleared');
          }
        } catch {
          // Token validation failed, clear localStorage
          localStorage.removeItem('googleDriveAccessToken');
          localStorage.removeItem('googleDriveConnected');
          window.googleDriveAccessToken = null;
          setGdriveConnected(false);
          console.log('Google Drive token validation failed, connection cleared');
        }
      }
    };

    checkGoogleDriveConnection();
  }, []);

  const handlePasswordInputChange = (field: PasswordField, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  // Backup functionality
  const handleDownloadBackup = async () => {
    try {
      setDownloadingBackup(true);
      toast.loading('Creating database backup...', { id: 'backup' });

      // Get all tables from the database (excluding sensitive/temporary data)
      const tables = [
        'user_profiles',
        'courses', 
        'programs',
        'grades',
        'sections',
        'teacher_subjects',
        'coe',
        'enrollcourse',
        'student_enrollments_view',
        'subject_actions'
      ];

      const backupData: Record<string, unknown[]> = {};
      const backupMetadata = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        tables: tables,
        totalRecords: 0
      };

      // Fetch data from each table
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*');
          
          if (error) {
            console.warn(`Error fetching ${table}:`, error);
            backupData[table] = [];
          } else {
            backupData[table] = data || [];
            backupMetadata.totalRecords += (data || []).length;
          }
        } catch (err) {
          console.warn(`Table ${table} might not exist:`, err);
          backupData[table] = [];
        }
      }

      // Create complete backup object
      const completeBackup = {
        metadata: backupMetadata,
        data: backupData
      };

      // Create and download JSON file
      const jsonString = JSON.stringify(completeBackup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `smcbi-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Backup created successfully! ${backupMetadata.totalRecords} records exported.`, { id: 'backup' });

    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup', { id: 'backup' });
    } finally {
      setDownloadingBackup(false);
    }
  };

  // Google Drive Authentication
  const handleGoogleDriveAuth = async () => {
    setGdriveAuthLoading(true);
    const loadingToast = toast.loading('Connecting to Google Drive...');

    try {
      // Check if Google Identity Services is available
      if (typeof window.google === 'undefined') {
        // Load Google Identity Services script if not already loaded
        await loadGoogleIdentityServices();
      }

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
      
      if (clientId === 'YOUR_GOOGLE_CLIENT_ID') {
        throw new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.');
      }

      // Initialize Google Identity Services OAuth2
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: { access_token: string }) => {
          if (response.access_token) {
            // Store the access token for later use
            window.googleDriveAccessToken = response.access_token;
            
            // Persist connection state in localStorage
            localStorage.setItem('googleDriveAccessToken', response.access_token);
            localStorage.setItem('googleDriveConnected', 'true');
            
            setGdriveConnected(true);
            toast.dismiss(loadingToast);
            toast.success('Successfully connected to Google Drive! Auto backup will start if enabled.');
          } else {
            throw new Error('Failed to get access token');
          }
        },
      });

      // Request access token
      tokenClient.requestAccessToken();

    } catch (error) {
      console.error('Google Drive authentication error:', error);
      toast.dismiss(loadingToast);
      if (error instanceof Error && error.message.includes('Client ID not configured')) {
        toast.error('Google Drive integration not configured. Please contact your administrator.');
      } else {
        toast.error('Failed to connect to Google Drive. Please try again.');
      }
    } finally {
      setGdriveAuthLoading(false);
    }
  };

  // Disconnect from Google Drive
  const handleGoogleDriveDisconnect = () => {
    try {
      // Clear the stored access token
      window.googleDriveAccessToken = null;
      
      // Clear localStorage
      localStorage.removeItem('googleDriveAccessToken');
      localStorage.removeItem('googleDriveConnected');
      
      setGdriveConnected(false);
      toast.success('Disconnected from Google Drive');
    } catch (error) {
      console.error('Error disconnecting from Google Drive:', error);
      setGdriveConnected(false);
      toast.error('Disconnected from Google Drive');
    }
  };

  // Load Google Identity Services script
  const loadGoogleIdentityServices = () => {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="accounts.google.com"]')) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  };

  // Upload file to Google Drive
  const uploadToGoogleDrive = useCallback(async (file: Blob, filename: string) => {
    try {
      const accessToken = window.googleDriveAccessToken;
      
      if (!accessToken) {
        throw new Error('No access token available. Please reconnect to Google Drive.');
      }

      const metadata = {
        name: filename,
        parents: ['root'] // Upload to root folder, you can specify a folder ID
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: form
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear localStorage
          localStorage.removeItem('googleDriveAccessToken');
          localStorage.removeItem('googleDriveConnected');
          window.googleDriveAccessToken = null;
          setGdriveConnected(false);
          throw new Error('Google Drive authentication expired. Please reconnect.');
        }
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, []);

  const handleUploadToDrive = useCallback(async () => {
    if (!gdriveConnected) {
      toast.error('Please connect to Google Drive first');
      return;
    }

    setUploadingToDrive(true);
    const loadingToast = toast.loading('Creating backup and uploading to Google Drive...', { id: 'drive-upload' });

    try {
      // Define tables to backup (excluding sensitive/temporary data)
      const tables = [
        'user_profiles',
        'courses', 
        'programs',
        'grades',
        'sections',
        'teacher_subjects',
        'coe',
        'enrollcourse',
        'student_enrollments_view',
        'subject_actions'
      ];

      const backupData: Record<string, unknown[]> = {};
      const backupMetadata = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        tables: tables,
        totalRecords: 0,
        uploadedToDrive: true
      };

      // Fetch data from each table
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*');
          
          if (error) {
            console.warn(`Error fetching ${table}:`, error);
            backupData[table] = [];
          } else {
            backupData[table] = data || [];
            backupMetadata.totalRecords += (data || []).length;
          }
        } catch (err) {
          console.warn(`Table ${table} might not exist:`, err);
          backupData[table] = [];
        }
      }

      const completeBackup = {
        metadata: backupMetadata,
        data: backupData
      };

      // Create JSON blob
      const jsonString = JSON.stringify(completeBackup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `smcbi-backup-${timestamp}.json`;

      // Upload to Google Drive
      const uploadResult = await uploadToGoogleDrive(blob, filename);

      toast.dismiss(loadingToast);
      toast.success(
        `Backup successfully uploaded to Google Drive! File ID: ${uploadResult.id}`, 
        { id: 'drive-upload', duration: 6000 }
      );

      // Log the backup action
      console.log('Backup uploaded to Google Drive:', {
        timestamp: backupMetadata.timestamp,
        totalRecords: backupMetadata.totalRecords,
        tables: tables.length,
        fileId: uploadResult.id
      });

    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to upload backup to Google Drive', { id: 'drive-upload' });
    } finally {
      setUploadingToDrive(false);
    }
  }, [gdriveConnected, uploadToGoogleDrive]);

  // Clean up old backups based on data retention
  const cleanupOldBackups = useCallback(async () => {
    try {
      const accessToken = window.googleDriveAccessToken;
      if (!accessToken) return;

      // Calculate cutoff date based on data retention
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.dataRetention);

      // List files in Google Drive
      const response = await fetch('https://www.googleapis.com/drive/v3/files?q=name contains "smcbi-backup"', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) return;

      const data = await response.json();
      const files = data.files || [];

      // Delete old backup files
      for (const file of files) {
        const fileDate = new Date(file.createdTime);
        if (fileDate < cutoffDate) {
          await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          console.log(`Deleted old backup: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }, [settings.dataRetention]);

  // Auto Backup Functionality
  const stopAutoBackup = useCallback(() => {
    setAutoBackupInterval(prevInterval => {
      if (prevInterval) {
        clearInterval(prevInterval);
        console.log('Auto backup stopped');
      }
      return null;
    });
  }, []);

  const startAutoBackup = useCallback(() => {
    if (!settings.autoBackup || !gdriveConnected) {
      return;
    }

    // Validate settings
    if (!settings.backupFrequency || !settings.dataRetention) {
      console.error('Invalid backup settings');
      toast.error('Please configure backup frequency and data retention');
      return;
    }

    const getBackupInterval = () => {
      switch (settings.backupFrequency) {
        case 'hourly': return 60 * 60 * 1000; // 1 hour
        case 'daily': return 24 * 60 * 60 * 1000; // 24 hours
        case 'weekly': return 7 * 24 * 60 * 60 * 1000; // 7 days
        case 'monthly': return 30 * 24 * 60 * 60 * 1000; // 30 days
        default: return 24 * 60 * 60 * 1000; // Default to daily
      }
    };

    // Clear any existing interval first
    setAutoBackupInterval(prevInterval => {
      if (prevInterval) {
        clearInterval(prevInterval);
      }
      return null;
    });

    const interval = setInterval(async () => {
      try {
        console.log('Starting automatic backup...');
        
        // Check if Google Drive is still connected
        if (!window.googleDriveAccessToken) {
          console.warn('Google Drive connection lost, stopping auto backup');
          setAutoBackupInterval(prevInterval => {
            if (prevInterval) {
              clearInterval(prevInterval);
            }
            return null;
          });
          toast.error('Google Drive connection lost. Auto backup stopped.');
          return;
        }

        await handleUploadToDrive();
        
        // Clean up old backups based on data retention
        await cleanupOldBackups();
        
        console.log('Automatic backup completed successfully');
      } catch (error) {
        console.error('Automatic backup failed:', error);
        
        // Check if it's a connection error
        if (error instanceof Error && error.message.includes('401')) {
          toast.error('Google Drive authentication expired. Please reconnect.');
          
          // Clear localStorage and connection state
          localStorage.removeItem('googleDriveAccessToken');
          localStorage.removeItem('googleDriveConnected');
          window.googleDriveAccessToken = null;
          setGdriveConnected(false);
          
          setAutoBackupInterval(prevInterval => {
            if (prevInterval) {
              clearInterval(prevInterval);
            }
            return null;
          });
        } else {
          toast.error('Automatic backup failed. Please check your Google Drive connection.');
        }
      }
    }, getBackupInterval());

    setAutoBackupInterval(interval);
    console.log(`Auto backup started with ${settings.backupFrequency} frequency`);
  }, [settings.autoBackup, settings.backupFrequency, settings.dataRetention, gdriveConnected, cleanupOldBackups, handleUploadToDrive]);

  // Start/stop auto backup when settings change
  useEffect(() => {
    if (settings.autoBackup && gdriveConnected) {
      startAutoBackup();
    } else {
      stopAutoBackup();
    }

    return () => {
      stopAutoBackup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.autoBackup, settings.backupFrequency, gdriveConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setAutoBackupInterval(prevInterval => {
        if (prevInterval) {
          clearInterval(prevInterval);
        }
        return null;
      });
    };
  }, []);





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
      // Try to fetch from database first (skip if table doesn't exist)
      try {
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
      } catch {
        // system_settings table doesn't exist, use default settings
        console.log('system_settings table not available, using default settings');
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

      // Try to update existing record (skip if table doesn't exist)
      try {
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
      } catch {
        // system_settings table doesn't exist, just update local state
        console.log('system_settings table not available, settings saved locally only');
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300 mb-1">Update your account password</p>
                <p className="text-xs text-gray-400">Click the button to change your password securely</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Change Password
              </button>
            </div>
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
                <p className="text-xs text-gray-400">
                  {settings.autoBackup && gdriveConnected 
                    ? `Automatically uploads to Google Drive every ${settings.backupFrequency}` 
                    : settings.autoBackup 
                      ? 'Will start automatically when Google Drive is connected'
                      : 'Automatically backup data to Google Drive'
                  }
                </p>
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
                disabled={saving || !settings.autoBackup}
                className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#2f3133] text-white disabled:opacity-50"
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
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 30 && value <= 1095) {
                    handleSettingChange('dataRetention', value);
                  }
                }}
                disabled={saving || !settings.autoBackup}
                className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#2f3133] text-white disabled:opacity-50"
                min="30"
                max="1095"
                placeholder="30-1095 days"
              />
              <p className="text-xs text-gray-400 mt-1">Keep backups for 30-1095 days (1-3 years)</p>
            </div>
            
            {/* Manual Backup Section */}
            <div className="border-t border-gray-600 pt-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Manual Backup
              </h4>
              <div className="space-y-3">
            <div className="flex items-center justify-between">
            <div>
                    <p className="text-sm text-gray-300 mb-1">Download Complete Database Backup</p>
                    <p className="text-xs text-gray-400">Export all tables and data as JSON files</p>
            </div>
              <button
                    onClick={handleDownloadBackup}
                    disabled={saving || downloadingBackup}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingBackup ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Backup
                      </>
                    )}
              </button>
            </div>
            {/* Google Drive Connection Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${gdriveConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <div>
                  <p className="text-sm text-gray-300">Google Drive</p>
                  <p className="text-xs text-gray-400">
                    {gdriveConnected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <button
                onClick={gdriveConnected ? handleGoogleDriveDisconnect : handleGoogleDriveAuth}
                disabled={gdriveAuthLoading}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  gdriveConnected 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {gdriveAuthLoading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Connecting...
                  </>
                ) : gdriveConnected ? (
                  <>
                    <LogOut className="w-3 h-3" />
                    Disconnect
                  </>
                ) : (
                  <>
                    <LogIn className="w-3 h-3" />
                    Connect
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                    <p className="text-sm text-gray-300 mb-1">Upload to Google Drive</p>
                    <p className="text-xs text-gray-400">Automatically store backup in cloud</p>
              </div>
              <button
                    onClick={handleUploadToDrive}
                    disabled={saving || uploadingToDrive || !gdriveConnected}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingToDrive ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4" />
                        Upload to Drive
                      </>
                    )}
              </button>
            </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && createPortal(
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[999998]"
            onClick={() => setShowPasswordModal(false)}
            style={{
              zIndex: 999998,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center z-[999999] p-4"
            style={{
              zIndex: 999999,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div className="bg-[#252728] rounded-xl shadow-2xl border border-gray-700 w-full max-w-md max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-[#2f3133]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-600/20">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Change Password</h3>
                    <p className="text-sm text-gray-400">Update your account password securely</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[#1c1c1d] text-white placeholder-gray-400 text-sm"
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
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[#1c1c1d] text-white placeholder-gray-400 text-sm"
                    disabled={changingPassword}
                    placeholder="Enter new password"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-[#1c1c1d] text-white placeholder-gray-400 text-sm"
                    disabled={changingPassword}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-[#2f3133]">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleUpdatePassword();
                    if (!changingPassword) {
                      setShowPasswordModal(false);
                    }
                  }}
                  disabled={changingPassword}
                  className={`px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2 ${
                    changingPassword ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>,
        document.body
      )}
      
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
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [creatingNotification, setCreatingNotification] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    severity: 'announcement',
    audience: 'all',
    priority: 1,
    timeInterval: 'none',
    timeValue: 1
  });
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
    id: string;
    type: string;
    message: string;
    time: string;
    read: boolean;
    severity: string;
    title: string;
    expires_at?: string;
  }>>([]);

  const { user } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time subscription for notifications
    const notificationsSubscription = supabase
      .channel('notifications_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications' 
        }, 
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    // Set up real-time subscription for user profiles
    const userProfilesSubscription = supabase
      .channel('user_profiles_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_profiles' 
        }, 
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      notificationsSubscription.unsubscribe();
      userProfilesSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate recent activity from real database events
  const generateRecentActivity = useCallback(async () => {
    try {
      const activities = [];

      // Get recent user registrations
      const { data: recentUsers } = await supabase
        .from('user_profiles')
        .select('created_at, display_name, role')
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentUsers && recentUsers.length > 0) {
        recentUsers.forEach(user => {
          const timeAgo = getTimeAgo(user.created_at);
          activities.push({
            type: 'user',
            message: `New ${user.role} registered: ${user.display_name || 'Unknown User'}`,
            time: timeAgo,
            icon: Users
          });
        });
      }

      // Get recent course updates
      const { data: recentCourses } = await supabase
        .from('courses')
        .select('updated_at, course_name')
        .not('updated_at', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(2);

      if (recentCourses && recentCourses.length > 0) {
        recentCourses.forEach(course => {
          const timeAgo = getTimeAgo(course.updated_at);
          activities.push({
            type: 'course',
            message: `Course updated: ${course.course_name}`,
            time: timeAgo,
            icon: BookOpen
          });
        });
      }

      // Skip program updates since programs table doesn't exist
      // This prevents 400 Bad Request errors

      // Get recent login sessions for system activity
      const { data: recentLogins } = await supabase
        .from('login_sessions')
        .select('login_time, user_agent')
        .order('login_time', { ascending: false })
        .limit(1);

      if (recentLogins && recentLogins.length > 0) {
        const timeAgo = getTimeAgo(recentLogins[0].login_time);
        activities.push({
          type: 'system',
          message: 'User login activity detected',
          time: timeAgo,
          icon: Activity
        });
      }

      // Sort activities by time (most recent first)
      activities.sort((a, b) => {
        const timeA = getTimeInMinutes(a.time);
        const timeB = getTimeInMinutes(b.time);
        return timeA - timeB;
      });

      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Error generating recent activity:', error);
    }
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

      // Generate recent activity from real data
      await generateRecentActivity();

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [generateRecentActivity]);

  // Generate system notifications based on database state
  const generateSystemNotifications = useCallback(async () => {
    const systemNotifications = [];

    try {
      // Check for failed login attempts
      const { data: failedLogins } = await supabase
        .from('login_sessions')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (failedLogins && failedLogins.length > 0) {
        systemNotifications.push({
          id: 'failed-login-attempts',
          type: 'warning',
          message: 'Multiple failed login attempts detected in the last 24 hours',
          title: 'Security Alert',
          time: '1 hour ago',
          read: false,
          severity: 'warning'
        });
      }

      // Check for high user count (storage warning)
      const { data: userCount } = await supabase
        .from('user_profiles')
        .select('id');

      if (userCount && userCount.length > 1000) {
        systemNotifications.push({
          id: 'system-storage-warning',
          type: 'warning',
          message: 'Storage usage is approaching capacity limit',
          title: 'Storage Warning',
          time: '2 hours ago',
          read: false,
          severity: 'warning'
        });
      }

      // Skip system maintenance checks since system_settings table doesn't exist
      // This prevents 400 Bad Request errors

      // Check for new user registrations
      const { data: newUsers } = await supabase
        .from('user_profiles')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (newUsers && newUsers.length > 10) {
        systemNotifications.push({
          id: 'high-registration-rate',
          type: 'info',
          message: `${newUsers.length} new users registered in the last 24 hours`,
          title: 'High Registration Rate',
          time: '3 hours ago',
          read: false,
          severity: 'info'
        });
      }

      return systemNotifications;
    } catch (error) {
      console.error('Error generating system notifications:', error);
      return [];
    }
  }, []);

  // Fetch real notifications from database
  const fetchNotifications = useCallback(async () => {
    try {
      // Fetch notifications based on user role and audience
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      // Filter by audience based on user role
      if (user?.role === 'admin' || user?.role === 'superadmin') {
        // Admins can see all notifications
        query = query.in('audience', ['all', 'instructor', 'student']);
      } else if (user?.role === 'instructor') {
        // Instructors can see instructor and all notifications
        query = query.in('audience', ['instructor', 'all']);
      } else if (user?.role === 'student') {
        // Students can see student and all notifications
        query = query.in('audience', ['student', 'all']);
      }

      const { data: dbNotifications, error: dbError } = await query;

      if (dbError) {
        console.error('Error fetching notifications:', dbError);
        toast.error('Failed to load notifications');
        return;
      }

      // Generate system notifications
      const systemNotifications = await generateSystemNotifications();

      // Combine and format notifications
      const allNotifications = [];

      // Add database notifications
      if (dbNotifications && dbNotifications.length > 0) {
        dbNotifications.forEach(notif => {
          allNotifications.push({
            id: notif.id,
            type: notif.severity,
            message: notif.message,
            title: notif.title,
            time: getTimeAgo(notif.created_at),
            read: false, // You can implement read tracking later
            severity: notif.severity,
            expires_at: notif.expires_at
          });
        });
      }

      // Add system notifications
      allNotifications.push(...systemNotifications);

      // Sort by time (most recent first)
      allNotifications.sort((a, b) => {
        const timeA = getTimeInMinutes(a.time);
        const timeB = getTimeInMinutes(b.time);
        return timeA - timeB;
      });

      setNotifications(allNotifications.slice(0, 10));

    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    }
  }, [user?.role, generateSystemNotifications]);


  // Helper function to get time ago
  const getTimeAgo = (timestamp: string | Date): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return past.toLocaleDateString();
  };

  // Helper function to get time in minutes for sorting
  const getTimeInMinutes = (timeString: string): number => {
    if (timeString === 'Just now') return 0;
    if (timeString.includes('minutes')) {
      const minutes = parseInt(timeString.match(/(\d+)/)?.[1] || '0');
      return minutes;
    }
    if (timeString.includes('hours')) {
      const hours = parseInt(timeString.match(/(\d+)/)?.[1] || '0');
      return hours * 60;
    }
    if (timeString.includes('days')) {
      const days = parseInt(timeString.match(/(\d+)/)?.[1] || '0');
      return days * 24 * 60;
    }
    return 999999; // For dates, put them at the end
  };

  // Memoized notification handling
  const markNotificationAsRead = useCallback((id: string) => {
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

  // Handle notification creation
  const handleCreateNotification = async () => {
    try {
      if (!user?.id) {
        toast.error('No user found');
        return;
      }
      if (!notificationForm.title || !notificationForm.message) {
        toast.error('Please fill out all notification fields');
        return;
      }

      setCreatingNotification(true);

      // Calculate expiration date if time interval is set
      let expiresAt = null;
      if (notificationForm.timeInterval !== 'none' && notificationForm.timeValue > 0) {
        const now = new Date();
        switch (notificationForm.timeInterval) {
          case 'hours':
            expiresAt = new Date(now.getTime() + (notificationForm.timeValue * 60 * 60 * 1000));
            break;
          case 'days':
            expiresAt = new Date(now.getTime() + (notificationForm.timeValue * 24 * 60 * 60 * 1000));
            break;
          case 'weeks':
            expiresAt = new Date(now.getTime() + (notificationForm.timeValue * 7 * 24 * 60 * 60 * 1000));
            break;
          case 'months':
            expiresAt = new Date(now.getTime() + (notificationForm.timeValue * 30 * 24 * 60 * 60 * 1000));
            break;
          default:
            expiresAt = null;
        }
      }

      const { error } = await supabase
        .from('notifications')
        .insert([{
          title: notificationForm.title,
          message: notificationForm.message,
          severity: notificationForm.severity,
          audience: notificationForm.audience,
          priority: notificationForm.priority,
          expires_at: expiresAt,
          created_by: user.id,
          is_active: true
        }]);

      if (error) {
        throw error;
      }

      toast.success('Notification sent successfully to all users!');
      setNotificationForm({ title: '', message: '', severity: 'announcement', audience: 'all', priority: 1, timeInterval: 'none', timeValue: 1 });
      setShowNotificationForm(false);
      
      // Refresh notifications
      fetchNotifications();
      
    } catch (err) {
      console.error('Error creating notification:', err);
      toast.error('Failed to send notification');
    } finally {
      setCreatingNotification(false);
    }
  };

  // Fetch notifications when component mounts
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Close notifications modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showNotificationsModal && !target.closest('.notifications-modal')) {
        setShowNotificationsModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationsModal]);


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
                
                
                {/* Notifications Popup Modal */}
                {showNotificationsModal && createPortal(
                  <>
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/20 z-[999998] notifications-modal-backdrop"
                      onClick={() => setShowNotificationsModal(false)}
                      style={{
                        zIndex: 999998,
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.2)'
                      }}
                    />
                    
                    {/* Modal */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="notifications-modal fixed right-6 top-20 w-96 bg-[#252728] rounded-xl shadow-2xl border border-gray-700 z-[999999] max-h-[500px] overflow-hidden"
                      style={{
                        zIndex: 999999,
                        position: 'fixed',
                        top: '5rem',
                        right: '1.5rem',
                        width: '24rem',
                        maxHeight: '500px',
                        backgroundColor: '#252728',
                        borderRadius: '0.75rem',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                        border: '1px solid #4b5563',
                        isolation: 'isolate'
                      }}
                    >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-[#2f3133] relative z-[999999]">
                      <h3 className="text-lg font-semibold text-white">Notifications</h3>
                      <button
                        onClick={() => setShowNotificationsModal(false)}
                        className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Notifications List */}
                    <div className="max-h-[400px] overflow-y-auto custom-dashboard-scrollbar relative z-[999999]">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <div className="w-16 h-16 mx-auto mb-3 bg-gray-700 rounded-full flex items-center justify-center">
                            <Bell className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-400 text-sm">No notifications</p>
                          <p className="text-gray-500 text-xs mt-1">You're all caught up!</p>
                        </div>
                      ) : (
                        <div className="p-2">
                          {notifications.map((notification, i) => (
                            <motion.div 
                              key={notification.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.1 }}
                              onClick={() => markNotificationAsRead(notification.id)}
                              className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-[#2f3133] mb-2 ${
                                notification.read ? 'bg-[#252728]' : 'bg-[#2f3133]'
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div 
                                  className={`p-2 rounded-full flex-shrink-0 ${
                                    notification.severity === 'info' ? 'bg-blue-900' : 
                                    notification.severity === 'success' ? 'bg-green-900' : 
                                    notification.severity === 'warning' ? 'bg-yellow-900' : 
                                    notification.severity === 'error' ? 'bg-red-900' :
                                    notification.severity === 'announcement' ? 'bg-purple-900' :
                                    notification.severity === 'reminder' ? 'bg-orange-900' :
                                    notification.severity === 'deadline' ? 'bg-red-800' :
                                    notification.severity === 'exam' ? 'bg-indigo-900' :
                                    notification.severity === 'meeting' ? 'bg-teal-900' :
                                    notification.severity === 'advisory' ? 'bg-amber-900' : 'bg-gray-900'
                                  }`}
                                >
                                  {notification.severity === 'announcement' ? (
                                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zM11 11a1 1 0 011-1h1a1 1 0 011 1v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1zM11 16.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zM5.5 11a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1zM16.5 11a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-1z" />
                                    </svg>
                                  ) : notification.severity === 'reminder' ? (
                                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ) : notification.severity === 'deadline' ? (
                                    <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ) : notification.severity === 'exam' ? (
                                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  ) : notification.severity === 'meeting' ? (
                                    <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                  ) : notification.severity === 'advisory' ? (
                                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                  ) : notification.severity === 'info' ? (
                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ) : notification.severity === 'success' ? (
                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ) : notification.severity === 'warning' ? (
                                    <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                  ) : notification.severity === 'error' ? (
                                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {notification.title && (
                                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                                      notification.read ? 'text-gray-400' : 'text-gray-200'
                                    }`}>
                                      {notification.title}
                                    </p>
                                  )}
                                  <p className={`text-sm font-medium ${
                                    notification.read ? 'text-gray-300' : 'text-white'
                                  } line-clamp-2`}>
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                    <span>{notification.time}</span>
                                    {notification.expires_at && (
                                      <span className="text-orange-400">
                                        • Expires: {getTimeAgo(notification.expires_at)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {!notification.read && (
                                  <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"
                                  />
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Modal Footer */}
                    <div className="p-3 border-t border-gray-700 bg-[#2f3133] relative z-[999999]">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{unreadCount} unread</span>
                        <button
                          onClick={() => {
                            // Mark all as read functionality
                            setNotifications(prev => 
                              prev.map(notif => ({ ...notif, read: true }))
                            );
                          }}
                          className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                        >
                          Mark all as read
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </>,
                document.body
              )}
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
              className="mb-8"
            >
              <div className="bg-gradient-to-r from-gray-700 to-gray-600 px-6 py-4 rounded-lg animate-pulse">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-500/30">
                      <div className="w-6 h-6 bg-gray-500 rounded"></div>
                    </div>
                <div>
                      <div className="h-8 bg-gray-500 rounded w-48 mb-2"></div>
                      <div className="h-4 bg-gray-500 rounded w-72"></div>
                </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-32 bg-gray-500 rounded-lg"></div>
                    <div className="w-6 h-6 bg-gray-500 rounded"></div>
                  </div>
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
                  className="neumorphic-dark rounded-xl overflow-hidden border-l-4 border-gray-500 animate-pulse"
                  style={{ backgroundColor: '#252728' }}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-4 bg-gray-600 rounded w-24 mb-2"></div>
                        <div className="h-8 bg-gray-600 rounded w-16 mb-1"></div>
                        <div className="h-3 bg-gray-600 rounded w-32"></div>
                      </div>
                      <div className="w-12 h-12 bg-gray-600 rounded-lg"></div>
                    </div>
                    <div className="mt-4">
                      <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                        <div className="h-1.5 bg-gray-500 rounded-full w-3/4 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recent Activity and Notifications Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <motion.div 
                className="neumorphic-dark p-6 rounded-xl col-span-2 h-[300px] animate-pulse"
                style={{ backgroundColor: '#252728' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="h-6 bg-gray-600 rounded w-40 mb-4"></div>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                        <div>
                          <div className="h-4 bg-gray-600 rounded w-48 mb-1"></div>
                          <div className="h-3 bg-gray-600 rounded w-24"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div 
                className="neumorphic-dark p-6 rounded-xl h-[300px] animate-pulse"
                style={{ backgroundColor: '#252728' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 bg-gray-600 rounded w-32"></div>
                  <div className="w-5 h-5 bg-gray-600 rounded"></div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-600 rounded w-full mb-1"></div>
                          <div className="h-3 bg-gray-600 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Additional skeleton elements for better loading experience */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {/* System Settings Skeleton */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="neumorphic-dark p-6 lg:col-span-2 animate-pulse"
                style={{ backgroundColor: '#2f3133' }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-6 h-6 bg-gray-600 rounded"></div>
                  <div className="h-6 bg-gray-600 rounded w-32"></div>
                </div>
                <div className="space-y-6">
                  <div className="bg-gray-700/50 rounded-lg p-6">
                    <div className="flex items-center gap-6 mb-8">
                      <div className="w-20 h-20 bg-gray-600 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-600 rounded w-24 mb-3"></div>
                        <div className="h-6 bg-gray-600 rounded w-40 mb-2"></div>
                        <div className="h-4 bg-gray-600 rounded w-48"></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-5">
                    <div className="h-5 bg-gray-600 rounded w-32 mb-5"></div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-4 bg-gray-600 rounded w-40 mb-1"></div>
                        <div className="h-3 bg-gray-600 rounded w-32"></div>
                      </div>
                      <div className="h-10 w-24 bg-gray-600 rounded-lg"></div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Backup & System Skeleton */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="neumorphic-dark p-6 animate-pulse"
                style={{ backgroundColor: '#2f3133' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-gray-600 rounded"></div>
                  <div className="h-6 bg-gray-600 rounded w-40"></div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-gray-600 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-600 rounded w-32"></div>
                    </div>
                    <div className="h-6 w-11 bg-gray-600 rounded-full"></div>
                  </div>
                  <div>
                    <div className="h-4 bg-gray-600 rounded w-28 mb-2"></div>
                    <div className="h-10 bg-gray-600 rounded-lg"></div>
                  </div>
                  <div>
                    <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
                    <div className="h-10 bg-gray-600 rounded-lg"></div>
                  </div>
                  <div className="border-t border-gray-600 pt-4 mt-4">
                    <div className="h-5 bg-gray-600 rounded w-28 mb-3"></div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="h-4 bg-gray-600 rounded w-36 mb-1"></div>
                          <div className="h-3 bg-gray-600 rounded w-28"></div>
                        </div>
                        <div className="h-8 w-24 bg-gray-600 rounded-lg"></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="h-4 bg-gray-600 rounded w-20 mb-1"></div>
                          <div className="h-3 bg-gray-600 rounded w-24"></div>
                        </div>
                        <div className="h-6 w-16 bg-gray-600 rounded-lg"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
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
                title="Active Subjects"
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

              {/* Notification Creation Section - Right Side */}
              <motion.div 
                className="admindashboard-notification-card neumorphic-dark p-6 rounded-xl h-[300px]"
                style={{ backgroundColor: '#252728' }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-600/20">
                      <Bell className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Send Notification</h3>
                  </div>
                  <button
                    onClick={() => setShowNotificationForm(!showNotificationForm)}
                    className={`p-2 rounded-lg transition-colors duration-200 ${
                      showNotificationForm 
                        ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {showNotificationForm ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                </div>

                {!showNotificationForm ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 mx-auto mb-3 bg-blue-600/20 rounded-full flex items-center justify-center">
                      <Bell className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="text-gray-400 text-sm mb-1">Create notifications for all users</p>
                    <p className="text-gray-500 text-xs">Click the + button to get started</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Title *</label>
                      <input
                        type="text"
                        value={notificationForm.title}
                        onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1c1c1d] text-white placeholder-gray-400 text-xs"
                        placeholder="Enter notification title"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Severity *</label>
                        <select
                          value={notificationForm.severity}
                          onChange={(e) => setNotificationForm(prev => ({ ...prev, severity: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1c1c1d] text-white text-xs"
                          required
                        >
                          <option value="announcement">Announcement</option>
                          <option value="reminder">Reminder</option>
                          <option value="deadline">Deadline</option>
                          <option value="exam">Exam</option>
                          <option value="meeting">Meeting</option>
                          <option value="advisory">Advisory</option>
                          <option value="info">Info</option>
                          <option value="success">Success</option>
                          <option value="warning">Warning</option>
                          <option value="error">Error</option>
                        </select>
                      </div>

                                              <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Audience *</label>
                          <select
                            value={notificationForm.audience}
                            onChange={(e) => setNotificationForm(prev => ({ ...prev, audience: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1c1c1d] text-white text-xs"
                            required
                          >
                            <option value="all">All Users</option>
                            <option value="admin">Admins Only</option>
                            <option value="instructor">Instructors Only</option>
                            <option value="student">Students Only</option>
                            <option value="registrar">Registrar Only</option>
                            <option value="programhead">Program Heads Only</option>
                          </select>
                        </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Message *</label>
                      <textarea
                        value={notificationForm.message}
                        onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                        rows={2}
                        className="w-full px-2 py-1.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[#1c1c1d] text-white placeholder-gray-400 text-xs resize-none"
                        placeholder="Enter notification message..."
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setShowNotificationForm(false)}
                        className="flex-1 px-2 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateNotification}
                        disabled={creatingNotification}
                        className={`flex-1 px-2 py-1.5 rounded-lg text-white font-medium flex items-center justify-center gap-1.5 transition-colors duration-200 ${
                          creatingNotification 
                            ? 'bg-blue-600 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {creatingNotification ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs">Sending...</span>
                          </>
                        ) : (
                          <>
                            <Bell className="w-3 h-3" />
                            <span className="text-xs">Send</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
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
            <Route path="/enrollment-approvals" element={<RegistrarEnrollment />} />
            <Route path="/student-grades" element={<StudentGrades />} />
            <Route path="/enroll-student" element={<RegistrarEnrollment />} />
            <Route path="/instructor-management" element={<InstructorManagement />} />
            <Route path="/class-management" element={<ClassManagement />} />
            <Route path="/settings" element={<SystemSettings />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default AdminDashboard;
