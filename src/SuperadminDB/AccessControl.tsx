import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/auth';
import toast from 'react-hot-toast';

interface DashboardAccess {
  role: UserRole;
  has_access: boolean;
  restriction_heading: string;
  restriction_subtext: string;
}

const AccessControl: React.FC = () => {
  const { user } = useAuth();  const [dashboardAccess, setDashboardAccess] = useState<DashboardAccess[]>([
    { role: 'admin', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'You do not have access to this dashboard.' },
    { role: 'registrar', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'You do not have access to this dashboard.' },
    { role: 'program_head', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'You do not have access to this dashboard.' },
    { role: 'teacher', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'You do not have access to this dashboard.' },
    { role: 'student', has_access: true, restriction_heading: 'Access Restricted', restriction_subtext: 'You do not have access to this dashboard.' },
  ]);const [loading, setLoading] = useState(false);
  // Function to fetch current access settings from the database
  useEffect(() => {    const fetchAccessSettings = async () => {
      try {
        // First check if the table exists
        const { error: checkError } = await supabase
          .from('dashboard_access')
          .select('id')
          .limit(1);
        
        const tableExists = !checkError;
      
        if (!tableExists) {
          console.error('Dashboard access table does not exist:', checkError);
          return; // Use default settings
        }

        const { data, error } = await supabase
          .from('dashboard_access')
          .select('*');
        
        if (error) {
          console.error('Error fetching dashboard access:', error);
          // Toast notification but continue with default settings
          toast.error('Using default access settings due to database error');
          // No need to throw as we'll continue with default settings
        } else if (data && data.length > 0) {
          setDashboardAccess(data);
        }
      } catch (error) {
        console.error('Error fetching dashboard access:', error);
        toast.error('Failed to fetch dashboard access settings');
      }
    };

    fetchAccessSettings();
  }, []);
  const handleToggleAccess = async (role: UserRole) => {
    setLoading(true);
    
    try {
      // Update locally first for immediate UI feedback
      setDashboardAccess(prev => 
        prev.map(item => 
          item.role === role ? { ...item, has_access: !item.has_access } : item
        )
      );

      // Check if dashboard_access table exists by trying to select from it
      const { error: checkError } = await supabase
        .from('dashboard_access')
        .select('id')
        .limit(1);      if (checkError) {
        // Table doesn't exist or there's another issue
        console.error('Error checking dashboard_access table:', checkError);
        toast.success('Settings are temporarily stored locally only');
        setLoading(false);
        return; // Don't attempt database update
      }

      // Then update in the database
      const { error } = await supabase
        .from('dashboard_access')
        .update({ has_access: !dashboardAccess.find(item => item.role === role)?.has_access })
        .eq('role', role);

      if (error) {
        // Try inserting instead of updating (in case the record doesn't exist)
        const currentAccess = !dashboardAccess.find(item => item.role === role)?.has_access;
        const { error: insertError } = await supabase
          .from('dashboard_access')          .insert({
            role: role,
            has_access: currentAccess,
            restriction_heading: dashboardAccess.find(item => item.role === role)?.restriction_heading || 'Access Restricted',
            restriction_subtext: dashboardAccess.find(item => item.role === role)?.restriction_subtext || 'You do not have access to this dashboard.'
          });
          
        if (insertError) {
          throw insertError;
        }
      }

      toast.success(`${role.charAt(0).toUpperCase() + role.slice(1)} dashboard access updated`);
    } catch (error) {
      console.error('Error updating dashboard access:', error);
      toast.error('Failed to update dashboard access');
      
      // Revert the local change if the database update failed
      setDashboardAccess(prev => 
        prev.map(item => 
          item.role === role ? { ...item, has_access: !item.has_access } : item
        )
      );
    } finally {
      setLoading(false);
    }
  };
  const handleFieldChange = async (role: UserRole, field: keyof DashboardAccess, value: string) => {
    // Update locally first
    setDashboardAccess(prev =>
      prev.map(item =>
        item.role === role ? { ...item, [field]: value } : item
      )
    );

    // Check if dashboard_access table exists by trying to select from it
    const { error: checkError } = await supabase
      .from('dashboard_access')
      .select('id')
      .limit(1);

    if (checkError) {
      // Table doesn't exist or there's another issue
      console.error('Error checking dashboard_access table:', checkError);
      toast.success('Message temporarily stored locally only');
      return; // Don't attempt database update
    }

    // Then update in the database
    const { error } = await supabase
      .from('dashboard_access')
      .update({ [field]: value })
      .eq('role', role);

    if (error) {
      // Try inserting instead of updating (in case the record doesn't exist)
      const access = dashboardAccess.find(item => item.role === role);
      const { error: insertError } = await supabase
        .from('dashboard_access')
        .insert({          role: role,
          has_access: access?.has_access ?? true,
          restriction_heading: access?.restriction_heading ?? 'Access Restricted',
          restriction_subtext: access?.restriction_subtext ?? 'You do not have access to this dashboard.'
        });
      if (insertError) {
        throw insertError;
      }
    }
    toast.success(`Restriction field for ${role} updated`);
  };
  if (!user || user.role !== 'superadmin') {
    return (
      <div className="p-8 bg-red-50 rounded-lg shadow-md text-center">
        <div className="inline-block p-3 bg-red-100 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl text-red-600 font-bold mb-2">Access Denied</h1>
        <p className="text-red-600">You do not have permission to access this page.</p>
      </div>
    );
  }  return (
    <div className="container mx-auto p-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-8 mb-10 text-white">
        <h1 className="text-3xl font-bold mb-4">Dashboard Access Control</h1>
        <p className="text-lg opacity-90">
          Control which user roles can access their dashboards and set custom restriction messages.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">        {dashboardAccess.map((access) => (
          <div 
            key={access.role}
            className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="bg-gray-50 p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${access.has_access ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <h2 className="text-xl font-semibold capitalize text-gray-800">
                    {access.role} Dashboard
                  </h2>
                </div>
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    access.has_access 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {access.has_access ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-gray-600">Toggle Access</span>
                <button
                  onClick={() => handleToggleAccess(access.role)}
                  disabled={loading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    access.has_access ? 'bg-green-500' : 'bg-gray-300'
                  } transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                      access.has_access ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>              <div className="space-y-4">
                <div>
                  <label htmlFor={`heading-${access.role}`} className="block text-sm font-medium text-gray-700 mb-2">
                    Restriction Heading
                  </label>
                  <div className="relative">                    <input
                      id={`heading-${access.role}`}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700"
                      value={access.restriction_heading || ''}
                      onChange={e => handleFieldChange(access.role, 'restriction_heading', e.target.value)}
                      placeholder="Enter restriction heading"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This will be displayed as the title of the restriction message.</p>
                </div>
                
                <div>
                  <label htmlFor={`subtext-${access.role}`} className="block text-sm font-medium text-gray-700 mb-2">
                    Restriction Subtext
                  </label>
                  <div className="relative">                    <textarea
                      id={`subtext-${access.role}`}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-700"
                      rows={3}
                      value={access.restriction_subtext || ''}
                      onChange={e => handleFieldChange(access.role, 'restriction_subtext', e.target.value)}
                      placeholder="Enter restriction subtext"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This will be displayed as the explanation below the heading.</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center">
                  <div className={`w-2 h-10 rounded-l-md ${access.has_access ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="bg-gray-50 p-3 rounded-r-md flex-1">
                    <p className="font-medium">{access.restriction_heading || 'Access Restricted'}</p>
                    <p className="text-sm text-gray-600 mt-1">{access.restriction_subtext || 'You do not have access to this dashboard.'}</p>
                  </div>
                </div>
              </div>
       
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccessControl;
