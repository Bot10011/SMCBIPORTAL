import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, UserCircle, Briefcase } from 'lucide-react';

// Removed cropping/upload utilities; avatar will be fetched from Google account metadata

interface TeacherProfile {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  role: string;
  department?: string;
  is_active: boolean;
  profile_picture_url?: string;
}

const TeacherSettings: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  
  
  // Edit profile and change password removed for this view

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (user?.id) {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (error) throw error;
          setProfile(data);
          // Fetch Google avatar and display name from auth user metadata (robust fallbacks)
          const { data: authUserData } = await supabase.auth.getUser();
          const authUserUnknown = authUserData?.user;
          const authUserObj = authUserUnknown && typeof authUserUnknown === 'object'
            ? (authUserUnknown as {
                user_metadata?: Record<string, unknown> | null;
                identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> | null }> | null;
              })
            : undefined;

          const identities = Array.isArray(authUserObj?.identities) ? authUserObj?.identities : [];
          const googleIdentity = identities.find(i => i?.provider === 'google');
          const identityData = googleIdentity?.identity_data || undefined;
          const metadata = authUserObj?.user_metadata || undefined;

          const avatarFromIdentity = (identityData?.['avatar_url'] as string | undefined) || (identityData?.['picture'] as string | undefined);
          const avatarFromMetadata = (metadata?.['avatar_url'] as string | undefined) || (metadata?.['picture'] as string | undefined) || (metadata?.['profile_picture'] as string | undefined);
          const nameFromMetadata = (metadata?.['full_name'] as string | undefined) || (metadata?.['name'] as string | undefined) || (metadata?.['given_name'] as string | undefined) || (metadata?.['preferred_username'] as string | undefined);
          const nameFromIdentity = (identityData?.['name'] as string | undefined) || (identityData?.['full_name'] as string | undefined) || (identityData?.['given_name'] as string | undefined);

          const nameFromProfile = `${data?.first_name || ''} ${data?.middle_name ? data.middle_name + ' ' : ''}${data?.last_name || ''}`.trim();
          const resolvedName = nameFromMetadata || nameFromIdentity || nameFromProfile || data?.username || '';
          setDisplayName(resolvedName);

          let resolvedAvatar = avatarFromMetadata || avatarFromIdentity || null;

          // Fallback: call Google userinfo endpoint using provider access token
          if (!resolvedAvatar) {
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const providerToken = sessionData?.session?.provider_token;
              if (providerToken) {
                const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${providerToken}` },
                });
                if (resp.ok) {
                  const json = (await resp.json()) as Record<string, unknown>;
                  const apiPicture = (json['picture'] as string | undefined) || null;
                  const apiName = (json['name'] as string | undefined) || (json['given_name'] as string | undefined) || undefined;
                  if (!resolvedName && apiName) setDisplayName(apiName);
                  if (apiPicture) resolvedAvatar = apiPicture;
                }
              }
            } catch {
              // ignore network errors; fall back to initials avatar
            }
          }

          if (!resolvedAvatar && resolvedName) {
            resolvedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}`;
          }
          setProfilePictureUrl(resolvedAvatar);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id]);

  // Removed upload and crop handlers; avatar is sourced from Google metadata

  // Removed edit form initialization

  // Removed handleEditProfile

  // Removed handleChangePassword

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br  via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h3>
          <p className="text-gray-600">Unable to load your profile information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br  via-blue-50 to-indigo-50 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl mx-auto bg-white/80 rounded-3xl shadow-2xl p-8 border border-gray-100 relative"
      >
       
        {/* Edit Profile Modal removed */}

        {/* Change Password Modal removed */}

        {/* Removed crop modal; avatar comes from Google metadata */}

        {/* Horizontal Layout: Profile Picture and Details Side by Side */}
        <div className="flex items-start gap-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center">
            <div className="relative group inline-block mb-3">
              <div 
                className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg flex items-center justify-center overflow-hidden border-4 border-white transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                {profilePictureUrl ? (
                  <img 
                    src={profilePictureUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={() => setProfilePictureUrl(null)}
                  />
                ) : (
                  <UserCircle className="w-20 h-20 text-gray-300" />
                )}
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-semibold mb-1">
              <Briefcase className="w-3.5 h-3.5" />
              {profile.role}
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${profile.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              <div className={`w-2 h-2 rounded-full ${profile.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              {profile.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>

          {/* Profile Details Section */}
          <div className="flex-1 space-y-3">
            {/* Display Name */}
            {displayName && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <UserCircle className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-0.5">Full Name</p>
                  <p className="text-gray-900 text-sm font-medium">{displayName}</p>
                </div>
              </div>
            )}
            {/* Email */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-0.5">Email</p>
                <p className="text-gray-900 text-sm font-medium">{profile.email}</p>
              </div>
            </div>
            {/* Department */}
            {profile.department && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 mb-0.5">Department</p>
                  <p className="text-gray-900 text-sm font-medium">{profile.department}</p>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Action Buttons removed */}
      </motion.div>
    </div>
    
  );
};

export default TeacherSettings; 
