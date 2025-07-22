import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { auth, db } from './lib/supabase';
import { locationTracking } from './lib/locationTracking';
import { useAuth } from './contexts/AuthContext';
import toast from 'react-hot-toast';
import { AuthError } from '@supabase/supabase-js';

interface LoginProps {
  onClose?: () => void;
}

const Login: React.FC<LoginProps> = ({ onClose }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showInstructionModal, setShowInstructionModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just store the username without @smcbi.edu.ph
    const value = e.target.value.replace('@smcbi.edu.ph', '').trim();
    console.log('Username input changed:', value); // Debug log
    
    // Development shortcut: Auto-fill password for specific usernames
    if (value === 'admin' || value === 'teacher' || value === 'student' || value === 'registrar' || value === 'program_head') {
      setFormData({ 
        username: value, 
        password: 'Admin123!' // Development password
      });
    } else {
      setFormData({ ...formData, username: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log('Login attempt started'); // Debug log

    try {
      // Append @smcbi.edu.ph when submitting
      const fullEmail = `${formData.username}@smcbi.edu.ph`;
      console.log('Attempting login with email:', fullEmail); // Debug log
      
      // Sign in with Supabase
      try {
        const { user, session } = await auth.signIn(fullEmail, formData.password);
        console.log('Auth response:', { user, session }); // Debug log
        
        if (!user || !session) {
          throw new Error('No user or session returned from authentication');
        }

        console.log('Auth successful, user ID:', user.id); // Debug log
        console.log('User email from auth:', user.email); // Debug log

        try {
          // Get or create user profile
          console.log('Fetching user profile...'); // Debug log
          const userData = await db.users.getOrCreateProfile(user.id, fullEmail);
          console.log('User profile:', userData); // Debug log

          if (!userData) {
            throw new Error('Failed to get or create user profile');
          }

          // Update auth context
          console.log('Updating auth context...'); // Debug log
          
          // Normalize role (convert program_head to programhead)
          const normalizedRole = userData.role === 'program_head' ? 'program_head' : userData.role;
          
          const userDataToStore = {
            id: user.id,
            email: fullEmail,
            username: formData.username,
            role: normalizedRole,
            isAuthenticated: true,
            studentStatus: userData.student_status
          };
          login(userDataToStore);

          // Store in localStorage first
          localStorage.setItem('user', JSON.stringify(userDataToStore));

          // Track user login with location (silent, automatic)
          locationTracking.trackUserLogin(user.id).catch(trackingError => {
            // Silently handle any location tracking errors
            console.debug('Location tracking failed (non-critical):', trackingError);
          });

          // Redirect to appropriate dashboard using normalized role
          const from = location.state?.from?.pathname || `/${normalizedRole}/dashboard/`;
          console.log('Redirecting to:', from); // Debug log
          
          // Add a longer delay to ensure state updates are processed
          setTimeout(() => {
            navigate(from, { replace: true });
          }, 500);
          
          toast.success('Successfully logged in!');
        } catch (profileError: Error | unknown) {
          console.error('Error with user profile:', profileError);
          // Sign out the user since we couldn't handle their profile
          await auth.signOut();
          const errorMessage = profileError instanceof Error ? profileError.message : 'Unknown error occurred';
          throw new Error(`Failed to set up your account: ${errorMessage}`);
        }
      } catch (authError) {
        console.error('Authentication error:', authError);
        throw authError;
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to login. Please try again.';
      
      if (error instanceof AuthError) {
        console.log('Auth error details:', error); // Debug log
        switch (error.message) {
          case 'Invalid login credentials':
            errorMessage = 'Invalid username or password.';
            break;
          case 'Email not confirmed':
            errorMessage = 'Please verify your email address.';
            break;
          default:
            errorMessage = `Authentication error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('Login attempt finished'); // Debug log
    }
  };

  const handleCloseModal = () => {
    setShowInstructionModal(false);
  };

  return (
    <div className="relative">
      {/* Login Form with smooth transition */}
      <div
        className={`transition-all duration-500 ${showInstructionModal ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
      >
        {/* X Close Button - only show when login form is visible */}
        {!showInstructionModal && onClose && (
          <button
            className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90 top-2 right-2 sm:top-3 sm:right-3"
            aria-label="Close Login"
            style={{ backgroundColor: 'rgb(239, 68, 68)', boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px', zIndex: 50 }}
            onClick={onClose}
          >
            &times;
          </button>
        )}
        <div className="w-full bg-white rounded-xl shadow-lg p-6">
          <div className="text-center mb-">
            <img
              src="/img/logo.png"
              alt="School Logo"
              className="h-16 w-auto mx-auto mb-3"
            />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} autoComplete="on">
            <div className="space-y-3">
              <div className="relative group">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-900 
                    focus:outline-none focus:border-[#2C3E50] focus:ring-1 focus:ring-[#2C3E50] 
                    transition-all duration-300 ease-in-out
                    peer pt-4
                    shadow-[inset_2px_2px_6px_#e0e0e0,inset_-1px_-1px_3px_#ffffff] focus:shadow-[inset_1px_1px_3px_#e0e0e0,inset_-1px_-1px_2px_#ffffff]"
                  placeholder=" "
                  value={formData.username}
                  onChange={handleEmailChange}
                  disabled={isLoading}
                />
                <label 
                  htmlFor="username" 
                  className="absolute text-xs text-gray-600 duration-300 transform 
                    -translate-y-3 scale-75 top-2 z-10 origin-[0]
                    peer-focus:text-[#2C3E50] peer-focus:font-medium 
                    peer-placeholder-shown:scale-100 
                    peer-placeholder-shown:-translate-y-1/2 
                    peer-placeholder-shown:top-1/2 
                    peer-focus:top-1.5 
                    peer-focus:scale-75 
                    peer-focus:-translate-y-3 
                    left-4
                    px-2 bg-white"
                >
                  Username
                </label>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  @smcbi.edu.ph
                </div>
              </div>

              <div className="relative group">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-900 
                    focus:outline-none focus:border-[#2C3E50] focus:ring-1 focus:ring-[#2C3E50] 
                    transition-all duration-300 ease-in-out
                    peer pt-4
                    shadow-[inset_2px_2px_6px_#e0e0e0,inset_-1px_-1px_3px_#ffffff] focus:shadow-[inset_1px_1px_3px_#e0e0e0,inset_-1px_-1px_2px_#ffffff]"
                  placeholder=" "
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isLoading}
                />
                <label 
                  htmlFor="password" 
                  className="absolute text-xs text-gray-600 duration-300 transform 
                    -translate-y-3 scale-75 top-2 z-10 origin-[0]
                    peer-focus:text-[#2C3E50] peer-focus:font-medium 
                    peer-placeholder-shown:scale-100 
                    peer-placeholder-shown:-translate-y-1/2 
                    peer-placeholder-shown:top-1/2 
                    peer-focus:top-1.5 
                    peer-focus:scale-75 
                    peer-focus:-translate-y-3 
                    left-4
                    px-2 bg-white"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                type="button"
                className="text-xs text-gray-600 hover:text-gray-800"
                disabled={isLoading}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-[#2C3E50] text-white rounded-xl text-sm font-medium
                hover:bg-[#1a2634] focus:outline-none focus:ring-2 focus:ring-[#2C3E50] focus:ring-offset-2 
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
          </div>

          {/* Remove the Sign in with Google button */}

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Don't have an account?{' '}
              <button
                type="button"
                className="text-blue-600 hover:underline focus:outline-none focus:underline"
                onClick={() => setShowInstructionModal(true)}
              >
                Click here.
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Instruction Modal with smooth transition */}
      {showInstructionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-40 transition-all duration-500">
          <div
            className={`bg-white rounded-xl shadow-lg p-6 max-w-sm w-full relative animate-fade-in`}
          >
            {/* X Close Button - styled the same as login modal */}
            <button
              className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90 top-2 right-2 sm:top-3 sm:right-3"
              aria-label="Close Account Registration"
              style={{ backgroundColor: 'rgb(239, 68, 68)', boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px', zIndex: 50 }}
              onClick={handleCloseModal}
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Account Registration</h2>
            <p className="text-gray-600 text-sm mb-4">
To request an account, please approach your adviser or visit the Program Head's office. Only authorized users can be registered in the portal. If you believe you should have access, provide your full name, student ID, and a valid email address.            </p>
            <ul className="list-disc list-inside text-gray-500 text-xs mb-2">
              <li>Students: Use your official school email and ID number.</li>
            </ul>
            <p className="text-xs text-gray-400 mt-2">For security, self-registration is not available.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
