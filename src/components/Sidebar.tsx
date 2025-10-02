import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { UserRole } from '../types/auth';
import { supabase } from '../lib/supabase';
import { enhanceGoogleAvatarUrl } from '../lib/googleProfileSync';
import {
  Users,
  Settings,
  FileText,
  CheckSquare, 
  ClipboardList, 
  User,
  LogOut,
  LayoutDashboard,
  AlertTriangle,
  MessageSquare,
  GraduationCap,
  UserPlus,
  Sun,
  Moon,
  Mail,
  BookOpen,
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPersonChalkboard } from '@fortawesome/free-solid-svg-icons';
import { PiCertificateBold  } from "react-icons/pi";
import { PiBookOpenTextBold } from "react-icons/pi";
import { PiChartLineUpBold } from "react-icons/pi";
import { PiGraduationCapBold } from "react-icons/pi";
import { PiMegaphoneBold } from "react-icons/pi";
import { PiClipboardTextBold } from "react-icons/pi";
import { PiNotebookBold } from "react-icons/pi";
import { PiUsersBold } from "react-icons/pi";
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
    label: 'Subject Management',
    path: '/dashboard/courses',
    icon: <PiGraduationCapBold className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Enrollment',
    path: '/dashboard/enroll-student',
    icon: <UserPlus className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Instructor Management',
    path: '/dashboard/instructor-management',
    icon: <FontAwesomeIcon icon={faPersonChalkboard} className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Class Management',
    path: '/dashboard/class-management',
    icon: <BookOpen className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Programs',
    path: '/dashboard/program-management',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Enrollment Approvals',
    path: '/dashboard/enrollment-approvals',
    icon: <CheckSquare className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Student Grades',
    path: '/dashboard/student-grades',
    icon: <PiNotebookBold className="w-5 h-5" />,
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
    label: 'Instructor Management',
    path: '/dashboard/instructor-management',
    icon: <FontAwesomeIcon icon={faPersonChalkboard} className="w-5 h-5" />,
    roles: ['program_head'],
  },
  {
    label: 'Class Management',
    path: '/dashboard/class-management',
    icon: <BookOpen className="w-5 h-5" />,
    roles: ['program_head'],
  },
  {
    label: 'Subject Management',
    path: '/dashboard/academic-history',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['program_head'],
  },

  {
    label: 'Email Management',
    path: '/dashboard/email-management',
    icon: <Mail className="w-5 h-5" />,
    roles: ['program_head'],
  },
  {
    label: 'Profile',
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
    label: 'Prospectus',
    path: '/dashboard/prospectus',
    icon: <PiBookOpenTextBold className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Profile',
    path: '/dashboard/profile',
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
    icon: <BookOpen className="w-5 h-5" />, 
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
  display_name?: string;
  avatar_url?: string;
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
  const [authDisplayName, setAuthDisplayName] = useState<string>('');
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

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

    // Handle scroll events to ensure sidebar stays fixed
    const handleScroll = () => {
      // This function will be called during scroll but won't do anything
      // It's here to ensure event propagation is properly managed
      // The fixed positioning handles the sidebar placement
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
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

  // useEffect for fetching profile with loading state and caching
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        setIsProfileLoading(true);
        try {
          // Check cache first
          const cacheKey = `sidebar_profile_${user.id}`;
          const cachedProfile = localStorage.getItem(cacheKey);
          const cachedAvatar = localStorage.getItem(`sidebar_avatar_${user.id}`);
          
          if (cachedProfile && cachedAvatar) {
            try {
              const parsedProfile = JSON.parse(cachedProfile);
              setProfile(parsedProfile);
              setAuthDisplayName(parsedProfile.display_name || user.email || '');
              setProfilePictureUrl(cachedAvatar);
              setIsProfileLoading(false);
            } catch {
              // Invalid cache, continue with fresh fetch
            }
          }

          const { data, error } = await supabase
            .from('user_profiles')
            .select('first_name, middle_name, last_name, profile_picture_url, display_name, avatar_url')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            setProfile(data);
            
            // Priority 1: Use display_name from database profile
            if (data.display_name && data.display_name.trim()) {
              setAuthDisplayName(data.display_name);
            } else {
              // Fallback to constructed name from first/middle/last names
              const constructedName = `${data.first_name || ''} ${data.middle_name ? data.middle_name + ' ' : ''}${data.last_name || ''}`.trim();
              if (constructedName) {
                setAuthDisplayName(constructedName);
              } else {
                setAuthDisplayName(user.email || '');
              }
            }
            
            // Priority 1: Use avatar_url from database
            let pictureUrl: string | null = data.avatar_url || null;
            
            // Priority 2: Fallback to profile_picture_url from storage bucket
            if (!pictureUrl && data.profile_picture_url) {
              const { data: signedUrlData } = await supabase
                .storage
                .from('avatar')
                .createSignedUrl(data.profile_picture_url, 60 * 60);
              if (signedUrlData?.signedUrl) {
                pictureUrl = signedUrlData.signedUrl;
              }
            }
            
            // Priority 3: Fallback to Google metadata if database fields are empty
            if (!pictureUrl) {
              try {
                const { data: authData } = await supabase.auth.getUser();
                const authUser = authData?.user;
                const fromAuth = authUser ? getAuthAvatarUrl(authUser) : null;
                if (fromAuth) {
                  pictureUrl = enhanceGoogleAvatarUrl(fromAuth);
                }
              } catch {
                // ignore; try next strategy
              }
            }
            
            // Priority 4: Final fallback to Google API if still no avatar
            if (!pictureUrl) {
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
                      pictureUrl = enhanceGoogleAvatarUrl(json.picture);
                    }
                  }
                }
              } catch {
                // ignore; final fallback
              }
            }
            
            // Cache the profile data and avatar URL
            try {
              localStorage.setItem(cacheKey, JSON.stringify(data));
              if (pictureUrl) {
                localStorage.setItem(`sidebar_avatar_${user.id}`, pictureUrl);
              }
            } catch {
              // ignore cache errors
            }
            
            setProfilePictureUrl(pictureUrl);
          }
        } catch (error) {
          console.error('Error fetching sidebar profile:', error);
          setProfile(null);
          setProfilePictureUrl(null);
          setAuthDisplayName(user?.email || '');
        } finally {
          setIsProfileLoading(false);
        }
      } else {
        setProfile(null);
        setProfilePictureUrl(null);
        setAuthDisplayName(user?.email || '');
        setIsProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id, user?.email]);

  const handleLogoutClick = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const handleLogoutConfirm = useCallback(async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
      // Redirect to login page after successful logout
      navigate('/loginpage', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [logout, navigate]);

  const handleLogoutCancel = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);

  if (!user) {
    // Ensure unauthenticated users are redirected to the login page
    navigate('/loginpage');
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
          className={`fixed top-0 left-0 h-[100vh] min-h-screen ${isCollapsed ? 'w-16' : 'w-64'} flex flex-col bg-gray-100 backdrop-blur-xl z-[40] sidebar-blur rounded-tr-3xl rounded-br-3xl overflow-hidden ${isMobile && isCollapsed ? 'hidden' : ''} sidebar-container`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            filter: (shouldBlur() || showLogoutConfirm) ? 'blur(4px)' : 'none',
            pointerEvents: showLogoutConfirm ? 'none' : 'auto',
            boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.7), inset 2px 2px 4px rgba(0, 0, 0, 0.05)'
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
          <nav className="flex-1 py-4 space-y-1 nav-item-spacing custom-scrollbar sidebar-nav overflow-y-auto overflow-x-hidden flex-grow sidebar-nav-fixed">
            {filteredSidebarItems.map((item) => (
              <div
                key={item.path}
                className="nav-item-container nav-item-fixed-height"
              >
                <Link
                  to={item.path}
                  onClick={handleNavigationClick}
                  className={`group flex items-center px-2 py-2 rounded-xl relative nav-item-fixed-height transition-all duration-300
                    ${isExactPathActive(item.path)
                      ? 'text-white font-medium'
                      : 'text-gray-700'}
                    ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                  style={{
                    backgroundColor: isExactPathActive(item.path) ? '#00A7E1' : 'transparent',
                    boxShadow: isExactPathActive(item.path) 
                      ? 'inset 4px 4px 8px rgba(0, 0, 0, 0.2), inset -4px -4px 8px rgba(255, 255, 255, 0.1)'
                      : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isExactPathActive(item.path)) {
                      e.currentTarget.style.backgroundColor = '#b9dbeb';
                
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExactPathActive(item.path)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="nav-icon-fixed">
                    <div 
                      className={`p-1 rounded-lg transition-all duration-300
                      ${isExactPathActive(item.path)
                        ? 'text-white' 
                        : 'text-gray-600 group-hover:text-gray-800'}`}
                    >
                      {item.icon}
                    </div>
                  </div>
                  {!isCollapsed && (
                    <span 
                      className={`text-sm font-medium overflow-hidden whitespace-nowrap ${isExactPathActive(item.path) ? 'text-white' : 'text-gray-700'}`}
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
          <div 
            className="sticky bottom-0 bg-gray-100 backdrop-blur-sm border-t border-gray-200/30 p-4 mt-auto"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 -2px 4px rgba(0, 0, 0, 0.05)'
            }}
          >
            {!isCollapsed && (
              <div 
                className="profile-section flex items-center gap-3 mb-4 overflow-hidden"
                style={{
                  position: 'relative'
                }}
              >
                <div 
                  className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden"
                  style={{
                    boxShadow: '3px 3px 6px rgba(0, 0, 0, 0.1), -3px -3px 6px rgba(255, 255, 255, 0.7)'
                  }}
                >
                  {isProfileLoading ? (
                    <div className="w-full h-full bg-gray-300 animate-pulse rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : profilePictureUrl ? (
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
                  <p className="text-sm font-medium text-black truncate">
                    {authDisplayName || user.email?.split('@')[0]}
                  </p>
               
                </div>
              </div>
            )}
            <div className={`logout-button-container mt-3 ${isCollapsed ? 'flex justify-center' : 'flex justify-start w-full'}`}>
              <button
                ref={logoutButtonRef}
                onClick={handleLogoutClick}
                className={`flex items-center text-sm font-medium text-white 
                  bg-[#00171f] rounded-lg hover:bg-[#003344] transition-all duration-300
                  active:scale-95
                  ${isCollapsed 
                    ? 'w-8 h-8 p-1.5 rounded-md justify-center' 
                    : 'w-full px-3 py-2 gap-2 justify-start'}`}
                style={{
                  height: '2.5rem',
                  minHeight: '2.5rem',
                  boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.2), -4px -4px 8px rgba(255, 255, 255, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '4px 4px 8px rgba(0, 0, 0, 0.2), -4px -4px 8px rgba(255, 255, 255, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.1)';
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

      {/* Global Hamburger Button - fixed at top-left, always visible via portal */}
      {isMobile && typeof window !== 'undefined' && createPortal(
        <button
          onClick={handleHamburgerClick}
          aria-label="Toggle sidebar"
          aria-pressed={!isCollapsed}
          className="fixed top-4 right-4 z-[60] w-12 h-12 rounded-lg bg-white text-gray-700 shadow-lg border border-gray-300 hover:bg-white active:scale-95 flex items-center justify-center"
        >
          <div className="w-7 h-7 relative flex items-center justify-center">
            <div
              className="absolute w-6 h-0.5 bg-gray-600 rounded-sm transition-transform duration-200 ease-out"
              style={{
                transform: isCollapsed ? 'translateY(-6px) rotate(0deg)' : 'translateY(0px) rotate(45deg)'
              }}
            ></div>
            <div
              className="absolute w-6 h-0.5 bg-gray-600 rounded-sm transition-opacity duration-200 ease-out"
              style={{
                opacity: isCollapsed ? 1 : 0
              }}
            ></div>
            <div
              className="absolute w-6 h-0.5 bg-gray-600 rounded-sm transition-transform duration-200 ease-out"
              style={{
                transform: isCollapsed ? 'translateY(6px) rotate(0deg)' : 'translateY(0px) rotate(-45deg)'
              }}
            ></div>
          </div>
        </button>,
        document.body
      )}

      {/* Theme toggle button and WIP menu (fixed under hamburger) */}
      {isMobile && typeof window !== 'undefined' && createPortal(
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col-reverse items-end gap-2">
          <button
            onClick={() => setShowThemeMenu(v => !v)}
            aria-label="Theme options (WIP)"
            title="Theme (WIP)"
            className="w-12 h-12 rounded-full bg-white text-gray-700 shadow-lg border border-gray-300 hover:bg-white active:scale-95 flex items-center justify-center"
          >
            <Sun className="w-6 h-6 spin-slow" />
          </button>

          {showThemeMenu && (
            <div className="w-44 rounded-lg bg-white border border-gray-200 shadow-xl overflow-hidden">
              <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b">Feature in progress</div>
              <button
                disabled
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
              >
                <Sun className="w-4 h-4" /> Light Mode
              </button>
              <button
                disabled
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 cursor-not-allowed border-t"
              >
                <Moon className="w-4 h-4" /> Dark Mode
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Main Content (scrolls independently, margin for sidebar) */}
      <main
        style={{
          marginLeft: isMobile ? '0' : (isCollapsed ? '5rem' : '17rem'),
          width: 'auto',
          minWidth: 'none',
          maxWidth: 'none',
          backgroundColor: ' bg-[#FFFFFF] ',
          position: 'relative',
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
        data-modal="true"
        className={`min-h-screen main-content-scroll ${shouldBlur() ? 'pointer-events-none [&:not(.course-modal):not(.subject-modal)]' : ''} z-[30] ${mainContentScrollLock}`}
      >
        <div className="h-full lg:pt-0" style={{ width: 'auto', minWidth: 'none', maxWidth: 'none', backgroundColor: ' bg-[#FFFFFF] ' }}>
          <div className={`rounded-l-lg p-3 sm:p-4 md:p-6 h-full relative ${shouldBlur() ? 'opacity-80' : ''}`}
            style={{
              paddingBottom: 0,
              width: 'auto',
              minWidth: 'none',
              maxWidth: 'none',
              backgroundColor: ' bg-[#FFFFFF] '
            }}
          >
            {/* In-content hamburger removed in favor of global fixed button */}
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
