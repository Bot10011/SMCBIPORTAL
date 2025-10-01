import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, UserCircle, Briefcase, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Removed cropping/upload utilities; avatar will be fetched from Google account metadata

interface TeacherProfile {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  role: string;
  department?: string;
  is_active: boolean;
  profile_picture_url?: string;
}

const TeacherSettings: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  
  // Password change modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [verifyingCurrentPassword, setVerifyingCurrentPassword] = useState(false);
  const [currentPasswordValid, setCurrentPasswordValid] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  
  
  // Edit profile and change password removed for this view

  // Helper function to get student name
  const getStudentName = (student: {display_name?: string, first_name?: string, last_name?: string, middle_name?: string}) => {
    if (student?.display_name && student.display_name.trim() !== '') {
      return student.display_name;
    }
    
    // Fallback to concatenating first_name, last_name, middle_name
    const firstName = student?.first_name || '';
    const lastName = student?.last_name || '';
    const middleName = student?.middle_name || '';
    
    const nameParts = [firstName, middleName, lastName].filter(part => part.trim() !== '');
    return nameParts.length > 0 ? nameParts.join(' ') : 'Unknown Student';
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (user?.id) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (error) throw error;
          setProfile(data);
          
          // Priority 1: Use display_name and avatar_url from database profile
          let resolvedName = data?.display_name || '';
          let resolvedAvatar = data?.avatar_url || null;
          
          // Priority 2: Fallback to constructed name from first/middle/last names
          if (!resolvedName) {
            resolvedName = getStudentName(data);
          }
          
          // Priority 3: Fallback to username if no name available
          if (!resolvedName) {
            resolvedName = data?.username || '';
          }
          
          // Priority 4: Fallback to Google metadata if database fields are empty
          if (!resolvedName || !resolvedAvatar) {
            const { data: authUserData } = await supabase.auth.getUser();
            const authUserUnknown = authUserData?.user;
            const authUserObj = authUserUnknown && typeof authUserUnknown === 'object'
              ? (authUserUnknown as {
                  user_metadata?: Record<string, unknown> | null;
                  identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> | null }> | null;
                })
              : undefined;

            const identities = Array.isArray(authUserObj?.identities) ? authUserObj?.identities : [];
            const googleIdentity = identities.find(i => i?.provider === 'google');
            const identityData = googleIdentity?.identity_data || undefined;
            const metadata = authUserObj?.user_metadata || undefined;

            // Only use Google metadata if database fields are empty
            if (!resolvedName) {
              const nameFromMetadata = (metadata?.['full_name'] as string | undefined) || (metadata?.['name'] as string | undefined) || (metadata?.['given_name'] as string | undefined) || (metadata?.['preferred_username'] as string | undefined);
              const nameFromIdentity = (identityData?.['name'] as string | undefined) || (identityData?.['full_name'] as string | undefined) || (identityData?.['given_name'] as string | undefined);
              resolvedName = nameFromMetadata || nameFromIdentity || resolvedName;
            }
            
            if (!resolvedAvatar) {
              const avatarFromIdentity = (identityData?.['avatar_url'] as string | undefined) || (identityData?.['picture'] as string | undefined);
              const avatarFromMetadata = (metadata?.['avatar_url'] as string | undefined) || (metadata?.['picture'] as string | undefined) || (metadata?.['profile_picture'] as string | undefined);
              resolvedAvatar = avatarFromIdentity || avatarFromMetadata || null;
            }
          }

          // Priority 5: Final fallback to Google API if still no avatar
          if (!resolvedAvatar) {
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const providerToken = sessionData?.session?.provider_token;
              if (providerToken) {
                const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${providerToken}` },
                });
                if (resp.ok) {
                  const json = (await resp.json()) as Record<string, unknown>;
                  const apiPicture = (json['picture'] as string | undefined) || null;
                  if (apiPicture) resolvedAvatar = apiPicture;
                }
              }
            } catch {
              // ignore network errors; fall back to initials avatar
            }
          }

          // Priority 6: Generate initials avatar if no image available
          if (!resolvedAvatar && resolvedName) {
            resolvedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}`;
          }
          
          setDisplayName(resolvedName);
          setProfilePictureUrl(resolvedAvatar);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id]);

  // Removed upload and crop handlers; avatar is sourced from Google metadata

  // Removed edit form initialization

  // Removed handleEditProfile

  // Removed handleChangePassword

  // Password change handlers
  const handleOpenPasswordModal = () => {
    setShowPasswordModal(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setCurrentPasswordValid(false);
    setCurrentPasswordError('');
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangingPassword(false);
    setCurrentPasswordValid(false);
    setCurrentPasswordError('');
    setVerifyingCurrentPassword(false);
    setCurrentPasswordValid(false);
    setCurrentPasswordError('');
    setVerifyingCurrentPassword(false);
  };

  const verifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setCurrentPasswordError('Please enter your current password');
      return;
    }

    setVerifyingCurrentPassword(true);
    setCurrentPasswordError('');

    try {
      // Attempt to sign in with current credentials to verify password
      const { error } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword
      });

      if (error) {
        setCurrentPasswordError('Current password is incorrect');
        setCurrentPasswordValid(false);
      } else {
        setCurrentPasswordValid(true);
        setCurrentPasswordError('');
        toast.success('Current password verified!');
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      setCurrentPasswordError('Failed to verify password. Please try again.');
      setCurrentPasswordValid(false);
    } finally {
      setVerifyingCurrentPassword(false);
    }
  };  const handleChangePassword = async () => {
    // Validation
    if (!currentPasswordValid) {
      toast.error('Please verify your current password first');
      return;
    }
    
    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    
    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error('Password update error:', error);
        toast.error(error.message || 'Failed to update password');
        return;
      }
      
      toast.success('Password updated successfully!');
      handleClosePasswordModal();
      
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to update password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br  via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h3>
          <p className="text-gray-600">Unable to load your profile information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br via-blue-50 to-indigo-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5 }}
        className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl mx-auto rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-white/20 relative transform-gpu will-change-transform transition-all duration-300 ease-out"
        style={{
          backgroundColor: '#FFFFFFE6',
          boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.7), inset 2px 2px 4px rgba(0, 0, 0, 0.05)'
        }}
      >
       
        {/* Edit Profile Modal removed */}

        {/* Change Password Modal removed */}

        {/* Removed crop modal; avatar comes from Google metadata */}

        {/* Responsive Layout: Vertical on mobile, horizontal on larger screens */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6 md:gap-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="relative group inline-block mb-3">
              <div 
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center overflow-hidden border-2 sm:border-4 border-white/60 transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(145deg, #f0f0f0, #ffffff)',
                  boxShadow: '6px 6px 12px rgba(0, 0, 0, 0.1), -6px -6px 12px rgba(255, 255, 255, 0.7)'
                }}
              >
                {profilePictureUrl ? (
                  <img 
                    src={profilePictureUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={() => setProfilePictureUrl(null)}
                  />
                ) : (
                  <UserCircle className="w-16 h-16 sm:w-20 sm:h-20 text-gray-300" />
                )}
              </div>
            </div>
            
            <div className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-blue-700 rounded-full text-xs sm:text-sm font-semibold mb-1 text-center"
              style={{
                background: 'linear-gradient(145deg, #e1f5fe, #f8faff)',
                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.7)'
              }}
            >
              <Briefcase className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="truncate max-w-24 sm:max-w-none">{profile.role}</span>
            </div>
            <div className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium text-center ${profile.is_active ? 'text-green-700' : 'text-gray-600'}`}
              style={{
                background: profile.is_active 
                  ? 'linear-gradient(145deg, #e8f5e8, #f0fff0)' 
                  : 'linear-gradient(145deg, #f5f5f5, #ffffff)',
                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.7)'
              }}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${profile.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="whitespace-nowrap">{profile.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>

          {/* Profile Details Section */}
          <div className="flex-1 w-full space-y-2 sm:space-y-3">
            {/* Display Name */}
            {displayName && (
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl"
                style={{
                  background: 'linear-gradient(145deg, #f8f8f8, #ffffff)',
                  boxShadow: 'inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7)'
                }}
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <UserCircle className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 mb-0.5">Full Name</p>
                  <p className="text-gray-900 text-sm font-medium break-words">{displayName}</p>
                </div>
              </div>
            )}
            {/* Email */}
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl"
              style={{
                background: 'linear-gradient(145deg, #f8f8f8, #ffffff)',
                boxShadow: 'inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7)'
              }}
            >
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-0.5">Email</p>
                <p className="text-gray-900 text-sm font-medium break-all">{profile.email}</p>
              </div>
            </div>
            {/* Department */}
            {profile.department && (
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl"
                style={{
                  background: 'linear-gradient(145deg, #f8f8f8, #ffffff)',
                  boxShadow: 'inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7)'
                }}
              >
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-indigo-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 mb-0.5">Department</p>
                  <p className="text-gray-900 text-sm font-medium break-words">{profile.department}</p>
                </div>
              </div>
            )}
            
            {/* Change Password Button */}
            <div className="pt-2 sm:pt-4 flex justify-center md:justify-start">
              <button
                onClick={handleOpenPasswordModal}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md transform-gpu will-change-transform text-sm sm:text-base"
                style={{
                  backgroundColor: '#2563eb',
                  boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.2), -2px -2px 4px rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1d4ed8';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons removed */}
      </motion.div>

      {/* Change Password Modal - Using Portal for full screen coverage */}
      {showPasswordModal && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4" 
          style={{ 
            zIndex: 999999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
            padding: '0.5rem'
          }}
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === e.currentTarget) {
              handleClosePasswordModal();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-xs sm:max-w-sm md:max-w-md border border-white/20 relative"
            style={{
              backgroundColor: '#FFFFFFE6',
              boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.15), -8px -8px 16px rgba(255, 255, 255, 0.7), inset 2px 2px 4px rgba(0, 0, 0, 0.05)',
              maxHeight: '95vh',
              overflowY: 'auto',
              transform: 'translate3d(0, 0, 0)', // Force hardware acceleration
              backfaceVisibility: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">Change Password</h3>
              <button
                onClick={handleClosePasswordModal}
                className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl font-bold flex-shrink-0"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setCurrentPasswordValid(false);
                      setCurrentPasswordError('');
                    }}
                    disabled={currentPasswordValid}
                    className={`w-full px-3 py-2 pr-10 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base ${currentPasswordValid ? 'opacity-50' : ''}`}
                    style={{
                      background: 'linear-gradient(145deg, #f8f8f8, #ffffff)',
                      boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.7)'
                    }}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {currentPasswordError && (
                  <p className="text-red-500 text-xs mt-1">{currentPasswordError}</p>
                )}
                {currentPasswordValid && (
                  <p className="text-green-500 text-xs mt-1 flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    Current password verified
                  </p>
                )}
              </div>
              
              {/* New Password - Only show if current password is verified */}
              {currentPasswordValid && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        style={{
                          background: 'linear-gradient(145deg, #f8f8f8, #ffffff)',
                          boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.7)'
                        }}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        style={{
                          background: 'linear-gradient(145deg, #f8f8f8, #ffffff)',
                          boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.7)'
                        }}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={handleClosePasswordModal}
                className="flex-1 px-3 sm:px-4 py-2 text-gray-700 rounded-lg transition-all duration-200 text-sm sm:text-base order-2 sm:order-1"
                style={{
                  background: 'linear-gradient(145deg, #f0f0f0, #ffffff)',
                  boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.1), -4px -4px 8px rgba(255, 255, 255, 0.7)'
                }}
              >
                Cancel
              </button>
              {!currentPasswordValid ? (
                <button
                  type="button"
                  onClick={verifyCurrentPassword}
                  disabled={verifyingCurrentPassword || !currentPassword.trim()}
                  className="flex-1 px-3 sm:px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm sm:text-base order-1 sm:order-2"
                  style={{
                    backgroundColor: verifyingCurrentPassword ? '#9ca3af' : '#2563eb',
                    boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.2), -2px -2px 4px rgba(255, 255, 255, 0.1)'
                  }}
                >
                  {verifyingCurrentPassword ? (
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                      <span className="hidden sm:inline">Verifying...</span>
                      <span className="sm:hidden">Verifying</span>
                    </div>
                  ) : (
                    <span className="hidden sm:inline">Verify Password</span>
                  )}
                  {!verifyingCurrentPassword && (
                    <span className="sm:hidden">Verify</span>
                  )}
                </button>
              ) : (
                <button
                   onClick={handleChangePassword}
                   disabled={changingPassword}
                   className="flex-1 px-3 sm:px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm sm:text-base order-1 sm:order-2"
                   style={{
                     backgroundColor: changingPassword ? '#9ca3af' : '#2563eb',
                     boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.2), -2px -2px 4px rgba(255, 255, 255, 0.1)'
                   }}
                 >
                  {changingPassword ? (
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                      <span className="hidden sm:inline">Updating...</span>
                      <span className="sm:hidden">Updating</span>
                    </div>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Update Password</span>
                      <span className="sm:hidden">Update</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
    
  );
};

export default TeacherSettings; 
