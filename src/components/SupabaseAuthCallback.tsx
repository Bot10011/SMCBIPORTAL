import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const SupabaseAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [handled, setHandled] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (handled) return;
      setHandled(true);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          localStorage.setItem('google_error', JSON.stringify({
            title: 'Sign-in Error',
            message: 'We could not complete your sign-in. Please try again.'
          }));
          navigate('/', { replace: true });
          return;
        }

        const user = session.user;
        if (!user?.email) {
          localStorage.setItem('google_error', JSON.stringify({
            title: 'Sign-in Error',
            message: 'We could not read your Google account email. Please try again.'
          }));
          navigate('/', { replace: true });
          return;
        }

        // Only check registration. Google already restricts the domain.
        const { db } = await import('../lib/supabase');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exists = await (db as any).users.checkUserExists(user.email);
        if (!exists) {
          await supabase.auth.signOut();
          localStorage.setItem('google_error', JSON.stringify({
            title: 'Account Not Registered',
            message: 'Your account is not registered in our system. Please contact the admin.'
          }));
          navigate('/', { replace: true });
          return;
        }

        // Registered: continue (minimal work, then route away)
        try {
          // Pass the user object directly to preserve Google metadata
          const userData = await db.users.getOrCreateProfile(user.id, user.email, 'student', user);
          if (userData) {
            const userDataToStore = {
              id: user.id,
              email: user.email,
              username: user.email.split('@')[0],
              role: userData.role,
              isAuthenticated: true,
              studentStatus: userData.student_status
            } as const;
            login(userDataToStore);
            localStorage.setItem('user', JSON.stringify(userDataToStore));
            
            // Google users will have their avatars refreshed automatically by AuthContext
            if (user.app_metadata?.provider === 'google') {
              console.log('🔄 Google user logged in, avatar refresh will be triggered automatically by AuthContext');
            }
            
            navigate('/dashboard', { replace: true });
            return;
          }
        } catch {
          // Non-critical profile setup error; continue to dashboard
        }

        // Fallback
        navigate('/dashboard', { replace: true });
      } catch {
        await supabase.auth.signOut();
        localStorage.setItem('google_error', JSON.stringify({
          title: 'Sign-in Error',
          message: 'We could not complete your sign-in. Please try again.'
        }));
        navigate('/', { replace: true });
      }
    };

    handleAuthCallback();
  }, [handled, navigate, login]);

  // Render nothing to avoid any loading screen
  return null;
};

export default SupabaseAuthCallback;


