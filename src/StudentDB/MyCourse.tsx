import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
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
  first_name: string;
  last_name: string;
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
  };
  subject_id: string;
  status: 'active' | 'completed' | 'dropped';
  teacher?: Teacher | null;
}

const MyCourse: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUnits: 0,
    activeCourses: 0
  });

  useEffect(() => {
    const fetchEnrollmentsAndTeachers = async () => {
      try {
        if (user?.id) {
          // Step 1: Fetch enrollments with course info
          const { data: enrollmentsDataRaw, error: enrollmentsError } = await supabase
            .from('enrollcourse')
            .select(`
              id,
              course:courses(code, name, units),
              subject_id,
              status
            `)
            .eq('student_id', user.id)
            .eq('status', 'active');

          if (enrollmentsError) throw enrollmentsError;
          if (!enrollmentsDataRaw || enrollmentsDataRaw.length === 0) {
            setEnrollments([]);
            setLoading(false);
            return;
          }

          type EnrollmentData = {
            id: string;
            course: { code: string; name: string; units: number } | { code: string; name: string; units: number }[];
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
              teacher:user_profiles(first_name, last_name)
            `)
            .in('subject_id', subjectIds);

          if (teacherError) throw teacherError;

          // Step 3: Merge the data
          const teacherAssignments = teacherAssignmentsRaw as unknown as TeacherAssignment[];
          const enrollmentsWithTeacher: Enrollment[] = enrollmentsData.map((enrollment) => {
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

          setEnrollments(enrollmentsWithTeacher);
        }
      } catch (error) {
        console.error('Error fetching enrollments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollmentsAndTeachers();
  }, [user?.id]);

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
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50 rounded-2xl -z-10"></div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100/80 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                My Courses
              </h2>
              <p className="mt-2 text-gray-600">Track your academic progress and course information</p>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 bg-white rounded-xl shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] border border-gray-100">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{stats.activeCourses} Active Courses</span>
                </div>
              </div>
              <div className="px-4 py-2 bg-white rounded-xl shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] border border-gray-100">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">{stats.totalUnits} Total Units</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Course Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-gray-100 rounded-xl shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]" />
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
              className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] border border-gray-100"
            >
              <div className="p-4 rounded-full bg-gray-50 mb-4">
                <AlertCircle className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Courses</h3>
              <p className="text-gray-500 text-center max-w-md">
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
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="group relative bg-white rounded-xl p-6 transition-all duration-300 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.12),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] border border-gray-100"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  
                  {/* Course Code and Name */}
                  <div className="relative space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                        {enrollment.course.code}
                      </h3>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        {enrollment.status}
                      </span>
                    </div>
                    <p className="text-gray-700 font-medium line-clamp-2">{enrollment.course.name}</p>
                  </div>

                  {/* Course Details */}
                  <div className="relative mt-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <GraduationCap className="w-4 h-4 text-blue-500" />
                      <span>{enrollment.course.units} Units</span>
                    </div>
                    
                    {enrollment.teacher && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span>Prof. {enrollment.teacher.first_name} {enrollment.teacher.last_name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-green-500" />
                      <span>Current Semester</span>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="relative mt-6 pt-4 border-t border-gray-100">
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200">
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
    </div>
  );
};

export { MyCourse }; 
