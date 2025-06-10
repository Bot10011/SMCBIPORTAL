import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { UserRole } from '../types/auth';
import {
  Users,
  Settings,
  FileText,
  BookOpen,
  CheckSquare,
  Users2,
  ClipboardList,
  BookOpenCheck,
  Award as StudentAward,
  User,
  LogOut,
  Menu,
  LayoutDashboard,
  AlertTriangle,
} from 'lucide-react';
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
    path: '/superadmin/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  {
    label: 'User Overview',
    path: '/superadmin/dashboard/users',
    icon: <Users className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  {
    label: 'Access Control',
    path: '/superadmin/dashboard/access-control',
    icon: <AlertTriangle className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  {
    label: 'Dashboard Analytics',
    path: '/superadmin/dashboard/analytics',
    icon: <FileText className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  {
    label: 'Audit Logs',
    path: '/superadmin/dashboard/audit-logs',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  {
    label: 'System Settings',
    path: '/superadmin/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['superadmin'],
  },
  // Admin specific items
  {
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'User Management',
    path: '/admin/dashboard/users',
    icon: <Users className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Course Management',
    path: '/admin/dashboard/courses',
    icon: <BookOpen className="w-5 h-5" />,
    roles: ['admin'],
  },

  {
    label: 'Class Management',
    path: '/admin/dashboard/Course',
    icon: <Users2 className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Program',
    path: '/admin/dashboard/program-management',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'Syllabus',
    path: '/admin/dashboard/syllabus',
    icon: <BookOpen className="w-5 h-5" />,
    roles: ['admin'],
  },
  {
    label: 'System Settings',
    path: '/admin/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['admin'],
  },
    // Program Head specific items
  {
    label: 'Dashboard',
    path: '/programhead/dashboard/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['programhead'],
  },
  {
    label: 'Subject Assignment',
    path: '/programhead/dashboard/assign-subjects',
    icon: <BookOpen className="w-5 h-5" />,
    roles: ['programhead'],
  },
  {
    label: 'Enrollment Validation',
    path: '/programhead/dashboard/enrollment-validation',
    icon: <CheckSquare className="w-5 h-5" />,
    roles: ['programhead'],
  },
  {
    label: 'Courses Offered',
    path: '/programhead/dashboard/academic-history',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['programhead'],
  },
  {
    label: 'Settings',
    path: '/programhead/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['programhead'],
  },
  // Registrar specific items
  {
    label: 'Dashboard',
    path: '/registrar/dashboard/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Subject Review',
    path: '/registrar/dashboard/subject-review',
    icon: <BookOpen className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Enrollment Approvals',
    path: '/registrar/dashboard/enrollment-approvals',
    icon: <CheckSquare className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Student Records',
    path: '/registrar/dashboard/student-records',
    icon: <FileText className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Enrollment Status Log',
    path: '/registrar/dashboard/status-log',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Class List Viewer',
    path: '/registrar/dashboard/class-list',
    icon: <Users2 className="w-5 h-5" />,
    roles: ['registrar'],
  },
  {
    label: 'Settings',
    path: '/registrar/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['registrar'],
  },
  // Teacher
  {
    label: 'Dashboard',
    path: '/teacher/dashboard/',
    icon: <LayoutDashboard className="w-5 h-5" />, 
    roles: ['teacher'],
  },
  {
    label: 'Class Management',
    path: '/teacher/dashboard/class-management',
    icon: <Users2 className="w-5 h-5" />, 
    roles: ['teacher'],
  },


  {
    label: 'Grade Input',
    path: '/teacher/dashboard/grade-input',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['teacher'],
  },
  {
    label: 'Settings',
    path: '/teacher/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['teacher'],
  },

  // Student
  {
    label: 'Dashboard',
    path: '/student/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'My Course',
    path: '/student/dashboard/course',
    icon: <BookOpenCheck className="w-5 h-5" />,
    roles: ['student'],
  },
  // My Grades for each role
  {
    label: 'My Grades',
    path: '/student/dashboard/grades',
    icon: <StudentAward className="w-5 h-5" />,
    roles: ['student'],
  },
  {
    label: 'My Profile',
    path: '/student/dashboard/profile',
    icon: <User className="w-5 h-5" />,
    roles: ['student'],
  },
  // Add more unique items as needed...
];



interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { isModalOpen, modalType } = useModal();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
    // Only blur for default modals (like logout)
    return isModalOpen && modalType === 'default';
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

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden ${shouldBlur() ? 'backdrop-blur-xl [&>*:not([data-modal])]' : ''}`}>
      {/* Background decorative elements */}
      <div className={`fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 ${shouldBlur() ? 'backdrop-blur-xl [&>*:not([data-modal])]' : ''}`}>
        <div className={`absolute top-10 left-[30%] w-72 h-72 rounded-full bg-blue-300/20 blur-3xl animate-float ${shouldBlur() ? 'opacity-30' : ''}`}></div>
        <div className={`absolute bottom-10 right-[20%] w-96 h-96 rounded-full bg-indigo-300/20 blur-3xl animate-float ${shouldBlur() ? 'opacity-30' : ''}`} style={{ animationDelay: '2s' }}></div>
        <div className={`absolute top-1/3 right-[10%] w-64 h-64 rounded-full bg-purple-300/20 blur-3xl animate-float ${shouldBlur() ? 'opacity-30' : ''}`} style={{ animationDelay: '4s' }}></div>
        <div className={`absolute top-3/4 left-[15%] w-80 h-80 rounded-full bg-sky-300/20 blur-3xl animate-float ${shouldBlur() ? 'opacity-30' : ''}`} style={{ animationDelay: '3s' }}></div>
      </div>
      {/* Logout Modal  */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-white/20"
            >
              <div className="text-center">
                <motion.div 
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10"
                >
                  <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping opacity-40"></div>
                  <LogOut className="w-9 h-9 text-red-500" />
                </motion.div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Confirm Logout
                </h3>
                
                <p className="text-gray-600 mb-7 max-w-xs mx-auto">
                  Are you sure you want to logout? You will need to login again to access your account.
                </p>
                
                <div className="flex justify-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogoutCancel}
                    className="px-7 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 
                      transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                      shadow-md shadow-gray-200/50 border border-gray-200"
                  >
                    Cancel
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogoutConfirm}
                    className="px-7 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 
                      rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-300 
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                      shadow-lg shadow-red-500/30"
                  >
                    Logout
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Mobile Menu Button */}
      {isMobile && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="fixed top-4 left-4 z-40 p-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30"
        >
          <Menu className="w-5 h-5" />
          <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </motion.button>
      )}

      {/* Enhanced Sidebar with blur effect when modal is open */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? '5.5rem' : '18rem',
          x: isMobile && isCollapsed ? '-100%' : 0,
          filter: shouldBlur() ? 'blur(8px)' : 'none',
        }}
        data-modal="true"
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 25,
          mass: 1.5,
          duration: 0.4,
          ease: [0.32, 0.72, 0, 1]
        }}
        className={`fixed inset-y-0 left-0 bg-gradient-to-b from-[#070b11] via-[#142849] to-[#070b11] text-white shadow-2xl z-[40] rounded-r-3xl overflow-hidden backdrop-blur-md ${shouldBlur() ? 'opacity-80' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          willChange: 'width, transform, filter',
          transformOrigin: 'left center'
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header with glass effect */}
          <div className="p-6 flex items-center justify-center border-b border-white/10 bg-white/5 backdrop-blur-sm">
            {/* Logo container with enhanced transitions and effects */}
            <div className="flex items-center justify-center">
              <motion.div 
                className={`relative flex items-center justify-center transition-all duration-500 ease-in-out
                  ${isCollapsed ? 'w-16 h-16' : 'w-20 h-20'}`}
                animate={{
                  scale: isCollapsed ? 0.9 : 1,
                  rotate: isCollapsed ? -5 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 150,
                  damping: 20,
                  mass: 1.2,
                  duration: 0.4,
                  ease: [0.32, 0.72, 0, 1]
                }}
              >
                {/* Outer glow circle - increased size */}
                <motion.div 
                  className="absolute -inset-3 rounded-full flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle at center, rgba(96, 165, 250, 0.25) 0%, rgba(96, 165, 250, 0) 80%)",
                    filter: "blur(14px)",
                  }}
                  animate={{
                    scale: isCollapsed ? 1 : [1, 1.3, 1],
                    opacity: isCollapsed ? 0 : [0.25, 0.4, 0.25],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />

                {/* Middle glow circle - increased size */}
                <motion.div 
                  className="absolute -inset-2 rounded-full flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle at center, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0) 70%)",
                    filter: "blur(10px)",
                  }}
                  animate={{
                    scale: isCollapsed ? 1 : [1, 1.2, 1],
                    opacity: isCollapsed ? 0 : [0.3, 0.45, 0.3],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2
                  }}
                />

                {/* Inner pulsing circle - increased size */}
                <motion.div 
                  className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{
                    background: "radial-gradient(circle at center, rgba(37, 99, 235, 0.4) 0%, rgba(37, 99, 235, 0) 60%)",
                    filter: "blur(10px)",
                  }}
                  animate={{
                    scale: isCollapsed ? 1 : [1, 1.1, 1],
                    opacity: isCollapsed ? 0.3 : [0.4, 0.5, 0.4],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.4
                  }}
                />

                {/* Logo image with enhanced transitions and perfect centering */}
                <motion.div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: 'translateZ(0)',
                  }}
                >
                  <motion.img
                    src="/img/logo1.png"
                    alt="School Logo"
                    className="w-[95%] h-[95%] object-contain drop-shadow-lg"
                    style={{
                      transformOrigin: "center center",
                      willChange: "transform, filter"
                    }}
                    animate={{
                      scale: isCollapsed ? 1.25 : 1.1,
                      rotate: isCollapsed ? 5 : 0,
                      filter: isCollapsed ? "brightness(1.1)" : "brightness(1)",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      mass: 1
                    }}
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Navigation with enhanced visuals and smooth transitions */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 custom-scrollbar">
            {filteredSidebarItems.map((item, index) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.3,
                  delay: index * 0.03,
                  ease: [0.32, 0.72, 0, 1]
                }}
              >
                <Link
                  to={item.path}
                  className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ease-in-out
                    ${isExactPathActive(item.path)
                      ? 'bg-gradient-to-r from-white/20 to-white/10 text-white font-medium backdrop-blur-sm shadow-lg'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }
                    ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <motion.div 
                    layout
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 25,
                      mass: 1.2,
                      duration: 0.3,
                      ease: [0.32, 0.72, 0, 1]
                    }}
                    className={`p-2 rounded-lg transition-all duration-300 
                    ${isExactPathActive(item.path)
                      ? 'bg-white text-blue-600 shadow-md shadow-white/20' 
                      : 'text-blue-100 group-hover:bg-white/10 group-hover:text-white'}`}
                  >
                    {item.icon}
                  </motion.div>
                  
                  {!isCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ 
                        duration: 0.3,
                        ease: [0.32, 0.72, 0, 1]
                      }}
                      className={`font-medium overflow-hidden whitespace-nowrap ${isExactPathActive(item.path) ? 'ml-1' : ''}`}
                    >
                      {item.label}
                    </motion.span>
                  )}
                  
                  {/* Active indicator line with enhanced animation */}
                  {!isCollapsed && isExactPathActive(item.path) && (
                    <motion.div 
                      className="absolute left-0 w-1.5 h-8 bg-gradient-to-b from-blue-300 to-white rounded-r-full"
                      layoutId="activeIndicator"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "2rem" }}
                      transition={{ 
                        type: "spring",
                        stiffness: 200,
                        damping: 25,
                        mass: 1.2,
                        duration: 0.3,
                        ease: [0.32, 0.72, 0, 1]
                      }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* Footer with glass effect and smooth transitions */}
          <div className="p-6 border-t border-white/10 bg-gradient-to-b from-transparent to-blue-900/30 backdrop-blur-sm">
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 10, height: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    damping: 25,
                    mass: 1.2,
                    duration: 0.3,
                    ease: [0.32, 0.72, 0, 1]
                  }}
                  className="flex items-center gap-3 mb-4 overflow-hidden"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">
                      {user.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-blue-200 truncate">
                      {user.email}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Logout button with enhanced styling and transitions */}
            <div className={`${isCollapsed ? 'flex justify-center' : 'w-full'} transition-all duration-300 ease-in-out`}>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLogoutClick}
                layout
                transition={{ 
                  type: "spring",
                  stiffness: 200,
                  damping: 25,
                  mass: 1.2,
                  duration: 0.3,
                  ease: [0.32, 0.72, 0, 1]
                }}
                className={`flex items-center justify-center text-sm font-medium text-white 
                  bg-gradient-to-r from-red-500 to-rose-600 rounded-xl hover:from-red-600 hover:to-rose-700
                  transition-all duration-300 ease-in-out shadow-lg shadow-rose-500/30
                  ${isCollapsed 
                    ? 'w-12 h-12 p-3 rounded-full' 
                    : 'w-full px-5 py-3.5 gap-3'}`}
                title={isCollapsed ? 'Logout' : undefined}
              >
                <LogOut className="w-5 h-5" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      Logout
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Enhanced Main Content with blur effect when modal is open */}
      <motion.main
        animate={{
          marginLeft: isCollapsed ? '5.5rem' : '18rem',
          filter: shouldBlur() ? 'blur(8px)' : 'none',
        }}
        data-modal="true"
        className={`min-h-screen p-6 md:p-8 ${shouldBlur() ? 'pointer-events-none [&:not(.course-modal):not(.subject-modal)]' : ''} z-[30]`}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 20,
              duration: 0.5 
            }}
            className={`bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 ${shouldBlur() ? 'opacity-80' : ''}`}
          >
            {children}
          </motion.div>
        </div>
      </motion.main>

      {/* Enhanced Overlay for mobile with blur effect */}
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
    </div>
  );
};

export default DashboardLayout; 
