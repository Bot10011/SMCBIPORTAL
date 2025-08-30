import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, Clock, BookOpen, ChevronRight, Search, Users, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

interface Grade {
  id: string;
  student_id: string;
  final_grade: number | null;
  midterm_grade: number | null;
  prelim_grade: number | null;
  remarks: string | null;
  graded_by: string | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
  is_released: boolean;
  student_name?: string;
  avatar_url?: string;
  school_id?: string;
  general_average?: number | null;
  year_level?: string;
  section?: string;
  program_name?: string;
  program_code?: string;
  student_status?: string;
  enrollment_status?: string;
  student_type?: string;
  subject_id?: string | null;
  course_id?: string;
  course_code?: string;
  course_name?: string;
  teacher_name?: string;
}

interface YearLevelSection {
  year_level: string;
  section: string;
  studentCount: number;
}

interface YearLevelSectionSubject {
  year_level: string;
  section: string;
  subject: string;
  subject_name: string;
  studentCount: number;
}

interface Program {
  id: string;
  name: string;
  code: string;
  description?: string;
  major?: string;
  is_active?: boolean;
  studentCount: number;
  programHead?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface ProgramHead {
  id: string;
  display_name: string;
  avatar_url?: string;
  department: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export default function StudentGrades() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for selection interface
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [showPrograms, setShowPrograms] = useState(true);
  const [showYearLevels, setShowYearLevels] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [showSubjects, setShowSubjects] = useState(false);
  const [showEmptyProgram, setShowEmptyProgram] = useState(false);
  
  // Navigation history to track the flow
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['programs']);

  const [yearLevelSectionSubjects, setYearLevelSectionSubjects] = useState<YearLevelSectionSubject[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  
  // State for search and filtering - separate states for different views
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // State for bulk actions
  const [bulkUpdating, setBulkUpdating] = useState(false);
  


  // Helper function to convert year level number to display format
  const getYearLevelDisplayName = (yearLevel: string): string => {
    switch (yearLevel) {
      case '1': return '1st Year';
      case '2': return '2nd Year';
      case '3': return '3rd Year';
      case '4': return '4th Year';
      default: return `Year ${yearLevel}`;
    }
  };

  // Helper function to convert section UUIDs to readable names
  const getSectionDisplayName = (sectionValue: string): string => {
    // If it's already a simple letter (A, B, C, D), return as is
    if (/^[A-Z]$/.test(sectionValue)) {
      return sectionValue;
    }
    
    // If it's a UUID, convert to a readable format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sectionValue)) {
      // Extract first 8 characters and make it readable
      const shortId = sectionValue.substring(0, 8);
      const result = `Section ${shortId.toUpperCase()}`;
      return result;
    }
    
    // If it's neither, return as is
    return sectionValue;
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    setError(null);
    
    console.log('Fetching grades and student data...');
    
    try {
      // Test database connectivity first
      console.log('Testing database connectivity...');
      const { error: testError } = await supabase
        .from('programs')
        .select('count')
        .limit(1);
        
      if (testError) {
        console.error('Database connectivity test failed:', testError);
        setError(`Database connection failed: ${testError.message}`);
        setLoading(false);
        return;
      } else {
        console.log('Database connectivity test passed');
      }
      
      // Test fetching a single program to see the actual data structure
      console.log('Testing single program fetch...');
      const { data: singleProgramTest, error: singleProgramError } = await supabase
        .from('programs')
        .select('*')
        .limit(1);
        
      if (singleProgramError) {
        console.error('Single program test failed:', singleProgramError);
      } else {
        console.log('Single program test result:', singleProgramTest);
        if (singleProgramTest && singleProgramTest.length > 0) {
          console.log('Single program data structure:', Object.keys(singleProgramTest[0]));
          console.log('Single program values:', singleProgramTest[0]);
        }
      }
      
      // First, get all students with their year level and section info
      const { data: studentsData, error: initialStudentsError } = await supabase
        .from('user_profiles')
        .select('id, student_id, display_name, avatar_url, year_level, section, program_id, department, student_status, enrollment_status, student_type')
        .eq('role', 'student')
        .not('year_level', 'is', null)
        .not('section', 'is', null);
        
      if (initialStudentsError) {
        console.error('Students error:', initialStudentsError);
        setError('Failed to load student information');
        setLoading(false);
        return;
      }
      
      console.log('Students data:', studentsData?.length || 0, 'records');
      
      // Get unique year level and section combinations
      const yearLevelSectionMap = new Map<string, Set<string>>();
      const studentMap = new Map();
      
      (studentsData || []).forEach(student => {
        if (student.year_level && student.section) {
          if (!yearLevelSectionMap.has(student.year_level)) {
            yearLevelSectionMap.set(student.year_level, new Set());
          }
          yearLevelSectionMap.get(student.year_level)!.add(student.section);
          studentMap.set(student.id, student);
        }
      });
      
      // Create year level sections array for display
      const yearLevelSectionsArray: YearLevelSection[] = [];
      yearLevelSectionMap.forEach((sections, yearLevel) => {
        sections.forEach(section => {
          const studentCount = (studentsData || []).filter(s => 
            s.year_level === yearLevel && s.section === section
          ).length;
          yearLevelSectionsArray.push({
            year_level: yearLevel,
            section: section,
            studentCount
          });
        });
      });
      
      // Sort by year level (as '1'..'4') and section
      yearLevelSectionsArray.sort((a, b) => {
        const yearOrder = ['1', '2', '3', '4'];
        const aYearIndex = yearOrder.indexOf(a.year_level);
        const bYearIndex = yearOrder.indexOf(b.year_level);
        
        if (aYearIndex !== bYearIndex) {
          return aYearIndex - bYearIndex;
        }
        return a.section.localeCompare(b.section);
      });
      

      
      // Fetch grades for students who have year level and section
      const studentIds = (studentsData || []).map(s => s.id);
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select(`
          *,
          student:user_profiles!grades_student_id_fkey (
            id, 
            student_id, 
            display_name, 
            avatar_url, 
            department, 
            student_status, 
            enrollment_status, 
            student_type,
            program_id
          )
        `)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });
        
      if (gradesError) {
        console.error('Grades error:', gradesError);
        setError('Failed to load grades');
        setLoading(false);
        return;
      }
      
      console.log('Grades data:', gradesData?.length || 0, 'records');
      
      // Build lookup maps for graded_by (teacher) and subject_id (course)
      const gradedByIds = Array.from(new Set((gradesData || []).map(g => g.graded_by).filter(Boolean)));
      const subjectIdsFromGrades = Array.from(new Set((gradesData || []).map(g => g.subject_id).filter(Boolean)));

      // Fetch teacher display names
      const teachersById = new Map<string, { display_name?: string; first_name?: string; last_name?: string }>();
      if (gradedByIds.length > 0) {
        const { data: teachersData } = await supabase
          .from('user_profiles')
          .select('id, display_name, first_name, last_name')
          .in('id', gradedByIds as string[]);
        (teachersData || []).forEach(t => teachersById.set(t.id, { display_name: t.display_name, first_name: t.first_name, last_name: t.last_name }));
      }

      // Fetch course codes for subject ids
      const coursesById = new Map<string, { code?: string; name?: string }>();
      if (subjectIdsFromGrades.length > 0) {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, code, name')
          .in('id', subjectIdsFromGrades as string[]);
        (coursesData || []).forEach(c => coursesById.set(c.id, { code: c.code, name: c.name }));
      }
      
      // Fetch enrollments to get course information
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollcourse')
        .select(`
          id,
          student_id,
          subject_id,
          status,
          course:courses (id, code, name)
        `)
        .in('student_id', studentIds);
        
      if (enrollmentsError) {
        console.error('Enrollments error:', enrollmentsError);
      }
      
      console.log('Enrollments data:', enrollmentsData?.length || 0, 'records');
      if (enrollmentsData && enrollmentsData.length > 0) {
        console.log('Sample enrollment:', enrollmentsData[0]);
      }
      
      // Create enrollment map for quick lookup keyed by student_id+subject_id
      type EnrollmentRow = {
        id: string;
        student_id: string;
        subject_id: string | null;
        status: string;
        course: { id: string; code: string; name: string } | null;
      };
      const enrollmentMap = new Map<string, EnrollmentRow>();
      (enrollmentsData || []).forEach(enrollment => {
        // Handle case where course might be an array
        const course = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
        console.log('Processing enrollment:', {
          student_id: enrollment.student_id,
          subject_id: enrollment.subject_id,
          course: course
        });
        const key = `${enrollment.student_id}-${enrollment.subject_id}`;
        enrollmentMap.set(key, { ...enrollment, course });
      });
      
      console.log('Enrollment map contents:', Array.from(enrollmentMap.entries()).map(([key, value]) => ({
        key,
        subject_id: value.subject_id,
        course_id: value.course?.id,
        course_code: value.course?.code
      })));
      
      // Debug: Check what sections and year levels we have in student data
      const studentSections = [...new Set(studentsData.map(s => s.section))];
      const studentYearLevels = [...new Set(studentsData.map(s => s.year_level))];
      console.log('Student sections found:', studentSections);
      console.log('Student year levels found:', studentYearLevels);
      
      // Fetch teacher information for courses
      const courseIds = (enrollmentsData || []).map(e => {
        const course = Array.isArray(e.course) ? e.course[0] : e.course;
        return course?.id;
      }).filter(Boolean);
      
      console.log('Course IDs for teacher lookup:', courseIds);
      
      // Get current academic period (you may need to adjust this based on your system)
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // Determine academic year and semester
      let academicYear, semester;
      if (currentMonth >= 6 && currentMonth <= 10) {
        academicYear = `${currentYear}-${currentYear + 1}`;
        semester = '1st Semester';
      } else if (currentMonth >= 11 || currentMonth <= 3) {
        academicYear = `${currentYear}-${currentYear + 1}`;
        semester = '2nd Semester';
      } else {
        academicYear = `${currentYear}-${currentYear + 1}`;
        semester = 'Summer';
      }
      
      console.log('Current academic period:', { academicYear, semester });
      
      // First, try to get teacher subjects for the current academic period
      let { data: teacherSubjectsData, error: teacherSubjectsError } = await supabase
        .from('teacher_subjects')
        .select(`
          id,
          teacher_id,
          subject_id,
          section,
          academic_year,
          semester,
          year_level,
          teacher:user_profiles!teacher_subjects_teacher_id_fkey (id, display_name, first_name, last_name)
        `)
        .in('subject_id', courseIds)
        .eq('is_active', true)
        .eq('academic_year', academicYear)
        .eq('semester', semester);
        
      // If no data found for current period, try without academic period filters
      if (!teacherSubjectsData || teacherSubjectsData.length === 0) {
        console.log('No teacher subjects found for current period, trying without filters...');
        const { data: unfilteredTeacherSubjects, error: unfilteredError } = await supabase
          .from('teacher_subjects')
          .select(`
            id,
            teacher_id,
            subject_id,
            section,
            academic_year,
            semester,
            year_level,
            teacher:user_profiles!teacher_subjects_teacher_id_fkey (id, display_name, first_name, last_name)
          `)
          .in('subject_id', courseIds)
          .eq('is_active', true);
          
        if (unfilteredError) {
          console.error('Error fetching unfiltered teacher subjects:', unfilteredError);
        } else {
          teacherSubjectsData = unfilteredTeacherSubjects;
          teacherSubjectsError = null; // Clear the error since we got data
          console.log('Found', teacherSubjectsData?.length || 0, 'teacher subjects without period filters');
        }
      }
        
      if (teacherSubjectsError) {
        console.error('Teacher subjects error:', teacherSubjectsError);
        console.error('Error details:', {
          message: teacherSubjectsError.message,
          details: teacherSubjectsError.details,
          hint: teacherSubjectsError.hint
        });
      }
      
      // Create teacher map for quick lookup
      // Normalize year levels to numeric strings '1'..'4' to match processed grades
      const normalizeYearLevelToNumeric = (value?: string | null): string => {
        if (!value) return 'Unknown';
        const v = value.toString().toLowerCase();
        if (v.startsWith('1')) return '1';
        if (v.startsWith('2')) return '2';
        if (v.startsWith('3')) return '3';
        if (v.startsWith('4')) return '4';
        if (['1','2','3','4'].includes(value)) return value;
        return 'Unknown';
      };

      // Key: `${subject_id}-${section}-${year_level}` to match specific course-section-year combinations
      const teacherMap = new Map();
      (teacherSubjectsData || []).forEach(ts => {
        const teacher = Array.isArray(ts.teacher) ? ts.teacher[0] : ts.teacher;
        const normalizedYear = normalizeYearLevelToNumeric(ts.year_level);
        console.log('Processing teacher subject:', {
          id: ts.id,
          teacher_id: ts.teacher_id,
          subject_id: ts.subject_id,
          section: ts.section,
          year_level: ts.year_level,
          normalizedYear,
          teacher: teacher
        });
        
        // Create a composite key for more specific matching
        const key = `${ts.subject_id}-${ts.section}-${normalizedYear}`;
        teacherMap.set(key, teacher);
        
        // Also store by just subject_id for fallback
        teacherMap.set(ts.subject_id, teacher);
      });
      
      console.log('Teacher map created with keys:', Array.from(teacherMap.keys()));
      
            console.log('Teacher subjects data:', teacherSubjectsData?.length || 0, 'records');
      if (teacherSubjectsData && teacherSubjectsData.length > 0) {
        console.log('Sample teacher subject:', teacherSubjectsData[0]);
        console.log('Teacher map contents:', Array.from(teacherMap.entries()));
        
        // Show all available teacher-subject combinations
        console.log('Available teacher-subject combinations:');
        teacherSubjectsData.forEach((ts, index) => {
          const teacher = Array.isArray(ts.teacher) ? ts.teacher[0] : ts.teacher;
          console.log(`${index + 1}. Course: ${ts.subject_id}, Section: ${ts.section}, Year: ${ts.year_level}, Teacher: ${teacher?.first_name} ${teacher?.last_name}`);
        });
        
        // Debug: Check what sections and year levels are available in teacher_subjects
        const teacherSubjectSections = [...new Set(teacherSubjectsData.map(ts => ts.section))];
        const teacherSubjectYearLevels = [...new Set(teacherSubjectsData.map(ts => ts.year_level))];
        console.log('Teacher subject sections available:', teacherSubjectSections);
        console.log('Teacher subject year levels available:', teacherSubjectYearLevels);
      } else {
        console.warn('No teacher subjects found. You may need to insert sample data:');
        console.warn(`
          -- Sample SQL to insert teacher-subject assignments:
          -- INSERT INTO teacher_subjects (teacher_id, subject_id, section, academic_year, semester, year_level, is_active)
          -- VALUES 
          --   ('teacher-uuid-here', 'course-uuid-here', 'A', '2024-2025', '1st Semester', '3rd Year', true);
          
          -- To get the required UUIDs, run these queries:
          -- SELECT id, first_name, last_name FROM user_profiles WHERE role = 'teacher' LIMIT 1;
          -- SELECT id, course_code, course_name FROM courses LIMIT 1;
        `);
        
        // Let's also check what's actually in the teacher_subjects table
        console.log('Checking what exists in teacher_subjects table...');
        const { data: allTeacherSubjects, error: checkError } = await supabase
          .from('teacher_subjects')
          .select('*')
          .limit(5);
          
        if (checkError) {
          console.error('Error checking teacher_subjects table:', checkError);
        } else {
          console.log('All teacher_subjects records:', allTeacherSubjects);
        }
      }
      
      // Fallback: If no teacher subjects found, try to get teacher info directly
      if (!teacherSubjectsData || teacherSubjectsData.length === 0) {
        console.warn('No teacher subjects found, trying fallback approach...');
        
        // Get all teacher profiles
        const { data: allTeachers, error: teachersError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, role')
          .eq('role', 'teacher');
          
        if (teachersError) {
          console.error('Fallback teachers fetch error:', teachersError);
        } else {
          console.log('Fallback: Found', allTeachers?.length || 0, 'teachers');
          
          // Try to find any teacher subjects (without filters)
          const { data: anyTeacherSubjects, error: anyTeacherError } = await supabase
            .from('teacher_subjects')
            .select(`
              id, teacher_id, subject_id, section, year_level,
              teacher:user_profiles!teacher_subjects_teacher_id_fkey (id, display_name, first_name, last_name)
            `)
            .limit(10);
            
                if (anyTeacherError) {
        console.error('Error fetching any teacher subjects:', anyTeacherError);
      } else if (anyTeacherSubjects && anyTeacherSubjects.length > 0) {
        console.log('Found', anyTeacherSubjects.length, 'teacher subjects (unfiltered)');
        console.log('Sample:', anyTeacherSubjects[0]);
        
        // Use these for mapping
        anyTeacherSubjects.forEach(ts => {
          const teacher = Array.isArray(ts.teacher) ? ts.teacher[0] : ts.teacher;
          const key = `${ts.subject_id}-${ts.section}-${ts.year_level}`;
          teacherMap.set(key, teacher);
          teacherMap.set(ts.subject_id, teacher);
        });
        
        console.log('Updated teacher map with unfiltered data:', Array.from(teacherMap.entries()));
      } else {
            // Last resort: assign default teacher to all courses
            (enrollmentsData || []).forEach(enrollment => {
              const course = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
              if (course?.id && !teacherMap.has(course.id)) {
                const defaultTeacher = allTeachers?.[0];
                if (defaultTeacher) {
                  teacherMap.set(course.id, defaultTeacher);
                  console.log('Assigned default teacher to course:', course.id);
                }
              }
            });
          }
        }
      }
      
      // Fetch programs data
      const programIds = (studentsData || []).map(s => s.program_id).filter(Boolean);
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('id, name, major')
        .in('id', programIds);
      
      if (programsError) {
        console.error('Error fetching programs:', programsError);
      }
      
      const programMap = new Map();
      (programsData || []).forEach(p => {
        programMap.set(p.id, { name: p.name, code: p.major || 'N/A' });
      });

      // Course and teacher data is now fetched through the join above
      
      const processedGrades = (gradesData || []).map(g => {
        const student = Array.isArray(g.student) ? g.student[0] : g.student;
        const mapYearLevelToNumericString = (num?: number | null): string => {
          if (num === 1) return '1';
          if (num === 2) return '2';
          if (num === 3) return '3';
          if (num === 4) return '4';
          return 'Unknown';
        };
        
        // Calculate General Average
        const grades = [g.prelim_grade, g.midterm_grade, g.final_grade].filter(grade => grade !== null && grade !== undefined);
        const general_average = grades.length > 0 
          ? Math.round((grades.reduce((sum, grade) => sum + (grade || 0), 0) / grades.length) * 100) / 100
          : null;
        
        // Get enrollment data for this student and subject
        const enrollmentKey = `${g.student_id}-${g.subject_id || ''}`;
        const enrollment = enrollmentMap.get(enrollmentKey);
        
        return {
          ...g,
          student_name: student?.display_name || 'Unknown Student',
          avatar_url: student?.avatar_url || null,
          school_id: student?.student_id || g.student_id,
          general_average,
          // Use year_level from grades table (integer) and convert to string
          year_level: mapYearLevelToNumericString(g.year_level),
          // Use section from grades table
          section: g.section || 'Unknown',
          program_name: student?.department || 'Unknown Program',
          program_code: student?.department || 'UNK',
          student_status: student?.student_status || 'Unknown',
          enrollment_status: student?.enrollment_status || 'Unknown',
          student_type: student?.student_type || 'Unknown',
          course_id: g.subject_id || enrollment?.course?.id || null,
          course_code: (() => {
            // Prefer course by grades.subject_id; fallback to enrollment course
            const codeFromGrades = g.subject_id ? coursesById.get(g.subject_id)?.code : undefined;
            const code = codeFromGrades || enrollment?.course?.code;
            return code || 'Unknown';
          })(),
          course_name: (() => {
            // Prefer course by grades.subject_id; fallback to enrollment course
            const nameFromGrades = g.subject_id ? coursesById.get(g.subject_id)?.name : undefined;
            const name = nameFromGrades || enrollment?.course?.name;
            return name || 'Unknown';
          })(),
          teacher_name: (() => {
            // Prefer graded_by profile display_name only
            if (g.graded_by) {
              const t = teachersById.get(g.graded_by);
              if (t && t.display_name && t.display_name.trim()) return t.display_name.trim();
            }
            // Fallback to teacherMap using composite key subject_id-section-year
            const compositeKey = `${g.subject_id || ''}-${g.section || ''}-${mapYearLevelToNumericString(g.year_level)}`;
            const mappedTeacher = teacherMap.get(compositeKey) || (g.subject_id ? teacherMap.get(g.subject_id) : undefined);
            if (mappedTeacher && (mappedTeacher as { display_name?: string }).display_name && (mappedTeacher as { display_name?: string }).display_name!.trim()) {
              return (mappedTeacher as { display_name: string }).display_name.trim();
            }
            return 'Not Assigned';
          })(),
        };
      });
      
      // Store processed grades for rendering and bulk actions
      setGrades(processedGrades);

      console.log('Processed grades:', processedGrades.length, 'records');
      console.log('Sample processed grade:', processedGrades[0]);
      console.log('Enrollment map size:', enrollmentMap.size);
      console.log('Teacher map size:', teacherMap.size);
      
      // Summary of data processing
      console.log('=== DATA PROCESSING SUMMARY ===');
      console.log('Students fetched:', studentsData?.length || 0);
      console.log('Grades fetched:', gradesData?.length || 0);
      console.log('Enrollments fetched:', enrollmentsData?.length || 0);
      console.log('Teacher subjects fetched:', teacherSubjectsData?.length || 0);
      console.log('Programs fetched:', programsData?.length || 0);
      
      // Debug: Show sample grades data
      if (gradesData && gradesData.length > 0) {
        console.log('Sample grades data:', gradesData.slice(0, 3).map(g => ({
          id: g.id,
          student_id: g.student_id,
          year_level: g.year_level,
          section: g.section,
          subject_id: g.subject_id,
          graded_by: g.graded_by
        })));
      }
      
      // Debug: Show processed grades
      if (processedGrades.length > 0) {
        console.log('Sample processed grades:', processedGrades.slice(0, 3).map(g => ({
          id: g.id,
          student_id: g.student_id,
          year_level: g.year_level,
          section: g.section,
          course_code: g.course_code,
          teacher_name: g.teacher_name
        })));
      }
      
      // Create year level, section, and subject combinations based on GRADES table
      const yearLevelSectionSubjectMap = new Map<string, Map<string, Set<string>>>();
      
      // Process ALL grades to create the complete data structure
      processedGrades.forEach(grade => {
        // Only process grades with valid data
        if (grade.year_level && 
            grade.year_level !== 'Unknown' && 
            grade.section && 
            grade.section !== 'Unknown' && 
            grade.course_code && 
            grade.course_code !== 'Unknown') {
          
          const key = `${grade.year_level}-${grade.section}`;
          if (!yearLevelSectionSubjectMap.has(key)) {
            yearLevelSectionSubjectMap.set(key, new Map());
          }
          const sectionMap = yearLevelSectionSubjectMap.get(key)!;
          if (!sectionMap.has(grade.section)) {
            sectionMap.set(grade.section, new Set());
          }
          sectionMap.get(grade.section)!.add(grade.course_code);
        }
      });
      
      const yearLevelSectionSubjectsArray: YearLevelSectionSubject[] = [];
      yearLevelSectionSubjectMap.forEach((sectionMap, key) => {
        const [yearLevel] = key.split('-');
        sectionMap.forEach((subjects, sectionName) => {
          subjects.forEach(subject => {
            // Count students from grades table for this specific combination
            const studentCount = processedGrades.filter(g => 
              g.year_level === yearLevel && 
              g.section === sectionName && 
              g.course_code === subject
            ).length;
            
            const subjectName = (() => {
              const match: Grade | undefined = processedGrades.find(g => 
                g.year_level === yearLevel &&
                g.section === sectionName &&
                g.course_code === subject
              );
              return match?.course_name || 'Unknown';
            })();
            
            yearLevelSectionSubjectsArray.push({
              year_level: yearLevel,
              section: sectionName,
              subject: subject,
              subject_name: subjectName,
              studentCount
            });
          });
        });
      });
      
      // Sort by year level ('1'..'4'), section, and subject
      yearLevelSectionSubjectsArray.sort((a, b) => {
        const yearOrder = ['1', '2', '3', '4'];
        const aYearIndex = yearOrder.indexOf(a.year_level);
        const bYearIndex = yearOrder.indexOf(b.year_level);
        
        if (aYearIndex !== bYearIndex) {
          return aYearIndex - bYearIndex;
        }
        
        if (a.section !== b.section) {
          return a.section.localeCompare(b.section);
        }
        
        return a.subject.localeCompare(b.subject);
      });
      
      setYearLevelSectionSubjects(yearLevelSectionSubjectsArray);
      
      // Debug: Show year level section subjects
      console.log('Year level section subjects created:', yearLevelSectionSubjectsArray.length);
      if (yearLevelSectionSubjectsArray.length > 0) {
        console.log('Sample year level section subjects:', yearLevelSectionSubjectsArray.slice(0, 3));
      }
      
      // Create programs array for display
      const programsArray: Program[] = [];
      
      // First, get all programs from the programs table (not just active ones)
      console.log('Fetching programs from database...');
      console.log('Query: SELECT id, name, description, major, is_active FROM programs ORDER BY name');
      
      const { data: allProgramsData, error: allProgramsError } = await supabase
        .from('programs')
        .select('id, name, description, major, is_active')
        .order('name');
        
      // Debug: Check what fields are available in programs table
      if (allProgramsData && allProgramsData.length > 0) {
        console.log('Programs table structure - available fields:', Object.keys(allProgramsData[0]));
        console.log('Sample program data:', allProgramsData[0]);
      }
        
      // Fetch program heads information
      console.log('Fetching program heads...');
      
      // First, let's check what roles exist in user_profiles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_profiles')
        .select('role')
        .not('role', 'is', null);
        
      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      } else {
        const uniqueRoles = [...new Set(rolesData?.map(u => u.role) || [])];
        console.log('Available roles in user_profiles:', uniqueRoles);
      }
      
      // Fetch program heads with comprehensive approach to handle all possible role variations
      let programHeadsData: ProgramHead[] = [];
      
      // Try multiple role variations to ensure we catch all program heads
      const possibleRoles = ['program_head', 'programhead', 'program head', 'programhead', 'head', 'director'];
      
      for (const role of possibleRoles) {
        if (programHeadsData.length > 0) break; // Stop if we found data
        
        console.log(`Trying to fetch with role = "${role}" and department column...`);
        const { data: programHeads, error } = await supabase
          .from('user_profiles')
          .select('id, display_name, avatar_url, department, first_name, last_name')
          .eq('role', role)
          .not('department', 'is', null);
          
        if (error) {
          console.error(`Error with role = "${role}" and department:`, error);
        } else if (programHeads && (programHeads as ProgramHead[]).length > 0) {
          programHeadsData = programHeads as ProgramHead[];
          console.log(`Program heads with role "${role}" and department:`, (programHeads as ProgramHead[]).length);
          console.log('Sample program head data:', (programHeads as ProgramHead[])[0]);
          break; // Found data, stop trying other roles
        }
      }
      
      // If still no data, try to fetch all users to see the structure
      if (!programHeadsData || programHeadsData.length === 0) {
        console.log('No program heads found with specific roles, checking all users...');
        const { data: allUsers, error: error3 } = await supabase
          .from('user_profiles')
          .select('id, display_name, avatar_url, role, department, first_name, last_name')
          .limit(10);
          
        if (error3) {
          console.error('Error fetching all users:', error3);
        } else {
          console.log('Sample users from user_profiles:', allUsers);
          
          // Try to identify program heads from all users
          const potentialProgramHeads = (allUsers || []).filter(user => 
            user.role && (
              user.role.toLowerCase().includes('program') ||
              user.role.toLowerCase().includes('head') ||
              user.role.toLowerCase().includes('director')
            ) && user.department
          ) as ProgramHead[];
          
          if (potentialProgramHeads.length > 0) {
            programHeadsData = potentialProgramHeads;
            console.log('Found potential program heads from all users:', potentialProgramHeads.length);
          }
        }
      }
        
      if (allProgramsError) {
        console.error('Error fetching all programs:', allProgramsError);
        console.error('Error details:', {
          message: allProgramsError.message,
          details: allProgramsError.details,
          hint: allProgramsError.hint,
          code: allProgramsError.code
        });
        setError(`Failed to load programs: ${allProgramsError.message}`);
        setLoading(false);
        return;
      } else {
        console.log('All active programs fetched:', allProgramsData?.length || 0);
        if (allProgramsData && allProgramsData.length > 0) {
          console.log('Sample program data:', allProgramsData[0]);
          console.log('All program data:', allProgramsData);
          
          // Debug: Check specific fields for each program
          allProgramsData.forEach((program, index) => {
            console.log(`Program ${index + 1}:`, {
              id: program.id,
              name: program.name,
              description: program.description,
              major: program.major,
              is_active: program.is_active
            });
          });
        }
      }
      
      // If no programs found, try to fetch with basic fields
      if (!allProgramsData || allProgramsData.length === 0) {
        console.log('No programs found, trying to fetch with basic fields...');
        
        // Try with just basic fields
        console.log('Trying to fetch programs with basic fields only...');
        const { data: basicPrograms, error: basicError } = await supabase
          .from('programs')
          .select('id, name')
          .order('name');
          
        if (basicError) {
          console.error('Error fetching programs with basic fields:', basicError);
        } else if (basicPrograms && basicPrograms.length > 0) {
          console.log('Basic programs fetched:', basicPrograms.length);
          
          const basicProgramsArray: Program[] = [];
          basicPrograms.forEach(program => {
            const studentCount = programStudentCountMap.get(program.id) || 0;
            const programHead = findProgramHead(program.name);
            basicProgramsArray.push({
              id: program.id,
              name: program.name,
              code: program.name,
              description: undefined,
              major: undefined,
              is_active: true, // Assume active if not specified
              studentCount: studentCount,
              programHead: programHead || undefined
            });
          });
          
          basicProgramsArray.sort((a, b) => a.name.localeCompare(b.name));
          setPrograms(basicProgramsArray);
          setLoading(false);
          return;
        }
        
        // Still set empty programs array if none found
        setPrograms([]);
        setLoading(false);
        return;
      }
      
      // Create a map to count students per program based on user_profiles department
      const programStudentCountMap = new Map<string, number>();
      
      // First, get all students from user_profiles with role = 'student'
      const { data: allStudents, error: programStudentsError } = await supabase
        .from('user_profiles')
        .select('id, department, role')
        .eq('role', 'student')
        .not('department', 'is', null);
        
      if (programStudentsError) {
        console.error('Error fetching students for program count:', programStudentsError);
      } else {
        console.log('Total students found:', allStudents?.length || 0);
        
        // Count students for each program based on EXACT department matching
        (allProgramsData || []).forEach(program => {
          if (program.name) {
            const programName = program.name.trim();
            const studentCount = (allStudents || []).filter(student => {
              if (student.department) {
                const studentDept = student.department.trim();
                // Exact match between program name and student department
                return studentDept === programName;
              }
              return false;
            }).length;
            
            programStudentCountMap.set(program.id, studentCount);
            
            if (studentCount > 0) {
              console.log(`Program "${programName}" has ${studentCount} students`);
            }
          }
        });
      }
      
      console.log('Program student count map (department-based):', Array.from(programStudentCountMap.entries()));
      
      // Create a map to link programs to their program heads
      const programHeadMap = new Map<string, { id: string; display_name: string; avatar_url?: string }>();
      (programHeadsData || []).forEach(programHead => {
        if (programHead.department) {
          programHeadMap.set(programHead.department, {
            id: programHead.id,
            display_name: programHead.display_name,
            avatar_url: programHead.avatar_url
          });
        }
      });
      
      console.log('Program head map created:', programHeadMap.size, 'entries');
      if (programHeadMap.size > 0) {
        console.log('Program head mappings:', Array.from(programHeadMap.entries()));
      } else {
        console.log('No program heads found or mapped');
      }
      
      // Debug: Show what departments are available in program heads
      const availableDepartments = Array.from(programHeadMap.keys());
      console.log('Available departments from program heads:', availableDepartments);
      
      // Debug: Show what program names are available
      const availableProgramNames = allProgramsData?.map(p => p.name) || [];
      console.log('Available program names:', availableProgramNames);
      
      // Create a robust mapping function to link programs to program heads
      const findProgramHead = (programName: string) => {
        if (!programName) return null;
        
        console.log('Finding program head for program:', programName);
        console.log('Available departments in programHeadMap:', Array.from(programHeadMap.keys()));
        
        // Try exact match first
        if (programHeadMap.has(programName)) {
          const exactMatch = programHeadMap.get(programName);
          console.log('Exact match found:', exactMatch);
          return exactMatch;
        }
        
        // Try partial matches with better logic
        for (const [department, programHead] of programHeadMap.entries()) {
          const programLower = programName.toLowerCase();
          const deptLower = department.toLowerCase();
          
          // Check if program name contains department or vice versa
          if (programLower.includes(deptLower) || deptLower.includes(programLower)) {
            console.log('Partial match found:', { department, programName, programHead });
            return programHead;
          }
          
          // Check for common variations
          const programWords = programLower.split(/\s+/);
          const deptWords = deptLower.split(/\s+/);
          
          // Check if any words match
          const hasCommonWords = programWords.some(word => 
            deptWords.some(deptWord => 
              word.includes(deptWord) || deptWord.includes(word)
            )
          );
          
          if (hasCommonWords) {
            console.log('Word-based match found:', { department, programName, programHead });
            return programHead;
          }
        }
        
        console.log('No program head found for:', programName);
        return null;
      };
      
             // Create programs array with student counts
       (allProgramsData || []).forEach(program => {
         const studentCount = programStudentCountMap.get(program.id) || 0;
         const programHead = findProgramHead(program.name);
         programsArray.push({
           id: program.id,
           name: program.name, // Use the real program name from database
           code: program.name, // Use the full program name instead of major or truncated version
           description: program.description, // Use the real description from database
           major: program.major,
           is_active: program.is_active,
           studentCount: studentCount,
           programHead: programHead || undefined
         });
       });
      
      // Sort programs by name
      programsArray.sort((a, b) => a.name.localeCompare(b.name));
      
      // Debug: Check final programs array before setting state
      console.log('Final programs array before setting state:');
      programsArray.forEach((program, index) => {
        console.log(`Final Program ${index + 1}:`, {
          id: program.id,
          name: program.name,
          code: program.code,
          description: program.description,
          major: program.major,
          is_active: program.is_active,
          studentCount: program.studentCount,
          programHead: program.programHead
        });
      });
      
      setPrograms(programsArray);
      
      console.log('Programs created:', programsArray.length);
      if (programsArray.length > 0) {
        console.log('Sample programs:', programsArray.slice(0, 3));
      }
      
      // Check for missing data
      // Note: skip logging gradesWithoutEnrollments to keep console clean and linter satisfied
      
      // Removed unused enrollmentsWithoutTeachers calculation to satisfy linter
      // Note: silently tolerate missing teacher assignments; UI falls back to 'Not Assigned'
      
      console.log('=== END SUMMARY ===');
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    }
    
    setLoading(false);
  };







  // Smart back function that goes to the previous step
  const handleGoBack = () => {
    const currentHistory = [...navigationHistory];
    const previousStep = currentHistory[currentHistory.length - 2]; // Get the previous step
    
    if (previousStep === 'programs') {
      setShowPrograms(true);
      setShowYearLevels(false);
      setShowSections(false);
    setShowSubjects(false);
      setSelectedProgram('');
    setSelectedYearLevel('');
    setSelectedSection('');
    setSelectedSubject('');
      setNavigationHistory(['programs']);
    } else if (previousStep === 'yearLevels') {
      setShowPrograms(false);
      setShowYearLevels(true);
      setShowSections(false);
      setShowSubjects(false);
      setSelectedSection('');
      setSelectedSubject('');
      setNavigationHistory(currentHistory.slice(0, -1));
    } else if (previousStep === 'sections') {
      setShowPrograms(false);
      setShowYearLevels(false);
      setShowSections(true);
      setShowSubjects(false);
      setSelectedSubject('');
      setNavigationHistory(currentHistory.slice(0, -1));
    } else if (previousStep === 'subjects') {
      setShowPrograms(false);
      setShowYearLevels(false);
      setShowSections(false);
      setShowSubjects(true);
      setSelectedSubject('');
      setNavigationHistory(currentHistory.slice(0, -1));
    } else if (previousStep === 'students') {
      setShowPrograms(false);
      setShowYearLevels(false);
      setShowSections(false);
      setShowSubjects(true);
      setSelectedSubject('');
      setNavigationHistory(currentHistory.slice(0, -1));
    } else if (previousStep === 'emptyProgram') {
      // Going back from empty program state to programs list
      setShowPrograms(true);
      setShowYearLevels(false);
      setShowSections(false);
      setShowSubjects(false);
      setShowEmptyProgram(false);
      setSelectedProgram('');
      setSelectedYearLevel('');
      setSelectedSection('');
      setSelectedSubject('');
      setNavigationHistory(['programs']);
    } else {
      // Default fallback to programs
      setShowPrograms(true);
      setShowYearLevels(false);
      setShowSections(false);
      setShowSubjects(false);
      setSelectedProgram('');
      setSelectedYearLevel('');
      setSelectedSection('');
      setSelectedSubject('');
      setNavigationHistory(['programs']);
    }
  };

  // New function to handle program card clicks
  const handleProgramClick = async (programId: string) => {
    const selectedProgramData = programs.find(p => p.id === programId);
    
    // Always check the database for current student count
    try {
      console.log('Checking database for students in program:', programId);
      
      // Get the program name to match with department
      const programName = selectedProgramData?.name;
      if (!programName) {
        console.error('Program name not found for ID:', programId);
        return;
      }
      
      // Count students from user_profiles that match this program's department
      const { data: programStudents, error: programCheckError } = await supabase
        .from('user_profiles')
        .select('id, department')
        .eq('role', 'student')
        .eq('department', programName)
        .not('department', 'is', null);
        
      if (programCheckError) {
        console.error('Error checking program students:', programCheckError);
        // Fallback to using cached data
        if (selectedProgramData && selectedProgramData.studentCount === 0) {
          setShowEmptyProgram(true);
        } else {
          setShowYearLevels(true);
        }
        return;
      }
      
      const actualStudentCount = programStudents?.length || 0;
      
      console.log('Database check - Program:', programName, 'Actual students found:', actualStudentCount);
      
      if (actualStudentCount === 0) {
        // No students found in database - show empty state
        setSelectedProgram(programId);
        setShowPrograms(false);
        setShowYearLevels(false);
        setShowSections(false);
        setShowSubjects(false);
        setShowEmptyProgram(true);
        setNavigationHistory(prev => [...prev, 'emptyProgram']);
      } else {
        // Students found in database - proceed with normal navigation
        setSelectedProgram(programId);
        setShowPrograms(false);
        setShowYearLevels(true);
        setShowEmptyProgram(false);
        setNavigationHistory(prev => [...prev, 'yearLevels']);
      }
    } catch (error) {
      console.error('Error in handleProgramClick:', error);
      // Fallback to using cached data
      if (selectedProgramData && selectedProgramData.studentCount === 0) {
        setShowEmptyProgram(true);
      } else {
        setShowYearLevels(true);
      }
    }
  };

  // New function to handle year level card clicks
  const handleYearLevelClick = (yearLevel: string) => {
    setSelectedYearLevel(yearLevel);
    setShowYearLevels(false);
    setShowSections(true);
    setNavigationHistory(prev => [...prev, 'sections']);
  };

  // New function to handle section card clicks
  const handleSectionClick = (section: string) => {
    setSelectedSection(section);
    setShowSections(false);
    setShowSubjects(true);
    setNavigationHistory(prev => [...prev, 'subjects']);
  };

  // New function to handle subject selection
  const handleSubjectClick = (subject: string) => {
    setSelectedSubject(subject);
    setShowSubjects(false);
    setNavigationHistory(prev => [...prev, 'students']);
  };







  // Get filtered students based on selection
  const getFilteredStudents = () => {
    if (!selectedYearLevel || !selectedSection || !selectedSubject) return [];
    
    let filtered = grades.filter(grade => 
      grade.year_level === selectedYearLevel && 
      grade.section === selectedSection &&
      grade.course_code === selectedSubject
    );
    
    // Apply search filter if search term exists
    if (studentSearchTerm.trim()) {
      filtered = filtered.filter(grade => 
        (grade.student_name || '').toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        (grade.school_id || '').toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }
    
    // Sort by student name
    filtered.sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));
    
    console.log('Filtered students:', filtered.length, 'for', selectedYearLevel, 'Section', selectedSection, 'Subject', selectedSubject, 'Search:', studentSearchTerm);
    return filtered;
  };

  // Bulk action handlers
  const handleBulkRelease = async () => {
    const filteredStudents = getFilteredStudents();
    if (filteredStudents.length === 0) return;
    
    setBulkUpdating(true);
    
    try {
      const { error } = await supabase
        .from('grades')
        .update({ is_released: true })
        .in('id', filteredStudents.map(s => s.id));
      
      if (!error) {
        setGrades((prev) =>
          prev.map((g) =>
            filteredStudents.some(s => s.id === g.id) ? { ...g, is_released: true } : g
          )
        );
        
        toast.success(`Released grades for ${filteredStudents.length} students`);
      } else {
        toast.error('Failed to release grades');
      }
    } catch {
      toast.error('Failed to release grades');
    }
    
    setBulkUpdating(false);
  };

  const handleBulkHide = async () => {
    const filteredStudents = getFilteredStudents();
    if (filteredStudents.length === 0) return;
    
    setBulkUpdating(true);
    
    try {
      const { error } = await supabase
        .from('grades')
        .update({ is_released: false })
        .in('id', filteredStudents.map(s => s.id));
      
      if (!error) {
        setGrades((prev) =>
          prev.map((g) =>
            filteredStudents.some(s => s.id === g.id) ? { ...g, is_released: false } : g
          )
        );
        
        toast.success(`Hidden grades for ${filteredStudents.length} students`);
      } else {
        toast.error('Failed to hide grades');
      }
    } catch {
      toast.error('Failed to hide grades');
    }
    
    setBulkUpdating(false);
  };

  // Stats
  const totalGrades = grades.length;
  const releasedGrades = grades.filter(g => g.is_released).length;
  const pendingGrades = grades.filter(g => !g.is_released).length;

  // Get students for a given combination (year, section, subject) - filtered by selected program
  const getStudentsForCombination = (yearLevel: string, section: string, subject: string) => {
    const selectedProgramName = programs.find(p => p.id === selectedProgram)?.name;
    return grades
      .filter(g => 
        g.program_name === selectedProgramName &&
        g.year_level === yearLevel && 
        g.section === section && 
        g.course_code === subject
      )
      .slice(0, 8); // cap to 8 avatars for layout
  };

  // Get total student count for a combination - filtered by selected program
  const getTotalStudentCount = (yearLevel: string, section: string, subject: string) => {
    const selectedProgramName = programs.find(p => p.id === selectedProgram)?.name;
    return grades
      .filter(g => 
        g.program_name === selectedProgramName &&
        g.year_level === yearLevel && 
        g.section === section && 
        g.course_code === subject
      )
      .length;
  };

  return (
    <div className="min-h-screen from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-2xl mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Grade Release Control</h1>
                <p className="text-white/80 text-sm font-medium">Control when student grades become visible. Toggle to release or hide grades for each record.</p>
              </div>
            </div>

          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/90 rounded-2xl p-6 shadow-sm border border-blue-200/50 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-sm font-semibold uppercase tracking-wide mb-1">Total Grades</p>
                <p className="text-4xl font-bold text-blue-900">{totalGrades}</p>
                <p className="text-blue-600 text-xs mt-1">All grade records</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/90 rounded-2xl p-6 shadow-sm border border-amber-200/50 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-700 text-sm font-semibold uppercase tracking-wide mb-1">Pending</p>
                <p className="text-4xl font-bold text-amber-900">{pendingGrades}</p>
                <p className="text-amber-600 text-xs mt-1">Awaiting release</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/90 rounded-2xl p-6 shadow-sm border border-emerald-200/50 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-700 text-sm font-semibold uppercase tracking-wide mb-1">Released</p>
                <p className="text-4xl font-bold text-emerald-900">{releasedGrades}</p>
                <p className="text-emerald-600 text-xs mt-1">Visible to students</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-gray-500 font-medium">Loading grades...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 rounded-xl p-6 text-center font-semibold">{error}</div>
                ) : showPrograms ? (
          // Fast Selection Interface
          <div className="bg-white/90 rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-between mb-4">
                <div></div> {/* Left spacer */}
                                  <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Quick Grade Management</h2>
                    <p className="text-gray-600">Click on any program to view and manage student grades</p>
                  </div>
                  <div></div> {/* Right spacer */}
              </div>
            </div>
            
            <div className="max-w-6xl mx-auto">

              
                             {/* Quick Selection Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {programs
                   .map((program) => (
                                      <div
                      key={program.id}
                      onClick={() => handleProgramClick(program.id)}
                      className={`rounded-xl p-6 border transition-all duration-200 cursor-pointer transform hover:scale-105 ${
                        program.studentCount > 0 
                          ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 hover:border-blue-400 hover:shadow-lg' 
                          : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            program.studentCount > 0 ? 'bg-blue-500' : 'bg-gray-400'
                          }`}></div>
                          <span className={`text-sm font-medium ${
                            program.studentCount > 0 ? 'text-blue-700' : 'text-gray-600'
                          }`}>
                            {program.name}
                          </span>
                        </div>
                        {/* Program Status and Student Count */}
                        <div className="flex flex-col items-end gap-1">
                          {/* Simple student count display */}
                          {program.studentCount === 0 ? (
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              No Students
                            </span>
                          ) : (
                            <span 
                              className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full cursor-help"
                              title={`${program.studentCount} student${program.studentCount !== 1 ? 's' : ''} with EXACT department match to "${program.name}"`}
                            >
                              {program.studentCount} student{program.studentCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    
                                         <div className="space-y-2">
                       <div className="flex items-start justify-between gap-3">
                         <div className="text-sm text-gray-600 flex-1" style={{ 
                           display: '-webkit-box',
                           WebkitLineClamp: 2,
                           WebkitBoxOrient: 'vertical',
                           overflow: 'hidden',
                           textOverflow: 'ellipsis'
                         }}>
                           {/* Show description if available, otherwise show a default message */}
                           {program.studentCount === 0 
                             ? 'No students currently enrolled in this program'
                             : (program.description || `Program in ${program.name}`)
                           }
                         </div>
                         
                         {/* Program Head Avatar - Right Side */}
                         {program.programHead ? (
                           <div className="flex flex-col items-center gap-1 flex-shrink-0">
                             <img
                               src={program.programHead.avatar_url || "/img/user-avatar.png"}
                               alt={program.programHead.display_name}
                               className="w-16 h-16 rounded-full border-2 border-blue-200 shadow-sm"
                               onError={(e) => {
                                 const target = e.target as HTMLImageElement;
                                 target.src = "/img/user-avatar.png";
                               }}
                             />
                             <span className="text-xs font-medium text-gray-700 text-center max-w-[60px] truncate">
                               {program.programHead.display_name}
                             </span>
                           </div>
                         ) : program.studentCount === 0 ? (
                           <div className="flex flex-col items-center gap-1 flex-shrink-0">
                             <div className="w-16 h-16 rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                               <Users className="w-8 h-8 text-gray-400" />
                             </div>
                             <span className="text-xs font-medium text-gray-500 text-center max-w-[60px] truncate">
                               No Program Head
                             </span>
                           </div>
                         ) : null}
                  </div>

                       <div className="flex items-center">
                         {/* Program icon */}
                         <div className={`w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                           program.studentCount > 0 ? 'bg-blue-100' : 'bg-gray-100'
                         }`}>
                           <GraduationCap className={`w-4 h-4 ${
                             program.studentCount > 0 ? 'text-blue-600' : 'text-gray-500'
                           }`} />
                         </div>
                       </div>
                     </div>
                    
                    <div className={`mt-4 pt-3 border-t ${
                      program.studentCount > 0 ? 'border-blue-200' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{program.studentCount > 0 ? 'Click to view' : 'No students to view'}</span>
                        <GraduationCap className={`w-4 h-4 ${
                          program.studentCount > 0 ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              

              
                             {(() => {
                 if (programs.length === 0) {
                   return (
                     <div className="text-center py-12">
                       <div className="text-gray-400 mb-4">
                         <GraduationCap className="w-16 h-16 mx-auto" />
                       </div>
                       <h3 className="text-lg font-semibold text-gray-600 mb-2">No Programs Available</h3>
                       <p className="text-gray-500">
                         "No programs found in the database. Please check if the programs table exists and contains data."
                       </p>
                       <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                         <p className="text-sm text-yellow-800">
                           <strong>Debug Info:</strong> Check the browser console for database connection details.
                         </p>
                       </div>
                     </div>
                   );
                 }
                 return null;
               })()}
              

            </div>
          </div>
                 ) : showEmptyProgram ? (
                   // Empty Program State
                   <div className="space-y-6">
                     {/* Back Button and Header */}
                     <div className="flex items-center justify-between">
                       <button
                         onClick={handleGoBack}
                         className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                       >
                         <ChevronRight className="w-4 h-4 rotate-180" />
                         Back to Programs
                       </button>
                       <div className="text-center flex-1">
                         <div className="bg-gradient-to-r from-gray-600 to-slate-600 text-white px-8 py-4 rounded-xl shadow-lg inline-block">
                           <h2 className="text-2xl font-bold">
                             {programs.find(p => p.id === selectedProgram)?.name || 'Unknown Program'}
                           </h2>
                           <p className="text-white/80 text-base mt-2">This program currently has no enrolled students</p>
                         </div>
                       </div>
                       <div className="w-32"></div> {/* Spacer to balance the layout */}
                     </div>
                     
                     {/* Empty Program State */}
                     <div className="bg-white/90 rounded-2xl shadow-lg border border-gray-100 p-12">
                       <div className="text-center">
                         <div className="text-gray-400 mb-6">
                           <Users className="w-24 h-24 mx-auto" />
                         </div>
                         <h3 className="text-2xl font-semibold text-gray-700 mb-4">No Students Enrolled</h3>
                         <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
                           The program <strong>{programs.find(p => p.id === selectedProgram)?.name || 'Unknown Program'}</strong> currently has no enrolled students. 
                           This could be because:
                         </p>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8">
                           <div className="text-left p-4 bg-gray-50 rounded-lg">
                             <h4 className="font-semibold text-gray-700 mb-2">• New Program</h4>
                             <p className="text-gray-600 text-sm">This program may be newly created and not yet open for enrollment.</p>
                           </div>
                           <div className="text-left p-4 bg-gray-50 rounded-lg">
                             <h4 className="font-semibold text-gray-700 mb-2">• No Current Enrollment</h4>
                             <p className="text-gray-600 text-sm">Students may not have enrolled in this program for the current academic period.</p>
                           </div>
                           <div className="text-left p-4 bg-gray-50 rounded-lg">
                             <h4 className="font-semibold text-gray-700 mb-2">• Program Status</h4>
                             <p className="text-gray-600 text-sm">The program might be inactive or temporarily closed for enrollment.</p>
                           </div>
                           <div className="text-left p-4 bg-gray-50 rounded-lg">
                             <h4 className="font-semibold text-gray-700 mb-2">• Data Sync</h4>
                             <p className="text-gray-600 text-sm">Student enrollment data may not be synchronized with the grades system.</p>
                           </div>
                         </div>
                         <div className="flex items-center justify-center gap-4">
                           <button
                             onClick={handleGoBack}
                             className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                           >
                             Back to Programs
                           </button>
                    <button
                      onClick={() => {
                               setShowPrograms(true);
                               setShowYearLevels(false);
                               setShowSections(false);
                               setShowSubjects(false);
                               setShowEmptyProgram(false);
                               setSelectedProgram('');
                               setSelectedYearLevel('');
                               setSelectedSection('');
                               setSelectedSubject('');
                               setNavigationHistory(['programs']);
                             }}
                             className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                           >
                             View All Programs
                    </button>
                </div>
                       </div>
                     </div>
                   </div>
                 ) : showYearLevels ? (
           // Year Level Selection Interface
           <div className="space-y-6">
             {/* Back Button and Header */}
             <div className="flex items-center justify-between">
               <button
                 onClick={handleGoBack}
                 className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
               >
                 <ChevronRight className="w-4 h-4 rotate-180" />
                 Back to Programs
               </button>
               <div className="text-center flex-1">
                 <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl shadow-lg inline-block">
                   <h2 className="text-2xl font-bold">
                     {selectedProgram ? programs.find(p => p.id === selectedProgram)?.name || 'Unknown Program' : 'Select a Program'}
                   </h2>
                   <p className="text-white/80 text-base mt-2">Select a year level to view sections and subjects</p>
                 </div>
               </div>
               <div className="w-32"></div> {/* Spacer to balance the layout */}
              </div>
              
             <div className="bg-white/90 rounded-2xl shadow-lg border border-gray-100 p-8">
               <div className="text-center mb-8">
             
               </div>
             
             <div className="max-w-6xl mx-auto">
               
               
               {/* Year Level Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {(() => {
                   // Get unique year levels for the selected program
                   const selectedProgramName = programs.find(p => p.id === selectedProgram)?.name;
                   const programYearLevels = Array.from(new Set(
                     yearLevelSectionSubjects
                       .filter(item => {
                         // Filter by selected program using grades data
                         const hasStudentsInProgram = grades.some(g => 
                           g.program_name === selectedProgramName &&
                           g.year_level === item.year_level &&
                           g.section === item.section &&
                           g.course_code === item.subject
                         );
                         return hasStudentsInProgram;
                       })
                       .map(item => item.year_level)
                   )).sort();
                   
                   return programYearLevels.map((yearLevel) => {
                     // Count students for this year level in the selected program
                     const studentCount = grades.filter(g => 
                       g.program_name === selectedProgramName &&
                       g.year_level === yearLevel
                     ).length;
                     
                     return (
                       <div
                         key={yearLevel}
                         onClick={() => handleYearLevelClick(yearLevel)}
                         className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                             <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                             <span className="text-sm font-medium text-green-700">
                               {getYearLevelDisplayName(yearLevel)}
                        </span>
                      </div>
                           <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                             {studentCount} students
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-lg font-bold text-gray-800">
                             {(() => {
                               const sections = Array.from(new Set(
                                 yearLevelSectionSubjects
                                   .filter(item => item.year_level === yearLevel)
                                   .map(item => item.section)
                               ));
                               return `${sections.length} section${sections.length !== 1 ? 's' : ''}`;
                             })()}
                      </div>
                      <div className="flex -space-x-2 items-center">
                             {/* Year level icon */}
                             <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-white shadow-sm flex items-center justify-center">
                               <BookOpen className="w-4 h-4 text-green-600" />
                             </div>
                        {(() => {
                               const totalCount = studentCount;
                          
                          if (totalCount === 0) {
                            return <span className="text-sm font-medium text-gray-500">No students</span>;
                               } else if (totalCount > 1) {
                            return (
                                   <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-white shadow-sm flex items-center justify-center">
                                     <span className="text-xs font-bold text-green-600">+{totalCount - 1}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    
                         <div className="mt-4 pt-3 border-t border-green-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Click to view</span>
                             <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                     );
                   });
                 })()}
              </div>
              
              {(() => {
                 const programYearLevels = Array.from(new Set(
                   yearLevelSectionSubjects.map(item => item.year_level)
                 ));
                 
                 if (programYearLevels.length === 0) {
                   return (
                     <div className="text-center py-12">
                       <div className="text-gray-400 mb-4">
                         <BookOpen className="w-16 h-16 mx-auto" />
                       </div>
                       <h3 className="text-lg font-semibold text-gray-600 mb-2">No Data Available</h3>
                       <p className="text-gray-500">No year levels found for this program.</p>
                     </div>
                   );
                 }
                 
                 return null;
               })()}
             </div>
           </div>
                  </div>
         ) : showSections ? (
           // Sections Selection Interface
           <div className="space-y-6">
             {/* Back Button and Header */}
             <div className="flex items-center justify-between">
               <button
                 onClick={handleGoBack}
                 className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
               >
                 <ChevronRight className="w-4 h-4 rotate-180" />
                 Back to Year Levels
               </button>
               <div className="text-center flex-1">
                 <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl shadow-lg inline-block">
                   <h2 className="text-2xl font-bold">
                     {selectedProgram ? programs.find(p => p.id === selectedProgram)?.name || 'Unknown Program' : 'Select a Program'} -{selectedYearLevel}
                   </h2>
                   <p className="text-white/80 text-base mt-2">Select a section to view subjects</p>
                 </div>
               </div>
               <div className="w-32"></div> {/* Spacer to balance the layout */}
             </div>
             
             <div className="bg-white/90 rounded-2xl shadow-lg border border-gray-100 p-8">
               <div className="text-center mb-8">
                
               </div>
               
               <div className="max-w-6xl mx-auto">
                 {/* Sections Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                   {(() => {
                     // Get unique sections for the selected year level and program
                     const selectedProgramName = programs.find(p => p.id === selectedProgram)?.name;
                     const yearLevelSections = Array.from(new Set(
                       yearLevelSectionSubjects
                         .filter(item => item.year_level === selectedYearLevel)
                         .filter(item => {
                           // Filter by selected program using grades data
                           const hasStudentsInProgram = grades.some(g => 
                             g.program_name === selectedProgramName &&
                             g.year_level === item.year_level &&
                             g.section === item.section &&
                             g.course_code === item.subject
                           );
                           return hasStudentsInProgram;
                         })
                         .map(item => item.section)
                     )).sort();
                     
                     return yearLevelSections.map((section) => {
                       // Count students for this section in the selected program and year level
                       const studentCount = grades.filter(g => 
                         g.program_name === selectedProgramName &&
                         g.year_level === selectedYearLevel &&
                         g.section === section
                       ).length;
                
                return (
                         <div
                           key={section}
                           onClick={() => handleSectionClick(section)}
                           className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                         >
                           <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-2">
                               <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                               <span className="text-sm font-medium text-purple-700">
                                 Section {getSectionDisplayName(section)}
                               </span>
                             </div>
                             <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                               {studentCount} students
                             </span>
                           </div>
                           
                           <div className="space-y-2">
                             <div className="text-lg font-bold text-gray-800">
                               {(() => {
                                 const subjects = Array.from(new Set(
                                   yearLevelSectionSubjects
                                     .filter(item => item.year_level === selectedYearLevel && item.section === section)
                                     .map(item => item.subject)
                                 ));
                                 return `${subjects.length} subject${subjects.length !== 1 ? 's' : ''}`;
                               })()}
                             </div>
                             <div className="flex -space-x-2 items-center">
                               {/* Section icon */}
                               <div className="w-6 h-6 rounded-full bg-purple-100 border-2 border-white shadow-sm flex items-center justify-center">
                                 <Users className="w-4 h-4 text-purple-600" />
                               </div>
                               {(() => {
                                 const totalCount = studentCount;
                                 
                                 if (totalCount === 0) {
                                   return <span className="text-sm font-medium text-gray-500">No students</span>;
                                 } else if (totalCount > 1) {
                                   return (
                                     <div className="w-6 h-6 rounded-full bg-purple-100 border-2 border-white shadow-sm flex items-center justify-center">
                                       <span className="text-xs font-bold text-purple-600">+{totalCount - 1}</span>
                  </div>
                );
                                 }
                                 return null;
              })()}
                             </div>
                           </div>
                           
                           <div className="mt-4 pt-3 border-t border-purple-200">
                             <div className="flex items-center justify-between text-xs text-gray-500">
                               <span>Click to view</span>
                               <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                         </div>
                       );
                     });
                   })()}
                 </div>
                 

                 
                 {(() => {
                   const yearLevelSections = Array.from(new Set(
                     yearLevelSectionSubjects
                       .filter(item => item.year_level === selectedYearLevel)
                       .map(item => item.section)
                   ));
                   
                   if (yearLevelSections.length === 0) {
                     return (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                           <Users className="w-16 h-16 mx-auto" />
                    </div>
                         <h3 className="text-lg font-semibold text-gray-600 mb-2">No Data Available</h3>
                         <p className="text-gray-500">No sections found for this year level.</p>
                  </div>
                     );
                   }
                   

              })()}
               </div>
            </div>
          </div>
        ) : showSubjects ? (
          // Subjects List View
          <div className="space-y-6">
            {/* Back Button and Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleGoBack}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to Sections
              </button>
              <div className="text-center flex-1">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl shadow-lg inline-block">
                  <h2 className="text-2xl font-bold">
                    {selectedProgram ? programs.find(p => p.id === selectedProgram)?.name || 'Unknown Program' : 'Select a Program'} -{selectedYearLevel} Section {getSectionDisplayName(selectedSection)}
                  </h2>
                  <p className="text-white/80 text-base mt-2">Select a subject to view enrolled students and grades</p>
                </div>
              </div>
              <div className="w-32"></div> {/* Spacer to balance the layout */}
            </div>

            {/* Subjects Grid */}
            <div className="bg-white/90 rounded-2xl shadow-lg border border-gray-100 p-8">
              {/* Search Bar for Subjects */}
              <div className="mb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[260px]">
                    <input
                      type="text"
                      placeholder="Search subjects by name or description..."
                      value={subjectSearchTerm}
                      onChange={(e) => setSubjectSearchTerm(e.target.value)}
                      className="w-full h-12 px-4 pl-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/90"
                    />
                    <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                  </div>

                  {/* Clear Filters Button */}
                  {subjectSearchTerm && (
                    <button
                      onClick={() => setSubjectSearchTerm('')}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                
                {/* Search Results Counter */}
                {subjectSearchTerm && (
                  <div className="text-sm text-gray-600 mt-2">
                    Showing {(() => {
                      const filteredSubjects = yearLevelSectionSubjects
                        .filter(item => 
                          item.year_level === selectedYearLevel && 
                          item.section === selectedSection &&
                          (item.subject.toLowerCase().includes(subjectSearchTerm.toLowerCase()) ||
                           (item.subject_name && item.subject_name.toLowerCase().includes(subjectSearchTerm.toLowerCase())))
                        );
                      return filteredSubjects.length;
                    })()} of {yearLevelSectionSubjects.filter(item => 
                      item.year_level === selectedYearLevel && 
                      item.section === selectedSection
                    ).length} subjects
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {yearLevelSectionSubjects
                  .filter(item => 
                    item.year_level === selectedYearLevel && 
                    item.section === selectedSection &&
                    (!subjectSearchTerm || 
                     item.subject.toLowerCase().includes(subjectSearchTerm.toLowerCase()) ||
                     (item.subject_name && item.subject_name.toLowerCase().includes(subjectSearchTerm.toLowerCase())))
                  )
                  .map((item) => (
                    <div
                      key={`${item.year_level}-${item.section}-${item.subject}`}
                      onClick={() => handleSubjectClick(item.subject)}
                      className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-700">
                            {item.subject}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          {item.studentCount} students
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-lg font-bold text-gray-800">
                          {item.subject_name}
                        </div>
                        {/* Removed year level and section line as requested */}
                        <div className="flex -space-x-2 items-center">
                          {getStudentsForCombination(item.year_level, item.section, item.subject).map((s) => (
                            <img
                              key={s.id}
                              src={s.avatar_url || "/img/user-avatar.png"}
                              alt={s.student_name || 'Student'}
                              title={s.student_name || ''}
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/img/user-avatar.png";
                              }}
                            />
                          ))}
                          {(() => {
                            const totalCount = getTotalStudentCount(item.year_level, item.section, item.subject);
                            const displayedCount = getStudentsForCombination(item.year_level, item.section, item.subject).length;
                            
                            if (totalCount === 0) {
                              return <span className="text-sm font-medium text-gray-500">No students</span>;
                            } else if (totalCount > displayedCount) {
                              return (
                                <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-white shadow-sm flex items-center justify-center">
                                  <span className="text-xs font-bold text-green-600">+{totalCount - displayedCount}</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-green-200">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Click to view students</span>
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              
              {(() => {
                const totalSubjects = yearLevelSectionSubjects.filter(item => 
                item.year_level === selectedYearLevel && 
                item.section === selectedSection
                );
                
                const filteredSubjects = totalSubjects.filter(item => 
                  !subjectSearchTerm || 
                  item.subject.toLowerCase().includes(subjectSearchTerm.toLowerCase()) ||
                  (item.subject_name && item.subject_name.toLowerCase().includes(subjectSearchTerm.toLowerCase()))
                );
                
                if (totalSubjects.length === 0) {
                  return (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <BookOpen className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Subjects Available</h3>
                  <p className="text-gray-500">No subjects found for the selected year level and section.</p>
                </div>
                  );
                } else if (filteredSubjects.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <Search className="w-16 h-16 mx-auto" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No Search Results</h3>
                      <p className="text-gray-500">No subjects match your search criteria. Try adjusting your search terms.</p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        ) : (
          // Students List View
          <div className="space-y-6">
            {/* Back Button and Header */}
            <div className="flex items-center justify-between">
              <button
                 onClick={handleGoBack}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                 Back
              </button>
              <div className="text-center flex-1">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl shadow-lg inline-block">
                  <h2 className="text-2xl font-bold">
                    {selectedProgram ? programs.find(p => p.id === selectedProgram)?.name || 'Unknown Program' : 'Select a Program'} -{selectedYearLevel} Section {getSectionDisplayName(selectedSection)}
                  </h2>
                  {getFilteredStudents().length > 0 && (
                    <div className="mt-3 text-base font-medium">
                      <span className="mr-6">
                        Subject: {(() => {
                          const student = getFilteredStudents()[0];
                          const courseCode = student?.course_code;
                          if (courseCode && courseCode !== 'Unknown') {
                            return courseCode;
                          }
                          
                          // Debug: Show why course_code is missing
                          console.log('Header Debug - Student data:', {
                            id: student?.id,
                            student_id: student?.student_id,
                            course_code: student?.course_code,
                            course_id: student?.course_id
                          });
                          
                          return courseCode || 'Unknown (Check console for debug info)';
                        })()}
                      </span>
                      <span>
                        Instructor: {(() => {
                          const student = getFilteredStudents()[0];
                          const teacherName = student?.teacher_name;
                          if (teacherName && teacherName !== 'Not Assigned') {
                            return teacherName;
                          }
                          
                          // Debug: Show why teacher_name is missing
                          console.log('Header Debug - Teacher lookup:', {
                            student_id: student?.student_id,
                            year_level: student?.year_level,
                            section: student?.section,
                            teacher_name: student?.teacher_name
                          });
                          
                          return teacherName || 'Not Assigned (Check console for debug info)';
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-32"></div> {/* Spacer to balance the layout */}
            </div>

            {/* Students Table - Only show when both year level and section are selected */}
            {selectedYearLevel && selectedSection ? (
              <div className="bg-white/90 rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Search Bar for Students */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700">
                        {getFilteredStudents().length} students in {selectedProgram ? programs.find(p => p.id === selectedProgram)?.name || 'Unknown Program' : 'Select a Program'} -{selectedYearLevel} Section {getSectionDisplayName(selectedSection)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleBulkRelease}
                        disabled={bulkUpdating}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          bulkUpdating
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
                        }`}
                      >
                        {bulkUpdating ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating...
                          </div>
                        ) : (
                          'Release All Grades'
                        )}
                      </button>
                      <button
                        onClick={handleBulkHide}
                        disabled={bulkUpdating}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          bulkUpdating
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:shadow-lg'
                        }`}
                      >
                        {bulkUpdating ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating...
                          </div>
                        ) : (
                          'Hide All Grades'
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Student Search Bar */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                      <input
                        type="text"
                        placeholder="Search students by name..."
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        className="w-full h-10 px-4 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                    
                    {/* Clear Search Button */}
                    {studentSearchTerm && (
                      <button
                        onClick={() => setStudentSearchTerm('')}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {/* Search Results Counter */}
                  {studentSearchTerm && (
                    <div className="text-sm text-gray-600 mt-2">
                      Showing {getFilteredStudents().length} of {grades.filter(grade => 
                        grade.year_level === selectedYearLevel && 
                        grade.section === selectedSection &&
                        grade.course_code === selectedSubject
                      ).length} students
                    </div>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold">Student Name</th>
                        <th className="px-6 py-4 text-left font-semibold">Student ID</th>
                        <th className="px-6 py-4 text-center font-semibold">Status</th>

                        <th className="px-6 py-4 text-center font-semibold">Prelim</th>
                        <th className="px-6 py-4 text-center font-semibold">Midterm</th>
                        <th className="px-6 py-4 text-center font-semibold">Final</th>
                        <th className="px-6 py-4 text-center font-semibold">GA</th>
                        <th className="px-6 py-4 text-center font-semibold">Release Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getFilteredStudents().map((grade, index) => (
                        <tr key={grade.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white/90' : 'bg-gray-50'}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={grade.avatar_url || "/img/user-avatar.png"}
                                alt={grade.student_name || 'Student'}
                                className="w-10 h-10 rounded-full border-2 border-gray-200 shadow-sm"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/img/user-avatar.png";
                                }}
                              />
                              <div className="font-semibold text-gray-900">
                                {grade.student_name || 'Unknown Student'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {grade.school_id || grade.student_id}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {grade.student_type || 'Unknown'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-lg">
                              {grade.prelim_grade ?? '-'}
                              {(grade.prelim_grade === null || grade.prelim_grade === undefined) && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-lg">
                              {grade.midterm_grade ?? '-'}
                              {(grade.midterm_grade === null || grade.midterm_grade === undefined) && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-lg">
                              {grade.final_grade ?? '-'}
                              {(grade.final_grade === null || grade.final_grade === undefined) && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-xl text-blue-800">
                              {grade.general_average !== null && grade.general_average !== undefined 
                                ? grade.general_average.toFixed(2) 
                                : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {grade.is_released ? (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Released
                              </span>
                            ) : (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Select Year Level & Section</h3>
                <p className="text-gray-500">Please select both year level and section to view students.</p>
              </div>
            )}

            {/* Empty State - Only show when both are selected but no students found */}
            {selectedYearLevel && selectedSection && getFilteredStudents().length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No students found</h3>
                <p className="text-gray-500">No students available for the selected year level and section.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
