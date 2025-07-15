import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface TeacherSubject {
  id?: string;
  teacher_id: string;
  subject_id: string;
  section: string;
  academic_year: string;
  semester: string;
  year_level: string; // Added year_level
  is_active: boolean;
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
  description: string;
  units: number;
  display_name: string;
}

interface SubjectAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
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

  // Add year levels array
  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] subject-modal">
      {/* Semi-transparent overlay with enhanced blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal container */}
      <div className="flex items-center justify-center h-full p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-md rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/20 relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              {isEditMode ? 'Edit Subject Assignment' : 'Assign New Subject'}
            </h3>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Teacher Selection */}
            <div className="mb-5">
              <label htmlFor="teacher_id" className="block text-sm font-medium text-gray-700 mb-1">
                Teacher <span className="text-red-500">*</span>
              </label>
              <select
                id="teacher_id"
                name="teacher_id"
                value={assignment.teacher_id}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  formErrors.teacher_id 
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
              {formErrors.teacher_id && (
                <p className="mt-1 text-sm text-red-600">{formErrors.teacher_id}</p>
              )}
            </div>
            
            {/* Subject Selection */}
            <div className="mb-5">
              <label htmlFor="subject_id" className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                id="subject_id"
                name="subject_id"
                value={assignment.subject_id}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  formErrors.subject_id 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
              >
                <option value="">Select a Subject</option>
                {courses.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.display_name}
                  </option>
                ))}
              </select>
              {formErrors.subject_id && (
                <p className="mt-1 text-sm text-red-600">{formErrors.subject_id}</p>
              )}
            </div>

            {/* Section */}
            <div className="mb-5">
              <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
                Section <span className="text-red-500">*</span>
              </label>
              <select
                id="section"
                name="section"
                value={assignment.section}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  formErrors.section 
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
              {formErrors.section && (
                <p className="mt-1 text-sm text-red-600">{formErrors.section}</p>
              )}
            </div>

            {/* Year Level */}
            <div className="mb-5">
              <label htmlFor="year_level" className="block text-sm font-medium text-gray-700 mb-1">
                Year Level <span className="text-red-500">*</span>
              </label>
              <select
                id="year_level"
                name="year_level"
                value={assignment.year_level}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  formErrors.year_level 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
                required
              >
                <option value="">Select Year Level</option>
                {yearLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {formErrors.year_level && (
                <p className="mt-1 text-sm text-red-600">{formErrors.year_level}</p>
              )}
            </div>

            {/* Academic Year */}
            <div className="mb-5">
              <label htmlFor="academic_year" className="block text-sm font-medium text-gray-700 mb-1">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                id="academic_year"
                name="academic_year"
                value={assignment.academic_year}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  formErrors.academic_year 
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
              {formErrors.academic_year && (
                <p className="mt-1 text-sm text-red-600">{formErrors.academic_year}</p>
              )}
            </div>

            {/* Semester */}
            <div className="mb-5">
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                Semester <span className="text-red-500">*</span>
              </label>
              <select
                id="semester"
                name="semester"
                value={assignment.semester}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm"
              >
                <option value="">Select semester</option>
                <option value="1st">First Semester</option>
                <option value="2nd">Second Semester</option>
                <option value="Summer">Summer</option>
              </select>
              {formErrors.semester && (
                <p className="mt-1 text-sm text-red-600">{formErrors.semester}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formSubmitting ? 'Saving...' : isEditMode ? 'Update Assignment' : 'Assign Subject'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default SubjectAssignmentModal;
