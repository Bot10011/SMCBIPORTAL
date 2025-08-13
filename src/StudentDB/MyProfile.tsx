import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { motion } from 'framer-motion';
import { 
  UserCircle, 
  Hash,
  BookOpen,
  Calendar,
  Users,
  CheckCircle2,
  XCircle
} from 'lucide-react';
 

type UserProfile = Database['public']['Tables']['user_profiles']['Row'] & {
  course?: string;
  enrollment_date?: string;
  year_level?: string;
  student_id?: string;
  program_id?: number;
  section?: string; // ensure section is included
  enrollment_status?: 'enrolled' | 'not_enrolled' | 'pending';
  department?: string; // ensure department is included
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
  const [imageDebug, setImageDebug] = useState<
    { status: 'idle' | 'loading' | 'ok' | 'missing_url' | 'download_error' | 'no_file_data' | 'image_failed'; message?: string }
  >({ status: 'idle' });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
        } else {
          logProfileDebug('No auth user in getUser(), fallback to stored', { storedUserId: user?.id, storedEmail: user?.email });
          setAuthDisplayName(user?.email || '');
        }
      } catch (err) {
        logProfileDebug('Error fetching auth user', { error: err instanceof Error ? err.message : String(err) });
        setAuthDisplayName(user?.email || '');
      }
    };
    fetchAuthDisplayName();
  }, [user?.id, user?.email]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (user?.id) {
          logProfileDebug('Begin profile fetch', { authUserId: user.id, authEmail: user.email });
          const { data: byIdData, error: byIdError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          let data = byIdData;
          if (byIdError || !data) {
            logProfileDebug('Profile by id not found, falling back to email', { byIdError: byIdError ? (byIdError as unknown as { message?: string }).message : undefined });
            // Fallback: match by email (handles Google logins where profile row not yet keyed by auth id)
            const { data: byEmail, error: emailErr } = await supabase
              .from('user_profiles')
              .select('*')
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
          logProfileDebug('Profile fetched', { profileId: data?.id, email: data?.email });
          // Always prefer Google avatar from Authentication
          try {
            const { data: authData } = await supabase.auth.getUser();
            const authAvatar = authData?.user ? getAuthAvatarUrl(authData.user) : null;
            if (authAvatar) {
              setProfilePictureUrl(authAvatar);
              logProfileDebug('Using Google avatar', { avatarUrl: authAvatar });
              setImageDebug({ status: 'ok' });
            } else {
              // Try Google Userinfo API using provider access token
              const { data: sessionData } = await supabase.auth.getSession();
              const accessToken = sessionData?.session?.provider_token as string | undefined;
              if (accessToken) {
                try {
                  const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                  });
                  if (resp.ok) {
                    const json = await resp.json();
                    const pic = typeof json?.picture === 'string' ? json.picture : undefined;
                    if (pic) {
                      setProfilePictureUrl(pic);
                      logProfileDebug('Using Google userinfo picture', { avatarUrl: pic });
                      setImageDebug({ status: 'ok' });
                      return;
                    }
                    logProfileDebug('Google userinfo returned no picture', { jsonSample: JSON.stringify(json).slice(0, 200) });
                  } else {
                    logProfileDebug('Google userinfo HTTP error', { status: resp.status });
                  }
                } catch (e) {
                  logProfileDebug('Google userinfo fetch failed', { error: e instanceof Error ? e.message : String(e) });
                }
              } else {
                logProfileDebug('No provider access token available for Google userinfo');
              }

              // Final fallback: generated initials avatar so the UI always shows something
              const seed = authDisplayName || user?.email || 'User';
              const generated = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&fontSize=42`;
              setProfilePictureUrl(generated);
              logProfileDebug('No Google avatar found; using generated initials avatar', { seed });
              setImageDebug({ status: 'ok' });
            }
          } catch (err) {
            setProfilePictureUrl(null);
            logProfileDebug('Error while getting Google avatar', { error: err instanceof Error ? err.message : String(err) });
            setImageDebug({ status: 'missing_url', message: 'No Google avatar found' });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        logProfileDebug('Profile fetch threw', { error: error instanceof Error ? error.message : String(error) });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, user, authDisplayName]);

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-blue-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657A8 8 0 1 0 7.05 7.05m10.607 9.607A8 8 0 0 1 7.05 7.05m9.9 9.9L7.05 7.05" />
          </svg>
          <div className="text-2xl font-bold text-gray-500 mb-2">You are offline</div>
          <div className="text-gray-400 mb-8">Please check your internet connection.</div>
        </div>
      );
    }
    return (
      <div className="min-h-screen via-white to-purple-50 py-10 px-2 sm:px-0">
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
    <div className="min-h-screen  via-white to-purple-50 py-10 px-2 sm:px-0">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="profile-card relative overflow-visible rounded-3xl bg-[#252728] p-0"
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
                  <UserCircle className="absolute inset-0 w-full h-full text-purple-200" style={{ zIndex: 0 }} />
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
                className="text-3xl sm:text-4xl font-extrabold text-white mb-1"
              >
                {processedProfile?.fullName}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base text-white font-medium mb-2"
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-[#252728]" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-300 mb-0.5 sm:mb-0 sm:mr-1">
                <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                Student ID:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-100 truncate">{profile?.student_id ?? 'N/A'}</span>
            </div>
            {/* Program */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-[#252728]" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-300 mb-0.5 sm:mb-0 sm:mr-1">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                Program:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-100 truncate">{profile?.department ?? 'N/A'}</span>
            </div>
            {/* Year Level */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-[#252728]" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-300 mb-0.5 sm:mb-0 sm:mr-1">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                Year Level:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-100 truncate">{profile?.year_level ?? 'N/A'}</span>
            </div>
            {/* Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center items-center justify-center min-w-[130px] min-h-[48px] rounded-xl px-4 py-2 bg-[#252728]" style={{ boxShadow: '-4px -4px 8px rgba(255,255,255,0.03), 4px 4px 8px rgba(0,0,0,0.35)' }}>
              <span className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-300 mb-0.5 sm:mb-0 sm:mr-1">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                Section:
              </span>
              <span className="text-sm sm:text-base font-bold text-gray-100 truncate">{profile?.section ?? 'N/A'}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}; 
