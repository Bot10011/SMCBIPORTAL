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

        // Update user profile with Google metadata if available
        // This will also refresh metadata if user changes their Google account or avatar
        if (user.user_metadata) {
          try {
            // Debug: Log the actual metadata structure
            console.log('Google user metadata:', user.user_metadata);
            console.log('Google app metadata:', user.app_metadata);
            
            // Check for various possible avatar field names
            const avatarUrl = user.user_metadata.avatar_url || 
                             user.user_metadata.picture || 
                             user.user_metadata.avatar ||
                             user.user_metadata.profile_picture ||
                             user.user_metadata.profile_pic ||
                             user.user_metadata.photo ||
                             user.user_metadata.image;
            
            // Check for various possible name field names
            const displayName = user.user_metadata.full_name || 
                               user.user_metadata.name || 
                               user.user_metadata.display_name ||
                               (user.user_metadata.given_name && user.user_metadata.family_name ? 
                                user.user_metadata.given_name + ' ' + user.user_metadata.family_name : null);
            
            // Always update if we have new metadata (this handles account changes and avatar updates)
            if (avatarUrl || displayName || user.app_metadata?.provider) {
              const updateData: {
                display_name?: string;
                avatar_url?: string;
                auth_provider?: string;
              } = {};
              
              if (displayName) updateData.display_name = displayName;
              if (avatarUrl) updateData.avatar_url = avatarUrl;
              if (user.app_metadata?.provider) updateData.auth_provider = user.app_metadata.provider;
              
              const { error: updateError } = await supabase
                .from('user_profiles')
                .update(updateData)
                .eq('id', user.id);
              
              if (updateError) {
                console.warn('Failed to update Google metadata:', updateError);
                // Continue with login even if metadata update fails
              } else {
                console.log('Google user metadata updated successfully:', { displayName, avatarUrl, provider: user.app_metadata?.provider });
              }
            }
          } catch (metadataError) {
            console.warn('Error updating Google metadata:', metadataError);
            // Continue with login even if metadata update fails
          }
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


