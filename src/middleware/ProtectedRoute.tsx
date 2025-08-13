import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import LandingPage from '../LandingPage';
// import { Eye, EyeOff } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

// const DEFAULT_PASSWORD = 'TempPass@123';

const ProtectedRoute: React.FC<ProtectedRouteProps> = (props) => {
  const { children, allowedRoles } = props;
  const { user, loading: authLoading } = useAuth();

  // All hooks at the top, always called
  const [isActive, setIsActive] = useState<boolean | null>(null);

  // Always call hooks, only run logic if user exists
  // Removed default password enforcement modal

  useEffect(() => {
    if (!user) return;
    const checkActiveStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('is_active')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.warn('Error fetching user profile:', error);
          // If user doesn't exist in user_profiles or RLS blocks access, 
          // assume they are active and continue
          setIsActive(true);
          return;
        }
        
        if (data) {
          setIsActive(data.is_active);
        } else {
          // If no data returned but no error, assume active
          setIsActive(true);
        }
      } catch (error) {
        console.warn('Exception while checking active status:', error);
        // On any exception, assume user is active to prevent blocking access
        setIsActive(true);
      }
    };
    checkActiveStatus();
  }, [user]);

  // Loader while checking auth state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, just show the homepage
  if (!user) {
    return <LandingPage />;
  }

  if (isActive === null) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  // Removed default password modal entirely

  // Prevent access for deactivated users
  if (isActive === false) {
    toast.error('Your account has been deactivated. Please contact the administrator.');
    supabase.auth.signOut();
    return <Navigate to="/" replace />;
  }

  // Handle role-based access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 
