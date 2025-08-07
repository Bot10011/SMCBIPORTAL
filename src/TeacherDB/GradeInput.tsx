import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Dialog } from '@headlessui/react';
import { Loader2, CheckCircle2, X, User, BookOpen, TrendingUp, Search, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  grade?: number;
}

interface GradeInputModalProps {
  open: boolean;
  onClose: () => void;
  student: Student;
  classId: string;
  onGradeSaved: (grade: number) => void;
}

const GradeInputModal: React.FC<GradeInputModalProps> = ({ open, onClose, student, classId, onGradeSaved }) => {
  const [grade, setGrade] = useState<number | ''>(student?.grade ?? '');
  const [loading, setLoading] = useState(false);

  if (!open || !student) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grade === '' || isNaN(Number(grade))) {
      toast.error('Please enter a valid grade.');
      return;
    }
    setLoading(true);
    // Update grade in enrollments table (replace with your logic)
    const { error } = await supabase
      .from('enrollments')
      .update({ grade: Number(grade) })
      .eq('student_id', student.id)
      .eq('subject_id', classId);
    setLoading(false);
    if (error) {
      toast.error('Failed to save grade: ' + error.message);
    } else {
      toast.success('Grade saved!');
      onGradeSaved(Number(grade));
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="fixed z-50 inset-0 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        transition={{ duration: 0.2 }} 
        className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 z-10 border border-gray-100"
      >
        <button 
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors" 
          onClick={onClose}
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <Dialog.Title className="text-xl font-bold mb-4 flex items-center gap-3 text-gray-800">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          Grade Input
        </Dialog.Title>
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-lg text-gray-800">{student.first_name} {student.last_name}</div>
              <div className="text-sm text-gray-500">{student.email}</div>
            </div>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Grade</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-lg font-medium"
              value={grade}
              onChange={e => setGrade(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Enter grade (0-100)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Enter a grade between 0 and 100</p>
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Save Grade
              </>
            )}
          </button>
        </form>
      </motion.div>
    </Dialog>
  );
};

interface Row {
  course_code: string;
  course_name: string;
  student_name: string;
  prelim_grade: number | null;
  midterm_grade: number | null;
  final_grade: number | null;
  remarks: string | null;
  enrollment_id: string;
  year_level: string | null;
  section: string | null;
  program: string;
  student_id: string | undefined;
}

const GradeInputTable: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGrades, setEditingGrades] = useState<{ [key: string]: { prelim?: string; midterm?: string; final?: string } }>({});
  const [savingGrades, setSavingGrades] = useState<{ [key: string]: boolean }>({});
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showAllStudents, setShowAllStudents] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 0. Fetch programs for mapping
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select('id, name');
        if (programsError) throw programsError;
        
        const programsMap: { [key: string]: string } = {};
        programsData?.forEach((program: { id: string; name: string }) => {
          programsMap[program.id] = program.name;
        });
        
        console.log('Programs map:', programsMap);

        // 1. Fetch assigned courses for the teacher
        const { data: teacherSubjects, error: teacherSubjectsError } = await supabase
          .from('teacher_subjects')
          .select('id, subject_id, course:courses(code, name)')
          .eq('teacher_id', user?.id);
        if (teacherSubjectsError) throw teacherSubjectsError;
        if (!teacherSubjects || teacherSubjects.length === 0) {
          setRows([]);
          return;
        }
        // 2. For each course, fetch enrolled students
        const subjectIds = teacherSubjects.map(ts => ts.subject_id);
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollcourse')
          .select('id, subject_id, student:user_profiles(id, first_name, last_name, year_level, section, program_id)')
          .in('subject_id', subjectIds)
          .eq('status', 'active');
        if (enrollmentsError) throw enrollmentsError;
        if (!enrollments || enrollments.length === 0) {
          setRows([]);
          return;
        }
        console.log('Fetched enrollments:', enrollments);
        
        // Debug: Check program_ids
        const programIds = enrollments.map(e => {
          const student = e.student as unknown as { id: string; first_name: string; last_name: string; year_level: string; section: string; program_id: string } | null;
          return Array.isArray(student) ? student[0]?.program_id : student?.program_id;
        }).filter(Boolean);
        console.log('Program IDs found:', programIds);
        
        // 3. For each enrollment, fetch grades
        const studentIds = enrollments.map(e => {
          const student = e.student as unknown as { id: string; first_name: string; last_name: string; year_level: string; section: string; program_id: string } | null;
          return Array.isArray(student) ? student[0]?.id : student?.id;
        }).filter(Boolean);
        const { data: grades, error: gradesError } = await supabase
          .from('grades')
          .select('id, student_id, prelim_grade, midterm_grade, final_grade, remarks')
          .in('student_id', studentIds);
        if (gradesError) throw gradesError;
        console.log('Fetched grades:', grades);
        // 4. Build table rows
        const rows: Row[] = enrollments.map(enrollment => {
          const teacherSubject = teacherSubjects.find(ts => ts.subject_id === enrollment.subject_id);
          const course = teacherSubject?.course as unknown as { code: string; name: string } | null;
          const student = enrollment.student as unknown as { id: string; first_name: string; last_name: string; year_level: string; section: string; program_id: string } | null;
          let studentId: string | undefined = undefined;
          if (Array.isArray(student)) {
            studentId = (student as { id: string }[])[0]?.id;
          } else if (student && typeof student === 'object' && typeof (student as { id?: unknown }).id === 'string') {
            studentId = (student as { id: string }).id;
          }
          const grade = grades.find(g => g.student_id === studentId);
          
          // Auto-calculate remarks if grades exist but no remarks
          if (grade && (grade.prelim_grade !== null || grade.midterm_grade !== null || grade.final_grade !== null) && !grade.remarks) {
            const calculatedRemarks = calculateRemarks(grade.prelim_grade ?? null, grade.midterm_grade ?? null, grade.final_grade ?? null);
            // Update remarks in database
            supabase
              .from('grades')
              .update({ remarks: calculatedRemarks })
              .eq('id', grade.id)
              .then(({ error }) => {
                if (error) console.error('Error auto-updating remarks:', error);
              });
          }
          
          return {
            course_code: course?.code || '',
            course_name: course?.name || '',
            student_name: student ? (Array.isArray(student) ? `${student[0]?.first_name} ${student[0]?.last_name}` : `${student.first_name} ${student.last_name}`) : '',
            prelim_grade: grade?.prelim_grade ?? null,
            midterm_grade: grade?.midterm_grade ?? null,
            final_grade: grade?.final_grade ?? null,
            remarks: grade?.remarks ?? null,
            enrollment_id: enrollment.id,
            year_level: Array.isArray(student) ? student[0]?.year_level : student?.year_level || null,
            section: Array.isArray(student) ? student[0]?.section : student?.section || null,
            program: (() => {
              const programId = Array.isArray(student) ? student[0]?.program_id : student?.program_id;
              if (!programId) return 'BSIT';
              const programName = programsMap[programId];
              return programName || `Program ID: ${programId}`;
            })(),
            student_id: studentId || '',
          };
        });
        setRows(rows);
        setFetchError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setRows([]);
        setFetchError(error instanceof Error ? error.message : String(error));
        toast.error('Error fetching student grades: ' + (error instanceof Error ? error.message : String(error)));
      }
    };
    fetchData();
  }, [user?.id]);

  // Filter rows based on search and filter
  const filteredRows = rows.filter(row => {
    const matchesSearch = row.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         row.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         row.course_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Group students by program, year level, and section
  const groupedStudents = filteredRows.reduce((groups, row) => {
    const key = `${row.program} - ${row.year_level || 'Unknown Year'} - ${row.section || 'Unknown Section'}`;
    if (!groups[key]) {
      groups[key] = {
        program: row.program,
        yearLevel: row.year_level || 'Unknown Year',
        section: row.section || 'Unknown Section',
        students: []
      };
    }
    groups[key].students.push(row);
    return groups;
  }, {} as { [key: string]: { program: string; yearLevel: string; section: string; students: Row[] } });

  // Sort groups by program, year level, and section
  const sortedGroups = Object.entries(groupedStudents).sort(([a], [b]) => a.localeCompare(b));

  // Calculate statistics
  const totalStudents = filteredRows.length;
  const completedGrades = filteredRows.filter(row => row.final_grade !== null).length;
  const completionRate = totalStudents > 0 ? Math.round((completedGrades / totalStudents) * 100) : 0;

  // Function to calculate remarks based on average grade
  const calculateRemarks = (prelimGrade: number | null, midtermGrade: number | null, finalGrade: number | null): string => {
    // Calculate average of available grades
    const grades = [prelimGrade, midtermGrade, finalGrade].filter(grade => grade !== null) as number[];
    
    if (grades.length === 0) return 'N/A';
    
    const average = grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
    
    if (average >= 75) return 'PASSED';
    return 'FAILED';
  };

  // Function to calculate average grade
  const calculateAverageGrade = (prelimGrade: number | null, midtermGrade: number | null, finalGrade: number | null): number | null => {
    const grades = [prelimGrade, midtermGrade, finalGrade].filter(grade => grade !== null) as number[];
    
    if (grades.length === 0) return null;
    
    return Math.round((grades.reduce((sum, grade) => sum + grade, 0) / grades.length) * 100) / 100;
  };

  // Function to start editing grades for a student
  const startEditingGrades = (enrollmentId: string) => {
    const row = rows.find(r => r.enrollment_id === enrollmentId);
    if (row) {
      setEditingGrades(prev => ({
        ...prev,
        [enrollmentId]: {
          prelim: row.prelim_grade?.toString() || '',
          midterm: row.midterm_grade?.toString() || '',
          final: row.final_grade?.toString() || ''
        }
      }));
    }
  };

  // Function to handle grade input changes
  const handleGradeChange = (enrollmentId: string, gradeType: 'prelim' | 'midterm' | 'final', value: string) => {
    setEditingGrades(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [gradeType]: value
      }
    }));
  };

  // Function to save grades for a student
  const saveGrades = async (enrollmentId: string) => {
    const editingData = editingGrades[enrollmentId];
    if (!editingData) return;

    setSavingGrades(prev => ({ ...prev, [enrollmentId]: true }));

    try {
      const prelimGrade = editingData.prelim ? parseFloat(editingData.prelim) : null;
      const midtermGrade = editingData.midterm ? parseFloat(editingData.midterm) : null;
      const finalGrade = editingData.final ? parseFloat(editingData.final) : null;

      // Validate grades
      if (prelimGrade !== null && (prelimGrade < 0 || prelimGrade > 100)) {
        toast.error('Prelim grade must be between 0 and 100');
        return;
      }
      if (midtermGrade !== null && (midtermGrade < 0 || midtermGrade > 100)) {
        toast.error('Midterm grade must be between 0 and 100');
        return;
      }
      if (finalGrade !== null && (finalGrade < 0 || finalGrade > 100)) {
        toast.error('Final grade must be between 0 and 100');
        return;
      }

      // Calculate new remarks based on average
      const calculatedRemarks = calculateRemarks(prelimGrade, midtermGrade, finalGrade);

      // Find the correct student_id (user ID) for this enrollment
      const row = rows.find(r => r.enrollment_id === enrollmentId);
      const studentId = row?.student_id;
      if (!studentId) {
        toast.error('Could not find student user ID for this enrollment.');
        setSavingGrades(prev => ({ ...prev, [enrollmentId]: false }));
        return;
      }
      // Update grades in database
      const { error } = await supabase
        .from('grades')
        .upsert({
          student_id: studentId,
          prelim_grade: prelimGrade,
          midterm_grade: midtermGrade,
          final_grade: finalGrade,
          remarks: calculatedRemarks,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving grades:', error);
        toast.error('Failed to save grades');
      } else {
        toast.success('Grades saved successfully!');
        // Update local state
        setRows(prev => prev.map(row => 
          row.enrollment_id === enrollmentId 
            ? { ...row, prelim_grade: prelimGrade, midterm_grade: midtermGrade, final_grade: finalGrade, remarks: calculatedRemarks }
            : row
        ));
        // Stop editing
        setEditingGrades(prev => {
          const newState = { ...prev };
          delete newState[enrollmentId];
          return newState;
        });
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades');
    } finally {
      setSavingGrades(prev => ({ ...prev, [enrollmentId]: false }));
    }
  };

  // Function to cancel editing
  const cancelEditing = (enrollmentId: string) => {
    setEditingGrades(prev => {
      const newState = { ...prev };
      delete newState[enrollmentId];
      
      return newState;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br  to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {fetchError && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200 font-semibold">
            Error loading student grades: {fetchError}
          </div>
        )}
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-2xl shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Grade Management</h1>
                  <p className="text-white/80 text-sm font-medium">Manage and input student grades for your assigned courses</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all">
                  <Download className="w-5 h-5 text-white" />
                </button>
                <button className="p-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all">
                  <RefreshCw className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

          {/* Search and Statistics Section */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Total Students Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 shadow-md border border-blue-100 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      Active
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold text-gray-900">{totalStudents}</p>
                    <span className="text-sm text-green-600 font-medium">+0%</span>
                  </div>
                  <p className="text-xs text-gray-500">Enrolled in your courses</p>
                </div>
              </div>

              {/* Completed Grades Card */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 shadow-md border border-green-100 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Updated
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Completed Grades</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold text-gray-900">{completedGrades}</p>
                    <span className="text-sm text-green-600 font-medium">
                      {totalStudents > 0 ? Math.round((completedGrades / totalStudents) * 100) : 0}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Grades submitted</p>
                </div>
              </div>

              {/* Completion Rate Card */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-3 shadow-md border border-purple-100 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                      completionRate >= 80 ? 'text-green-600 bg-green-100' : 
                      completionRate >= 60 ? 'text-yellow-600 bg-yellow-100' : 
                      'text-red-600 bg-red-100'
                    }`}>
                      {completionRate >= 80 ? 'Excellent' : 
                       completionRate >= 60 ? 'Good' : 'Needs Attention'}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold text-gray-900">{completionRate}%</p>
                    <div className="flex items-center gap-1">
                      {completionRate >= 80 ? (
                        <span className="text-sm text-green-600">↑</span>
                      ) : completionRate >= 60 ? (
                        <span className="text-sm text-yellow-600">→</span>
                      ) : (
                        <span className="text-sm text-red-600">↓</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all duration-500 ${
                        completionRate >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        completionRate >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">Progress indicator</p>
                </div>
              </div>
            </div>
          </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {showAllStudents ? (
              // Show group buttons
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Student Groups</h3>
                  <button
                    onClick={() => setShowAllStudents(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    View All Students
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedGroups.map(([groupKey, group]) => (
                    <button
                      key={groupKey}
                      onClick={() => {
                        setSelectedGroup(groupKey);
                        setShowAllStudents(false);
                      }}
                      className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-purple-100 transition-all duration-200 text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {group.program}
                        </h4>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {group.students.length} students
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">
                        Year {group.yearLevel} - Section {group.section}
                      </p>
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <span>Click to view students</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Show students table
              <div>
                {/* Back button and group info */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
                  <div>
                    <button
                      onClick={() => {
                        setShowAllStudents(true);
                        setSelectedGroup(null);
                      }}
                      className="flex items-center text-blue-100 hover:text-white transition-colors mb-2"
                    >
                      ← Back to Groups
                    </button>
                    {selectedGroup && (
                      <h3 className="text-lg font-semibold">
                        {selectedGroup}
                      </h3>
                    )}
                  </div>
                  <button
                    onClick={() => setShowAllStudents(true)}
                    className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
                  >
                    View All Groups
                  </button>
                </div>

                {/* Search Bar Container for Students */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex-1 max-w-md">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search students by name, course, or subject..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all bg-white shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Students table */}
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prelim
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Midterm
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Final
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GA
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(selectedGroup ? (groupedStudents[selectedGroup]?.students || []) : filteredRows).map((row, index) => (
                      <tr key={`${row.enrollment_id}-${index}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{row.student_name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{row.course_code}</div>
                          <div className="text-sm text-gray-500">{row.course_name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {editingGrades[row.enrollment_id] ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={editingGrades[row.enrollment_id].prelim || ''}
                              onChange={(e) => handleGradeChange(row.enrollment_id, 'prelim', e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              row.prelim_grade !== null ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {row.prelim_grade !== null ? row.prelim_grade : 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {editingGrades[row.enrollment_id] ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={editingGrades[row.enrollment_id].midterm || ''}
                              onChange={(e) => handleGradeChange(row.enrollment_id, 'midterm', e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              row.midterm_grade !== null ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {row.midterm_grade !== null ? row.midterm_grade : 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {editingGrades[row.enrollment_id] ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={editingGrades[row.enrollment_id].final || ''}
                              onChange={(e) => handleGradeChange(row.enrollment_id, 'final', e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              row.final_grade !== null ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {row.final_grade !== null ? row.final_grade : 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col items-start">
                            {(() => {
                              const averageGrade = calculateAverageGrade(row.prelim_grade, row.midterm_grade, row.final_grade);
                              return (
                                <div className="flex flex-col space-y-1">
                                  {averageGrade !== null ? (
                                    <span
                                      className={`text-sm font-semibold px-2 py-1 rounded-full ${
                                        averageGrade >= 75
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}
                                    >
                                      {averageGrade}
                                    </span>
                                  ) : (
                                    <span className="text-sm font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-800">N/A</span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          {editingGrades[row.enrollment_id] ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => saveGrades(row.enrollment_id)}
                                disabled={savingGrades[row.enrollment_id]}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                              >
                                {savingGrades[row.enrollment_id] ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => cancelEditing(row.enrollment_id)}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditingGrades(row.enrollment_id)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { GradeInputModal };
export default GradeInputTable; 
