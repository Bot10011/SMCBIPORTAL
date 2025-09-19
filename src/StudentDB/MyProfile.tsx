import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hash,
  BookOpen,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
 

type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  course?: string;
  enrollment_date?: string;
  year_level?: string;
  student_id?: string;
  program_id?: number;
  section?: string; // section UUID from database
  enrollment_status?: 'enrolled' | 'not_enrolled' | 'pending';
  department?: string; // ensure department is included
  avatar_url?: string; // avatar URL from database
};

// Get a display name from Supabase Auth user metadata/identities
function getAuthDisplayName(u: unknown): string | null {
  if (!u || typeof u !== 'object') return null;
  const metadata = (u as { user_metadata?: Record<string, unknown> }).user_metadata;
  const fromMetadata = [
    typeof metadata?.full_name === 'string' ? (metadata.full_name as string) : null,
    typeof metadata?.name === 'string' ? (metadata.name as string) : null,
    typeof metadata?.display_name === 'string' ? (metadata.display_name as string) : null,
    typeof metadata?.preferred_username === 'string' ? (metadata.preferred_username as string) : null,
  ].find(Boolean) as string | null | undefined;
  if (fromMetadata) return fromMetadata;

  const identities = (u as { identities?: Array<{ identity_data?: Record<string, unknown> }> }).identities;
  if (Array.isArray(identities)) {
    for (const id of identities) {
      const data = id?.identity_data;
      const name = typeof data?.full_name === 'string' ? (data.full_name as string)
        : typeof data?.name === 'string' ? (data.name as string)
        : null;
      if (name) return name;
    }
  }
  return null;
}

// Get an avatar URL from Supabase Auth user metadata (e.g., Google)
function getAuthAvatarUrl(u: unknown): string | null {
  if (!u || typeof u !== 'object') return null;
  const urlKeys = [
    'avatar_url', 'picture', 'picture_url', 'photoURL', 'photoUrl', 'avatar',
    'image', 'image_url', 'imageUrl', 'profile_picture', 'profileImage'
  ];

  const tryKeys = (obj?: Record<string, unknown> | null): string | null => {
    if (!obj) return null;
    for (const key of urlKeys) {
      const val = obj[key];
      if (typeof val === 'string' && /^https?:\/\//i.test(val)) return val;
    }
    return null;
  };

  const metadata = (u as { user_metadata?: Record<string, unknown> }).user_metadata;
  const fromMetadata = tryKeys(metadata);
  if (fromMetadata) return fromMetadata;

  const identities = (u as { identities?: Array<{ identity_data?: Record<string, unknown> }> }).identities;
  if (Array.isArray(identities)) {
    for (const id of identities) {
      const candidate = tryKeys(id?.identity_data as Record<string, unknown> | undefined);
      if (candidate) return candidate;
    }
  }
  return null;
}

// Lightweight debug logger for profile/auth flows
function logProfileDebug(label: string, details?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  if (details) {
    console.log(`[MyProfile][${timestamp}] ${label}:`, details);
  } else {
    console.log(`[MyProfile][${timestamp}] ${label}`);
  }
}

 
export const MyProfile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [authDisplayName, setAuthDisplayName] = useState<string>('');
  const [sectionName, setSectionName] = useState<string>('');
  const [imageDebug, setImageDebug] = useState<
    { status: 'idle' | 'loading' | 'ok' | 'missing_url' | 'download_error' | 'no_file_data' | 'image_failed'; message?: string }
  >({ status: 'idle' });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [hasEmailPassword, setHasEmailPassword] = useState(false);
  const [passwordRequirementsMet, setPasswordRequirementsMet] = useState(false);
  const [hasVerifiedOld, setHasVerifiedOld] = useState(false);
  const [isVerifyingOld, setIsVerifyingOld] = useState(false);
  const requireOldPassword = useMemo(() => !isGoogleUser || hasEmailPassword, [isGoogleUser, hasEmailPassword]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // No local upload/crop; avatar is from Supabase or Google metadata

  useEffect(() => {
    // Fetch display name directly from Supabase Auth user (Google)
    const fetchAuthDisplayName = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          logProfileDebug('Auth user fetched', {
            authUserId: data.user.id,
            email: data.user.email,
            nameFromMetadata: getAuthDisplayName(data.user),
          });
          const name = getAuthDisplayName(data.user) || data.user.email || '';
          setAuthDisplayName(name);
          
          // Check providers/identities
          const identities = data.user.identities || [];
          const isGoogleOAuth = Boolean(data.user.app_metadata?.provider === 'google' || 
                               identities.some(identity => identity.provider === 'google'));
          setIsGoogleUser(isGoogleOAuth);
          const hasEmailId = identities.some(identity => identity.provider === 'email');
          setHasEmailPassword(hasEmailId);
          logProfileDebug('User authentication method', { isGoogleOAuth, provider: data.user.app_metadata?.provider });
        } else {
          logProfileDebug('No auth user in getUser(), fallback to stored', { storedUserId: user?.id, storedEmail: user?.email });
          setAuthDisplayName(user?.email || '');
          setIsGoogleUser(false);
          setHasEmailPassword(false);
        }
      } catch (err) {
        logProfileDebug('Error fetching auth user', { error: err instanceof Error ? err.message : String(err) });
        setAuthDisplayName(user?.email || '');
        setIsGoogleUser(false);
      }
    };
    fetchAuthDisplayName();
  }, [user?.id, user?.email]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (user?.id) {
          logProfileDebug('Begin profile fetch', { authUserId: user.id, authEmail: user.email });
          
          // Get auth data for fallbacks
          const { data: authData } = await supabase.auth.getUser();
          
          const { data: byIdData, error: byIdError } = await supabase
            .from('user_profiles')
            .select('*, avatar_url, display_name')
            .eq('id', user.id)
            .single();

          let data = byIdData;
          if (byIdError || !data) {
            logProfileDebug('Profile by id not found, falling back to email', { byIdError: byIdError ? (byIdError as unknown as { message?: string }).message : undefined });
            // Fallback: match by email (handles Google logins where profile row not yet keyed by auth id)
            const { data: byEmail, error: emailErr } = await supabase
              .from('user_profiles')
              .select('*, avatar_url, display_name')
              .ilike('email', user.email || '')
              .limit(1)
              .single();
            if (emailErr) {
              logProfileDebug('Profile by email lookup failed', { error: (emailErr as unknown as { message?: string }).message, emailTried: user.email });
              throw byIdError || emailErr;
            }
            data = byEmail;
          }

          setProfile(data);
          logProfileDebug('Profile fetched', { profileId: data?.id, email: data?.email, avatar_url: data?.avatar_url, display_name: data?.display_name });
          
          // Handle display name with priority:
          // 1) user_profiles.display_name
          // 2) user_profiles.first_name/middle_name/last_name (concatenated)
          // 3) Supabase Auth metadata (full_name/name/etc) or email
          let displayName = '';
          const safeTrim = (val: unknown): string | undefined =>
            typeof val === 'string' && val.trim().length > 0 ? val.trim() : undefined;

          const fromProfileDisplay = safeTrim(data?.display_name);
          const first = safeTrim((data as unknown as Record<string, unknown>)?.first_name);
          const middle = safeTrim((data as unknown as Record<string, unknown>)?.middle_name);
          const last = safeTrim((data as unknown as Record<string, unknown>)?.last_name);
          const fromProfileParts = [first, middle, last].filter(Boolean).join(' ').trim();

          if (fromProfileDisplay) {
            displayName = fromProfileDisplay;
          } else if (fromProfileParts.length > 0) {
            displayName = fromProfileParts;
          } else {
            displayName = 'Unknown';
          }
          setAuthDisplayName(displayName);

          // Handle avatar with fallback
          let pictureUrl: string | null = null;
          
          // Priority 1: Use avatar_url from database
          if (data?.avatar_url) {
            pictureUrl = data.avatar_url;
            setProfilePictureUrl(pictureUrl);
            logProfileDebug('Using database avatar_url', { avatarUrl: pictureUrl });
            setImageDebug({ status: 'ok' });
            return;
          } 
          // Priority 2: Fallback to Google metadata if no avatar_url
          else if (authData?.user) {
            pictureUrl = getAuthAvatarUrl(authData.user);
            if (pictureUrl) {
              setProfilePictureUrl(pictureUrl);
              logProfileDebug('Using Google avatar from auth metadata', { avatarUrl: pictureUrl });
              setImageDebug({ status: 'ok' });
              return;
            }
          }

          // Final fallback: no URL; UI will render solid blue circle with initials
          setProfilePictureUrl(null);
          logProfileDebug('No avatar found; using initials fallback (no image URL)');
          setImageDebug({ status: 'missing_url' });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        logProfileDebug('Profile fetch threw', { error: error instanceof Error ? error.message : String(error) });
        setProfilePictureUrl(null);
        setAuthDisplayName(user?.email || '');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, user]);

  // Fetch section name when profile is loaded
  useEffect(() => {
    const fetchSectionName = async () => {
      if (profile?.section) {
        try {
          const { data, error } = await supabase
            .from('sections')
            .select('name')
            .eq('id', profile.section)
            .single();
          
          if (!error && data) {
            setSectionName(data.name);
          } else {
            setSectionName('N/A');
          }
        } catch (error) {
          console.error('Error fetching section name:', error);
          setSectionName('N/A');
        }
      } else {
        setSectionName('N/A');
      }
    };

    fetchSectionName();
  }, [profile?.section]);

  // Password change functions
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  // Check if password meets all requirements
  const checkPasswordRequirements = (password: string): boolean => {
    return password.length >= 8 &&
           /(?=.*[a-z])/.test(password) &&
           /(?=.*[A-Z])/.test(password) &&
           /(?=.*\d)/.test(password);
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    // Validation splits by whether old password is required
    if (!requireOldPassword) {
      if (!newPassword || !confirmPassword) {
        setPasswordError('New password and confirmation are required');
        return;
      }
    } else {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordError('All fields are required');
        return;
      }
      if (!hasVerifiedOld) {
        setPasswordError('Please verify your current password first');
        return;
      }
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    setIsChangingPassword(true);

    try {
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setHasEmailPassword(true);
      setHasVerifiedOld(false);
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Verify current password as an explicit step to avoid frequent requests
  const verifyOldPassword = async () => {
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    const emailToUse = (profile?.email || user?.email || '').trim();
    if (!emailToUse) {
      setPasswordError('Unable to verify current password. Missing email.');
      return;
    }
    setIsVerifyingOld(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: currentPassword,
      });
      if (error) {
        setHasVerifiedOld(false);
        setPasswordError('Old password is incorrect');
        return;
      }
      setHasVerifiedOld(true);
    } catch {
      setHasVerifiedOld(false);
      setPasswordError('Failed to verify current password');
    } finally {
      setIsVerifyingOld(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // Update password requirements met state when password fields change
  useEffect(() => {
    const checkFormRequirements = (): boolean => {
      if (!requireOldPassword) {
        return newPassword.length > 0 &&
               confirmPassword.length > 0 &&
               newPassword === confirmPassword &&
               checkPasswordRequirements(newPassword);
      }
      return currentPassword.length > 0 && hasVerifiedOld &&
             newPassword.length > 0 &&
             confirmPassword.length > 0 &&
             newPassword === confirmPassword &&
             checkPasswordRequirements(newPassword);
    };
    
    setPasswordRequirementsMet(checkFormRequirements());
  }, [currentPassword, newPassword, confirmPassword, isGoogleUser, requireOldPassword, hasVerifiedOld]);

  // Reset verification state when opening modal or switching requirement mode
  useEffect(() => {
    setHasVerifiedOld(!requireOldPassword);
  }, [requireOldPassword, showPasswordModal]);

  // No live verification; do not clear fields on each keystroke to reduce requests
  useEffect(() => {}, [currentPassword, requireOldPassword]);

  // Removed live old password verification effect

  // Memoized profile data processing
  const processedProfile = useMemo(() => {
    if (!profile) return null;
    const displayNameFromAuth = authDisplayName;
    return {
      ...profile,
      fullName: displayNameFromAuth,
      enrollmentStatus: profile.enrollment_status === 'enrolled' ? 'enrolled' : 'not_enrolled'
    };
  }, [profile, authDisplayName]);

  if (loading) {
    if (isOffline) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#1c1c1d]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-blue-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657A8 8 0 1 0 7.05 7.05m10.607 9.607A8 8 0 0 1 7.05 7.05m9.9 9.9L7.05 7.05" />
          </svg>
          <div className="text-2xl font-bold text-gray-500 mb-2">You are offline</div>
          <div className="text-gray-400 mb-8">Please check your internet connection.</div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-[#1c1c1d] py-10 px-2 sm:px-0">
        <div className="max-w-3xl mx-auto space-y-10">
          {/* Enhanced Profile Card Skeleton */}
          <div className="relative overflow-visible rounded-3xl bg-gradient-to-br from-white via-blue-50 to-purple-50 shadow-xl border border-blue-100 p-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-purple-100/20 pointer-events-none rounded-3xl" />
            <div className="relative flex flex-col sm:flex-row items-center gap-8 px-8 sm:px-14 pt-10 sm:pt-14 pb-2">
              {/* Profile Picture Skeleton with shimmer effect */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gray-200 animate-pulse overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                     style={{ animation: 'shimmer 2s infinite' }} />
              </div>
              {/* Info Skeleton with staggered animation */}
              <div className="flex-1 text-center sm:text-left space-y-3">
                <div className="h-10 w-56 bg-gray-200 rounded-lg mb-3 animate-pulse mx-auto sm:mx-0" 
                     style={{ animationDelay: '0.1s' }} />
                <div className="h-6 w-72 bg-gray-200 rounded-lg mb-3 animate-pulse mx-auto sm:mx-0" 
                     style={{ animationDelay: '0.2s' }} />
                <div className="mt-6 flex justify-center sm:justify-start">
                  <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-gray-200 animate-pulse w-36 h-10" 
                       style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </div>
            {/* Info Boxes Skeleton with staggered loading */}
            <div className="
              w-full
              grid grid-cols-2 gap-5 items-stretch
              sm:flex sm:flex-row sm:items-center sm:justify-center sm:gap-6
              px-8 py-4 min-h-[80px] z-10 mb-3
            ">
              {[1,2,3,4].map(i => (
                <div key={i} 
                     className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] bg-gray-200 rounded-xl px-4 py-2 animate-pulse"
                     style={{ animationDelay: `${0.1 * i}s` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-red-500">Profile not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#1c1c1d] py-10 px-2 sm:px-0">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="profile-card relative overflow-visible rounded-3xl bg-white/90 p-0"
          style={{ boxShadow: '-6px -6px 12px rgba(255,255,255,0.03), 6px 6px 12px rgba(0,0,0,0.4)' }}
        >
          
          <div className="relative flex flex-col sm:flex-row items-center gap-8 px-8 sm:px-14 pt-10 sm:pt-14 pb-2">
            {/* Profile Picture Section (uses Supabase/Google avatar, no upload/crop) */}
            <div
              className="profile-picture relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center overflow-hidden"
              aria-label="Profile photo"
            >
                {/* Profile image or placeholder */}
                {profilePictureUrl ? (
                  <img
                    src={profilePictureUrl}
                    alt="Profile"
                    className="absolute inset-0 w-full h-full object-cover rounded-full"
                    style={{ zIndex: 0, objectFit: 'cover', objectPosition: 'center', aspectRatio: '1/1', background: '#f3f4f6' }}
                    onError={() => {
                      setProfilePictureUrl(null);
                      setImageDebug({ status: 'image_failed', message: 'Image failed to load in browser' });
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full rounded-full bg-blue-600 flex items-center justify-center" style={{ zIndex: 0 }}>
                    <span className="text-white font-extrabold text-5xl sm:text-6xl tracking-tight">
                      {(() => {
                        const first = (processedProfile?.fullName || '').trim();
                        if (first) {
                          const parts = first.split(/\s+/);
                          const firstInitial = parts[0]?.[0] || '';
                          const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
                          const initials = `${firstInitial}${lastInitial}` || 'U';
                          return initials.toUpperCase();
                        }
                        const constructed = `${profile?.first_name || ''} ${profile?.middle_name || ''} ${profile?.last_name || ''}`.trim();
                        if (constructed) {
                          const parts = constructed.split(/\s+/);
                          const firstInitial = parts[0]?.[0] || '';
                          const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
                          const initials = `${firstInitial}${lastInitial}` || 'U';
                          return initials.toUpperCase();
                        }
                        return 'U';
                      })()}
                    </span>
                  </div>
                )}
                {/* Debug badge for image status */}
                {imageDebug.status !== 'idle' && imageDebug.status !== 'ok' && (
                  <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full px-2 py-1 rounded-full text-[10px] font-medium shadow ${imageDebug.status === 'missing_url' ? 'bg-gray-700 text-gray-200' : 'bg-red-700 text-white'}`}>
                    {imageDebug.status === 'missing_url' && 'No image set'}
                    {imageDebug.status === 'download_error' && 'Image download error'}
                    {imageDebug.status === 'no_file_data' && 'No file data'}
                    {imageDebug.status === 'image_failed' && 'Image failed to load'}
                  </div>
                )}
              </div>

            {/* Profile Info Section */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl sm:text-4xl font-extrabold text-black mb-1"
              >
                {processedProfile?.fullName}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base text-black font-medium mb-2"
              >
                {profile?.email}
              </motion.p>
              {/* Status Pill */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4 flex justify-center sm:justify-start"
              >
                <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full shadow bg-white border ${processedProfile?.enrollmentStatus === 'enrolled' ? 'border-green-200' : 'border-red-200'}`}
                >
                  {processedProfile?.enrollmentStatus === 'enrolled' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-base font-semibold text-green-600">Enrolled</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-base font-semibold text-red-600">Not Enrolled</span>
                    </>
                  )}
                </div>
              </motion.div>
              
            </div>
          </div>
          {/* Student Info Row as card footer, Neumorphism style, fully visible */}
          <div className="
            w-full
            grid grid-cols-2 gap-5 items-stretch
            sm:flex sm:flex-row sm:items-center sm:justify-center sm:gap-6
            px-8 py-4 min-h-[80px] z-10 mb-3
          ">
            {/* Student ID */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-white/90" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-black mb-0.5 sm:mb-0 sm:mr-1">
                <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                Student ID:
              </span>
              <span className="text-sm sm:text-base font-bold text-black truncate">{profile?.student_id ?? 'N/A'}</span>
            </div>
            {/* Program */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-white/90" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-black mb-0.5 sm:mb-0 sm:mr-1">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                Program:
              </span>
              <span className="text-sm sm:text-base font-bold text-black truncate">{profile?.department ?? 'N/A'}</span>
            </div>
            {/* Year Level */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-white/90" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
                            <span className="flex items-center gap-1 text-[11px] sm:text-xs text-black mb-0.5 sm:mb-0 sm:mr-1">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                Year Level:
              </span>
              <span className="text-sm sm:text-base font-bold text-black truncate">{profile?.year_level ?? 'N/A'}</span>
            </div>
            {/* Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-white/90" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-black mb-0.5 sm:mb-0 sm:mr-1">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                Section:
              </span>
              <span className="text-sm sm:text-base font-bold text-black truncate">{sectionName}</span>
            </div>
          </div>
        </motion.div>

        {/* Change Password Button */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center"
        >
          <button
            onClick={() => {
              resetPasswordForm();
              setShowPasswordModal(true);
            }}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl shadow bg-blue-600  border-blue-200 "
          >
            <Lock className="w-6 h-6 text-white" />
            <span className="text-lg font-semibold text-white">{requireOldPassword ? 'Change Password' : 'Set Password'}</span>
          </button>
        </motion.div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{requireOldPassword ? 'Change Password' : 'Set Password'}</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  resetPasswordForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {requireOldPassword && !hasVerifiedOld && (
                  <motion.div
                    key="old-password-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden space-y-3"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300`}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Google User Notice (only for Google users without a Supabase password yet) */}
              {isGoogleUser && !requireOldPassword && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Google Account</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    You're signed in with Google. You can set a password for your account to enable email/password login in the future. No current password needed.
                  </p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {(!requireOldPassword || hasVerifiedOld) && (
                  <motion.div
                    key="new-password-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium mb-2">Password requirements:</p>
                      <ul className="space-y-1">
                        <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                          <CheckCircle2 className={`w-3 h-3 ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`} />
                          At least 8 characters long
                        </li>
                        <li className={`flex items-center gap-2 ${/(?=.*[a-z])/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                          <CheckCircle2 className={`w-3 h-3 ${/(?=.*[a-z])/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                          Contains lowercase letter
                        </li>
                        <li className={`flex items-center gap-2 ${/(?=.*[A-Z])/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                          <CheckCircle2 className={`w-3 h-3 ${/(?=.*[A-Z])/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                          Contains uppercase letter
                        </li>
                        <li className={`flex items-center gap-2 ${/(?=.*\d)/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                          <CheckCircle2 className={`w-3 h-3 ${/(?=.*\d)/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                          Contains at least one number
                        </li>
                        <li className={`flex items-center gap-2 ${newPassword === confirmPassword && confirmPassword.length > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          <CheckCircle2 className={`w-3 h-3 ${newPassword === confirmPassword && confirmPassword.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                          Passwords match
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Message */}
              {passwordError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{passwordError}</span>
                </div>
              )}

              {/* Success Message */}
              {passwordSuccess && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">Password changed successfully!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    resetPasswordForm();
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={isChangingPassword}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (requireOldPassword && !hasVerifiedOld) {
                      void verifyOldPassword();
                    } else {
                      void handlePasswordChange();
                    }
                  }}
                  disabled={
                    requireOldPassword && !hasVerifiedOld
                      ? isVerifyingOld || currentPassword.length === 0
                      : isChangingPassword || !passwordRequirementsMet
                  }
                  className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requireOldPassword && !hasVerifiedOld
                    ? (isVerifyingOld ? 'Verifying…' : 'Verify')
                    : (isChangingPassword
                        ? (requireOldPassword ? 'Changing...' : 'Setting...')
                        : (requireOldPassword ? 'Change Password' : 'Set Password'))}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}; 
