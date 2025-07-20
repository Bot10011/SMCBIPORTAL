import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import CourseModal from './CourseModal';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, AlertCircle, Filter, Edit, Trash2 } from 'lucide-react';

interface Course {
  id?: number;
  code: string;
  name: string;
  units: number;
  year_level?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

const CoursesOffered: React.FC = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    isEditMode: false,
    courseToEdit: null as Course | null
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>('all');
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    courseToDelete: null as Course | null
  });
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

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
    setModalState({
      isOpen: false,
      isEditMode: false,
      courseToEdit: null
    });
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
    setModalState({
      isOpen: true,
      isEditMode: false,
      courseToEdit: null
    });
  };

  const handleEditCourse = (course: Course) => {
    setModalState({
      isOpen: true,
      isEditMode: true,
      courseToEdit: course
    });
  };

  const handleDeleteCourse = (course: Course) => {
    setDeleteModal({
      isOpen: true,
      courseToDelete: course
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.courseToDelete?.id) return;
    
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', deleteModal.courseToDelete.id);
      
      if (error) throw error;
      
      showNotification('Course deleted successfully!', 'success');
      fetchCourses(); // Refresh the list
    } catch (error) {
      console.error('Error deleting course:', error);
      showNotification('Failed to delete course. Please try again.', 'error');
    } finally {
      setDeleteModal({ isOpen: false, courseToDelete: null });
    }
  };

  const handleCourseUpdated = () => {
    fetchCourses(); // Refresh the list after update
  };

  // Get unique year levels from courses
  const yearLevels = ['all', ...Array.from(new Set(courses.map(course => course.year_level || '').filter(Boolean)))];

  // Filter courses based on selected year level
  const filteredCourses = selectedYearLevel === 'all' 
    ? courses 
    : courses.filter(course => course.year_level === selectedYearLevel);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-2xl shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Subjects Offered</h1>
              <p className="text-white/80 text-sm font-medium">Manage courses offered by your department</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenModal}
              className="p-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all flex items-center gap-2 text-white font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Add Subject</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl shadow-md flex items-center gap-3 text-lg font-semibold ${
              notification.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="w-6 h-6 text-green-500" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-500" />
            )}
            <p>{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Filter className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Filter by Year Level</h3>
              <p className="text-sm text-gray-600">Select a year level to view specific courses</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {yearLevels.map((yearLevel) => (
              <motion.button
                key={yearLevel}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedYearLevel(yearLevel)}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
                  selectedYearLevel === yearLevel
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {yearLevel === 'all' ? 'All Years' : yearLevel}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredCourses.length}</span> 
              {selectedYearLevel === 'all' 
                ? ' courses' 
                : ` courses for ${selectedYearLevel}`
              }
            </p>
            {selectedYearLevel !== 'all' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedYearLevel('all')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear Filter
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-3xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Year Level</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Units</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-lg">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                      <span>Loading courses...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-lg">
                    {selectedYearLevel === 'all' ? (
                      <>
                        <p>No courses available.</p>
                        <p className="text-base mt-1">Click the "Add Subject" button to add a new course.</p>
                      </>
                    ) : (
                      <>
                        <p>No courses found for {selectedYearLevel}.</p>
                        <p className="text-base mt-1">Try selecting a different year level or add new courses.</p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-gray-900">{course.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">{course.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">{course.year_level}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">{course.units}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEditCourse(course)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="Edit course"
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeleteCourse(course)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Modal Component */}
      <CourseModal
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        isEditMode={modalState.isEditMode}
        courseToEdit={modalState.courseToEdit}
        onCourseUpdated={handleCourseUpdated}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && (
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
            
            <div className="fixed inset-0 z-[9999] overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 relative z-10 my-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Course</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Are you sure you want to delete <span className="font-semibold">{deleteModal.courseToDelete?.code}</span> - <span className="font-semibold">{deleteModal.courseToDelete?.name}</span>?
                </p>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeleteModal({ isOpen: false, courseToDelete: null })}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-xl font-medium transition-colors"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
            </div>
          </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoursesOffered;
