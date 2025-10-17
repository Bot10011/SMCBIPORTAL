import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, ROLE_PERMISSIONS } from '../types/auth';
import { supabase, getGoogleAvatarUrl } from '../lib/supabase';
import { syncGoogleProfileData } from '../lib/googleProfileSync';
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

  // Function to refresh Google user metadata using the new sync utility
  const refreshUserMetadata = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || currentUser.app_metadata?.provider !== 'google') {
        return; // Only refresh for Google users
      }

      // Use the new Google profile sync utility for consistent updates
      console.log('🔄 Refreshing Google profile metadata...');
      await syncGoogleProfileData(currentUser.id, currentUser.email || '', currentUser);
      
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
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('user');
      toast.success('Successfully logged out');
      // Redirect to login page after logout; full reload to clear app state
      window.location.href = '/loginpage';
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
        children
      )}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
