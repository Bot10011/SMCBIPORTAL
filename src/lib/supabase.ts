import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { UserRole } from '../types/auth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Types for our database tables
export type User = {
  id: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'registrar';
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
  }
};

// Helper functions for common operations
export const auth = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
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

    // New function to get or create user profile
    getOrCreateProfile: async (userId: string, email: string, defaultRole: UserRole = 'student') => {
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

      // If profile exists, return it
      if (existingProfile) {
        console.log('Found existing profile:', existingProfile);
        return existingProfile;
      }

      console.log('Creating new profile for user:', userId);
      // If no profile exists, create one
      const { data: createdProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId, // Explicitly set the user ID
          email,
          role: defaultRole,
          first_name: email.split('@')[0], // Default to email prefix, should be updated later
          last_name: '', // Should be updated later
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        throw createError;
      }

      console.log('Created new profile:', createdProfile);
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