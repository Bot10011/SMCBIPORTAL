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
  
  // Navigation history to track the flow
  const [navigationHistory, setNavigationHistory] = useState<string[]>(['programs']);

  const [yearLevelSectionSubjects, setYearLevelSectionSubjects] = useState<YearLevelSectionSubject[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  
  // State for search and filtering - separate states for different views
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // State for bulk actions
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Helper function to convert section UUIDs to readable names
  const getSectionDisplayName = (sectionValue: string): string => {
    console.log('Converting section:', sectionValue);
    
    // If it's already a simple letter (A, B, C, D), return as is
    if (/^[A-Z]$/.test(sectionValue)) {
      console.log('Section is already a letter:', sectionValue);
      return sectionValue;
    }
    
    // If it's a UUID, convert to a readable format
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sectionValue)) {
      // Extract first 8 characters and make it readable
      const shortId = sectionValue.substring(0, 8);
      const result = `Section ${shortId.toUpperCase()}`;
      console.log('Converted UUID to:', result);
      return result;
    }
    
    // If it's neither, return as is
    console.log('Section is neither letter nor UUID, returning as is:', sectionValue);
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
      const { data: studentsData, error: studentsError } = await supabase
        .from('user_profiles')
        .select('id, student_id, display_name, avatar_url, year_level, section, program_id, student_status, enrollment_status, student_type')
        .eq('role', 'student')
        .not('year_level', 'is', null)
        .not('section', 'is', null);
        
      if (studentsError) {
        console.error('Students error:', studentsError);
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
        .select('*')
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
        const student = studentMap.get(g.student_id);
        const mapYearLevelToNumericString = (num?: number | null, fallback?: string | null): string => {
          if (num === 1) return '1';
          if (num === 2) return '2';
          if (num === 3) return '3';
          if (num === 4) return '4';
          const fb = (fallback ?? '').toString();
          return ['1', '2', '3', '4'].includes(fb) ? fb : 'Unknown';
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
          // Normalize year_level to '1' | '2' | '3' | '4'
          year_level: mapYearLevelToNumericString((g as { year_level?: number | null }).year_level, student?.year_level),
          section: (() => {
            const sectionValue = (g as { section?: string | null }).section || student?.section || 'Unknown';
            console.log('Processing section for student:', g.student_id, 'Value:', sectionValue);
            return sectionValue;
          })(),
          program_name: student?.program_id ? programMap.get(student.program_id)?.name || 'Unknown Program' : 'Unknown Program',
          program_code: student?.program_id ? programMap.get(student.program_id)?.code || 'UNK' : 'UNK',
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
            const compositeKey = `${g.subject_id || ''}-${(g as { section?: string | null; year_level?: number | null }).section || ''}-${mapYearLevelToNumericString((g as { year_level?: number | null }).year_level as number | null, student?.year_level)}`;
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
      
      // Create year level, section, and subject combinations
      const yearLevelSectionSubjectMap = new Map<string, Map<string, Set<string>>>();
      
      processedGrades.forEach(grade => {
        // Only process grades with valid year_level and section (not "Unknown")
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
      
      // First, get all active programs from the programs table
      console.log('Fetching programs from database...');
      console.log('Query: SELECT id, name, description, major, is_active FROM programs WHERE is_active = true ORDER BY name');
      
      const { data: allProgramsData, error: allProgramsError } = await supabase
        .from('programs')
        .select('id, name, description, major, is_active')
        .eq('is_active', true)
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
      
      // Try to fetch program heads with different approaches
      let programHeadsData = null;
      
      // Approach 1: Try with 'program_head' role and department column
      console.log('Trying to fetch with role = "program_head" and department column...');
      const { data: programHeads1, error: error1 } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url, department')
        .eq('role', 'program_head')
        .not('department', 'is', null);
        
      if (error1) {
        console.error('Error with role = "program_head" and department:', error1);
      } else {
        console.log('Program heads with role "program_head" and department:', programHeads1?.length || 0);
        if (programHeads1 && programHeads1.length > 0) {
          programHeadsData = programHeads1;
          console.log('Sample program head data:', programHeads1[0]);
        }
      }
      
      // Approach 2: Try with 'programhead' role and department column
      if (!programHeadsData || programHeadsData.length === 0) {
        console.log('Trying to fetch with role = "programhead" and department column...');
        const { data: programHeads2, error: error2 } = await supabase
          .from('user_profiles')
          .select('id, display_name, avatar_url, department')
          .eq('role', 'programhead')
          .not('department', 'is', null);
          
        if (error2) {
          console.error('Error with role = "programhead" and department:', error2);
        } else {
          console.log('Program heads with role "programhead" and department:', programHeads2?.length || 0);
          if (programHeads2 && programHeads2.length > 0) {
            programHeadsData = programHeads2;
            console.log('Sample program head data:', programHeads2[0]);
          }
        }
      }
      
      // Approach 3: Try to fetch all users to see the structure
      if (!programHeadsData || programHeadsData.length === 0) {
        console.log('Trying to fetch all users to see structure...');
        const { data: allUsers, error: error3 } = await supabase
          .from('user_profiles')
          .select('id, display_name, avatar_url, role')
          .limit(5);
          
        if (error3) {
          console.error('Error fetching all users:', error3);
        } else {
          console.log('Sample users from user_profiles:', allUsers);
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
      
      // If no active programs found, try to fetch all programs to see what's available
      if (!allProgramsData || allProgramsData.length === 0) {
        console.log('No active programs found, trying to fetch all programs...');
        
        // Try different approaches to fetch programs
        let fallbackPrograms = null;
        
        // First try without is_active filter
        console.log('Trying to fetch all programs without is_active filter...');
        const { data: allProgramsFallback1, error: fallbackError1 } = await supabase
          .from('programs')
          .select('id, name, description, major, is_active')
          .order('name');
          
        if (fallbackError1) {
          console.error('Error fetching all programs (fallback 1):', fallbackError1);
          
          // Try with just basic fields
          console.log('Trying to fetch programs with basic fields only...');
          const { data: allProgramsFallback2, error: fallbackError2 } = await supabase
            .from('programs')
            .select('id, name')
            .order('name');
            
          if (fallbackError2) {
            console.error('Error fetching programs with basic fields:', fallbackError2);
          } else {
            fallbackPrograms = allProgramsFallback2;
            console.log('Basic programs fetched:', fallbackPrograms?.length || 0);
          }
        } else {
          fallbackPrograms = allProgramsFallback1;
          console.log('All programs (including inactive):', fallbackPrograms?.length || 0);
          if (fallbackPrograms && fallbackPrograms.length > 0) {
            console.log('Sample program data (fallback):', fallbackPrograms[0]);
            console.log('Program statuses:', fallbackPrograms.map(p => ({ id: p.id, name: p.name, is_active: p.is_active })));
          }
        }
        
        // If we found programs in fallback, use them
        if (fallbackPrograms && fallbackPrograms.length > 0) {
          console.log('Using fallback programs data');
          const fallbackProgramsArray: Program[] = [];
          
          fallbackPrograms.forEach(program => {
            const studentCount = programStudentCountMap.get(program.id) || 0;
            const programData = program as { id: string; name: string; description?: string; major?: string; is_active?: boolean };
            const programHead = findProgramHead(programData.name);
            fallbackProgramsArray.push({
              id: programData.id,
              name: programData.name,
              code: programData.name, // Use the full program name instead of major or truncated version
              description: programData.description,
              major: programData.major,
              is_active: programData.is_active !== false,
              studentCount: studentCount,
              programHead: programHead || undefined
            });
          });
          
          fallbackProgramsArray.sort((a, b) => a.name.localeCompare(b.name));
          setPrograms(fallbackProgramsArray);
          setLoading(false);
          return;
        }
        
        // Still set empty programs array if none found
        setPrograms([]);
        setLoading(false);
        return;
      }
      
      // Create a map to count students per program
      const programStudentCountMap = new Map<string, number>();
      
      // Count students for each program
      (studentsData || []).forEach(student => {
        if (student.program_id) {
          const currentCount = programStudentCountMap.get(student.program_id) || 0;
          programStudentCountMap.set(student.program_id, currentCount + 1);
        }
      });
      
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
      
      // Create a mapping function to link programs to program heads
      const findProgramHead = (programName: string) => {
        // Try exact match first
        if (programHeadMap.has(programName)) {
          return programHeadMap.get(programName);
        }
        
        // Try partial matches
        for (const [department, programHead] of programHeadMap.entries()) {
          if (programName.toLowerCase().includes(department.toLowerCase()) || 
              department.toLowerCase().includes(programName.toLowerCase())) {
            return programHead;
          }
        }
        
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
  const handleProgramClick = (programId: string) => {
    setSelectedProgram(programId);
    setShowPrograms(false);
    setShowYearLevels(true);
    setNavigationHistory(prev => [...prev, 'yearLevels']);
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

  // Get students for a given combination (year, section, subject)
  const getStudentsForCombination = (yearLevel: string, section: string, subject: string) => {
    return grades
      .filter(g => g.year_level === yearLevel && g.section === section && g.course_code === subject)
      .slice(0, 8); // cap to 8 avatars for layout
  };

  // Get total student count for a combination
  const getTotalStudentCount = (yearLevel: string, section: string, subject: string) => {
    return grades
      .filter(g => g.year_level === yearLevel && g.section === section && g.course_code === subject)
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
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Quick Grade Management</h2>
              <p className="text-gray-600">Click on any program to view and manage student grades</p>
            </div>
            
            <div className="max-w-6xl mx-auto">

              
                             {/* Quick Selection Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {programs
                   .filter(program => {
                     // Only show active programs
                     const isActive = program.is_active !== false; // Default to true if not specified
                     
                     return isActive;
                   })
                   .map((program) => (
                  <div
                    key={program.id}
                    onClick={() => handleProgramClick(program.id)}
                    className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                  >
                                        <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-700">
                        {program.name}
                      </span>
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
                           {program.description || `Program in ${program.name}`}
                         </div>
                         
                         {/* Program Head Avatar - Right Side */}
                         {program.programHead && (
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
                         )}
                       </div>
                       
                       <div className="flex items-center">
                         {/* Program icon */}
                         <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center">
                           <GraduationCap className="w-4 h-4 text-blue-600" />
                         </div>
                       </div>
                     </div>
                    
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Click to view</span>
                        <GraduationCap className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              

              
                             {(() => {
                 const activePrograms = programs.filter(p => p.is_active !== false);
                 if (activePrograms.length === 0) {
                   return (
                     <div className="text-center py-12">
                       <div className="text-gray-400 mb-4">
                         <GraduationCap className="w-16 h-16 mx-auto" />
                       </div>
                       <h3 className="text-lg font-semibold text-gray-600 mb-2">No Programs Available</h3>
                       <p className="text-gray-500">
                         {programs.length === 0 
                           ? "No programs found in the database. Please check if the programs table exists and contains data."
                           : "No active programs found. All programs may be marked as inactive."
                         }
                       </p>
                       {programs.length === 0 && (
                         <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                           <p className="text-sm text-yellow-800">
                             <strong>Debug Info:</strong> Check the browser console for database connection details.
                           </p>
                         </div>
                       )}
                     </div>
                   );
                 }
                 return null;
               })()}
              

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
                   const programYearLevels = Array.from(new Set(
                     yearLevelSectionSubjects
                       .map(item => item.year_level)
                   )).sort();
                   
                   return programYearLevels.map((yearLevel) => {
                     const studentCount = yearLevelSectionSubjects
                       .filter(item => item.year_level === yearLevel)
                       .reduce((total, item) => total + item.studentCount, 0);
                     
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
                               Year {yearLevel}
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
                     // Get unique sections for the selected year level
                     const yearLevelSections = Array.from(new Set(
                       yearLevelSectionSubjects
                         .filter(item => item.year_level === selectedYearLevel)
                         .map(item => item.section)
                     )).sort();
                     
                     return yearLevelSections.map((section) => {
                       const studentCount = yearLevelSectionSubjects
                         .filter(item => item.year_level === selectedYearLevel && item.section === section)
                         .reduce((total, item) => total + item.studentCount, 0);
                       
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
