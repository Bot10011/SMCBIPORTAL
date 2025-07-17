import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {ArrowLeft, AlertTriangle, Shield, Activity } from 'lucide-react';

interface NotFoundProps {
  reason?: 'unauthorized' | 'not_found' | 'access_denied';
  attemptedPath?: string;
  userRole?: string;
}

const NotFound: React.FC<NotFoundProps> = ({ 
  reason = 'not_found', 
  attemptedPath, 
  userRole 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectAttempts, setRedirectAttempts] = useState(0);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);

  // Detect device capabilities for optimization
  useEffect(() => {
    const detectDeviceCapabilities = () => {
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      
      // Check for low-end devices
      const isLowEnd = 
        // Slow connection
        (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) ||
        // Low memory
        (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) ||
        // Small screen
        window.innerWidth < 768 ||
        // Touch device with small screen (mobile)
        ('ontouchstart' in window && window.innerWidth < 1024);
      
      setIsLowEndDevice(isLowEnd);
    };
    
    detectDeviceCapabilities();
    window.addEventListener('resize', detectDeviceCapabilities);
    return () => window.removeEventListener('resize', detectDeviceCapabilities);
  }, []);

  // Log unauthorized access attempts
  useEffect(() => {
    if (reason === 'unauthorized' || reason === 'access_denied') {
      const logData = {
        timestamp: new Date().toISOString(),
        reason,
        attemptedPath: attemptedPath || location.pathname,
        userRole,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        ip: 'client-side' // Will be logged on server side
      };

      // Log to console for development
      console.warn('Unauthorized access attempt:', logData);

      // In production, you would send this to your logging service
      // Example: sendToLoggingService(logData);

      // Increment redirect attempts counter
      setRedirectAttempts(prev => prev + 1);
    }
  }, [reason, attemptedPath, userRole, location.pathname]);
  

  const getMessage = () => {
    switch (reason) {
      case 'unauthorized':
        return {
          title: 'Access Denied',
          subtitle: 'You are not authorized to access this page.',
          description: 'This could be due to insufficient permissions or an invalid session.',
          icon: <Shield className="w-16 h-16 text-red-500" />
        };
      case 'access_denied':
        return {
          title: 'Access Restricted',
          subtitle: 'This area is restricted to authorized personnel only.',
          description: 'Please contact your administrator if you believe this is an error.',
          icon: <AlertTriangle className="w-16 h-16 text-orange-500" />
        };
      default:
        return {
          title: 'Page Not Found',
          subtitle: 'The page you are looking for does not exist.',
          description: 'The URL may be incorrect or the page may have been moved.',
          icon: <AlertTriangle className="w-16 h-16 text-blue-500" />
        };
    }
  };

  const message = getMessage();


  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  // Optimized logo component with lazy loading and responsive sizing
  const SchoolLogo = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: logoLoaded ? 1 : 0, scale: logoLoaded ? 1 : 0.8 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`relative ${isLowEndDevice ? 'w-16 h-16' : 'w-20 h-20'} md:w-24 md:h-24 lg:w-28 lg:h-28`}
    >
      <img
        src="/img/logo.png"
        alt="School Logo"
        className="w-full h-full object-contain drop-shadow-lg"
        onLoad={() => setLogoLoaded(true)}
        loading="eager"
        decoding="async"
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
          willChange: 'transform'
        }}
      />
      {!logoLoaded && (
        <div className="absolute inset-0 bg-gray-200 rounded-full animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 flex items-center justify-center p-2 sm:p-4 ${isLowEndDevice ? 'bg-gradient-to-br from-gray-100 to-blue-100' : ''}`}>
      <div className={`w-full ${isLowEndDevice ? 'max-w-sm' : 'max-w-2xl'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: isLowEndDevice ? 0.3 : 0.6 }}
          className={`bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl p-4 sm:p-6 md:p-8 lg:p-12 text-center relative overflow-hidden ${isLowEndDevice ? 'shadow-lg' : ''}`}
        >
          {/* Background decoration */}
          <div className={`absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 ${isLowEndDevice ? 'opacity-30' : 'opacity-50'}`}></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          {/* Main content */}
          <div className="relative z-10">
            {/* School Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <SchoolLogo />
            </motion.div>



            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isLowEndDevice ? 0.5 : 0.6 }}
              className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 ${isLowEndDevice ? 'text-xl' : ''}`}
            >
              {message.title}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isLowEndDevice ? 0.6 : 0.7 }}
              className={`text-base sm:text-lg md:text-xl text-gray-600 mb-4 sm:mb-6 ${isLowEndDevice ? 'text-sm' : ''}`}
            >
              {message.subtitle}
            </motion.p>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isLowEndDevice ? 0.7 : 0.8 }}
              className={`text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 max-w-md mx-auto ${isLowEndDevice ? 'text-xs' : ''}`}
            >
              {message.description}
            </motion.p>

            {/* Error code */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: isLowEndDevice ? 0.8 : 1 }}
              className={`mb-6 sm:mb-8 ${isLowEndDevice ? 'mb-4' : ''}`}
            >
              <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 rounded-full text-xs sm:text-sm font-mono text-gray-600 ${isLowEndDevice ? 'px-2 py-1 text-xs' : ''}`}>
                <Activity className={`${isLowEndDevice ? 'w-3 h-3' : 'w-4 h-4'}`} />
                <span className={isLowEndDevice ? 'text-xs' : ''}>Error 404</span>
                {reason !== 'not_found' && (
                  <span className={`text-red-500 ${isLowEndDevice ? 'text-xs' : ''}`}>• {reason.toUpperCase()}</span>
                )}
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isLowEndDevice ? 0.9 : 1.2 }}
              className={`flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center ${isLowEndDevice ? 'gap-2' : ''}`}
            >
              <button
                onClick={handleGoBack}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gray-100 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 text-sm sm:text-base ${isLowEndDevice ? 'px-3 py-2 text-xs rounded-md' : ''}`}
              >
                <ArrowLeft className={`${isLowEndDevice ? 'w-4 h-4' : 'w-5 h-5'}`} />
                Go Back
              </button>

              {reason === 'unauthorized' && (
                <button
                  onClick={handleGoToLogin}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg sm:rounded-xl font-semibold hover:bg-green-700 transition-all duration-200 text-sm sm:text-base ${isLowEndDevice ? 'px-3 py-2 text-xs rounded-md' : ''}`}
                >
                  Login
                </button>
              )}
            </motion.div>

            {/* Security notice for unauthorized access */}
            {reason === 'unauthorized' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: isLowEndDevice ? 1.0 : 1.4 }}
                className={`mt-6 sm:mt-8 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl ${isLowEndDevice ? 'mt-4 p-2 rounded-md' : ''}`}
              >
                <div className={`flex items-center gap-2 text-red-700 mb-2 ${isLowEndDevice ? 'mb-1' : ''}`}>
                  <Shield className={`${isLowEndDevice ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`font-semibold ${isLowEndDevice ? 'text-sm' : ''}`}>Security Notice</span>
                </div>
                <p className={`text-xs sm:text-sm text-red-600 ${isLowEndDevice ? 'text-xs' : ''}`}>
                  Unauthorized access attempts are logged for security purposes. 
                  Repeated attempts may result in account restrictions.
                </p>
                {redirectAttempts > 1 && (
                  <p className={`text-xs text-red-500 mt-2 ${isLowEndDevice ? 'mt-1' : ''}`}>
                    Redirect attempts: {redirectAttempts}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
