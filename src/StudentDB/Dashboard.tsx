import React, { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import { StudentGradeViewer } from './StudentGradeViewer';
import MyCourse from './MyCourse';
import { MyProfile } from './MyProfile';
import { CertificateOfEnrollment } from './CertificateOfEnrollment';
import Prospectus from './Prospectus';
import { useAuth } from '../contexts/AuthContext';
import { ReceiptPermit } from './ReceiptPermit';
import { StudentGoogleClassroom } from '../components/StudentGoogleClassroom';
import { 
  BookOpen,  
  Bell,
  GraduationCap,
  ExternalLink,
  User,
  CheckSquare,
  TrendingUp,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
// import { toast } from 'react-hot-toast';
import { getGoogleClassroomConnectionInfo } from '../lib/services/googleClassroomService';

// Helpers to read display name and avatar from Authentication
function getAuthDisplayName(u: unknown): string | null {
  if (!u || typeof u !== 'object') return null;
  const md = (u as { user_metadata?: Record<string, unknown> }).user_metadata;
  const candidates = [md && md['full_name'], md && md['name'], md && md['display_name'], md && md['preferred_username']];
  for (const c of candidates) if (typeof c === 'string' && c.trim()) return c as string;
  const identities = (u as { identities?: Array<{ identity_data?: Record<string, unknown> }> }).identities;
  if (Array.isArray(identities)) {
    for (const id of identities) {
      const d = id?.identity_data;
      const n = d && (typeof d['full_name'] === 'string' ? (d['full_name'] as string) : (typeof d['name'] === 'string' ? (d['name'] as string) : null));
      if (n) return n;
    }
  }
  return null;
}

function getAuthAvatarUrl(u: unknown): string | null {
  if (!u || typeof u !== 'object') return null;
  const keys = ['avatar_url','picture','picture_url','photoURL','photoUrl','avatar','image','image_url','imageUrl','profile_picture','profileImage'];
  const tryKeys = (o?: Record<string, unknown> | null): string | null => {
    if (!o) return null;
    for (const k of keys) { const v = o[k]; if (typeof v === 'string' && /^https?:\/\//i.test(v)) return v; }
    return null;
  };
  const md = (u as { user_metadata?: Record<string, unknown> }).user_metadata;
  const fromMd = tryKeys(md); if (fromMd) return fromMd;
  const identities = (u as { identities?: Array<{ identity_data?: Record<string, unknown> }> }).identities;
  if (Array.isArray(identities)) {
    for (const id of identities) { const cand = tryKeys(id?.identity_data as Record<string, unknown> | undefined); if (cand) return cand; }
  }
  return null;
}

// Enhanced Loading component with skeleton
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br to-blue-100">
    <div className="max-w-[1400px] mx-auto space-y-8 sm:space-y-10 p-4">
      {/* Welcome Section Skeleton */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50 rounded-2xl -z-10"></div>
        <div className="p-6 sm:p-8 md:p-10">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
            {/* Profile Circle Skeleton */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-200 animate-pulse"></div>
            {/* Welcome Text Skeleton */}
            <div className="flex-1 flex flex-col items-center text-center sm:items-start sm:text-left sm:block">
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-3"></div>
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
        {[1, 2].map(i => (
          <div key={i} className="bg-gray-100/80 backdrop-blur-sm rounded-xl p-3 sm:p-6 md:p-8 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Please try refreshing the page</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Dashboard Overview component
const DashboardOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState<string>('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    gpa: 0
  });
  const [googleClassroomStatus, setGoogleClassroomStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; severity: string; created_at: string }>>([]);
  const [googleClassroomData, setGoogleClassroomData] = useState<{
    courses: Array<{
      id: string;
      name: string;
      section: string;
      courseState: string;
    }>;
    courseWork: Array<{
      id: string;
      courseId: string;
      title: string;
      description: string;
      materials: Array<{ title: string; driveFile?: { driveFile: { id: string } } }>;
      state: string;
      creationTime: string;
      dueDate?: { year: number; month: number; day: number };
      dueTime?: { hours: number; minutes: number };
      maxPoints?: number;
    }>;
    submissions: Array<{
      id: string;
      courseId: string;
      courseWorkId: string;
      state: string;
      late: boolean;
      assignedGrade?: number;
      maxPoints?: number;
      updateTime: string;
    }>;
    isLoading: boolean;
  }>({ courses: [], courseWork: [], submissions: [], isLoading: false });

  // Check Google Classroom connection status and fetch data
  useEffect(() => {
    const checkGoogleClassroomStatus = async () => {
      if (!user?.id) {
        setGoogleClassroomStatus('disconnected');
        return;
      }

      const connectionInfo = getGoogleClassroomConnectionInfo(user.id);
      setGoogleClassroomStatus(connectionInfo.status);

      // If connected, fetch Google Classroom data
      if (connectionInfo.status === 'connected') {
        try {
          await fetchGoogleClassroomData();
        } catch (error) {
          console.error('Error fetching Google Classroom data:', error);
        }
      }
    };

    checkGoogleClassroomStatus();
    
    // Listen for storage changes to update status
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('google_classroom_token_') || e.key?.includes('google_auth_code_')) {
        checkGoogleClassroomStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.id]);

  // Function to fetch Google Classroom data
  const fetchGoogleClassroomData = async () => {
    try {
      // Set loading state
      setGoogleClassroomData(prev => ({ ...prev, isLoading: true }));
      
      // Get the access token from storage
      const token = localStorage.getItem(`google_classroom_token_${user?.id}`);
      if (!token) {
        setGoogleClassroomStatus('disconnected');
        setGoogleClassroomData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Fetch courses
      const coursesResponse = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        const courses = coursesData.courses || [];

        // Fetch course work for each course with better error handling
        const courseWorkPromises = courses.map(async (course: { id: string; name: string; section: string; courseState: string }) => {
          try {
            // Use a simple API call without complex parameters that might cause 400 errors
            const courseWorkResponse = await fetch(
              `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (courseWorkResponse.ok) {
              const courseWorkData = await courseWorkResponse.json();
              const courseWork = courseWorkData.courseWork || [];
              
              if (courseWork.length > 0) {
                console.log(`Course "${course.name}" has ${courseWork.length} course work items`);
                // Sort by creation time locally instead of using API ordering
                return courseWork
                  .sort((a: { creationTime: string }, b: { creationTime: string }) => new Date(b.creationTime).getTime() - new Date(a.creationTime).getTime())
                  .slice(0, 5);
              } else {
                console.log(`Course "${course.name}" has no course work`);
                return [];
              }
            } else if (courseWorkResponse.status === 403) {
              console.warn(`No permission to access course work for course: ${course.name}`);
              return [];
            } else if (courseWorkResponse.status === 400) {
              console.log(`Course "${course.name}" may be empty or have no course work (400 error)`);
              return [];
            } else {
              console.warn(`Failed to fetch course work for course: ${course.name}, status: ${courseWorkResponse.status}`);
              return [];
            }
          } catch (error) {
            console.warn(`Error fetching course work for course ${course.name}:`, error);
            return [];
          }
        });

        const courseWorkArrays = await Promise.all(courseWorkPromises);
        const courseWork = courseWorkArrays.flat();

        // Fetch submissions for the course work with better error handling
        const submissionPromises = courseWork.map(async (work: { id: string; courseId: string; title: string; description: string; materials: Array<{ title: string; driveFile?: { driveFile: { id: string } } }>; state: string; creationTime: string; dueDate?: { year: number; month: number; day: number }; dueTime?: { hours: number; minutes: number }; maxPoints?: number }) => {
          try {
            const submissionResponse = await fetch(
              `https://classroom.googleapis.com/v1/courses/${work.courseId}/courseWork/${work.id}/studentSubmissions?userId=me`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (submissionResponse.ok) {
              const submissionData = await submissionResponse.json();
              return submissionData.studentSubmissions || [];
            } else if (submissionResponse.status === 403) {
              console.warn(`No permission to access submissions for course work: ${work.title}`);
              return [];
            } else {
              console.warn(`Failed to fetch submissions for course work: ${work.title}, status: ${submissionResponse.status}`);
              return [];
            }
          } catch (error) {
            console.warn(`Error fetching submissions for course work ${work.title}:`, error);
            return [];
          }
        });

        const submissionArrays = await Promise.all(submissionPromises);
        const submissions = submissionArrays.flat();

        setGoogleClassroomData({ courses, courseWork, submissions, isLoading: false });
      } else if (coursesResponse.status === 401) {
        console.warn('Google Classroom token expired or invalid');
        setGoogleClassroomStatus('disconnected');
        setGoogleClassroomData(prev => ({ ...prev, isLoading: false }));
        // Clear the expired token
        localStorage.removeItem(`google_classroom_token_${user?.id}`);
      } else if (coursesResponse.status === 403) {
        console.warn('No permission to access Google Classroom courses');
        setGoogleClassroomStatus('disconnected');
        setGoogleClassroomData(prev => ({ ...prev, isLoading: false }));
      } else {
        console.warn(`Failed to fetch courses, status: ${coursesResponse.status}`);
        setGoogleClassroomStatus('disconnected');
        setGoogleClassroomData(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error fetching Google Classroom data:', error);
      setGoogleClassroomStatus('disconnected');
      setGoogleClassroomData(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Fetch notifications for students (audience student/all)
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, title, message, severity, created_at')
          .eq('is_active', true)
          .in('audience', ['student','all'])
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        setNotifications(data || []);
      } catch (err) {
        console.error('Student notifications fetch error:', err);
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, [user?.id]);

  // Memoized data processing
  const processedProfile = useMemo(() => {
    return {
      fullName: studentName || user?.email?.split('@')[0] || 'Student',
      initials: studentName ? studentName.split(' ').map(n => n[0]).join('').toUpperCase() : user?.email?.[0].toUpperCase() || '?',
      hasProfilePicture: !!profilePictureUrl
    };
  }, [studentName, user?.email, profilePictureUrl]);

  // Memoized handlers
  const handleProfileImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const imgElement = e.target as HTMLImageElement;
    console.error('Error loading profile image:', {
      url: imgElement.src,
      error: e,
      currentSrc: imgElement.currentSrc,
      complete: imgElement.complete,
      naturalWidth: imgElement.naturalWidth,
      naturalHeight: imgElement.naturalHeight
    });
    setProfilePictureUrl(null);
  }, []);

  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (user?.id) {
        try {
          // Preferred: display name from Auth (Google), fallback to email prefix
          const { data: authData } = await supabase.auth.getUser();
          const displayName = authData?.user ? (getAuthDisplayName(authData.user) || authData.user.email || '') : (user.email || '');
          setStudentName(displayName);

          // Fetch avatar from user_profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('avatar_url, profile_picture_url')
            .eq('id', user.id)
            .single();

          if (!profileError && profileData) {
            // Priority 1: Use avatar_url from database profile
            let pictureUrl: string | null = profileData.avatar_url || null;
            
            // Priority 2: Fallback to profile_picture_url from storage bucket
            if (!pictureUrl && profileData.profile_picture_url) {
              const { data: signedUrlData } = await supabase
                .storage
                .from('avatar')
                .createSignedUrl(profileData.profile_picture_url, 60 * 60);
              if (signedUrlData?.signedUrl) {
                pictureUrl = signedUrlData.signedUrl;
              }
            }
            
            if (pictureUrl) {
              setProfilePictureUrl(pictureUrl);
              return;
            }
          }

          // Fallback: Avatar priority: Auth metadata/identities → Google userinfo → none
          const authAvatar = authData?.user ? getAuthAvatarUrl(authData.user) : null;
          if (authAvatar) {
            setProfilePictureUrl(authAvatar);
            return;
          }
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.provider_token as string | undefined;
          if (token) {
            try {
              const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
              if (resp.ok) {
                const json = await resp.json();
                if (typeof json?.picture === 'string') {
                  setProfilePictureUrl(json.picture);
                  return;
                }
              }
            } catch {
              // ignore network errors; fallback below
            }
          }
          setProfilePictureUrl(null);
        } catch (error) {
          console.error('Error fetching student profile:', error);
        }
      }
    };

    const fetchEnrolledCourses = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('enrollcourse')
            .select('id')
            .eq('student_id', user.id)
            .eq('status', 'active');

          if (error) throw error;
          setStats(prev => ({
            ...prev,
            enrolledCourses: data?.length || 0
          }));
        } catch (error) {
          console.error('Error fetching enrolled courses:', error);
        }
      }
    };

    fetchStudentProfile();
    fetchEnrolledCourses();
  }, [user?.id, user?.email]);

  // Add cleanup for blob URLs when component unmounts
  useEffect(() => {
    return () => {
      if (profilePictureUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(profilePictureUrl);
      }
    };
  }, [profilePictureUrl]);

  useEffect(() => {
    // TODO: Replace with actual API call for GPA
    setStats(prev => ({
      ...prev,
      gpa: 3.75
    }));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto space-y-8 sm:space-y-10">
          {/* Welcome Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative bg-white/90 rounded-2xl"
          >
            <div className="absolute inset-0 bg-white/90 rounded-2xl -z-10"></div>
            <div className="p-6 sm:p-8 md:p-10">
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                {/* Profile Circle */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center overflow-hidden">
                  {profilePictureUrl ? (
                    <img 
                      src={profilePictureUrl} 
                      alt="Profile" 
                      className="dashboard-profile-picture w-full h-full object-cover"
                      onError={handleProfileImageError}
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-300" />
                  )}
                </div>

                {/* Welcome Text */}
                <div className="flex-1 flex flex-col items-center text-center sm:items-start sm:text-left sm:block">
                  <h1 className="text-4xl sm:text-3xl md:text-4xl font-black tracking-tighter text-gray-800">
                    Welcome back
                  </h1>
                  <div className="mt-2 sm:mt-0 sm:inline-block">
                    <span className="inline-block sm:ml-2">
                      <span className="text-sm sm:text-2xl md:text-3xl font-bold tracking-wide text-gray-800">
                        {processedProfile.fullName}
                      </span>
                    </span>
                  </div>
                  <p className="mt-3 text-sm sm:text-base text-gray-700 max-w-2xl sm:text-left text-center">
                    Here's what's happening with your academic progress. Stay updated with your courses, grades, and important notifications.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 xs:gap-4 sm:gap-6 lg:gap-8">
            {/* Enrolled Courses */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="dashboard-stat-card group relative bg-white/90 rounded-xl p-3 xs:p-4 sm:p-5 md:p-6 border border-[#444] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative flex items-start justify-between h-full">
                <div className="flex flex-col min-w-0 flex-1">
                  <p className="text-lg xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                    {stats.enrolledCourses}
                  </p>
                  <p className="text-[10px] xs:text-xs sm:text-sm font-medium text-gray-800 leading-tight whitespace-nowrap">Enrolled Subjects</p>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2b2d2f] transition-colors duration-300 flex-shrink-0 mt-1">
                  <BookOpen className="w-3 h-3 xs:w-4 xs:h-4 text-blue-600" />
                </div>
              </div>
            </motion.div>

            {/* Current GPA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="dashboard-stat-card group relative bg-white/90 rounded-xl p-3 xs:p-4 sm:p-5 md:p-6 border border-[#444] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative flex items-start justify-between h-full">
                <div className="flex flex-col min-w-0 flex-1">
                  <p className="text-lg xs:text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                    {stats.gpa.toFixed(2)}
                  </p>
                  <p className="text-[10px] xs:text-xs sm:text-sm font-medium text-gray-800 leading-tight whitespace-nowrap">Current GPA</p>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2b2d2f] transition-colors duration-300 flex-shrink-0 mt-1">
                  <TrendingUp className="w-3 h-3 xs:w-4 xs:h-4 text-green-600" />
                </div>
              </div>
            </motion.div>

            {/* Google Classroom Integration */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              onClick={() => navigate('/dashboard/google-classroom')}
              className="dashboard-stat-card group relative bg-white/90 rounded-xl p-3 xs:p-4 sm:p-5 md:p-6 border border-[#444] transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative flex items-start justify-between h-full">
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm xs:text-sm sm:text-base md:text-lg font-bold text-gray-800 leading-tight">
                      {googleClassroomStatus === 'checking' ? 'Checking...' : 
                       googleClassroomStatus === 'connected' ? 'Connected' : 'Not Connected'}
                    </p>
                    {googleClassroomStatus === 'connected' && (
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                    {googleClassroomStatus === 'disconnected' && (
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    )}
                    {googleClassroomStatus === 'checking' && (
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <p className="text-[10px] xs:text-xs sm:text-sm font-medium text-gray-800 leading-tight whitespace-nowrap">Google Classroom</p>
                  <p className="text-[10px] xs:text-xs sm:text-sm text-gray-600 leading-tight">
                    {googleClassroomStatus === 'connected' ? '' : 
                     googleClassroomStatus === 'checking' ? 'Verifying connection' : 'Connect to sync'}
                  </p>
                </div>
                <div className="p-1.5 rounded-lg bg-[#2b2d2f] transition-colors duration-300 flex-shrink-0 mt-1">
                  <ExternalLink className="w-3 h-3 xs:w-4 xs:h-4 text-purple-600" />
                </div>
              </div>
            </motion.div>
          </div>

       

          {/* Notifications and Reminders - Horizontal Layout on Desktop */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Notifications (from DB audience student/all) */}
            <div className="bg-white/90 rounded-xl border border-[#444] p-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-[#2b2d2f]">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                </div>
                Notifications
              </h2>
              {notifications.length === 0 ? (
                <div className="text-gray-600 text-sm">No notifications right now.</div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div key={n.id} className="flex items-start justify-between p-3 bg-gray-100 rounded-lg border border-gray-200">
                      <div className="pr-4">
                        <div className="text-gray-800 font-medium text-sm">{n.title}</div>
                        <div className="text-gray-600 text-xs">{n.message}</div>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Google Classroom Task Notifications - Reminders */}
            <div className="bg-white/90 rounded-xl border border-[#444] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#2b2d2f]">
                  <BookOpen className="w-5 h-5 sm:w-6 text-green-500" />
                </div>
                <span className="hidden sm:inline">Task Reminders</span>
                <span className="sm:hidden">Reminders</span>
              </h2>
              {googleClassroomStatus === 'connected' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium hidden sm:inline">Connected</span>
                </div>
              )}
            </div>
            
            {googleClassroomStatus === 'connected' ? (
              <div className="space-y-3">
                {googleClassroomData.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="w-16 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : googleClassroomData.courseWork.length > 0 ? (
                  <>
                                         {/* Recent Assignments - Reminder System */}
                     {googleClassroomData.courseWork
                       .filter(work => {
                         const submission = googleClassroomData.submissions.find(s => s.courseWorkId === work.id);
                         const taskAge = Date.now() - new Date(work.creationTime).getTime();
                         const daysOld = taskAge / (1000 * 60 * 60 * 24);
                         
                         // Only show tasks that are 1-3 days old (reminder period)
                         const isInReminderPeriod = daysOld >= 1 && daysOld <= 3;
                         
                         // Also show recently submitted tasks (last 2 days) and graded tasks (last 3 days)
                         const isRecentlySubmitted = submission?.state === 'TURNED_IN' && 
                           (Date.now() - new Date(submission.updateTime).getTime()) <= (2 * 24 * 60 * 60 * 1000);
                         const isRecentlyGraded = submission?.assignedGrade !== undefined && 
                           (Date.now() - new Date(submission.updateTime).getTime()) <= (3 * 24 * 60 * 60 * 1000);
                         
                         // Show: tasks in reminder period, recently submitted, or recently graded
                         return isInReminderPeriod || isRecentlySubmitted || isRecentlyGraded;
                       })
                       .slice(0, 5)
                       .map((work) => {
                         const course = googleClassroomData.courses.find(c => c.id === work.courseId);
                         const submission = googleClassroomData.submissions.find(s => s.courseWorkId === work.id);
                         const taskAge = Date.now() - new Date(work.creationTime).getTime();
                         const daysOld = Math.floor(taskAge / (1000 * 60 * 60 * 24));
                         const isInReminderPeriod = daysOld >= 1 && daysOld <= 3;
                         const isSubmitted = submission?.state === 'TURNED_IN';
                         const isGraded = submission?.assignedGrade !== undefined;
                         const isRecentlySubmitted = isSubmitted && 
                           (Date.now() - new Date(submission.updateTime).getTime()) <= (2 * 24 * 60 * 60 * 1000);
                         
                         return (
                           <div key={work.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                             isInReminderPeriod ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200' :
                             isGraded ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200' :
                             isRecentlySubmitted ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' :
                             'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
                           }`}>
                             <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-lg ${
                                 isInReminderPeriod ? 'bg-blue-100' :
                                 isGraded ? 'bg-green-100' :
                                 isRecentlySubmitted ? 'bg-yellow-100' :
                                 'bg-purple-100'
                               }`}>
                                 {isInReminderPeriod ? (
                                   <Clock className="w-4 h-4 text-blue-600" />
                                 ) : isGraded ? (
                                   <GraduationCap className="w-4 h-4 text-green-600" />
                                 ) : isRecentlySubmitted ? (
                                   <CheckSquare className="w-4 h-4 text-yellow-600" />
                                 ) : (
                                   <BookOpen className="w-4 h-4 text-purple-600" />
                                 )}
                               </div>
                               <div>
                                 <div className="text-gray-800 font-medium text-sm">
                                   {isInReminderPeriod ? `Reminder: ${daysOld} day${daysOld === 1 ? '' : 's'} old` : 
                                    isGraded ? 'Grade Updated' : 
                                    isRecentlySubmitted ? 'Recently Submitted' : 
                                    'Assignment Posted'}
                                 </div>
                                 <div className="text-gray-600 text-xs">
                                   {course?.name} - {work.title}
                                 </div>
                                 {work.maxPoints && (
                                   <div className="text-xs text-gray-500">
                                     Points: {work.maxPoints}
                                   </div>
                                 )}
                                 {isRecentlySubmitted && !isGraded && (
                                   <div className="text-xs text-yellow-600 font-medium">
                                     ✓ Submitted, waiting for grade
                                   </div>
                                 )}
                               </div>
                             </div>
                             <div className="flex flex-col items-end gap-1">
                               <div className={`px-2 py-1 text-xs rounded-full font-medium ${
                                 isInReminderPeriod ? 'bg-blue-100 text-blue-700' :
                                 isGraded ? 'bg-green-100 text-green-700' :
                                 isRecentlySubmitted ? 'bg-yellow-100 text-yellow-700' :
                                 'bg-purple-100 text-purple-700'
                               }`}>
                                 {isInReminderPeriod ? `${daysOld}d` : 
                                  isGraded ? 'Graded' : 
                                  isRecentlySubmitted ? 'Submitted' : 
                                  'Posted'}
                               </div>
                               <div className="text-xs text-gray-500">
                                 {isRecentlySubmitted ? 
                                   `Submitted ${new Date(submission!.updateTime).toLocaleDateString()}` :
                                   `${daysOld} day${daysOld === 1 ? '' : 's'} ago`
                                 }
                               </div>
                               {submission?.assignedGrade && (
                                 <div className="text-xs font-medium text-green-600">
                                   {submission.assignedGrade}/{work.maxPoints || 'N/A'}
                                 </div>
                               )}
                             </div>
                           </div>
                         );
                       })}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="p-3 rounded-full bg-gray-100 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No active reminders</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {googleClassroomData.courses.length > 0 
                        ? `You're enrolled in ${googleClassroomData.courses.length} course(s) but no recent tasks need attention`
                        : 'Check your Google Classroom for updates'
                      }
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-3 rounded-full bg-gray-100 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-gray-600 font-medium mb-2">No Classroom Connection</h3>
                <p className="text-gray-500 text-sm mb-4">Connect to Google Classroom to see your tasks and assignments</p>
                <button 
                  onClick={() => navigate('/dashboard/google-classroom')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Connect Classroom
                </button>
              </div>
            )}
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  // Removed default password change modal state


  // Centralized data fetching for MyCourse
  const [enrollmentsWithTeacher, setEnrollmentsWithTeacher] = useState<Enrollment[]>([]);
  const [courseImages, setCourseImages] = useState<{ [subjectId: string]: string }>({});
  const [loadingMyCourse, setLoadingMyCourse] = useState(true);

  // Memoized data processing
  const processedEnrollments = useMemo(() => {
    return enrollmentsWithTeacher.map(enrollment => ({
      ...enrollment,
      hasCourseImage: !!courseImages[enrollment.subject_id],
      hasTeacherImage: !!enrollment.teacher?.avatar_url
    }));
  }, [enrollmentsWithTeacher, courseImages]);

  // Default password change removed

  // Types for centralized data fetching
  interface Teacher {
    id: string;
    display_name?: string;
    avatar_url?: string;
  }

  interface TeacherAssignment {
    subject_id: string;
    teacher: Teacher | null;
  }

  interface Enrollment {
    id: string;
    course: {
      code: string;
      name: string;
      units: number;
      image_url?: string;
    };
    subject_id: string;
    status: 'active' | 'completed' | 'dropped';
    teacher?: Teacher | null;
  }

  // Centralized data fetching effect
  useEffect(() => {
    const fetchAllCourseData = async () => {
      if (!user?.id) return;
      
      try {
        setLoadingMyCourse(true);
        
        // Step 1: Fetch enrollments with course info
        const { data: enrollmentsDataRaw, error: enrollmentsError } = await supabase
          .from('enrollcourse')
          .select(`
            id,
            course:courses(code, name, units, image_url),
            subject_id,
            status
          `)
          .eq('student_id', user.id)
          .eq('status', 'active');

        if (enrollmentsError) throw enrollmentsError;
        if (!enrollmentsDataRaw || enrollmentsDataRaw.length === 0) {
          setEnrollmentsWithTeacher([]);
          setLoadingMyCourse(false);
          return;
        }

        type EnrollmentData = {
          id: string;
          course: { code: string; name: string; units: number; image_url?: string } | { code: string; name: string; units: number; image_url?: string }[];
          subject_id: string;
          status: string;
        };

        const enrollmentsData = enrollmentsDataRaw as EnrollmentData[];

        // Step 2: Fetch teacher assignments for those courses
        const subjectIds = enrollmentsData.map(e => e.subject_id);
        const { data: teacherAssignmentsRaw, error: teacherError } = await supabase
          .from('teacher_subjects')
          .select(`
            subject_id,
            teacher:user_profiles(id, display_name, avatar_url)
          `)
          .in('subject_id', subjectIds);

        if (teacherError) throw teacherError;

        // Step 3: Merge the data
        const teacherAssignments = teacherAssignmentsRaw as unknown as TeacherAssignment[];
        const enrollmentsWithTeacherData: Enrollment[] = enrollmentsData.map((enrollment) => {
          const teacherAssignment = teacherAssignments.find(
            (t) => t.subject_id === enrollment.subject_id
          );
          let teacher: Teacher | null = null;
          if (teacherAssignment) {
            if (Array.isArray(teacherAssignment.teacher)) {
              teacher = teacherAssignment.teacher[0] || null;
            } else {
              teacher = teacherAssignment.teacher;
            }
          }
          return {
            id: enrollment.id,
            course: Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course,
            subject_id: enrollment.subject_id,
            status: enrollment.status as Enrollment['status'],
            teacher
          };
        });

        setEnrollmentsWithTeacher(enrollmentsWithTeacherData);

        // Step 4: Batch fetch all course images
        const courseImageMap: { [subjectId: string]: string } = {};
        await Promise.all(
          enrollmentsWithTeacherData.map(async (enrollment) => {
            const imagePath = enrollment.course.image_url;
            if (imagePath) {
              try {
                const { data: fileData, error: fileError } = await supabase.storage
                  .from('course')
                  .download(imagePath);
                if (!fileError && fileData) {
                  const blobUrl = URL.createObjectURL(fileData);
                  courseImageMap[enrollment.subject_id] = blobUrl;
                }
              } catch (error) {
                console.error('Error fetching course image:', error);
              }
            }
          })
        );
        setCourseImages(courseImageMap);

        // Step 5: Batch fetch all teacher images
        const teacherIds = Array.from(new Set(
          enrollmentsWithTeacherData
            .map(e => e.teacher?.id)
            .filter((id): id is string => Boolean(id))
        ));

        if (teacherIds.length > 0) {
          const { data: teachers, error } = await supabase
            .from('user_profiles')
            .select('id, avatar_url')
            .in('id', teacherIds);

          if (!error && teachers) {
            const teacherUrlMap: { [teacherId: string]: string } = {};
            await Promise.all(
              teachers.map(async (teacher: { id: string; avatar_url?: string }) => {
                if (teacher.avatar_url) {
                  // Check if it's a Google avatar URL (starts with https://)
                  if (teacher.avatar_url.startsWith('https://')) {
                    teacherUrlMap[teacher.id] = teacher.avatar_url;
                  } else {
                    // It's a Supabase storage path, create signed URL
                    const { data: signedUrlData, error: signedError } = await supabase
                      .storage
                      .from('avatar')
                      .createSignedUrl(teacher.avatar_url, 60 * 60);
                    if (!signedError && signedUrlData?.signedUrl) {
                      teacherUrlMap[teacher.id] = signedUrlData.signedUrl;
                    }
                  }
                }
              })
            );
            // Teacher images are now handled directly in the teacher object via avatar_url
          }
        }

      } catch (error) {
        console.error('Error fetching course data:', error);
      } finally {
        setLoadingMyCourse(false);
      }
    };

    fetchAllCourseData();
  }, [user?.id]);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(courseImages).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [courseImages]);

  // Removed default password enforcement check

  if (!user) {
    return <Navigate to="/login" replace />;
  }



  // Removed default password modal

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/course" element={
              <MyCourse
                enrollments={processedEnrollments}
                courseImages={courseImages}
                loading={loadingMyCourse}
              />
            } />
            <Route path="/grades" element={<StudentGradeViewer />} />
            <Route path="/profile" element={<MyProfile />} />
            <Route path="/coe" element={<CertificateOfEnrollment />} />
            <Route path="/prospectus" element={<Prospectus />} />
            <Route path="/receipt-permit" element={<ReceiptPermit />} />
            <Route path="/google-classroom" element={<StudentGoogleClassroom />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export { StudentDashboard as default }; 
