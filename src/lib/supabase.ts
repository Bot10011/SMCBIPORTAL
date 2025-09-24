import { createClient } from '@supabase/supabase-js';
// Relax types to avoid 'never' errors across dynamic tables
import { Database } from '../types/supabase';
import { UserRole } from '../types/auth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'smcbi-web-auth'
  },
  global: {
    headers: {
      'X-Client-Info': 'student-portal-web'
    }
  }
});

// Types for our database tables
export type User = {
  id: string;
  email: string;
  role: 'admin' | 'instructor' | 'student' | 'registrar';
  first_name: string;
  last_name: string;
  department?: string;
  subject?: string;
  grade?: string;
  student_id?: string;
  registration_number?: string;
  created_at: string;
  created_by: string;
  updated_at?: string;
  is_active: boolean;
};

// Helper functions for user management
export const userManagement = {
  // Create a new user
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all users
  async getUsers() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get user by ID
  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Update user
  async updateUser(id: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete user
  async deleteUser(id: string) {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get users by role
  async getUsersByRole(role: User['role']) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },
};

// Helper functions for common operations
export const auth = {
  signIn: async (email: string, password: string, captchaToken?: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }
};

// Helper function to enhance Google avatar URL quality
export const enhanceGoogleAvatarUrl = (url: string): string => {
  if (!url || !url.includes('googleusercontent.com')) {
    return url;
  }
  
  // Remove existing size parameters and add high-quality parameters
  // Google supports sizes up to 2000x2000 pixels
  const baseUrl = url.split('=')[0];
  const enhancedUrl = `${baseUrl}=s512-c-no`; // 512x512 pixels, no crop - high quality
  
  console.log('🖼️ Enhanced avatar URL:', { original: url, enhanced: enhancedUrl });
  return enhancedUrl;
};

// Helper function to extract Google avatar URL from auth user
export const getGoogleAvatarUrl = (authUser: { 
  user_metadata?: { picture?: string }; 
  identities?: Array<{ 
    provider?: string; 
    identity_data?: { picture?: string; avatar_url?: string } 
  }> 
} | null): string | null => {
  if (!authUser) {
    console.log('❌ getGoogleAvatarUrl: No auth user provided');
    return null;
  }
  
  console.log('🔍 getGoogleAvatarUrl: Checking avatar sources...');
  
  // Priority 1: Check user_metadata.picture
  if (authUser.user_metadata?.picture && typeof authUser.user_metadata.picture === 'string') {
    const enhancedUrl = enhanceGoogleAvatarUrl(authUser.user_metadata.picture);
    console.log('✅ getGoogleAvatarUrl: Found avatar in user_metadata.picture:', enhancedUrl);
    return enhancedUrl;
  }
  
  // Priority 2: Check identities for Google avatar
  if (authUser.identities) {
    console.log('🔍 getGoogleAvatarUrl: Checking identities...');
    for (const identity of authUser.identities) {
      console.log('🔍 getGoogleAvatarUrl: Checking identity:', {
        provider: identity.provider,
        has_identity_data: !!identity.identity_data,
        picture: identity.identity_data?.picture,
        avatar_url: identity.identity_data?.avatar_url
      });
      
      if (identity.provider === 'google' && identity.identity_data) {
        const avatarFromIdentity = identity.identity_data.picture || identity.identity_data.avatar_url;
        if (typeof avatarFromIdentity === 'string') {
          const enhancedUrl = enhanceGoogleAvatarUrl(avatarFromIdentity);
          console.log('✅ getGoogleAvatarUrl: Found avatar in identity:', enhancedUrl);
          return enhancedUrl;
        }
      }
    }
  }
  
  console.log('❌ getGoogleAvatarUrl: No avatar found in any source');
  return null;
};

// Database operations
export const db = {
  // User management
  users: {
    create: async (userData: Database['public']['Tables']['user_profiles']['Insert']) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert(userData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    getByRole: async (role: UserRole) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', role);
      if (error) throw error;
      return data;
    },

    update: async (id: string, updates: Database['public']['Tables']['user_profiles']['Update']) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    // Check if user exists in database by email
    checkUserExists: async (email: string): Promise<boolean> => {
      try {
        console.log('🔍 Checking if user exists in database:', email);
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, email, role, is_active')
          .eq('email', email)
          .maybeSingle();

        console.log('🔍 Database query result:', { data, error });

        if (error) {
          console.error('Error checking user in database:', error);
          return false;
        }

        // User exists and is active
        if (data && data.is_active) {
          console.log('✅ User found in database:', data);
          return true;
        }

        // User exists but is inactive
        if (data && !data.is_active) {
          console.log('❌ User found but inactive:', data);
          return false;
        }

        // User doesn't exist
        console.log('❌ User not found in database:', email);
        return false;
      } catch (error) {
        console.error('Error checking user existence:', error);
        return false;
      }
    },

    // New function to get or create user profile
    getOrCreateProfile: async (userId: string, email: string, defaultRole: UserRole = 'student', authUser?: { 
      id?: string;
      app_metadata?: { provider?: string };
      user_metadata?: { picture?: string; full_name?: string; name?: string; display_name?: string };
      identities?: Array<{ 
        provider?: string; 
        identity_data?: { picture?: string; avatar_url?: string } 
      }>;
    }) => {
      // First try to get the existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        throw fetchError;
      }

      // If profile exists, check for Google avatar updates
      if (existingProfile) {
        console.log('Found existing profile:', existingProfile);
        
        // Check if this is a Google user and update metadata if needed
        try {
          // Use passed authUser or fetch it
          const currentAuthUser = authUser || (await supabase.auth.getUser()).data.user;
          console.log('🔍 Auth user for existing profile:', {
            id: currentAuthUser?.id,
            provider: currentAuthUser?.app_metadata?.provider,
            user_metadata: currentAuthUser?.user_metadata,
            identities: currentAuthUser?.identities
          });
          
          // Log the complete auth user object for debugging
          console.log('🔍 Complete auth user object (existing):', JSON.stringify(currentAuthUser, null, 2));
          
          if (currentAuthUser && currentAuthUser.app_metadata?.provider === 'google') {
            console.log('🔍 Detailed Google avatar data for existing profile:', {
              user_metadata_picture: currentAuthUser.user_metadata?.picture,
              identities: currentAuthUser.identities?.map((identity: { 
                provider?: string; 
                identity_data?: { picture?: string; avatar_url?: string } 
              }) => ({
                provider: identity.provider,
                identity_data: identity.identity_data
              }))
            });
            
            let newAvatarUrl = getGoogleAvatarUrl(currentAuthUser);
            console.log('🖼️ Extracted Google avatar URL for existing profile:', newAvatarUrl);
            
            // If no avatar URL found, try to get it from Google Userinfo API
            if (!newAvatarUrl) {
              console.log('🔄 No avatar URL found in OAuth response, trying Google Userinfo API...');
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.provider_token) {
                  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${session.provider_token}` }
                  });
                  if (userInfoResponse.ok) {
                    const userInfo = await userInfoResponse.json();
                    console.log('🔍 Google Userinfo API response:', userInfo);
                    if (userInfo.picture && typeof userInfo.picture === 'string') {
                      newAvatarUrl = enhanceGoogleAvatarUrl(userInfo.picture);
                      console.log('✅ Got enhanced avatar URL from Google Userinfo API:', newAvatarUrl);
                    }
                  }
                }
              } catch (error) {
                console.warn('Failed to get avatar from Google Userinfo API:', error);
              }
            }
            
            // Extract display name from Google user metadata
            let newDisplayName: string | null = null;
            if (currentAuthUser.user_metadata?.full_name) {
              newDisplayName = currentAuthUser.user_metadata.full_name;
            } else if (currentAuthUser.user_metadata?.name) {
              newDisplayName = currentAuthUser.user_metadata.name;
            } else if (currentAuthUser.user_metadata?.display_name) {
              newDisplayName = currentAuthUser.user_metadata.display_name;
            }
            console.log('👤 Extracted Google display name for existing profile:', newDisplayName);
            
            // Prepare update data
            const updateData: { avatar_url?: string; display_name?: string; auth_provider?: string } = {};
            
            // Update avatar_url if we found a new one
            if (newAvatarUrl && newAvatarUrl !== existingProfile.avatar_url) {
              updateData.avatar_url = newAvatarUrl;
              console.log('🔄 Avatar URL needs update:', { old: existingProfile.avatar_url, new: newAvatarUrl });
            }
            
            // Update display_name if we found a new one
            if (newDisplayName && newDisplayName !== existingProfile.display_name) {
              updateData.display_name = newDisplayName;
              console.log('🔄 Display name needs update:', { old: existingProfile.display_name, new: newDisplayName });
            }
            
            // Update auth_provider if not set
            if (!existingProfile.auth_provider) {
              updateData.auth_provider = 'google';
              console.log('🔄 Auth provider needs update: google');
            }
            
            // Perform update if there are changes
            if (Object.keys(updateData).length > 0) {
              console.log('📝 Updating existing profile with data:', updateData);
              const { error: updateError } = await supabase
                .from('user_profiles')
                .update(updateData)
                .eq('id', userId);
              
              if (!updateError) {
                console.log('✅ Updated Google metadata:', { userId, ...updateData });
                // Update the existing profile object with new values
                Object.assign(existingProfile, updateData);
              } else {
                console.error('❌ Failed to update Google metadata:', updateError);
              }
            } else {
              console.log('ℹ️ No Google metadata updates needed');
            }
          } else {
            console.log('ℹ️ User is not a Google user or auth user not found');
          }
        } catch (error) {
          console.warn('Failed to check Google metadata update:', error);
        }
        
        return existingProfile;
      }

      console.log('Creating new profile for user:', userId);
      
      // Get Google avatar and display name for new profiles if this is a Google user
      let googleAvatarUrl: string | null = null;
      let googleDisplayName: string | null = null;
      try {
        // Use passed authUser or fetch it
        const currentAuthUser = authUser || (await supabase.auth.getUser()).data.user;
        console.log('🔍 Auth user for new profile:', {
          id: currentAuthUser?.id,
          provider: currentAuthUser?.app_metadata?.provider,
          user_metadata: currentAuthUser?.user_metadata,
          identities: currentAuthUser?.identities
        });
        
        // Log the complete auth user object for debugging
        console.log('🔍 Complete auth user object:', JSON.stringify(currentAuthUser, null, 2));
        
        if (currentAuthUser && currentAuthUser.app_metadata?.provider === 'google') {
          console.log('🔍 Detailed Google avatar data:', {
            user_metadata_picture: currentAuthUser.user_metadata?.picture,
            identities: currentAuthUser.identities?.map((identity: { 
              provider?: string; 
              identity_data?: { picture?: string; avatar_url?: string } 
            }) => ({
              provider: identity.provider,
              identity_data: identity.identity_data
            }))
          });
          
          googleAvatarUrl = getGoogleAvatarUrl(currentAuthUser);
          console.log('🖼️ Extracted Google avatar URL:', googleAvatarUrl);
          
          // If no avatar URL found, try to get it from Google Userinfo API
          if (!googleAvatarUrl) {
            console.log('🔄 No avatar URL found in OAuth response, trying Google Userinfo API...');
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.provider_token) {
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${session.provider_token}` }
                });
                  if (userInfoResponse.ok) {
                    const userInfo = await userInfoResponse.json();
                    console.log('🔍 Google Userinfo API response:', userInfo);
                    if (userInfo.picture && typeof userInfo.picture === 'string') {
                      googleAvatarUrl = enhanceGoogleAvatarUrl(userInfo.picture);
                      console.log('✅ Got enhanced avatar URL from Google Userinfo API:', googleAvatarUrl);
                    }
                  }
              }
            } catch (error) {
              console.warn('Failed to get avatar from Google Userinfo API:', error);
            }
          }
          
          // Extract display name from Google user metadata
          if (currentAuthUser.user_metadata?.full_name) {
            googleDisplayName = currentAuthUser.user_metadata.full_name;
          } else if (currentAuthUser.user_metadata?.name) {
            googleDisplayName = currentAuthUser.user_metadata.name;
          } else if (currentAuthUser.user_metadata?.display_name) {
            googleDisplayName = currentAuthUser.user_metadata.display_name;
          }
          console.log('👤 Extracted Google display name:', googleDisplayName);
        }
      } catch (error) {
        console.warn('Failed to get Google metadata for new profile:', error);
      }
      
      // If no profile exists, create one
      const profileData = {
        id: userId, // Explicitly set the user ID
        email,
        role: defaultRole,
        first_name: email.split('@')[0], // Default to email prefix, should be updated later
        last_name: '', // Should be updated later
        is_active: true,
        display_name: googleDisplayName, // Include Google display name if available
        avatar_url: googleAvatarUrl, // Include Google avatar if available
        auth_provider: googleAvatarUrl ? 'google' : undefined
      };
      
      console.log('📝 Creating profile with data:', profileData);
      
      const { data: createdProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        throw createError;
      }

      console.log('✅ Created new profile:', {
        id: createdProfile.id,
        email: createdProfile.email,
        display_name: createdProfile.display_name,
        avatar_url: createdProfile.avatar_url,
        auth_provider: createdProfile.auth_provider
      });
      return createdProfile;
    }
  },

  // Location tracking
  location: {
    // Get user's current location
    getCurrentLocation: (): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this browser'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          (error) => reject(error),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });
    },

    // Get location details from coordinates using reverse geocoding
    getLocationDetails: async (latitude: number, longitude: number) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch location details');
        }

        const data = await response.json();
        return {
          address: data.display_name,
          city: data.address?.city || data.address?.town || data.address?.village,
          state: data.address?.state,
          country: data.address?.country,
          postal_code: data.address?.postcode,
          latitude,
          longitude
        };
      } catch (error) {
        console.error('Error getting location details:', error);
        return {
          address: 'Location unavailable',
          city: 'Unknown',
          state: 'Unknown',
          country: 'Unknown',
          postal_code: '',
          latitude,
          longitude
        };
      }
    },

    // Store login session with location
    storeLoginSession: async (userId: string, locationData: LocationData) => {
      const { data, error } = await supabase
        .from('login_sessions')
        .insert({
          user_id: userId,
          login_time: new Date().toISOString(),
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: locationData.address,
          city: locationData.city,
          state: locationData.state,
          country: locationData.country,
          postal_code: locationData.postal_code,
          device_type: getDeviceType(),
          browser: getBrowserInfo(),
          os: getOSInfo()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // Get recent login sessions for a user
    getRecentSessions: async (userId: string, limit: number = 10) => {
      const { data, error } = await supabase
        .from('login_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('login_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },

    // Get all recent login sessions (for admin monitoring)
    getAllRecentSessions: async (limit: number = 50) => {
      const { data, error } = await supabase
        .from('login_sessions')
        .select(`
          *,
          user_profiles (
            id,
            email,
            first_name,
            last_name,
            role
          )
        `)
        .order('login_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },

    // Get login statistics
    getLoginStats: async () => {
      const { data, error } = await supabase
        .from('login_sessions')
        .select('login_time, user_id');

      if (error) throw error;

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const sessions = data || [];
      
      return {
        totalSessions: sessions.length,
        last24h: sessions.filter(s => new Date(s.login_time) > last24h).length,
        last7d: sessions.filter(s => new Date(s.login_time) > last7d).length,
        last30d: sessions.filter(s => new Date(s.login_time) > last30d).length,
        uniqueUsers: new Set(sessions.map(s => s.user_id)).size
      };
    }
  },

  // Enrollment management
  enrollment: {
    create: async (enrollmentData: Database['public']['Tables']['enrollments']['Insert']) => {
      const { data, error } = await supabase
        .from('enrollments')
        .insert(enrollmentData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    getByStudent: async (studentId: string) => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', studentId);
      if (error) throw error;
      return data;
    }
  },

  // Grade management
  studentGrades: {
    update: async (gradeId: string, gradeData: Database['public']['Tables']['student_grades']['Update']) => {
      const { data, error } = await supabase
        .from('student_grades')
        .update(gradeData)
        .eq('id', gradeId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    getByClass: async (teacherSubjectId: string) => {
      const { data, error } = await supabase
        .from('student_grades')
        .select(`
          *,
          enrollment:enrollments(
            student:user_profiles(*)
          )
        `)
        .eq('teacher_subject_id', teacherSubjectId);
      if (error) throw error;
      return data;
    }
  }
};

// Helper functions for location tracking
const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP address:', error);
    return 'Unknown';
  }
};

const getDeviceType = (): string => {
  const userAgent = navigator.userAgent;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    return 'Mobile';
  } else if (/Tablet|iPad/i.test(userAgent)) {
    return 'Tablet';
  } else {
    return 'Desktop';
  }
};

const getBrowserInfo = (): string => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
};

const getOSInfo = (): string => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
};

// Database monitoring utilities
export const dbMonitoring = {
  // Get table row counts
  getTableStats: async () => {
    // Only include tables that are definitely used in the codebase
    const tables = [
      'user_profiles',    // Used extensively throughout the app
      'enrollcourse',     // Used in student and teacher components
      'courses',          // Used in registrar and program head components
      'teacher_subjects', // Used in teacher components
      'grades',           // Used in teacher components
      'programs'          // Used in user creation and management
    ];

    const stats: Record<string, number> = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error(`Error getting count for ${table}:`, error);
          stats[table] = 0;
        } else {
          stats[table] = count || 0;
        }
      } catch (error) {
        console.error(`Error accessing table ${table}:`, error);
        stats[table] = 0;
      }
    }

    return stats;
  },

  // Get storage bucket information
  getStorageStats: async () => {
    try {
      const buckets = ['avatar']; // Only avatar bucket exists based on the codebase
      const stats: Record<string, { size: number; count: number }> = {};

      for (const bucket of buckets) {
        try {
          const { data: files, error } = await supabase.storage
            .from(bucket)
            .list('', { limit: 1000 });

          if (error) {
            console.error(`Error listing files in ${bucket}:`, error);
            stats[bucket] = { size: 0, count: 0 };
            continue;
          }

          let totalSize = 0;
          const fileCount = files?.length || 0;

          // Calculate total size (this is approximate as we can't get exact file sizes via client)
          if (files) {
            totalSize = fileCount * 1024 * 1024; // Approximate 1MB per file
          }

          stats[bucket] = { size: totalSize, count: fileCount };
        } catch (error) {
          console.error(`Error accessing bucket ${bucket}:`, error);
          stats[bucket] = { size: 0, count: 0 };
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {};
    }
  },

  // Get database connection info
  getConnectionInfo: async () => {
    try {
      // Get current session info
      const { data: { session } } = await supabase.auth.getSession();
      
      return {
        connected: !!session,
        userId: session?.user?.id || null,
        lastActivity: session?.user?.last_sign_in_at || null,
        provider: session?.user?.app_metadata?.provider || 'email'
      };
    } catch (error) {
      console.error('Error getting connection info:', error);
      return {
        connected: false,
        userId: null,
        lastActivity: null,
        provider: null
      };
    }
  },

  // Get recent activity (last 24 hours)
  getRecentActivity: async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Get recent user profiles (using created_at as a proxy for activity)
      // Note: In a real implementation, you might want to create an activity log table
      const { data: recentProfiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, role, created_at')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (profileError) {
        console.error('Error getting recent profiles:', profileError);
      }

      // Get current session info for active user
      const { data: { session } } = await supabase.auth.getSession();
      
      return {
        recentLogins: recentProfiles?.map(profile => ({
          id: profile.id,
          email: profile.email,
          role: profile.role,
          last_login: profile.created_at // Using created_at as proxy
        })) || [],
        totalActiveUsers: recentProfiles?.length || 0,
        currentUser: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          lastSignIn: session.user.last_sign_in_at
        } : null
      };
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return {
        recentLogins: [],
        totalActiveUsers: 0,
        currentUser: null
      };
    }
  },

  // Get system health metrics
  getSystemHealth: async () => {
    try {
      const [tableStats, storageStats, connectionInfo, recentActivity] = await Promise.all([
        dbMonitoring.getTableStats(),
        dbMonitoring.getStorageStats(),
        dbMonitoring.getConnectionInfo(),
        dbMonitoring.getRecentActivity()
      ]);

      // Calculate total database size (approximate)
      const totalRows = Object.values(tableStats).reduce((sum, count) => sum + count, 0);
      const estimatedDbSize = totalRows * 1024; // Approximate 1KB per row

      // Calculate total storage size
      const totalStorageSize = Object.values(storageStats).reduce((sum, bucket) => sum + bucket.size, 0);

      return {
        tableStats,
        storageStats,
        connectionInfo,
        recentActivity,
        totalRows,
        estimatedDbSize,
        totalStorageSize,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        tableStats: {},
        storageStats: {},
        connectionInfo: { connected: false, userId: null, lastActivity: null, provider: null },
        recentActivity: { recentLogins: [], totalActiveUsers: 0, currentUser: null },
        totalRows: 0,
        estimatedDbSize: 0,
        totalStorageSize: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
};

// Location tracking interfaces
interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
} 
