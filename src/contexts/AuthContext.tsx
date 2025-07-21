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
}

const AuthContext = createContext<AuthContextType & { loading: boolean } | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
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

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, canCreateUser, loading }}>
      {!loading && children}
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
