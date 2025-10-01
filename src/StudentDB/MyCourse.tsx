import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  AlertCircle, 
  GraduationCap, 
  ChevronRight,
  BookMarked,
  Calendar
} from 'lucide-react';
import ReactDOM from 'react-dom';

interface Teacher {
  id: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  avatar_url?: string;
}

// Helper to format teacher full name with proper fallbacks
const formatTeacherName = (teacher?: Teacher | null): string => {
  if (!teacher) {
    console.warn('[MyCourse] Missing teacher object when formatting name');
    return 'TBA';
  }
  const displayName = teacher.display_name?.trim();
  if (displayName) return displayName;
  const parts = [teacher.first_name, teacher.middle_name, teacher.last_name]
    .map(part => (part || '').trim())
    .filter(part => part);
  if (parts.length === 0) {
    console.warn('[MyCourse] Teacher has no name fields:', teacher);
    return 'TBA';
  }
  return parts.join(' ');
};

// Helper to compute initials with same priority as name
const getTeacherInitials = (teacher?: Teacher | null): string => {
  if (!teacher) {
    console.warn('[MyCourse] Missing teacher object when computing initials');
    return '';
  }
  const displayName = teacher.display_name?.trim();
  if (displayName) {
    const tokens = displayName.split(/\s+/);
    const first = tokens[0]?.charAt(0) || '';
    const last = tokens.length > 1 ? tokens[tokens.length - 1].charAt(0) : '';
    return `${first}${last}`.toUpperCase();
  }
  const parts = [teacher.first_name, teacher.middle_name, teacher.last_name]
    .map(part => (part || '').trim())
    .filter(part => part);
  if (parts.length > 0) {
    const first = parts[0]?.charAt(0) || '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return `${first}${last}`.toUpperCase();
  }
  console.warn('[MyCourse] Teacher has no name fields for initials:', teacher);
  return '';
};

interface Enrollment {
  id: string;
  course: {
    code: string;
    name: string;
    units: number;
    image_url?: string;
    semester?: string;
  };
  subject_id: string;
  status: 'active' | 'completed' | 'dropped';
  teacher?: Teacher | null;
}

interface MyCourseProps {
  enrollments: Enrollment[];
  courseImages: { [subjectId: string]: string };
  loading: boolean;
}

const MyCourse: React.FC<MyCourseProps> = ({ enrollments, courseImages, loading }) => {
  const [modalCourse, setModalCourse] = useState<Enrollment | null>(null);

  // Memoize stats calculation
  const stats = useMemo(() => {
    if (enrollments.length === 0) return { totalUnits: 0, activeCourses: 0 };
    const totalUnits = enrollments.reduce((sum, enrollment) => sum + enrollment.course.units, 0);
    return { totalUnits, activeCourses: enrollments.length };
  }, [enrollments]);

  // Memoize processed enrollments for better performance
  const processedEnrollments = useMemo(() => {
    return enrollments.map(enrollment => ({
      ...enrollment,
      courseImage: courseImages[enrollment.subject_id],
      teacherImage: enrollment.teacher?.avatar_url || null,
      teacherInitials: getTeacherInitials(enrollment.teacher),
      statusColor: enrollment.status === 'active' 
        ? 'bg-green-100 text-green-800' 
        : enrollment.status === 'completed'
        ? 'bg-blue-100 text-blue-800'
        : 'bg-gray-100 text-gray-800'
    }));
  }, [enrollments, courseImages]);

  // Memoize handler
  const handleOpenModal = useCallback((enrollment: Enrollment) => setModalCourse(enrollment), []);
  const handleCloseModal = useCallback(() => setModalCourse(null), []);

  // Calculate stats whenever enrollments change
  useEffect(() => {
    if (enrollments.length > 0) {
       // setStats({ // This line is removed as per the edit hint
       //   totalUnits,
       //   activeCourses: enrollments.length
       // });
    }
    
  }, [enrollments]);

  // Prevent background scroll when modal is open
  React.useEffect(() => {
    if (modalCourse) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalCourse]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 p-4">
      {/* Premium Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl mb-12"
        style={{
          backgroundColor: '#00171f',
          boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.4), -8px -8px 16px rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease'
        }}
      >
        <div className="px-6 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div 
                className="p-3 rounded-2xl"
                style={{
                  backgroundColor: '#00171f',
                  boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.3), -4px -4px 8px rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.3s ease'
                }}
              >
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">My Subjects</h2>
                <p className="text-gray-300 text-sm font-medium mt-1">View and manage your enrolled Subjects</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3 mt-4 sm:mt-0 ml-0 sm:ml-auto w-full sm:w-auto">
              <div 
                className="w-full sm:w-auto px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2"
                style={{
                  backgroundColor: '#00171f',
                  boxShadow: '3px 3px 6px rgba(0, 0, 0, 0.3), -3px -3px 6px rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.3s ease'
                }}
              >
                <BookMarked className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                <span className="text-xs sm:text-sm font-medium text-gray-200">{stats.activeCourses} Active Subjects</span>
              </div>
              <div 
                className="w-full sm:w-auto px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2"
                style={{
                  backgroundColor: '#00171f',
                  boxShadow: '3px 3px 6px rgba(0, 0, 0, 0.3), -3px -3px 6px rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.3s ease'
                }}
              >
                <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                <span className="text-xs sm:text-sm font-medium text-gray-200">{stats.totalUnits} Total Units</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Course Grid - Google Classroom style */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3 items-stretch">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="course-skeleton-item bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {/* Course Header Skeleton */}
              <div className="relative h-24">
                <div className="h-24 w-full bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                       style={{ animation: 'shimmer 2s infinite' }} />
                </div>
                {/* Teacher avatar skeleton */}
                <div className="absolute -bottom-8 right-4 z-20">
                  <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white shadow-md animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                         style={{ animation: 'shimmer 2s infinite' }} />
                  </div>
                </div>
                {/* Course code skeleton */}
                <div className="absolute top-4 left-4">
                  <div className="bg-gray-200 rounded px-3 py-2 animate-pulse w-16 h-8"></div>
                </div>
                {/* Status skeleton */}
                <div className="absolute top-4 right-4">
                  <div className="bg-gray-200 rounded-full px-3 py-1 animate-pulse w-16 h-6"></div>
                </div>
              </div>
              
              {/* Course Content Skeleton */}
              <div className="p-4">
                <div className="h-5 bg-gray-200 rounded mb-3 animate-pulse w-3/4"></div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-28"></div>
                  </div>
                </div>
                {/* Button skeleton */}
                <div className="w-full h-10 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence>
          {enrollments.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg border border-gray-200"
            >
              <div className="p-4 rounded-full bg-gray-50 mb-4">
                <AlertCircle className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-2">No Active Courses</h3>
              <p className="text-gray-600 text-center max-w-md">
                You are not currently enrolled in any courses. Check back later for updates or contact your advisor.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-3 items-stretch">
              {processedEnrollments.map((enrollment) => (
                <motion.div
                  key={enrollment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`course-card group relative overflow-hidden h-full min-h-[180px] sm:min-h-[200px] flex flex-col ${
                    modalCourse?.id === enrollment.id ? "ring-2 ring-[#1a73e8]" : ""
                  }`}
                  style={{
                    backgroundColor: '#f0f0f0',
                    borderRadius: '16px',
                    boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.15), -8px -8px 16px rgba(255, 255, 255, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Course Header */}
                  <div className="relative h-16 sm:h-20">
                    {enrollment.courseImage ? (
                      <img
                        src={enrollment.courseImage}
                        alt={enrollment.course.name}
                        className="course-image h-16 sm:h-20 w-full object-cover"
                        style={{ borderTopLeftRadius: '0.375rem', borderTopRightRadius: '0.375rem' }}
                        loading="lazy"
                        width={400}
                        height={80}
                      />
                    ) : (
                      <div className="h-16 sm:h-20 w-full bg-gradient-to-r from-[#1a73e8] to-[#4285f4]" style={{ borderTopLeftRadius: '0.375rem', borderTopRightRadius: '0.375rem' }} />
                    )}
                    {/* Teacher avatar absolutely positioned in the bottom right, overlapping the image and card */}
                    {enrollment.teacher && (
                      <div className="absolute -bottom-5 right-2 sm:-bottom-6 sm:right-3 z-20">
                        <div className="teacher-avatar w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center text-lg sm:text-xl font-bold text-[#1a73e8] select-none" style={{ boxShadow: "rgba(60, 64, 67, 0.1) 0px 2px 8px 0px" }}>
                          {enrollment.teacherImage ? (
                            <img
                              src={enrollment.teacherImage}
                              alt="Teacher"
                              className="w-full h-full object-cover rounded-full"
                              loading="lazy"
                              width={40}
                              height={40}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            enrollment.teacherInitials
                          )}
                        </div>
                      </div>
                    )}
                    <div className="absolute top-0 left-0 w-full h-full flex justify-between items-start p-2.5 sm:p-3">
                      <div className="bg-white rounded px-1.5 py-0.5" style={{ boxShadow: 'inset 0 1px 4px 0 rgba(0,0,0,0.10), inset 0 -1px 4px 0 rgba(0,0,0,0.10)' }}>
                        <h3 className="text-xs sm:text-sm font-medium text-black drop-shadow">
                          {enrollment.course.code}
                        </h3>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded-full drop-shadow bg-black/60 ${enrollment.statusColor}`}>
                        {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Course Content */}
                  <div className="p-2.5 sm:p-3 flex flex-col flex-1">
                    <h4 className="text-[13px] sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2 line-clamp-2">
                      {enrollment.course.name}
                    </h4>
                    {/* Details removed from card view; available in modal */}
                    <div className="flex-1" />
                    {/* View Details Button */}
                    <button 
                      onClick={() => handleOpenModal(enrollment)}
                      className="course-button w-full mt-auto px-3 py-1.5 sm:py-2 text-sm font-medium text-white rounded-md transition-all duration-200 flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: '#2563eb',
                        boxShadow: '4px 4px 8px rgba(37, 99, 235, 0.3), -4px -4px 8px rgba(255, 255, 255, 0.5), inset 2px 2px 4px rgba(255, 255, 255, 0.2), inset -2px -2px 4px rgba(37, 99, 235, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Modal - Google Classroom style */}
      {modalCourse && ReactDOM.createPortal(
        (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="course-modal bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative h-24">
                {courseImages[modalCourse.subject_id] ? (
                  <img
                    src={courseImages[modalCourse.subject_id]}
                    alt={modalCourse.course.name}
                    className="h-24 w-full object-cover"
                    style={{ borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}
                    loading="lazy"
                    width={400}
                    height={96}
                  />
                ) : (
                  <div className="h-24 w-full bg-gradient-to-r from-[#1a73e8] to-[#4285f4]" style={{ borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }} />
                )}
                <div className="absolute top-0 left-0 w-full h-full flex justify-between items-start p-6 pointer-events-none">
                  <div className="bg-white rounded px-2 py-1 pointer-events-auto" style={{ boxShadow: 'inset 0 1px 4px 0 rgba(0,0,0,0.10), inset 0 -1px 4px 0 rgba(0,0,0,0.10)' }}>
                    <h3 className="text-xl font-medium text-black drop-shadow">
                      {modalCourse.course.code}
                    </h3>
                  </div>
                </div>
                {/* Custom Close Button */}
                <button
                  onClick={handleCloseModal}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 flex items-center justify-center text-white bg-red-500 hover:bg-red-600 rounded-full focus:outline-none"
                  aria-label="Close"
                  style={{ zIndex: 50 }}
                >
                  ×
                </button>
              </div>
              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <h4 className="text-lg font-medium text-gray-900">
                  {modalCourse.course.name}
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap className="w-4 h-4 text-[#1a73e8]" />
                    <span>{modalCourse.course.units} Units</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-[#1a73e8]" />
                    <span>{modalCourse.course?.semester || 'Current Semester'}</span>
                  </div>
                </div>

                {/* Teacher Profile Section */}
                {modalCourse.teacher && (
                  <div className="pt-4 border-t border-gray-200">
                   
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      {/* Teacher Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 shadow-sm flex items-center justify-center text-xl font-bold text-[#1a73e8]">
                          {modalCourse.teacher?.avatar_url ? (
                            <img
                              src={modalCourse.teacher.avatar_url}
                              alt={formatTeacherName(modalCourse.teacher)}
                              className="w-full h-full object-cover rounded-full"
                              loading="lazy"
                              width={64}
                              height={64}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            getTeacherInitials(modalCourse.teacher)
                          )}
                        </div>
                      </div>
                      
                      {/* Teacher Info */}
                      <div className="flex-1 min-w-0">
                        <h6 className="text-lg font-semibold text-gray-900">
                          Prof. {formatTeacherName(modalCourse.teacher)}
                        </h6>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>Instructor</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="pt-4 border-t border-gray-200">

                  <button
                    onClick={handleCloseModal}
                    className="course-button w-full px-4 py-2 text-sm font-medium text-white bg-[#1a73e8] rounded-lg hover:bg-[#1557b0] transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ),
        document.body
      )}
    </div>
  );
};

export default MyCourse; 
