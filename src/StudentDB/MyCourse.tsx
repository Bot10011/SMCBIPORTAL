import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, AlertCircle } from 'lucide-react';

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

export const MyCourse: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <BookOpen className="text-blue-500" /> My Courses
      </h2>
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse h-20 bg-gray-200 rounded-xl" />
          ))}
        </div>
      ) : (
        <AnimatePresence>
          {enrollments.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-10">
              <AlertCircle className="w-12 h-12 text-gray-400 animate-bounce mb-2" />
              <p className="text-lg text-gray-500 font-medium">No active course found.</p>
            </motion.div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment) => (
                <motion.div key={enrollment.id} whileHover={{ scale: 1.03 }} className="bg-white shadow-lg rounded-xl p-5 transition-all border border-gray-100">
                  <h3 className="text-xl font-semibold text-blue-700 mb-2">{enrollment.course.code}</h3>
                  <p className="text-gray-600">{enrollment.course.name}</p>
                  <div className="mt-2 text-sm text-gray-500">{enrollment.course.units} units</div>
                  {enrollment.teacher && (
                    <div className="mt-2 text-sm text-gray-700">
                      Teacher: {enrollment.teacher.first_name} {enrollment.teacher.last_name}
                    </div>
                  )}
                  <div className="mt-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {enrollment.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}; 
