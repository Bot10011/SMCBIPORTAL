import React, { useEffect, useState } from 'react';
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
  const [stats, setStats] = useState({
    totalUnits: 0,
    activeCourses: 0
  });
  const [modalCourse, setModalCourse] = useState<Enrollment | null>(null);

  // Debug: log modalCourse state
  console.log('modalCourse:', modalCourse);

  // Calculate stats whenever enrollments change
  useEffect(() => {
    if (enrollments.length > 0) {
      const totalUnits = enrollments.reduce((sum, enrollment) => sum + enrollment.course.units, 0);
      setStats({
        totalUnits,
        activeCourses: enrollments.length
      });
    }
  }, [enrollments]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 p-4">
      {/* Header - Google Classroom style */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-lg border border-gray-200 shadow-sm"
      >
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-[#1a73e8] text-white">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-normal text-gray-900">My Courses</h2>
                <p className="text-sm text-gray-600 mt-1">View and manage your enrolled courses</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-[#1a73e8]" />
                  <span className="text-sm font-medium text-gray-700">{stats.activeCourses} Active Courses</span>
                </div>
              </div>
              <div className="px-4 py-2 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#1a73e8]" />
                  <span className="text-sm font-medium text-gray-700">{stats.totalUnits} Total Units</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Course Grid - Google Classroom style */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-100 rounded-lg" />
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
              {enrollments.map((enrollment) => (
                <motion.div
                  key={enrollment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  whileHover={{ y: -4 }}
                  className={`group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                    modalCourse?.id === enrollment.id ? "ring-2 ring-[#1a73e8]" : ""
                  }`}
                >
                  {/* Course Header */}
                  <div className="relative h-24">
                    {courseImages[enrollment.subject_id] ? (
                      <img
                        src={courseImages[enrollment.subject_id]}
                        alt={enrollment.course.name}
                        className="h-24 w-full object-cover"
                        style={{ borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}
                      />
                    ) : (
                      <div className="h-24 w-full bg-gradient-to-r from-[#1a73e8] to-[#4285f4]" style={{ borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }} />
                    )}
                    {/* Teacher avatar absolutely positioned in the bottom right, overlapping the image and card */}
                    {enrollment.teacher && (
                      <div className="absolute -bottom-8 right-4 z-20">
                        <div className="w-16 h-16 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center text-2xl font-bold text-[#1a73e8] select-none" style={{ boxShadow: "rgba(60, 64, 67, 0.1) 0px 2px 8px 0px" }}>
                          {(() => {
                            console.log('Teacher:', enrollment.teacher);
                            if (enrollment.teacher?.id && teacherImageUrls[enrollment.teacher.id]) {
                              console.log('Teacher image URL:', teacherImageUrls[enrollment.teacher.id]);
                              return (
                                <img
                                  src={teacherImageUrls[enrollment.teacher.id]}
                                  alt="Teacher"
                                  className="w-full h-full object-cover rounded-full"
                                  onError={() => {
                                    console.error('Failed to load teacher image:', teacherImageUrls[enrollment.teacher?.id || ''], enrollment.teacher);
                                  }}
                                />
                              );
                            }
                            return `${enrollment.teacher?.first_name?.charAt(0) || ''}${enrollment.teacher?.last_name?.charAt(0) || ''}`.toUpperCase();
                          })()}
                        </div>
                      </div>
                    )}
                    <div className="absolute top-0 left-0 w-full h-full flex justify-between items-start p-4">
                      <div className="bg-white rounded px-2 py-1" style={{ boxShadow: 'inset 0 1px 4px 0 rgba(0,0,0,0.10), inset 0 -1px 4px 0 rgba(0,0,0,0.10)' }}>
                        <h3 className="text-xl font-medium text-black drop-shadow">
                          {enrollment.course.code}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full drop-shadow bg-black/60 ${
                        enrollment.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : enrollment.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
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
                      onClick={() => setModalCourse(enrollment)}
                      className="w-full mt-2 px-4 py-2 text-sm font-medium text-[#1a73e8] bg-[#e8f0fe] rounded-lg hover:bg-[#d2e3fc] transition-colors duration-200 flex items-center justify-center gap-2"
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
      {modalCourse && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setModalCourse(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden"
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
                />
              ) : (
                <div className="h-24 w-full bg-gradient-to-r from-[#1a73e8] to-[#4285f4]" style={{ borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }} />
              )}
              <div className="absolute top-0 left-0 w-full h-full flex justify-between items-start p-6">
                <div className="bg-white rounded px-2 py-1" style={{ boxShadow: 'inset 0 1px 4px 0 rgba(0,0,0,0.10), inset 0 -1px 4px 0 rgba(0,0,0,0.10)' }}>
                  <h3 className="text-xl font-medium text-black drop-shadow">
                    {modalCourse.course.code}
                  </h3>
                </div>
                <button
                  onClick={() => setModalCourse(null)}
                  className="text-white/80 hover:text-white text-2xl font-bold bg-black/60 rounded px-2 py-1"
                  style={{ lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
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
                {modalCourse.teacher && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-[#1a73e8]" />
                    <span>Prof. {modalCourse.teacher.first_name} {modalCourse.teacher.last_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-[#1a73e8]" />
                  <span>Current Semester</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setModalCourse(null)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-[#1a73e8] rounded-lg hover:bg-[#1557b0] transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export { MyCourse }; 
