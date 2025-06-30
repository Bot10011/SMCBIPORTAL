import { supabase } from './supabase';

// Location tracking interfaces
export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  accuracy?: number; // GPS accuracy in meters
  source: 'GPS' | 'IP' | 'UNKNOWN'; // Source of location data
}

export interface LoginSession {
  user_id: string;
  login_time: string;
  ip_address: string;
  user_agent: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  device_type: string;
  browser: string;
  os: string;
  location_accuracy?: number;
  location_source?: string;
}

// Location tracking utilities
export const locationTracking = {
  // Get precise GPS location with user permission (Facebook-style)
  getGPSLocation: async (): Promise<LocationData | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('Geolocation not supported by this browser');
        resolve(null);
        return;
      }

      const options = {
        enableHighAccuracy: true, // Request the most accurate location
        timeout: 10000, // 10 seconds timeout
        maximumAge: 300000 // 5 minutes cache
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords;
            
            // Get detailed address from coordinates
            const locationDetails = await locationTracking.getLocationDetails(latitude, longitude);
            
            resolve({
              ...locationDetails,
              accuracy: accuracy,
              source: 'GPS' as const
            });
          } catch (error) {
            console.error('Error getting GPS location details:', error);
            resolve(null);
          }
        },
        (error) => {
          console.log('GPS location access denied or failed:', error.message);
          resolve(null);
        },
        options
      );
    });
  },

  // Request location permission and get precise location
  requestPreciseLocation: async (): Promise<{ success: boolean; location?: LocationData; message: string }> => {
    try {
      // First try to get GPS location
      const gpsLocation = await locationTracking.getGPSLocation();
      
      if (gpsLocation) {
        return {
          success: true,
          location: gpsLocation,
          message: `Precise location obtained (accuracy: ${gpsLocation.accuracy?.toFixed(0)}m)`
        };
      }
      
      // If GPS fails, try IP-based location
      const ipLocation = await locationTracking.getIPBasedLocation();
      return {
        success: true,
        location: ipLocation,
        message: 'Using IP-based location (approximate)'
      };
      
    } catch (error) {
      console.error('Error requesting precise location:', error);
      return {
        success: false,
        message: 'Location tracking failed'
      };
    }
  },

  // Get location details from coordinates using reverse geocoding
  getLocationDetails: async (latitude: number, longitude: number): Promise<LocationData> => {
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
        longitude,
        source: 'GPS' as const
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
        longitude,
        source: 'UNKNOWN' as const
      };
    }
  },

  // Store login session with enhanced location data
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
        os: getOSInfo(),
        location_accuracy: locationData.accuracy,
        location_source: locationData.source
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get recent login sessions for a user
  getRecentSessions: async (userId: string, limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('login_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('login_time', { ascending: false })
        .limit(limit);

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42703' || error.message.includes('does not exist')) {
          console.warn('login_sessions table does not exist yet. Please run the database schema.');
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user login sessions:', error);
      return [];
    }
  },

  // Get all recent login sessions (for admin monitoring)
  getAllRecentSessions: async (limit: number = 50) => {
    try {
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

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42703' || error.message.includes('does not exist')) {
          console.warn('login_sessions table does not exist yet. Please run the database schema.');
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching login sessions:', error);
      return [];
    }
  },

  // Get login statistics
  getLoginStats: async () => {
    try {
      const { data, error } = await supabase
        .from('login_sessions')
        .select('login_time, user_id');

      if (error) {
        // If table doesn't exist, return default stats
        if (error.code === '42703' || error.message.includes('does not exist')) {
          console.warn('login_sessions table does not exist yet. Please run the database schema.');
          return {
            totalSessions: 0,
            last24h: 0,
            last7d: 0,
            last30d: 0,
            uniqueUsers: 0
          };
        }
        throw error;
      }

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
    } catch (error) {
      console.error('Error getting login stats:', error);
      return {
        totalSessions: 0,
        last24h: 0,
        last7d: 0,
        last30d: 0,
        uniqueUsers: 0
      };
    }
  },

  // Enhanced track user login with precise location (Facebook-style)
  trackUserLogin: async (userId: string, requestPreciseLocation: boolean = false) => {
    try {
      let locationData: LocationData;
      let precision = 'IP';
      
      if (requestPreciseLocation) {
        // Try to get precise GPS location first
        const preciseResult = await locationTracking.requestPreciseLocation();
        
        if (preciseResult.success && preciseResult.location) {
          locationData = preciseResult.location;
          precision = preciseResult.location.source;
        } else {
          // Fallback to IP-based location
          locationData = await locationTracking.getIPBasedLocation();
          precision = 'IP';
        }
      } else {
        // Use IP-based location (no permission required)
        locationData = await locationTracking.getIPBasedLocation();
        precision = 'IP';
      }
      
      // Store login session
      const session = await locationTracking.storeLoginSession(userId, locationData);
      
      return {
        success: true,
        session,
        location: locationData,
        precision: precision
      };
    } catch (error) {
      console.error('Error tracking user login:', error);
      
      // Fallback: store session without location
      try {
        const fallbackLocation: LocationData = {
          latitude: 0,
          longitude: 0,
          address: 'Location unavailable',
          city: 'Unknown',
          state: 'Unknown',
          country: 'Unknown',
          postal_code: '',
          source: 'UNKNOWN'
        };
        
        const session = await locationTracking.storeLoginSession(userId, fallbackLocation);
        
        return {
          success: true,
          session,
          location: fallbackLocation,
          error: 'Location tracking failed, but login was recorded'
        };
      } catch (fallbackError) {
        console.error('Error storing fallback session:', fallbackError);
        return {
          success: false,
          error: 'Failed to track login session'
        };
      }
    }
  },

  // Get location based on IP address (no permission required, automatic)
  getIPBasedLocation: async (): Promise<LocationData> => {
    try {
      // First get the IP address
      const ip = await getClientIP();
      
      // Try multiple IP geolocation services for better reliability and accuracy
      let locationData = null;
      
      // Try ipapi.co first (most reliable)
      try {
        const response1 = await fetch(`https://ipapi.co/${ip}/json/`);
        if (response1.ok) {
          const data = await response1.json();
          if (data.latitude && data.longitude && data.latitude !== 0 && data.longitude !== 0) {
            locationData = data;
          }
        }
      } catch {
        console.debug('ipapi.co failed, trying alternative service');
      }
      
      // Fallback to ip-api.com if first service fails
      if (!locationData) {
        try {
          const response2 = await fetch(`http://ip-api.com/json/${ip}`);
          if (response2.ok) {
            const data = await response2.json();
            if (data.status === 'success' && data.lat && data.lon) {
              locationData = {
                latitude: data.lat,
                longitude: data.lon,
                city: data.city,
                region: data.regionName,
                country_name: data.country,
                postal: data.zip
              };
            }
          }
        } catch {
          console.debug('ip-api.com also failed');
        }
      }
      
      // Third fallback to ipinfo.io
      if (!locationData) {
        try {
          const response3 = await fetch(`https://ipinfo.io/${ip}/json`);
          if (response3.ok) {
            const data = await response3.json();
            if (data.loc) {
              const [lat, lon] = data.loc.split(',').map(Number);
              if (lat && lon) {
                locationData = {
                  latitude: lat,
                  longitude: lon,
                  city: data.city,
                  region: data.region,
                  country_name: data.country,
                  postal: data.postal
                };
              }
            }
          }
        } catch {
          console.debug('ipinfo.io also failed');
        }
      }
      
      if (locationData) {
        return {
          latitude: parseFloat(locationData.latitude) || 0,
          longitude: parseFloat(locationData.longitude) || 0,
          address: `${locationData.city || 'Unknown'}, ${locationData.region || locationData.regionName || 'Unknown'}, ${locationData.country_name || locationData.country || 'Unknown'}`,
          city: locationData.city || 'Unknown',
          state: locationData.region || locationData.regionName || 'Unknown',
          country: locationData.country_name || locationData.country || 'Unknown',
          postal_code: locationData.postal || locationData.zip || '',
          source: 'IP' as const
        };
      }
      
      throw new Error('All IP geolocation services failed');
    } catch (error) {
      console.error('Error getting IP-based location:', error);
      
      // Return default location if IP geolocation fails
      return {
        latitude: 0,
        longitude: 0,
        address: 'Location unavailable',
        city: 'Unknown',
        state: 'Unknown',
        country: 'Unknown',
        postal_code: '',
        source: 'UNKNOWN' as const
      };
    }
  }
};

// Helper functions
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