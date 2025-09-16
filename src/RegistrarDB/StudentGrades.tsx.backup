import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  is_approved: boolean;
  is_locked: boolean;
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
    department: string;
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

interface Student {
  id: string;
  student_id: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  avatar_url?: string;
  year_level: string;
  section: string;
  program_id: string;
  department?: string;
  student_status?: string;
  enrollment_status?: string;
  student_type?: string;
}

export default function StudentGrades() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Silence non-error console output while this component is mounted
  useEffect(() => {
    const originalConsole = {
      log: console.log,
      info: console.info,
      debug: console.debug,
      warn: console.warn,
      group: console.group,
      groupEnd: console.groupEnd,
      table: console.table,
    } as const;

    const noop = () => {};

    const originalGroup = console.group;
    const originalGroupEnd = console.groupEnd;
    const originalTable = console.table;

    console.log = noop as typeof console.log;
    console.info = noop as typeof console.info;
    console.debug = noop as typeof console.debug;
    console.warn = noop as typeof console.warn;
    console.group = noop as typeof console.group;
    console.groupEnd = noop as typeof console.groupEnd;
    console.table = noop as typeof console.table;

    return () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
      console.warn = originalConsole.warn;
      console.group = originalGroup;
      console.groupEnd = originalGroupEnd;
      console.table = originalTable;
    };
  }, []);
  
  // State for selection interface
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [showPrograms, setShowPrograms] = useState(true);
  const [showYearLevels, setShowYearLevels] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [showSubjects, setShowSubjects] = useState(false);
  const [showEmptyProgram, setShowEmptyProgram] = useState(false);
  
  // Professional navigation stack system
  const [navigationStack, setNavigationStack] = useState<string[]>(['programs']);
  const [currentStackIndex, setCurrentStackIndex] = useState(0);

  const [yearLevelSectionSubjects, setYearLevelSectionSubjects] = useState<YearLevelSectionSubject[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  
  // State for search and filtering - separate states for different views
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // State for bulk actions
  const [bulkUpdating, setBulkUpdating] = useState(false);
  
  // State for section mapping
  const [sectionMap, setSectionMap] = useState<Map<string, string>>(new Map());
  const [sectionsList, setSectionsList] = useState<Array<{ id: string; name: string; year_level?: string | number | null }>>([]);
  // Released grades modal state
  const [releasedModalOpen, setReleasedModalOpen] = useState(false);
  const [releasedModalGroup, setReleasedModalGroup] = useState<{
    year: string;
    section: string;
    items: Grade[];
    department?: string;
  } | null>(null);
  const [releasedModalUpdating, setReleasedModalUpdating] = useState(false);
  const [releasedModalSearch, setReleasedModalSearch] = useState('');
  
  // Grade Change Request state
  const [instructorRequests, setInstructorRequests] = useState<Array<{
    id: string;
    student_id: string;
    student_name?: string | null;
    instructor_id?: string | null;
    instructor_name?: string | null;
    subject_id?: string | null;
    section?: string | null;
    academic_year?: string | null;
    edit_reason?: string | null;
    edit_status?: string | null;
    created_at?: string | null;
  }>>([]);
  
  // Request details modal state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{
    id: string;
    student_id: string;
    student_name?: string | null;
    instructor_id?: string | null;
    instructor_name?: string | null;
    subject_id?: string | null;
    section?: string | null;
    academic_year?: string | null;
    edit_reason?: string | null;
    edit_status?: string | null;
    created_at?: string | null;
  } | null>(null);
  
  // Confirmation modal state
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<'approve' | 'deny' | 'hide' | null>(null);
  const [confirmationRequestId, setConfirmationRequestId] = useState<string | null>(null);

  // Hide confirmation modal state
  const [hideConfirmationOpen, setHideConfirmationOpen] = useState(false);

  // Subjects sourced from courses table for the selected year level
  const [courseSubjects, setCourseSubjects] = useState<Array<{
    id: string;
    code: string;
    name: string;
    unit?: number | null;
    year_level?: string | number | null;
    summer?: boolean | null;
    semester?: string | null;
  }>>([]);

  // Count of courses for the selected year level (used in Sections view)
  const [coursesCount, setCoursesCount] = useState<number>(0);

  // State for enrolled students display
  const [enrolledStudents, setEnrolledStudents] = useState<Array<{
    id: string;
    student_id: string;
    first_name: string;
    last_name: string;
    enrollment_status: string;
  }>>([]);
  const [loadingEnrolledStudents, setLoadingEnrolledStudents] = useState(false);

  // State for instructor and subject information
  const [instructorInfo, setInstructorInfo] = useState<{
    instructor_name: string;
    subject_name: string;
    course_code: string;
  } | null>(null);

  // State for instructor error tracking (value not used, only setter)
  const [, setInstructorErrors] = useState<{
    duplicateInstructors: Array<{
      instructorId: string;
      instructorName: string;
      sections: string[];
      yearLevels: string[];
      courseId: string;
      courseCode: string;
    }>;
    missingInstructors: Array<{
      courseId: string;
      courseCode: string;
      section: string;
      yearLevel: string;
    }>;
    mappingErrors: Array<{
      teacherId: string;
      instructorId: string;
      section: string;
      yearLevel: string;
      error: string;
    }>;
    fallbackInstructors: Array<{
      instructorId: string;
      instructorName: string;
      sections: string[];
      yearLevels: string[];
      courseId: string;
      courseCode: string;
      reason: string;
    }>;
  }>({
    duplicateInstructors: [],
    missingInstructors: [],
    mappingErrors: [],
    fallbackInstructors: []
  });

  const handleHideReleasedGroup = () => {
    if (!releasedModalGroup || releasedModalUpdating) return;
    setHideConfirmationOpen(true);
  };

  const confirmHideReleasedGroup = async () => {
    if (!releasedModalGroup || releasedModalUpdating) return;
    
    try {
      setReleasedModalUpdating(true);
      const ids = releasedModalGroup.items.map((i) => i.id);
      const { error } = await supabase
        .from('grades')
        .update({ is_released: false })
        .in('id', ids);
      if (error) {
        toast.error('Failed to hide released grades');
      } else {
        setGrades((prev) => prev.map((g) => (ids.includes(g.id) ? { ...g, is_released: false } : g)));
        toast.success(`Successfully moved ${releasedModalGroup.items.length} grades back to pending`);
        setReleasedModalOpen(false);
        setHideConfirmationOpen(false);
      }
    } catch {
      toast.error('Failed to hide released grades');
    } finally {
      setReleasedModalUpdating(false);
    }
  };
  
  const printReleasedGrades = () => {
    if (!releasedModalGroup) return;

    // Filter the data based on search term
    const filteredData = releasedModalGroup.items
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.updated_at || a.graded_at || a.created_at).getTime();
        const bDate = new Date(b.updated_at || b.graded_at || b.created_at).getTime();
        return bDate - aDate;
      })
      .filter((g) => {
        if (!releasedModalSearch.trim()) return true;
        const q = releasedModalSearch.toLowerCase();
        const name = (g.student_name || '').toLowerCase();
        const schoolId = (g.school_id || g.student_id || '').toLowerCase();
        return name.includes(q) || schoolId.includes(q);
      });

    // Generate the HTML content for printing
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Released Grades Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
            }
            .header-logo {
              margin-bottom: 15px;
            }
            .header-logo img {
              max-height: 80px;
              max-width: 200px;
              object-fit: contain;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 24px;
            }
            .header p {
              margin: 5px 0 0 0;
              color: #666;
            }
            .info-section {
              margin-bottom: 20px;
              background: #f8fafc;
              padding: 15px;
              border-radius: 8px;
            }
            .info-section h3 {
              margin: 0 0 10px 0;
              color: #374151;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 8px;
            }
            .info-item {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #6b7280;
            }
            .info-value {
              color: #111827;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              background: white;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 12px 8px;
              text-align: left;
            }
            th {
              background: #f3f4f6;
              font-weight: bold;
              color: #374151;
              text-transform: uppercase;
              font-size: 12px;
            }
            td {
              font-size: 14px;
            }
            .grade-cell {
              text-align: center;
              font-weight: bold;
            }
            .ga-cell {
              text-align: center;
              font-weight: bold;
              color: #2563eb;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-logo">
              <img src="/img/logo3.png" alt="School Logo" />
            </div>
            <h1>Released Grades Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>

          <div class="info-section">
            <h3>Report Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Department:</span>
                <span class="info-value">${releasedModalGroup.department || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Year & Section:</span>
                <span class="info-value">${releasedModalGroup.section}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Total Records:</span>
                <span class="info-value">${filteredData.length}</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Subject</th>
                <th>Prelim</th>
                <th>Midterm</th>
                <th>Final</th>
                <th>GA</th>
                <th>Released Date</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(g => `
                <tr>
                  <td>${g.student_name || 'Unknown Student'}</td>
                  <td>${g.school_id || g.student_id || 'N/A'}</td>
                  <td>${g.course_code || 'Unknown'}</td>
                  <td class="grade-cell">${g.prelim_grade !== null && g.prelim_grade !== undefined ? g.prelim_grade : '-'}</td>
                  <td class="grade-cell">${g.midterm_grade !== null && g.midterm_grade !== undefined ? g.midterm_grade : '-'}</td>
                  <td class="grade-cell">${g.final_grade !== null && g.final_grade !== undefined ? g.final_grade : '-'}</td>
                  <td class="ga-cell">${g.general_average !== null && g.general_average !== undefined ? g.general_average.toFixed(2) : '-'}</td>
                  <td>${new Date(g.updated_at || g.graded_at || g.created_at).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>This report was generated from the Student Portal Grade Management System</p>
            <p>For questions or concerns, please contact the Registrar's Office</p>
          </div>
        </body>
      </html>
    `;

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to print the document');
      return;
    }

    // Write the content to the new window
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      
      // Close the window after printing
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };

    toast.success('Print dialog opened');
  };

  const downloadReleasedGrades = () => {
    if (!releasedModalGroup) return;

    // Filter the data based on search term
    const filteredData = releasedModalGroup.items
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.updated_at || a.graded_at || a.created_at).getTime();
        const bDate = new Date(b.updated_at || b.graded_at || b.created_at).getTime();
        return bDate - aDate;
      })
      .filter((g) => {
        if (!releasedModalSearch.trim()) return true;
        const q = releasedModalSearch.toLowerCase();
        const name = (g.student_name || '').toLowerCase();
        const schoolId = (g.school_id || g.student_id || '').toLowerCase();
        return name.includes(q) || schoolId.includes(q);
      });

    // Create CSV content
    const csvData = [
      ['Student Name', 'Student ID', 'Subject', 'Prelim', 'Midterm', 'Final', 'GA', 'Released Date'],
      ...filteredData.map(g => [
        g.student_name || 'Unknown Student',
        g.school_id || g.student_id || 'N/A',
        g.course_code || 'Unknown',
        g.prelim_grade !== null && g.prelim_grade !== undefined ? g.prelim_grade : '-',
        g.midterm_grade !== null && g.midterm_grade !== undefined ? g.midterm_grade : '-',
        g.final_grade !== null && g.final_grade !== undefined ? g.final_grade : '-',
        g.general_average !== null && g.general_average !== undefined ? g.general_average.toFixed(2) : '-',
        new Date(g.updated_at || g.graded_at || g.created_at).toLocaleDateString()
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Released_Grades_${releasedModalGroup.year}_${releasedModalGroup.section}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Grades downloaded successfully');
  };
  

  


  // Debug effect to track students state changes
  useEffect(() => {
    console.group('🔄 Students State Changed');
    console.log('Students count:', students.length);
    console.log('Selected program:', selectedProgram);
    console.log('Sample students:', students.slice(0, 3));
    console.groupEnd();
  }, [students, selectedProgram]);

  // Helper function to normalize year level values
  const normalizeYearLevel = (yearLevel: string | number): string => {
    if (typeof yearLevel === 'number') {
      return yearLevel.toString();
    }
    
    const yearLevelStr = yearLevel.toString().toLowerCase();
    
    // Handle various formats
    if (yearLevelStr.includes('1st') || yearLevelStr === '1' || yearLevelStr === 'first') {
      return '1';
    }
    if (yearLevelStr.includes('2nd') || yearLevelStr === '2' || yearLevelStr === 'second') {
      return '2';
    }
    if (yearLevelStr.includes('3rd') || yearLevelStr === '3' || yearLevelStr === 'third') {
      return '3';
    }
    if (yearLevelStr.includes('4th') || yearLevelStr === '4' || yearLevelStr === 'fourth') {
      return '4';
    }
    
    // If it's already a single digit, return it
    if (/^[1-4]$/.test(yearLevelStr)) {
      return yearLevelStr;
    }
    
    return yearLevelStr; // Return as-is if no match
  };

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
  const getSectionDisplayName = (sectionValue: string, sectionMap?: Map<string, string>): string => {
    // If we have a section map, try to get the name from it first
    if (sectionMap && sectionMap.has(sectionValue)) {
      return sectionMap.get(sectionValue)!;
    }
    
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

  // Professional navigation functions
  const updateUIForStep = useCallback((step: string) => {
    // Reset all views
    setShowPrograms(false);
    setShowYearLevels(false);
    setShowSections(false);
    setShowSubjects(false);
    setShowEmptyProgram(false);

    switch (step) {
      case 'programs':
        setShowPrograms(true);
        setSelectedProgram('');
        setSelectedYearLevel('');
        setSelectedSection('');
        setSelectedSubject('');
        break;
      case 'yearLevels':
        setShowYearLevels(true);
        setSelectedSection('');
        setSelectedSubject('');
        break;
      case 'sections':
        setShowSections(true);
        setSelectedSubject('');
        break;
      case 'subjects':
        setShowSubjects(true);
        break;
      case 'students':
        // Students view - no additional UI changes needed
        break;
      case 'emptyProgram':
        setShowEmptyProgram(true);
        setSelectedProgram('');
        setSelectedYearLevel('');
        setSelectedSection('');
        setSelectedSubject('');
        break;
    }
  }, []);

  const navigateTo = useCallback((step: string) => {
    const newStack = [...navigationStack];
    const newIndex = currentStackIndex + 1;
    
    // If we're navigating forward from a previous position, remove future steps
    if (newIndex < newStack.length) {
      newStack.splice(newIndex);
    }
    
    // Add new step to stack
    newStack.push(step);
    
    setNavigationStack(newStack);
    setCurrentStackIndex(newIndex);
    
    // Update UI based on step
    updateUIForStep(step);
  }, [navigationStack, currentStackIndex, updateUIForStep]);

  // Fetch instructor grade-edit requests
  useEffect(() => {
    fetchInstructorRequests();
  }, []);

  // Handle URL parameters for direct navigation to specific student
  useEffect(() => {
    const studentId = searchParams.get('studentId');
    const subjectId = searchParams.get('subjectId');
    
    if (studentId && subjectId && grades.length > 0) {
      // Find the grade record for this student and subject
      const targetGrade = grades.find(g => 
        g.student_id === studentId && 
        g.subject_id === subjectId
      );
      
      if (targetGrade) {
        // Check if we're already showing this student to prevent duplicate navigation
        const isAlreadyShowing = 
          selectedProgram === programs.find(p => p.name === targetGrade.program_name)?.id &&
          selectedYearLevel === targetGrade.year_level &&
          selectedSection === targetGrade.section &&
          selectedSubject === targetGrade.course_code &&
          studentSearchTerm === targetGrade.student_name;
        
        if (!isAlreadyShowing) {
          // Find the program ID by matching the program name
          const program = programs.find(p => p.name === targetGrade.program_name);
          if (program) {
            setSelectedProgram(program.id);
          }
          
          setSelectedYearLevel(targetGrade.year_level || '');
          setSelectedSection(targetGrade.section || '');
          setSelectedSubject(targetGrade.course_code || '');
          
          // Navigate to the students view
          navigateTo('students');
          
          // Set search term to highlight the specific student
          setStudentSearchTerm(targetGrade.student_name || '');
          
          // Show a toast notification only once
          toast.success(`Navigated to ${targetGrade.student_name}'s grade change request`, {
            duration: 3000,
            id: `navigate-${studentId}-${subjectId}` // Use unique ID to prevent duplicates
          });
        }
      }
    }
  }, [searchParams, grades, programs, navigateTo, selectedProgram, selectedYearLevel, selectedSection, selectedSubject, studentSearchTerm]);

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
      // We'll filter by department after we get the program head information
      const { data: studentsData, error: initialStudentsError } = await supabase
        .from('user_profiles')
        .select('id, student_id, display_name, first_name, last_name, middle_name, avatar_url, year_level, section, program_id, department, student_status, enrollment_status, student_type')
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
      
      // Store students data in state (will be filtered later by department)
      setStudents(studentsData || []);
      
      // Fetch sections data to map UIDs to names and drive Sections UI
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, name, year_level');
        
      if (sectionsError) {
        console.error('Sections error:', sectionsError);
      }
      
      // Create a map of section UIDs to section names
      const sectionMap = new Map<string, string>();
      if (sectionsData) {
        sectionsData.forEach(section => {
          sectionMap.set(section.id, section.name);
        });
        console.log('Section map created:', sectionMap.size, 'entries');
        setSectionsList(sectionsData as Array<{ id: string; name: string; year_level?: string | number | null }>);
      }
      
      // Set section map in state for use in UI
      setSectionMap(sectionMap);
      
      // Get unique year level and section combinations
      const yearLevelSectionMap = new Map<string, Set<string>>();
      const studentMap = new Map();
      
      (studentsData || []).forEach(student => {
        if (student.year_level && student.section) {
          // Convert section UID to name if available
          const sectionName = sectionMap.get(student.section) || student.section;
          
          if (!yearLevelSectionMap.has(student.year_level)) {
            yearLevelSectionMap.set(student.year_level, new Set());
          }
          yearLevelSectionMap.get(student.year_level)!.add(sectionName);
          studentMap.set(student.id, { ...student, section: sectionName });
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
      // Run grades and enrollments queries in parallel for speed
      const [gradesRes, enrollRes] = await Promise.all([
        supabase
          .from('grades')
          .select(`
            *,
            student:user_profiles!grades_student_id_fkey (
              id, 
              student_id, 
              display_name, 
              first_name,
              last_name,
              middle_name,
              avatar_url, 
              department, 
              student_status, 
              enrollment_status, 
              student_type,
              program_id
            )
          `)
          .in('student_id', studentIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('enrollcourse')
          .select(`
            id,
            student_id,
            subject_id,
            status,
            course:courses (id, code, name)
          `)
          .in('student_id', studentIds)
      ]);

      const gradesData = gradesRes.data as typeof gradesRes.data;
      const gradesError = gradesRes.error;
      const enrollmentsData = enrollRes.data as typeof enrollRes.data;
      const enrollmentsError = enrollRes.error;

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

      // Fetch teacher display names and course codes concurrently
      const teachersById = new Map<string, { display_name?: string; first_name?: string; last_name?: string }>();
      const coursesById = new Map<string, { code?: string; name?: string }>();
      if (gradedByIds.length > 0 || subjectIdsFromGrades.length > 0) {
        const [teachersRes, coursesRes] = await Promise.all([
          gradedByIds.length > 0
            ? supabase
                .from('user_profiles')
                .select('id, display_name, first_name, last_name')
                .in('id', gradedByIds as string[])
            : Promise.resolve({ data: [], error: null } as { data: Array<{ id: string; display_name?: string; first_name?: string; last_name?: string }>; error: null }),
          subjectIdsFromGrades.length > 0
            ? supabase
                .from('courses')
                .select('id, code, name')
                .in('id', subjectIdsFromGrades as string[])
            : Promise.resolve({ data: [], error: null } as { data: Array<{ id: string; code?: string; name?: string }>; error: null })
        ]);

        (teachersRes.data || []).forEach(t => teachersById.set(t.id, { display_name: t.display_name, first_name: t.first_name, last_name: t.last_name }));
        (coursesRes.data || []).forEach(c => coursesById.set(c.id, { code: c.code, name: c.name }));
      }
      
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
      
      // Merge subject ids from enrollments and grades for teacher_subjects lookup
      const subjectIdsForTeacherQuery = Array.from(new Set([...(courseIds as string[]), ...(subjectIdsFromGrades as string[])]));
      
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
        .in('subject_id', subjectIdsForTeacherQuery)
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
          .in('subject_id', subjectIdsForTeacherQuery)
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
          teacher: teacher,
          teacher_display_name: teacher?.display_name,
          teacher_first_name: teacher?.first_name,
          teacher_last_name: teacher?.last_name
        });
        
        // Create a composite key for more specific matching
        const key = `${ts.subject_id}-${ts.section}-${normalizedYear}`;
        teacherMap.set(key, teacher);
        
        // Also store by just subject_id for fallback
        teacherMap.set(ts.subject_id, teacher);
        
        console.log('Added to teacher map:', {
          compositeKey: key,
          subjectIdKey: ts.subject_id,
          teacherName: teacher?.display_name || `${teacher?.first_name} ${teacher?.last_name}` || 'Unknown'
        });
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
          .eq('role', 'instructor');
          
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
        
        // Helper function to get student name
        const getStudentName = (studentData: {display_name?: string, first_name?: string, last_name?: string, middle_name?: string}) => {
          if (studentData?.display_name && studentData.display_name.trim() !== '') {
            return studentData.display_name;
          }
          
          // Fallback to concatenating first_name, last_name, middle_name
          const firstName = studentData?.first_name || '';
          const lastName = studentData?.last_name || '';
          const middleName = studentData?.middle_name || '';
          
          const nameParts = [firstName, middleName, lastName].filter(part => part.trim() !== '');
          return nameParts.length > 0 ? nameParts.join(' ') : 'Unknown Student';
        };
        
        // Calculate General Average - only when all three grades are present
        const hasPrelim = g.prelim_grade !== null && g.prelim_grade !== undefined;
        const hasMidterm = g.midterm_grade !== null && g.midterm_grade !== undefined;
        const hasFinal = g.final_grade !== null && g.final_grade !== undefined;
        
        const general_average = (hasPrelim && hasMidterm && hasFinal) 
          ? Math.round(((g.prelim_grade + g.midterm_grade + g.final_grade) / 3) * 100) / 100
          : null;
        
        // Get enrollment data for this student and subject
        const enrollmentKey = `${g.student_id}-${g.subject_id || ''}`;
        const enrollment = enrollmentMap.get(enrollmentKey);
        
        // Convert section UID to name if available
        const sectionName = sectionMap.get(g.section || '') || g.section || 'Unknown';
        
        return {
          ...g,
          student_name: getStudentName(student),
          avatar_url: student?.avatar_url || null,
          school_id: student?.student_id || g.student_id,
          general_average,
          // Use year_level from grades table (integer) and convert to string
          year_level: mapYearLevelToNumericString(g.year_level),
          // Use section name from map instead of UID
          section: sectionName,
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
            // Debug: Log the teacher lookup process
            console.log('Teacher lookup for grade:', {
              grade_id: g.id,
              student_id: g.student_id,
              subject_id: g.subject_id,
              section: g.section,
              year_level: g.year_level,
              sectionName,
              graded_by: g.graded_by
            });
            
            // Prefer graded_by profile display_name only
            if (g.graded_by) {
              const t = teachersById.get(g.graded_by);
              console.log('Found teacher by graded_by:', t);
              if (t && t.display_name && t.display_name.trim()) return t.display_name.trim();
            }
            
            // Fallback to teacherMap using composite key subject_id-section-year
            const compositeKey = `${g.subject_id || ''}-${sectionName}-${mapYearLevelToNumericString(g.year_level)}`;
            console.log('Trying composite key:', compositeKey);
            console.log('Available teacher map keys:', Array.from(teacherMap.keys()));
            
            // Try multiple key combinations to find the teacher
            let mappedTeacher = teacherMap.get(compositeKey);
            if (!mappedTeacher && g.subject_id) {
              mappedTeacher = teacherMap.get(g.subject_id);
            }
            if (!mappedTeacher && g.subject_id && sectionName) {
              // Try without year level
              mappedTeacher = teacherMap.get(`${g.subject_id}-${sectionName}`);
            }
            if (!mappedTeacher && g.subject_id) {
              // Try with different year level formats
              const altYearLevel = g.year_level?.toString().toLowerCase().includes('1') ? '1' :
                                 g.year_level?.toString().toLowerCase().includes('2') ? '2' :
                                 g.year_level?.toString().toLowerCase().includes('3') ? '3' :
                                 g.year_level?.toString().toLowerCase().includes('4') ? '4' : null;
              if (altYearLevel) {
                mappedTeacher = teacherMap.get(`${g.subject_id}-${sectionName}-${altYearLevel}`);
              }
            }
            console.log('Mapped teacher result:', mappedTeacher);
            
            if (mappedTeacher && (mappedTeacher as { display_name?: string }).display_name && (mappedTeacher as { display_name?: string }).display_name!.trim()) {
              return (mappedTeacher as { display_name: string }).display_name.trim();
            }
            
            // Try to get teacher name from first_name + last_name if display_name is not available
            if (mappedTeacher && (mappedTeacher as { first_name?: string; last_name?: string }).first_name) {
              const teacher = mappedTeacher as { first_name?: string; last_name?: string };
              const fullName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim();
              if (fullName) {
                console.log('Using first_name + last_name:', fullName);
                return fullName;
              }
            }
            
            console.log('No teacher found, returning Not Assigned');
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
      const programHeadMap = new Map<string, { id: string; display_name: string; avatar_url?: string; department: string }>();
      (programHeadsData || []).forEach(programHead => {
        if (programHead.department) {
          programHeadMap.set(programHead.department, {
            id: programHead.id,
            display_name: programHead.display_name,
            avatar_url: programHead.avatar_url,
            department: programHead.department
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
      
      // Filter students by department matching program head departments
      console.group('🔍 DEPARTMENT FILTERING DEBUG');
      console.log('Total students before filtering:', studentsData?.length || 0);
      console.log('Programs array:', programsArray.map(p => ({ id: p.id, name: p.name, hasProgramHead: !!p.programHead })));
      
      const filteredStudents = (studentsData || []).filter(student => {
        // Find the program for this student
        const studentProgram = programsArray.find(p => p.id === student.program_id);
        
        console.log(`Student ${student.id}:`, {
          program_id: student.program_id,
          department: student.department,
          foundProgram: !!studentProgram,
          programName: studentProgram?.name,
          hasProgramHead: !!studentProgram?.programHead
        });
        
        if (!studentProgram || !studentProgram.programHead) {
          console.log(`❌ Student ${student.id} filtered out: No program or program head`);
          return false; // Skip students without program or program head
        }
        
        // Get the program head's department
        const programHeadDepartment = (studentProgram.programHead as { id: string; display_name: string; avatar_url?: string; department: string }).department;
        if (!programHeadDepartment) {
          console.log(`❌ Student ${student.id} filtered out: Program head has no department`);
          return false; // Skip if program head has no department
        }
        
        // Check if student's department matches program head's department
        const departmentMatch = student.department === programHeadDepartment;
        console.log(`Student ${student.id} department check:`, {
          studentDepartment: student.department,
          programHeadDepartment: programHeadDepartment,
          matches: departmentMatch
        });
        
        if (!departmentMatch) {
          console.log(`❌ Student ${student.id} filtered out: Department mismatch`);
        } else {
          console.log(`✅ Student ${student.id} passed department filter`);
        }
        
        return departmentMatch;
      });
      
      console.log('Students after filtering:', filteredStudents.length);
      console.log('Sample filtered students:', filteredStudents.slice(0, 3));
      console.groupEnd();
      
      // If department filtering removes all students, use all students as fallback
      const finalStudents = filteredStudents.length > 0 ? filteredStudents : (studentsData || []);
      
      if (filteredStudents.length === 0 && (studentsData || []).length > 0) {
        console.warn('⚠️ Department filtering removed all students. Using all students as fallback.');
        console.log('This might indicate an issue with department matching logic.');
      }
      
      console.log('Final students to store in state:', finalStudents.length);
      setStudents(finalStudents);
      
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







  const navigateBack = () => {
    if (currentStackIndex > 0) {
      const newIndex = currentStackIndex - 1;
      setCurrentStackIndex(newIndex);
      const step = navigationStack[newIndex];
      updateUIForStep(step);
    }
  };

  const navigateForward = () => {
    if (currentStackIndex < navigationStack.length - 1) {
      const newIndex = currentStackIndex + 1;
      setCurrentStackIndex(newIndex);
      const step = navigationStack[newIndex];
      updateUIForStep(step);
    }
  };

  // Check if back/forward navigation is available
  const canGoBack = currentStackIndex > 0;
  const canGoForward = currentStackIndex < navigationStack.length - 1;

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
        setSelectedYearLevel('');
        setSelectedSection('');
        setSelectedSubject('');
        navigateTo('emptyProgram');
      } else {
        // Students found in database - proceed with normal navigation
        setSelectedProgram(programId);
        setSelectedYearLevel('');
        setSelectedSection('');
        setSelectedSubject('');
        navigateTo('yearLevels');
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
    setSelectedSection('');
    setSelectedSubject('');
    // Clear instructor errors when changing year levels
    setInstructorErrors({
      duplicateInstructors: [],
      missingInstructors: [],
      mappingErrors: [],
      fallbackInstructors: []
    });
    navigateTo('sections');
  };

  // New function to handle section card clicks
  const handleSectionClick = (section: string) => {
    setSelectedSection(section);
    setSelectedSubject('');
    setSelectedCourseId('');
    // Clear instructor errors when changing sections
    setInstructorErrors({
      duplicateInstructors: [],
      missingInstructors: [],
      mappingErrors: [],
      fallbackInstructors: []
    });
    navigateTo('subjects');
  };

  // Function to track instructor errors and duplicates
  const trackInstructorErrors = useCallback(async (courseId: string, courseCode: string) => {
    try {
      console.log('=== INSTRUCTOR ERROR TRACKING START ===');
      
      // Get all teacher_subjects for this course across all sections and year levels
      const { data: allTeacherSubjects, error: allTeacherError } = await supabase
        .from('teacher_subjects')
        .select(`
          id,
          teacher_id,
          subject_id,
          section,
          year_level,
          teacher:user_profiles!teacher_subjects_teacher_id_fkey (id, display_name, first_name, last_name)
        `)
        .eq('subject_id', courseId)
        .eq('is_active', true);

      if (allTeacherError) {
        console.error('Error fetching all teacher subjects for tracking:', allTeacherError);
        return;
      }

      if (!allTeacherSubjects || allTeacherSubjects.length === 0) {
        console.log('No teacher subjects found for course:', courseId);
        return;
      }

      // Group by instructor ID to find duplicates
      const instructorMap = new Map<string, Array<{
        section: string;
        yearLevel: string;
        teacherId: string;
        instructorName: string;
      }>>();

      const duplicateInstructors: Array<{
        instructorId: string;
        instructorName: string;
        sections: string[];
        yearLevels: string[];
        courseId: string;
        courseCode: string;
      }> = [];

      const missingInstructors: Array<{
        courseId: string;
        courseCode: string;
        section: string;
        yearLevel: string;
      }> = [];

      const mappingErrors: Array<{
        teacherId: string;
        instructorId: string;
        section: string;
        yearLevel: string;
        error: string;
      }> = [];

      const fallbackInstructors: Array<{
        instructorId: string;
        instructorName: string;
        sections: string[];
        yearLevels: string[];
        courseId: string;
        courseCode: string;
        reason: string;
      }> = [];

      // Process each teacher subject entry
      allTeacherSubjects.forEach(ts => {
        const instructorId = ts.teacher_id;
        const teacher = Array.isArray(ts.teacher) ? ts.teacher[0] : (ts.teacher as { id?: string; display_name?: string; first_name?: string; last_name?: string } | null);
        const instructorName = teacher?.display_name || 
          `${teacher?.first_name || ''} ${teacher?.last_name || ''}`.trim() || 
          'Unknown Instructor';

        if (!instructorId) {
          missingInstructors.push({
            courseId,
            courseCode,
            section: ts.section,
            yearLevel: ts.year_level
          });
          return;
        }

        if (!instructorMap.has(instructorId)) {
          instructorMap.set(instructorId, []);
        }

        instructorMap.get(instructorId)!.push({
          section: ts.section,
          yearLevel: ts.year_level,
          teacherId: instructorId,
          instructorName
        });
      });

      // Teaching multiple sections/year levels is valid. No duplicate error flagged.
      // If you want to detect real conflicts (e.g., multiple distinct instructors for the same subject+section+year),
      // implement a separate check grouping by (section, yearLevel) and counting distinct instructor IDs.

      // Check for mapping errors
      allTeacherSubjects.forEach(ts => {
        if (ts.teacher_id && !ts.teacher) {
          mappingErrors.push({
            teacherId: ts.teacher_id,
            instructorId: ts.teacher_id,
            section: ts.section,
            yearLevel: ts.year_level,
            error: 'Teacher profile not found in user_profiles table'
          });
        }
      });

      // Update error state
      setInstructorErrors({
        duplicateInstructors,
        missingInstructors,
        mappingErrors,
        fallbackInstructors
      });

      console.log('=== INSTRUCTOR ERROR TRACKING RESULTS ===');
      console.log('Duplicate Instructors:', duplicateInstructors);
      console.log('Missing Instructors:', missingInstructors);
      console.log('Mapping Errors:', mappingErrors);
      console.log('Fallback Instructors:', fallbackInstructors);
      console.log('=== INSTRUCTOR ERROR TRACKING END ===');

    } catch (error) {
      console.error('Error in instructor error tracking:', error);
    }
  }, []);

  // Function to fetch instructor and subject information
  const fetchInstructorInfo = useCallback(async (courseId: string) => {
    if (!courseId || !selectedYearLevel || !selectedSection) {
      setInstructorInfo(null);
      return;
    }

    try {
      console.log('Fetching instructor info for course:', courseId, 'year:', selectedYearLevel, 'section:', selectedSection);

      // Get instructor assignment from teacher_subjects (first get all for this subject)
      const { data: allTeacherSubjectData, error: teacherSubjectError } = await supabase
        .from('teacher_subjects')
        .select(`
          id,
          subject_id,
          teacher_id,
          section,
          year_level
        `)
        .eq('subject_id', courseId);

      console.log('All teacher subject data for this course:', allTeacherSubjectData);
      console.log('Looking for section:', selectedSection, 'year level:', selectedYearLevel);

      if (teacherSubjectError) {
        console.error('Error fetching teacher subject:', teacherSubjectError);
        throw teacherSubjectError;
      }

      if (!allTeacherSubjectData || allTeacherSubjectData.length === 0) {
        console.log('No instructor assigned to this subject');
        setInstructorInfo(null);
        return;
      }

      // Filter by section and year level (handle text matching)
      let teacherSubjectData = allTeacherSubjectData.filter(ts => {
        const sectionMatch = ts.section === selectedSection;
        
        // Handle different year level formats
        const normalizeYear = (year: string | number) => {
          if (typeof year === 'number') return year.toString();
          const normalized = year.toLowerCase()
            .replace(/\s+/g, '')
            .replace('st', '')
            .replace('nd', '')
            .replace('rd', '')
            .replace('th', '')
            .replace('year', '');
          console.log(`Normalizing year: "${year}" -> "${normalized}"`);
          return normalized;
        };
        
        const normalizedSelectedYear = normalizeYear(selectedYearLevel);
        const normalizedDbYear = normalizeYear(ts.year_level);
        const yearMatch = normalizedSelectedYear === normalizedDbYear;
        
        console.log(`Teacher subject: section="${ts.section}" (${sectionMatch}), year="${ts.year_level}" (${yearMatch})`);
        console.log(`Year comparison: "${normalizedSelectedYear}" vs "${normalizedDbYear}"`);
        return sectionMatch && yearMatch;
      });

      console.log('Filtered teacher subject data:', teacherSubjectData);

      if (teacherSubjectData.length === 0) {
        console.log('No instructor assigned to this subject for this section and year level');
        console.log('Available sections and years:', allTeacherSubjectData.map(ts => ({ section: ts.section, year: ts.year_level })));
        console.log('Search criteria:', { courseId, selectedSection, selectedYearLevel });
        
        // Fallback: use first available instructor if no exact match
        if (allTeacherSubjectData.length > 0) {
          console.warn('⚠️ USING FALLBACK INSTRUCTOR - No exact match found for section/year combination');
          console.warn('This may cause the same instructor to appear in different sections!');
          console.warn('Available teacher_subjects:', allTeacherSubjectData.map(ts => ({
            section: ts.section,
            year: ts.year_level,
            teacher_id: ts.teacher_id
          })));
          console.warn('Search criteria:', { courseId, selectedSection, selectedYearLevel });
          teacherSubjectData = allTeacherSubjectData.slice(0, 1);
        } else {
          setInstructorInfo(null);
          return;
        }
      }

      // Get instructor details and course details
      const teacherIds = teacherSubjectData.map(ts => ts.teacher_id);
      console.log('Teacher IDs to fetch:', teacherIds);
      
      const { data: instructorData, error: instructorError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          first_name,
          last_name,
          display_name,
          role
        `)
        .in('id', teacherIds);

      console.log('Raw instructor data from user_profiles:', instructorData);
      console.log('Instructor error:', instructorError);

      // Filter for instructor/teacher roles (systems may use either)
      const filteredInstructorData = (instructorData || []).filter(instructor =>
        ['instructor', 'teacher'].includes((instructor.role || '').toLowerCase())
      );
      console.log('Filtered instructor data (role in instructor/teacher):', filteredInstructorData);

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          id,
          code,
          name
        `)
        .eq('id', courseId);

      console.log('Instructor data:', instructorData);
      console.log('Course data:', courseData);

      if (instructorError || courseError) {
        console.error('Error fetching instructor or course data:', instructorError, courseError);
        throw instructorError || courseError;
      }

      if (filteredInstructorData && filteredInstructorData.length > 0 && courseData && courseData.length > 0) {
        // If we have multiple instructors, show all of them or the specific one for this section/year
        let selectedInstructor;
        
        if (filteredInstructorData.length === 1) {
          selectedInstructor = filteredInstructorData[0];
        } else {
          // Multiple instructors - find the one that matches our filtered teacherSubjectData
          console.log('Multiple instructors found, looking for correct one...');
          console.log('Filtered teacherSubjectData:', teacherSubjectData);
          
          if (teacherSubjectData.length > 0) {
            // Since teacherSubjectData is already filtered by section/year, use its teacher_id
            const correctTeacherId = teacherSubjectData[0]?.teacher_id;
            console.log('Correct teacher ID from filtered data:', correctTeacherId);
            
            selectedInstructor = filteredInstructorData.find(instructor => 
              instructor.id === correctTeacherId
            );
            
            console.log('Found instructor by teacher_id:', selectedInstructor);
          } else {
            console.log('No teacherSubjectData found, using first instructor');
            selectedInstructor = filteredInstructorData[0];
          }
          
          // If still no match, use the first one
          if (!selectedInstructor) {
            selectedInstructor = filteredInstructorData[0];
            console.log('Warning: Could not find instructor for specific section/year, using first available');
          }
        }
        
        const course = courseData[0];
        
        // Track instructor errors for this course
        await trackInstructorErrors(courseId, course.code);
        
        console.log('Selected instructor:', selectedInstructor);
        console.log('Teacher subject data used for filtering:', teacherSubjectData);
        console.log('Available instructors:', filteredInstructorData.map(i => ({ 
          id: i.id, 
          name: i.display_name || `${i.first_name} ${i.last_name}` 
        })));
        
        // Debug: Show mapping between teacher_subjects and instructors
        console.log('=== TEACHER MAPPING DEBUG ===');
        teacherSubjectData.forEach(ts => {
          const instructor = filteredInstructorData.find(i => i.id === ts.teacher_id);
          console.log(`Section: ${ts.section}, Year: ${ts.year_level}, Teacher ID: ${ts.teacher_id}, Instructor: ${instructor?.display_name || instructor?.first_name + ' ' + instructor?.last_name || 'NOT FOUND'}`);
        });
        
        setInstructorInfo({
          instructor_name: selectedInstructor.display_name || `${selectedInstructor.first_name} ${selectedInstructor.last_name}`,
          subject_name: course.name,
          course_code: course.code
        });
      } else {
        console.log('No instructor or course data found');
        console.log('Filtered instructor data length:', filteredInstructorData?.length || 0);
        console.log('Course data length:', courseData?.length || 0);
        setInstructorInfo(null);
      }
    } catch (error) {
      console.error('Error fetching instructor info:', error);
      setInstructorInfo(null);
    }
  }, [selectedYearLevel, selectedSection, trackInstructorErrors]);

  // Function to fetch enrolled students for selected subject
  const fetchEnrolledStudents = useCallback(async (courseId: string) => {
    if (!courseId || !selectedYearLevel || !selectedSection || !user?.id) {
      setEnrolledStudents([]);
      return;
    }

    try {
      setLoadingEnrolledStudents(true);
      console.log('=== DEBUGGING ENROLLED STUDENTS FETCH ===');
      console.log('Course ID:', courseId);
      console.log('Year Level:', selectedYearLevel);
      console.log('Section:', selectedSection);
      console.log('User ID:', user.id);
      console.log('User Role:', user.role);
      
      // Step 1: Check if the current user is assigned to this subject (only for teachers)
      let teacherAssigned = true; // Default to true for registrars
      
      if (user?.role === 'instructor') {
        const { data: teacherSubjectData, error: teacherSubjectError } = await supabase
          .from('teacher_subjects')
          .select(`
            id,
            subject_id,
            teacher_id
          `)
          .eq('subject_id', courseId)
          .eq('teacher_id', user.id);

        console.log('Teacher subject assignment:', teacherSubjectData);
        console.log('Teacher subject error:', teacherSubjectError);

        if (teacherSubjectError) {
          console.error('Error checking teacher assignment:', teacherSubjectError);
          throw teacherSubjectError;
        }

        teacherAssigned = teacherSubjectData && teacherSubjectData.length > 0;
        
        if (!teacherAssigned) {
          console.log('Current teacher is not assigned to this subject');
          setEnrolledStudents([]);
          return;
        }
      } else {
        console.log('User is a registrar - skipping teacher assignment check');
      }

      // Step 2: Get students enrolled in this subject for this teacher's section
      // First, let's check what sections are available for this subject
      const { data: allEnrollmentsData } = await supabase
        .from('enrollcourse')
        .select(`
          id,
          student_id,
          subject_id,
          status,
          school_year,
          section
        `)
        .eq('subject_id', courseId)
        .eq('status', 'active');

      console.log('=== ALL ENROLLMENTS FOR THIS SUBJECT ===');
      console.log('All enrollments data:', allEnrollmentsData);
      console.log('Available sections:', allEnrollmentsData?.map(e => e.section) || []);

      // Now get the specific section
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollcourse')
        .select(`
          id,
          student_id,
          subject_id,
          status,
          school_year,
          section
        `)
        .eq('subject_id', courseId)
        .eq('status', 'active')
        .eq('section', selectedSection);

      console.log('=== ENROLLCOURSE QUERY RESULTS ===');
      console.log('Enrollments data:', enrollmentsData);
      console.log('Enrollments error:', enrollmentsError);
      console.log('Number of enrollments found:', enrollmentsData?.length || 0);

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError);
        throw enrollmentsError;
      }

      if (!enrollmentsData || enrollmentsData.length === 0) {
        console.log('❌ No enrollments found for course:', courseId, 'section:', selectedSection);
        console.log('This could mean:');
        console.log('1. No students are enrolled in this subject');
        console.log('2. No students in this section');
        console.log('3. Wrong section name in enrollcourse table');
        setEnrolledStudents([]);
        return;
      }

      // Get student details from user_profiles
      const studentIds = enrollmentsData.map(e => e.student_id);
      console.log('Student IDs to fetch:', studentIds);

      const { data: studentsData, error: studentsError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          student_id,
          first_name,
          last_name,
          year_level,
          section
        `)
        .in('id', studentIds)
        .eq('role', 'student');

      console.log('=== USER_PROFILES QUERY RESULTS ===');
      console.log('Students data:', studentsData);
      console.log('Students error:', studentsError);
      console.log('Number of students found:', studentsData?.length || 0);

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        throw studentsError;
      }

      // Filter students by year level and section
      console.log('=== FILTERING STUDENTS ===');
      console.log('Target year level:', selectedYearLevel);
      console.log('Target section:', selectedSection);
      
      const filteredStudents = (studentsData || []).filter(student => {
        const yearMatches = student.year_level === selectedYearLevel;
        const sectionMatches = student.section === selectedSection;
        console.log(`Student ${student.first_name} ${student.last_name}: year=${student.year_level} (${yearMatches}), section=${student.section} (${sectionMatches})`);
        return yearMatches && sectionMatches;
      });

      console.log('=== FINAL RESULTS ===');
      console.log('Filtered students by year and section:', filteredStudents);
      console.log('Number of filtered students:', filteredStudents.length);

      // Map the filtered data
      const enrolledStudentsList = filteredStudents.map(student => ({
        id: student.id,
        student_id: student.student_id || student.id,
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        enrollment_status: 'active'
      }));

      console.log('Final enrolled students list:', enrolledStudentsList);
      setEnrolledStudents(enrolledStudentsList);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
      setEnrolledStudents([]);
    } finally {
      setLoadingEnrolledStudents(false);
    }
  }, [selectedYearLevel, selectedSection, user?.id, user?.role]);

  // New function to handle subject selection
  const handleSubjectClick = async (course: { id: string; code: string }) => {
    setSelectedSubject(course.code);
    setSelectedCourseId(course.id);
    
    // Fetch instructor info and enrolled students for this subject
    await Promise.all([
      fetchInstructorInfo(course.id),
      fetchEnrolledStudents(course.id)
    ]);
    
    navigateTo('students');
  };

  // Refresh enrolled students when year level or section changes
  useEffect(() => {
    if (selectedCourseId && selectedYearLevel && selectedSection && user?.id) {
      console.log('Year level or section changed, refreshing enrolled students...');
      fetchEnrolledStudents(selectedCourseId);
    }
  }, [selectedYearLevel, selectedSection, selectedCourseId, fetchEnrolledStudents, user?.id]);

  // Refresh instructor info when year level or section changes
  useEffect(() => {
    if (selectedCourseId && selectedYearLevel && selectedSection) {
      console.log('Year level or section changed, refreshing instructor info...');
      fetchInstructorInfo(selectedCourseId);
    }
  }, [selectedYearLevel, selectedSection, selectedCourseId, fetchInstructorInfo]);







  // Get filtered students based on selection - now includes enrolled students even without grades
  const getFilteredStudents = () => {
    if (!selectedYearLevel || !selectedSection || !selectedSubject) return [];
    
    console.log('=== GETFILTEREDSTUDENTS DEBUG ===');
    console.log('Selected year level:', selectedYearLevel);
    console.log('Selected section:', selectedSection);
    console.log('Selected subject:', selectedSubject);
    console.log('Selected course ID:', selectedCourseId);
    console.log('Enrolled students count:', enrolledStudents.length);
    console.log('Grades count:', grades.length);
    
    const normalizeStr = (v?: string | null) => (v || '').toString().trim().toLowerCase();
    const sectionTarget = normalizeStr(selectedSection);
    const subjectTarget = normalizeStr(selectedSubject);

    // First get all grades that match the criteria
    let gradeStudents = grades.filter(grade => {
      const sectionMatches = normalizeStr(grade.section) === sectionTarget;
      const subjectMatches = normalizeStr(grade.course_code) === subjectTarget || (!!selectedCourseId && grade.course_id === selectedCourseId);
      return (
        grade.year_level === selectedYearLevel &&
        sectionMatches &&
        subjectMatches
      );
    });

    console.log('Grade students found:', gradeStudents.length);

    // If we have enrolled students, merge them with grade data
    if (enrolledStudents.length > 0) {
      console.log('Processing enrolled students...');
      // Create a map of existing grades by student_id
      const gradesMap = new Map();
      gradeStudents.forEach(grade => {
        gradesMap.set(grade.student_id, grade);
      });

      // Create final list with enrolled students
      const finalStudents = enrolledStudents.map(enrolledStudent => {
        const existingGrade = gradesMap.get(enrolledStudent.student_id);
        
        if (existingGrade) {
          // Student has grades, use existing grade data
          return existingGrade;
        } else {
          // Student is enrolled but has no grades, create a placeholder grade entry
          return {
            id: `enrolled-${enrolledStudent.id}`,
            student_id: enrolledStudent.student_id,
            student_name: `${enrolledStudent.first_name} ${enrolledStudent.last_name}`,
            school_id: enrolledStudent.student_id,
            prelim_grade: null,
            midterm_grade: null,
            final_grade: null,
            general_average: null,
            is_released: false,
            is_approved: false,
            is_locked: false,
            year_level: selectedYearLevel,
            section: selectedSection,
            course_code: selectedSubject,
            course_id: selectedCourseId,
            student_type: 'Enrolled',
            enrollment_status: 'active',
            avatar_url: null,
            teacher_name: 'Not Assigned',
            remarks: null,
            graded_by: null,
            graded_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      });

      gradeStudents = finalStudents;
    } else {
      console.log('No enrolled students found, showing only students with grades');
    }
    
    console.log('Final gradeStudents before search:', gradeStudents.length);
    
    // Apply search filter if search term exists
    if (studentSearchTerm.trim()) {
      gradeStudents = gradeStudents.filter(grade => 
        (grade.student_name || '').toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        (grade.school_id || '').toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }
    
    // Sort by student name
    gradeStudents.sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));
    
    console.log('=== FINAL RESULT ===');
    console.log('Final students to display:', gradeStudents.length);
    console.log('Students:', gradeStudents.map(s => ({ name: s.student_name, id: s.student_id, hasGrades: s.prelim_grade !== null })));
    
    return gradeStudents;
  };

  // Bulk action handlers
  // Function to validate if all students have complete grades
  const validateCompleteGrades = (students: Grade[]) => {
    const incompleteStudents = students.filter(student => {
      const hasPrelim = student.prelim_grade !== null && student.prelim_grade !== undefined;
      const hasMidterm = student.midterm_grade !== null && student.midterm_grade !== undefined;
      const hasFinal = student.final_grade !== null && student.final_grade !== undefined;
      
      return !hasPrelim || !hasMidterm || !hasFinal;
    });
    
    return {
      isValid: incompleteStudents.length === 0,
      incompleteStudents: incompleteStudents
    };
  };

  const handleBulkRelease = async () => {
    const filteredStudents = getFilteredStudents();
    if (filteredStudents.length === 0) return;
    
    // Validate that all students have complete grades
    const validation = validateCompleteGrades(filteredStudents);
    
    if (!validation.isValid) {
      const incompleteCount = validation.incompleteStudents.length;
      const totalCount = filteredStudents.length;
      
      toast.error(
        `Cannot release grades: ${incompleteCount} out of ${totalCount} students have incomplete grades. All students must have Prelim, Midterm, and Final grades before releasing.`,
        { duration: 6000 }
      );
      return;
    }
    
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



  // Generate Grade Reports
  const generateGradeReport = async () => {
    const filteredStudents = getFilteredStudents();
    if (filteredStudents.length === 0) {
      toast.error('No students selected for report generation');
      return;
    }

    try {
      // Create a CSV report
      const csvData = [
        ['Student Name', 'Student ID', 'Subject', 'Prelim', 'Midterm', 'Final', 'GA', 'Status'],
        ...filteredStudents.map(student => [
          student.student_name || 'Unknown',
          student.school_id || student.student_id,
          student.course_name || 'Unknown',
          student.prelim_grade?.toString() || '-',
          student.midterm_grade?.toString() || '-',
          student.final_grade?.toString() || '-',
          student.general_average?.toFixed(2) || '-',
          student.is_approved ? 'Approved' : 'Pending'
        ])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grade_report_${selectedYearLevel}_${selectedSection}_${selectedSubject}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Grade report generated successfully');
    } catch (error) {
      console.error('Error generating grade report:', error);
      toast.error('Failed to generate grade report');
    }
  };

  // Stats
  const totalGrades = grades.length;
  const releasedGrades = grades.filter(g => g.is_released).length;
  const pendingGrades = grades.filter(g => !g.is_released).length;

  // Grade Change Request functions
  const fetchInstructorRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('id, student_id, subject_id, section, academic_year, edit_reason, edit_status, edit_requested_by, edit_requested_by_name, edit_student_name, created_at')
        .eq('edit_requested', true)
        .eq('edit_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((g: {
        id: string;
        student_id: string;
        subject_id: string | null;
        section: string | null;
        academic_year: string | null;
        edit_reason: string | null;
        edit_status: string | null;
        edit_requested_by: string | null;
        edit_requested_by_name: string | null;
        edit_student_name: string | null;
        created_at: string | null;
      }) => ({
        id: g.id,
        student_id: g.student_id,
        student_name: g.edit_student_name,
        instructor_id: g.edit_requested_by,
        instructor_name: g.edit_requested_by_name,
        subject_id: g.subject_id,
        section: g.section,
        academic_year: g.academic_year,
        edit_reason: g.edit_reason,
        edit_status: g.edit_status,
        created_at: g.created_at
      }));
      setInstructorRequests(mapped);
    } catch (e) {
      console.error('Failed to load instructor requests:', e);
      setInstructorRequests([]);
    }
  };

  const refreshInstructorRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('id, student_id, subject_id, section, academic_year, edit_reason, edit_status, edit_requested_by, edit_requested_by_name, edit_student_name, created_at')
        .eq('edit_requested', true)
        .eq('edit_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((g: {
        id: string;
        student_id: string;
        subject_id: string | null;
        section: string | null;
        academic_year: string | null;
        edit_reason: string | null;
        edit_status: string | null;
        edit_requested_by: string | null;
        edit_requested_by_name: string | null;
        edit_student_name: string | null;
        created_at: string | null;
      }) => ({
        id: g.id,
        student_id: g.student_id,
        student_name: g.edit_student_name,
        instructor_id: g.edit_requested_by,
        instructor_name: g.edit_requested_by_name,
        subject_id: g.subject_id,
        section: g.section,
        academic_year: g.academic_year,
        edit_reason: g.edit_reason,
        edit_status: g.edit_status,
        created_at: g.created_at
      }));
      setInstructorRequests(mapped);
    } catch (e) {
      console.error('Failed to refresh requests:', e);
    }
  };

  const approveRequest = async (gradeId: string) => {
    try {
      const { error } = await supabase
        .from('grades')
        .update({ edit_status: 'granted', edit_requested: false, approved_at: new Date().toISOString() })
        .eq('id', gradeId);
      if (error) throw error;
      toast.success('Grade edit request approved successfully');
      await refreshInstructorRequests();
    } catch (e) {
      console.error('Approve failed:', e);
      toast.error('Failed to approve request');
    }
  };

  const denyRequest = async (gradeId: string) => {
    try {
      const { error } = await supabase
        .from('grades')
        .update({ edit_status: 'denied', edit_requested: false })
        .eq('id', gradeId);
      if (error) throw error;
      toast.success('Grade edit request denied');
      await refreshInstructorRequests();
    } catch (e) {
      console.error('Deny failed:', e);
      toast.error('Failed to deny request');
    }
  };

  const openRequestDetails = async (request: {
    id: string;
    student_id: string;
    student_name?: string | null;
    instructor_id?: string | null;
    instructor_name?: string | null;
    subject_id?: string | null;
    section?: string | null;
    academic_year?: string | null;
    edit_reason?: string | null;
    edit_status?: string | null;
    created_at?: string | null;
  }) => {
    let resolvedName = request.instructor_name;
    try {
      if (!resolvedName || resolvedName.trim() === '') {
        const name = await resolveInstructorName(
          request.instructor_id,
          request.subject_id || undefined,
          request.section || undefined,
          request.academic_year || undefined
        );
        if (name) resolvedName = name;
      }
    } catch {
      // ignore and fall back
    }

    setSelectedRequest({ ...request, instructor_name: resolvedName || 'Unknown Instructor' });
    setRequestModalOpen(true);
  };

  const showConfirmation = (action: 'approve' | 'deny', requestId: string) => {
    setConfirmationAction(action);
    setConfirmationRequestId(requestId);
    setConfirmationModalOpen(true);
  };

  const handleConfirmedAction = async () => {
    if (!confirmationAction || !confirmationRequestId) return;
    
    try {
      if (confirmationAction === 'approve') {
        await approveRequest(confirmationRequestId);
      } else if (confirmationAction === 'deny') {
        await denyRequest(confirmationRequestId);
      }
      
      // Close both modals
      setConfirmationModalOpen(false);
      setRequestModalOpen(false);
      
      // Reset confirmation state
      setConfirmationAction(null);
      setConfirmationRequestId(null);
    } catch (error) {
      console.error('Error handling confirmed action:', error);
    }
  };

  // Fetch courses for the selected year level when Subjects view is active
  useEffect(() => {
    const fetchCoursesForYear = async () => {
      if (!showSubjects || !selectedYearLevel) return;
      try {
        const displayYear = getYearLevelDisplayName(selectedYearLevel);
        const { data, error } = await supabase
          .from('courses')
          .select('id, code, name, units, year_level, summer, semester')
          // Support both display format (e.g., '1st Year') and numeric forms ('1') using IN to avoid encoding issues
          .in('year_level', [displayYear, selectedYearLevel]);
        if (error) throw error;
        setCourseSubjects(data || []);
      } catch (e) {
        console.error('Failed to fetch courses for year level', selectedYearLevel, e);
        setCourseSubjects([]);
      }
    };
    fetchCoursesForYear();
  }, [showSubjects, selectedYearLevel]);

  // Fetch course count for the selected year level to show in Sections view
  useEffect(() => {
    const fetchCoursesCount = async () => {
      if (!showSections || !selectedYearLevel) { setCoursesCount(0); return; }
      try {
        const displayYear = getYearLevelDisplayName(selectedYearLevel);
        const { count, error } = await supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .in('year_level', [displayYear, selectedYearLevel]);
        if (error) throw error;
        setCoursesCount(count || 0);
      } catch (e) {
        console.error('Failed to count courses for year level', selectedYearLevel, e);
        setCoursesCount(0);
      }
    };
    fetchCoursesCount();
  }, [showSections, selectedYearLevel]);

  // Helper: resolve instructor display name consistently (user_profiles → teacher_subjects fallbacks)
  const resolveInstructorName = useCallback(async (
    instructorId?: string | null,
    subjectId?: string | null,
    section?: string | null,
    academicYear?: string | null
  ): Promise<string | null> => {
    try {
      // 1) Direct by instructorId
      if (instructorId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, first_name, last_name')
          .eq('id', instructorId)
          .maybeSingle();
        const display = (profile?.display_name || '').trim();
        if (display) return display;
        const full = `${(profile?.first_name || '').trim()} ${(profile?.last_name || '').trim()}`.trim();
        if (full) return full;
      }

      // 2) Via teacher_subjects using subject + section (+ AY)
      if (subjectId) {
        let tsQuery = supabase
          .from('teacher_subjects')
          .select('teacher:user_profiles!teacher_subjects_teacher_id_fkey(display_name, first_name, last_name)')
          .eq('subject_id', subjectId)
          .eq('is_active', true)
          .limit(1);
        if (section) tsQuery = tsQuery.eq('section', section);
        if (academicYear) tsQuery = tsQuery.eq('academic_year', academicYear);
        let { data: tsRow } = await tsQuery.maybeSingle();

        // Final fallback: any active teacher for the subject
        if (!tsRow) {
          const { data: tsAny } = await supabase
            .from('teacher_subjects')
            .select('teacher:user_profiles!teacher_subjects_teacher_id_fkey(display_name, first_name, last_name)')
            .eq('subject_id', subjectId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          tsRow = tsAny ?? null;
        }

        const teacher = Array.isArray(tsRow?.teacher) ? tsRow?.teacher?.[0] : tsRow?.teacher;
        const display = (teacher?.display_name || '').trim();
        if (display) return display;
        if (teacher) {
          const full = `${(teacher.first_name || '').trim()} ${(teacher.last_name || '').trim()}`.trim();
          if (full) return full;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  return (
    <>
      {/* Request Details Modal - Outside main container */}
      {requestModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="fixed inset-0 bg-black/50" onClick={() => setRequestModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden z-10">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-800">Grade Change Request Details</div>
                <div className="text-xs text-gray-500">Request ID: {selectedRequest.id}</div>
              </div>
              <button onClick={() => setRequestModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Request Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Instructor</label>
                    <div className="text-lg font-semibold text-gray-800">{selectedRequest.instructor_name || instructorInfo?.instructor_name || 'Unknown Instructor'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Student</label>
                    <div className="text-lg font-semibold text-gray-800">{selectedRequest.student_name || selectedRequest.student_id}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Student ID</label>
                    <div className="text-lg font-semibold text-gray-800">{selectedRequest.student_id}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Section</label>
                    <div className="text-lg font-semibold text-gray-800">{selectedRequest.section || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Academic Year</label>
                    <div className="text-lg font-semibold text-gray-800">{selectedRequest.academic_year || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Request Date</label>
                    <div className="text-lg font-semibold text-gray-800">
                      {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString() : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Reason */}
              {selectedRequest.edit_reason && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Edit Reason</label>
                  <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedRequest.edit_reason}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => showConfirmation('deny', selectedRequest.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Deny Request
                </button>
                <button 
                  onClick={() => showConfirmation('approve', selectedRequest.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Outside main container */}
      {confirmationModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="fixed inset-0 bg-black/60" onClick={() => setConfirmationModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden z-10">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmationAction === 'approve' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {confirmationAction === 'approve' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {confirmationAction === 'approve' ? 'Approve Request' : 'Deny Request'}
                  </h3>
                  <p className="text-sm text-gray-600">Please confirm your action</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700">
                  Are you sure you want to <strong>{confirmationAction === 'approve' ? 'approve' : 'deny'}</strong> this grade change request?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setConfirmationModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmedAction}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    confirmationAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {confirmationAction === 'approve' ? 'Approve' : 'Deny'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hide Confirmation Modal - Outside main container */}
      {hideConfirmationOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="fixed inset-0 bg-black/60" onClick={() => setHideConfirmationOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden z-10">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-100">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Move Grades Back to Pending</h3>
                  <p className="text-sm text-gray-600">Please confirm this action</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to move <strong>{releasedModalGroup?.items.length || 0} released grades</strong> back to pending?
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">This action will:</h4>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Hide grades from students</li>
                    <li>• Move grades back to pending status</li>
                    <li>• Require re-release to make them visible again</li>
                  </ul>
                </div>
                <p className="text-sm text-red-600 mt-3 font-medium">
                  ⚠️ This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setHideConfirmationOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmHideReleasedGroup}
                  disabled={releasedModalUpdating}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    releasedModalUpdating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {releasedModalUpdating ? 'Moving...' : 'Move to Pending'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    <div className="min-h-screen from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Released Grades Modal */}
        {releasedModalOpen && releasedModalGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setReleasedModalOpen(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-gray-800">
                    Released • {getYearLevelDisplayName(releasedModalGroup.year)} • Sec {getSectionDisplayName(releasedModalGroup.section, sectionMap)}
                  </div>
                  <div className="text-xs text-gray-500">{releasedModalGroup.items.length} records</div>
                </div>
                <button
                  onClick={() => setReleasedModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="px-6 py-3 border-b border-gray-200">
                <div className="flex items-center gap-3 justify-between">
                  <div className="relative max-w-md flex-1">
                    <input
                      type="text"
                      value={releasedModalSearch}
                      onChange={(e) => setReleasedModalSearch(e.target.value)}
                      placeholder="Search student by name..."
                      className="w-full h-10 px-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => printReleasedGrades()}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md"
                    >
                      Print
                    </button>
                    <button
                      onClick={() => downloadReleasedGrades()}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-md"
                    >
                      Download CSV
                    </button>
                  <button
                    onClick={handleHideReleasedGroup}
                    disabled={releasedModalUpdating}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${releasedModalUpdating ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:shadow-md'}`}
                  >
                    {releasedModalUpdating ? 'Hiding…' : 'Hide All (Move back to Pending)'}
                  </button>
                  </div>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-2 text-left">Student</th>
                      <th className="px-4 py-2 text-left">Subject</th>
                      <th className="px-4 py-2 text-center">Prelim</th>
                      <th className="px-4 py-2 text-center">Midterm</th>
                      <th className="px-4 py-2 text-center">Final</th>
                      <th className="px-4 py-2 text-center">GA</th>
                      <th className="px-4 py-2 text-left">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {releasedModalGroup.items
                      .slice()
                      .sort((a, b) => {
                        const aDate = new Date(a.updated_at || a.graded_at || a.created_at).getTime();
                        const bDate = new Date(b.updated_at || b.graded_at || b.created_at).getTime();
                        return bDate - aDate;
                      })
                      .filter((g) => {
                        if (!releasedModalSearch.trim()) return true;
                        const q = releasedModalSearch.toLowerCase();
                        const name = (g.student_name || '').toLowerCase();
                        const schoolId = (g.school_id || g.student_id || '').toLowerCase();
                        return name.includes(q) || schoolId.includes(q);
                      })
                      .map((g) => (
                        <tr key={g.id} className="bg-white/90">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <img
                                src={g.avatar_url || "/img/user-avatar.png"}
                                alt={g.student_name || 'Student'}
                                className="w-8 h-8 rounded-full border border-gray-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/img/user-avatar.png";
                                }}
                              />
                              <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{g.student_name || 'Unknown Student'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 truncate max-w-[220px]">{g.course_code || 'Unknown'}</td>
                          <td className="px-4 py-2 text-center">
                            <div className="text-sm font-semibold text-gray-800">
                              {g.prelim_grade !== null && g.prelim_grade !== undefined ? g.prelim_grade : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="text-sm font-semibold text-gray-800">
                              {g.midterm_grade !== null && g.midterm_grade !== undefined ? g.midterm_grade : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="text-sm font-semibold text-gray-800">
                              {g.final_grade !== null && g.final_grade !== undefined ? g.final_grade : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center text-sm font-semibold text-blue-900">{g.general_average !== null && g.general_average !== undefined ? g.general_average.toFixed(2) : '-'}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{new Date(g.updated_at || g.graded_at || g.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {releasedModalGroup.items.length} released • {getYearLevelDisplayName(releasedModalGroup.year)} • Sec {getSectionDisplayName(releasedModalGroup.section, sectionMap)}
                </div>
              </div>
            </div>
          </div>
        )}
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
        ) : (
          <>

            {showPrograms ? (
          <>
          {/* Fast Selection Interface */}
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
            {/* Released Grades List */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Released Grades</h3>
               
              </div>
              <div className="bg-white/80 rounded-xl border border-gray-200 overflow-hidden">
                {(() => {
                  const released = [...grades.filter(g => g.is_released)]
                    .sort((a, b) => {
                      const aDate = new Date(a.updated_at || a.graded_at || a.created_at).getTime();
                      const bDate = new Date(b.updated_at || b.graded_at || b.created_at).getTime();
                      return bDate - aDate;
                    });

                  if (released.length === 0) {
                    return (
                      <div className="px-6 py-8 text-center text-gray-500">No released grades yet</div>
                    );
                  }

                  // Group by year_level + section
                  const groupMap = new Map<string, { year: string; section: string; items: typeof released }>();
                  released.forEach((g) => {
                    const year = g.year_level || 'Unknown';
                    const sectionName = getSectionDisplayName(g.section || '', sectionMap);
                    const key = `${year}__${sectionName}`;
                    if (!groupMap.has(key)) {
                      groupMap.set(key, { year, section: sectionName, items: [] as typeof released });
                    }
                    groupMap.get(key)!.items.push(g);
                  });

                  const grouped = Array.from(groupMap.values()).sort((a, b) => {
                    // Sort groups by most recent item time desc
                    const aLatest = new Date(a.items[0].updated_at || a.items[0].graded_at || a.items[0].created_at).getTime();
                    const bLatest = new Date(b.items[0].updated_at || b.items[0].graded_at || b.items[0].created_at).getTime();
                    return bLatest - aLatest;
                  });

                  return (
                    <div className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {grouped.map((group) => (
                          <div key={`${group.year}-${group.section}`} className="rounded-xl border border-gray-200 bg-white/90 shadow-sm hover:shadow-md transition-all">
                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <div className="text-sm font-semibold text-gray-800">{getYearLevelDisplayName(group.year)} • Sec {group.section}</div>
                              </div>
                              <div className="text-xs text-gray-500">{group.items.length} released</div>
                            </div>
                            <div
                              className="p-4 cursor-pointer"
                              onClick={() => {
                                setReleasedModalGroup({ 
                                  year: group.year, 
                                  section: group.section, 
                                  items: group.items as unknown as Grade[],
                                  department: group.items[0]?.program_name || 'N/A'
                                });
                                setReleasedModalOpen(true);
                              }}
                              title="Click to view details"
                            >
                              {/* Avatar grid only - compress to 10 with overlay counter on last */}
                              <div className="flex flex-wrap gap-1 -space-x-2">
                                {group.items.slice(0, 10).map((g, idx) => (
                                  <div key={g.id} className="relative first:ml-0 ml-2">
                                    <img
                                      src={g.avatar_url || "/img/user-avatar.png"}
                                      alt={g.student_name || 'Student'}
                                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "/img/user-avatar.png";
                                      }}
                                    />
                                    {idx === 9 && group.items.length > 10 && (
                                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-white">+{group.items.length - 10}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            </div>
          </>
          ) : showEmptyProgram ? (
                   // Empty Program State
                   <div className="space-y-6">
                     {/* Back Button and Header */}
                     <div className="flex items-center justify-between">
                       <button
                         onClick={navigateBack}
                         className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
                           canGoBack 
                             ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800' 
                             : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                         }`}
                         disabled={!canGoBack}
                         title={canGoBack ? "Go Back" : "No previous step"}
                       >
                         <ChevronRight className="w-5 h-5 rotate-180" />
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
                             onClick={navigateBack}
                             className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                               canGoBack 
                                 ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                 : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                             }`}
                             disabled={!canGoBack}
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
                               // Reset navigation stack
                               setNavigationStack(['programs']);
                               setCurrentStackIndex(0);
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
               <div className="flex items-center gap-2">
                 <button
                   onClick={navigateBack}
                   className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
                     canGoBack 
                       ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800' 
                       : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                   }`}
                   disabled={!canGoBack}
                   title={canGoBack ? "Go Back" : "No previous step"}
                 >
                   <ChevronRight className="w-5 h-5 rotate-180" />
                 </button>
                 <button
                   onClick={navigateForward}
                   className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
                     canGoForward 
                       ? 'bg-green-100 hover:bg-green-200 text-green-700 hover:text-green-800' 
                       : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                   }`}
                   disabled={!canGoForward}
                   title={canGoForward ? "Go Forward" : "No next step"}
                 >
                   <ChevronRight className="w-5 h-5" />
                 </button>
               </div>
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
                   // Only show year levels when a program is selected
                   if (!selectedProgram) {
                     return (
                       <div className="col-span-full text-center py-12">
                         <div className="text-gray-400 mb-4">
                           <Users className="w-16 h-16 mx-auto" />
                         </div>
                         <h3 className="text-lg font-semibold text-gray-600 mb-2">No Program Selected</h3>
                         <p className="text-gray-500">Please select a program to view year levels and student counts.</p>
                       </div>
                     );
                   }
                   
                   // Show all year levels from 1st to 4th year
                   const allYearLevels = ['1', '2', '3', '4'];
                   
                   return allYearLevels.map((yearLevel) => {
                     try {
                       // Comprehensive error handling and debugging
                       console.group(`🔍 DEBUGGING Year Level ${yearLevel}`);
                       
                       // Check basic data
                       console.log('📊 Basic Data Check:', {
                         selectedProgram: selectedProgram || 'EMPTY',
                         selectedProgramType: typeof selectedProgram,
                         totalStudentsInState: students.length,
                         studentsIsArray: Array.isArray(students),
                         allYearLevels: allYearLevels
                       });
                       
                       // Check if students data is valid
                       if (!Array.isArray(students)) {
                         console.error('❌ ERROR: students is not an array:', students);
                         console.groupEnd();
                         return (
                           <div key={yearLevel} className="bg-red-50 border border-red-200 rounded-xl p-6">
                             <div className="text-red-600 font-semibold">Error: Invalid students data</div>
                             <div className="text-red-500 text-sm">Students data is not an array</div>
                           </div>
                         );
                       }
                       
                       if (students.length === 0) {
                         console.warn('⚠️ WARNING: No students in state');
                         console.log('Students state:', students);
                       }
                       
                       // Resolve selected program info
                       const selectedProgramInfo = programs.find(p => String(p.id) === String(selectedProgram));
                       const selectedDeptName = selectedProgramInfo?.name?.trim();
                       
                       // Match helpers
                       const programIdMatches = (s: Student) => String(s.program_id) === String(selectedProgram);
                       const departmentMatches = (s: Student) => !!selectedDeptName && !!s.department && s.department.trim() === selectedDeptName;
                       
                       // Check program filtering
                       const studentsInProgramById = students.filter(programIdMatches);
                       const studentsInProgramByDept = students.filter(departmentMatches);
                       
                       console.log('🎯 Program Filtering:', {
                         studentsInProgramByIdCount: studentsInProgramById.length,
                         studentsInProgramByDeptCount: studentsInProgramByDept.length,
                         selectedProgram,
                         selectedDeptName,
                         sampleStudentProgramIds: students.slice(0, 5).map(s => s.program_id),
                         sampleStudentDepartments: students.slice(0, 5).map(s => s.department)
                       });
                       
                       // Check year level filtering
                       const studentsInYearLevel = students.filter(s => normalizeYearLevel(s.year_level) === yearLevel);
                       console.log('📚 Year Level Filtering:', {
                         studentsInYearLevelCount: studentsInYearLevel.length,
                         targetYearLevel: yearLevel,
                         allOriginalYearLevels: [...new Set(students.map(s => s.year_level))],
                         allNormalizedYearLevels: [...new Set(students.map(s => normalizeYearLevel(s.year_level)))]
                       });
                       
                       // Final count calculation (match by program_id OR department)
                       const studentCount = students.filter(s => {
                         const programMatch = programIdMatches(s) || departmentMatches(s);
                         const yearLevelMatch = normalizeYearLevel(s.year_level) === yearLevel;
                         
                         return programMatch && yearLevelMatch;
                       }).length;
                       
                       // Prepare matching students (first 8 for avatar display)
                       const matchingStudents = students.filter(s => {
                         const programMatch = programIdMatches(s) || departmentMatches(s);
                         const yearLevelMatch = normalizeYearLevel(s.year_level) === yearLevel;
                         return programMatch && yearLevelMatch;
                       });
                       const displayedStudents = matchingStudents.slice(0, 8);
                       
                       console.log('🎯 Final Count Calculation:', {
                         studentCount,
                         selectedProgram,
                         selectedDeptName,
                         yearLevel,
                         byIdOnlyCount: students.filter(s => programIdMatches(s) && normalizeYearLevel(s.year_level) === yearLevel).length,
                         byDeptOnlyCount: students.filter(s => departmentMatches(s) && normalizeYearLevel(s.year_level) === yearLevel).length
                       });
                       
                       // Sample data for debugging
                       console.log('📋 Sample Students Data:', students.slice(0, 3).map(s => ({
                         id: s.id,
                         program_id: s.program_id,
                         year_level: s.year_level,
                         normalized_year_level: normalizeYearLevel(s.year_level),
                         department: s.department,
                         student_id: s.student_id
                       })));
                       
                       console.groupEnd();
                       
                       // Return the year level card with error handling
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
                            <div className="flex -space-x-2 items-center">
                              {/* Avatars of matching students */}
                              {displayedStudents.length === 0 ? (
                                <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-white shadow-sm flex items-center justify-center">
                                  <BookOpen className="w-4 h-4 text-green-600" />
                                </div>
                              ) : (
                                <>
                                  {displayedStudents.map(s => (
                                    <img
                                      key={s.id}
                                      src={s.avatar_url || "/img/user-avatar.png"}
                                      alt={s.display_name || 'Student'}
                                      title={s.display_name || ''}
                                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "/img/user-avatar.png";
                                      }}
                                    />
                                  ))}
                                  {studentCount > displayedStudents.length && (
                                    <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-white shadow-sm flex items-center justify-center">
                                      <span className="text-xs font-bold text-green-600">+{studentCount - displayedStudents.length}</span>
                                    </div>
                                  )}
                                </>
                              )}
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
                     } catch (error) {
                       console.error(`❌ ERROR in Year Level ${yearLevel}:`, error);
                       console.groupEnd();
                       return (
                         <div key={yearLevel} className="bg-red-50 border border-red-200 rounded-xl p-6">
                           <div className="text-red-600 font-semibold">Error in Year Level {yearLevel}</div>
                           <div className="text-red-500 text-sm">{error instanceof Error ? error.message : 'Unknown error'}</div>
                           <div className="text-red-400 text-xs mt-2">Check console for details</div>
                         </div>
                       );
                     }
                   });
                 })()}
              </div>
              
              {/* Year Levels are always shown (1–4) so no empty-state needed here */}
             </div>
           </div>
                  </div>
         ) : showSections ? (
           // Sections Selection Interface
           <div className="space-y-6">
             {/* Back Button and Header */}
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <button
                   onClick={navigateBack}
                   className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
                     canGoBack 
                       ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800' 
                       : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                   }`}
                   disabled={!canGoBack}
                   title={canGoBack ? "Go Back" : "No previous step"}
                 >
                   <ChevronRight className="w-5 h-5 rotate-180" />
                 </button>
                 <button
                   onClick={navigateForward}
                   className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
                     canGoForward 
                       ? 'bg-green-100 hover:bg-green-200 text-green-700 hover:text-green-800' 
                       : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                   }`}
                   disabled={!canGoForward}
                   title={canGoForward ? "Go Forward" : "No next step"}
                 >
                   <ChevronRight className="w-5 h-5" />
                 </button>
               </div>
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
                     const selectedProgramName = programs.find(p => p.id === selectedProgram)?.name;

                     // Normalize helper to compare different year_level formats
                     const normalize = (v: string | number | null | undefined) => {
                       if (v === null || v === undefined) return '';
                       const s = String(v).toLowerCase();
                       if (s.startsWith('1')) return '1';
                       if (s.startsWith('2')) return '2';
                       if (s.startsWith('3')) return '3';
                       if (s.startsWith('4')) return '4';
                       if (['1','2','3','4'].includes(s)) return s;
                       return s;
                     };

                     // Source sections directly from sections table, filtered by selected year level
                     const sectionsForYear = sectionsList
                       .filter(s => normalize(s.year_level) === selectedYearLevel)
                       .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                     return sectionsForYear.map((sec) => {
                       const sectionName = sec.name;

                       // Count students from user_profiles by section UUID and year_level, with program match
                       const studentCount = students.filter(s => {
                         const programMatch = String(s.program_id) === String(selectedProgram) || (s.department && selectedProgramName && s.department.trim() === selectedProgramName);
                         const yearMatch = normalizeYearLevel(s.year_level) === selectedYearLevel;
                         const sectionMatch = s.section === sec.id; // section stores UUID in user_profiles
                         return programMatch && yearMatch && sectionMatch;
                       }).length;

                       // Subject list not used here; removed to satisfy linter

                       return (
                         <div
                           key={sec.id}
                           onClick={() => handleSectionClick(sectionName)}
                           className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                         >
                           <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-2">
                               <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                               <span className="text-sm font-medium text-purple-700">
                                  {sectionName}
                               </span>
                             </div>
                             <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                               {studentCount} students
                             </span>
                           </div>

                           <div className="space-y-2">
                             <div className="text-lg font-bold text-gray-800">
                               {`${coursesCount} subject${coursesCount !== 1 ? 's' : ''}`}
                             </div>
                             <div className="flex -space-x-2 items-center">
                               {(() => {
                                 const selectedProgramName = programs.find(p => p.id === selectedProgram)?.name;
                                 const yearMatch = (s: Student) => normalizeYearLevel(s.year_level) === selectedYearLevel;
                                 const programMatch = (s: Student) => String(s.program_id) === String(selectedProgram) || (s.department && selectedProgramName && s.department.trim() === selectedProgramName);
                                 const sectionMatch = (s: Student) => s.section === sec.id; // UUID match to sections.id
                                 const matchingStudents = students.filter(s => programMatch(s) && yearMatch(s) && sectionMatch(s));
                                 const displayed = matchingStudents.slice(0, 8);
                                 return (
                                   <>
                                     {displayed.map(s => (
                                       <img
                                         key={s.id}
                                         src={s.avatar_url || "/img/user-avatar.png"}
                                         alt={s.display_name || 'Student'}
                                         title={s.display_name || ''}
                                         className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                                         onError={(e) => {
                                           const target = e.target as HTMLImageElement;
                                           target.src = "/img/user-avatar.png";
                                         }}
                                       />
                                     ))}
                                     {matchingStudents.length > displayed.length && (
                                       <div className="w-6 h-6 rounded-full bg-purple-100 border-2 border-white shadow-sm flex items-center justify-center">
                                         <span className="text-xs font-bold text-purple-600">+{matchingStudents.length - displayed.length}</span>
                                       </div>
                                     )}
                                   </>
                                 );
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
  if (!showSections || loading || !selectedYearLevel) return null;

  const normalize = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return '';
    const s = String(v).toLowerCase();
    if (s.startsWith('1')) return '1';
    if (s.startsWith('2')) return '2';
    if (s.startsWith('3')) return '3';
    if (s.startsWith('4')) return '4';
    if (['1', '2', '3', '4'].includes(s)) return s;
    return s;
  };

  const sectionsForYear = sectionsList.filter(s => normalize(s.year_level) === selectedYearLevel);

  if (sectionsForYear.length === 0) {
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
  return null;
})()}
               </div>
            </div>
          </div>
        ) : showSubjects ? (
          // Subjects List View
          <div className="space-y-6">
            {/* Back Button and Header */}
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <button
                   onClick={navigateBack}
                   className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
                     canGoBack 
                       ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800' 
                       : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                   }`}
                   disabled={!canGoBack}
                   title={canGoBack ? "Go Back" : "No previous step"}
                 >
                   <ChevronRight className="w-5 h-5 rotate-180" />
                 </button>
                 <button
                   onClick={navigateForward}
                   className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
                     canGoForward 
                       ? 'bg-green-100 hover:bg-green-200 text-green-700 hover:text-green-800' 
                       : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                   }`}
                   disabled={!canGoForward}
                   title={canGoForward ? "Go Forward" : "No next step"}
                 >
                   <ChevronRight className="w-5 h-5" />
                 </button>
               </div>
              <div className="text-center flex-1">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl shadow-lg inline-block">
                  <h2 className="text-2xl font-bold">
                    {selectedProgram ? programs.find(p => p.id === selectedProgram)?.name || 'Unknown Program' : 'Select a Program'} -{selectedYearLevel} Section {getSectionDisplayName(selectedSection, sectionMap)}
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
                {courseSubjects
                  .filter(course =>
                    (!subjectSearchTerm ||
                      course.code.toLowerCase().includes(subjectSearchTerm.toLowerCase()) ||
                      (course.name && course.name.toLowerCase().includes(subjectSearchTerm.toLowerCase())))
                  )
                  .map((course) => (
                    <div
                      key={course.id}
                      onClick={() => handleSubjectClick({ id: course.id, code: course.code })}
                      className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-700">
                            {course.code}
                          </span>
                        </div>
            
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-lg font-bold text-gray-800">
                          {course.name}
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
                const totalSubjects = courseSubjects;
                
                const filteredSubjects = totalSubjects.filter(item => 
                  !subjectSearchTerm || 
                  item.code.toLowerCase().includes(subjectSearchTerm.toLowerCase()) ||
                  (item.name && item.name.toLowerCase().includes(subjectSearchTerm.toLowerCase()))
                );
                
                if (totalSubjects.length === 0) {
                  return (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <BookOpen className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Subjects Available</h3>
                  <p className="text-gray-500">No subjects found for the selected year level.</p>
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
              <div className="flex items-center gap-2">
                <button
                   onClick={navigateBack}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
                    canGoBack 
                      ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!canGoBack}
                  title={canGoBack ? "Go Back" : "No previous step"}
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <button
                  onClick={navigateForward}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200 ${
                    canGoForward 
                      ? 'bg-green-100 hover:bg-green-200 text-green-700 hover:text-green-800' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!canGoForward}
                  title={canGoForward ? "Go Forward" : "No next step"}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="text-center flex-1">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl shadow-lg inline-block">
                  <h2 className="text-2xl font-bold">
                    {selectedProgram ? programs.find(p => p.id === selectedProgram)?.name || 'Unknown Program' : 'Select a Program'} -{selectedYearLevel} Section {getSectionDisplayName(selectedSection, sectionMap)}
                  </h2>
                  {selectedSubject && (
                    <div className="mt-3 text-base font-medium">
                      <span className="mr-6">
                        Subject: {instructorInfo?.course_code || selectedSubject}
                      </span>
                      <span>
                        Instructor: {instructorInfo?.instructor_name || 'No Instructor...'}
                      </span>
                    </div>
                  )}

                  {/* Instructor Error Tracking Display - removed per request */}
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
                      {getFilteredStudents().length} students
                      {enrolledStudents.length > 0 && (
                        <span className="text-blue-600 ml-2">
                          ({enrolledStudents.length} enrolled in {selectedSubject})
                        </span>
                      )}
                      </span>
                      {(() => {
                        const validation = validateCompleteGrades(getFilteredStudents());
                        if (!validation.isValid) {
                          return (
                            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              <Clock className="w-3 h-3" />
                              {validation.incompleteStudents.length} incomplete grades
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            All grades complete
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleBulkRelease}
                        disabled={bulkUpdating || !validateCompleteGrades(getFilteredStudents()).isValid}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          bulkUpdating || !validateCompleteGrades(getFilteredStudents()).isValid
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
                        }`}
                        title={
                          !validateCompleteGrades(getFilteredStudents()).isValid
                            ? 'Cannot release: Some students have incomplete grades (missing Prelim, Midterm, or Final)'
                            : 'Release all grades for selected students'
                        }
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

                      <button
                        onClick={generateGradeReport}
                        className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:shadow-lg"
                      >
                        Generate Report
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
                        (
                          grade.course_code === selectedSubject ||
                          (!!selectedCourseId && grade.course_id === selectedCourseId)
                        )
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
                        <th className="px-6 py-4 text-center font-semibold">Grade Change Requests</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {loadingEnrolledStudents ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-12 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="text-gray-600">Loading enrolled students...</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        getFilteredStudents().map((grade, index) => (
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
                          <td className="px-6 py-4 text-center">
                            {(() => {
                              // Filter requests for this specific student and subject
                              const studentRequests = instructorRequests.filter(req => 
                                req.student_id === grade.student_id && 
                                req.subject_id === grade.subject_id
                              );
                              
                              if (studentRequests.length === 0) {
                                return (
                                  <span className="text-gray-400 text-xs">No requests</span>
                                );
                              }
                              
                              return (
                                <div className="space-y-1">
                                  {studentRequests.map(req => (
                                    <div key={req.id} className="flex flex-col items-center gap-1">
                                        <button 
                                          onClick={() => openRequestDetails(req)}
                                          className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                        title="View request details - Instructor needs permission to edit grades"
                                        >
                                          👁
                                        </button>
                                      <div className="text-xs text-amber-600 text-center max-w-32" title="Instructor needs permission to edit grades">
                                        Permission Required
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                        ))
                      )}
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
          </>
        )}

      </div>
    </div>
    </>
  );
}
