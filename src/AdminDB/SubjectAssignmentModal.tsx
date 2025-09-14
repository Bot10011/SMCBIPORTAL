import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

interface TeacherSubject {
  id?: string;
  teacher_id: string;
  subject_id: string;
  section: string;
  academic_year: string;
  year_level: string; // Added year_level
  semester: string;
  is_active: boolean;
  day?: string; // Now a string (e.g., 'M' or 'M,W,Th')
  time?: string;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department?: string;
  is_active: boolean;
  full_name: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  units: number;
  display_name: string;
  year_level: string; // Added year_level
  semester: string; // Added semester
}

interface Section {
  id: string;
  name: string;
  year_level: string;
}

export interface SubjectAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (assignments: TeacherSubject[]) => Promise<{ success: boolean; message: string }>;
  formErrors: Record<string, string>;
  assignment: TeacherSubject;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  formSubmitting: boolean;
  isEditMode: boolean;
  teachers: Teacher[];
  courses: Subject[];
  sections: Section[]; // Required sections prop for filtering
}

const SubjectAssignmentModal: React.FC<SubjectAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formErrors,
  assignment,
  handleInputChange,
  formSubmitting,
  isEditMode,
  teachers,
  courses,
  sections
}) => {
  // Filter sections by selected year level
  const filteredSections = assignment.year_level
    ? sections.filter(section => {
        // Convert string year level (e.g., "1st Year") to number for comparison
        const yearNumber = assignment.year_level.match(/(\d+)/)?.[1];
        if (!yearNumber) return false;
        
        // Compare with section's numeric year level
        return String(section.year_level) === yearNumber;
      })
    : sections; // Show all sections if no year level is selected

  // Debug logging for sections
  console.log('Assignment year level:', assignment.year_level);
  console.log('Available sections:', sections);
  console.log('Filtered sections:', filteredSections);
  console.log('Year level matching:', assignment.year_level ? assignment.year_level.match(/(\d+)/)?.[1] : 'No year level');

  // Add academic years array
  const currentYear = new Date().getFullYear();
  const academicYears = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
    `${currentYear + 2}-${currentYear + 3}`
  ];

  // Add year levels array (value/label pairs) - use full format to match database
  const yearLevels = [
    { value: '1st Year', label: '1st Year' },
    { value: '2nd Year', label: '2nd Year' },
    { value: '3rd Year', label: '3rd Year' },
    { value: '4th Year', label: '4th Year' }
  ];

  // Add semester types array
  const semesterTypes = [
    { value: 'First Semester', label: '1st Semester' },
    { value: 'Second Semester', label: '2nd Semester' },
    { value: 'Summer', label: 'Summer' }
  ];

  // Add days array
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Map for day abbreviations
  const dayAbbr: Record<string, string> = {
    'Monday': 'M',
    'Tuesday': 'T',
    'Wednesday': 'W',
    'Thursday': 'Th',
    'Friday': 'F',
    'Saturday': 'S',
    'Sunday': 'Su',
  };

  // Multi-select state for subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(assignment.subject_id ? [assignment.subject_id] : []);
  // Multi-select state for day
  const [selectedDay, setSelectedDay] = useState<string[]>(assignment.day ? assignment.day.split(',') : []);

  // Ensure edit mode correctly shows days checked when parent expands abbreviations later
  React.useEffect(() => {
    if (isEditMode && assignment.day && selectedDay.length === 0) {
      setSelectedDay(assignment.day.split(','));
    }
  }, [isEditMode, assignment.day]);

  // Filter courses by both year level and semester
  const filteredCourses = (assignment.year_level && assignment.semester)
    ? courses.filter(subject => {
        // Extract the numeric year from the assignment year level (e.g., "1st Year" -> 1)
        const yearNumber = assignment.year_level.match(/(\d+)/)?.[1];
        if (!yearNumber) return false;
        
        // Compare with subject's year level (handle both string and number formats)
        const subjectYear = String(subject.year_level || '');
        
        // Check year level match
        let yearMatch = false;
        if (subjectYear === yearNumber) yearMatch = true;
        if (subjectYear === assignment.year_level) yearMatch = true;
        
        const yearMappings: Record<string, string> = {
          '1st Year': '1',
          '2nd Year': '2', 
          '3rd Year': '3',
          '4th Year': '4'
        };
        
        if (yearMappings[assignment.year_level] === subjectYear) yearMatch = true;
        
        if (!yearMatch) return false;
        
        // Check semester match with more flexible matching
        const subjectSemester = String(subject.semester || '').toLowerCase().trim();
        const assignmentSemester = String(assignment.semester || '').toLowerCase().trim();
        
        // Handle different semester formats
        const semesterMappings: Record<string, string[]> = {
          'first semester': ['first semester', '1st semester', '1st sem', 'first sem', 'first'],
          'second semester': ['second semester', '2nd semester', '2nd sem', 'second sem', 'second'],
          'summer': ['summer', 'summer semester', 'summer sem', 'su', 'sm', 'sum']
        };
        
        // Check if assignment semester matches any of the mapped values
        const assignmentSemesterKey = Object.keys(semesterMappings).find(key => 
          semesterMappings[key].includes(assignmentSemester)
        );
        
        if (assignmentSemesterKey) {
          // Check if subject semester matches any of the mapped values for the assignment semester
          const subjectMatches = semesterMappings[assignmentSemesterKey].some(mappedValue => 
            subjectSemester.includes(mappedValue) || mappedValue.includes(subjectSemester) ||
            subjectSemester === mappedValue
          );
          
          console.log(`Semester matching for ${assignment.semester}:`, {
            subjectSemester,
            assignmentSemester,
            assignmentSemesterKey,
            mappedValues: semesterMappings[assignmentSemesterKey],
            subjectMatches
          });
          
          return subjectMatches;
        }
        
        // Fallback to exact match
        return subjectSemester === assignmentSemester;
      })
    : assignment.year_level
      ? courses.filter(subject => {
          // Extract the numeric year from the assignment year level (e.g., "1st Year" -> 1)
          const yearNumber = assignment.year_level.match(/(\d+)/)?.[1];
          if (!yearNumber) return false;
          
          // Compare with subject's year level (handle both string and number formats)
          const subjectYear = String(subject.year_level || '');
          
          // Direct match with the extracted number
          if (subjectYear === yearNumber) return true;
          
          // Try to match with the full year level string
          if (subjectYear === assignment.year_level) return true;
          
          // Try to match with common year level formats
          const yearMappings: Record<string, string> = {
            '1st Year': '1',
            '2nd Year': '2', 
            '3rd Year': '3',
            '4th Year': '4'
          };
          
          if (yearMappings[assignment.year_level] === subjectYear) return true;
          
          return false;
        })
      : [];

  // Debug logging
  console.log('Assignment year level:', assignment.year_level);
  console.log('Assignment semester:', assignment.semester);
  console.log('Available courses:', courses);
  console.log('Filtered courses:', filteredCourses);
  console.log('Year level types:', courses.map(c => ({ id: c.id, year_level: c.year_level, type: typeof c.year_level, display_name: c.display_name })));
  console.log('Courses year levels:', courses.map(c => c.year_level));
  console.log('Courses semesters:', courses.map(c => c.semester));
 
 // Manual filter test for debugging
 if (assignment.year_level) {
   const yearNumber = assignment.year_level.match(/(\d+)/)?.[1];
   console.log('Extracted year number:', yearNumber);
   console.log('Courses matching year number:', courses.filter(c => String(c.year_level) === yearNumber));
   console.log('Courses matching full year level:', courses.filter(c => String(c.year_level) === assignment.year_level));
 }

  // Manual filter test for semester
  if (assignment.semester) {
    console.log('Assignment semester:', assignment.semester);
    console.log('All course semesters:', courses.map(c => ({ id: c.id, code: c.code, semester: c.semester })));
    
    // Special check for the course with code "s"
    const courseWithCodeS = courses.find(c => c.code === 's' || c.code === 'S');
    if (courseWithCodeS) {
      console.log('=== COURSE WITH CODE "S" ANALYSIS ===');
      console.log('Course details:', courseWithCodeS);
      console.log('Current semester:', courseWithCodeS.semester);
      console.log('Should be summer based on code:', true);
      console.log('=== END ANALYSIS ===');
    }
    
    const semesterMappings: Record<string, string[]> = {
      'first semester': ['first semester', '1st semester', '1st sem', 'first sem', 'first'],
      'second semester': ['second semester', '2nd semester', '2nd sem', 'second sem', 'second'],
      'summer': ['summer', 'summer semester', 'summer sem', 'su', 'sm', 'sum']
    };
    
    const assignmentSemesterKey = Object.keys(semesterMappings).find(key => 
      semesterMappings[key].includes(String(assignment.semester).toLowerCase().trim())
    );
    
    console.log('Assignment semester key:', assignmentSemesterKey);
    console.log('Mapped values for assignment semester:', assignmentSemesterKey ? semesterMappings[assignmentSemesterKey] : 'No mapping found');
    
    const matchingCourses = courses.filter(c => {
      const subjectSemester = String(c.semester || '').toLowerCase().trim();
      const assignmentSemester = String(assignment.semester || '').toLowerCase().trim();
      
      if (assignmentSemesterKey) {
        return semesterMappings[assignmentSemesterKey].some(mappedValue => 
          subjectSemester.includes(mappedValue) || mappedValue.includes(subjectSemester) ||
          subjectSemester === mappedValue
        );
      }
      
      return subjectSemester === assignmentSemester;
    });
    
    console.log('Courses matching semester (detailed):', matchingCourses);
   
   // Debug: Check for potential mislabeling
   console.log('=== SEMESTER MISLABELING CHECK ===');
   courses.forEach(course => {
     const code = String(course.code || '').toLowerCase();
     const name = String(course.name || '').toLowerCase();
     const currentSemester = String(course.semester || '').toLowerCase();
     
     // Check if course should be summer based on code/name
     const shouldBeSummer = code.includes('summer') || name.includes('summer') || 
                            code.includes('su') || name.includes('su') ||
                            code.includes('sm') || name.includes('sm') ||
                            code.includes('sum') || name.includes('sum') ||
                            code === 's';
     
     // Check if course should be second semester based on code/name
     const shouldBeSecond = code.includes('2') || name.includes('second') || 
                            code.includes('2nd') || name.includes('2nd') ||
                            code.includes('ii') || name.includes('ii');
     
     // Check if course should be first semester based on code/name
     const shouldBeFirst = (code.includes('1') && !code.includes('10') && !code.includes('11') && !code.includes('12')) || 
                           name.includes('first') || 
                           code.includes('1st') || name.includes('1st') ||
                           (code.includes('i') && !code.includes('ii') && !code.includes('iii') && !code.includes('iv'));
     
     if (shouldBeSummer && currentSemester !== 'summer') {
       console.warn(`POTENTIAL MISLABELING: Course ${course.code} (${course.name}) should be Summer but is labeled as ${course.semester}`);
     }
     if (shouldBeSecond && currentSemester !== 'second semester' && currentSemester !== '2nd semester') {
       console.warn(`POTENTIAL MISLABELING: Course ${course.code} (${course.name}) should be Second Semester but is labeled as ${course.semester}`);
     }
     if (shouldBeFirst && currentSemester !== 'first semester' && currentSemester !== '1st semester') {
       console.warn(`POTENTIAL MISLABELING: Course ${course.code} (${course.name}) should be First Semester but is labeled as ${course.semester}`);
     }
   });
   console.log('=== END MISLABELING CHECK ===');
  }

  // Reset selected subjects only when the user changes year level or semester (not on initial mount)
  const prevYearLevelRef = useRef<string>(assignment.year_level);
  const prevSemesterRef = useRef<string>(assignment.semester);
  React.useEffect(() => {
    const yearLevelChanged = assignment.year_level !== prevYearLevelRef.current;
    const semesterChanged = assignment.semester !== prevSemesterRef.current;
    if (yearLevelChanged || semesterChanged) {
      setSelectedSubjects([]);
    }
    prevYearLevelRef.current = assignment.year_level;
    prevSemesterRef.current = assignment.semester;
  }, [assignment.year_level, assignment.semester]);

  // Ensure the preselected subject is checked in edit mode
  React.useEffect(() => {
    if (isEditMode && assignment.subject_id && selectedSubjects.length === 0) {
      setSelectedSubjects([assignment.subject_id]);
    }
  }, [isEditMode, assignment.subject_id]);

  // Reset section when year level changes (but not on initial mount or right after opening)
  const sectionResetMountedRef = useRef<boolean>(false);
  const wasOpenRef = useRef<boolean>(false);
  const skipNextSectionResetRef = useRef<boolean>(false);
  React.useEffect(() => {
    // Detect open transition to skip the immediate reset
    if (!wasOpenRef.current && isOpen) {
      skipNextSectionResetRef.current = true;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);
  React.useEffect(() => {
    if (!sectionResetMountedRef.current) {
      sectionResetMountedRef.current = true;
      return;
    }
    if (skipNextSectionResetRef.current) {
      // Skip the first reset right after opening
      skipNextSectionResetRef.current = false;
      return;
    }
    if (assignment.year_level) {
      handleInputChange({
        target: { name: 'section', value: '' }
      } as React.ChangeEvent<HTMLSelectElement>);
    }
  }, [assignment.year_level]);

  // If current assignment.section is not present in filtered section options, include it so the select shows the value
  const sectionValuesInOptions = new Set(filteredSections.map(s => s.name));
  const augmentedSections = React.useMemo(() => {
    if (assignment.section && !sectionValuesInOptions.has(assignment.section)) {
      return [{ id: 'custom-current', name: assignment.section, year_level: assignment.year_level.match(/(\d+)/)?.[1] || '' } as any, ...filteredSections];
    }
    return filteredSections;
  }, [assignment.section, assignment.year_level, filteredSections]);

  // Update assignment.day when selectedDay changes
  React.useEffect(() => {
    handleInputChange({
      target: { name: 'day', value: selectedDay.join(',') }
    } as React.ChangeEvent<HTMLInputElement>);
  }, [selectedDay]);

  // Handle subject checkbox change
  const handleSubjectCheckbox = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  // Handle select all subjects
  const handleSelectAllSubjects = () => {
    if (selectedSubjects.length === filteredCourses.length) {
      // If all are selected, unselect all
      setSelectedSubjects([]);
    } else {
      // Select all filtered courses
      setSelectedSubjects(filteredCourses.map(course => course.id));
    }
  };

  // Handle day checkbox change
  const handleDayCheckbox = (day: string) => {
    setSelectedDay(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  // Check if all required fields are filled
  const isFormValid = () => {
    return (
      assignment.teacher_id &&
      selectedSubjects.length > 0 &&
      assignment.section &&
      assignment.academic_year &&
      assignment.year_level &&
      assignment.semester &&
      selectedDay.length > 0 &&
      assignment.time
    );
  };

  // Get selected teacher name
  const selectedTeacher = teachers.find(t => t.id === assignment.teacher_id);

  // Check if all subjects are selected
  const allSubjectsSelected = filteredCourses.length > 0 && selectedSubjects.length === filteredCourses.length;
  const someSubjectsSelected = selectedSubjects.length > 0 && selectedSubjects.length < filteredCourses.length;

  // State for confirmation modal
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [modalError, setModalError] = useState<string>('');
  const [modalSuccess, setModalSuccess] = useState<string>('');

  // State for scroll indicators
  const [showLeftScrollIndicator, setShowLeftScrollIndicator] = useState(false);
  const [showRightScrollIndicator, setShowRightScrollIndicator] = useState(false);
  const [showActionButtonIndicator, setShowActionButtonIndicator] = useState(false);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);

  // Update assignment.subject_id when selectedSubjects changes (for backward compatibility)
  React.useEffect(() => {
    if (selectedSubjects.length === 1) {
      handleInputChange({
        target: { name: 'subject_id', value: selectedSubjects[0] }
      } as React.ChangeEvent<HTMLSelectElement>);
    } else if (selectedSubjects.length === 0) {
      handleInputChange({
        target: { name: 'subject_id', value: '' }
      } as React.ChangeEvent<HTMLSelectElement>);
    }
  }, [selectedSubjects]);

  // Check if columns need scroll indicators
  React.useEffect(() => {
    const checkScrollable = () => {
      if (leftColumnRef.current) {
        const { scrollHeight, clientHeight } = leftColumnRef.current;
        setShowLeftScrollIndicator(scrollHeight > clientHeight);
      }
      if (rightColumnRef.current) {
        const { scrollHeight, clientHeight } = rightColumnRef.current;
        setShowRightScrollIndicator(scrollHeight > clientHeight);
      }
      
      // Show action button indicator if there's scrollable content
      const hasScrollableContent = Boolean(
        (leftColumnRef.current && leftColumnRef.current.scrollHeight > leftColumnRef.current.clientHeight) ||
        (rightColumnRef.current && rightColumnRef.current.scrollHeight > rightColumnRef.current.clientHeight)
      );
      setShowActionButtonIndicator(hasScrollableContent);
    };

    // Check initially and on window resize
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    
    // Check when content changes
    const timeoutId = setTimeout(checkScrollable, 100);

    return () => {
      window.removeEventListener('resize', checkScrollable);
      clearTimeout(timeoutId);
    };
  }, [assignment.year_level, assignment.semester, filteredCourses.length]);

  // Handle scroll events to hide indicators
  const handleLeftScroll = () => {
    if (leftColumnRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = leftColumnRef.current;
      setShowLeftScrollIndicator(scrollTop < scrollHeight - clientHeight - 10);
    }
  };

  const handleRightScroll = () => {
    if (rightColumnRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = rightColumnRef.current;
      setShowRightScrollIndicator(scrollTop < scrollHeight - clientHeight - 10);
    }
  };

  // Handle form submission - show confirmation modal instead of submitting directly
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isFormValid()) {
      setShowConfirmation(true);
      
    }
  };

  // Handle confirmation
  const handleConfirm = async () => {
    setModalError('');
    setModalSuccess('');
    
    // Create multiple assignments for selected subjects
    const assignments: TeacherSubject[] = selectedSubjects.map(subjectId => {
      const subject = courses.find(c => c.id === subjectId);
      const abbr = selectedDay.map(d => dayAbbr[d] || d);
      return {
        teacher_id: assignment.teacher_id,
        subject_id: subjectId,
        section: assignment.section,
        academic_year: assignment.academic_year,
        year_level: assignment.year_level,
        semester: subject?.semester || '',
        day: abbr.length === 1 ? abbr[0] : abbr.join(','),
        time: assignment.time,
        is_active: true
      };
    });
    // Debug log
    console.log('DEBUG assignments sent to parent:', assignments);

    try {
      // Call the parent's onSubmit with the assignments array
      const result = await onSubmit(assignments);
      
      if (result.success) {
        setModalSuccess(result.message);
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowConfirmation(false);
          setModalSuccess('');
        }, 2000);
      } else {
        setModalError(result.message);
      }
    } catch {
      setModalError('An unexpected error occurred. Please try again.');
    }
  };

  // Handle cancel confirmation
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] subject-modal">
      {/* Semi-transparent overlay with enhanced blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal container */}
      <div className="flex items-center justify-center h-full p-2 sm:p-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 lg:p-10 max-w-5xl w-full mx-2 sm:mx-4 shadow-2xl border border-white/20 relative z-10 max-h-[95vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8 flex-shrink-0">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 pr-4">
              {isEditMode ? 'Edit Subject Assignment' : 'Assign New Subject'}
            </h3>
            <button 
              onClick={onClose}
              className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex items-center justify-center text-base sm:text-lg lg:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90 flex-shrink-0"
              aria-label="Close modal"
              style={{ backgroundColor: 'rgb(239, 68, 68)', boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px', zIndex: 50 }}
            >
              ×
            </button>
          </div>
          {/* Form - two column on md+ screens */}
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-4 sm:gap-y-6 flex-1 overflow-hidden relative">
            {/* Left column: Teacher, Academic Year, Section, Semester */}
            <div 
              ref={leftColumnRef}
              onScroll={handleLeftScroll}
              className="flex flex-col gap-4 sm:gap-6 overflow-y-auto relative"
            >
              {/* Bottom fade indicator */}
              {showLeftScrollIndicator && (
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/80 to-transparent pointer-events-none z-5"></div>
              )}
              {/* Scroll indicator for left column */}
              {showLeftScrollIndicator && (
                <div className="absolute top-2 right-2 z-10 pointer-events-none">
                  <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-bounce flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Scroll
                  </div>
                </div>
              )}
              {/* Teacher Selection */}
              <div>
                <label htmlFor="teacher_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Teacher <span className="text-red-500">*</span>
                </label>
                <select
                  id="teacher_id"
                  name="teacher_id"
                  value={assignment.teacher_id}
                  onChange={handleInputChange}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border ${
                    formErrors.teacher_id || (!assignment.teacher_id && !isFormValid())
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm text-sm sm:text-base`}
                >
                  <option value="">Select a teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.full_name} {teacher.department ? `(${teacher.department})` : ''}
                    </option>
                  ))}
                </select>
                {(formErrors.teacher_id || (!assignment.teacher_id && !isFormValid())) && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.teacher_id || 'Please select a teacher'}
                  </p>
                )}
              </div>
              {/* Academic Year */}
              <div>
                <label htmlFor="academic_year" className="block text-sm font-medium text-gray-700 mb-1">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <select
                  id="academic_year"
                  name="academic_year"
                  value={assignment.academic_year}
                  onChange={handleInputChange}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border ${
                    formErrors.academic_year || (!assignment.academic_year && !isFormValid())
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm text-sm sm:text-base`}
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                {(formErrors.academic_year || (!assignment.academic_year && !isFormValid())) && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.academic_year || 'Please select an academic year'}
                  </p>
                )}
              </div>
              {/* Year Level Selection */}
              <div>
                <label htmlFor="year_level" className="block text-sm font-medium text-gray-700 mb-1">
                  Year Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="year_level"
                  name="year_level"
                  value={assignment.year_level}
                  onChange={handleInputChange}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border ${
                    formErrors.year_level || (!assignment.year_level && !isFormValid())
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm text-sm sm:text-base`}
                  required
                >
                  <option value="">Select Year Level</option>
                  {yearLevels.map((level) => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
                {(formErrors.year_level || (!assignment.year_level && !isFormValid())) && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.year_level || 'Please select a year level'}
                  </p>
                )}
              </div>
              {/* Semester Selection */}
              <div>
                <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                  Semester <span className="text-red-500">*</span>
                </label>
                <select
                  id="semester"
                  name="semester"
                  value={assignment.semester}
                  onChange={handleInputChange}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border ${
                    formErrors.semester || (!assignment.semester && !isFormValid())
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm text-sm sm:text-base`}
                  required
                >
                  <option value="">Select Semester</option>
                  {semesterTypes.map((semester) => (
                    <option key={semester.value} value={semester.value}>{semester.label}</option>
                  ))}
                </select>
                {(formErrors.semester || (!assignment.semester && !isFormValid())) && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.semester || 'Please select a semester'}
                  </p>
                )}
              </div>
              {/* Section Selection */}
              <div>
                <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  id="section"
                  name="section"
                  value={assignment.section}
                  onChange={handleInputChange}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border ${
                    formErrors.section || (!assignment.section && !isFormValid())
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm text-sm sm:text-base`}
                  required
                >
                  <option value="">Select Section</option>
                  {augmentedSections.map((section) => (
                    <option key={section.id} value={section.name}>
                      Section {section.name}
                    </option>
                  ))}
                </select>
                {assignment.year_level && filteredSections.length === 0 && (
                  <p className="mt-1 text-sm text-red-600">No sections available for this year level.</p>
                )}
                {!assignment.year_level && sections.length === 0 && (
                  <p className="mt-1 text-sm text-red-600">No sections available. Please contact administrator.</p>
                )}
                {(formErrors.section || (!assignment.section && !isFormValid())) && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.section || 'Please select a section'}
                  </p>
                )}
              </div>
              {/* Day and Time Selection (one line) */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day(s) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {days.map(day => (
                      <label key={day} className="inline-flex items-center gap-1 text-xs sm:text-sm">
                        <input
                          type="checkbox"
                          checked={selectedDay.includes(day)}
                          onChange={() => handleDayCheckbox(day)}
                          className="accent-blue-600 w-3 h-3 sm:w-4 sm:h-4"
                        />
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.substring(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                   {(formErrors.day || (!selectedDay || selectedDay.length === 0) && !isFormValid()) && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.day || 'Please select at least one day'}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="time"
                    name="time"
                    placeholder="e.g. 8:00-10:00 AM"
                    value={assignment.time || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border ${
                      formErrors.time || (!assignment.time && !isFormValid())
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm text-sm sm:text-base`}
                    required
                  />
                  {(formErrors.time || (!assignment.time && !isFormValid())) && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.time || 'Please select a time'}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Right column: Year Level, Subject, Subject List */}
            <div 
              ref={rightColumnRef}
              onScroll={handleRightScroll}
              className="flex flex-col gap-4 sm:gap-6 overflow-y-auto relative"
            >
              {/* Bottom fade indicator */}
              {showRightScrollIndicator && (
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white/80 to-transparent pointer-events-none z-5"></div>
              )}
              {/* Scroll indicator for right column */}
              {showRightScrollIndicator && (
                <div className="absolute top-2 right-2 z-10 pointer-events-none">
                  <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-bounce flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Scroll
                  </div>
                </div>
              )}
              {/* Show all subjects for selected year level as cards/list, right after year level selection */}
              {assignment.year_level && assignment.semester && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-700">
                      Subjects for {yearLevels.find(l => l.value === assignment.year_level)?.label || assignment.year_level} - {semesterTypes.find(s => s.value === assignment.semester)?.label || assignment.semester}:
                    </h4>
                    {selectedSubjects.length > 0 && (
                      <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {selectedSubjects.length} selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    Select one or more subjects for this year level, semester, and section
                  </p>
                  {filteredCourses.length > 0 ? (
                    <div className="overflow-y-auto max-h-48 sm:max-h-64 md:max-h-72 lg:max-h-96 rounded-lg border border-blue-100 bg-white/60">
                      {/* Select All Checkbox */}
                      <div className="sticky top-0 bg-blue-100 border-b border-blue-200 p-3">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allSubjectsSelected}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate = someSubjectsSelected;
                              }
                            }}
                            onChange={handleSelectAllSubjects}
                            className="accent-blue-600 w-5 h-5"
                          />
                          <span className="font-semibold text-blue-900 text-sm">
                            {allSubjectsSelected ? 'Deselect All' : 'Select All'} Subjects
                          </span>
                          <span className="text-xs text-blue-700 bg-blue-200 px-2 py-1 rounded-full">
                            {selectedSubjects.length} of {filteredCourses.length} selected
                          </span>
                        </label>
                      </div>
                      
                      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-2">
                        {filteredCourses.map(subject => (
                          <li
                            key={subject.id}
                            className={`flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-gray-800 transition-all duration-150 ${selectedSubjects.includes(subject.id) ? 'ring-2 ring-blue-400 bg-blue-100' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedSubjects.includes(subject.id)}
                              onChange={() => handleSubjectCheckbox(subject.id)}
                              className="accent-blue-600 w-4 h-4"
                              id={`subject-checkbox-${subject.id}`}
                            />
                            <label htmlFor={`subject-checkbox-${subject.id}`} className="cursor-pointer select-none w-full flex items-center gap-2">
                              {subject.display_name || subject.name || subject.code}
                              {/* Semester Badge */}
                              {subject.semester === 'First Semester' && (
                                <span className="ml-2 inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">1st Sem</span>
                              )}
                              {subject.semester === 'Second Semester' && (
                                <span className="ml-2 inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">2nd Sem</span>
                              )}
                              {subject.semester === 'Summer' && (
                                <span className="ml-2 inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">Summer</span>
                              )}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No subjects available for this year level.</p>
                  )}
                  {assignment.year_level && filteredCourses.length === 0 && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 font-medium">Debug Information:</p>
                      <p className="text-xs text-yellow-700">Selected Year Level: {assignment.year_level}</p>
                      <p className="text-xs text-yellow-700">Selected Semester: {assignment.semester}</p>
                      <p className="text-xs text-yellow-700">Total Courses: {courses.length}</p>
                      <p className="text-xs text-yellow-700">Available Year Levels: {Array.from(new Set(courses.map(c => c.year_level))).join(', ')}</p>
                      <p className="text-xs text-yellow-700">Available Semesters: {Array.from(new Set(courses.map(c => c.semester))).join(', ')}</p>
                      <p className="text-xs text-yellow-700">Filtered Courses: {filteredCourses.length}</p>
                    </div>
                  )}
                </div>
              )}
              {(!assignment.year_level || !assignment.semester) && (
                <div className="mt-2">
                  <h4 className="font-semibold text-gray-700 mb-2">Subjects:</h4>
                  <p className="text-sm text-gray-500">
                    {!assignment.year_level && !assignment.semester 
                      ? 'Please select a year level and semester to view available subjects.'
                      : !assignment.year_level 
                      ? 'Please select a year level to view available subjects.'
                      : 'Please select a semester to view available subjects.'
                    }
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Total courses available: {courses.length}</p>
                  <p className="text-xs text-gray-400">Total sections available: {sections.length}</p>
                  {sections.length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      <p>Sample sections:</p>
                      <ul className="ml-2">
                        {sections.slice(0, 3).map(section => (
                          <li key={section.id}>ID: {section.id}, Name: {section.name}, Year: {section.year_level}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {courses.length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      <p>Sample courses:</p>
                      <ul className="ml-2">
                        {courses.slice(0, 3).map(course => (
                          <li key={course.id}>ID: {course.id}, Name: {course.display_name}, Year: {course.year_level}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* Subject validation message */}
              {(formErrors.subject_id || selectedSubjects.length === 0) && (
                <p className="mt-1 text-sm text-red-600">{formErrors.subject_id || 'Please select at least one subject'}</p>
              )}

            </div>
            
            {/* Action Buttons - full width on mobile, right on desktop */}
            <div className="md:col-span-2 flex flex-col sm:flex-row justify-end items-center gap-3 mt-4 sm:mt-6 lg:mt-8 flex-shrink-0 pt-4 border-t border-gray-200 relative">
              {/* Scroll up indicator */}
              {showActionButtonIndicator && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 pointer-events-none">
                  <div className="bg-gray-500 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-pulse flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Action buttons below
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting || !isFormValid()}
                className={`w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base font-semibold border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                  isFormValid() && !formSubmitting
                    ? 'text-white bg-blue-600 hover:bg-blue-700 shadow-md'
                    : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                }`}
              >
                {formSubmitting ? 'Saving...' : isEditMode ? 'Update Assignment' : 'Assign Subject'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCancelConfirmation}
          />
          
          {/* Confirmation Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-100 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Confirm Assignment</h3>
                <p className="text-sm text-gray-600">Please review the details below</p>
              </div>
              <button 
                onClick={handleCancelConfirmation}
                className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 hover:scale-110 hover:rotate-90 top-2 right-2 sm:top-3 sm:right-3"
                aria-label="Close confirmation"
                style={{ backgroundColor: 'rgb(239, 68, 68)', boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px', zIndex: 50 }}
              >
                ×
              </button>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-red-100 rounded-full">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{modalError}</p>
                  </div>
                  <button 
                    onClick={() => setModalError('')}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Success Message */}
            {modalSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-green-100 rounded-full">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">{modalSuccess}</p>
                  </div>
                  <button 
                    onClick={() => setModalSuccess('')}
                    className="text-green-400 hover:text-green-600"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Assignment Details */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="space-y-3 text-sm">
                {/* Teacher Information */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-semibold text-blue-900 text-xs uppercase tracking-wide">Teacher Information</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Name:</span>
                    <span className="text-gray-900 font-semibold">{selectedTeacher?.full_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Department:</span>
                    <span className="text-gray-900">{selectedTeacher?.department || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Role:</span>
                    <span className="text-gray-900 capitalize">{selectedTeacher?.role}</span>
                  </div>
                </div>

                {/* Assignment Details */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-green-900 text-xs uppercase tracking-wide">Assignment Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Section:</span>
                      <span className="text-gray-900 font-semibold">Section {assignment.section}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Year Level:</span>
                      <span className="text-gray-900 font-semibold">{assignment.year_level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Semester:</span>
                      <span className="text-gray-900 font-semibold">{assignment.semester}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Academic Year:</span>
                      <span className="text-gray-900 font-semibold">{assignment.academic_year}</span>
                    </div>
                  </div>
                </div>

                {/* Schedule Information */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="font-semibold text-purple-900 text-xs uppercase tracking-wide">Schedule</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Day(s):</span>
                      <span className="text-gray-900 font-semibold">
                        {selectedDay && selectedDay.length > 0 ? selectedDay.join(', ') : 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Time:</span>
                      <span className="text-gray-900 font-semibold">{assignment.time || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                {/* Subjects Summary */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="font-semibold text-orange-900 text-xs uppercase tracking-wide">Subjects to be Assigned</span>
                    <span className="ml-auto text-xs font-bold bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                      {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {/* Subject List */}
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedSubjects.map((subjectId, index) => {
                      const subject = courses.find(c => c.id === subjectId);
                      return (
                        <div key={subjectId} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 font-mono">#{index + 1}</span>
                            <span className="font-medium text-gray-800">{subject?.code || 'N/A'}</span>
                            <span className="text-gray-600">-</span>
                            <span className="text-gray-700 truncate max-w-24">{subject?.name || subjectId}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">({subject?.units || 0} units)</span>
                            {subject?.semester && (
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                subject.semester === 'First Semester' ? 'bg-blue-100 text-blue-800' : 
                                subject.semester === 'Second Semester' ? 'bg-green-100 text-green-800' : 
                                subject.semester === 'Summer' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {subject.semester === 'First Semester' ? '1st' : 
                                 subject.semester === 'Second Semester' ? '2nd' : 
                                 subject.semester === 'Summer' ? 'Sum' : 
                                 subject.semester}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Summary Stats */}
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Total Units:</span>
                        <span className="font-semibold text-gray-800">
                          {selectedSubjects.reduce((total, subjectId) => {
                            const subject = courses.find(c => c.id === subjectId);
                            return total + (subject?.units || 0);
                          }, 0)} units
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Average per Subject:</span>
                        <span className="font-semibold text-gray-800">
                          {selectedSubjects.length > 0 ? 
                            (selectedSubjects.reduce((total, subjectId) => {
                              const subject = courses.find(c => c.id === subjectId);
                              return total + (subject?.units || 0);
                            }, 0) / selectedSubjects.length).toFixed(1) : 0
                          } units
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning/Info Box */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-xs text-amber-800">
                      <p className="font-medium mb-1">Please verify all information above is correct.</p>
                      <p>This will create {selectedSubjects.length} separate subject assignment{selectedSubjects.length !== 1 ? 's' : ''} for the selected instructor.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelConfirmation}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={formSubmitting}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formSubmitting ? 'Saving...' : 'Confirm Assignment'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  // Use portal so the modal is centered relative to the viewport, not within nested containers
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  return portalTarget ? createPortal(modalContent, portalTarget) : modalContent;
};

export default SubjectAssignmentModal;
