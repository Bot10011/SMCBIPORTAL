import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const SupabaseAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const hasShownWelcomeRef = useRef(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
              try {
          console.log('🔄 Processing Google OAuth callback...');
        
        // Get the session from the URL
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
        
        if (!session) {
          throw new Error('No session found');
        }

        const user = session.user;
        console.log('✅ User authenticated:', user.email);
        
        // Get user metadata from Google (includes avatar and name)
        const userMetadata = user.user_metadata;
        const googleProfile = userMetadata?.identities?.[0]?.identity_data;
        
        console.log('🔍 Google profile data:', googleProfile);
        console.log('🔍 Full user metadata:', userMetadata);
        console.log('🔍 User metadata keys:', Object.keys(userMetadata || {}));
        console.log('🔍 Picture field:', userMetadata?.picture);
        console.log('🔍 Avatar URL field:', userMetadata?.avatar_url);
        console.log('🔍 Avatar field:', userMetadata?.avatar);
        console.log('🔍 Profile picture field:', userMetadata?.profile_picture);
        console.log('🔍 Profile pic field:', userMetadata?.profile_pic);
        console.log('🔍 Photo field:', userMetadata?.photo);
        console.log('🔍 Image field:', userMetadata?.image);
        console.log('🔍 Full metadata object:', JSON.stringify(userMetadata, null, 2));
        
                // Extract avatar URL and name using multiple strategies
        const extractAvatarUrl = async () => {
          console.log('🔍 Starting avatar extraction process...');
          console.log('🔍 User metadata keys:', Object.keys(userMetadata || {}));
          console.log('🔍 Full user metadata:', JSON.stringify(userMetadata, null, 2));
          
          // Strategy 1: Try Google People API with current token
          if (session.provider_token) {
            console.log('🔍 Strategy 1: Google People API with current token...');
            
            try {
              const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                  'Authorization': `Bearer ${session.provider_token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const googleUserInfo = await response.json();
                console.log('🎯 Google People API response:', googleUserInfo);
                
                if (googleUserInfo.picture) {
                  console.log('✅ Strategy 1 SUCCESS: Found Google avatar from People API');
                  return googleUserInfo.picture;
                } else {
                  console.log('⚠️ Strategy 1: Google People API returned no picture field');
                }
              } else if (response.status === 401) {
                console.log('⚠️ Strategy 1: Token expired (401 Unauthorized)');
              } else {
                console.log('⚠️ Strategy 1: Google People API request failed:', response.status, response.statusText);
              }
            } catch (error) {
              console.log('⚠️ Strategy 1: Error fetching from Google People API:', error);
            }
          } else {
            console.log('⚠️ Strategy 1: No Google provider token available');
          }
          
          // Strategy 2: Try to refresh token and retry
          if (session.provider_refresh_token) {
            console.log('🔍 Strategy 2: Attempting token refresh...');
            try {
              // Note: Supabase usually handles this automatically, but we can try manual refresh
                             const { data } = await supabase.auth.refreshSession();
              if (data.session?.provider_token) {
                console.log('🔄 Token refreshed, retrying Google People API...');
                
                const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: {
                    'Authorization': `Bearer ${data.session.provider_token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (response.ok) {
                  const googleUserInfo = await response.json();
                  if (googleUserInfo.picture) {
                    console.log('✅ Strategy 2 SUCCESS: Found Google avatar after token refresh');
                    return googleUserInfo.picture;
                  }
                }
              }
            } catch (error) {
              console.log('⚠️ Strategy 2: Token refresh failed:', error);
            }
          }
          
          // Strategy 3: Check Supabase metadata for any avatar fields
          console.log('🔍 Strategy 3: Checking Supabase metadata...');
          const possibleAvatarFields = [
            userMetadata?.picture,           // Google's standard picture field
            userMetadata?.avatar_url,        // Some providers use this
            userMetadata?.avatar,            // Alternative avatar field
            userMetadata?.profile_picture,   // Profile picture field
            userMetadata?.photo,             // Photo field
            userMetadata?.image              // Image field
          ];
          
          const foundAvatar = possibleAvatarFields.find(url => url && typeof url === 'string');
          if (foundAvatar) {
            console.log('✅ Strategy 3 SUCCESS: Found avatar in Supabase metadata');
            return foundAvatar;
          }
          
          // Strategy 4: Try to get stored Google avatar from database
          console.log('🔍 Strategy 4: Checking database for stored Google avatar...');
          try {
            const { data: existingProfile } = await supabase
              .from('user_profiles')
              .select('avatar_url, auth_provider')
              .eq('id', user.id)
              .single();
            
            if (existingProfile?.avatar_url && existingProfile.auth_provider === 'google') {
              // Check if it's a Google avatar URL (not Gravatar)
              if (existingProfile.avatar_url.includes('googleusercontent.com')) {
                console.log('✅ Strategy 4 SUCCESS: Found stored Google avatar in database');
                return existingProfile.avatar_url;
              }
            }
          } catch (error) {
            console.log('⚠️ Strategy 4: Error checking database:', error);
          }
          
          // Strategy 5: Construct Google avatar URL from user ID (permanent fallback)
          if (userMetadata?.sub || userMetadata?.provider_id) {
            console.log('🔍 Strategy 5: Constructing permanent Google avatar URL from user ID...');
            const userId = userMetadata.sub || userMetadata.provider_id;
            // This URL pattern should work permanently without tokens
            const permanentGoogleUrl = `https://lh3.googleusercontent.com/-${userId}/photo?sz=200&v=4`;
            console.log('🔧 Permanent Google URL constructed:', permanentGoogleUrl);
            return permanentGoogleUrl;
          }
          
          console.log('❌ All strategies failed, using Gravatar fallback');
          return null;
        };
        
        const avatarUrl = await extractAvatarUrl();
        const displayName = userMetadata?.full_name || 
                           userMetadata?.name || 
                           googleProfile?.full_name || 
                           user.email?.split('@')[0];
        
        console.log('📸 Avatar URL:', avatarUrl);
        console.log('👤 Display Name:', displayName);
        
        // Create a hash for Gravatar fallback if no Google avatar
        const getGravatarUrl = (email: string) => {
          // Create MD5 hash for Gravatar (simplified version)
          const emailLower = email.toLowerCase().trim();
          const emailHash = btoa(emailLower).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
          return `https://www.gravatar.com/avatar/${emailHash}?d=mp&s=200`;
        };
        
        const finalAvatarUrl = avatarUrl || getGravatarUrl(user.email!);
        console.log('🎯 Final avatar URL:', finalAvatarUrl);
        
        // Check if user profile exists and get current data
        const { data: existingProfile, error: profileFetchError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileFetchError && profileFetchError.code !== 'PGRST116') {
          console.error('Error fetching existing profile:', profileFetchError);
        }
        
        // Debug: Log all available fields in existing profile
        if (existingProfile) {
          console.log('🔍 Existing profile fields:', Object.keys(existingProfile));
          console.log('🔍 Existing profile data:', existingProfile);
        }
        
        // Prepare profile data for upsert
        const profileData: Record<string, any> = {
          id: user.id,
          email: user.email,
          display_name: displayName,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
          role: existingProfile?.role || 'student',
          auth_provider: 'google' // Mark this user as Google-authenticated
        };
        
        // If profile exists, preserve existing values for required fields
        if (existingProfile) {
          // Copy all existing fields to preserve them, but don't overwrite our new data
          Object.keys(existingProfile).forEach(key => {
            if (key !== 'id' && key !== 'updated_at' && key !== 'display_name' && key !== 'avatar_url') {
              (profileData as any)[key] = existingProfile[key];
            }
          });
          
          console.log('🔄 Preserved existing profile fields (excluding display_name and avatar_url)');
        } else {
          // For new users, set default values for required fields
          profileData.school_year = '2024-2025'; // Default school year
          profileData.year_level = '1st Year';   // Default year level
          profileData.department = 'General';    // Default department
          profileData.semester = '1st Semester'; // Default semester
          profileData.student_type = 'Regular';  // Default student type
          
          console.log('🆕 Set default values for new profile');
        }
        
        // Always check for updates to keep avatar fresh
        if (existingProfile) {
          const avatarChanged = existingProfile.avatar_url !== finalAvatarUrl;
          const nameChanged = existingProfile.display_name !== displayName;
          const needsUpdate = avatarChanged || nameChanged;
          
          if (needsUpdate) {
            console.log('🔄 Profile needs update - syncing with latest Google data');
            if (avatarChanged) {
              console.log('🖼️ Avatar changed:');
              console.log('  Old:', existingProfile.avatar_url);
              console.log('  New:', finalAvatarUrl);
            }
            if (nameChanged) {
              console.log('👤 Name changed:');
              console.log('  Old:', existingProfile.display_name);
              console.log('  New:', displayName);
            }
          } else {
            console.log('✅ Profile is up to date with latest Google data');
          }
          
          // Always log the sync status for transparency
          console.log('🔄 Avatar sync status: Always fresh on every login');
          console.log('🔄 This ensures users see their latest Google profile changes');
        } else {
          console.log('🆕 Creating new user profile with Google data');
        }
        
        // Upsert user profile with Google data - ALWAYS keeps avatar fresh and updated
        // This ensures that every login syncs the latest Google profile changes
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert(profileData, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('❌ Error updating profile:', profileError);
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }
        
        console.log('✅ Profile updated successfully');
        
        // Verify the avatar was stored by fetching the updated profile
        const { data: updatedProfile, error: fetchError } = await supabase
          .from('user_profiles')
          .select('avatar_url, display_name')
          .eq('id', user.id)
          .single();
          
        if (fetchError) {
          console.warn('⚠️ Could not verify profile update:', fetchError);
        } else {
          console.log('✅ Profile verification:');
          console.log('  - Avatar URL in database:', updatedProfile.avatar_url);
          console.log('  - Display name in database:', updatedProfile.display_name);
        }
        
        // Show what was updated
        if (existingProfile) {
          console.log('🔄 Profile sync completed:');
          console.log('  - Display name:', existingProfile.display_name, '→', displayName);
          console.log('  - Avatar URL:', existingProfile.avatar_url, '→', finalAvatarUrl);
        } else {
          console.log('🆕 New profile created:');
          console.log('  - Display name:', displayName);
          console.log('  - Avatar URL:', finalAvatarUrl);
        }
        
        // Log the complete profile data being sent
        console.log('📊 Complete profile data sent to database:', profileData);
        console.log('🎯 Avatar URL being stored:', profileData.avatar_url);
        console.log('🎯 Display name being stored:', profileData.display_name);
        
        // Get or create user profile for role and other data
        try {
          // Import the db module dynamically to avoid circular dependencies
          const { db } = await import('../lib/supabase');
          const userData = await db.users.getOrCreateProfile(user.id, user.email!);
          
          if (userData) {
            // Update auth context with user data
            const userDataToStore = {
              id: user.id,
              email: user.email!,
              username: user.email!.split('@')[0],
              role: userData.role,
              isAuthenticated: true,
              studentStatus: userData.student_status,
              displayName: displayName,
              avatarUrl: finalAvatarUrl
            };
            
            login(userDataToStore);
            localStorage.setItem('user', JSON.stringify(userDataToStore));
            
            // Redirect to unified dashboard route
            console.log('🚀 Redirecting to unified dashboard');
            
            if (!hasShownWelcomeRef.current) {
              toast.success(`Welcome back, ${displayName}!`);
              hasShownWelcomeRef.current = true;
            }
            navigate('/dashboard', { replace: true });
          } else {
            throw new Error('Failed to get or create user profile');
          }
        } catch (dbError) {
          console.error('Database operation error:', dbError);
          // If we can't get the full profile, still try to redirect with basic info
          const basicUserData = {
            id: user.id,
            email: user.email!,
            username: user.email!.split('@')[0],
            role: 'student' as const, // Default role with proper typing
            isAuthenticated: true,
            studentStatus: undefined, // Remove studentStatus to avoid type conflict
            displayName: displayName,
            avatarUrl: finalAvatarUrl
          };
          
          login(basicUserData);
          localStorage.setItem('user', JSON.stringify(basicUserData));
          
          if (!hasShownWelcomeRef.current) {
            toast.success(`Welcome, ${displayName}! Redirecting to dashboard...`);
            hasShownWelcomeRef.current = true;
          }
          navigate('/dashboard', { replace: true });
        }
        
      } catch (error) {
        console.error('❌ Auth callback error:', error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
        toast.error('Authentication failed. Please try again.');
        
        // Wait a bit before redirecting to show the error
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, login]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m21 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#031730]">
      {/* Background video and overlays */}
      <div className="fixed inset-0 w-full h-full">
        <video
          className="absolute inset-0 w-full h-full object-cover scale-[1.02] transform-gpu"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/img/bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#031730]/80" />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-cyan-400/10 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 bg-gradient-to-br from-indigo-400/20 to-purple-400/10 blur-3xl rounded-full" />

      {/* Foreground content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="text-center max-w-md w-full">
          {/* Floating logo with subtle glow */}
          <div className="relative mb-8 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: [0, -8, 0] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <img
                src="/img/logo3.png"
                alt="School Logo"
                className="w-24 h-24 mx-auto object-contain drop-shadow-2xl relative z-10"
              />
              {/* Glow ring */}
              <div className="absolute inset-0 -z-0 rounded-full blur-2xl bg-white/10" />
              {/* Pulsing halo */}
              <div className="absolute inset-0 -z-0 rounded-full border border-white/20 animate-ping" />
            </motion.div>
          </div>

          {/* Shimmer loading bar */}
          <div className="mx-auto w-64 h-2 rounded-full bg-white/10 overflow-hidden relative loading-bar mb-6" />

          {/* Loading text */}
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">Completing Sign In</h2>
            <p className="text-white/70 text-sm">Processing your Google account...</p>
          </div>

          {/* Subtle bouncing dots for liveliness */}
          <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
            <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '0.12s' }} />
            <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '0.24s' }} />
          </div>
        </div>
      </div>

      {/* Local styles for shimmer animation and reduced motion */}
      <style>{`
        .loading-bar::after {
          content: '';
          position: absolute;
          inset: 0;
          width: 40%;
          left: -40%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
          animation: shimmer 1.2s ease-in-out infinite;
          border-radius: 9999px;
        }
        @keyframes shimmer {
          0% { left: -40%; }
          100% { left: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .loading-bar::after { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default SupabaseAuthCallback;


