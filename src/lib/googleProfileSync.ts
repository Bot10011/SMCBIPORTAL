import { supabase } from './supabase';

/**
 * Comprehensive Google profile synchronization utility
 * Ensures display_name and avatar_url are always properly stored and updated
 */

export interface GoogleProfileData {
  display_name?: string;
  avatar_url?: string;
  auth_provider?: string;
}

export interface AuthIdentityData {
  full_name?: string;
  name?: string;
  picture?: string;
  avatar_url?: string;
}

export interface AuthIdentity {
  provider?: string;
  identity_data?: AuthIdentityData;
}

export interface AuthUserLike {
  id?: string;
  email?: string;
  app_metadata?: { provider?: string };
  user_metadata?: {
    picture?: string;
    full_name?: string;
    name?: string;
    display_name?: string;
    preferred_username?: string;
  };
  identities?: AuthIdentity[];
}

/**
 * Extract Google display name from auth user metadata
 */
export function extractGoogleDisplayName(authUser: AuthUserLike | null | undefined): string | null {
  if (!authUser || typeof authUser !== 'object') return null;
  
  const metadata = authUser.user_metadata;
  const identities = authUser.identities;
  
  // Priority 1: user_metadata
  if (metadata) {
    const candidates = [
      metadata.full_name,
      metadata.name,
      metadata.display_name,
      metadata.preferred_username
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  
  // Priority 2: identities (OAuth providers)
  if (Array.isArray(identities)) {
    for (const identity of identities) {
      const data = identity?.identity_data;
      if (data) {
        const candidates = [data.full_name, data.name];
        for (const candidate of candidates) {
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract Google avatar URL from auth user metadata
 */
export function extractGoogleAvatarUrl(authUser: AuthUserLike | null | undefined): string | null {
  if (!authUser || typeof authUser !== 'object') return null;
  
  const metadata = authUser.user_metadata;
  const identities = authUser.identities;
  
  // Priority 1: user_metadata
  if (metadata?.picture && typeof metadata.picture === 'string') {
    return enhanceGoogleAvatarUrl(metadata.picture);
  }
  
  // Priority 2: identities (OAuth providers)
  if (Array.isArray(identities)) {
    for (const identity of identities) {
      const data = identity?.identity_data;
      if (data?.picture && typeof data.picture === 'string') {
        return enhanceGoogleAvatarUrl(data.picture);
      }
      if (data?.avatar_url && typeof data.avatar_url === 'string') {
        return enhanceGoogleAvatarUrl(data.avatar_url);
      }
    }
  }
  
  return null;
}

/**
 * Enhance Google avatar URL to force high resolution when possible
 */
export function enhanceGoogleAvatarUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;

  // Only process Google-hosted avatars
  if (!url.includes('googleusercontent.com') && !url.includes('profiles.google.com')) {
    return url;
  }

  let enhanced = url;

  // Case 1: Common pattern from Google Userinfo API e.g. ...=s96-c → upgrade to s512-c
  // Replace '=s<number>' optionally followed by '-c' with '=s512' (preserve '-c' if present)
  enhanced = enhanced.replace(/=s(\d+)(-c)?(?![^?&])/i, (_m, _size, crop) => `=s512${crop || ''}`);

  // Case 2: Query param variant '?sz=NUMBER' → '?sz=512'
  // Handle both ?sz= and &sz=
  enhanced = enhanced.replace(/([?&])sz=\d+/i, (_m, sep) => `${sep}sz=512`);

  // Case 3: Path-embedded size like '/s96-' within the path segments
  // e.g. https://lh3.googleusercontent.com/a-/AOh14Gj.../s96-c/...
  enhanced = enhanced.replace(/\/s(\d+)(?=[/-])/i, '/s512');

  return enhanced;
}

/**
 * Fetch Google profile data from Google Userinfo API
 */
export async function fetchGoogleUserInfo(providerToken: string): Promise<{
  name?: string;
  picture?: string;
} | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    
    if (response.ok) {
      const userInfo = await response.json();
      return {
        name: userInfo.name,
        picture: userInfo.picture
      };
    }
  } catch (error) {
    console.warn('Failed to fetch Google userinfo:', error);
  }
  
  return null;
}

/**
 * Sync Google profile data to user_profiles table
 * This function ensures both display_name and avatar_url are always updated
 */
export async function syncGoogleProfileData(
  userId: string, 
  email: string,
  authUser?: AuthUserLike | null
): Promise<GoogleProfileData | null> {
  try {
    console.log('🔄 Starting Google profile sync for user:', userId);
    
    // Get current auth user if not provided
    const currentAuthUser = authUser || (await supabase.auth.getUser()).data.user as unknown as AuthUserLike | null;
    if (!currentAuthUser) {
      console.warn('No auth user found for profile sync');
      return null;
    }
    
    // Check if this is a Google user
    const isGoogleUser = !!(currentAuthUser?.app_metadata?.provider === 'google' ||
      currentAuthUser?.identities?.some((id: AuthIdentity) => id.provider === 'google'));
    
    if (!isGoogleUser) {
      console.log('User is not a Google user, skipping sync');
      return null;
    }
    
    console.log('🔍 Google user detected, extracting profile data...');
    
    // Extract display name and avatar URL
    let displayName = extractGoogleDisplayName(currentAuthUser);
    let avatarUrl = extractGoogleAvatarUrl(currentAuthUser);
    
    // If we don't have avatar URL, try Google Userinfo API
    if (!avatarUrl) {
      console.log('🔄 No avatar URL found in OAuth response, trying Google Userinfo API...');
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        const userInfo = await fetchGoogleUserInfo(session.provider_token);
        if (userInfo?.picture) {
          avatarUrl = enhanceGoogleAvatarUrl(userInfo.picture);
          console.log('✅ Got avatar URL from Google Userinfo API:', avatarUrl);
        }
        if (userInfo?.name && !displayName) {
          displayName = userInfo.name;
          console.log('✅ Got display name from Google Userinfo API:', displayName);
        }
      }
    }
    
    console.log('📊 Extracted Google profile data:', {
      displayName,
      avatarUrl,
      hasDisplayName: !!displayName,
      hasAvatarUrl: !!avatarUrl
    });
    
    // Prepare update data
    const updateData: GoogleProfileData = {
      auth_provider: 'google'
    };
    
    if (displayName) {
      updateData.display_name = displayName;
    }
    
    if (avatarUrl) {
      updateData.avatar_url = avatarUrl;
    }
    
    // Always update the profile, even if some fields are missing
    // This ensures auth_provider is set and partial updates are applied
    if (Object.keys(updateData).length > 0) {
      console.log('📝 Updating user profile with Google data:', updateData);
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId);
      
      if (updateError) {
        console.error('❌ Failed to update Google profile data:', updateError);
        return null;
      }
      
      console.log('✅ Successfully synced Google profile data:', updateData);
      return updateData;
    } else {
      console.log('ℹ️ No Google profile data to sync');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error syncing Google profile data:', error);
    return null;
  }
}

/**
 * Force refresh Google profile data
 * Useful when user updates their Google profile
 */
export async function refreshGoogleProfileData(userId: string): Promise<boolean> {
  try {
    console.log('🔄 Force refreshing Google profile data for user:', userId);
    
    // Get fresh auth user data
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      console.warn('No auth user found for profile refresh');
      return false;
    }
    
    // Sync the profile data
    const result = await syncGoogleProfileData(userId, authUser.email || '', authUser);
    return result !== null;
    
  } catch (error) {
    console.error('❌ Error refreshing Google profile data:', error);
    return false;
  }
}
