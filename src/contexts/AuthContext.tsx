import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, ROLE_PERMISSIONS } from '../types/auth';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type PermissionKey = Exclude<keyof typeof ROLE_PERMISSIONS[UserRole], 'canCreateUsers'>;

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  canCreateUser: (role: UserRole) => boolean;
  setCreatingUserFlag: (creating: boolean) => void; // Add this to the interface
  refreshUserMetadata: () => Promise<void>; // Add metadata refresh function
}

const AuthContext = createContext<AuthContextType & { loading: boolean } | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false); // Add this flag

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
        if (currentUser.user_metadata?.picture && currentUser.user_metadata.picture !== profile.avatar_url) {
          updateData.avatar_url = currentUser.user_metadata.picture;
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
            console.log('User metadata refreshed successfully:', updateData);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to refresh user metadata:', error);
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
    <AuthContext.Provider value={{ user, login, logout, hasPermission, canCreateUser, loading, setCreatingUserFlag, refreshUserMetadata }}>
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
