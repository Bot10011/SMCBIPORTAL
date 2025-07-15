import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// import { useDashboardAccess } from '../contexts/DashboardAccessContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import LandingPage from '../LandingPage';
import { Eye, EyeOff } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const DEFAULT_PASSWORD = 'TempPass@123';

// Add a helper to map roles to dashboard paths
const getDashboardPath = (role: string) => {
  if (role === 'program_head') return '/program_head/dashboard/';
  return `/${role}/dashboard`;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles
}) => {
  const { user, loading: authLoading } = useAuth();
  // const { loading: accessLoading, getRestrictionFields } = useDashboardAccess();
  const location = useLocation();
  // Password change enforcement state
  const [checkingDefault, setCheckingDefault] = useState(true);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const checkedDefaultRef = useRef<string | null>(null);
  const [isActive, setIsActive] = useState<boolean | null>(null);

  // Check if user is using the default password
  useEffect(() => {
    const checkDefaultPassword = async () => {
      if (!user) {
        setCheckingDefault(false);
        return;
      }
      // Only enforce for students
      if (user.role !== 'student') {
        setCheckingDefault(false);
        return;
      }
      // Only check once per user per session
      if (checkedDefaultRef.current === user.id) {
        setCheckingDefault(false);
        return;
      }
      checkedDefaultRef.current = user.id;
      
      // Check if the user is still using the default password
      // We'll use a more reliable approach by checking if they're a new student
      // and if they haven't logged in with a different password yet
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('created_at, updated_at, role, password_changed')
          .eq('id', user.id)
          .single();
        
        if (!error && profile && profile.role === 'student') {
          // Only check for students
          const createdTime = new Date(profile.created_at);
          const now = new Date();
          const hoursSinceCreation = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
          
          // If user was created recently (within last 24 hours) and hasn't changed password yet,
          // they likely still have default password
          if (hoursSinceCreation < 24 && !profile.password_changed) {
            setShowChangePassModal(true);
          }
        }
      } catch {
        // Ignore errors
      } finally {
        setCheckingDefault(false);
      }
    };
    checkDefaultPassword();
  }, [user]);

  // Check if user is active
  useEffect(() => {
    const checkActiveStatus = async () => {
      if (!user) {
        setIsActive(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('is_active')
          .eq('id', user.id)
          .single();
        if (!error && data) {
          setIsActive(data.is_active);
        } else {
          setIsActive(null);
        }
      } catch {
        setIsActive(null);
      }
    };
    checkActiveStatus();
  }, [user]);

  if (authLoading || checkingDefault || isActive === null) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  // Show force password change modal if needed
  if (showChangePassModal) {
    return (
      <div className="relative min-h-screen">
        <LandingPage />
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Change Your Default Password</h2>
            <p className="mb-4 text-gray-600">For your security, please set a new password before accessing your account.</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="w-full border rounded px-3 py-2 pr-10"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowNewPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="w-full border rounded px-3 py-2 pr-10"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              disabled={
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword ||
                newPassword === DEFAULT_PASSWORD
              }
              onClick={async () => {
                if (newPassword !== confirmPassword) {
                  toast.error('Passwords do not match');
                  return;
                }
                if (newPassword === DEFAULT_PASSWORD) {
                  toast.error('Please choose a password different from the default.');
                  return;
                }
                try {
                  const { error } = await supabase.auth.updateUser({ password: newPassword });
                  if (error) throw error;
                  
                  // Update the user profile to mark password as changed
                  if (user) {
                    const { error: profileError } = await supabase
                      .from('user_profiles')
                      .update({ 
                        password_changed: true,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', user.id);
                    
                    if (profileError) {
                      console.error('Failed to update profile:', profileError);
                    }
                  }
                  
                  toast.success('Password updated! Please log in again.');
                  setShowChangePassModal(false);
                  await supabase.auth.signOut();
                  window.location.reload();
                } catch (error: unknown) {
                  if (error instanceof Error) {
                    toast.error(error.message || 'Failed to update password');
                  } else {
                    toast.error('Failed to update password');
                  }
                }
              }}
            >
              Change Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle authentication
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Prevent access for deactivated users
  if (isActive === false) {
    toast.error('Your account has been deactivated. Please contact the administrator.');
    supabase.auth.signOut();
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Handle role-based access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  // Show loading state while checking access (if you re-enable access checks, restore this logic)

  return <>{children}</>;
};

export default ProtectedRoute; 
