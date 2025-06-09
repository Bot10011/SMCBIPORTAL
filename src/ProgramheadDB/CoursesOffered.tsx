import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useModal } from '../contexts/ModalContext';
import CourseModal from './CourseModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, AlertCircle } from 'lucide-react';

interface Course {
  id?: number;
  code: string;
  name: string;
  description: string;
  units: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

const CoursesOffered: React.FC = () => {
  const { isModalOpen, closeModal, openModal } = useModal();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });
  
  const [newCourse, setNewCourse] = useState<Course>({
    code: '',
    name: '',
    description: '',
    units: 0
  });

  // Fetch courses on component mount
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      showNotification('Failed to load courses. Please try again later.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    closeModal();
    resetForm();
  };

  const resetForm = () => {
    setNewCourse({
      code: '',
      name: '',
      description: '',
      units: 0
    });
    setFormErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewCourse(prev => ({
      ...prev,
      [name]: name === 'units' ? Number(value) : value
    }));
    
    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!newCourse.code.trim()) {
      errors.code = 'Course Code is required';
    }
    
    if (!newCourse.name.trim()) {
      errors.name = 'Course Name is required';
    }
    
    if (!newCourse.description.trim()) {
      errors.description = 'Course Description is required';
    }
    
    if (!newCourse.units) {
      errors.units = 'Units is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setFormSubmitting(true);
      
      const { data, error } = await supabase
        .from('courses')
        .insert([newCourse])
        .select();
      
      if (error) throw error;
      
      // Add the new course to the state
      if (data && data.length > 0) {
        setCourses(prev => [data[0], ...prev]);
        closeModal();
        showNotification('Course added successfully!', 'success');
      }
    } catch (error) {
      console.error('Error adding course:', error);
      showNotification('Failed to add course. Please try again.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({
      show: true,
      message,
      type
    });
    
    // Auto-hide notification after 4 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleOpenModal = () => {
    resetForm();
    openModal('course');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Courses Offered</h1>
          <p className="text-gray-600">Manage courses offered by your department</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenModal}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl 
            shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Add Course</span>
        </motion.button>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl shadow-md flex items-center gap-3 ${
              notification.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <p>{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Courses Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Units
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                      <span>Loading courses...</span>
                    </div>
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    <p className="text-base">No courses available.</p>
                    <p className="text-sm mt-1">Click the "Add Course" button to add a new course.</p>
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {course.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {course.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {course.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {course.units}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>      </div>

      {/* Course Modal Component */}
      <AnimatePresence>
        {isModalOpen && (
          <CourseModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onSubmit={handleSubmit}
            formErrors={formErrors}
            newCourse={newCourse}
            handleInputChange={handleInputChange}
            formSubmitting={formSubmitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoursesOffered;
