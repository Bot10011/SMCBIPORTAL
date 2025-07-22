import React, { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import LandingPage from '../LandingPage';
import { Eye, EyeOff } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const DEFAULT_PASSWORD = 'TempPass@123';

const ProtectedRoute: React.FC<ProtectedRouteProps> = (props) => {
  const { children, allowedRoles } = props;
  const { user, loading: authLoading } = useAuth();

  // All hooks at the top, always called
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const checkedDefaultRef = useRef<string | null>(null);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [checkingDefault, setCheckingDefault] = useState(true);

  // Always call hooks, only run logic if user exists
  useEffect(() => {
    if (!user) return;
    const checkDefaultPassword = async () => {
      if (user.role !== 'student') {
        setCheckingDefault(false);
        return;
      }
      if (checkedDefaultRef.current === user.id) {
        setCheckingDefault(false);
        return;
      }
      checkedDefaultRef.current = user.id;
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('created_at, updated_at, role, password_changed')
          .eq('id', user.id)
          .single();
        if (!error && profile && profile.role === 'student') {
          const createdTime = new Date(profile.created_at);
          const now = new Date();
          const hoursSinceCreation = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
          if (hoursSinceCreation < 24 && !profile.password_changed) {
            setShowChangePassModal(true);
          }
        }
      } catch {
        // ignore error
      } finally {
        setCheckingDefault(false);
      }
    };
    checkDefaultPassword();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const checkActiveStatus = async () => {
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

  if (checkingDefault || isActive === null) {
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