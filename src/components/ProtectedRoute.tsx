import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardAccess } from '../contexts/DashboardAccessContext';
import { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiresAccessCheck?: boolean;
}

const AccessRestrictedView: React.FC<{
  heading: string;
  subtext: string;
  buttonText: string;
  buttonLink: string;
}> = ({ heading, subtext, buttonText, buttonLink }) => (
  <div
  className="min-h-screen w-full flex items-center justify-center text-white"
  style={{
    backgroundImage: "url('https://scontent.fmnl14-1.fna.fbcdn.net/v/t39.30808-6/485758791_2487376928274009_356058725993467689_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=a5f93a&_nc_eui2=AeEPTiylcrppUFGjgMnJlZczJ2smHcYocKYnayYdxihwpp2gis8PZOcQQ0z2mLIQL1wnwFLcdp7HzRbe6b4ubZ5f&_nc_ohc=dJZqfI389PsQ7kNvwEMJtod&_nc_oc=Adm4l-Hiqo1POgoE4BChuYCZfWwv1dO7UeTyb8KIEd6hyJZ5mYMEpKgusmD0PuPH-70&_nc_zt=23&_nc_ht=scontent.fmnl14-1.fna&_nc_gid=S8iMZ0t46RWosy-w90WMvQ&oh=00_AfPgvwzE2jwc3Vo3fHgdVWU8LspQFuO-c8Xmdd40hmF2Bg&oe=6847B26B')", // 🔁 replace with your image URL
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}
>
  {/* Optional overlay */}
  <div className="h-full flex items-center justify-center">
    <div className="w-full max-w-7xl px-4 sm:px-8 py-10 flex flex-col items-center">
      <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 text-center tracking-tight">
        {heading}
      </h1>
      <p className="text-lg md:text-2xl text-white mb-10 text-center">
        {subtext}
      </p>
      {buttonText && buttonLink && (
        <button
          className="bg-gradient-to-r from-orange-400 to-pink-500 text-white font-medium px-6 py-2 rounded-lg shadow hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-pink-400"
          onClick={() => window.open(buttonLink, '_blank')}
        >
          {buttonText}
        </button>
      )}
    </div>
  </div>
</div>
);

// Add a helper to map roles to dashboard paths
const getDashboardPath = (role: string) => {
  if (role === 'program_head') return '/program_head/dashboard/';
  return `/${role}/dashboard`;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  requiresAccessCheck = false
}) => {
  const { user, loading: authLoading } = useAuth();
  const { checkAccess, loading: accessLoading, getRestrictionFields } = useDashboardAccess();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const verifyAccess = async () => {
      if (user && requiresAccessCheck) {
        const access = await checkAccess(user.role);
        setHasAccess(access);
      } else {
        setHasAccess(true);
      }
    };

    verifyAccess();
  }, [user, requiresAccessCheck, checkAccess]);

  // Show loading state only during initial auth check
  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  // Handle authentication
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Handle role-based access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  // Show loading state while checking access
  if (accessLoading || hasAccess === null) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  // Handle dashboard access restriction
  if (requiresAccessCheck && !hasAccess) {
    const { heading, subtext } = getRestrictionFields(user.role);
    return <AccessRestrictedView heading={heading} subtext={subtext} buttonText="About Developer" buttonLink="mailto:developer@email.com" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 