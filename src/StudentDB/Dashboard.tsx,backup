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
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    gpa: 0
  });
  const [googleClassroomStatus, setGoogleClassroomStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; severity: string; created_at: string; expires_at?: string | null; created_by?: string | null; created_by_name?: string | null }>>([]);
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
          .select('id, title, message, severity, created_at, expires_at, created_by')
          .eq('is_active', true)
          .in('audience', ['student','all'])
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        const base = (data || []) as Array<{ id: string; title: string; message: string; severity: string; created_at: string; expires_at?: string | null; created_by?: string | null }>; 
        const creatorIds = Array.from(new Set(base.map(n => n.created_by).filter(Boolean))) as string[];
        const nameMap: Record<string, string> = {};
        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, display_name, first_name, last_name')
            .in('id', creatorIds);
          if (profiles) {
            for (const p of profiles as Array<{ id: string; display_name?: string | null; first_name?: string | null; last_name?: string | null }>) {
              const full = (p.display_name && p.display_name.trim()) || [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
              if (full) nameMap[p.id] = full;
            }
          }
        }
        setNotifications(base.map(n => ({ ...n, created_by_name: n.created_by ? (nameMap[n.created_by] || null) : null })));
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
      fullName: studentName || (isProfileLoading ? 'Loading...' : user?.email?.split('@')[0] || 'Student'),
      initials: studentName ? studentName.split(' ').map(n => n[0]).join('').toUpperCase() : user?.email?.[0].toUpperCase() || '?',
      hasProfilePicture: !!profilePictureUrl
    };
  }, [studentName, user?.email, profilePictureUrl, isProfileLoading]);

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
          setIsProfileLoading(true);
          // Get auth data for fallbacks
          const { data: authData } = await supabase.auth.getUser();
          
          // Fetch profile data from database
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('avatar_url, profile_picture_url, display_name, first_name, middle_name, last_name, email')
            .eq('id', user.id)
            .single();

          // Handle display name priority: display_name > DB full name > auth name/email > user email
          let displayName = '';
          if (profileData?.display_name && profileData.display_name.trim() !== '') {
            displayName = profileData.display_name;
          } else if (profileData?.first_name || profileData?.middle_name || profileData?.last_name) {
            const parts = [profileData.first_name, profileData.middle_name, profileData.last_name]
              .map((p) => (typeof p === 'string' ? p.trim() : ''))
              .filter(Boolean);
            displayName = parts.join(' ').trim();
          } else if (authData?.user) {
            displayName = getAuthDisplayName(authData.user) || authData.user.email || '';
          } else {
            displayName = user.email || '';
          }
          setStudentName(displayName);

          // Handle avatar with fallback
          let pictureUrl: string | null = null;
          
          // Priority 1: Use avatar_url from database
          if (profileData?.avatar_url) {
            pictureUrl = profileData.avatar_url;
          }
          // Priority 2: Use profile_picture_url from storage (sign if needed)
          else if (profileData?.profile_picture_url) {
            const path = profileData.profile_picture_url as unknown as string;
            if (typeof path === 'string') {
              if (/^https?:\/\//i.test(path)) {
                pictureUrl = path;
              } else if (path.trim() !== '') {
                try {
                  const { data: signed, error: signErr } = await supabase
                    .storage
                    .from('avatar')
                    .createSignedUrl(path, 60 * 60);
                  if (!signErr && signed?.signedUrl) {
                    pictureUrl = signed.signedUrl;
                  }
                } catch {
                  // ignore and fallback
                }
              }
            }
          }
          // Priority 3: Fallback to Google metadata if no DB image
          else if (authData?.user) {
            pictureUrl = getAuthAvatarUrl(authData.user);
          }
          
          setProfilePictureUrl(pictureUrl);
        } catch (error) {
          console.error('Error fetching student profile:', error);
          setProfilePictureUrl(null);
          setStudentName(user?.email || '');
        } finally {
          setIsProfileLoading(false);
        }
      } else {
        setIsProfileLoading(false);
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

  // Fetch current GPA based on released grades
  useEffect(() => {
    const fetchCurrentGpa = async () => {
      if (!user?.id) return;
      try {
        // Helper: Convert percentage (e.g., 92) to PH GPA scale (1.0–5.0).
        // If already 1.0–5.0, return as-is.
        const toPhGpa = (raw: number): number => {
          if (!Number.isFinite(raw)) return NaN;
          if (raw <= 5) return raw; // already GPA scale
          const pct = Math.max(0, Math.min(100, raw));
          if (pct >= 99) return 1.0;
          if (pct >= 96) return 1.25;
          if (pct >= 93) return 1.5;
          if (pct >= 90) return 1.75;
          if (pct >= 87) return 2.0;
          if (pct >= 84) return 2.25;
          if (pct >= 81) return 2.5;
          if (pct >= 78) return 2.75;
          if (pct >= 75) return 3.0;
          return 5.0; // failing (<75)
        };

        // 1) Get released grades for this student with subject_id to look up units
        const { data: grades, error: gradesError } = await supabase
          .from('grades')
          .select('subject_id, prelim_grade, midterm_grade, final_grade')
          .eq('student_id', user.id)
          .eq('is_released', true);
        if (gradesError) throw gradesError;

        const gradeRows = (grades || []) as Array<{
          subject_id: string | null;
          prelim_grade: number | null;
          midterm_grade: number | null;
          final_grade: number | null;
        }>;

        if (gradeRows.length === 0) {
          setStats(prev => ({ ...prev, gpa: 0 }));
          return;
        }

        // 2) Collect distinct subject_ids and fetch their units from courses
        const subjectIds = Array.from(new Set(gradeRows.map(r => r.subject_id).filter(Boolean))) as string[];
        let unitsMap = new Map<string, number>();
        if (subjectIds.length > 0) {
          const { data: courses, error: coursesError } = await supabase
            .from('courses')
            .select('id, units')
            .in('id', subjectIds);
          if (!coursesError && courses) {
            unitsMap = (courses as Array<{ id: string; units: number | null }>)
              .reduce((acc, c) => { acc.set(c.id, typeof c.units === 'number' ? c.units : 0); return acc; }, new Map<string, number>());
          }
        }

        // 3) Compute weighted GPA per PH rule: sum(grade * units) / sum(units)
        let totalWeighted = 0;
        let totalUnits = 0;

        for (const row of gradeRows) {
          if (!row.subject_id) continue;
          const units = unitsMap.get(row.subject_id) ?? 0;
          if (units <= 0) continue; // skip if units unknown or zero

          // Prefer final grade; otherwise average available parts
          const componentGrades = [row.prelim_grade, row.midterm_grade, row.final_grade]
            .filter(v => typeof v === 'number')
            .map(v => toPhGpa(v as number))
            .filter(v => Number.isFinite(v)) as number[];
          if (componentGrades.length === 0) continue;
          const subjectGrade = (typeof row.final_grade === 'number' && Number.isFinite(row.final_grade))
            ? toPhGpa(row.final_grade as number)
            : (componentGrades.reduce((a, b) => a + b, 0) / componentGrades.length);

          totalWeighted += subjectGrade * units;
          totalUnits += units;
        }

        const currentGpa = totalUnits > 0 ? Math.round((totalWeighted / totalUnits) * 100) / 100 : 0;
        setStats(prev => ({ ...prev, gpa: currentGpa }));
      } catch (err) {
        console.error('Error computing current GPA:', err);
        setStats(prev => ({ ...prev, gpa: 0 }));
      }
    };
    fetchCurrentGpa();
  }, [user?.id]);

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
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center overflow-hidden ring-4 ring-white shadow-[0_10px_25px_-10px_rgba(0,0,0,0.5)]">
                  {profilePictureUrl ? (
                    <img 
                      src={profilePictureUrl} 
                      alt="Profile" 
                      className="dashboard-profile-picture w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={handleProfileImageError}
                      loading="lazy"
                    />
                  ) : (
                    <User className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300" />
                  )}
                </div>

                {/* Welcome Text */}
                <div className="flex-1 flex flex-col items-center text-center sm:items-start sm:text-left sm:block">
                  {/* Mobile: Stacked layout */}
                  <div className="block sm:hidden">
                    <h1 className="text-3xl font-black tracking-tighter text-gray-800">
                      Welcome back
                    </h1>
                    <h2 className="text-2xl font-light text-black mt-2">
                      {processedProfile.fullName}
                    </h2>
                  </div>
                  
                  {/* Desktop: Single line layout */}
                  <h1 className="hidden sm:block text-4xl sm:text-3xl md:text-4xl font-black tracking-tighter text-gray-800">
                    Welcome back, <span className="text-black font-light">{processedProfile.fullName}</span>
                  </h1>
                  <p className="mt-3 text-sm sm:text-base text-gray-700 max-w-2xl sm:text-left text-center">
                    Here's what's happening with your academic progress. Stay updated with your subjects, grades, and important notifications.
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
              onClick={() => navigate('/dashboard/course')}
              className="dashboard-stat-card group relative bg-white/90 rounded-xl p-2 xs:p-3 sm:p-4 border border-[#444] transition-all duration-300 min-h-[90px] cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-blue-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative flex flex-col sm:flex-row items-start justify-between h-full">
                <div className="flex flex-col min-w-0 flex-1">
                  <p className="text-sm xs:text-sm sm:text-base font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                    {stats.enrolledCourses}
                  </p>
                  <p className="text-[10px] xs:text-xs sm:text-xs font-medium text-gray-800 leading-tight whitespace-nowrap mt-auto group-hover:text-blue-600 transition-colors">Enrolled Subjects</p>
                </div>
                <div className="p-1 rounded-lg bg-[#2b2d2f] group-hover:bg-blue-100 transition-colors duration-300 flex-shrink-0 mt-1">
                  <BookOpen className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-blue-600 group-hover:text-blue-700 transition-colors" />
                </div>
              </div>
              <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              </div>
            </motion.div>

            {/* Current GPA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onClick={() => navigate('/dashboard/grades')}
              className="dashboard-stat-card group relative bg-white/90 rounded-xl p-2 xs:p-3 sm:p-4 border border-[#444] transition-all duration-300 min-h-[90px] cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-green-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative flex flex-col sm:flex-row items-start justify-between h-full">
                <div className="flex flex-col min-w-0 flex-1">
                  <p className="text-sm xs:text-sm sm:text-base font-bold text-gray-800 group-hover:text-green-700 transition-colors">
                    {stats.gpa > 0 ? stats.gpa.toFixed(2) : '--'}
                  </p>
                  <p className="text-[10px] xs:text-xs sm:text-xs font-medium text-gray-800 leading-tight whitespace-nowrap mt-auto group-hover:text-green-600 transition-colors">Current GPA</p>
                </div>
                <div className="p-1 rounded-lg bg-[#2b2d2f] group-hover:bg-green-100 transition-colors duration-300 flex-shrink-0 mt-1">
                  <TrendingUp className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-green-600 group-hover:text-green-700 transition-colors" />
                </div>
              </div>
              <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              </div>
            </motion.div>

            {/* Google Classroom Integration */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              onClick={() => navigate('/dashboard/google-classroom')}
              className="dashboard-stat-card group relative bg-white/90 rounded-xl p-2 xs:p-3 sm:p-4 border border-[#444] transition-all duration-300 cursor-pointer min-h-[90px] hover:shadow-lg hover:scale-[1.02] hover:border-purple-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative flex flex-col sm:flex-row items-start justify-between h-full">
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] xs:text-xs sm:text-xs font-bold text-gray-800 leading-tight whitespace-nowrap truncate max-w-[120px] group-hover:text-purple-700 transition-colors">
                      {googleClassroomStatus === 'checking' ? 'Checking...' : 
                       googleClassroomStatus === 'connected' ? 'Connected' : 'Not Connected'}
                    </p>
                    {googleClassroomStatus === 'connected' && (
                      <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                    {googleClassroomStatus === 'disconnected' && (
                      <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                    )}
                    {googleClassroomStatus === 'checking' && (
                      <div className="w-1 h-1 bg-yellow-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div className="mt-auto">
                    <p className="text-[10px] xs:text-xs sm:text-xs font-medium text-gray-800 leading-tight whitespace-nowrap group-hover:text-purple-600 transition-colors">Google Classroom</p>
                    <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-gray-600 leading-tight">
                      {googleClassroomStatus === 'connected' ? '' : 
                       googleClassroomStatus === 'checking' ? 'Verifying connection' : ''}
                    </p>
                  </div>
                </div>
                <div className="p-1 rounded-lg bg-[#2b2d2f] group-hover:bg-purple-100 transition-colors duration-300 flex-shrink-0 mt-1">
                  <ExternalLink className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-purple-600 group-hover:text-purple-700 transition-colors" />
                </div>
              </div>
              <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
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
                <div className="space-y-1.5">
                  {notifications.map((n) => {
                    const getSeverityInfo = (severity: string) => {
                      switch (severity) {
                        case 'announcement':
                          return { color: 'bg-blue-500', label: 'Announcement', icon: '📢', bgColor: 'bg-gradient-to-r from-blue-50 to-blue-100/50', borderColor: 'border-blue-200/60', textColor: 'text-blue-700' };
                        case 'reminder':
                          return { color: 'bg-amber-500', label: 'Reminder', icon: '⏰', bgColor: 'bg-gradient-to-r from-amber-50 to-amber-100/50', borderColor: 'border-amber-200/60', textColor: 'text-amber-700' };
                        case 'deadline':
                          return { color: 'bg-red-500', label: 'Deadline', icon: '⏳', bgColor: 'bg-gradient-to-r from-red-50 to-red-100/50', borderColor: 'border-red-200/60', textColor: 'text-red-700' };
                        case 'exam':
                          return { color: 'bg-purple-500', label: 'Exam', icon: '📝', bgColor: 'bg-gradient-to-r from-purple-50 to-purple-100/50', borderColor: 'border-purple-200/60', textColor: 'text-purple-700' };
                        case 'meeting':
                          return { color: 'bg-indigo-500', label: 'Meeting', icon: '🤝', bgColor: 'bg-gradient-to-r from-indigo-50 to-indigo-100/50', borderColor: 'border-indigo-200/60', textColor: 'text-indigo-700' };
                        case 'advisory':
                          return { color: 'bg-teal-500', label: 'Advisory', icon: '💡', bgColor: 'bg-gradient-to-r from-teal-50 to-teal-100/50', borderColor: 'border-teal-200/60', textColor: 'text-teal-700' };
                        case 'success':
                          return { color: 'bg-emerald-500', label: 'Success', icon: '✅', bgColor: 'bg-gradient-to-r from-emerald-50 to-emerald-100/50', borderColor: 'border-emerald-200/60', textColor: 'text-emerald-700' };
                        case 'warning':
                          return { color: 'bg-orange-500', label: 'Warning', icon: '⚠️', bgColor: 'bg-gradient-to-r from-orange-50 to-orange-100/50', borderColor: 'border-orange-200/60', textColor: 'text-orange-700' };
                        case 'error':
                          return { color: 'bg-red-500', label: 'Error', icon: '❌', bgColor: 'bg-gradient-to-r from-red-50 to-red-100/50', borderColor: 'border-red-200/60', textColor: 'text-red-700' };
                        case 'info':
                        default:
                          return { color: 'bg-sky-500', label: 'Information', icon: 'ℹ️', bgColor: 'bg-gradient-to-r from-sky-50 to-sky-100/50', borderColor: 'border-sky-200/60', textColor: 'text-sky-700' };
                      }
                    };
                    const severityInfo = getSeverityInfo(n.severity);
                    return (
                      <div key={n.id} className={`group relative overflow-hidden rounded-lg border ${severityInfo.bgColor} ${severityInfo.borderColor} hover:shadow-md hover:scale-[1.01] transition-all duration-200 ease-out backdrop-blur-sm`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        <div className="relative p-2">
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/80 shadow-sm border border-white/60">
                                <span className="text-xs">{severityInfo.icon}</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="inline-flex items-center gap-1">
                                <div className={`w-1 h-1 rounded-full ${severityInfo.color} shadow-sm`}></div>
                                <span className={`text-xs font-semibold uppercase tracking-wide ${severityInfo.textColor}`}>{severityInfo.label}</span>
                              </div>
                              {n.created_by && (
                                <div className="mt-0.5 text-[10px] text-gray-500 flex items-center gap-1 flex-wrap w-full max-w-full">
                                  <span className="opacity-70">by</span>
                                  <span className="font-medium text-gray-700 truncate max-w-[160px]" title={n.created_by_name || n.created_by}>
                                    {n.created_by_name || n.created_by.slice(0, 8) + '…'}
                                  </span>
                                </div>
                              )}
                              <h4 className="font-semibold text-gray-800 text-xs mb-0.5 leading-tight">{n.title}</h4>
                              <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">{n.message}</p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="text-xs text-gray-400 font-medium">
                                {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                              </div>
                              {n.expires_at && (
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  Expires in {(() => {
                                    const ms = new Date(n.expires_at!).getTime() - Date.now();
                                    if (ms <= 0) return '0m';
                                    const mins = Math.ceil(ms / 60000);
                                    if (mins < 60) return `${mins}m`;
                                    const hrs = Math.floor(mins / 60);
                                    const rem = mins % 60;
                                    return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
    hasCourseImage?: boolean;
    hasTeacherImage?: boolean;
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
            teacher:user_profiles(id, display_name, first_name, last_name, avatar_url)
          `)
          .in('subject_id', subjectIds)
          .eq('is_active', true);

        if (teacherError) throw teacherError;

        // Step 3: Merge the data
        const teacherAssignments = teacherAssignmentsRaw as unknown as Array<{ subject_id: string; teacher: any }>; // we will normalize below
        const enrollmentsWithTeacherData: Enrollment[] = enrollmentsData.map((enrollment) => {
          const teacherAssignment = teacherAssignments.find(
            (t) => t.subject_id === enrollment.subject_id
          );
          let teacher: Teacher | null = null;
          if (teacherAssignment) {
            const raw = Array.isArray(teacherAssignment.teacher)
              ? (teacherAssignment.teacher[0] || null)
              : teacherAssignment.teacher;
            if (raw) {
              const fullName = (
                (typeof raw.display_name === 'string' && raw.display_name.trim()) ||
                [raw.first_name, raw.last_name]
                  .map((p: unknown) => (typeof p === 'string' ? p.trim() : ''))
                  .filter(Boolean)
                  .join(' ')
                  .trim()
              ) as string | '';
              teacher = {
                id: raw.id,
                display_name: fullName || undefined,
                avatar_url: raw.avatar_url || undefined,
              };
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
