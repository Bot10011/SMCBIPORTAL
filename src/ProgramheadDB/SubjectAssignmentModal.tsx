import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

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

interface SubjectAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (assignments: TeacherSubject[]) => Promise<{ success: boolean; message: string }>;
  onSuccess?: () => void; // Callback for successful submission
  formErrors: Record<string, string>;
  assignment: TeacherSubject;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  formSubmitting: boolean;
  isEditMode: boolean;
  teachers: Teacher[];
  courses: Subject[];
}

const SubjectAssignmentModal: React.FC<SubjectAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSuccess,
  formErrors,
  assignment,
  handleInputChange,
  formSubmitting,
  isEditMode,
  teachers,
  courses
}) => {
  // Add sections array
  const sections = ['A', 'B', 'C', 'D'];

  // Auto-calculate academic year based on current date
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11 (Jan = 0, Dec = 11)
  
  // Academic year runs from June to May
  // If current month is June or later, use current year as start
  // If current month is January to May, use previous year as start
  const academicYearStart = currentMonth >= 5 ? currentYear : currentYear - 1;
  const academicYear = `${academicYearStart}-${academicYearStart + 1}`;

  // Add year levels array (value/label pairs) - use full format to match database
  const yearLevels = [
    { value: '1st Year', label: '1st Year' },
    { value: '2nd Year', label: '2nd Year' },
    { value: '3rd Year', label: '3rd Year' },
    { value: '4th Year', label: '4th Year' }
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
  // Reverse mapping from abbreviations to full names
  const dayAbbrToFull: Record<string, string> = {
    'M': 'Monday',
    'T': 'Tuesday',
    'W': 'Wednesday',
    'Th': 'Thursday',
    'F': 'Friday',
    'S': 'Saturday',
    'Su': 'Sunday',
  };

  // Multi-select state for subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() => {
    if (isEditMode && assignment.subject_id) {
      // For editing, ensure subject_id is properly handled
      return Array.isArray(assignment.subject_id) ? assignment.subject_id : [assignment.subject_id];
    }
    return [];
  });
  
  // Multi-select state for day
  const [selectedDay, setSelectedDay] = useState<string[]>(() => {
    if (isEditMode && assignment.day) {
      // For editing, ensure day is properly parsed
      const dayValue = assignment.day;
      if (typeof dayValue === 'string') {
        // Convert abbreviations to full day names for the UI
        const dayAbbreviations = dayValue.split(',').filter(d => d.trim() !== '');
        return dayAbbreviations.map(abbr => dayAbbrToFull[abbr] || abbr);
      }
      return Array.isArray(dayValue) ? dayValue : [];
    }
    return [];
  });

  // Track if form has been modified (for edit mode)
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [originalAssignment, setOriginalAssignment] = useState<TeacherSubject | null>(null);
  
  // Set academic year automatically when component mounts
  React.useEffect(() => {
    // Only set academic year if it's not already set (for new assignments)
    // For existing assignments, preserve the current academic year
    if (!assignment.academic_year) {
      handleInputChange({
        target: { name: 'academic_year', value: academicYear }
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [academicYear, assignment.academic_year]);

  // Filter courses by selected year level - both use the same format now
  const filteredCourses = assignment.year_level
    ? courses.filter(subject => subject.year_level === assignment.year_level)
    : [];
    
  // Debug logging for edit mode
  console.log('Modal debug - filteredCourses:', filteredCourses);
  console.log('Modal debug - selectedSubjects:', selectedSubjects);
  console.log('Modal debug - selectedDay:', selectedDay);
  console.log('Modal debug - assignment.year_level:', assignment.year_level);

  // Reset selected subjects when year level changes
  React.useEffect(() => {
    if (assignment.year_level) {
      setSelectedSubjects([]);
    }
  }, [assignment.year_level]);

  // Sync selectedSubjects and selectedDay when assignment changes (for edit mode)
  React.useEffect(() => {
    console.log('Modal useEffect - isEditMode:', isEditMode, 'assignment:', assignment); // Debug log
    
    if (isEditMode && assignment.subject_id) {
      const subjectIds = Array.isArray(assignment.subject_id) ? assignment.subject_id : [assignment.subject_id];
      console.log('Setting selectedSubjects:', subjectIds); // Debug log
      setSelectedSubjects(subjectIds);
    }
    
    if (isEditMode && assignment.day) {
      const dayValue = assignment.day;
      if (typeof dayValue === 'string') {
        // Convert abbreviations to full day names for the UI
        const dayAbbreviations = dayValue.split(',').filter(d => d.trim() !== '');
        const fullDayNames = dayAbbreviations.map(abbr => dayAbbrToFull[abbr] || abbr);
        console.log('Setting selectedDay:', fullDayNames); // Debug log
        setSelectedDay(fullDayNames);
      } else if (Array.isArray(dayValue)) {
        setSelectedDay(dayValue);
      }
    }

    // Store original assignment for change tracking
    if (isEditMode && !originalAssignment) {
      setOriginalAssignment({ ...assignment });
    }

    // Reset form changes when assignment changes
    setHasFormChanges(false);
  }, [isEditMode, assignment.subject_id, assignment.day]);

  // Track form changes for edit mode
  React.useEffect(() => {
    if (isEditMode && originalAssignment) {
      // Get the original values from the stored original assignment
      const originalSubjectIds = originalAssignment.subject_id ? (Array.isArray(originalAssignment.subject_id) ? originalAssignment.subject_id : [originalAssignment.subject_id]) : [];
      const originalDays = originalAssignment.day ? originalAssignment.day.split(',').map(d => dayAbbrToFull[d.trim()] || d.trim()).filter(d => d) : [];
      
      // Check if any field has changed from the original assignment
      const hasChanges = 
        assignment.teacher_id !== originalAssignment.teacher_id ||
        assignment.section !== originalAssignment.section ||
        assignment.year_level !== originalAssignment.year_level ||
        assignment.semester !== originalAssignment.semester ||
        assignment.time !== originalAssignment.time ||
        JSON.stringify(selectedSubjects.sort()) !== JSON.stringify(originalSubjectIds.sort()) ||
        JSON.stringify(selectedDay.sort()) !== JSON.stringify(originalDays.sort());

      console.log('Form changes detected:', hasChanges, 'original:', originalAssignment, 'current:', assignment); // Debug log
      setHasFormChanges(hasChanges);
    }
  }, [isEditMode, originalAssignment, assignment, selectedSubjects, selectedDay]);

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
      assignment.year_level &&
      assignment.semester &&
      selectedDay.length > 0 &&
      assignment.time
    );
  };

  // Get selected teacher name
  const selectedTeacher = teachers.find(t => t.id === assignment.teacher_id);



  // State for confirmation modal
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [modalError, setModalError] = useState<string>('');
  const [modalSuccess, setModalSuccess] = useState<string>('');

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
        const abbr = selectedDay.map(d => dayAbbr[d] || d);
        return {
          teacher_id: assignment.teacher_id,
          subject_id: subjectId,
          section: assignment.section,
          academic_year: assignment.academic_year || academicYear, // Use assignment state or fallback to calculated
          year_level: assignment.year_level,
          semester: assignment.semester || '', // Use the semester selected in the modal form
          day: abbr.length === 1 ? abbr[0] : abbr.join(','),
          time: assignment.time,
          is_active: true
        };
      });
    // Debug log
    console.log('DEBUG assignments sent to parent:', assignments);
    console.log('DEBUG academic year being used:', assignment.academic_year || academicYear);

    try {
      // Call the parent's onSubmit with the assignments array
      const result = await onSubmit(assignments);
      
      if (result.success) {
        setModalSuccess(result.message);
        // Close modal after 2 seconds and refresh parent
        setTimeout(() => {
          setShowConfirmation(false);
          setModalSuccess('');
          // Close the main modal and refresh the parent component
          onClose();
          // Call success callback to refresh assignments list
          if (onSuccess) {
            onSuccess();
          }
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

    return createPortal(
    <div 
      className="fixed inset-0 z-[9999] subject-modal-overlay" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    >
      {/* Semi-transparent overlay with enhanced blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      />
      
      {/* Modal container */}
      <div className="flex items-center justify-center h-full p-2 sm:p-6 overflow-hidden">
        <div className="w-full h-full flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 max-w-4xl w-full mx-2 sm:mx-4 shadow-2xl border border-white/20 relative z-10 max-h-[95vh] flex flex-col subject-modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            transform: 'translateZ(0)',
            willChange: 'transform'
          }}
        >
          {/* Modal header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">
                {isEditMode ? 'Edit Subject Assignment' : 'Assign New Subject'}
              </h3>
              <p className="text-sm text-gray-600">
                {isEditMode ? 'Update the subject assignment details' : 'Create a new subject assignment'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Form - two column on md+ screens */}
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 flex-1">
            {/* Left column: Basic Info (2x2 grid) + Day & Time */}
            <div className="flex flex-col gap-4">
              {/* Basic Info Fields - 2x2 Grid Layout */}
              <div className="grid grid-cols-2 gap-4">
                {/* Row 1: Instructor & Academic Year */}
                <div>
                  <label htmlFor="teacher_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Instructor <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="teacher_id"
                    name="teacher_id"
                    value={assignment.teacher_id}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.teacher_id || (!assignment.teacher_id && !isFormValid())
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
                  >
                    <option value="">Select a instructor</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name} {teacher.department ? `(${teacher.department})` : ''}
                      </option>
                    ))}
                  </select>
                  {(formErrors.teacher_id || (!assignment.teacher_id && !isFormValid())) && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.teacher_id || 'Please select a instructor'}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="academic_year" className="block text-sm font-medium text-gray-700 mb-1">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="academic_year"
                    name="academic_year"
                    value={assignment.academic_year || academicYear}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                 
                </div>
                
                {/* Row 2: Section & Year Level */}
                <div>
                  <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="section"
                    name="section"
                    value={assignment.section}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.section || (!assignment.section && !isFormValid())
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
                    required
                  >
                    <option value="">Select Section</option>
                    {sections.map((section) => (
                      <option key={section} value={section}>
                        Section {section}
                      </option>
                    ))}
                  </select>
                  {(formErrors.section || (!assignment.section && !isFormValid())) && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.section || 'Please select a section'}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="year_level" className="block text-sm font-medium text-gray-700 mb-1">
                    Year Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="year_level"
                    name="year_level"
                    value={assignment.year_level}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.year_level || (!assignment.year_level && !isFormValid())
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
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
                
                <div>
                  <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="semester"
                    name="semester"
                    value={assignment.semester}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.semester || (!assignment.semester && !isFormValid())
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
                    required
                  >
                    <option value="">Select Semester</option>
                    <option value="First Semester">First Semester</option>
                    <option value="Second Semester">Second Semester</option>
                    <option value="Summer">Summer</option>
                  </select>
                  {(formErrors.semester || (!assignment.semester && !isFormValid())) && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.semester || 'Please select a semester'}
                    </p>
                  )}
                </div>
                
                <div>
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
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.time || (!assignment.time && !isFormValid())
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
                    required
                  />
                  {(formErrors.time || (!assignment.time && !isFormValid())) && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.time || 'Please select a time'}
                    </p>
                  )}
                </div>
              </div>
              {/* Day Selection (horizontal line) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day(s) <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {days.map(day => (
                    <label key={day} className="inline-flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedDay.includes(day)}
                        onChange={() => handleDayCheckbox(day)}
                        className="accent-blue-600 w-4 h-4"
                      />
                      {day}
                    </label>
                  ))}
                </div>
                 {(formErrors.day || (!selectedDay || selectedDay.length === 0) && !isFormValid()) && (
                  <p className="mt-1 text-sm text-red-600">
                    {formErrors.day || 'Please select at least one day'}
                  </p>
                )}
              </div>
            </div>
            {/* Right column: Subject List */}
            <div className="flex flex-col gap-4">
              {/* Show all subjects for selected year level as cards/list */}
              {assignment.year_level && (
                <div className="pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-base font-semibold text-gray-800">
                        Available Subjects
                      </h4>
                      <p className="text-xs text-gray-600">
                        {yearLevels.find(l => l.value === assignment.year_level)?.label || assignment.year_level} • Select one or more subjects
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">
                        {filteredCourses.length} subject{filteredCourses.length !== 1 ? 's' : ''} available
                      </span>
                    </div>
                  </div>
                  
                  {filteredCourses.length > 0 ? (
                    <div className="overflow-y-auto max-h-80 md:max-h-96 rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                        {filteredCourses.map(subject => (
                          <div
                            key={subject.id}
                            className="relative"
                          >
                            <div
                              className="bg-white/ border-2 border-gray-200 rounded-xl p-4 h-48 flex flex-col"
                            >
                              {/* Checkbox and Semester Badge Row */}
                              <div className="flex items-start justify-between mb-3 flex-shrink-0">
                                <input
                                  type="checkbox"
                                  checked={selectedSubjects.includes(subject.id)}
                                  onChange={() => handleSubjectCheckbox(subject.id)}
                                  className="w-5 h-5 accent-blue-600 rounded border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0"
                                  id={`subject-checkbox-${subject.id}`}
                                />
                                
                                {/* Semester Badge - Right aligned */}
                                {subject.semester && (
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                                    subject.semester === 'First Semester' 
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : subject.semester === 'Second Semester'
                                      ? 'bg-green-100 text-green-800 border border-green-200'
                                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  }`}>
                                    {subject.semester === 'First Semester' ? '1st Sem' : 
                                     subject.semester === 'Second Semester' ? '2nd Sem' : 
                                     'Summer'}
                                  </span>
                                )}
                              </div>
                              
                              {/* Subject Code - Left aligned */}
                              <div className="mb-2 text-left flex-shrink-0">
                                <span className="inline-block text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-md">
                                  {subject.code}
                                </span>
                              </div>
                              
                              {/* Subject Name - Left aligned - Flexible height */}
                              <div className="mb-3 text-left flex-1 min-h-0">
                                <h5 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-3">
                                  {subject.name}
                                </h5>
                              </div>
                              
                              {/* Units and Selection - Bottom row */}
                              <div className="flex items-center justify-between flex-shrink-0">
                                <span className="text-xs text-gray-600 font-medium">
                                  {subject.units} {subject.units === 1 ? 'Unit' : 'Units'}
                                </span>
                                
                                {/* Selection Indicator */}
                                {selectedSubjects.includes(subject.id) && (
                                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No subjects available</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No subjects found for {yearLevels.find(l => l.value === assignment.year_level)?.label || assignment.year_level}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* Subject validation message */}
              {(formErrors.subject_id || selectedSubjects.length === 0) && (
                <p className="mt-1 text-sm text-red-600">{formErrors.subject_id || 'Please select at least one subject'}</p>
              )}
              

              

            </div>
            
            {/* Action Buttons - integrated into main modal */}
            <div className="md:col-span-2 flex flex-col sm:flex-row justify-end items-center gap-3 mt-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting || (!isFormValid() && !isEditMode) || (isEditMode && !hasFormChanges)}
                className={`w-full sm:w-auto px-5 py-2.5 text-base font-semibold border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                  (isFormValid() && !formSubmitting) || (isEditMode && hasFormChanges && !formSubmitting)
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
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                aria-label="Close confirmation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Instructor:</span>
                  <span className="text-gray-900">{selectedTeacher?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Section:</span>
                  <span className="text-gray-900">Section {assignment.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Year Level:</span>
                  <span className="text-gray-900">{assignment.year_level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Semester:</span>
                  <span className="text-gray-900">{assignment.semester}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Academic Year:</span>
                  <span className="text-gray-900">{assignment.academic_year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Day(s):</span>
                  <span className="text-gray-900">{selectedDay && selectedDay.length > 0 ? selectedDay.join(', ') : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Time:</span>
                  <span className="text-gray-900">{assignment.time}</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-gray-700">Selected Subjects:</span>
                    <span className="text-gray-900 font-semibold">{selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {selectedSubjects.map(subjectId => {
                      const subject = courses.find(c => c.id === subjectId);
                      return (
                        <div key={subjectId} className="text-xs text-gray-700 bg-white rounded px-2 py-1 border">
                          • {subject?.display_name || subjectId}
                          {subject?.semester && (
                            <span className={`ml-2 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${subject.semester === 'First Semester' ? 'bg-blue-100 text-blue-800' : subject.semester === 'Second Semester' ? 'bg-green-100 text-green-800' : subject.semester === 'Summer' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                              {subject.semester === 'First Semester' ? '1st Sem' : subject.semester === 'Second Semester' ? '2nd Sem' : subject.semester}
                            </span>
                          )}
                        </div>
                      );
                    })}
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
    </div>,
    document.body
  );

  // Additional CSS for modal positioning and blur effects
  return (
    <>
      <style>{`
        .subject-modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999 !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
          overflow: hidden !important;
          animation: fadeIn 0.3s ease-out !important;
        }
        
        .subject-modal-content {
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          transform: translateZ(0) !important;
          will-change: transform !important;
          max-height: 95vh !important;
          overflow: visible !important;
          animation: slideIn 0.3s ease-out !important;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateY(-20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        
        @media (max-width: 640px) {
          .subject-modal-overlay {
            padding: 0.5rem !important;
          }
          
          .subject-modal-content {
            max-height: 95vh !important;
            margin: 0.25rem !important;
            padding: 1rem !important;
          }
        }
        
        /* Ensure body doesn't scroll when modal is open */
        body.modal-open {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
        }
        
        /* Ensure modal is always on top */
        .subject-modal-overlay * {
          z-index: 9999 !important;
        }
      `}</style>
    </>
  );
};

export default SubjectAssignmentModal;
