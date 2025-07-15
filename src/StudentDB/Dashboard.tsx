import React, { Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import { StudentGradeViewer } from './StudentGradeViewer';
import { MyCourse } from './MyCourse';
import { MyProfile } from './MyProfile';
import { CertificateOfEnrollment } from './CertificateOfEnrollment';
import Prospectus from './Prospectus';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  Bell,
  GraduationCap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Loading component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
  const [studentName, setStudentName] = useState<string>('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    gpa: 0
  });

  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (user?.id) {
        try {
          // Now fetch the full profile
          const { data, error } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, middle_name, profile_picture_url')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          if (data) {
            const fullName = [
              data.first_name,
              data.middle_name,
              data.last_name
            ].filter(Boolean).join(' ');
            setStudentName(fullName);
            
            if (data.profile_picture_url) {
              try {
                // First verify the file exists
                const { data: fileData, error: fileError } = await supabase.storage
                  .from('avatar')
                  .download(data.profile_picture_url);

                if (fileError) {
                  console.error('Error downloading file:', fileError);
                  setProfilePictureUrl(null);
                  return;
                }

                if (!fileData) {
                  console.error('No file data received');
                  setProfilePictureUrl(null);
                  return;
                }

                // Create a blob URL from the downloaded file
                const blob = new Blob([fileData], { type: 'image/jpeg' });
                const blobUrl = URL.createObjectURL(blob);
                setProfilePictureUrl(blobUrl);

                // Clean up the blob URL when component unmounts
                return () => {
                  URL.revokeObjectURL(blobUrl);
                };
              } catch (error) {
                console.error('Error handling profile picture:', error);
                setProfilePictureUrl(null);
              }
            } else {
              setProfilePictureUrl(null);
            }
          }
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
  }, [user?.id]);

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
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50 rounded-2xl -z-10"></div>
            <div className="p-6 sm:p-8 md:p-10">
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                {/* Profile Circle */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.8)] border-2 border-white/50 flex items-center justify-center overflow-hidden">
                  {profilePictureUrl ? (
                    <>
                      <img 
                        src={profilePictureUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
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
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-purple-50/20"></div>
                    </>
                  ) : studentName ? (
                    <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {user?.email?.[0].toUpperCase() || '?'}
                    </span>
                  )}
                </div>

                {/* Welcome Text */}
                <div className="flex-1 flex flex-col items-center text-center sm:items-start sm:text-left sm:block">
                  <h1 className="text-4xl sm:text-3xl md:text-4xl font-black tracking-tighter bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                    Welcome back
                  </h1>
                  <div className="mt-2 sm:mt-0 sm:inline-block">
                    <span className="inline-block px-3 py-1.5 sm:px-0 sm:py-0 sm:ml-2 bg-blue-50 rounded-lg sm:bg-transparent sm:rounded-none">
                      <span className="text-sm sm:text-2xl md:text-3xl font-bold tracking-wide bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                        {studentName || user?.email?.split('@')[0]}
                      </span>
                    </span>
                  </div>
                  <p className="mt-3 text-sm sm:text-base text-gray-600 max-w-2xl sm:text-left text-center">
                    Here's what's happening with your academic progress. Stay updated with your courses, grades, and important announcements.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
            {/* Enrolled Courses */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="group relative bg-gray-100/80 backdrop-blur-sm rounded-xl p-3 sm:p-6 md:p-8 border border-gray-200/50 transition-all duration-300 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.12),inset_-6px_-6px_12px_rgba(255,255,255,0.9)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Enrolled Courses</p>
                  <p className="text-xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                    {stats.enrolledCourses}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">Active courses</p>
                </div>
                <div className="p-2 sm:p-4 rounded-xl bg-gray-200/80 group-hover:bg-gray-300/80 transition-colors duration-300 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]">
                  <BookOpen className="w-5 h-5 sm:w-7 sm:h-7 text-blue-600" />
                </div>
              </div>
            </motion.div>

            {/* Current GPA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="group relative bg-gray-100/80 backdrop-blur-sm rounded-xl p-3 sm:p-6 md:p-8 border border-gray-200/50 transition-all duration-300 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.12),inset_-6px_-6px_12px_rgba(255,255,255,0.9)]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <div className="relative flex items-center justify-between">
                <div className="space-y-0.5 sm:space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Current GPA</p>
                  <p className="text-xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                    {stats.gpa.toFixed(2)}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">This semester</p>
                </div>
                <div className="p-2 sm:p-4 rounded-xl bg-gray-200/80 group-hover:bg-gray-300/80 transition-colors duration-300 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]">
                  <GraduationCap className="w-5 h-5 sm:w-7 sm:h-7 text-green-600" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Announcements */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gray-100/80 backdrop-blur-sm rounded-xl border border-gray-200/50 overflow-hidden shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)]"
          >
            <div className="p-5 sm:p-6 md:p-8 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-200/80 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
                Announcements
              </h2>
            </div>
            <div className="divide-y divide-gray-200/50">
              {loadingAnnouncements ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : announcements.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No announcements available.</div>
              ) : (
                announcements.map((announcement, index) => (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                    className="group flex flex-col sm:flex-row items-stretch gap-6 p-6 md:p-8 bg-white rounded-xl shadow-lg border border-gray-200 my-4 mx-2 sm:mx-4 hover:shadow-xl transition-all duration-200"
                  >
                    {/* Image section */}
                    {announcement.image && (
                      <div className="flex-shrink-0 flex items-center justify-center w-full sm:w-40 md:w-48 h-40 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 shadow-sm mb-4 sm:mb-0">
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
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors truncate">
                          {announcement.title}
                        </h3>
                        <p className="text-gray-600 text-sm md:text-base mb-3 whitespace-pre-line line-clamp-4">
                          {announcement.content}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 gap-2">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>By <span className="font-semibold text-gray-700">{announcement.author}</span></span>
                          <span className="hidden sm:inline">•</span>
                          <span>{new Date(announcement.created_at).toLocaleString()}</span>
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
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checkingDefault, setCheckingDefault] = useState(true);

  // Centralized data fetching for MyCourse
  const [enrollmentsWithTeacher, setEnrollmentsWithTeacher] = useState<Enrollment[]>([]);
  const [courseImages, setCourseImages] = useState<{ [subjectId: string]: string }>({});
  const [teacherImageUrls, setTeacherImageUrls] = useState<{ [teacherId: string]: string }>({});
  const [loadingMyCourse, setLoadingMyCourse] = useState(true);

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

  useEffect(() => {
    const checkDefaultPassword = async () => {
      if (!user) return;
      // Check if the user is still using the default password
      // We'll use a more reliable approach by checking if they're a new student
      // and if they haven't changed password yet
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('created_at, updated_at, role, password_changed')
          .eq('id', user.id)
          .single();
        
        if (!error && profile && profile.role === 'student') {
          // Only check for students
          const createdTime = new Date(profile.created_at);
          const now = new Date();
          const hoursSinceCreation = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
          
          // If user was created recently (within last 24 hours) and hasn't changed password yet,
          // they likely still have default password
          if (hoursSinceCreation < 24 && !profile.password_changed) {
            setShowChangePassModal(true);
          }
        }
      } catch {
        // Ignore errors
      } finally {
        setCheckingDefault(false);
      }
    };
    checkDefaultPassword();
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (checkingDefault) {
    return <div className="flex justify-center items-center h-64">Checking account security...</div>;
  }

  // Modal for changing default password
  if (showChangePassModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Change Your Default Password</h2>
          <p className="mb-4 text-gray-600">For your security, please set a new password before accessing your account.</p>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          <button
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            disabled={
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword ||
              newPassword === 'TempPass@123'
            }
            onClick={async () => {
              if (newPassword !== confirmPassword) {
                toast.error('Passwords do not match');
                return;
              }
              if (newPassword === 'TempPass@123') {
                toast.error('Please choose a password different from the default.');
                return;
              }
              try {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw error;
                
                // Update the user profile to mark password as changed
                if (user) {
                  const { error: profileError } = await supabase
                    .from('user_profiles')
                    .update({ 
                      password_changed: true,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
                  
                  if (profileError) {
                    console.error('Failed to update profile:', profileError);
                  }
                }
                
                toast.success('Password updated! Please log in again.');
                setShowChangePassModal(false);
                await supabase.auth.signOut();
                window.location.reload();
              } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to update password';
                toast.error(errorMessage);
              }
            }}
          >
            Change Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/course" element={
              <MyCourse
                enrollments={enrollmentsWithTeacher}
                courseImages={courseImages}
                teacherImageUrls={teacherImageUrls}
                loading={loadingMyCourse}
              />
            } />
            <Route path="/grades" element={<StudentGradeViewer />} />
            <Route path="/profile" element={<MyProfile />} />
            <Route path="/coe" element={<CertificateOfEnrollment />} />
            <Route path="/prospectus" element={<Prospectus />} />
            <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export { StudentDashboard as default }; 
