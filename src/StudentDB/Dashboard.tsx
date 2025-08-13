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
  User
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

      {/* Announcements Skeleton */}
      <div className="bg-gray-100/80 backdrop-blur-sm rounded-xl border border-gray-200/50 overflow-hidden">
        <div className="p-5 sm:p-6 md:p-8 border-b border-gray-200/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="p-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col sm:flex-row items-stretch gap-6 p-6 bg-white rounded-xl shadow-lg border border-gray-200 my-4">
              <div className="w-full sm:w-40 h-40 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex justify-between items-center">
                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
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

  // Check Google Classroom connection status
  useEffect(() => {
    const checkGoogleClassroomStatus = () => {
      if (!user?.id) {
        setGoogleClassroomStatus('disconnected');
        return;
      }

      const connectionInfo = getGoogleClassroomConnectionInfo(user.id);
      setGoogleClassroomStatus(connectionInfo.status);
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

          // Avatar priority: Auth metadata/identities → Google userinfo → none
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

  // Remove the dummy announcements state and add real fetching logic
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  // Announcement type based on LandingPage.tsx
  interface Announcement {
    id: string;
    title: string;
    content: string;
    author: string;
    date: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
    image?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }

  useEffect(() => {
    let isMounted = true;
    const fetchAnnouncements = async () => {
      setLoadingAnnouncements(true);
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) {
          console.error('Error fetching announcements:', error);
        } else if (isMounted) {
          setAnnouncements(data || []);
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoadingAnnouncements(false);
      }
    };
    fetchAnnouncements();
    return () => { isMounted = false; };
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
            className="relative bg-[#252728] rounded-2xl"
          >
            <div className="absolute inset-0 bg-[#252728] rounded-2xl -z-10"></div>
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
                  <h1 className="text-4xl sm:text-3xl md:text-4xl font-black tracking-tighter text-white">
                    Welcome back
                  </h1>
                  <div className="mt-2 sm:mt-0 sm:inline-block">
                    <span className="inline-block sm:ml-2">
                      <span className="text-sm sm:text-2xl md:text-3xl font-bold tracking-wide text-white">
                        {processedProfile.fullName}
                      </span>
                    </span>
                  </div>
                  <p className="mt-3 text-sm sm:text-base text-white max-w-2xl sm:text-left text-center">
                    Here's what's happening with your academic progress. Stay updated with your courses, grades, and important announcements.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-4 xs:gap-6 sm:gap-6 lg:gap-8">
            {/* Enrolled Courses */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="dashboard-stat-card group relative bg-[#252728] rounded-xl p-4 xs:p-3 sm:p-6 md:p-8 border border-[#444] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative flex flex-col xs:flex-row xs:items-center justify-between h-full">
                <div className="space-y-1 xs:space-y-0.5 sm:space-y-1 text-center xs:text-left">
                  <p className="text-sm xs:text-xs sm:text-sm font-medium text-white">Enrolled Courses</p>
                  <p className="text-2xl xs:text-xl sm:text-3xl md:text-4xl font-bold text-white">
                    {stats.enrolledCourses}
                  </p>
                  <p className="text-sm xs:text-xs sm:text-sm text-gray-300">Active courses</p>
                </div>
                <div className="p-3 xs:p-2 sm:p-4 rounded-xl bg-[#2b2d2f] transition-colors duration-300 mx-auto xs:mx-0 mt-3 xs:mt-0">
                  <BookOpen className="w-6 h-6 xs:w-5 xs:h-5 sm:w-7 sm:h-7 text-blue-600" />
                </div>
              </div>
            </motion.div>

            {/* Current GPA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="dashboard-stat-card group relative bg-[#252728] rounded-xl p-4 xs:p-3 sm:p-6 md:p-8 border border-[#444] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative flex flex-col xs:flex-row xs:items-center justify-between h-full">
                <div className="space-y-1 xs:space-y-0.5 sm:space-y-1 text-center xs:text-left">
                  <p className="text-sm xs:text-xs sm:text-sm font-medium text-white">Current GPA</p>
                  <p className="text-2xl xs:text-xl sm:text-3xl md:text-4xl font-bold text-white">
                    {stats.gpa.toFixed(2)}
                  </p>
                  <p className="text-sm xs:text-xs sm:text-sm text-gray-300">This semester</p>
                </div>
                <div className="p-3 xs:p-2 sm:p-4 rounded-xl bg-[#2b2d2f] transition-colors duration-300 mx-auto xs:mx-0 mt-3 xs:mt-0">
                  <GraduationCap className="w-6 h-6 xs:w-5 xs:h-5 sm:w-7 sm:h-7 text-green-600" />
                </div>
              </div>
            </motion.div>

            {/* Google Classroom Integration */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              onClick={() => navigate('/dashboard/google-classroom')}
              className="dashboard-stat-card group relative bg-[#252728] rounded-xl p-4 xs:p-3 sm:p-6 md:p-8 border border-[#444] transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative flex flex-col xs:flex-row xs:items-center justify-between h-full">
                <div className="space-y-1 xs:space-y-0.5 sm:space-y-1 text-center xs:text-left">
                  <p className="text-sm xs:text-xs sm:text-sm font-medium text-white">Google Classroom</p>
                  <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-2">
                    <p className="text-lg xs:text-lg sm:text-xl md:text-2xl font-bold text-white">
                      {googleClassroomStatus === 'checking' ? 'Checking...' : 
                       googleClassroomStatus === 'connected' ? 'Connected' : 'Not Connected'}
                    </p>
                    {googleClassroomStatus === 'connected' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mx-auto xs:mx-0"></div>
                    )}
                    {googleClassroomStatus === 'disconnected' && (
                      <div className="w-2 h-2 bg-red-500 rounded-full mx-auto xs:mx-0"></div>
                    )}
                    {googleClassroomStatus === 'checking' && (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mx-auto xs:mx-0"></div>
                    )}
                  </div>
                  <p className="text-sm xs:text-xs sm:text-sm text-gray-300">
                    {googleClassroomStatus === 'connected' ? 'Access assignments' : 
                     googleClassroomStatus === 'disconnected' ? 'Connect to sync' : 'Verifying connection'}
                  </p>
                </div>
                <div className="p-3 xs:p-2 sm:p-4 rounded-xl bg-[#2b2d2f] transition-colors duration-300 mx-auto xs:mx-0 mt-3 xs:mt-0">
                  <ExternalLink className="w-6 h-6 xs:w-5 xs:h-5 sm:w-7 sm:h-7 text-purple-600" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Announcements */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="dashboard-announcements bg-[#252728] rounded-xl border border-[#444] overflow-hidden"
          >
            <div className="p-5 sm:p-6 md:p-8 border-b border-[#444] bg-[#1e1f21]">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-white flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#2b2d2f]">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
                Announcements
              </h2>
            </div>
            <div className="divide-y divide-[#444]">
              {loadingAnnouncements ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : announcements.length === 0 ? (
                <div className="p-6 text-center text-gray-300">No announcements available.</div>
              ) : (
                announcements.map((announcement, index) => (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                    className="dashboard-announcement-item group flex flex-col sm:flex-row items-stretch gap-6 p-6 md:p-8 bg-[#333334] rounded-xl shadow-lg border border-[#444] my-4 mx-2 sm:mx-4 transition-all duration-200"
                  >
                    {/* Image section */}
                    {announcement.image && (
                      <div className="flex-shrink-0 flex items-center justify-center w-full sm:w-40 md:w-48 h-40 bg-[#252728] rounded-lg overflow-hidden border border-[#444] shadow-sm mb-4 sm:mb-0">
                        <img
                          src={announcement.image}
                          alt="Announcement"
                          className="object-cover w-full h-full"
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    {/* Content section */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-2 truncate">
                          {announcement.title}
                        </h3>
                        <p className="text-gray-300 text-sm md:text-base mb-3 whitespace-pre-line line-clamp-4">
                          {announcement.content}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 gap-2">
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>By <span className="font-semibold text-white">{announcement.author}</span></span>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-gray-300">{new Date(announcement.created_at).toLocaleString()}</span>
                        </div>
                        <span className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors border border-gray-200 shadow-sm ${
                          announcement.category === 'academic' 
                            ? 'bg-blue-50 text-blue-700' 
                            : announcement.category === 'registration' 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {announcement.category}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
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
  const [teacherImageUrls, setTeacherImageUrls] = useState<{ [teacherId: string]: string }>({});
  const [loadingMyCourse, setLoadingMyCourse] = useState(true);

  // Memoized data processing
  const processedEnrollments = useMemo(() => {
    return enrollmentsWithTeacher.map(enrollment => ({
      ...enrollment,
      hasCourseImage: !!courseImages[enrollment.subject_id],
      hasTeacherImage: enrollment.teacher?.id && !!teacherImageUrls[enrollment.teacher.id]
    }));
  }, [enrollmentsWithTeacher, courseImages, teacherImageUrls]);

  // Default password change removed

  // Types for centralized data fetching
  interface Teacher {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
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
            teacher:user_profiles(id, first_name, last_name, profile_picture_url)
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
            .select('id, profile_picture_url')
            .in('id', teacherIds);

          if (!error && teachers) {
            const teacherUrlMap: { [teacherId: string]: string } = {};
            await Promise.all(
              teachers.map(async (teacher: { id: string; profile_picture_url?: string }) => {
                if (teacher.profile_picture_url) {
                  const { data: signedUrlData, error: signedError } = await supabase
                    .storage
                    .from('avatar')
                    .createSignedUrl(teacher.profile_picture_url, 60 * 60);
                  if (!signedError && signedUrlData?.signedUrl) {
                    teacherUrlMap[teacher.id] = signedUrlData.signedUrl;
                  }
                }
              })
            );
            setTeacherImageUrls(teacherUrlMap);
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
                teacherImageUrls={teacherImageUrls}
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
