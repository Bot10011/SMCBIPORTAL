import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/auth';

interface DashboardAccessConfig {
  role: UserRole;
  has_access: boolean;
  restriction_heading: string;
  restriction_subtext: string;
}

interface DashboardAccessContextType {
  checkAccess: (userRole: UserRole) => Promise<boolean>;
  loading: boolean;
  refreshAccessConfig: () => Promise<void>;
  getAccessMessage: (userRole: UserRole) => string | null;
  getRestrictionFields: (userRole: UserRole) => { heading: string; subtext: string };
}

const DashboardAccessContext = createContext<DashboardAccessContextType | undefined>(undefined);

export const DashboardAccessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accessConfig, setAccessConfig] = useState<DashboardAccessConfig[]>([]);

  const fetchAccessConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_access')
        .select('*');

      if (error) {
        console.error('Error fetching access configuration:', error);
        setAccessConfig([
          { role: 'admin', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'Admin dashboard access is restricted.' },
          { role: 'registrar', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'Registrar dashboard access is restricted.' },
          { role: 'program_head', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'Program Head dashboard access is restricted.' },
          { role: 'teacher', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'Teacher dashboard access is restricted.' },
          { role: 'student', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'Student dashboard access is restricted.' },
        ]);
        return;
      }

      if (data && data.length > 0) {
        setAccessConfig(data);
      } else {
        setAccessConfig([
          { role: 'admin', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'Admin dashboard access is restricted.' },
          { role: 'registrar', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'Registrar dashboard access is restricted.' },
          { role: 'program_head', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'Program Head dashboard access is restricted.' },
          { role: 'teacher', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'Teacher dashboard access is restricted.' },
          { role: 'student', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'Student dashboard access is restricted.' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching access configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAccessConfig();
  }, []);

  // Subscribe to changes in the dashboard_access table
  useEffect(() => {
    const subscription = supabase
      .channel('dashboard_access_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'dashboard_access' 
        }, 
        () => {
          fetchAccessConfig();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAccess = async (userRole: UserRole): Promise<boolean> => {
    // SuperAdmin always has access
    if (user?.role === 'superadmin') {
      return true;
    }

    // Check if the user's role matches the requested role
    if (user?.role !== userRole) {
      return false;
    }

    // Find the access configuration for the user's role
    const config = accessConfig.find(config => config.role === userRole);
    
    if (!config) {
      return true;
    }

    return config.has_access;
  };

  const getAccessMessage = (userRole: UserRole): string | null => {
    const config = accessConfig.find(config => config.role === userRole);
    if (!config || config.has_access) {
      return null;
    }
    return config.restriction_subtext;
  };

  const getRestrictionFields = (userRole: UserRole) => {
    const config = accessConfig.find(config => config.role === userRole);
    return {
      heading: config?.restriction_heading || 'Access Restricted',
      subtext: config?.restriction_subtext || 'You do not have access to this dashboard.'
    };
  };

  return (
    <DashboardAccessContext.Provider value={{ 
      checkAccess, 
      loading, 
      refreshAccessConfig: fetchAccessConfig,
      getAccessMessage,
      getRestrictionFields
    }}>
      {children}
    </DashboardAccessContext.Provider>
  );
};

export const useDashboardAccess = () => {
  const context = useContext(DashboardAccessContext);
  if (context === undefined) {
    throw new Error('useDashboardAccess must be used within a DashboardAccessProvider');
  }
  return context;
};
