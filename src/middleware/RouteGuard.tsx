import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotFound from './404';
import SecurityLogger from './securityLogger';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiresAuth?: boolean;
}

interface AccessAttempt {
  timestamp: number;
  path: string;
  userRole?: string;
  userAgent: string;
  referrer: string;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  allowedRoles = [], 
  requiresAuth = true 
}) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedReason, setDeniedReason] = useState<'unauthorized' | 'not_found' | 'access_denied'>('unauthorized');
  
  // Use refs for better performance
  const accessAttemptsRef = useRef<AccessAttempt[]>([]);
  const lastPathRef = useRef<string>('');
  const lastCheckRef = useRef<number>(0);
  const loggerRef = useRef<SecurityLogger | null>(null);

  // Memoize role path patterns for better performance
  const rolePathPatterns = useMemo(() => ({
    student: ['/dashboard'],
    teacher: ['/dashboard'],
    program_head: ['/dashboard'],
    registrar: ['/dashboard'],
    admin: ['/dashboard'],
    superadmin: ['/dashboard']
  }), []);

  // Initialize logger once
  useEffect(() => {
    if (!loggerRef.current) {
      loggerRef.current = SecurityLogger.getInstance();
    }
  }, []);

  // Optimized cleanup function
  const cleanupOldAttempts = useCallback(() => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    accessAttemptsRef.current = accessAttemptsRef.current.filter(
      attempt => now - attempt.timestamp < oneHourAgo
    );
  }, []);

  // Optimized suspicious behavior detection
  const detectSuspiciousBehavior = useCallback((): boolean => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    // Get recent attempts efficiently
    const recentAttempts = accessAttemptsRef.current.filter(
      attempt => now - attempt.timestamp < fiveMinutesAgo
    );

    // Check for rapid navigation attempts
    if (recentAttempts.length > 8) { // Reduced threshold for better accuracy
      loggerRef.current?.logSuspiciousBehavior({
        userId: user?.id,
        userRole: user?.role,
        attemptedPath: location.pathname,
        details: `Too many access attempts: ${recentAttempts.length} in 5 minutes`,
        behaviorType: 'rapid_navigation',
        severity: 'high'
      });
      return true;
    }

    // Check for attempts to access paths outside user's role scope
    if (user && location.pathname) {
      const userRole = user.role;
      const currentPath = location.pathname;
      
      const allowedPaths = rolePathPatterns[userRole as keyof typeof rolePathPatterns] || [];
      const isPathAllowed = allowedPaths.some(pattern => currentPath.startsWith(pattern));

      if (!isPathAllowed && currentPath.includes('/dashboard')) {
        loggerRef.current?.logSuspiciousBehavior({
          userId: user.id,
          userRole: user.role,
          attemptedPath: currentPath,
          details: `User ${userRole} attempting to access unauthorized dashboard path`,
          behaviorType: 'unauthorized_dashboard_access',
          severity: 'high'
        });
        return true;
      }
    }

    // Check for manual URL manipulation patterns with improved accuracy
    if (lastPathRef.current && location.pathname !== lastPathRef.current) {
      const pathChange = Math.abs(location.pathname.length - lastPathRef.current.length);
      const timeSinceLastChange = now - lastCheckRef.current;
      
      // More sophisticated detection: large path change in short time
      if (pathChange > 30 && timeSinceLastChange < 1000) { // Reduced threshold, added time check
        loggerRef.current?.logRouteManipulation({
          userId: user?.id,
          userRole: user?.role,
          fromPath: lastPathRef.current,
          toPath: location.pathname,
          details: `Large path change detected: ${pathChange} characters in ${timeSinceLastChange}ms`
        });
        return true;
      }
    }

    lastPathRef.current = location.pathname;
    lastCheckRef.current = now;
    return false;
  }, [user, location.pathname, rolePathPatterns]);

  // Optimized authorization check
  const checkAuthorization = useCallback(() => {
    // Prevent infinite loops and unnecessary checks
    if (location.pathname.includes('/404') || location.pathname.includes('/not-found')) {
      return;
    }

    // If auth is still loading, wait
    if (authLoading) {
      return;
    }

    // If authentication is required but user is not logged in
    if (requiresAuth && !user) {
      loggerRef.current?.logUnauthorizedAccess({
        userId: undefined,
        userRole: undefined,
        attemptedPath: location.pathname,
        details: 'User not authenticated',
        severity: 'medium'
      });
      return <Navigate to="/" replace />;
    }

    // If user is logged in but doesn't have required role
    if (user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      loggerRef.current?.logUnauthorizedAccess({
        userId: user.id,
        userRole: user.role,
        attemptedPath: location.pathname,
        details: `User role ${user.role} not allowed for roles: ${allowedRoles.join(', ')}`,
        severity: 'high'
      });
      setDeniedReason('access_denied');
      setAccessDenied(true);
      setIsAuthorized(false);
      return;
    }

    // Check for suspicious behavior patterns
    if (user && detectSuspiciousBehavior()) {
      setDeniedReason('unauthorized');
      setAccessDenied(true);
      setIsAuthorized(false);
      return;
    }

    // If we reach here, access is authorized
    setIsAuthorized(true);
    setAccessDenied(false);
  }, [user, authLoading, location.pathname, allowedRoles, requiresAuth, detectSuspiciousBehavior]);

  // Optimized effect with proper dependencies
  useEffect(() => {
    // Clean up old attempts periodically
    cleanupOldAttempts();
    
    // Check authorization
    checkAuthorization();
  }, [checkAuthorization, cleanupOldAttempts]);

  // Show loading while checking authorization
  if (authLoading || isAuthorized === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show 404 page if access is denied
  if (accessDenied) {
    return (
      <NotFound
        reason={deniedReason}
        attemptedPath={location.pathname}
        userRole={user?.role}
      />
    );
  }

  // Render children if authorized
  return <>{children}</>;
};

export default RouteGuard; 
