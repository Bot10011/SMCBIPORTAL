import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Course {
  id?: number;
  code: string;
  name: string;
  units: number;
  year_level?: string;
}

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditMode?: boolean;
  courseToEdit?: Course | null;
  onCourseUpdated?: () => void;
}

const CourseModal = ({
  isOpen,
  onClose,
  isEditMode = false,
  courseToEdit = null,
  onCourseUpdated
}: CourseModalProps) => {
  const [newCourse, setNewCourse] = useState<Course>({
    code: '',
    name: '',
    units: 0,
    year_level: ''
  });
  const [formErrors, setFormErrors] = useState<{ code?: string; name?: string; units?: string; year_level?: string }>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  // Initialize form with course data when editing
  useEffect(() => {
    if (isEditMode && courseToEdit) {
      setNewCourse({
        code: courseToEdit.code,
        name: courseToEdit.name,
        units: courseToEdit.units,
        year_level: courseToEdit.year_level || ''
      });
    } else {
      setNewCourse({
        code: '',
        name: '',
        units: 0,
        year_level: ''
      });
    }
    setFormErrors({});
  }, [isEditMode, courseToEdit, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewCourse(prev => ({
      ...prev,
      [name]: name === 'units' ? Number(value) : value
    }));
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[name as keyof typeof formErrors];
        return updated;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: { code?: string; name?: string; units?: string; year_level?: string } = {};
    if (!newCourse.code.trim()) errors.code = 'Course Code is required';
    if (!newCourse.name.trim()) errors.name = 'Course Name is required';
    if (!newCourse.units) errors.units = 'Units is required';
    if (!newCourse.year_level) errors.year_level = 'Year Level is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      setFormSubmitting(true);
      
      if (isEditMode && courseToEdit?.id) {
        // Update existing course
        const { error: updateError } = await supabase
          .from('courses')
          .update({ 
            code: newCourse.code, 
            name: newCourse.name, 
            units: newCourse.units, 
            year_level: newCourse.year_level,
            updated_at: new Date().toISOString()
          })
          .eq('id', courseToEdit.id);
        
        if (updateError) throw updateError;
        setNotification({ show: true, message: 'Course updated successfully!', type: 'success' });
      } else {
        // Create new course
        const { error: insertError } = await supabase
          .from('courses')
          .insert([{ 
            code: newCourse.code, 
            name: newCourse.name, 
            units: newCourse.units, 
            year_level: newCourse.year_level
          }]);
        
        if (insertError) throw insertError;
        setNotification({ show: true, message: 'Course added successfully!', type: 'success' });
      }
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'success' });
        onClose();
        setNewCourse({ code: '', name: '', units: 0, year_level: '' });
        setFormErrors({});
        setFormSubmitting(false);
        if (onCourseUpdated) {
          onCourseUpdated();
        }
      }, 1200);
    } catch (error) {
      console.error('Error saving course:', error);
      setNotification({ 
        show: true, 
        message: isEditMode ? 'Failed to update course. Please try again.' : 'Failed to add course. Please try again.', 
        type: 'error' 
      });
      setFormSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Disable scrolling on body when modal is open
      document.body.style.overflow = 'hidden';
      
      // Prevent Escape key from closing the modal
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        // Re-enable scrolling when modal closes
        document.body.style.overflow = 'auto';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Global blur overlay - covers entire viewport */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        style={{
          top: '-200px',
          left: '-200px',
          right: '-200px',
          bottom: '-200px',
          width: 'calc(100vw + 400px)',
          height: 'calc(100vh + 400px)',
        }}
      />
      
      {/* Modal container */}
      <div className="fixed inset-0 z-[9999] course-modal overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen p-2 sm:p-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-10 max-w-md w-full mx-2 sm:mx-4 shadow-2xl border border-white/20 relative z-10 my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0.8, rotate: -5 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                  isEditMode 
                    ? 'bg-gradient-to-br from-orange-400 to-red-500 shadow-orange-500/20' 
                    : 'bg-gradient-to-br from-blue-400 to-indigo-500 shadow-blue-500/20'
                }`}
              >
                <div className={`absolute inset-0 rounded-full animate-ping opacity-40 ${
                  isEditMode ? 'bg-orange-500/20' : 'bg-blue-500/20'
                }`}></div>
                {isEditMode ? (
                  <Edit className="w-6 h-6 text-white" />
                ) : (
                  <Plus className="w-6 h-6 text-white" />
                )}
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {isEditMode ? 'Edit Course' : 'Add New Course'}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90 top-2 right-2 sm:top-3 sm:right-3"
              aria-label="Close modal"
              style={{ backgroundColor: 'rgb(239, 68, 68)', boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px', zIndex: 50 }}
            >
              ×
            </button>
          </div>

          {/* Form content */}
          <form onSubmit={handleSubmit} className="space-y-6 relative">
            {/* Background gradient with proper positioning */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-indigo-50/50 rounded-3xl -z-10 opacity-50"></div>
            
            {/* Form fields container */}
            <div className="relative space-y-6">
              {/* Course Code */}
              <div className="relative">
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Course Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={newCourse.code}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    formErrors.code 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
                  placeholder="Enter course code"
                />
                {formErrors.code && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.code}</p>
                )}
              </div>

              {/* Course Name */}
              <div className="relative">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newCourse.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    formErrors.name 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
                  placeholder="Enter course name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              {/* Units */}
              <div className="relative">
                <label htmlFor="units" className="block text-sm font-medium text-gray-700 mb-1">
                  Units <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="units"
                  name="units"
                  value={newCourse.units === 0 ? '' : newCourse.units}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    formErrors.units 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
                  placeholder="Enter number of units"
                />
                {formErrors.units && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.units}</p>
                )}
              </div>

              {/* Year Level */}
              <div className="relative">
                <label htmlFor="year_level" className="block text-sm font-medium text-gray-700 mb-1">
                  Year Level <span className="text-red-500">*</span>
                </label>
                <select
                  id="year_level"
                  name="year_level"
                  value={newCourse.year_level || ''}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    formErrors.year_level 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm`}
                  required
                >
                  <option value="">Select year level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
                {formErrors.year_level && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.year_level}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <motion.button
                  type="submit"
                  disabled={formSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-3 px-6 rounded-xl text-white font-medium shadow-lg transition-all duration-200 ${
                    formSubmitting
                      ? 'bg-blue-400 cursor-not-allowed'
                      : isEditMode
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                  }`}
                >
                  {formSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>{isEditMode ? 'Updating Course...' : 'Adding Course...'}</span>
                    </div>
                  ) : (
                    isEditMode ? 'Update Course' : 'Add Course'
                  )}
                </motion.button>
              </div>
            </div>
          </form>
          {/* Notification */}
          {notification.show && (
            <div className={`p-3 mb-2 rounded-lg text-center font-semibold ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{notification.message}</div>
          )}
        </motion.div>
        </div>
      </div>
    </>
  );
};

export default CourseModal; 
