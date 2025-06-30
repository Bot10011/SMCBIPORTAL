import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { locationTracking } from '../lib/locationTracking';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Clock, 
  Globe, 
  Shield, 
  X
} from 'lucide-react';
import GoogleMapView from './GoogleMapView';
import toast from 'react-hot-toast';

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
  location_accuracy?: number;
  location_source?: string;
}

// Google Maps Modal for Login History
const LoginHistoryMapModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  session: LoginSession | null;
}> = ({ isOpen, onClose, session }) => {
  if (!isOpen || !session) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 user-location-modal">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Your Login Location
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
            userName="You"
            accuracy={session.location_accuracy ? parseFloat(session.location_accuracy.toString()) : undefined}
            source={session.location_source}
          />
          
          {/* Session Details */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-3">Session Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
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

const LoginHistory: React.FC = () => {
  const { user } = useAuth();
  const { setShowUserLocationModal } = useModal();
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<LoginSession | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchLoginHistory();
    }
  }, [user?.id]);

  const fetchLoginHistory = async () => {
    try {
      setLoading(true);
      const data = await locationTracking.getRecentSessions(user!.id, 20);
      setSessions(data);
    } catch (error) {
      console.error('Error fetching login history:', error);
      toast.error('Failed to load login history');
    } finally {
      setLoading(false);
    }
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Login History</h2>
              <p className="text-gray-600 mt-1">
                Track your recent login sessions and locations
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-600 font-medium">Secure</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleSessionClick(session)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {new Date(session.login_time).toLocaleDateString()}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(session.login_time).toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                {session.city}, {session.country}
                              </span>
                              <span className="flex items-center">
                                <Globe className="w-4 h-4 mr-1" />
                                {session.ip_address}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {session.device_type}
                          </div>
                          <div className="text-xs text-gray-500">
                            {session.browser} • {session.os}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No login history found</p>
                </div>
              )}

              {/* Google Maps Modal */}
              {selectedSession && (
                <LoginHistoryMapModal
                  isOpen={!!selectedSession}
                  onClose={handleCloseModal}
                  session={selectedSession}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginHistory; 