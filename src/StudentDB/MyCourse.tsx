import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  AlertCircle, 
  GraduationCap, 
  Users, 
  ChevronRight,
  BookMarked,
  Calendar
} from 'lucide-react';
import ReactDOM from 'react-dom';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
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

interface MyCourseProps {
  enrollments: Enrollment[];
  courseImages: { [subjectId: string]: string };
  teacherImageUrls: { [teacherId: string]: string };
  loading: boolean;
}

const MyCourse: React.FC<MyCourseProps> = ({ enrollments, courseImages, teacherImageUrls, loading }) => {
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
      teacherImage: enrollment.teacher?.id ? teacherImageUrls[enrollment.teacher.id] : null,
      teacherInitials: enrollment.teacher 
        ? `${enrollment.teacher.first_name?.charAt(0) || ''}${enrollment.teacher.last_name?.charAt(0) || ''}`.toUpperCase()
        : '',
      statusColor: enrollment.status === 'active' 
        ? 'bg-green-100 text-green-800' 
        : enrollment.status === 'completed'
        ? 'bg-blue-100 text-blue-800'
        : 'bg-gray-100 text-gray-800'
    }));
  }, [enrollments, courseImages, teacherImageUrls]);

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
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-inner shadow-inner-strong border border-blue-100"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">My Subjects</h2>
                <p className="text-white/80 text-sm font-medium mt-1">View and manage your enrolled Subjects</p>
              </div>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0 ml-0 sm:ml-auto">
              <div className="px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-inner flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-[#1a73e8]" />
                <span className="text-sm font-medium text-gray-700">{stats.activeCourses} Active Subjects</span>
              </div>
              <div className="px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-inner flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#1a73e8]" />
                <span className="text-sm font-medium text-gray-700">{stats.totalUnits} Total Units</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Course Grid - Google Classroom style */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {processedEnrollments.map((enrollment) => (
                <motion.div
                  key={enrollment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  whileHover={{ y: -4 }}
                  className={`course-card group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                    modalCourse?.id === enrollment.id ? "ring-2 ring-[#1a73e8]" : ""
                  }`}
                >
                  {/* Course Header */}
                  <div className="relative h-24">
                    {enrollment.courseImage ? (
                      <img
                        src={enrollment.courseImage}
                        alt={enrollment.course.name}
                        className="course-image h-24 w-full object-cover"
                        style={{ borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}
                        loading="lazy"
                        width={400}
                        height={96}
                      />
                    ) : (
                      <div className="h-24 w-full bg-gradient-to-r from-[#1a73e8] to-[#4285f4]" style={{ borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }} />
                    )}
                    {/* Teacher avatar absolutely positioned in the bottom right, overlapping the image and card */}
                    {enrollment.teacher && (
                      <div className="absolute -bottom-8 right-4 z-20">
                        <div className="teacher-avatar w-16 h-16 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center text-2xl font-bold text-[#1a73e8] select-none" style={{ boxShadow: "rgba(60, 64, 67, 0.1) 0px 2px 8px 0px" }}>
                          {enrollment.teacherImage ? (
                            <img
                              src={enrollment.teacherImage}
                              alt="Teacher"
                              className="w-full h-full object-cover rounded-full"
                              loading="lazy"
                              width={64}
                              height={64}
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
                    <div className="absolute top-0 left-0 w-full h-full flex justify-between items-start p-4">
                      <div className="bg-white rounded px-2 py-1" style={{ boxShadow: 'inset 0 1px 4px 0 rgba(0,0,0,0.10), inset 0 -1px 4px 0 rgba(0,0,0,0.10)' }}>
                        <h3 className="text-xl font-medium text-black drop-shadow">
                          {enrollment.course.code}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full drop-shadow bg-black/60 ${enrollment.statusColor}`}>
                        {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Course Content */}
                  <div className="p-4">
                    <h4 className="text-base font-medium text-gray-900 mb-3 line-clamp-2">
                      {enrollment.course.name}
                    </h4>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <GraduationCap className="w-4 h-4 text-[#1a73e8]" />
                        <span>{enrollment.course.units} Units</span>
                      </div>
                      {enrollment.teacher && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4 text-[#1a73e8]" />
                          <span>Prof. {enrollment.teacher.first_name} {enrollment.teacher.last_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-[#1a73e8]" />
                        <span>Current Semester</span>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <button 
                      onClick={() => handleOpenModal(enrollment)}
                      className="course-button w-full mt-2 px-4 py-2 text-sm font-medium text-[#1a73e8] bg-[#e8f0fe] rounded-lg hover:bg-[#d2e3fc] transition-colors duration-200 flex items-center justify-center gap-2"
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
                  className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90 top-2 right-2 sm:top-3 sm:right-3"
                  aria-label="Close announcements"
                  style={{ backgroundColor: 'rgb(239, 68, 68)', boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px', zIndex: 50 }}
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
                    <span>Current Semester</span>
                  </div>
                </div>

                {/* Teacher Profile Section */}
                {modalCourse.teacher && (
                  <div className="pt-4 border-t border-gray-200">
                    <h5 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#1a73e8]" />
                      Subject Instructor
                    </h5>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      {/* Teacher Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 shadow-sm flex items-center justify-center text-xl font-bold text-[#1a73e8]">
                          {modalCourse.teacher?.id && teacherImageUrls[modalCourse.teacher.id] ? (
                            <img
                              src={teacherImageUrls[modalCourse.teacher.id]}
                              alt={`${modalCourse.teacher.first_name} ${modalCourse.teacher.last_name}`}
                              className="w-full h-full object-cover rounded-full"
                              loading="lazy"
                              width={64}
                              height={64}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            `${modalCourse.teacher?.first_name?.charAt(0) || ''}${modalCourse.teacher?.last_name?.charAt(0) || ''}`.toUpperCase()
                          )}
                        </div>
                      </div>
                      
                      {/* Teacher Info */}
                      <div className="flex-1 min-w-0">
                        <h6 className="text-lg font-semibold text-gray-900">
                          Prof. {modalCourse.teacher.first_name} {modalCourse.teacher.last_name}
                        </h6>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>Instructor</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            <span>Faculty</span>
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
