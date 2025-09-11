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

  const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024; // 2GB default quota
  const usedBytes = databaseHealth?.totalStorageSize || 0;
  const leftBytes = STORAGE_LIMIT_BYTES - usedBytes;

  const handleSessionClick = (session: LoginSession) => {
    setSelectedSession(session);
    setShowUserLocationModal(true);
  };

  const handleCloseModal = () => {
    setSelectedSession(null);
    setShowUserLocationModal(false);
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-5 shadow-lg text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-4 rounded-full bg-white/20 p-3">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">System Monitoring</h1>
              <p className="text-sm opacity-90">Live status, recent logins, and storage usage</p>
            </div>
          </div>
          <button
            onClick={fetchSystemData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="w-full flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* System Status Cards */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            <div className="flex items-start rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <div className="mr-4 rounded-full bg-blue-100 p-3"><Users className="h-6 w-6 text-blue-600" /></div>
              <div>
                <p className="text-xs font-medium text-gray-500">Recent Users (24h)</p>
                <p className="text-2xl font-bold text-gray-900">{databaseHealth?.recentActivity.totalActiveUsers || 0}</p>
                <p className="text-xs text-green-600">Active in the last day</p>
              </div>
            </div>
            <div className="flex items-start rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <div className="mr-4 rounded-full bg-green-100 p-3"><Database className="h-6 w-6 text-green-600" /></div>
              <div>
                <p className="text-xs font-medium text-gray-500">Database Rows</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(databaseHealth?.totalRows || 0)}</p>
                <p className="text-xs text-green-700">Total records</p>
              </div>
            </div>
            <div className="flex items-start rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <div className="mr-4 rounded-full bg-purple-100 p-3"><HardDrive className="h-6 w-6 text-purple-600" /></div>
              <div>
                <p className="text-xs font-medium text-gray-500">Storage Used</p>
                <p className="text-2xl font-bold text-gray-900">{formatBytes(usedBytes)}</p>
                <p className="text-xs text-gray-500 mt-1">Left: <span className="font-semibold">{formatBytes(leftBytes > 0 ? leftBytes : 0)}</span> / {formatBytes(STORAGE_LIMIT_BYTES)}</p>
              </div>
            </div>
            <div className="flex items-start rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <div className="mr-4 rounded-full bg-orange-100 p-3"><Activity className="h-6 w-6 text-orange-600" /></div>
              <div>
                <p className="text-xs font-medium text-gray-500">Database Size</p>
                <p className="text-2xl font-bold text-gray-900">{formatBytes(databaseHealth?.estimatedDbSize || 0)}</p>
                <p className="text-xs text-orange-700">Estimated</p>
              </div>
            </div>
          </div>

          {/* Login Sessions */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center text-xl font-bold text-gray-800">
                <Clock className="mr-2 h-5 w-5 text-blue-500" />
                Recent Login Sessions
              </h2>
              {loginStats && (
                <div className="text-sm text-gray-500">{loginStats.last24h} logins in last 24h • {loginStats.uniqueUsers} unique users</div>
              )}
            </div>
            
            {loginSessions.length > 0 ? (
              <div className="space-y-2">
                {loginSessions.slice(0, 10).map((session) => (
                  <div 
                    key={session.id} 
                    className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200 hover:bg-gray-100"
                    onClick={() => handleSessionClick(session)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {session.user_profiles?.first_name} {session.user_profiles?.last_name}
                          </span>
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                            {session.user_profiles?.role}
                          </span>
                          {session.location_source && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide ${
                                session.location_source === 'GPS'
                                  ? 'bg-green-100 text-green-700'
                                  : session.location_source === 'IP'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                              title={session.location_accuracy ? `Accuracy: ~${Math.round(session.location_accuracy)}m` : undefined}
                            >
                              {session.location_source}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <MapPin className="mr-1 h-3 w-3" />
                            {session.city}, {session.country}
                          </span>
                          <span>{session.device_type} • {session.browser}</span>
                          <span>{new Date(session.login_time).toLocaleString()}</span>
                          {typeof session.location_accuracy === 'number' && session.location_accuracy > 0 && (
                            <span className="text-[11px] text-gray-500">±{Math.round(session.location_accuracy)}m</span>
                          )}
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
                <Clock className="mx-auto mb-3 h-12 w-12 text-gray-300" />
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


