import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { dbMonitoring } from '../lib/supabase';
import { locationTracking } from '../lib/locationTracking';
import { UserRole } from '../types/auth';
import { 
  Users, 
  Database, 
  HardDrive, 
  Activity, 
  RefreshCw, 
  MapPin, 
  Clock, 
  X 
} from 'lucide-react';
import GoogleMapView from '../components/GoogleMapView';

interface DatabaseHealth {
  tableStats: Record<string, number>;
  storageStats: Record<string, { size: number; count: number }>;
  connectionInfo: {
    connected: boolean;
    userId: string | null;
    lastActivity: string | null;
    provider: string | null;
  };
  recentActivity: {
    recentLogins: Array<{
      id: string;
      email: string;
      role: UserRole;
      last_login: string;
    }>;
    totalActiveUsers: number;
    currentUser: {
      id: string;
      email: string | undefined;
      lastSignIn: string | undefined;
    } | null;
  };
  totalRows: number;
  estimatedDbSize: number;
  totalStorageSize: number;
  timestamp: string;
}

interface LoginSession {
  id: string;
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
  user_profiles?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: UserRole;
  };
  location_accuracy: number;
  location_source: string;
}

interface LoginStats {
  totalSessions: number;
  last24h: number;
  last7d: number;
  last30d: number;
  uniqueUsers: number;
}

// Google Maps Modal component
const GoogleMapModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  session: LoginSession | null;
}> = ({ isOpen, onClose, session }) => {
  if (!isOpen || !session) return null;

  const userName = `${session.user_profiles?.first_name} ${session.user_profiles?.last_name}`;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 user-location-modal">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              User Location: {userName}
            </h3>
            <p className="text-sm text-gray-600">
              {session.address} • {session.city}, {session.country}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <GoogleMapView
            latitude={session.latitude}
            longitude={session.longitude}
            address={session.address}
            city={session.city}
            country={session.country}
            userName={userName}
            accuracy={session.location_accuracy}
            source={session.location_source}
          />
          
          {/* Session Details */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-3">Session Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">User:</span>
                <span className="ml-2 font-medium">{userName}</span>
              </div>
              <div>
                <span className="text-gray-600">Role:</span>
                <span className="ml-2 font-medium">{session.user_profiles?.role}</span>
              </div>
              <div>
                <span className="text-gray-600">Device:</span>
                <span className="ml-2 font-medium">{session.device_type} • {session.browser}</span>
              </div>
              <div>
                <span className="text-gray-600">Login Time:</span>
                <span className="ml-2 font-medium">{new Date(session.login_time).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">IP Address:</span>
                <span className="ml-2 font-medium">{session.ip_address}</span>
              </div>
              <div>
                <span className="text-gray-600">Operating System:</span>
                <span className="ml-2 font-medium">{session.os}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

const SystemMonitoring: React.FC = () => {
  const { user } = useAuth();
  const { setShowUserLocationModal } = useModal();
  const [databaseHealth, setDatabaseHealth] = useState<DatabaseHealth | null>(null);
  const [loginSessions, setLoginSessions] = useState<LoginSession[]>([]);
  const [loginStats, setLoginStats] = useState<LoginStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LoginSession | null>(null);

  const fetchSystemData = async () => {
    try {
      setRefreshing(true);
      
      // Get comprehensive database health data
      const healthData = await dbMonitoring.getSystemHealth();
      setDatabaseHealth(healthData);

      // Get login sessions and stats
      try {
        const [sessions, stats] = await Promise.all([
          locationTracking.getAllRecentSessions(20),
          locationTracking.getLoginStats()
        ]);
        setLoginSessions(sessions);
        setLoginStats(stats);
      } catch (locationError) {
        console.error('Error fetching login sessions:', locationError);
        // Continue without login session data
      }

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching system data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSystemData();

    // Set up real-time refresh every 30 seconds
    const intervalId = setInterval(() => {
      fetchSystemData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <h1 className="text-2xl text-red-600 font-bold mb-2">Access Denied</h1>
        <p className="text-red-600">You do not have permission to access this page.</p>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const handleSessionClick = (session: LoginSession) => {
    setSelectedSession(session);
    setShowUserLocationModal(true);
  };

  const handleCloseModal = () => {
    setSelectedSession(null);
    setShowUserLocationModal(false);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">System Monitoring</h1>
        <button
          onClick={fetchSystemData}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
      
      {loading ? (
        <div className="w-full flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6 flex items-start">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Recent Users (24h)</p>
                <p className="text-2xl font-bold text-gray-800">
                  {databaseHealth?.recentActivity.totalActiveUsers || 0}
                </p>
                <p className="text-sm text-green-500">↑ New profiles created</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 flex items-start">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <Database className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Database Rows</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatNumber(databaseHealth?.totalRows || 0)}
                </p>
                <p className="text-sm text-blue-500">Total records</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 flex items-start">
              <div className="p-3 rounded-full bg-purple-100 mr-4">
                <HardDrive className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Storage Used</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatBytes(databaseHealth?.totalStorageSize || 0)}
                </p>
                <p className="text-sm text-purple-500">Files & documents</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 flex items-start">
              <div className="p-3 rounded-full bg-orange-100 mr-4">
                <Activity className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Database Size</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatBytes(databaseHealth?.estimatedDbSize || 0)}
                </p>
                <p className="text-sm text-orange-500">Estimated</p>
              </div>
            </div>
          </div>

          {/* Login Sessions */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-500" />
                Recent Login Sessions
              </h2>
              {loginStats && (
                <div className="text-sm text-gray-500">
                  {loginStats.last24h} logins in last 24h • {loginStats.uniqueUsers} unique users
                </div>
              )}
            </div>
            
            {loginSessions.length > 0 ? (
              <div className="space-y-3">
                {loginSessions.slice(0, 10).map((session) => (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Activity className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {session.user_profiles?.first_name} {session.user_profiles?.last_name}
                          </span>
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600">
                            {session.user_profiles?.role}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {session.city}, {session.country}
                          </span>
                          <span>{session.device_type} • {session.browser}</span>
                          <span>{new Date(session.login_time).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {session.ip_address}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No login sessions found</p>
              </div>
            )}
          </div>

          {/* Google Maps Modal */}
          {selectedSession && (
            <GoogleMapModal
              isOpen={!!selectedSession}
              onClose={handleCloseModal}
              session={selectedSession}
            />
          )}

        </>
      )}
    </div>
  );
};

export default SystemMonitoring;
