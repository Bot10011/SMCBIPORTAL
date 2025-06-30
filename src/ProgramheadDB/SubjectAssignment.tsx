import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useModal } from '../contexts/ModalContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, AlertCircle, FileEdit, Trash2 } from 'lucide-react';
import SubjectAssignmentModal from './SubjectAssignmentModal';
import { toast } from 'react-hot-toast';

interface TeacherSubject {
  id?: string;
  teacher_id: string;
  subject_id: string;  // This will store the course_id
  section: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
  created_at?: string;
  teacher_name?: string;
  subject_code?: string;  // This will store the course_code
  subject_name?: string;  // This will store the course_name
  subject_units?: number; // This will store the course_units
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

interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  units: number;
  display_name: string;
}

interface DatabaseCourse {
  id: string;
  code: string;
  name: string;
  description: string;
  units: number;
}

interface DatabaseTeacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department?: string;
  is_active: boolean;
}

interface DatabaseAssignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  section: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
  created_at: string;
  teacher: DatabaseTeacher;
  subject: DatabaseCourse;
}

const SubjectAssignment: React.FC = () => {
  const { isModalOpen, closeModal, openModal } = useModal();
  const [assignments, setAssignments] = useState<TeacherSubject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });
  
  const [selectedAssignment, setSelectedAssignment] = useState<TeacherSubject | null>(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    isEditMode: false
  });

  const [newAssignment, setNewAssignment] = useState<TeacherSubject>({
    teacher_id: '',
    subject_id: '',
    section: '',
    academic_year: '',
    semester: '',
    is_active: true
  });

  // Add sections array
  const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  useEffect(() => {
    fetchAssignments();
    fetchTeachers();
    fetchCourses();
  }, []);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      // First, get the assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('teacher_subjects')
        .select(`
          id,
          teacher_id,
          subject_id,
          section,
          academic_year,
          semester,
          is_active,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      console.log('Fetched assignmentsData:', assignmentsData);

      if (assignmentsData) {
        // Then, get the related teacher and course data for each assignment
        const formattedAssignments = await Promise.all(
          assignmentsData.map(async (assignment) => {
            try {
              // Get teacher data from user_profiles table
              const { data: teacherData, error: teacherError } = await supabase
                .from('user_profiles')
                .select('id, first_name, last_name, email, role, is_active')
                .eq('id', assignment.teacher_id)
                .eq('role', 'teacher')
                .single();

              if (teacherError || !teacherData) {
                console.warn('Missing teacher for assignment', assignment, teacherError);
                return null;
              }

              // Get course data
              const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('id, code, name, description, units')
                .eq('id', assignment.subject_id)
                .single();

              if (courseError || !courseData) {
                console.warn('Missing course for assignment', assignment, courseError);
                return null;
              }

              return {
                ...assignment,
                teacher_name: `${teacherData.first_name} ${teacherData.last_name}`,
                subject_code: courseData.code,
                subject_name: courseData.name,
                subject_units: courseData.units
              };
            } catch (err) {
              console.error('Error formatting assignment:', assignment, err);
              return null;
            }
          })
        );
        setAssignments(formattedAssignments.filter(Boolean) as TeacherSubject[]);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to fetch assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, role, department, is_active')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;

      if (data) {
        const formattedTeachers = data.map(teacher => ({
          ...teacher,
          full_name: `${teacher.first_name} ${teacher.last_name}`
        }));
        setTeachers(formattedTeachers);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to fetch teachers');
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, code, name, description, units')
        .order('code', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedCourses = data.map(course => ({
          ...course,
          display_name: `${course.code} - ${course.name} (${course.units} units)`
        }));
        setCourses(formattedCourses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAssignment(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormErrors({});

    try {
      // Validate form
      const errors: Record<string, string> = {};
      if (!newAssignment.teacher_id) errors.teacher_id = 'Please select a teacher';
      if (!newAssignment.subject_id) errors.subject_id = 'Please select a subject';
      if (!newAssignment.section) errors.section = 'Please enter a section';
      if (!newAssignment.academic_year) errors.academic_year = 'Please enter an academic year';
      if (!newAssignment.semester) errors.semester = 'Please select a semester';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setFormSubmitting(false);
        return;
      }

      if (modalState.isEditMode && newAssignment.id) {
        // Update existing assignment
        const { error } = await supabase
          .from('teacher_subjects')
          .update({
            teacher_id: newAssignment.teacher_id,
            subject_id: newAssignment.subject_id,
            section: newAssignment.section,
            academic_year: newAssignment.academic_year,
            semester: newAssignment.semester,
            is_active: newAssignment.is_active
          })
          .eq('id', newAssignment.id);

        if (error) throw error;
        toast.success('Assignment updated successfully');
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('teacher_subjects')
          .insert([{
            teacher_id: newAssignment.teacher_id,
            subject_id: newAssignment.subject_id,
            section: newAssignment.section,
            academic_year: newAssignment.academic_year,
            semester: newAssignment.semester,
            is_active: true
          }]);

        if (error) throw error;
        toast.success('Subject assigned successfully');
      }

      // Refresh assignments list
      fetchAssignments();
      
      // Close modal and reset form
      setModalState({
        isOpen: false,
        isEditMode: false
      });
      setNewAssignment({
        teacher_id: '',
        subject_id: '',
        section: '',
        academic_year: '',
        semester: '',
        is_active: true
      });
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast.error('Failed to save assignment');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEdit = (assignment: TeacherSubject) => {
    setNewAssignment(assignment);
    setModalState({
      isOpen: true,
      isEditMode: true
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Subject assignment deleted successfully');
      fetchAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete subject assignment');
    }
  };

  const resetForm = () => {
    setNewAssignment({
      teacher_id: '',
      subject_id: '',
      section: '',
      academic_year: '',
      semester: '',
      is_active: true
    });
    setFormErrors({});
    setModalState({
      isOpen: false,
      isEditMode: false
    });
    setSelectedAssignment(null);
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({
      show: true,
      message,
      type
    });

    // Hide notification after 5 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const handleOpenModal = () => {
    resetForm();
    openModal('subject');
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      isEditMode: false
    });
    setFormErrors({});
    setNewAssignment({
      teacher_id: '',
      subject_id: '',
      section: '',
      academic_year: '',
      semester: '',
      is_active: true
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Subject Assignments</h1>
        <button
          onClick={() => {
            setModalState({
              isOpen: true,
              isEditMode: false
            });
            setNewAssignment({
              teacher_id: '',
              subject_id: '',
              section: '',
              academic_year: '',
              semester: '',
              is_active: true
            });
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Assign Subject
        </button>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 mb-6 rounded-lg flex items-center gap-3 ${
              notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <Check size={20} className="text-green-600" />
            ) : (
              <AlertCircle size={20} className="text-red-600" />
            )}
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className="ml-auto"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignments Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Units
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Academic Year
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Semester
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Assigned
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading subject assignments...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                    No subject assignments found. Click "Assign Subject" to create one.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {assignment.teacher_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.subject_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {assignment.subject_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.subject_units}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.academic_year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.semester}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(assignment.created_at || '').toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(assignment)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                        >
                          <FileEdit size={18} />
                        </button>
                        <button
                          onClick={() => assignment.id && handleDelete(assignment.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for adding/editing assignments */}
      <SubjectAssignmentModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        formErrors={formErrors}
        assignment={newAssignment}
        handleInputChange={handleInputChange}
        formSubmitting={formSubmitting}
        isEditMode={modalState.isEditMode}
        teachers={teachers}
        courses={courses}
      />
    </div>
  );
};

export default SubjectAssignment;
