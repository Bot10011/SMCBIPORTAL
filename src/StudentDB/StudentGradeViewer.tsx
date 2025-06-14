import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { gradeService } from '../lib/services/gradeService';
import { GradeSummary } from '../types/grades';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const StudentGradeViewer: React.FC = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolledSubjects, setEnrolledSubjects] = useState<{ subject_code: string; subject_name: string; teacher_name: string | null }[]>([]);

  useEffect(() => {
    const fetchGradesAndSubjects = async () => {
      try {
        if (user?.id) {
          const data = await gradeService.getStudentGrades({ student_id: user.id });
          setGrades(data);
          if (!data || data.length === 0) {
            const { data: enrollmentsDataRaw, error: enrollmentsError } = await supabase
              .from('enrollcourse')
              .select(`
                id,
                course:courses(code, name),
                subject_id,
                status
              `)
              .eq('student_id', user.id)
              .eq('status', 'active');

            if (!enrollmentsError && enrollmentsDataRaw && enrollmentsDataRaw.length > 0) {
              type EnrollmentData = {
                id: string;
                course: { code: string; name: string } | { code: string; name: string }[];
                subject_id: string;
                status: string;
              };

              const enrollmentsData = enrollmentsDataRaw as EnrollmentData[];
              const subjectIds = enrollmentsData.map(e => e.subject_id);
              const { data: teacherAssignmentsRaw } = await supabase
                .from('teacher_subjects')
                .select(`
                  subject_id,
                  teacher:user_profiles(first_name, last_name)
                `)
                .in('subject_id', subjectIds);
              const teacherAssignments = (teacherAssignmentsRaw || []) as { subject_id: string; teacher: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] }[];
              const enrolledSubjectsList = enrollmentsData.map((enrollment) => {
                const teacherAssignment = teacherAssignments.find(
                  (t) => t.subject_id === enrollment.subject_id
                );
                let teacherName: string | null = null;
                if (teacherAssignment) {
                  if (Array.isArray(teacherAssignment.teacher)) {
                    const t = teacherAssignment.teacher[0];
                    teacherName = t ? `${t.first_name} ${t.last_name}` : null;
                  } else if (teacherAssignment.teacher) {
                    teacherName = `${teacherAssignment.teacher.first_name} ${teacherAssignment.teacher.last_name}`;
                  }
                }
                const course = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
                if (!course) {
                  console.warn(`No course data found for enrollment with subject_id: ${enrollment.subject_id}`);
                  return null;
                }
                return {
                  subject_code: course.code,
                  subject_name: course.name,
                  teacher_name: teacherName
                };
              }).filter((subject): subject is NonNullable<typeof subject> => subject !== null);
              setEnrolledSubjects(enrolledSubjectsList);
            } else {
              setEnrolledSubjects([]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching grades or enrolled subjects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGradesAndSubjects();
  }, [user?.id]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Grades Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="animate-pulse h-48 bg-gray-200 rounded-xl" />
          ))}
        </div>
      ) : (
        <AnimatePresence>
          {grades.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] border border-gray-100">
              <div className="p-4 rounded-full bg-gray-50 mb-4">
                <AlertCircle className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Grades Available</h3>
              <p className="text-gray-500 text-center max-w-md mb-6">
                You do not have any grades yet.
              </p>
              <div className="w-full max-w-4xl mx-auto mt-8">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">Subject</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Teacher</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/15">Prelim</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/15">Midterm</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/15">Final</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {enrolledSubjects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-gray-400">No subjects found.</td>
                      </tr>
                    ) : (
                      enrolledSubjects.map((subject) => (
                        <tr key={subject.subject_code}>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">{subject.subject_code}</td>
                          <td className="px-3 py-2 text-sm text-gray-700 truncate max-w-[200px]">{subject.subject_name}</td>
                          <td className="px-3 py-2 text-sm text-gray-600 truncate max-w-[150px]">{subject.teacher_name || 'TBA'}</td>
                          <td className="px-3 py-2 text-sm text-gray-600 text-center">-</td>
                          <td className="px-3 py-2 text-sm text-gray-600 text-center">-</td>
                          <td className="px-3 py-2 text-sm text-gray-600 text-center">-</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {grades.map((grade) => (
                <div
                  key={`${grade.student_id}-${grade.subject_code}`}
                  className="relative bg-white rounded-2xl shadow-xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50/40 to-blue-50/40 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-green-100/80 shadow-inner">
                      <GraduationCap className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{grade.subject_code}</h3>
                      <p className="text-gray-700 font-medium">{grade.subject_name}</p>
                      <p className="text-gray-500 text-sm">Teacher: {grade.teacher_name || 'TBA'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 font-semibold">Prelim</div>
                      <div className="text-lg font-bold text-gray-800">{grade.prelim_grade !== undefined ? grade.prelim_grade : '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 font-semibold">Midterm</div>
                      <div className="text-lg font-bold text-gray-800">{grade.midterm_grade !== undefined ? grade.midterm_grade : '-'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 font-semibold">Final</div>
                      <div className="text-lg font-bold text-gray-800">{grade.final_grade !== undefined ? grade.final_grade : '-'}</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {grade.remarks || 'No remarks'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};
