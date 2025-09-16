import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, UserRole, ROLE_PERMISSIONS } from '../types/auth';
import { supabase, getGoogleAvatarUrl } from '../lib/supabase';
import toast from 'react-hot-toast';
import { clearGoogleClassroomConnection } from '../lib/services/googleClassroomService';

type PermissionKey = Exclude<keyof typeof ROLE_PERMISSIONS[UserRole], 'canCreateUsers'>;

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  canCreateUser: (role: UserRole) => boolean;
  setCreatingUserFlag: (creating: boolean) => void; // Add this to the interface
  refreshUserMetadata: () => Promise<void>; // Add metadata refresh function
  refreshGoogleAvatar: () => Promise<void>; // Add Google avatar refresh function
}

const AuthContext = createContext<AuthContextType & { loading: boolean } | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false); // Add this flag
  const [sessionConflictOpen, setSessionConflictOpen] = useState(false);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceSessionIdRef = useRef<string>('');
  const presencePromptedRef = useRef<boolean>(false);
  const deviceIdRef = useRef<string>('');
  const localJoinedAtRef = useRef<number>(0);
  const presenceLoginKeyRef = useRef<string>('');

  // Simple UUID v4 generator for presence session identity
  const generatePresenceId = () => {
    // RFC4122-ish, sufficient for session identity
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const joinSingleSessionPresence = async (userId: string) => {
    try {
      // Clean up any previous channel
      if (presenceChannelRef.current) {
        try { await presenceChannelRef.current.unsubscribe(); } catch { /* noop */ }
        presenceChannelRef.current = null;
      }
      presencePromptedRef.current = false;
      // Unique session key for this device/tab
      presenceSessionIdRef.current = generatePresenceId();
      // Stable device id to distinguish tabs vs devices
      try {
        const existing = localStorage.getItem('device_id');
        if (existing && existing.length > 0) deviceIdRef.current = existing;
        else {
          deviceIdRef.current = generatePresenceId();
          localStorage.setItem('device_id', deviceIdRef.current);
        }
      } catch {
        deviceIdRef.current = generatePresenceId();
      }
      const channel = supabase.channel(`presence-user-${userId}`, {
        config: { presence: { key: presenceSessionIdRef.current } }
      });

      channel.on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState();
          const entries = Object.entries(state || {});
          const metas = entries.flatMap(([, v]) => Array.isArray(v) ? v : []);
          // If more than one active session, determine newest join
          if (metas.length > 1 && !presencePromptedRef.current) {
            const withTimes = metas.map((m: unknown) => {
              const meta = (m as Record<string, unknown>) || {};
              const joinedAt = typeof meta.joined_at === 'string' ? Date.parse(meta.joined_at) : Date.now();
              const key = typeof meta.presence_ref === 'string' ? meta.presence_ref : undefined; // internal
              const deviceId = typeof meta.deviceId === 'string' ? meta.deviceId : undefined;
              return { meta, joinedAt, key, deviceId };
            });
            const newest = withTimes.reduce((a, b) => (b.joinedAt > a.joinedAt ? b : a), withTimes[0]);
            const ourJoin = localJoinedAtRef.current || 0;
            const isCurrentNewest = newest.joinedAt === ourJoin;
            const isDifferentDevice = Boolean(newest.deviceId && newest.deviceId !== deviceIdRef.current);
            if (!isCurrentNewest && isDifferentDevice) {
              presencePromptedRef.current = true;
              setSessionConflictOpen(true);
            }
          }
        } catch {
          // ignore
        }
      });

      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            // Stable per-login start time; persists across reloads until logout
            presenceLoginKeyRef.current = `presence_login_started_${userId}`;
            let startEpoch = 0;
            try {
              const existingStart = localStorage.getItem(presenceLoginKeyRef.current);
              if (existingStart) {
                const parsed = parseInt(existingStart, 10);
                if (!Number.isNaN(parsed) && parsed > 0) startEpoch = parsed;
              }
            } catch { /* noop */ }
            if (startEpoch === 0) {
              startEpoch = Date.now();
              try { localStorage.setItem(presenceLoginKeyRef.current, String(startEpoch)); } catch { /* noop */ }
            }
            localJoinedAtRef.current = startEpoch;
            await channel.track({ joined_at: new Date(startEpoch).toISOString(), deviceId: deviceIdRef.current });
          } catch {
            // ignore
          }
        }
      });

      presenceChannelRef.current = channel;
    } catch {
      // presence not critical; fail silently
    }
  };

  const leaveSingleSessionPresence = async () => {
    try {
      if (presenceChannelRef.current) {
        try { await presenceChannelRef.current.unsubscribe(); } catch { /* noop */ }
      }
    } finally {
      presenceChannelRef.current = null;
      presenceSessionIdRef.current = '';
      presencePromptedRef.current = false;
      // Clear per-login start marker so a fresh login gets a new timestamp
      if (presenceLoginKeyRef.current) {
        try { localStorage.removeItem(presenceLoginKeyRef.current); } catch { /* noop */ }
        presenceLoginKeyRef.current = '';
      }
    }
  };

  // Function to refresh Google user metadata
  const refreshUserMetadata = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || currentUser.app_metadata?.provider !== 'google') {
        return; // Only refresh for Google users
      }

      // Check if we need to refresh metadata (e.g., session is fresh)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get current profile data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url, auth_provider')
        .eq('id', currentUser.id)
        .single();

      if (profile) {
        // Update metadata if available
        const updateData: {
          display_name?: string;
          avatar_url?: string;
          auth_provider?: string;
        } = {};

        // Check for new metadata
        if (currentUser.user_metadata?.full_name && currentUser.user_metadata.full_name !== profile.display_name) {
          updateData.display_name = currentUser.user_metadata.full_name;
        }
        
        // Enhanced avatar detection from multiple sources
        let newAvatarUrl: string | null = null;
        
        // Use the helper function to get Google avatar
        newAvatarUrl = getGoogleAvatarUrl(currentUser);
        
        // Priority 3: Try Google Userinfo API if we have a provider token and no avatar yet
        if (!newAvatarUrl && session.provider_token) {
          try {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${session.provider_token}` }
            });
            if (userInfoResponse.ok) {
              const userInfo = await userInfoResponse.json();
              if (userInfo.picture && typeof userInfo.picture === 'string') {
                // Import the enhance function
                const { enhanceGoogleAvatarUrl } = await import('../lib/supabase');
                newAvatarUrl = enhanceGoogleAvatarUrl(userInfo.picture);
              }
            }
          } catch (error) {
            console.warn('Failed to fetch Google userinfo:', error);
          }
        }
        
        // Update avatar_url if we found a new one
        if (newAvatarUrl && newAvatarUrl !== profile.avatar_url) {
          updateData.avatar_url = newAvatarUrl;
          console.log('🔄 Updating avatar_url for Google user:', { 
            userId: currentUser.id, 
            oldAvatar: profile.avatar_url, 
            newAvatar: newAvatarUrl 
          });
        }
        
        if (currentUser.app_metadata?.provider && currentUser.app_metadata.provider !== profile.auth_provider) {
          updateData.auth_provider = currentUser.app_metadata.provider;
        }

        // Update if there are changes
        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('id', currentUser.id);
          
          if (!error) {
            console.log('✅ User metadata refreshed successfully:', updateData);
          } else {
            console.error('❌ Failed to update user metadata:', error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to refresh user metadata:', error);
    }
  };

  // Function to manually refresh Google avatar
  const refreshGoogleAvatar = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || currentUser.app_metadata?.provider !== 'google') {
        console.log('Not a Google user, skipping avatar refresh');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session, skipping avatar refresh');
        return;
      }

      // Get current profile data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('avatar_url')
        .eq('id', currentUser.id)
        .single();

      if (!profile) {
        console.log('No profile found, skipping avatar refresh');
        return;
      }

      // Get latest avatar URL
      let newAvatarUrl = getGoogleAvatarUrl(currentUser);
      
      // Try Google Userinfo API if we have a provider token and no avatar yet
      if (!newAvatarUrl && session.provider_token) {
        try {
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${session.provider_token}` }
          });
          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            if (userInfo.picture && typeof userInfo.picture === 'string') {
              newAvatarUrl = userInfo.picture;
            }
          }
        } catch (error) {
          console.warn('Failed to fetch Google userinfo:', error);
        }
      }

      // Update avatar_url if we found a new one
      if (newAvatarUrl && newAvatarUrl !== profile.avatar_url) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ avatar_url: newAvatarUrl })
          .eq('id', currentUser.id);
        
        if (!error) {
          console.log('✅ Google avatar refreshed successfully:', { 
            userId: currentUser.id, 
            oldAvatar: profile.avatar_url, 
            newAvatar: newAvatarUrl 
          });
          toast.success('Profile picture updated!');
        } else {
          console.error('❌ Failed to refresh Google avatar:', error);
          toast.error('Failed to update profile picture');
        }
      } else {
        console.log('No avatar update needed');
      }
    } catch (error) {
      console.error('Failed to refresh Google avatar:', error);
      toast.error('Failed to refresh profile picture');
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        // Try to get extra fields from localStorage
        const storedUser = localStorage.getItem('user');
        let extraFields: Pick<User, 'username' | 'role' | 'studentStatus'> = {
          username: '',
          role: 'student',
          studentStatus: undefined,
        };
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          extraFields = {
            username: parsed.username || '',
            role: parsed.role || 'student',
            studentStatus: parsed.studentStatus,
          };
        }
        const userData: User = {
          id: sessionData.session.user.id,
          email: sessionData.session.user.email || '',
          username: extraFields.username,
          role: extraFields.role,
          isAuthenticated: true,
          studentStatus: extraFields.studentStatus,
        };
        setUser(userData);
        // Join single-session presence channel
        void joinSingleSessionPresence(userData.id);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If we're in the middle of creating a user, ignore the auto sign-in
      if (isCreatingUser && event === 'SIGNED_IN') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('user');
        void leaveSingleSessionPresence();
      } else if (session?.user) {
        // Try to get extra fields from localStorage
        const storedUser = localStorage.getItem('user');
        let extraFields: Pick<User, 'username' | 'role' | 'studentStatus'> = {
          username: '',
          role: 'student',
          studentStatus: undefined,
        };
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          extraFields = {
            username: parsed.username || '',
            role: parsed.role || 'student',
            studentStatus: parsed.studentStatus,
          };
        }
        const userData: User = {
          id: session.user.id,
          email: session.user.email || '',
          username: extraFields.username,
          role: extraFields.role,
          isAuthenticated: true,
          studentStatus: extraFields.studentStatus,
        };
        setUser(userData);
        // Join single-session presence channel on sign-in
        void joinSingleSessionPresence(userData.id);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isCreatingUser]); // Add isCreatingUser to dependencies

  // Set up periodic metadata refresh for Google users
  useEffect(() => {
    if (!user || !(user.email.includes('@gmail.com') || user.email.includes('@google.com'))) {
      return; // Only for Google users
    }

    // Refresh metadata every 30 minutes
    const interval = setInterval(refreshUserMetadata, 30 * 60 * 1000);
    
    // Also refresh when the component mounts
    refreshUserMetadata();

    return () => clearInterval(interval);
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Refresh metadata after login for Google users
    if (userData.email.includes('@gmail.com') || userData.email.includes('@google.com')) {
      setTimeout(refreshUserMetadata, 1000); // Small delay to ensure session is established
    }
  };

  const logout = async () => {
    try {
      // Clear Google Classroom/Drive tokens for this user explicitly on logout
      if (user?.id) {
        try { clearGoogleClassroomConnection(user.id); } catch { /* noop */ }
      }
      await leaveSingleSessionPresence();
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('user');
      toast.success('Successfully logged out');
      window.location.href = '/'; // Force full reload to clear all state
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role][permission] as boolean;
  };

  const canCreateUser = (role: UserRole): boolean => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role].canCreateUsers.includes(role);
  };

  // Add function to set the creating user flag
  const setCreatingUserFlag = (creating: boolean) => {
    setIsCreatingUser(creating);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, canCreateUser, loading, setCreatingUserFlag, refreshUserMetadata, refreshGoogleAvatar }}>
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {children}
          {sessionConflictOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-900/70 backdrop-blur-sm" />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="session-conflict-title"
                className="relative w-full max-w-md mx-4"
              >
                <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-white/10">
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-indigo-500/30 blur-md" aria-hidden="true" />
                  <div className="relative bg-white rounded-2xl p-6">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 2L2 7l8 5 8-5-8-5z" />
                          <path d="M2 17l8 5 8-5" />
                          <path d="M2 12l8 5 8-5" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h2 id="session-conflict-title" className="text-base sm:text-lg font-semibold text-slate-900">Notice</h2>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                        Your account is currently logged in on another device. If you did not make this login, please change your password immediately.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                      <button
                        onClick={async () => {
                          setSessionConflictOpen(false);
                          await logout();
                        }}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm"
                      >
                        OK, log me out
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
