import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GradeSummary } from '../types/grades';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  BookOpen, 
  Users, 
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const YEAR_LABELS = [
  'First Year',
  'Second Year',
  'Third Year',
  'Fourth Year',
];

const YEAR_ICONS: Record<string, JSX.Element> = {
  'First Year': <BookOpen className="w-5 h-5 text-blue-500 mr-3" />,
  'Second Year': <BookOpen className="w-5 h-5 text-green-500 mr-3" />,
  'Third Year': <BookOpen className="w-5 h-5 text-yellow-500 mr-3" />,
  'Fourth Year': <BookOpen className="w-5 h-5 text-purple-500 mr-3" />,
};

const YEAR_COLORS: Record<string, string> = {
  'First Year': 'from-blue-500 to-blue-600',
  'Second Year': 'from-green-500 to-green-600',
  'Third Year': 'from-yellow-500 to-yellow-600',
  'Fourth Year': 'from-purple-500 to-purple-600',
};

export const StudentGradeViewer: React.FC = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'First Year': false,
    'Second Year': false,
    'Third Year': false,
    'Fourth Year': false,
  });

  useEffect(() => {
    const fetchGradesAndSubjects = async () => {
      try {
        setLoading(true);
        if (user?.id) {
          // 1. Get all enrollments for the user
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollcourse')
            .select(`id, subject_id, status, course:courses(code, name), student:user_profiles!enrollcourse_student_id_fkey(id, first_name, last_name, email)`)
            .eq('student_id', user.id)
            .eq('status', 'active');

          if (enrollmentsError) throw enrollmentsError;
          if (!enrollments || enrollments.length === 0) {
            setGrades([]);
            return;
          }

          // 2. Get all grades for those enrollments
          const enrollmentIds = enrollments.map(e => e.id);
          const { data: gradesData, error: gradesError } = await supabase
            .from('grades')
            .select('*')
            .in('student_id', enrollmentIds);

          if (gradesError) throw gradesError;

          // 3. Join with teacher info
          const subjectIds = enrollments.map(e => e.subject_id);
          const { data: teacherAssignmentsRaw } = await supabase
            .from('teacher_subjects')
            .select(`subject_id, year_level, teacher:user_profiles!teacher_subjects_teacher_id_fkey(first_name, last_name)`)
            .in('subject_id', subjectIds);
          const teacherAssignments = (teacherAssignmentsRaw || []) as { subject_id: string; year_level?: string; teacher: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] }[];

          // 4. Build GradeSummary[] for the table
          const gradesSummary = gradesData.map(grade => {
            const enrollment = enrollments.find(e => e.id === grade.student_id);
            if (!enrollment) return null;
            const course = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
            const teacherAssignment = teacherAssignments.find(t => t.subject_id === enrollment.subject_id);
            let teacherName: string | null = null;
            let yearLevel: string | null = null;
            if (teacherAssignment) {
              if (Array.isArray(teacherAssignment.teacher)) {
                const t = teacherAssignment.teacher[0];
                teacherName = t ? `${t.first_name} ${t.last_name}` : null;
              } else if (teacherAssignment.teacher) {
                teacherName = `${teacherAssignment.teacher.first_name} ${teacherAssignment.teacher.last_name}`;
              }
              yearLevel = teacherAssignment.year_level || null;
            }
            return {
              id: grade.id,
              student_id: user.id,
              student_name: '',
              subject_code: String(course?.code || ''),
              subject_name: String(course?.name || ''),
              teacher_name: teacherName !== undefined ? teacherName : null,
              prelim_grade: grade.prelim_grade ?? null,
              midterm_grade: grade.midterm_grade ?? null,
              final_grade: grade.final_grade ?? null,
              status: (grade.status ?? '') as GradeSummary['status'],
              remarks: grade.remarks ?? null,
              year_level: yearLevel,
            };
          }).filter((g): g is GradeSummary & { year_level?: string | null } => g !== null);
          setGrades(gradesSummary as any);
        }
      } catch (error) {
        console.error('Error fetching grades or enrolled subjects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGradesAndSubjects();
  }, [user?.id]);

  // Filter grades by search
  const filteredGrades = grades.filter(g =>
    g.subject_code.toLowerCase().includes(search.toLowerCase()) ||
    g.subject_name.toLowerCase().includes(search.toLowerCase())
  );

  // For now, all grades go to 'Unsorted'.
  const gradesByYear: { [key: string]: (GradeSummary & { year_level?: string | null })[] } = {
    'First Year': [],
    'Second Year': [],
    'Third Year': [],
    'Fourth Year': [],
  };
  filteredGrades.forEach(g => {
    switch (g.year_level) {
      case '1st Year':
        gradesByYear['First Year'].push(g);
        break;
      case '2nd Year':
        gradesByYear['Second Year'].push(g);
        break;
      case '3rd Year':
        gradesByYear['Third Year'].push(g);
        break;
      case '4th Year':
        gradesByYear['Fourth Year'].push(g);
        break;
    }
  });

  const toggleSection = (year: string) => {
    setOpenSections(prev => ({ ...prev, [year]: !prev[year] }));
  };

  // Calculate GPA for display
  const calculateGPA = (grades: GradeSummary[]) => {
    const validGrades = grades.filter(g => g.final_grade !== null && g.final_grade !== undefined);
    if (validGrades.length === 0) return null;
    
    const total = validGrades.reduce((sum, grade) => sum + (grade.final_grade || 0), 0);
    return (total / validGrades.length).toFixed(2);
  };

  const overallGPA = calculateGPA(grades);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-8 p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 p-4">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Academic Grades</h1>
                <p className="text-blue-100 text-sm">Track your academic performance</p>
              </div>
            </div>
            {overallGPA && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
                <div className="text-center">
                  <p className="text-blue-100 text-xs font-medium">Current GPA</p>
                  <p className="text-2xl font-bold text-white">{overallGPA}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Search and Stats Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm font-medium text-gray-700 transition-all duration-200"
            />
          </div>
          
          {/* Stats */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-md">
              <BookOpen className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">{grades.length} Subjects</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-md">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-xs font-medium text-green-700">
                {grades.filter(g => g.final_grade !== null).length} Graded
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Year Sections */}
      <AnimatePresence>
        {YEAR_LABELS.map((year, index) => (
          <motion.div 
            key={year} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              onClick={() => toggleSection(year)}
            >
              <div className="flex items-center">
                <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${YEAR_COLORS[year]} mr-3`} />
                <div className="flex items-center">
                  {YEAR_ICONS[year]}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{year} Grades</h2>
                    <p className="text-xs text-gray-500">{gradesByYear[year].length} subjects</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {openSections[year] ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>
            
            <AnimatePresence>
              {openSections[year] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-gray-200">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teacher</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Prelim</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Midterm</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Final</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">GA</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {gradesByYear[year].length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="p-2 rounded-full bg-gray-100">
                                    <BookOpen className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <p className="text-gray-500 text-sm font-medium">No grades found</p>
                                  <p className="text-xs text-gray-400">Grades will appear here once posted</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            gradesByYear[year].map((grade, gradeIndex) => (
                              <motion.tr 
                                key={grade.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: gradeIndex * 0.05 }}
                                className="hover:bg-blue-50 transition-colors duration-200 group"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></div>
                                    <span className="text-sm font-medium text-gray-900">{grade.subject_code}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-700">{grade.subject_name}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center">
                                    <Users className="w-3 h-3 text-gray-400 mr-1.5" />
                                    <span className="text-sm text-gray-600">{grade.teacher_name || 'TBA'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                    grade.prelim_grade !== null 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {grade.prelim_grade ?? 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                    grade.midterm_grade !== null 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {grade.midterm_grade ?? 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                    grade.final_grade !== null 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {grade.final_grade ?? 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800`}>
                                    {grade.prelim_grade !== undefined && grade.prelim_grade !== null &&
                                     grade.midterm_grade !== undefined && grade.midterm_grade !== null &&
                                     grade.final_grade !== undefined && grade.final_grade !== null
                                      ? ((Number(grade.prelim_grade) + Number(grade.midterm_grade) + Number(grade.final_grade)) / 3).toFixed(2)
                                      : 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
                                    ${grade.remarks === 'Passed' ? 'bg-green-100 text-green-700 border border-green-200' :
                                      grade.remarks === 'Failed' ? 'bg-red-100 text-red-700 border border-red-200' :
                                      grade.remarks === 'Incomplete' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                      'bg-gray-100 text-gray-600 border border-gray-200'}`}
                                  >
                                    {grade.remarks || 'Pending'}
                                  </span>
                                </td>
                              </motion.tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
