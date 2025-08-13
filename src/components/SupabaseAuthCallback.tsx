import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StudentStatus, UserRole } from '../types/auth';
import toast from 'react-hot-toast';

const SupabaseAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    const run = async () => {
      try {
        // Ensure we have a session/user from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
 
          return;
        }

        const email = user.email || '';
        const allowedDomain = 'smcbi.edu.ph';
        const domain = (email.split('@')[1] || '').toLowerCase();

        // Check if profile exists without creating it
        const { data: existingProfile, error: fetchError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError) {
          console.error('Error checking profile:', fetchError);
          toast.error('Could not verify your account. Please try again.', { id: 'auth-verify-failed' });
          await supabase.auth.signOut();
          navigate('/', { replace: true });
          return;
        }

        if (!existingProfile) {
          // No profile in DB
          if (domain === allowedDomain) {
            toast.error('Your school email is recognized, but your account is not registered in the portal. Please contact your adviser or Program Head.', { id: 'auth-no-profile-org' });
          } else {
            toast.error('Please sign in using your official school email account.', { id: 'auth-wrong-domain' });
          }
          // Remove provisional Auth user so it won't appear under Authentication
          try {
            await fetch('/api/delete-auth-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id })
            });
          } catch (delErr) {
            console.warn('Cleanup delete-auth-user failed (non-critical):', delErr);
          }
          await supabase.auth.signOut();
          navigate('/', { replace: true });
          return;
        }

        // Existing profile → proceed to app
        const normalizedRole: UserRole = (existingProfile.role === 'program_head') ? 'program_head' : existingProfile.role;
        const userDataToStore = {
          id: user.id,
          email,
          username: email.split('@')[0],
          role: normalizedRole,
          isAuthenticated: true,
          studentStatus: (existingProfile as unknown as { student_status?: StudentStatus }).student_status
        };
        login(userDataToStore);
        localStorage.setItem('user', JSON.stringify(userDataToStore));

        const from = (location.state as unknown as { from?: { pathname?: string } })?.from?.pathname || `/${normalizedRole}/dashboard/`;
        toast.success('Signed in successfully', { id: 'auth-success' });
        navigate(from, { replace: true });
      } catch (err) {
        console.error('Auth callback error:', err);
        toast.error('Authentication failed. Please try again.', { id: 'auth-fatal' });
        navigate('/', { replace: true });
      }
    };
    void run();
  }, [navigate, location.state, login]);

  return (
    <div className="min-h-screen flex items-center justify-center">
 
    </div>
  );
};

export default SupabaseAuthCallback;


