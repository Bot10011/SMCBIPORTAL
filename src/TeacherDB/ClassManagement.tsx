import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, BookOpen, Users, ChevronDown, ChevronRight, Search, Download, Printer, CheckCircle2, TrendingUp, ShieldAlert, Pencil, Plus } from 'lucide-react';
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
  display_name?: string; // Display name from Google account
  avatar_url?: string; // Avatar URL from Google account
  can_edit_grades?: boolean; // per-grade approval
  hasPendingRequest?: boolean; // Check if request already exists
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
  section?: string; // Add section property
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
    profile_picture_url?: string;
    avatar_url?: string;
    display_name?: string;
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
    profile_picture_url?: string;
    avatar_url?: string;
    display_name?: string;
  }[];
}

interface GradeRow {
  id: string;
  student_id: string;
  subject_id: string;
  section?: string | null;
  prelim_grade?: number;
  midterm_grade?: number;
  final_grade?: number;
  edit_status?: 'pending' | 'granted' | 'denied' | null;
  edit_requested?: boolean;
}



// UUID v4 generator
// NOTE: uuidv4 utility removed as unused to satisfy linter.

const ClassManagement: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradeEditStatus, setGradeEditStatus] = useState<'granted' | 'pending' | 'denied' | 'unknown'>('unknown');
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectForm, setNewSubjectForm] = useState<{ subject_id: string; section: string; academic_year: string; semester: string }>({ subject_id: '', section: '', academic_year: '', semester: '' });
  const [availableCourses, setAvailableCourses] = useState<Array<{ id: string; code: string; name: string; units?: number; year_level?: string }>>([]);
  
  // New state for improved organization
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYearLevel, setFilterYearLevel] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');

  const fetchClasses = useCallback(async () => {
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
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      void fetchClasses();
    }
  }, [user?.id, fetchClasses]);

  // Fetch registrar approval status similar to Teacher Dashboard
  useEffect(() => {
    const fetchGradeEditStatus = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profile: any = data || {};
        const allowed = Boolean(
          profile?.can_edit_grades ??
          profile?.grade_edit_allowed ??
          (typeof profile?.grade_edit_status === 'string' && profile?.grade_edit_status.toLowerCase() === 'granted')
        );
        const denied = typeof profile?.grade_edit_status === 'string' && profile?.grade_edit_status.toLowerCase() === 'denied';
        const pending = Boolean(
          profile?.grade_edit_requested ??
          (typeof profile?.grade_edit_status === 'string' && profile?.grade_edit_status.toLowerCase() === 'pending')
        );
        if (allowed) setGradeEditStatus('granted');
        else if (denied) setGradeEditStatus('denied');
        else if (pending) setGradeEditStatus('pending');
        else setGradeEditStatus('unknown');
      } catch {
        setGradeEditStatus('unknown');
      }
    };
    void fetchGradeEditStatus();
  }, [user?.id]);

  // Fetch available subjects/courses for Add Subject form
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, code, name, units, year_level')
          .order('code', { ascending: true });
        if (error) throw error;
        setAvailableCourses((data as Array<{ id: string; code: string; name: string; units?: number; year_level?: string }>) || []);
      } catch (e) {
        console.error('Failed to load courses:', e);
        setAvailableCourses([]);
      }
    };
    void fetchCourses();
  }, []);

  const emptyToastShownRef = useRef<Record<string, boolean>>({});

  const fetchStudents = useCallback(async (subjectId: string, options?: { showEmptyToast?: boolean }) => {
    setLoading(true);
    console.group('🔍 Fetching Students Debug Info');
    console.log('📌 Input Parameters:', { subjectId });
    
    try {
      // 1. First verify the subject exists
      // Build a robust subject verification query that narrows to a single row
      let subjectQuery = supabase
        .from('teacher_subjects')
        .select('id, subject_id, teacher_id, section, academic_year, course:courses(id, code, name)')
        .eq('subject_id', subjectId);

      if (user?.id) {
        subjectQuery = subjectQuery.eq('teacher_id', user.id);
      }

      const { data: subjectData, error: subjectError } = await subjectQuery.maybeSingle();

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

      // 2. Check raw enrollments and their structure
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
        error: enrollError?.message,
        sampleEnrollment: rawEnrollments?.[0] ? {
          id: rawEnrollments[0].id,
          student_id: rawEnrollments[0].student_id,
          subject_id: rawEnrollments[0].subject_id,
          status: rawEnrollments[0].status,
          section: rawEnrollments[0].section,
          academic_year: rawEnrollments[0].academic_year,
          semester: rawEnrollments[0].semester,
          availableFields: Object.keys(rawEnrollments[0])
        } : null
      });

      if (enrollError) {
        console.error('❌ Enrollment Error:', enrollError);
        throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);
      }

      // 3. Get active enrollments with student details
      let enrollmentQuery = supabase
        .from('enrollcourse')
        .select(`
          id,
          student_id,
          status,
          subject_id,
          enrollment_date,
          section,
          semester,
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
            student_id,
            profile_picture_url,
            display_name,
            avatar_url,
            created_at,
            updated_at
          )
        `)
        .eq('subject_id', subjectId)
        .eq('status', 'active');

      // Add section filtering if we have a selected class with section info
      if (selectedClass?.section) {
        enrollmentQuery = enrollmentQuery.eq('section', selectedClass.section);
        console.log('🔍 Filtering enrollments by section:', selectedClass.section);
      }

      const { data, error } = await enrollmentQuery;

      console.log('👥 Active Enrollments Query:', {
        count: data?.length || 0,
        data,
        error: error?.message,
        expectedSection: selectedClass?.section || 'No section filter',
        expectedYearLevel: selectedClass?.year_level || 'No year level filter',
        enrollmentSections: data?.map(e => e.section) || [],
        enrollmentYearLevels: data?.map(e => {
          const student = Array.isArray(e.student) ? e.student[0] : e.student;
          return student?.year_level;
        }) || []
      });

      if (error) {
        console.error('❌ Active Enrollments Error:', error);
        throw new Error(`Failed to fetch active enrollments: ${error.message}`);
      }

      // Debug: Let's see what fields are actually available
      if (data && data.length > 0) {
        const firstStudent = Array.isArray(data[0].student) ? data[0].student[0] : data[0].student;
        console.log('🔍 Sample student data structure:', {
          studentKeys: Object.keys(firstStudent || {}),
          studentData: firstStudent,
          firstStudentType: typeof firstStudent,
          isArray: Array.isArray(data[0].student)
        });
        
        // Let's also check the raw data structure
        console.log('🔍 Raw enrollment data sample:', data[0]);
      }

      // 4. Fetch grades separately for all students
      const studentIds = (data as EnrollmentRow[] || []).map(row => {
        const student = Array.isArray(row.student) ? row.student[0] : row.student;
        return student?.id;
      }).filter(Boolean);

      // Build grades query with proper section filtering
      let gradesQuery = supabase
        .from('grades')
        .select('id, student_id, subject_id, section, prelim_grade, midterm_grade, final_grade, edit_status, edit_requested')
        .in('student_id', studentIds)
        .eq('subject_id', subjectId);

      // Add section filtering if available
      if (selectedClass?.section) {
        gradesQuery = gradesQuery.eq('section', selectedClass.section);
        console.log('🔍 Filtering grades by section:', selectedClass.section);
      }

      // Note: Year level filtering will be done after fetching grades since year_level is in user_profiles table

      const { data: grades, error: gradesError } = await gradesQuery;

      if (gradesError) {
        console.error('❌ Grades Error:', gradesError);
        throw new Error(`Failed to fetch grades: ${gradesError.message}`);
      }

      console.log('📊 Fetched grades:', {
        count: grades?.length || 0,
        grades,
        sectionFilter: selectedClass?.section || 'No section filter',
        yearLevelFilter: selectedClass?.year_level || 'No year level filter'
      });

      // Note: Removed Google OAuth helper functions since we're only using database fields for student names

      // 5. Transform and validate the data
      console.log('🔄 Starting data transformation');
      console.log('📊 Input data summary:', {
        totalEnrollments: data?.length || 0,
        studentIds: studentIds,
        studentIdCount: studentIds.length,
        gradesCount: grades?.length || 0
      });
      
      const enrolledStudents: Student[] = [];
      
      for (const row of (data as EnrollmentRow[] || [])) {
        const student = Array.isArray(row.student) ? row.student[0] : row.student;
        if (!student || !student.is_active) {
          console.log(`⏭️ Skipping inactive student:`, student?.id, student?.email);
          continue;
        }

        // Additional filtering to ensure we only show students from the correct section and year level
        if (selectedClass?.section) {
          // Check if enrollment has section data
          if (row.section && row.section !== selectedClass.section) {
            console.log(`⏭️ Skipping student from different section:`, {
              studentId: student.id,
              studentSection: row.section,
              expectedSection: selectedClass.section
            });
            continue;
          }
          
          // If no section in enrollment, try to get it from student profile
          if (!row.section) {
            console.log(`⚠️ No section data in enrollment for student ${student.id}, checking student profile...`);
            // For now, we'll include the student but log this for debugging
            console.log(`📝 Student ${student.id} has no section in enrollment data`);
          }
        }

        // Filter by year level if available
        if (selectedClass?.year_level) {
          const studentYearLevel = String(student.year_level || '');
          const expectedYearLevel = String(selectedClass.year_level || '');
          
          // Normalize year levels for comparison
          const normalizeYearLevel = (year: string | number) => {
            if (typeof year === 'number') return year.toString();
            const normalized = String(year).toLowerCase()
              .replace(/\s+/g, '')
              .replace('st', '')
              .replace('nd', '')
              .replace('rd', '')
              .replace('th', '')
              .replace('year', '');
            return normalized;
          };
          
          const normalizedStudentYear = normalizeYearLevel(studentYearLevel);
          const normalizedExpectedYear = normalizeYearLevel(expectedYearLevel);
          
          console.log(`🔍 Year level comparison:`, {
            studentId: student.id,
            studentYearLevel: studentYearLevel,
            expectedYearLevel: expectedYearLevel,
            normalizedStudentYear: normalizedStudentYear,
            normalizedExpectedYear: normalizedExpectedYear,
            match: normalizedStudentYear === normalizedExpectedYear
          });
          
          if (normalizedStudentYear !== normalizedExpectedYear) {
            console.log(`⏭️ Skipping student from different year level:`, {
              studentId: student.id,
              studentYearLevel: studentYearLevel,
              expectedYearLevel: expectedYearLevel,
              normalizedStudentYear: normalizedStudentYear,
              normalizedExpectedYear: normalizedExpectedYear
            });
            continue;
          }
        }
        
        console.log(`\n🚀 Processing student ${student.id}:`, {
          email: student.email,
          first_name: student.first_name,
          last_name: student.last_name,
          role: student.role,
          is_active: student.is_active,
          studentYearLevel: student.year_level,
          enrollmentSection: row.section,
          selectedClassSection: selectedClass?.section,
          selectedClassYearLevel: selectedClass?.year_level
        });
        
        // Find the grade for this student
        const gradeRow = grades?.find((g: GradeRow) => (
          g.student_id === student.id &&
          g.subject_id === row.subject_id &&
          (g.section ?? null) === (selectedClass?.section ?? null)
        )) || null;
        
        // Check if student already has a pending or granted request
        const hasExistingRequest = gradeRow && (
          gradeRow.edit_status === 'pending' || 
          gradeRow.edit_status === 'granted' || 
          gradeRow.edit_requested === true
        );
        
        const canEditThisStudent = (gradeRow?.edit_status || 'denied') === 'granted';
        const hasPendingRequest = gradeRow?.edit_status === 'pending' || gradeRow?.edit_requested === true;
        
        console.log(`📊 Grade data for ${student.id}:`, {
          hasGrade: !!gradeRow,
          prelim: gradeRow?.prelim_grade,
          midterm: gradeRow?.midterm_grade,
          final: gradeRow?.final_grade,
          edit_status: gradeRow?.edit_status,
          edit_requested: gradeRow?.edit_requested,
          can_edit: canEditThisStudent,
          hasExistingRequest,
          hasPendingRequest
        });
        
        console.log('Processing student:', student.id, student.email);
        
        // Get student display name with proper priority: display_name > first_name + middle_name + last_name > first_name + last_name > first_name > last_name > email
        let displayName = '';
        
        // Priority 1: Use display_name if available and not empty
        if (student.display_name && student.display_name.trim() !== '') {
          displayName = student.display_name.trim();
          console.log(`✅ [${student.id}] Using display_name:`, displayName);
        }
        // Priority 2: Combine first_name + middle_name + last_name
        else if (student.first_name || student.middle_name || student.last_name) {
          const nameParts = [
            student.first_name?.trim(),
            student.middle_name?.trim(),
            student.last_name?.trim()
          ].filter(Boolean);
          
          if (nameParts.length > 0) {
            displayName = nameParts.join(' ');
            console.log(`✅ [${student.id}] Using combined name parts:`, displayName);
          }
        }
        // Priority 3: Use email username as fallback
        else {
            displayName = student.email.split('@')[0];
          console.log(`✅ [${student.id}] Using email username fallback:`, displayName);
        }
        
        // For avatars, only use database fields (no Google OAuth for other users)
        const avatarUrl = student.avatar_url || student.profile_picture_url || '';
        
        console.log(`📋 [${student.id}] Student name resolution:`, {
          email: student.email,
          display_name: student.display_name,
          first_name: student.first_name,
          middle_name: student.middle_name,
          last_name: student.last_name,
          final_display_name: displayName,
          avatar_url: avatarUrl ? 'Available' : 'Not available'
        });
        
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
          display_name: displayName,
          avatar_url: avatarUrl,
          can_edit_grades: canEditThisStudent,
          hasPendingRequest: hasPendingRequest,
        });
      }
      
      // Final summary of all students
      console.log('\n🎯 FINAL SUMMARY - All Students Processed:', {
        totalStudents: enrolledStudents.length,
        withDisplayNames: enrolledStudents.filter(s => s.display_name && s.display_name !== `${s.first_name} ${s.last_name}`).length,
        withAvatars: enrolledStudents.filter(s => s.avatar_url).length,
        withCombinedNames: enrolledStudents.filter(s => s.display_name === `${s.first_name} ${s.last_name}`).length,
        withFallbackNames: enrolledStudents.filter(s => s.display_name === s.email.split('@')[0]).length,
        successRate: {
          names: `${Math.round((enrolledStudents.filter(s => s.display_name).length / enrolledStudents.length) * 100)}%`,
          avatars: `${Math.round((enrolledStudents.filter(s => s.avatar_url).length / enrolledStudents.length) * 100)}%`
        }
      });
      
      console.log('📋 Individual student results:', enrolledStudents.map(s => ({
        id: s.id,
        email: s.email,
        display_name: s.display_name,
        avatar_url: s.avatar_url ? '✅' : '❌',
        source: {
          name: s.display_name === `${s.first_name} ${s.last_name}` ? 'combined' : 
                 s.display_name === s.email.split('@')[0] ? 'fallback' : 'display_name',
          avatar: s.avatar_url ? 'database' : 'none'
        }
      })));
      
      // Final explanation of the implementation
      console.log('\n💡 STUDENT NAME RESOLUTION IMPLEMENTATION:');
      console.log('1. ✅ Primary: display_name field (if available and not empty)');
      console.log('2. ✅ Secondary: first_name + middle_name + last_name combination');
      console.log('3. ✅ Fallback: email username');
      console.log('4. ✅ Avatars: Only from database fields (avatar_url, profile_picture_url)');
      console.log('5. ✅ No Google OAuth calls for other users (security and performance)');
      
      setStudents(enrolledStudents);
      
      // Debug: Let's see what we actually set in the students state
      console.log('🎯 Final enrolledStudents array:', {
        count: enrolledStudents.length,
        students: enrolledStudents.map(s => ({
          id: s.id,
          display_name: s.display_name,
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email
        }))
      });

      // 6. Show appropriate message based on the data
      if (enrolledStudents.length === 0) {
        const shouldToast = options?.showEmptyToast === true && !emptyToastShownRef.current[subjectId];
        if (!rawEnrollments?.length) {
          console.warn('⚠️ No enrollments found at all');
          if (shouldToast) toast('No students are enrolled in this class.', { icon: '⚠️', id: `empty-${subjectId}` });
        } else if (rawEnrollments.every(e => e.status !== 'active')) {
          console.warn('⚠️ Enrollments exist but none are active');
          if (shouldToast) toast('Students are enrolled but none have active status.', { icon: '⚠️', id: `inactive-${subjectId}` });
        } else {
          console.warn('⚠️ No valid student profiles found');
          if (shouldToast) toast('No active students found in this class.', { icon: '⚠️', id: `noactive-${subjectId}` });
        }
        if (shouldToast) emptyToastShownRef.current[subjectId] = true;
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
  }, [user?.id, selectedClass?.section, selectedClass?.year_level]);

  // Handle URL parameters for direct navigation to specific student
  const autoSelectedForSubject = useRef<string | null>(null);

  useEffect(() => {
    const studentId = searchParams.get('studentId');
    const subjectId = searchParams.get('subjectId');
    
    if (classes.length > 0 && subjectId && autoSelectedForSubject.current !== subjectId) {
      // Find the class that matches the subjectId
      const targetClass = classes.find(c => c.subject_id === subjectId);
      if (targetClass) {
        // Set the selected class and load students
        setSelectedClass(targetClass);
        autoSelectedForSubject.current = subjectId;
        
        // If studentId is present, highlight it
        if (studentId) {
          toast.success(`Navigated to ${targetClass.course.name} - ${targetClass.section}`, {
            duration: 3000,
            id: `navigate-${studentId}-${subjectId}`
          });
          setSearchTerm(studentId);
        }
      }
    }
  }, [searchParams, classes, fetchStudents]);

  // Load students whenever selectedClass changes (avoids race with stale filters)
  useEffect(() => {
    if (selectedClass?.subject_id) {
      void fetchStudents(selectedClass.subject_id, { showEmptyToast: true });
    }
  }, [selectedClass, fetchStudents]);

  // Calculate GA (General Average) - only used variant below

  // Calculate GA only when all three grading periods have values
  const calculateGAWhenComplete = (
    prelimGrade: number | undefined,
    midtermGrade: number | undefined,
    finalGrade: number | undefined
  ): number | null => {
    if (
      prelimGrade === undefined || prelimGrade === null ||
      midtermGrade === undefined || midtermGrade === null ||
      finalGrade === undefined || finalGrade === null
    ) {
      return null;
    }
    return Math.round(((prelimGrade + midtermGrade + finalGrade) / 3) * 100) / 100;
  };

  // Calculate statistics for the current class
  const totalStudents = students.length;
  const completedGrades = students.filter(s => s.final_grade !== null && s.final_grade !== undefined).length;
  const completionRate = totalStudents > 0 ? Math.round((completedGrades / totalStudents) * 100) : 0;

  // State for inline editing
  const [editingGrades, setEditingGrades] = useState<{ [key: string]: { prelim?: string; midterm?: string; final?: string } }>({});
  const [savingGrades, setSavingGrades] = useState<{ [key: string]: boolean }>({});
  const [editingMode, setEditingMode] = useState<{ [key: string]: 'add' | 'edit' }>({});

  // Function to start editing grades for a student
  const startEditingGrades = (studentId: string, mode: 'add' | 'edit') => {
    // noop lookup reserved for future logic
    const student = students.find(s => s.id === studentId);
    const perRowGranted = student?.can_edit_grades === true;
    if (mode === 'edit' && !perRowGranted) {
      toast.error(
        'Editing locked for this student: Registrar approval required.'
      );
      return;
    }
    if (student) {
      setEditingGrades(prev => ({
        ...prev,
        [studentId]: {
          prelim: student.prelim_grade?.toString() || '',
          midterm: student.midterm_grade?.toString() || '',
          final: student.final_grade?.toString() || ''
        }
      }));
      setEditingMode(prev => ({ ...prev, [studentId]: mode }));
    }
  };

  // Function to handle grade input changes during editing
  const handleGradeChange = (studentId: string, gradeType: 'prelim' | 'midterm' | 'final', value: string) => {
    const student = students.find(s => s.id === studentId);
    const mode = editingMode[studentId] || 'add';
    if (mode === 'edit' && !student?.can_edit_grades) {
      return; // editing existing requires per-grade approval granted
    }
    // In add mode, prevent changing already existing period values
    if (mode === 'add') {
      const existingValue = gradeType === 'prelim' ? student?.prelim_grade
        : gradeType === 'midterm' ? student?.midterm_grade
        : student?.final_grade;
      if (existingValue != null) {
        toast.error('Cannot modify existing grade without Registrar approval.');
        return;
      }
    }
    // Enforce sequencing: must have prelim before midterm, and prelim+midterm before final
    const currentEdit = editingGrades[studentId] || {};
    const hasPrelim = (currentEdit.prelim && currentEdit.prelim !== '') || (student?.prelim_grade !== null && student?.prelim_grade !== undefined);
    const hasMidterm = (currentEdit.midterm && currentEdit.midterm !== '') || (student?.midterm_grade !== null && student?.midterm_grade !== undefined);

    if (gradeType === 'midterm' && !hasPrelim) {
      toast.error('Enter Prelim grade first before Midterm.');
      return;
    }
    if (gradeType === 'final' && (!hasPrelim || !hasMidterm)) {
      toast.error('Enter Prelim and Midterm grades before Final.');
      return;
    }

    setEditingGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [gradeType]: value
      }
    }));
  };

  // Function to save grades for a student
  const saveGrades = async (studentId: string) => {
    // existing student reference kept for sequencing checks below
    const mode = editingMode[studentId] || 'add';
    const student = students.find(s => s.id === studentId);
    if (mode === 'edit' && !student?.can_edit_grades) {
      toast.error('Cannot edit: Registrar approval for this student is required.');
      return;
    }
    const editingData = editingGrades[studentId];
    if (!editingData) return;

    setSavingGrades(prev => ({ ...prev, [studentId]: true }));

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

      // Enforce sequencing on save as well
      if (midtermGrade !== null && prelimGrade === null && students.find(s => s.id === studentId)?.prelim_grade == null) {
        toast.error('You must set Prelim before Midterm.');
        return;
      }
      if (finalGrade !== null) {
        const studentExisting = students.find(s => s.id === studentId);
        const prelimExists = prelimGrade !== null || (studentExisting?.prelim_grade != null);
        const midtermExists = midtermGrade !== null || (studentExisting?.midterm_grade != null);
        if (!prelimExists || !midtermExists) {
          toast.error('You must set Prelim and Midterm before Final.');
          return;
        }
      }
      // In add mode, block changes to already existing period values
      if (mode === 'add') {
        const studentExisting = students.find(s => s.id === studentId);
        if (
          (studentExisting?.prelim_grade != null && prelimGrade !== studentExisting.prelim_grade) ||
          (studentExisting?.midterm_grade != null && midtermGrade !== studentExisting.midterm_grade) ||
          (studentExisting?.final_grade != null && finalGrade !== studentExisting.final_grade)
        ) {
          toast.error('Cannot modify existing grades without Registrar approval.');
          return;
        }
      }

      // Find the student
      const student = students.find(s => s.id === studentId);
      if (!student) {
        toast.error('Student not found');
        setSavingGrades(prev => ({ ...prev, [studentId]: false }));
        return;
      }

      // Normalize year level to numeric (1..4) based on the student's current year level
      const normalizeYearLevelToNumber = (value?: string): number | null => {
        if (!value) return null;
        const s = String(value).toLowerCase();
        if (s.includes('1')) return 1;
        if (s.includes('2')) return 2;
        if (s.includes('3')) return 3;
        if (s.includes('4')) return 4;
        const n = parseInt(s, 10);
        return [1, 2, 3, 4].includes(n) ? n : null;
      };
      const resolvedYearNumber = normalizeYearLevelToNumber((student.year_level as string) || (selectedClass?.year_level as string));

      // Avoid duplicate grade rows: find existing record for (student, subject, section)
      const key = {
        student_id: student.id,
        subject_id: selectedClass?.subject_id || null,
        section: selectedClass?.section || null,
      };

      const { data: existingGrade, error: findErr } = await supabase
        .from('grades')
        .select('id, graded_by')
        .eq('student_id', key.student_id)
        .eq('subject_id', key.subject_id)
        .eq('section', key.section)
        .maybeSingle();

      if (findErr && findErr.code !== 'PGRST116') {
        // PGRST116 is no rows when using single; ignore
        throw findErr;
      }

      let error: unknown = null;
      if (existingGrade && existingGrade.id) {
        // Update existing row: keep graded_by/metadata untouched
        const { error: updateErr } = await supabase
          .from('grades')
          .update({
            prelim_grade: prelimGrade,
            midterm_grade: midtermGrade,
            final_grade: finalGrade,
            year_level: resolvedYearNumber, // ensure correct year level is stored
            academic_year: selectedClass?.academic_year || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingGrade.id);
        error = updateErr;
      } else {
        // Insert new row on first grading; set graded_by/context once
        const { error: insertErr } = await supabase
          .from('grades')
          .insert({
            student_id: key.student_id,
            subject_id: key.subject_id,
            section: key.section,
            graded_by: user?.id || null,
            prelim_grade: prelimGrade,
            midterm_grade: midtermGrade,
            final_grade: finalGrade,
            year_level: resolvedYearNumber, // ensure correct year level is stored
            academic_year: selectedClass?.academic_year || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        error = insertErr;
      }

      if (error) {
        console.error('Error saving grades:', error);
        toast.error('Failed to save grades');
      } else {
        toast.success('Grades saved successfully!');
        // Update local state
        setStudents(prev => prev.map(s => 
          s.id === studentId 
            ? { ...s, prelim_grade: prelimGrade || undefined, midterm_grade: midtermGrade || undefined, final_grade: finalGrade || undefined }
            : s
        ));
        // If this was an edit with granted approval, immediately revert approval to denied (one-time use)
        if (mode === 'edit') {
          try {
            const { data: gradeAfterSave } = await supabase
              .from('grades')
              .select('id')
              .eq('student_id', key.student_id)
              .eq('subject_id', key.subject_id)
              .eq('section', key.section)
              .maybeSingle();
            const gradeIdToLock = gradeAfterSave?.id as string | undefined;
            if (gradeIdToLock) {
              await supabase
                .from('grades')
                .update({ edit_status: 'denied', edit_requested: false, edit_window_expires_at: null })
                .eq('id', gradeIdToLock);
              // Reflect lock in UI
              setStudents(prev => prev.map(s => s.id === studentId ? { ...s, can_edit_grades: false } : s));
            }
          } catch (lockErr) {
            console.warn('Warning: could not revert edit approval state:', lockErr);
          }
        }
        // Stop editing
        setEditingGrades(prev => {
          const newState = { ...prev };
          delete newState[studentId];
          return newState;
        });
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades');
    } finally {
      setSavingGrades(prev => ({ ...prev, [studentId]: false }));
    }
  };

  // Function to cancel editing
  const cancelEditing = (studentId: string) => {
    setEditingGrades(prev => {
      const newState = { ...prev };
      delete newState[studentId];
      return newState;
    });
  };

  // Group classes by year level and section
  const groupedClasses = classes.reduce((acc, cls) => {
    const yearLevel = cls.year_level || 'Unknown';
    const section = cls.section || 'Unknown';
    const key = `${yearLevel}-${section}`;
    
    if (!acc[key]) {
      acc[key] = {
        yearLevel,
        section,
        classes: []
      };
    }
    acc[key].classes.push(cls);
    return acc;
  }, {} as Record<string, { yearLevel: string; section: string; classes: TeacherClass[] }>);

  // Resolve instructor name from current user metadata/email
  const instructorName = (
    (user as unknown as { user_metadata?: Record<string, unknown>; email?: string })?.user_metadata?.full_name as string
  ) || (
    (user as unknown as { user_metadata?: Record<string, unknown> })?.user_metadata?.name as string
  ) || (
    (user as unknown as { user_metadata?: Record<string, unknown> })?.user_metadata?.display_name as string
  ) || user?.email || 'Instructor';

  // Filter classes based on search and filters
  const filteredGroupedClasses = Object.entries(groupedClasses).reduce((acc, [key, group]) => {
    const filteredClasses = group.classes.filter(cls => {
      const matchesSearch = searchTerm === '' || 
        cls.course?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.course?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.section.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesYearLevel = filterYearLevel === 'all' || cls.year_level === filterYearLevel;
      const matchesSection = filterSemester === 'all' || cls.section === filterSemester;
      
      return matchesSearch && matchesYearLevel && matchesSection;
    });

    if (filteredClasses.length > 0) {
      acc[key] = { ...group, classes: filteredClasses };
    }
    
    return acc;
  }, {} as Record<string, { yearLevel: string; section: string; classes: TeacherClass[] }>);

  // Get unique year levels and sections for filters
  const yearLevels = [...new Set(classes.map(cls => cls.year_level).filter(Boolean))];
  const sections = [...new Set(classes.map(cls => cls.section).filter(Boolean))];

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

  // Handle adding a new subject assignment for the instructor
  const handleAddSubject = async () => {
    if (!user?.id) return;
    const { subject_id, section, academic_year, semester } = newSubjectForm;
    if (!subject_id || !section || !academic_year || !semester) {
      toast.error('Please fill in all fields');
      return;
    }
    setAddingSubject(true);
    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .insert({
          teacher_id: user.id,
          subject_id,
          section,
          academic_year,
          semester,
          is_active: true
        });
      if (error) throw error;
      toast.success('Subject added');
      setShowAddSubject(false);
      setNewSubjectForm({ subject_id: '', section: '', academic_year: '', semester: '' });
      await fetchClasses();
    } catch (e) {
      console.error('Add subject failed:', e);
      toast.error('Failed to add subject');
    } finally {
      setAddingSubject(false);
    }
  };

  // Request registrar approval to edit grades for a specific student
  const requestRegistrarApprovalForStudent = async (student: Student) => {
    if (!user?.id || !selectedClass) return;
    try {
      const reason = window.prompt('Please enter a reason for editing this student\'s grades:');
      if (reason === null) return; // user cancelled
      const trimmed = reason?.trim();
      if (!trimmed) {
        toast.error('Reason is required');
        return;
      }

      // Ensure a grade row exists for this student + class context
      const key = {
        student_id: student.id,
        subject_id: selectedClass.subject_id,
        section: selectedClass.section || null,
      };

      const { data: existing, error: findErr } = await supabase
        .from('grades')
        .select('id')
        .eq('student_id', key.student_id)
        .eq('subject_id', key.subject_id)
        .eq('section', key.section)
        .maybeSingle();
      if (findErr && findErr.code !== 'PGRST116') throw findErr;

      let gradeId = existing?.id as string | undefined;
      if (!gradeId) {
        const { data: inserted, error: insertErr } = await supabase
          .from('grades')
          .insert({
            ...key,
            graded_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .maybeSingle();
        if (insertErr) throw insertErr;
        gradeId = inserted?.id as string;
      }

      // Resolve instructor full name similar to Settings.tsx logic (no email fallback)
      let instructorDisplayName = '';
      try {
        const { data: instructorProfile } = await supabase
          .from('user_profiles')
          .select('display_name, first_name, middle_name, last_name, username, email')
          .eq('id', user.id)
          .maybeSingle();
        const dbDisplay = (instructorProfile?.display_name || '').trim();
        if (dbDisplay) {
          instructorDisplayName = dbDisplay;
        } else {
          const parts = [
            (instructorProfile?.first_name || '').trim(),
            (instructorProfile?.middle_name || '').trim(),
            (instructorProfile?.last_name || '').trim()
          ].filter(Boolean);
          const joined = parts.join(' ').trim();
          instructorDisplayName = joined || (instructorProfile?.username || '');
        }
        // Fallback to auth metadata if still empty
        if (!instructorDisplayName) {
          const { data: authUserData } = await supabase.auth.getUser();
          const authUser = authUserData?.user as unknown as { user_metadata?: Record<string, unknown>; identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> }>; email?: string } | undefined;
          const metadata = authUser?.user_metadata || {};
          const identities = Array.isArray(authUser?.identities) ? authUser?.identities : [];
          const googleIdentity = identities.find(i => i?.provider === 'google');
          const identityData = (googleIdentity?.identity_data || {}) as Record<string, unknown>;
          const metaName = (metadata['full_name'] as string | undefined) || (metadata['name'] as string | undefined) || (metadata['given_name'] as string | undefined) || (metadata['preferred_username'] as string | undefined);
          const idName = (identityData['name'] as string | undefined) || (identityData['full_name'] as string | undefined) || (identityData['given_name'] as string | undefined);
          instructorDisplayName = (metaName || idName || '').trim();
          // Do not fall back to email; leave empty if not found
        }
      } catch {
        instructorDisplayName = instructorName;
      }
      // If still empty, last resort to a neutral label (no email)
      if (!instructorDisplayName) instructorDisplayName = 'Unknown Instructor';
      const studentDisplayName = student.display_name || `${student.first_name} ${student.last_name}`;

      // Update the grade row with request metadata
      const { error: updateErr } = await supabase
        .from('grades')
        .update({
          edit_requested: true,
          edit_status: 'pending',
          edit_reason: trimmed,
          edit_requested_by: user.id,
          edit_requested_by_name: instructorDisplayName,
          edit_student_id: student.id,
          edit_student_name: studentDisplayName,
          updated_at: new Date().toISOString()
        })
        .eq('id', gradeId);
      if (updateErr) throw updateErr;

      toast.success('Request sent to Registrar for this student. Status: Pending');
      setGradeEditStatus(prev => (prev === 'granted' ? prev : 'pending'));
    } catch (e) {
      console.error('Failed to request approval:', e);
      toast.error('Failed to request approval');
    }
  };

  // Download grades as CSV for the currently selected class
  const handleDownloadGrades = () => {
    if (!selectedClass || students.length === 0) {
      toast('No grades to download', { icon: 'ℹ️' });
      return;
    }
    const header = ['Student ID', 'Name', 'Email', 'Prelim', 'Midterm', 'Final', 'GA'];
    const rows = students.map(s => [
      s.student_id || s.id,
      s.display_name || `${s.first_name} ${s.last_name}`,
      s.email,
      s.prelim_grade ?? '',
      s.midterm_grade ?? '',
      s.final_grade ?? '',
      (() => {
        const avg = calculateGAWhenComplete(s.prelim_grade, s.midterm_grade, s.final_grade);
        return avg ?? '';
      })()
    ]);

    // Clean metadata header for context
    const metaTitle = `${selectedClass.course?.code || ''} ${selectedClass.course?.name || ''}`.trim();
    const metaInfo = [
      `Year & Section: ${selectedClass.section || ''}`,
      `Year Level: ${selectedClass.year_level || 'N/A'}`,
      `Academic Year: ${selectedClass.academic_year || ''}`,
      `Semester: ${selectedClass.semester || ''}`
    ].join(' | ');

    const serialize = (r: Array<string | number>) => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    const lines: string[] = [];
    lines.push(`"${metaTitle.replace(/"/g, '""')}"`);
    lines.push(`"Instructor: ${instructorName.replace(/"/g, '""')}"`);
    lines.push(`"${metaInfo.replace(/"/g, '""')}"`);
    lines.push('');
    lines.push(serialize(header));
    rows.forEach(r => lines.push(serialize(r)));
    const csv = lines.join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeCode = selectedClass.course?.code || 'class';
    const fileName = [
      safeCode,
      selectedClass.section ? `Sec-${selectedClass.section}` : '',
      selectedClass.academic_year || '',
      selectedClass.semester ? `Sem-${selectedClass.semester}` : '',
      'grades.csv'
    ].filter(Boolean).join('_').replace(/[^\w\-.]+/g, '_');
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print the grades table
  const handlePrintGrades = () => {
    if (!selectedClass || students.length === 0) {
      toast('No grades to print', { icon: 'ℹ️' });
      return;
    }
    const win = window.open('', 'PRINT', 'height=650,width=900,top=100,left=150');
    if (!win) return;
    const title = `${selectedClass.course?.code || ''} ${selectedClass.course?.name || ''}`;
    const instructorName = (
      (user as unknown as { user_metadata?: Record<string, unknown>; email?: string })?.user_metadata?.full_name as string
    ) || (
      (user as unknown as { user_metadata?: Record<string, unknown> })?.user_metadata?.name as string
    ) || (
      (user as unknown as { user_metadata?: Record<string, unknown> })?.user_metadata?.display_name as string
    ) || user?.email || 'Instructor';
    const rowsHtml = students
      .map(s => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${s.student_id || s.id}</td>
          <td style="padding:8px;border:1px solid #ddd;">${s.display_name || `${s.first_name} ${s.last_name}`}</td>
          <td style="padding:8px;border:1px solid #ddd;">${s.email}</td>
          <td style="padding:8px;border:1px solid #ddd; text-align:center;">${s.prelim_grade ?? ''}</td>
          <td style="padding:8px;border:1px solid #ddd; text-align:center;">${s.midterm_grade ?? ''}</td>
          <td style="padding:8px;border:1px solid #ddd; text-align:center;">${s.final_grade ?? ''}</td>
          <td style="padding:8px;border:1px solid #ddd; text-align:center;">${(() => { const avg = calculateGAWhenComplete(s.prelim_grade, s.midterm_grade, s.final_grade); return avg ?? ''; })()}</td>
        </tr>`)
      .join('');
    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 8px; border: 1px solid #ddd; }
            th { background: #f9fafb; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div style="margin:0 0 6px 0;color:#374151;font-weight:600;">Instructor: ${instructorName}</div>
          <div style="margin-bottom:10px;color:#374151;">Year & Section: ${selectedClass.section || ''} | Year Level: ${selectedClass.year_level || ''} | AY: ${selectedClass.academic_year || ''} | Semester: ${selectedClass.semester || ''}</div>
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Prelim</th>
                <th>Midterm</th>
                <th>Final</th>
                <th>GA</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
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
              <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-lg shadow-sm">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-gray-700 font-medium">{classes.length} Classes Assigned</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Classes Panel - Improved Layout */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                      {/* Add Subject Toggle */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => setShowAddSubject(v => !v)}
                          className="px-3 py-1.5 text-xs  text-white rounded-md hover:bg-indigo-700"
                        >
                          {showAddSubject ? 'Close' : ' '}
                        </button>
                      </div>
                      {showAddSubject && (
                        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
                          <div className="grid grid-cols-1 gap-2">
                            <select
                              value={newSubjectForm.subject_id}
                              onChange={(e) => setNewSubjectForm(f => ({ ...f, subject_id: e.target.value }))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="">Select Subject</option>
                              {availableCourses.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.code} — {c.name}
                                </option>
                              ))}
                            </select>
                            <input
                              value={newSubjectForm.section}
                              onChange={(e) => setNewSubjectForm(f => ({ ...f, section: e.target.value }))}
                              placeholder="Section"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <input
                              value={newSubjectForm.academic_year}
                              onChange={(e) => setNewSubjectForm(f => ({ ...f, academic_year: e.target.value }))}
                              placeholder="Academic Year (e.g., 2024-2025)"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <input
                              value={newSubjectForm.semester}
                              onChange={(e) => setNewSubjectForm(f => ({ ...f, semester: e.target.value }))}
                              placeholder="Semester (e.g., 1st)"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={handleAddSubject}
                              disabled={addingSubject}
                              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                              {addingSubject ? 'Adding…' : 'Save Subject'}
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-600">You can add subjects anytime. Editing grades stays locked unless Registrar approval is granted.</p>
                        </div>
                      )}
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
                          <option value="all">All Sections</option>
                          {sections.map(section => (
                            <option key={section} value={section}>{section}</option>
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
                                  <div className="text-xs text-gray-500">Section {group.section}</div>
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
                              <div className="p-3 space-y-2 bg-white/80">
                                {group.classes.map((cls) => (
                                  <button
                                    key={cls.id}
                                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 hover:shadow-md overflow-hidden ${
                                      selectedClass?.id === cls.id 
                                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md' 
                                        : 'bg-gray-50 border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                                    }`}
                                    onClick={() => {
                                      setSelectedClass(cls);
                                    }}
                                  >
                                    {/* Class Header */}
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2 break-words">
                                          {cls.course?.name}
                                        </h3>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full whitespace-nowrap">
                                            {cls.course?.code}
                                          </span>
                                          <span className="text-xs text-gray-500">•</span>
                                          <span className="text-xs text-gray-600 whitespace-nowrap">{cls.course?.units} units</span>
                                          <span className="text-xs text-gray-500">•</span>
                                          <span className="text-xs text-gray-600 whitespace-nowrap">Section {cls.section}</span>
                                        </div>
                                      </div>
                                      <div className={`w-3 h-3 rounded-full ${
                                        selectedClass?.id === cls.id ? 'bg-blue-500' : 'bg-gray-300'
                                      }`} />
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
            {/* Statistics Cards - Moved to align with Assigned Classes */}
            {selectedClass && (
              <div className="rounded-2xl shadow-sm border border-gray-100 mb-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Total Students Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <Users className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                          Active
                        </div>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                        <span className="text-xs text-green-600 font-medium">+0%</span>
                      </div>
                      <p className="text-xs text-gray-500">Enrolled in this class</p>
                    </div>
                  </div>

                  {/* Completed Grades Card */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 shadow-sm border border-green-100 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-md shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                          Updated
                        </div>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-gray-600">Completed Grades</p>
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold text-gray-900">{completedGrades}</p>
                        <span className="text-xs text-green-600 font-medium">
                          {totalStudents > 0 ? Math.round((completedGrades / totalStudents) * 100) : 0}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Grades submitted</p>
                    </div>
                  </div>

                  {/* Completion Rate Card */}
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-2 shadow-sm border border-purple-100 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-md shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                          completionRate >= 80 ? 'text-green-600 bg-green-100' : 
                          completionRate >= 60 ? 'text-yellow-600 bg-yellow-100' : 
                          'text-red-600 bg-red-100'
                        }`}>
                          {completionRate >= 80 ? 'Excellent' : 
                           completionRate >= 60 ? 'Good' : 'Needs Attention'}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
                        <div className="flex items-center gap-1">
                          {completionRate >= 80 ? (
                            <span className="text-xs text-green-600">↑</span>
                          ) : completionRate >= 60 ? (
                            <span className="text-xs text-yellow-600">→</span>
                          ) : (
                            <span className="text-xs text-red-600">↓</span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-0.5">
                        <div 
                          className={`h-0.5 rounded-full transition-all duration-500 ${
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
            )}

            <div className="bg-white/80 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                              {selectedClass.course?.name}
                              <span className="bg-gradient-to-r from-emerald-500 to-green-400 text-white px-3 py-1 rounded-xl text-base font-mono tracking-wide shadow-lg border-2 border-emerald-600">
                                {selectedClass.course?.code}
                              </span>
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
  
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-600">{students.length} students enrolled</span>
                            </div>
                          </div>
                        </div>  
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Year&Section:</span>
                            <span className="bg-white/80 px-3 py-1 rounded-lg shadow-sm border border-emerald-300">{selectedClass.section}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Academic Year:</span>
                            <span className="bg-white/80 px-3 py-1 rounded-lg shadow-sm border border-emerald-300">{selectedClass.academic_year}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Semester:</span>
                            <span className="bg-white/80 px-3 py-1 rounded-lg shadow-sm border border-emerald-300">{selectedClass.semester}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePrintGrades}
                          className="flex items-center gap-2 px-3 py-2 bg-white/80 text-gray-700 rounded-lg shadow-sm border hover:bg-gray-50"
                        >
                          <Printer className="w-4 h-4" />
                          Print
                        </button>
                        <button
                          onClick={handleDownloadGrades}
                          className="flex items-center gap-2 px-3 py-2 bg-white/80 text-gray-700 rounded-lg shadow-sm border hover:bg-gray-50"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
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
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                Email
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Prelim
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Midterm
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Final
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                GA
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white/80 divide-y divide-gray-200">
                            {students.map((student, idx) => {
                              const studentId = searchParams.get('studentId');
                              const isTargetStudent = studentId && (student.id === studentId || student.student_id === studentId);
                              
                              return (
                              <tr key={student.id} className={`transition-all duration-200 hover:bg-gray-50 ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              } ${isTargetStudent ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
                                <td className="px-3 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {student.avatar_url ? (
                                      <img 
                                        src={student.avatar_url} 
                                        alt={`${student.display_name || 'Student'}`}
                                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover mr-2 sm:mr-3 flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm mr-2 sm:mr-3 flex-shrink-0">
                                        {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                                        {student.display_name || `${student.first_name} ${student.last_name}`}
                                        {student.hasPendingRequest && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                                            <ShieldAlert className="w-3 h-3" />
                                            Pending
                                          </span>
                                        )}
                                        {student.can_edit_grades && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Approved
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 hidden sm:block">
                                        ID: {student.student_id || student.id.slice(0, 8)}
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
                                  {editingGrades[student.id] ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={editingGrades[student.id].prelim || ''}
                                      onChange={(e) => handleGradeChange(student.id, 'prelim', e.target.value)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  ) : (
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      student.prelim_grade !== null ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {student.prelim_grade !== null ? student.prelim_grade : 'N/A'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  {editingGrades[student.id] ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={editingGrades[student.id].midterm || ''}
                                      onChange={(e) => handleGradeChange(student.id, 'midterm', e.target.value)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                      disabled={!((editingGrades[student.id]?.prelim && editingGrades[student.id]?.prelim !== '') || (student.prelim_grade !== null && student.prelim_grade !== undefined))}
                                      title={!((editingGrades[student.id]?.prelim && editingGrades[student.id]?.prelim !== '') || (student.prelim_grade !== null && student.prelim_grade !== undefined)) ? 'Enter Prelim first' : ''}
                                    />
                                  ) : (
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      student.midterm_grade !== null ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {student.midterm_grade !== null ? student.midterm_grade : 'N/A'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  {editingGrades[student.id] ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={editingGrades[student.id].final || ''}
                                      onChange={(e) => handleGradeChange(student.id, 'final', e.target.value)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                      disabled={!(((editingGrades[student.id]?.prelim && editingGrades[student.id]?.prelim !== '') || (student.prelim_grade !== null && student.prelim_grade !== undefined)) && ((editingGrades[student.id]?.midterm && editingGrades[student.id]?.midterm !== '') || (student.midterm_grade !== null && student.midterm_grade !== undefined)))}
                                      title={!(((editingGrades[student.id]?.prelim && editingGrades[student.id]?.prelim !== '') || (student.prelim_grade !== null && student.prelim_grade !== undefined)) && ((editingGrades[student.id]?.midterm && editingGrades[student.id]?.midterm !== '') || (student.midterm_grade !== null && student.midterm_grade !== undefined))) ? 'Enter Prelim and Midterm first' : ''}
                                    />
                                  ) : (
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      student.final_grade !== null ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {student.final_grade !== null ? student.final_grade : 'N/A'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  {(() => {
                                    const avg = calculateGAWhenComplete(student.prelim_grade, student.midterm_grade, student.final_grade);
                                    return (
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${avg !== null ? (avg >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') : 'bg-gray-100 text-gray-800'}`}>
                                        {avg !== null ? avg : 'N/A'}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  {editingGrades[student.id] ? (
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => saveGrades(student.id)}
                                        disabled={savingGrades[student.id]}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                      >
                                        {savingGrades[student.id] ? 'Saving...' : 'Save'}
                                      </button>
                                      <button
                                        onClick={() => cancelEditing(student.id)}
                                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white/80 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    (() => {
                                      const allFilled = (
                                        student.prelim_grade != null &&
                                        student.midterm_grade != null &&
                                        student.final_grade != null
                                      );
                                      const editDisabled = !student.can_edit_grades;
                                      return (
                                        <div className="flex items-center justify-center space-x-2">
                                          {!allFilled && (
                                            <button
                                              onClick={() => startEditingGrades(student.id, 'add')}
                                              className="inline-flex items-center p-1.5 border border-indigo-600 rounded-md text-indigo-50 bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                                              title="Add Grade"
                                            >
                                              <Plus className="w-4 h-4" />
                                            </button>
                                          )}
                                          <button
                                            onClick={() => startEditingGrades(student.id, 'edit')}
                                            className={`inline-flex items-center p-1.5 border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                              editDisabled ? 'bg-gray-400 border-gray-500 cursor-not-allowed' : 'bg-purple-600 border-purple-700 hover:bg-purple-700 focus:ring-purple-500'
                                            }`}
                                            disabled={editDisabled}
                                            title={editDisabled ? 'Editing locked until Registrar approval' : 'Edit Grades'}
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </button>
                                          {gradeEditStatus !== 'granted' && !student.can_edit_grades && !student.hasPendingRequest && (
                                            <button
                                              onClick={() => requestRegistrarApprovalForStudent(student)}
                                              className="inline-flex items-center p-1.5 border border-yellow-600 rounded-md text-yellow-50 bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600"
                                              title="Request Registrar Approval"
                                            >
                                              <ShieldAlert className="w-4 h-4" />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })()
                                  )}
                                </td>
                              </tr>
                              );
                            })}
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
    </div>
  );
};

export default ClassManagement; 
