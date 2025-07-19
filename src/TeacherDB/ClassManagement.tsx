import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GradeInputModal } from './GradeInput';
import { Loader2, BookOpen, Users, ChevronDown, ChevronRight, Search, Calendar, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  units: number;
  year_level?: string;
}

interface TeacherClass {
  id: string;
  subject_id: string;
  section: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
  created_at: string;
  course: Course;
  year_level?: string;
}

interface Student {
  id: string;
  email: string;
  role: string;
  student_status?: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  is_active: boolean;
  enrollment_id: string;
  grade_id?: string;
  prelim_grade?: number;
  midterm_grade?: number;
  final_grade?: number;
  year_level?: string; // Added for new fields
  subject_id: string; // Ensure subject_id is present for grade matching
  semester?: string; // Added for grade operations
  academic_year?: string; // Added for grade operations
  student_id?: string; // Actual student ID from user_profiles table
}

interface DatabaseTeacherClass {
  id: string;
  subject_id: string;
  section: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
  created_at: string;
  course: Course | Course[];
}

interface EnrollmentRow {
  id: string;
  student_id: string;
  status: string;
  subject_id: string;
  enrollment_date: string;
  student: {
    id: string;
    email: string;
    role: string;
    student_status?: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    is_active: boolean;
    year_level?: string;
    student_id?: string;
  } | {
    id: string;
    email: string;
    role: string;
    student_status?: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    is_active: boolean;
    year_level?: string;
    student_id?: string;
  }[];
}

interface GradeRow {
  id: string;
  student_id: string;
  prelim_grade?: number;
  midterm_grade?: number;
  final_grade?: number;
}



// UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const ClassManagement: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // New state for improved organization
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYearLevel, setFilterYearLevel] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      void fetchClasses();
    }
  }, [user?.id]);

  async function fetchClasses() {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('teacher_subjects')
        .select(`
          id,
          subject_id,
          section,
          academic_year,
          semester,
          is_active,
          created_at,
          course:courses(id, code, name, units, year_level)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      // Transform the data to match TeacherClass type
      const transformedData = (data as DatabaseTeacherClass[] || []).map((item) => {
        const course = Array.isArray(item.course) ? item.course[0] : item.course;
        return {
          id: item.id,
          subject_id: item.subject_id,
          section: item.section,
          academic_year: item.academic_year,
          semester: item.semester,
          is_active: item.is_active,
          created_at: item.created_at,
          course: course,
          year_level: course?.year_level
        };
      }) as TeacherClass[];
      
      setClasses(transformedData);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudents(subjectId: string) {
    setLoading(true);
    console.group('🔍 Fetching Students Debug Info');
    console.log('📌 Input Parameters:', { subjectId });
    
    try {
      // 1. First verify the subject exists
      const { data: subjectData, error: subjectError } = await supabase
        .from('teacher_subjects')
        .select('id, subject_id, course:courses(id, code, name)')
        .eq('subject_id', subjectId)
        .single();

      console.log('📚 Subject Verification:', { 
        found: !!subjectData, 
        subjectData,
        error: subjectError?.message 
      });

      if (subjectError) {
        console.error('❌ Subject Error:', subjectError);
        throw new Error(`Failed to verify subject: ${subjectError.message}`);
      }

      if (!subjectData) {
        console.error('❌ Subject Not Found:', { subjectId });
        throw new Error('Subject not found in teacher_subjects table');
      }

      // 2. Check raw enrollments
      const { data: rawEnrollments, error: enrollError } = await supabase
        .from('enrollcourse')
        .select(`
          *,
          subject:courses(id, code, name)
        `)
        .eq('subject_id', subjectId);

      console.log('📊 Raw Enrollments Check:', {
        count: rawEnrollments?.length || 0,
        enrollments: rawEnrollments,
        error: enrollError?.message
      });

      if (enrollError) {
        console.error('❌ Enrollment Error:', enrollError);
        throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);
      }

      // 3. Get active enrollments with student details
      const { data, error } = await supabase
        .from('enrollcourse')
        .select(`
          id,
          student_id,
          status,
          subject_id,
          enrollment_date,
          student:user_profiles(
            id,
            email,
            role,
            student_status,
            first_name,
            last_name,
            middle_name,
            is_active,
            year_level,
            student_id
          )
        `)
        .eq('subject_id', subjectId)
        .eq('status', 'active');

      console.log('👥 Active Enrollments Query:', {
        count: data?.length || 0,
        data,
        error: error?.message
      });

      if (error) {
        console.error('❌ Active Enrollments Error:', error);
        throw new Error(`Failed to fetch active enrollments: ${error.message}`);
      }

      // 4. Fetch grades separately for all students
      const studentIds = (data as EnrollmentRow[] || []).map(row => {
        const student = Array.isArray(row.student) ? row.student[0] : row.student;
        return student?.id;
      }).filter(Boolean);

      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('id, student_id, prelim_grade, midterm_grade, final_grade')
        .in('student_id', studentIds);

      if (gradesError) {
        console.error('❌ Grades Error:', gradesError);
        throw new Error(`Failed to fetch grades: ${gradesError.message}`);
      }

      console.log('📊 Fetched grades:', grades);

      // 5. Transform and validate the data
      console.log('🔄 Starting data transformation');
      const enrolledStudents: Student[] = [];
      (data as EnrollmentRow[] || []).forEach((row) => {
        const student = Array.isArray(row.student) ? row.student[0] : row.student;
        if (!student || !student.is_active) return;
        
        // Find the grade for this student
        const gradeRow = grades?.find((g: GradeRow) => g.student_id === student.id) || null;
        
        console.log('row.subject_id:', row.subject_id);
        console.log('student.id:', student.id);
        console.log('gradeRow selected:', gradeRow);
        
        enrolledStudents.push({
          id: student.id,
          email: student.email,
          role: student.role,
          student_status: student.student_status,
          first_name: student.first_name,
          last_name: student.last_name,
          middle_name: student.middle_name,
          is_active: student.is_active,
          enrollment_id: row.id,
          grade_id: gradeRow?.id,
          prelim_grade: gradeRow?.prelim_grade,
          midterm_grade: gradeRow?.midterm_grade,
          final_grade: gradeRow?.final_grade,
          subject_id: row.subject_id,
          year_level: student.year_level,
          student_id: student.student_id,
        });
      });
      setStudents(enrolledStudents);

      console.log('📋 Final Results:', {
        totalEnrollments: rawEnrollments?.length || 0,
        activeEnrollments: data?.length || 0,
        validStudents: enrolledStudents.length,
        students: enrolledStudents
      });

      // 6. Show appropriate message based on the data
      if (enrolledStudents.length === 0) {
        if (!rawEnrollments?.length) {
          console.warn('⚠️ No enrollments found at all');
          toast('No students are enrolled in this class.', { icon: '⚠️' });
        } else if (rawEnrollments.every(e => e.status !== 'active')) {
          console.warn('⚠️ Enrollments exist but none are active');
          toast('Students are enrolled but none have active status.', { icon: '⚠️' });
        } else {
          console.warn('⚠️ No valid student profiles found');
          toast('No active students found in this class.', { icon: '⚠️' });
        }
      } else {
        console.log('✅ Successfully loaded students');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Fatal Error:', {
        message: errorMessage,
        error
      });
      toast.error(`Error: ${errorMessage}`);
      setStudents([]);
    } finally {
      console.groupEnd();
      setLoading(false);
    }
  }

  const handleOpenGradeModal = (student: Student) => {
    setSelectedStudent(student);
    setShowGradeModal(true);
  };

  const handleGradeSaved = () => {
    setShowGradeModal(false);
    if (selectedClass) fetchStudents(selectedClass.subject_id || selectedClass.id);
  };

  // Inline grade editing handler for multiple fields
  const handleGradeChange = (studentId: string, field: 'prelim_grade' | 'midterm_grade' | 'final_grade', value: string) => {
    setStudents(prev =>
      prev.map(s =>
        s.id === studentId ? { ...s, [field]: value === '' ? undefined : Number(value) } : s
      )
    );
  };

  const handleGradeSave = async (student: Student, field: 'prelim_grade' | 'midterm_grade' | 'final_grade', value: string) => {
    const gradeValue = value === '' ? null : Number(value);
    const { error } = await supabase
      .from('grades')
      .upsert([
        {
          id: student.grade_id,
          student_id: student.id,
          prelim_grade: field === 'prelim_grade' ? gradeValue : student.prelim_grade,
          midterm_grade: field === 'midterm_grade' ? gradeValue : student.midterm_grade,
          final_grade: field === 'final_grade' ? gradeValue : student.final_grade,
        }
      ], { onConflict: ['id'] });
    if (error) {
      toast.error('Failed to save grade');
    } else {
      toast.success('Grade saved!');
    }
  };

  // Save all grades for a student at once
  const handleSaveAllGrades = async (student: Student) => {
    const upsertData = {
      id: student.grade_id || uuidv4(),
      student_id: student.id, // Use the UUID from user_profiles
      subject_id: student.subject_id || (selectedClass?.subject_id ?? selectedClass?.id) || null, // Use student's subject_id or from class context
      graded_by: user?.id || null, // Use teacher's UUID from auth context
      prelim_grade: student.prelim_grade,
      midterm_grade: student.midterm_grade,
      final_grade: student.final_grade,
      year_level: student.year_level || 1, // Default to 1 if missing
      semester: student.semester || '1st', // Default to '1st' if missing
      academic_year: student.academic_year || '2023-2024', // Default to current AY if missing
    };
    console.log('Upserting grade:', upsertData);
    const { error } = await supabase
      .from('grades')
      .upsert([
        upsertData
      ], { onConflict: ['id'] });
    if (error) {
      console.error('Failed to save grades:', error);
      toast.error('Failed to save grades');
    } else {
      toast.success('Grades saved!');
      // Refresh the students data to show updated grades
      if (selectedClass?.subject_id) {
        fetchStudents(selectedClass.subject_id);
      }
    }
  };

  // Group classes by year level and semester
  const groupedClasses = classes.reduce((acc, cls) => {
    const yearLevel = cls.year_level || 'Unknown';
    const semester = cls.semester || 'Unknown';
    const key = `${yearLevel}-${semester}`;
    
    if (!acc[key]) {
      acc[key] = {
        yearLevel,
        semester,
        classes: []
      };
    }
    acc[key].classes.push(cls);
    return acc;
  }, {} as Record<string, { yearLevel: string; semester: string; classes: TeacherClass[] }>);

  // Filter classes based on search and filters
  const filteredGroupedClasses = Object.entries(groupedClasses).reduce((acc, [key, group]) => {
    const filteredClasses = group.classes.filter(cls => {
      const matchesSearch = searchTerm === '' || 
        cls.course?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.course?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.section.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesYearLevel = filterYearLevel === 'all' || cls.year_level === filterYearLevel;
      const matchesSemester = filterSemester === 'all' || cls.semester === filterSemester;
      
      return matchesSearch && matchesYearLevel && matchesSemester;
    });

    if (filteredClasses.length > 0) {
      acc[key] = { ...group, classes: filteredClasses };
    }
    
    return acc;
  }, {} as Record<string, { yearLevel: string; semester: string; classes: TeacherClass[] }>);

  // Get unique year levels and semesters for filters
  const yearLevels = [...new Set(classes.map(cls => cls.year_level).filter(Boolean))];
  const semesters = [...new Set(classes.map(cls => cls.semester).filter(Boolean))];

  // Toggle section expansion
  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Expand all sections
  const expandAll = () => {
    const allExpanded = Object.keys(filteredGroupedClasses).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedSections(allExpanded);
  };

  // Collapse all sections
  const collapseAll = () => {
    setExpandedSections({});
  };

  return (
    <div className="min-h-screen from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-8 max-w-full mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-2xl shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Class Management</h1>
                  <p className="text-white/80 text-sm font-medium">Manage your assigned classes and student grades</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-gray-700 font-medium">{classes.length} Classes Assigned</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Classes Panel - Improved Layout */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Assigned Classes
                </h2>
                <p className="text-blue-100 text-xs mt-1">Select a class to view students</p>
              </div>
              
              <div className="p-4">
                {classes.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium text-sm">No classes assigned</p>
                    <p className="text-gray-400 text-xs mt-1">Contact your administrator</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search and Filter Controls */}
                    <div className="space-y-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search classes..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      {/* Filters */}
                      <div className="space-y-2">
                        <select
                          value={filterYearLevel}
                          onChange={(e) => setFilterYearLevel(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="all">All Year Levels</option>
                          {yearLevels.map(level => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                        
                        <select
                          value={filterSemester}
                          onChange={(e) => setFilterSemester(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="all">All Semesters</option>
                          {semesters.map(sem => (
                            <option key={sem} value={sem}>{sem}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Expand/Collapse Controls */}
                      <div className="flex gap-2">
                        <button
                          onClick={expandAll}
                          className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          Expand All
                        </button>
                        <button
                          onClick={collapseAll}
                          className="flex-1 px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          Collapse All
                        </button>
                      </div>
                    </div>

                    {/* Class Groups */}
                    {Object.keys(filteredGroupedClasses).length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No classes match your filters</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(filteredGroupedClasses).map(([key, group]) => (
                          <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Section Header */}
                            <button
                              onClick={() => toggleSection(key)}
                              className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                            >
                              <div className="flex items-center gap-2">
                                {expandedSections[key] ? (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-500" />
                                )}
                                <div>
                                  <div className="font-medium text-sm text-gray-900">{group.yearLevel}</div>
                                  <div className="text-xs text-gray-500">{group.semester} Semester</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  {group.classes.length} class{group.classes.length !== 1 ? 'es' : ''}
                                </span>
                              </div>
                            </button>
                            
                            {/* Section Content */}
                            {expandedSections[key] && (
                              <div className="p-3 space-y-2 bg-white">
                                {group.classes.map((cls) => (
                                  <button
                                    key={cls.id}
                                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                      selectedClass?.id === cls.id 
                                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md' 
                                        : 'bg-gray-50 border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                                    }`}
                                    onClick={() => {
                                      setSelectedClass(cls);
                                      if (cls.subject_id) fetchStudents(cls.subject_id);
                                    }}
                                  >
                                    {/* Class Header */}
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                                          {cls.course?.name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                            {cls.course?.code}
                                          </span>
                                          <span className="text-xs text-gray-500">•</span>
                                          <span className="text-xs text-gray-600">{cls.course?.units} units</span>
                                        </div>
                                      </div>
                                      <div className={`w-3 h-3 rounded-full ${
                                        selectedClass?.id === cls.id ? 'bg-blue-500' : 'bg-gray-300'
                                      }`} />
                                    </div>
                                    
                                    {/* Class Details */}
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <GraduationCap className="w-3 h-3" />
                                        <span className="font-medium">Section:</span>
                                        <span className="bg-white px-2 py-0.5 rounded text-xs font-medium">{cls.section}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <Calendar className="w-3 h-3" />
                                        <span className="font-medium">Academic Year:</span>
                                        <span className="bg-white px-2 py-0.5 rounded text-xs">{cls.academic_year}</span>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Students Panel */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {selectedClass ? (
                <>
                  {/* Class Header */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">{selectedClass.course?.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-3 py-1 bg-white text-green-700 text-sm font-medium rounded-full shadow-sm">
                                {selectedClass.course?.code}
                              </span>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-600">{students.length} students enrolled</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Section:</span>
                            <span className="bg-white px-3 py-1 rounded-lg shadow-sm">{selectedClass.section}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Year Level:</span>
                            <span className="bg-white px-3 py-1 rounded-lg shadow-sm">{selectedClass.year_level || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Academic Year:</span>
                            <span className="bg-white px-3 py-1 rounded-lg shadow-sm">{selectedClass.academic_year}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Semester:</span>
                            <span className="bg-white px-3 py-1 rounded-lg shadow-sm">{selectedClass.semester}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Students Table */}
                  <div className="p-6">
                    {loading ? (
                      <div className="flex justify-center items-center py-16">
                        <div className="text-center">
                          <Loader2 className="animate-spin w-12 h-12 text-blue-500 mx-auto mb-4" />
                          <p className="text-gray-600 font-medium">Loading student data...</p>
                          <p className="text-gray-400 text-sm mt-1">Please wait while we fetch the student information</p>
                        </div>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Enrolled</h3>
                        <p className="text-gray-500">This class currently has no enrolled students.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Student
                              </th>
                              <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                                Email
                              </th>
                              <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Prelim
                              </th>
                              <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Midterm
                              </th>
                              <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Final
                              </th>
                              <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {students.map((student, idx) => (
                              <tr key={student.id} className={`transition-all duration-200 hover:bg-gray-50 ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              }`}>
                                <td className="px-3 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm mr-2 sm:mr-3 flex-shrink-0">
                                      {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-gray-900 truncate">
                                        {student.first_name} {student.last_name}
                                      </div>
                                      <div className="text-xs text-gray-500 hidden sm:block">
                                        ID: {student.student_id || student.id.slice(0, 8)}...
                                      </div>
                                      <div className="text-xs text-gray-500 sm:hidden">
                                        {student.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap hidden sm:table-cell">
                                  <div className="text-sm text-gray-900 truncate">{student.email}</div>
                                  <div className="text-xs text-gray-500">
                                    {student.student_status || 'Active'}
                                  </div>
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  <input
                                    type="number"
                                    className="w-14 sm:w-16 text-center border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    value={student.prelim_grade ?? ''}
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    onChange={e => handleGradeChange(student.id, 'prelim_grade', e.target.value)}
                                  />
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  <input
                                    type="number"
                                    className="w-14 sm:w-16 text-center border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    value={student.midterm_grade ?? ''}
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    onChange={e => handleGradeChange(student.id, 'midterm_grade', e.target.value)}
                                  />
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  <input
                                    type="number"
                                    className="w-14 sm:w-16 text-center border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    value={student.final_grade ?? ''}
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    onChange={e => handleGradeChange(student.id, 'final_grade', e.target.value)}
                                  />
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  <button
                                    onClick={() => handleOpenGradeModal(student)}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
                    <p className="text-gray-500">Choose a class from the left panel to view enrolled students</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <GradeInputModal
        open={showGradeModal}
        onClose={() => setShowGradeModal(false)}
        student={selectedStudent}
        classId={selectedClass?.subject_id || selectedClass?.id || ''}
        onGradeSaved={handleGradeSaved}
      />
    </div>
  );
};

export default ClassManagement; 
