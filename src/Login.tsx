  import React, { useState } from 'react';
  import { useNavigate, useLocation } from 'react-router-dom';
  import { Eye, EyeOff } from 'lucide-react';
  import { auth, db, supabase } from './lib/supabase';
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
      console.log('Email input changed:', value); // Debug log
      
      // Development shortcut: Auto-fill password for specific usernames
      if (value === 'admin' || value === 'instructor' || value === 'student' || value === 'registrar' || value === 'programhead') {
        setFormData({ 
          username: value, 
          password: 'TempPass@123' // Development password
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
              errorMessage = 'Invalid email or password.';
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

    // Google OAuth handler
    const handleGoogleSignIn = async () => {
      try {
        setIsLoading(true);
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'openid profile email',
            redirectTo: `${window.location.origin}/auth/callback`
          }
        });
        // Redirecting away; no further code runs here
      } catch (error) {
        console.error('Google sign-in error:', error);
        toast.error('Failed to start Google sign-in');
        setIsLoading(false);
      }
    };

    // Removed in favor of dedicated /auth/callback route

    const handleCloseModal = () => {
      setShowInstructionModal(false);
    };

    return (
      <div className="relative">
        {/* Login Form with smooth transition */}
        <div
          className={`transition-all duration-700 ease-out ${showInstructionModal ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
          style={{
            animation: !showInstructionModal ? 'fadeInUp 0.8s ease-out' : 'none'
          }}
        >
          {/* X Close Button - only show when login form is visible */}
          {!showInstructionModal && onClose && (
            <button
              className="absolute w-6 h-6 flex items-center justify-center text-lg font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none top-3 right-3"
              aria-label="Close Login"
              onClick={onClose}
            >
              ×
            </button>
          )}
          <div className="w-full bg-white rounded-xl shadow-lg p-6 login-form">
            <div className="text-center mb-" style={{ animation: 'fadeInScale 0.6s ease-out 0.1s both' }}>
              <img
                src="/img/logo.png"
                alt="School Logo"
                className="h-16 w-auto mx-auto mb-3"
              />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit} autoComplete="on">
              <div className="space-y-3">
                <div className="relative group" style={{ animation: 'slideInFromRight 0.7s ease-out 0.2s both' }}>
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
                    Email
                  </label>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    @smcbi.edu.ph
                  </div>
                </div>

                <div className="relative group" style={{ animation: 'slideInFromRight 0.7s ease-out 0.3s both' }}>
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
                  transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 5v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign in
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-px bg-gray-300"></div>
              </div>
              <span className="relative bg-white px-3 text-xs text-gray-500 font-normal">OR</span>
            </div>

            {/* Sign in with Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full mt-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2C3E50] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isLoading}
              aria-label="Sign in with Google"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.602 32.91 29.197 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.53 6.053 29.508 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.36 16.108 18.79 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.53 6.053 29.508 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.137 0 9.8-1.965 13.305-5.178l-6.163-5.221C29.059 35.091 26.66 36 24 36c-5.176 0-9.567-3.06-11.289-7.441l-6.54 5.036C9.466 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.364 3.1-4.238 5.408-7.697 6.101l6.163 5.221C36.846 36.796 40 31.651 40 24c0-1.341-.138-2.651-.389-3.917z"/>
              </svg>
              Continue with Google
            </button>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  className="text-blue-400 hover:underline focus:outline-none focus:underline"
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
                className="absolute w-6 h-6 flex items-center justify-center text-lg font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none top-3 right-3"
                aria-label="Close Account Registration"
                onClick={handleCloseModal}
              >
                ×
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
