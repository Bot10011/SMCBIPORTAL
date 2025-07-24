import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface TeacherSubject {
  id?: string;
  teacher_id: string;
  subject_id: string;
  section: string;
  academic_year: string;
  year_level: string; // Added year_level
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

  // Filter courses by selected year level - both use the same format now
  const filteredCourses = assignment.year_level
    ? courses.filter(subject => subject.year_level === assignment.year_level)
    : [];

  // Reset selected subjects when year level changes
  React.useEffect(() => {
    if (assignment.year_level) {
      setSelectedSubjects([]);
    }
  }, [assignment.year_level]);

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
      assignment.academic_year &&
      assignment.year_level &&
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
        academic_year: assignment.academic_year,
        year_level: assignment.year_level,
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

  return (
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
          className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-10 max-w-5xl w-full mx-2 sm:mx-4 shadow-2xl border border-white/20 relative z-10 min-h-[60vh] max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-gray-800">
              {isEditMode ? 'Edit Subject Assignment' : 'Assign New Subject'}
            </h3>
            <button 
              onClick={onClose}
              className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90 top-2 right-2 sm:top-3 sm:right-3"
              aria-label="Close modal"
              style={{ backgroundColor: 'rgb(239, 68, 68)', boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px', zIndex: 50 }}
            >
              ×
            </button>
          </div>
          {/* Form - two column on md+ screens */}
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Left column: Teacher, Academic Year, Section, Semester */}
            <div className="flex flex-col gap-6">
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
                  className={`w-full px-4 py-3 rounded-xl border ${
                    formErrors.teacher_id || (!assignment.teacher_id && !isFormValid())
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
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
                  className={`w-full px-4 py-3 rounded-xl border ${
                    formErrors.academic_year || (!assignment.academic_year && !isFormValid())
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
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
              {/* Section */}
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
              {/* Day and Time Selection (one line) */}
              <div className="flex gap-4">
                <div className="flex-1">
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
            </div>
            {/* Right column: Year Level, Subject, Subject List */}
            <div className="flex flex-col gap-6">
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
              {/* Show all subjects for selected year level as cards/list, right after year level selection */}
              {assignment.year_level && (
                <div className="mt-2">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Subjects for {yearLevels.find(l => l.value === assignment.year_level)?.label || assignment.year_level}:
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    Select one or more subjects for this year level and section
                  </p>
                  {filteredCourses.length > 0 ? (
                    <div className="overflow-y-auto max-h-72 md:max-h-96 rounded-lg border border-blue-100 bg-white/60">
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
                              {subject.display_name}
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
                </div>
              )}
              {/* Subject validation message */}
              {(formErrors.subject_id || selectedSubjects.length === 0) && (
                <p className="mt-1 text-sm text-red-600">{formErrors.subject_id || 'Please select at least one subject'}</p>
              )}
              

              

            </div>
            
            {/* Action Buttons - full width on mobile, right on desktop */}
            <div className="md:col-span-2 flex flex-col sm:flex-row justify-end items-center gap-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting || !isFormValid()}
                className={`w-full sm:w-auto px-5 py-2.5 text-base font-semibold border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
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
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Teacher:</span>
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
  );
};

export default SubjectAssignmentModal;
