import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { UserRole } from '../types/auth';
import { supabase } from '../lib/supabase';
import {
  Users,
  Settings,
  FileText,
  CheckSquare,
  Users2,
  ClipboardList,
  User,
  LogOut,
  LayoutDashboard,
  AlertTriangle,
  MessageSquare,
  GraduationCap,
  UserPlus,
} from 'lucide-react';
import { PiCertificateBold  } from "react-icons/pi";
import { PiBookOpenTextBold } from "react-icons/pi";
import { PiChartLineUpBold } from "react-icons/pi";
import { PiGraduationCapBold } from "react-icons/pi";
import { PiMegaphoneBold } from "react-icons/pi";
import { PiClipboardTextBold } from "react-icons/pi";
import { PiNotebookBold } from "react-icons/pi";
import { PiUsersBold } from "react-icons/pi";
import { PiHandshakeBold } from "react-icons/pi";
import { motion, AnimatePresence } from 'framer-motion';

// Add custom CSS for animations and scrollbar
import './sidebar.css';







interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const sidebarItems: SidebarItem[] = [
  // Superadmin specific items
  {
    label: 'System Monitoring',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  {
    label: 'User Overview',
    path: '/dashboard/users',
    icon: <Users className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  {
    label: 'Access Control',
    path: '/dashboard/access-control',
    icon: <AlertTriangle className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  {
    label: 'Feedback',
    path: '/dashboard/feedback',
    icon: <MessageSquare className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  {
    label: 'Audit Logs',
    path: '/dashboard/audit-logs',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  {
    label: 'System Settings',
    path: '/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  // Admin specific items
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'User Management',
    path: '/dashboard/users',
    icon: <Users className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Course Management',
    path: '/dashboard/courses',
    icon: <PiGraduationCapBold className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Program',
    path: '/dashboard/program-management',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Announcements',
    path: '/dashboard/announcements',
    icon: <PiMegaphoneBold className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'System Settings',
    path: '/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['admin'],
  },
  // Program Head specific items
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['program_head'],
  },
  {
    label: 'Enroll Student',
    path: '/dashboard/enroll-student',
    icon: <UserPlus className="w-5 h-5" />,
    roles: ['program_head'],
  },
  {
    label: 'Subject Assignment',
    path: '/dashboard/assign-subjects',
    icon: <PiHandshakeBold className="w-5 h-5" />,
    roles: ['program_head'],
  },
  {
    label: 'User Management',
    path: '/dashboard/user-management',
    icon: <User className="w-5 h-5" />,
    roles: ['program_head'],
  },
  {
    label: 'List of Subjects',
    path: '/dashboard/academic-history',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['program_head'],
  },
  {
    label: 'Settings',
    path: '/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['program_head'],
  },
  // Registrar specific items
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Subject Review',
    path: '/dashboard/subject-review',
    icon: <PiClipboardTextBold className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Enrollment Approvals',
    path: '/dashboard/enrollment-approvals',
    icon: <CheckSquare className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Student Grades',
    path: '/dashboard/student-grades',
    icon: <PiNotebookBold className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Class List Viewer',
    path: '/dashboard/class-list',
    icon: <PiUsersBold className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Settings',
    path: '/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['registrar'],
  },
  // Teacher
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />, 
    roles: ['instructor'],
  },
  {
    label: 'Class Management',
    path: '/dashboard/class-management',
    icon: <Users2 className="w-5 h-5" />, 
    roles: ['instructor'],
  },
  {
    label: 'My Profile',
    path: '/dashboard/profile',
    icon: <User className="w-5 h-5" />,
    roles: ['instructor'],
  },
  // Student
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'Enrolled',
    path: '/dashboard/course',
    icon: <GraduationCap className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'COE',
    path: '/dashboard/coe',
    icon: <PiCertificateBold   className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'Prospectus',
    path: '/dashboard/prospectus',
    icon: <PiBookOpenTextBold className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'Receipt & Permit',
    path: '/dashboard/receipt-permit',
    icon: <FileText className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'Grade Report',
    path: '/dashboard/grades',
    icon: <PiChartLineUpBold className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'My Profile',
    path: '/dashboard/profile',
    icon: <User className="w-5 h-5" />,
    roles: ['student'],
  },
  // Add more unique items as needed...
];



interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Add Profile interface for type safety
interface Profile {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  profile_picture_url?: string;
}

// Get an avatar URL from Supabase Auth user metadata or provider identity data
function getAuthAvatarUrl(u: unknown): string | null {
  if (!u || typeof u !== 'object') return null;
  const urlKeys = [
    'avatar_url', 'picture', 'picture_url', 'photoURL', 'photoUrl', 'avatar',
    'image', 'image_url', 'imageUrl', 'profile_picture', 'profileImage'
  ];

  const tryKeys = (obj?: Record<string, unknown> | null): string | null => {
    if (!obj) return null;
    for (const key of urlKeys) {
      const val = obj[key];
      if (typeof val === 'string' && /^https?:\/\//i.test(val)) return val;
    }
    return null;
  };

  const metadata = (u as { user_metadata?: Record<string, unknown> }).user_metadata;
  const fromMetadata = tryKeys(metadata);
  if (fromMetadata) return fromMetadata;

  const identities = (u as { identities?: Array<{ identity_data?: Record<string, unknown> }> }).identities;
  if (Array.isArray(identities)) {
    for (const id of identities) {
      const candidate = tryKeys(id?.identity_data as Record<string, unknown> | undefined);
      if (candidate) return candidate;
    }
  }
  return null;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { isModalOpen, showUserLocationModal } = useModal();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  // Ref for the Logout button
  const logoutButtonRef = useRef<HTMLButtonElement>(null);
  // Ref for the modal
  const modalRef = useRef<HTMLDivElement>(null);

  // Memoize filtered sidebar items to prevent unnecessary re-renders
  const filteredSidebarItems = useMemo(() => 
    sidebarItems.filter(item => item.roles.includes(user?.role || 'student')),
    [user?.role]
  );

  // Memoize the shouldBlur function
  const shouldBlur = useCallback(() => {
    return isModalOpen || showUserLocationModal;
  }, [isModalOpen, showUserLocationModal]);

  // Memoize the exact path matching function
  const isExactPathActive = useCallback((path: string) => {
    if (!user) return false;
    const currentPath = location.pathname;
    // For dashboard items, check exact match
    if (path.endsWith('/dashboard')) {
      return currentPath === path;
    }
    // For other items, check if it's the exact section
    const pathParts = currentPath.split('/');
    const itemPathParts = path.split('/');
    return pathParts.length === itemPathParts.length && 
           pathParts.every((part, i) => part === itemPathParts[i]);
  }, [location.pathname, user]);

  // Optimized resize handler with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const newIsMobile = window.innerWidth < 768;
        setIsMobile(newIsMobile);
        if (newIsMobile) {
          setIsCollapsed(true);
        }
      }, 100); // Debounce resize events
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Focus trap for modal accessibility
  useEffect(() => {
    if (showLogoutConfirm && modalRef.current) {
      // Get all focusable elements in the modal
      const focusableSelectors = [
        'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
        'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])'
      ];
      const focusableEls = modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors.join(','));
      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];
      // Focus the first element
      firstEl?.focus();
      // Trap focus
      const trap = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (focusableEls.length === 0) return;
          if (e.shiftKey) {
            if (document.activeElement === firstEl) {
              e.preventDefault();
              lastEl.focus();
            }
          } else {
            if (document.activeElement === lastEl) {
              e.preventDefault();
              firstEl.focus();
            }
          }
        }
      };
      document.addEventListener('keydown', trap);
      return () => {
        document.removeEventListener('keydown', trap);
      };
    }
    // On close, restore focus to logout button
    if (!showLogoutConfirm && logoutButtonRef.current) {
      logoutButtonRef.current.focus();
    }
  }, [showLogoutConfirm]);

  // Prevent background scroll when logout modal is open (html, body, and events)
  useEffect(() => {
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };
    if (showLogoutConfirm) {
      document.body.classList.add('overflow-hidden');
      document.documentElement.classList.add('overflow-hidden');
      window.addEventListener('touchmove', preventScroll, { passive: false });
      window.addEventListener('wheel', preventScroll, { passive: false });
    } else {
      document.body.classList.remove('overflow-hidden');
      document.documentElement.classList.remove('overflow-hidden');
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('wheel', preventScroll);
    }
    // Clean up in case component unmounts while modal is open
    return () => {
      document.body.classList.remove('overflow-hidden');
      document.documentElement.classList.remove('overflow-hidden');
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('wheel', preventScroll);
    };
  }, [showLogoutConfirm]);

  // Optionally scroll to top when opening the modal
  useEffect(() => {
    if (showLogoutConfirm) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [showLogoutConfirm]);

  // Optimized handlers with useCallback
  const handleHamburgerClick = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  const handleNavigationClick = useCallback(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      setIsCollapsed(false);
    }
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  // useEffect for fetching profile (not conditional)
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('first_name, middle_name, last_name, profile_picture_url')
          .eq('id', user.id)
          .single();
        if (!error && data) {
          setProfile(data);
          // 1) Prefer Google avatar from Authentication
          try {
            const { data: authData } = await supabase.auth.getUser();
            const authAvatar = authData?.user ? getAuthAvatarUrl(authData.user) : null;
            if (authAvatar) {
              setProfilePictureUrl(authAvatar);
              return;
            }
          } catch {
            // ignore; try next strategies
          }

          // 2) Try Google userinfo API with provider access token
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.provider_token as string | undefined;
            if (token) {
              const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (resp.ok) {
                const json = await resp.json();
                if (typeof json?.picture === 'string') {
                  setProfilePictureUrl(json.picture);
                  return;
                }
              }
            }
          } catch {
            // ignore; try next strategy
          }

          // 3) Fallback to storage bucket URL if present
          if (data.profile_picture_url) {
            const { data: signedUrlData } = await supabase
              .storage
              .from('avatar')
              .createSignedUrl(data.profile_picture_url, 60 * 60);
            if (signedUrlData?.signedUrl) {
              setProfilePictureUrl(signedUrlData.signedUrl);
              return;
            }
          }
          // 4) Final fallback: show no image; UI will render initials/icon
          setProfilePictureUrl(null);
        }
      } else {
        setProfile(null);
        setProfilePictureUrl(null);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleLogoutClick = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const handleLogoutConfirm = useCallback(async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout]);

  const handleLogoutCancel = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);

  if (!user) {
    navigate('/');
    return null;
  }

  // Optimized animation variants for better performance
  const sidebarVariants = {
    collapsed: {
      width: '4rem',
      transition: { duration: 0.6, ease: "easeOut" as const }
    },
    expanded: {
      width: '16rem',
      transition: { duration: 0.6, ease: "easeOut" as const }
    }
  };

  const mobileVariants = {
    hidden: {
      x: '-100%',
      opacity: 0,
      transition: { duration: 0.6, ease: "easeOut" as const }
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" as const }
    }
  };

  // Sidebar JSX
  const sidebarJSX = (
    <AnimatePresence mode="wait">
      {(!isMobile || !isCollapsed) && (
        <motion.aside
          key={isCollapsed ? 'collapsed' : 'expanded'}
          variants={isMobile ? mobileVariants : sidebarVariants}
          initial={isMobile ? 'hidden' : (isCollapsed ? 'collapsed' : 'expanded')}
          animate={isMobile ? 'visible' : (isCollapsed ? 'collapsed' : 'expanded')}
          exit={isMobile ? 'hidden' : undefined}
          className={`fixed top-0 left-0 h-screen ${isCollapsed ? 'w-16' : 'w-64'} flex flex-col bg-[#1c1c1d] backdrop-blur-xl z-[40] sidebar-blur border-r border-white/20 ${isMobile && isCollapsed ? 'hidden' : ''}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            filter: (shouldBlur() || showLogoutConfirm) ? 'blur(4px)' : 'none',
            pointerEvents: showLogoutConfirm ? 'none' : 'auto',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Header, nav, and footer as before */}
          <div className="p-2 flex items-center justify-center">
            {/* Logo container with Google Classroom style */}
            <div className="flex items-center justify-center">
              <div 
                className="relative flex items-center justify-center w-12 h-12"
              >
                {/* Logo image with perfect centering */}
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: 'translateZ(0)',
                  }}
                >
                  <img
                    src="/img/logo1.png"
                    alt="School Logo"
                    className="w-[95%] h-[95%] object-contain drop-shadow-sm"
                    style={{
                      transformOrigin: "center center"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <nav className="flex-1 py-4 space-y-1 nav-item-spacing">
            {filteredSidebarItems.map((item) => (
              <div
                key={item.path}
                className="nav-item-container nav-item-fixed-height"
              >
                <Link
                  to={item.path}
                  onClick={handleNavigationClick}
                  className={`group flex items-center px-2 py-2 rounded-md relative nav-item-fixed-height
                    ${isExactPathActive(item.path)
                      ? 'text-white font-medium'
                      : 'text-gray-300'}
                    ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                  style={{
                    backgroundColor: isExactPathActive(item.path) ? '#3b82f6' : 'transparent',
                    border: isExactPathActive(item.path) ? '1px solid #3b82f6' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isExactPathActive(item.path) ? '#3b82f6' : '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isExactPathActive(item.path) ? '#3b82f6' : 'transparent';
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="nav-icon-fixed">
                    <div 
                      className={`p-1 rounded-sm
                      ${isExactPathActive(item.path)
                        ? 'text-white' 
                        : 'text-gray-400 group-hover:text-gray-200'}`}
                    >
                      {item.icon}
                    </div>
                  </div>
                  {!isCollapsed && (
                    <span 
                      className={`text-sm font-medium overflow-hidden whitespace-nowrap ${isExactPathActive(item.path) ? 'text-white' : 'text-gray-300'}`}
                      style={{
                        marginLeft: '0.5rem'
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              </div>
            ))}
          </nav>
          <div className="sticky bottom-0 bg-[#1c1c1d] p-4">
            {!isCollapsed && (
              <div 
                className="profile-section flex items-center gap-3 mb-3 overflow-hidden"
                style={{
                  position: 'absolute',
                  bottom: '3rem',
                  left: '1rem',
                  right: '1rem'
                }}
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                  {profilePictureUrl ? (
                    <img src={profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : profile ? (
                    <span className="text-white font-bold text-lg">
                      {`${(profile.first_name?.[0] || '')}${(profile.last_name?.[0] || '')}`.toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">
                    {profile ? [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ') : user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
            <div className={`logout-button-container ${isCollapsed ? 'flex justify-center' : 'flex justify-start w-full'}`}>
              <button
                ref={logoutButtonRef}
                onClick={handleLogoutClick}
                className={`flex items-center text-sm font-medium text-gray-200 
                  bg-[#374151] border border-gray-600 rounded-lg hover:bg-[#2a2a2b] hover:border-gray-500
                  shadow-sm active:scale-95
                  ${isCollapsed 
                    ? 'w-8 h-8 p-1.5 rounded-md justify-center' 
                    : 'w-full px-3 py-2 gap-2 justify-start'}`}
                style={{
                  height: '2.5rem',
                  minHeight: '2.5rem'
                }}
                title={isCollapsed ? 'Logout' : undefined}
              >
                <LogOut className="w-4 h-4" />
                {!isCollapsed && (
                  <span>
                    Logout
                  </span>
                )}
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );

  // Main content scroll lock helper
  const mainContentScrollLock = showLogoutConfirm ? 'overflow-hidden' : 'overflow-auto';

  return (
    <>
      {profilePictureUrl && (
        <img
          src={profilePictureUrl}
          alt="Preload Profile"
          style={{ display: 'none' }}
        />
      )}
      {/* Logout Modal rendered as a portal to body for perfect centering */}
      {showLogoutConfirm && createPortal(
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div
            ref={modalRef}
            className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-white/20"
            style={{ position: 'relative', zIndex: 100 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10 relative">
                <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping opacity-40"></div>
                <LogOut className="w-9 h-9 text-red-500 relative z-10" />
              </div>
              <h3 id="logout-modal-title" className="text-2xl font-bold text-gray-800 mb-2">
                Confirm Logout
              </h3>
              <p className="text-gray-600 mb-7 max-w-xs mx-auto">
                Are you sure you want to logout? You will need to login again to access your account.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleLogoutCancel}
                  className="px-7 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 \
                    transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                    shadow-md shadow-gray-200/50 border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="px-7 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 \
                    rounded-2xl hover:from-red-600 hover:to-red-700 \
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                    shadow-lg shadow-red-500/30"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Render sidebar as a portal to body to guarantee fixed position */}
      {typeof window !== 'undefined' && createPortal(sidebarJSX, document.body)}

      {/* Main Content (scrolls independently, margin for sidebar) */}
      <main
        style={{
          marginLeft: isMobile ? '0' : (isCollapsed ? '5rem' : '17rem'),
          width: 'auto',
          minWidth: 'none',
          maxWidth: 'none',
          backgroundColor: '#1c1c1d'
        }}
        data-modal="true"
        className={`min-h-screen ${shouldBlur() ? 'pointer-events-none [&:not(.course-modal):not(.subject-modal)]' : ''} z-[30] ${mainContentScrollLock}`}
      >
        <div className="h-full lg:pt-0" style={{ width: 'auto', minWidth: 'none', maxWidth: 'none', backgroundColor: '#1c1c1d' }}>
          <div className={`rounded-l-lg p-3 sm:p-4 md:p-6 h-full relative ${shouldBlur() ? 'opacity-80' : ''}`}
            style={{
              paddingBottom: 0,
              width: 'auto',
              minWidth: 'none',
              maxWidth: 'none',
              backgroundColor: '#1c1c1d'
            }}
          >
            {/* Hamburger button for mobile/tablet */}
            {isMobile && isCollapsed && (
              <button
                onClick={handleHamburgerClick}
                className="absolute top-3 right-3 z-30 p-2 rounded-lg bg-[#ffffff] text-gray-300 shadow-lg border border-gray-600 hover:bg-[#ffffff] active:scale-95"
              >
                                  <div className="w-5 h-5 flex flex-col justify-center items-center">
                    <div className="w-4 h-0.5 bg-gray-400 rounded-sm mb-1"></div>
                    <div className="w-4 h-0.5 bg-gray-400 rounded-sm mb-1"></div>
                    <div className="w-4 h-0.5 bg-gray-400 rounded-sm"></div>
                  </div>
              </button>
            )}
            <div className="h-full" style={{ width: 'auto', minWidth: 'none', maxWidth: 'none' }}>
              {children}
            </div>
          </div>
        </div>
      </main>
      {/* Enhanced Overlay for mobile */}
      <AnimatePresence>
        {isMobile && !isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" as const }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-[35]"
            onClick={() => setIsCollapsed(true)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardLayout; 
