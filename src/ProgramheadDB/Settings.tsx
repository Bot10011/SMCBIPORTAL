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
  const [step, setStep] = useState(1); // 1: verify current, 2: set new
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  
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
  setStep(1);
  setCurrentPassword('');
  setNewPassword('');
  setConfirmPassword('');
  setShowCurrentPassword(false);
  setShowNewPassword(false);
  setShowConfirmPassword(false);
  setErrorMsg('');
  };

  const handleClosePasswordModal = () => {
  setShowPasswordModal(false);
  setStep(1);
  setCurrentPassword('');
  setNewPassword('');
  setConfirmPassword('');
  setChangingPassword(false);
  setErrorMsg('');
  };

  const handleChangePassword = async () => {
    setErrorMsg('');
    // Step 1: Verify current password
    if (step === 1) {
      if (!currentPassword.trim()) {
        setErrorMsg('Please enter your current password');
        return;
      }
      setChangingPassword(true);
      try {
        // Try to re-authenticate user with current password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: profile?.email || '',
          password: currentPassword,
        });
        if (error || !data?.user) {
          setErrorMsg('Current password is incorrect');
          setChangingPassword(false);
          return;
        }
        setStep(2);
        setChangingPassword(false);
      } catch {
        setErrorMsg('Failed to verify current password');
        setChangingPassword(false);
      }
      return;
    }
    // Step 2: Set new password
    if (!newPassword.trim()) {
      setErrorMsg('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setErrorMsg('New password must be different from current password');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        setErrorMsg(error.message || 'Failed to update password');
        setChangingPassword(false);
        return;
      }
      toast.success('Password updated successfully!');
      handleClosePasswordModal();
    } catch {
      setErrorMsg('Failed to update password. Please try again.');
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
    <div className="min-h-screen bg-gradient-to-br  via-blue-50 to-indigo-50 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl mx-auto bg-white/80 rounded-3xl shadow-2xl p-8 border border-gray-100 relative"
        style={{
          boxShadow: '8px 8px 16px rgba(0,167,225,0.10), -8px -8px 16px rgba(255,255,255,0.7), inset 2px 2px 4px rgba(255,255,255,0.2), inset -2px -2px 4px rgba(0,0,0,0.05)'
        }}
      >
       
        {/* Edit Profile Modal removed */}

        {/* Change Password Modal removed */}

        {/* Removed crop modal; avatar comes from Google metadata */}

        {/* Horizontal Layout: Profile Picture and Details Side by Side */}
        <div className="flex items-start gap-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center">
            <div className="relative group inline-block mb-3">
              <div 
                className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg flex items-center justify-center overflow-hidden border-4 border-white transition-all duration-300 hover:scale-105 hover:shadow-xl"
                style={{
                  boxShadow: '4px 4px 8px rgba(0,167,225,0.10), -4px -4px 8px rgba(255,255,255,0.7), inset 1px 1px 2px rgba(255,255,255,0.2), inset -1px -1px 2px rgba(0,0,0,0.05)'
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
                  <UserCircle className="w-20 h-20 text-gray-300" />
                )}
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-semibold mb-1" style={{
              boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
            }}>
              <Briefcase className="w-3.5 h-3.5 text-blue-700" />
              {profile.role}
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${profile.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`} style={{
              boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
            }}>
              <div className={`w-2 h-2 rounded-full ${profile.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              {profile.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>

          {/* Profile Details Section */}
          <div className="flex-1 space-y-3">
            {/* Display Name */}
            {displayName && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl" style={{
                boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
              }}>
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <UserCircle className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-0.5">Full Name</p>
                  <p className="text-gray-900 text-sm font-medium">{displayName}</p>
                </div>
              </div>
            )}
            {/* Email */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl" style={{
              boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
            }}>
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-0.5">Email</p>
                <p className="text-gray-900 text-sm font-medium">{profile.email}</p>
              </div>
            </div>
            {/* Department */}
            {profile.department && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl" style={{
                boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
              }}>
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-0.5">Department</p>
                  <p className="text-gray-900 text-sm font-medium">{profile.department}</p>
                </div>
              </div>
            )}
            
            {/* Change Password Button */}
            <button
              onClick={handleOpenPasswordModal}
              className="px-4 py-2 bg-[#2C3E50] hover:bg-[#34495E] text-white rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md mt-2"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Password Change Modal */}
  {showPasswordModal && typeof window !== 'undefined' && document.body && createPortal(
    <>
      {/* Full screen overlay with blur and click handler */}
      <div 
        className="fixed inset-0 z-[99999] bg-black bg-opacity-60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClosePasswordModal();
          }
        }}
        style={{ pointerEvents: 'auto', userSelect: 'none', touchAction: 'none' }}
      />
      {/* Modal container centered on screen */}
      <div
        className="fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClosePasswordModal();
          }
        }}
        style={{ minHeight: '100vh', pointerEvents: 'auto' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/90 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg relative mx-2 sm:mx-4 flex flex-col"
          style={{
            maxHeight: '98vh',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
            boxShadow: '8px 8px 16px rgba(0,167,225,0.10), -8px -8px 16px rgba(255,255,255,0.7), inset 2px 2px 4px rgba(255,255,255,0.2), inset -2px -2px 4px rgba(0,0,0,0.05)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-200 p-6 rounded-t-2xl z-10 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {step === 1 ? 'Verify Current Password' : 'Set New Password'}
            </h3>
            <button
              onClick={handleClosePasswordModal}
              className="w-6 h-6 flex items-center justify-center text-lg font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {step === 1 ? (
              <div className="space-y-6">
                {errorMsg && (
                  <div className="bg-red-100 text-red-700 rounded-lg px-3 py-2 text-sm font-medium mb-2 border border-red-200">
                    {errorMsg}
                  </div>
                )}
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative mb-2">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    placeholder="Enter your current password"
                    style={{
                      boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Success message after verifying current password */}
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm font-medium text-green-700 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Current password verified successfully
                </div>
                {errorMsg && (
                  <div className="bg-red-100 text-red-700 rounded-lg px-3 py-2 text-sm font-medium mb-2 border border-red-200">
                    {errorMsg}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative mb-2">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      placeholder="Enter new password"
                      style={{
                        boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
                      }}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative mb-2">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                      placeholder="Confirm new password"
                      style={{
                        boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
                      }}
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
              </div>
            )}
          </div>
          <div className="flex gap-4  mb-5">
            {step === 1 ? (
              <>
                <button
                  onClick={handleClosePasswordModal}
                  className="flex-1 px-3 py-1 mx-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{
                    boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2 mx-2 bg-[#2C3E50] text-white rounded-lg hover:bg-[#34495E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{
                    boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
                  }}
                >
                  {changingPassword ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verifying...
                    </div>
                  ) : (
                    'Verify Password'
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setStep(1);
                    setNewPassword('');
                    setConfirmPassword('');
                    setErrorMsg('');
                  }}
                  className="flex-1 px-4 py-2 mx-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{
                    boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2 mx-2 bg-[#2C3E50] text-white rounded-lg hover:bg-[#34495E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{
                    boxShadow: '2px 2px 4px rgba(0,167,225,0.10), -2px -2px 4px rgba(255,255,255,0.7)'
                  }}
                >
                  {changingPassword ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </div>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  , document.body)}

        {/* Action Buttons removed */}
      </motion.div>
    </div>
    
  );
};

export default TeacherSettings;
