import React, { useState, useEffect, useRef } from 'react';
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
  BookOpen,
  CheckSquare,
  Users2,
  ClipboardList,
  Award as StudentAward,
  User,
  LogOut,
  LayoutDashboard,
  AlertTriangle,
  MessageSquare,
  GraduationCap,
  UserPlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Add custom CSS for animations and scrollbar
import './sidebar.css';

// Custom Prospectus Icon Component
const ProspectusIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* Document base */}
    <rect x="3" y="2" width="18" height="20" rx="2" ry="2" />
    {/* Document header with title */}
    <line x1="6" y1="5" x2="18" y2="5" />
    <line x1="6" y1="7" x2="18" y2="7" />
    {/* Document content lines */}
    <line x1="6" y1="10" x2="16" y2="10" />
    <line x1="6" y1="12" x2="16" y2="12" />
    <line x1="6" y1="14" x2="14" y2="14" />
    {/* Academic seal/emblem */}
    <circle cx="12" cy="17" r="2.5" />
    <path d="M12 14.5v-1" />
    {/* Graduation cap symbol */}
    <path d="M9 19l3-2 3 2" />
    <path d="M12 17v-1" />
    {/* Small tassel */}
    <path d="M11 16h2" />
    <path d="M11.5 15l0.5 1 0.5-1" />
  </svg>
);

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
    icon: <BookOpen className="w-5 h-5" />,
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
    icon: <BookOpen className="w-5 h-5" />,
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
    icon: <User className="w-5 h-5" />,
    roles: ['program_head'],
  },
  {
    label: 'Instructor Management',
    path: '/dashboard/instructor-management',
    icon: <GraduationCap className="w-5 h-5" />,
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
    icon: <BookOpen className="w-5 h-5" />,
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
    icon: <FileText className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Class List Viewer',
    path: '/dashboard/class-list',
    icon: <Users2 className="w-5 h-5" />,
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
    roles: ['teacher'],
  },
  {
    label: 'Class Management',
    path: '/dashboard/class-management',
    icon: <Users2 className="w-5 h-5" />, 
    roles: ['teacher'],
  },
  {
    label: 'Grade Input',
    path: '/dashboard/grade-input',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['teacher'],
  },
  {
    label: 'My Profile',
    path: '/dashboard/profile',
    icon: <User className="w-5 h-5" />,
    roles: ['teacher'],
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
    icon: <FileText className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'Prospectus',
    path: '/dashboard/prospectus',
    icon: <ProspectusIcon />,
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
    icon: <StudentAward className="w-5 h-5" />,
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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Handle hamburger click with animation
  const handleHamburgerClick = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Handle navigation click
  const handleNavigationClick = () => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  };

  // Handle hover state
  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsCollapsed(false);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsCollapsed(true);
    }
  };

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
          if (data.profile_picture_url) {
            const { data: signedUrlData, error: signedUrlError } = await supabase
              .storage
              .from('avatar')
              .createSignedUrl(data.profile_picture_url, 60 * 60);
            if (!signedUrlError && signedUrlData?.signedUrl) {
              setProfilePictureUrl(signedUrlData.signedUrl);
            } else {
              setProfilePictureUrl(null);
            }
          } else {
            setProfilePictureUrl(null);
          }
        }
      } else {
        setProfile(null);
        setProfilePictureUrl(null);
      }
    };
    fetchProfile();
  }, [user?.id]);

  if (!user) {
    navigate('/');
    return null;
  }

  const filteredSidebarItems = sidebarItems.filter(item => 
    item.roles.includes(user.role)
  );

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  // Add a function to check if we should blur
  const shouldBlur = () => {
    return isModalOpen || showUserLocationModal;
  };

  // Add this function for exact path matching
  const isExactPathActive = (path: string) => {
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
  };

  // Sidebar JSX
  const sidebarJSX = (
    <AnimatePresence>
      {(!isMobile || !isCollapsed) && (
        <motion.aside
          initial={{
            x: isMobile ? '-100%' : 0,
            opacity: 0,
          }}
          animate={{
            width: isCollapsed ? '4rem' : '16rem',
            x: 0,
            opacity: 1,
            // Blur and disable pointer events if logout modal is open
            filter: (shouldBlur() || showLogoutConfirm) ? 'blur(4px)' : 'none',
            pointerEvents: showLogoutConfirm ? 'none' : 'auto',
          }}
          exit={{
            x: isMobile ? '-100%' : 0,
            opacity: 0,
          }}
          transition={{
            type: 'tween',
            duration: 0.3,
            ease: 'easeInOut',
          }}
          className={`fixed top-0 left-0 h-screen ${isCollapsed ? 'w-16' : 'w-64'} flex flex-col bg-white border-r border-gray-200 z-[40] sidebar-blur shadow-lg shadow-gray-200/40 ${isMobile && isCollapsed ? 'hidden' : ''}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            willChange: 'width, transform',
            // pointerEvents and filter handled above
          }}
        >
          {/* Header, nav, and footer as before */}
          <div className="p-4 flex items-center justify-center">
            {/* Logo container with Google Classroom style */}
            <div className="flex items-center justify-center">
              <div 
                className={`relative flex items-center justify-center transition-all duration-200 ease-in-out
                  ${isCollapsed ? 'w-12 h-12' : 'w-16 h-16'}`}
              >
                {/* Logo image with enhanced transitions and perfect centering */}
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: 'translateZ(0)',
                  }}
                >
                  <img
                    src="/img/logo1.png"
                    alt="School Logo"
                    className="w-[95%] h-[95%] object-contain drop-shadow-sm transition-all duration-200"
                    style={{
                      transformOrigin: "center center",
                      willChange: "transform"
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <nav className="flex-1 py-4 px-2 space-y-1">
            {filteredSidebarItems.map((item, index) => (
              <div
                key={item.path}
                style={{
                  animationDelay: `${index * 0.05}s`,
                  animation: 'fadeInUp 0.3s ease-out forwards',
                  opacity: 0,
                }}
              >
                <Link
                  to={item.path}
                  onClick={() => {
                    if (isMobile) {
                      handleNavigationClick();
                    }
                  }}
                  className={`group flex items-center gap-3 px-2 py-2 rounded-md transition-all duration-150 ease-in-out
                    ${isExactPathActive(item.path)
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-600'}
                    ${isCollapsed ? 'justify-center' : ''}`}
                  style={{
                    backgroundColor: isExactPathActive(item.path) ? '#c2e7ff' : 'transparent',
                    border: isExactPathActive(item.path) ? '1px solid #c2e7ff' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isExactPathActive(item.path) ? '#c2e7ff' : 'transparent';
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div 
                    className={`p-1 rounded-sm transition-all duration-150 
                    ${isExactPathActive(item.path)
                      ? 'text-gray-900' 
                      : 'text-gray-500 group-hover:text-gray-700'}`}
                  >
                    {item.icon}
                  </div>
                  {!isCollapsed && (
                    <span 
                      className={`text-sm font-medium overflow-hidden whitespace-nowrap transition-all duration-200 ${isExactPathActive(item.path) ? 'text-gray-900' : 'text-gray-700'}`}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              </div>
            ))}
          </nav>
          <div className="sticky bottom-0 bg-white p-4">
            <AnimatePresence>
              {!isCollapsed && (
                <div 
                  className="flex items-center gap-3 mb-3 overflow-hidden transition-all duration-200"
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
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile ? [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ') : user.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
            <div className={`${isCollapsed ? 'flex justify-center' : 'w-full'} transition-all duration-200 ease-in-out`}>
              <button
                ref={logoutButtonRef}
                onClick={handleLogoutClick}
                className={`flex items-center justify-center text-sm font-medium text-gray-700 
                  bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400
                  transition-all duration-150 ease-in-out shadow-sm active:scale-95
                  ${isCollapsed 
                    ? 'w-8 h-8 p-1.5 rounded-md' 
                    : 'w-full px-3 py-2 gap-2'}`}
                title={isCollapsed ? 'Logout' : undefined}
              >
                <LogOut className="w-4 h-4" />
                {!isCollapsed && (
                  <span className="transition-all duration-200">
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
                    transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                    shadow-md shadow-gray-200/50 border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="px-7 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 \
                    rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-300 \
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
          marginLeft: isMobile ? '0' : (isCollapsed ? '4rem' : '16rem'),
          width: isMobile ? '100%' : (isCollapsed ? 'calc(100% - 4rem)' : 'calc(100% - 16rem)'),
          transition: 'margin-left 0.3s ease-in-out, width 0.3s ease-in-out',
        }}
        data-modal="true"
        className={`min-h-screen bg-gray-50 ${shouldBlur() ? 'pointer-events-none [&:not(.course-modal):not(.subject-modal)]' : ''} z-[30] ${mainContentScrollLock}`}
      >
        <div className="h-full lg:pt-12">
          <div className={`bg-white rounded-l-lg border border-gray-200 p-6 sm:p-8 md:p-11 w-full h-full relative ${shouldBlur() ? 'opacity-80' : ''}`.replace(/`$/, '"')}
            style={{
              animation: 'fadeIn 0.3s ease-out',
              boxShadow: 'inset 0 2px 12px 0 rgba(0,0,0,0.06)',
              paddingBottom: 0,
            }}
          >
            {/* Hamburger button for mobile/tablet */}
            {isMobile && isCollapsed && (
              <button
                onClick={handleHamburgerClick}
                className="absolute top-4 right-4 z-30 p-2 rounded-lg bg-white text-gray-700 shadow-lg border border-gray-200 hover:bg-gray-50 transition-all duration-150 active:scale-95"
              >
                <div className="w-5 h-5 flex flex-col justify-center items-center">
                  <div className="w-4 h-0.5 bg-gray-600 rounded-sm mb-1"></div>
                  <div className="w-4 h-0.5 bg-gray-600 rounded-sm mb-1"></div>
                  <div className="w-4 h-0.5 bg-gray-600 rounded-sm"></div>
                </div>
              </button>
            )}
            <div className="h-full">
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
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-indigo-900/30 backdrop-blur-md z-[35]"
            onClick={() => setIsCollapsed(true)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardLayout; 
