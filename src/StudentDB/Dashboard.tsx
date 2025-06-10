import React, { Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import { StudentGradeViewer } from './StudentGradeViewer';
import { MyCourse } from './MyCourse';
import { MyProfile } from './MyProfile';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  Bell,
  GraduationCap,
  Camera
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';

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
  const [isHovering, setIsHovering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleProfileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      setIsUploading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      // Use the same path structure as what's in the database
      const filePath = `profile-pictures/${user.id}/${fileName}`;

      console.log('Attempting to upload to path:', filePath);

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatar')
        .getPublicUrl(filePath);

      console.log('Upload successful, file path:', filePath);
      console.log('Generated public URL:', publicUrl);

      // Update user profile with the file path
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_picture_url: filePath })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update profile error:', updateError);
        throw updateError;
      }

      // Update local state with the public URL
      setProfilePictureUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
    }
  };

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

                // If we can download the file, get the public URL
                const { data: urlData } = supabase.storage
                  .from('avatar')
                  .getPublicUrl(data.profile_picture_url);

                const publicUrl = urlData.publicUrl;
                console.log('File exists and is accessible. Public URL:', publicUrl);

                // Create a blob URL from the downloaded file
                const blob = new Blob([fileData], { type: 'image/jpeg' });
                const blobUrl = URL.createObjectURL(blob);
                console.log('Created blob URL:', blobUrl);

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

  useEffect(() => {
    // TODO: Replace with actual API call for GPA
    setStats(prev => ({
      ...prev,
      gpa: 3.75
    }));
  }, []);

  const [recentAnnouncements] = useState([
    { id: 1, title: 'Midterm Schedule Released', date: '2 hours ago', type: 'academic' },
    { id: 2, title: 'Registration for Next Semester', date: '1 day ago', type: 'registration' },
    { id: 3, title: 'Campus Event: Tech Week', date: '2 days ago', type: 'event' }
  ]);

  return (
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
            <div 
              className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.8)] border-2 border-white/50 flex items-center justify-center overflow-hidden group cursor-pointer hover:shadow-[6px_6px_12px_rgba(0,0,0,0.15),-6px_-6px_12px_rgba(255,255,255,0.9)] transition-all duration-300"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isUploading}
              />
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
                    onLoad={(e) => {
                      const imgElement = e.target as HTMLImageElement;
                      console.log('Profile image loaded successfully:', {
                        width: imgElement.naturalWidth,
                        height: imgElement.naturalHeight,
                        src: imgElement.src
                      });
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
              
              {/* Upload Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br from-blue-600/90 to-purple-600/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 transition-all duration-300 ${isHovering ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                {isUploading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <>
                    <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm text-white font-medium px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                      {profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
                    </span>
                  </>
                )}
              </div>
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
          {recentAnnouncements.map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
              className="group p-5 sm:p-6 md:p-8 hover:bg-gray-200/50 transition-colors duration-200 border border-gray-200/50 mx-4 my-2 rounded-lg shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05),inset_-2px_-2px_4px_rgba(255,255,255,0.7)] hover:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.08),inset_-3px_-3px_6px_rgba(255,255,255,0.8)]"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors">
                    {announcement.title}
                  </h3>
                  <p className="text-sm text-gray-500">{announcement.date}</p>
                </div>
                <span className={`px-3 py-1.5 text-xs font-medium rounded-full self-start sm:self-auto transition-colors shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1),inset_-1px_-1px_2px_rgba(255,255,255,0.8)] border border-gray-200/50 ${
                  announcement.type === 'academic' 
                    ? 'bg-gray-200/80 text-blue-700 group-hover:bg-gray-300/80' 
                    : announcement.type === 'registration' 
                    ? 'bg-gray-200/80 text-green-700 group-hover:bg-gray-300/80' 
                    : 'bg-gray-200/80 text-purple-700 group-hover:bg-gray-300/80'
                }`}>
                  {announcement.type}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/course" element={<MyCourse />} />
            <Route path="/grades" element={<StudentGradeViewer />} />
            <Route path="/profile" element={<MyProfile />} />
            <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export { StudentDashboard as default }; 
