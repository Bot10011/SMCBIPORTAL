import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, AlertCircle, FileEdit, Trash2, Users } from 'lucide-react';
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
  year_level: string; // Make required
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

interface Course {
  id: string;
  code: string;
  name: string;
  units: number;
  year_level: string; // Make required to match Subject interface
  display_name: string;
  semester: string;
}

const SubjectAssignment: React.FC = () => {
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
    year_level: '',
    is_active: true,
    day: '',
    time: ''
  });

  // State for collapsible sections - all collapsed by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // State for year level filter
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>('all');

  // Add a mapping for day abbreviations
  const dayAbbr: Record<string, string> = {
    'Monday': 'M',
    'Tuesday': 'T',
    'Wednesday': 'W',
    'Thursday': 'Th',
    'Friday': 'F',
    'Saturday': 'S',
    'Sunday': 'Su',
  };

  // Modal state for student list
  const [studentListModal, setStudentListModal] = useState<{ open: boolean; assignment: TeacherSubject | null }>({ open: false, assignment: null });
  // State for students in the selected subject/section
  const [enrolledStudents, setEnrolledStudents] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);


  useEffect(() => {
    fetchAssignments();
    fetchTeachers();
    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchEnrolledStudents = async () => {
      if (!studentListModal.open || !studentListModal.assignment) return;
      setLoadingStudents(true);
      setEnrolledStudents([]);
      try {
        // Fetch enrollments for this subject and section
        const { data: enrollments, error } = await supabase
          .from('enrollcourse')
          .select('student_id, subject_id')
          .eq('subject_id', studentListModal.assignment.subject_id)
          .eq('section', studentListModal.assignment.section);
        if (error) throw error;
        if (!enrollments || enrollments.length === 0) {
          setEnrolledStudents([]);
          setLoadingStudents(false);
          return;
        }
        // Get student profiles
        const studentIds = enrollments.map((e: any) => e.student_id);
        const { data: students, error: studentError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, email')
          .in('id', studentIds);
        if (studentError) throw studentError;
        setEnrolledStudents(
          (students || []).map((s: any) => ({
            id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            email: s.email
          }))
        );
      } catch (err) {
        setEnrolledStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchEnrolledStudents();
  }, [studentListModal]);

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
          created_at,
          year_level,
          day,
          time
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
                .eq('role', 'instructor')
                .single();

              if (teacherError || !teacherData) {
                console.warn('Missing teacher for assignment', assignment, teacherError);
                return null;
              }

              // Get course data
              const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('id, code, name, units, semester')
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
                subject_units: courseData.units,
                semester: courseData.semester
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
        .eq('role', 'instructor')
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
        .select('id, code, name, units, year_level, semester')
        .order('code', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedCourses = data
          .filter(course => course.year_level) // Only include courses with year_level
          .map(course => ({
            ...course,
            year_level: course.year_level || '1st Year', // Provide default if null
            semester: course.semester || '', // Ensure semester is always present
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

  const handleSubmit = async (assignments: TeacherSubject[]): Promise<{ success: boolean; message: string }> => {
    setFormSubmitting(true);
    setFormErrors({});

    try {
      // Validate form
      const errors: Record<string, string> = {};
      if (!newAssignment.teacher_id) errors.teacher_id = 'Please select a teacher';
      if (!newAssignment.section) errors.section = 'Please enter a section';
      if (!newAssignment.academic_year) errors.academic_year = 'Please enter an academic year';
      if (!newAssignment.year_level) errors.year_level = 'Please select a year level';
      // Validate at least one subject, at least one day, and time for all assignments
      if (!assignments || assignments.length === 0) errors.subject_id = 'Please select at least one subject';
      if (!assignments[0]?.day || assignments[0].day.length === 0) errors.day = 'Please select at least one day';
      if (!assignments[0]?.time) errors.time = 'Please select a time';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setFormSubmitting(false);
        return { success: false, message: 'Please fill in all required fields' };
      }

      if (modalState.isEditMode && newAssignment.id) {
        // Update existing assignment (single assignment for edit mode)
        const { error } = await supabase
          .from('teacher_subjects')
          .update({
            teacher_id: newAssignment.teacher_id,
            subject_id: newAssignment.subject_id,
            section: newAssignment.section,
            academic_year: newAssignment.academic_year,
            semester: newAssignment.semester,
            year_level: newAssignment.year_level,
            is_active: newAssignment.is_active,
            day: newAssignment.day,
            time: newAssignment.time
          })
          .eq('id', newAssignment.id);

        if (error) throw error;
        return { success: true, message: 'Assignment updated successfully' };
      } else {
        // Check for existing assignments first
        const existingAssignments = await Promise.all(
          assignments.map(async (assignment) => {
            const { data } = await supabase
              .from('teacher_subjects')
              .select('id')
              .eq('teacher_id', assignment.teacher_id)
              .eq('subject_id', assignment.subject_id)
              .eq('section', assignment.section)
              .eq('academic_year', assignment.academic_year)
              .eq('semester', assignment.semester)
              .eq('year_level', assignment.year_level)
              .single();
            return { assignment, exists: !!data };
          })
        );

        const newAssignments = existingAssignments
          .filter(item => !item.exists)
          .map(item => item.assignment);

        const existingCount = existingAssignments.filter(item => item.exists).length;

        if (newAssignments.length === 0) {
          return { success: false, message: 'All assignments already exist for this teacher, subject, and section combination' };
        }

        // Insert only new assignments
        const { error } = await supabase
          .from('teacher_subjects')
          .insert(newAssignments);

        if (error) {
          return { success: false, message: `Failed to save assignments: ${error.message}` };
        }

        if (existingCount > 0) {
          return { success: true, message: `${newAssignments.length} new assignment${newAssignments.length !== 1 ? 's' : ''} created. ${existingCount} assignment${existingCount !== 1 ? 's' : ''} already existed.` };
        } else {
          return { success: true, message: `${newAssignments.length} subject${newAssignments.length !== 1 ? 's' : ''} assigned successfully` };
        }
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
        year_level: '',
        is_active: true,
        day: '',
        time: ''
      });
    } catch (error) {
      console.error('Error saving assignment:', error);
      return { success: false, message: 'Failed to save assignment' };
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEdit = (assignment: TeacherSubject) => {
    setNewAssignment({
      ...assignment,
      day: typeof assignment.day === 'string' ? assignment.day : Array.isArray(assignment.day) ? assignment.day.join(',') : '',
      semester: assignment.semester || '',
    });
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
      year_level: '',
      is_active: true,
      day: '',
      time: ''
    });
  };

  // Toggle section expansion
  const toggleSection = (yearLevel: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [yearLevel]: !prev[yearLevel]
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-2xl shadow-lg mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="w-6 h-6 text-white"
              >
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Subject Assignments</h1>
              <p className="text-white/80 text-sm font-medium">Manage subject assignments for teachers</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
                  year_level: '',
                  is_active: true,
                  day: '',
                  time: ''
                });
              }}
              className="p-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all flex items-center gap-2 text-white font-semibold"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <path d="M5 12h14"></path>
                <path d="M12 5v14"></path>
              </svg>
              <span>Assign Multiple Subjects</span>
            </button>
          </div>
        </div>
      </div>

      {/* Year Level Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label htmlFor="yearLevelFilter" className="text-sm font-medium text-gray-700">
              Filter by Year Level:
            </label>
            <select
              id="yearLevelFilter"
              value={selectedYearLevel}
              onChange={(e) => setSelectedYearLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Year Levels</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>
          <div className="text-sm text-gray-500">
            {selectedYearLevel === 'all' 
              ? `${assignments.length} total assignments`
              : `${assignments.filter(a => a.year_level === selectedYearLevel).length} assignments in ${selectedYearLevel}`
            }
          </div>
        </div>
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

      {/* Assignments Display */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subject assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Subject Assignments</h3>
          <p className="text-gray-500 mb-4">Get started by assigning subjects to teachers.</p>
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
                year_level: '',
                is_active: true,
                day: '',
                time: ''
              });
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Assign Subjects
          </button>
        </div>
      ) : selectedYearLevel === 'all' ? (
        // Show collapsible sections for "All Year Levels"
        <div className="space-y-6">
          {(() => {
            const groupedAssignments = assignments.reduce((groups, assignment) => {
              const yearLevel = assignment.year_level || 'Unknown';
              if (!groups[yearLevel]) {
                groups[yearLevel] = [];
              }
              groups[yearLevel].push(assignment);
              return groups;
            }, {} as Record<string, TeacherSubject[]>);

            const yearLevelOrder = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
            const sortedYearLevels = Object.keys(groupedAssignments).sort((a, b) => {
              return yearLevelOrder.indexOf(a) - yearLevelOrder.indexOf(b);
            });

            return sortedYearLevels.map(yearLevel => (
              <motion.div
                key={yearLevel}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl shadow-md overflow-hidden"
              >
                {/* Year Level Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {yearLevel.split(' ')[0]}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-white">{yearLevel}</h2>
                      <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {groupedAssignments[yearLevel].length} {groupedAssignments[yearLevel].length === 1 ? 'Assignment' : 'Assignments'}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleSection(yearLevel)}
                      className="flex items-center space-x-2 text-white hover:text-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg px-3 py-1"
                    >
                      <span className="text-sm font-medium">
                        {expandedSections[yearLevel] ? 'Hide' : 'Show'}
                      </span>
                      <svg
                        className={`w-5 h-5 transition-transform duration-200 ${
                          expandedSections[yearLevel] ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Assignments Grid - Collapsible */}
                <AnimatePresence>
                  {expandedSections[yearLevel] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupedAssignments[yearLevel].map((assignment) => (
                            <motion.div
                              key={assignment.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-200"
                            >
                              {/* Teacher Info */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">
                                      {assignment.teacher_name?.split(' ').map(n => n[0]).join('')}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">{assignment.teacher_name}</p>
                                    <p className="text-gray-500 text-xs">Instructor</p>
                                  </div>
                                </div>
                                <div className="flex space-x-1">
                                  {/* Show Students Icon */}
                                  <button
                                    onClick={() => setStudentListModal({ open: true, assignment })}
                                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                    title="View assigned students"
                                  >
                                    <Users size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(assignment)}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="Edit assignment"
                                  >
                                    <FileEdit size={16} />
                                  </button>
                                  <button
                                    onClick={() => assignment.id && handleDelete(assignment.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete assignment"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>

                              {/* Course Info */}
                              <div className="space-y-2 mb-3">
                                <div className="bg-white rounded-md p-3 border border-gray-200">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-gray-900 text-sm">{assignment.subject_code}</span>
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                      {assignment.subject_units} {assignment.subject_units === 1 ? 'Unit' : 'Units'}
                                    </span>
                                  </div>
                                  <p className="text-gray-600 text-sm line-clamp-2">{assignment.subject_name}</p>
                                </div>
                              </div>

                              {/* Assignment Details */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white rounded-md p-2 border border-gray-200">
                                  <p className="text-gray-500 mb-1">Section</p>
                                  <p className="font-medium text-gray-900">Section {assignment.section}</p>
                                </div>
                                <div className="bg-white rounded-md p-2 border border-gray-200">
                                  <p className="text-gray-500 mb-1">Semester</p>
                                  <p className="font-medium text-gray-900">{assignment.semester}</p>
                                </div>
                                <div className="bg-white rounded-md p-2 border border-gray-200">
                                  <p className="text-gray-500 mb-1">Day(s)</p>
                                  <p className="font-medium text-gray-900">{
                                    typeof assignment.day === 'string' && assignment.day
                                      ? assignment.day.split(',').map((d: string) => dayAbbr[d] || d).join(', ')
                                      : ''
                                  }</p>
                                </div>
                                <div className="bg-white rounded-md p-2 border border-gray-200">
                                  <p className="text-gray-500 mb-1">Time</p>
                                  <p className="font-medium text-gray-900">{assignment.time || ''}</p>
                                </div>
                                <div className="bg-white rounded-md p-2 border border-gray-200 col-span-2">
                                  <p className="text-gray-500 mb-1">Academic Year</p>
                                  <p className="font-medium text-gray-900">{assignment.academic_year}</p>
                                </div>
                              </div>

                              {/* Date Assigned */}
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-gray-500 text-xs">
                                  Assigned: {new Date(assignment.created_at || '').toLocaleDateString()}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ));
          })()}
        </div>
      ) : (
        // Show filtered table for specific year level
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {selectedYearLevel.split(' ')[0]}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">{selectedYearLevel} Assignments</h2>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                {assignments.filter(a => a.year_level === selectedYearLevel).length} {assignments.filter(a => a.year_level === selectedYearLevel).length === 1 ? 'Assignment' : 'Assignments'}
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instructor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Semester
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day(s)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
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
                    Date Assigned
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments
                  .filter(assignment => assignment.year_level === selectedYearLevel)
                  .map((assignment) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {assignment.semester}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {typeof assignment.day === 'string' && assignment.day
                          ? assignment.day.split(',').map((d: string) => dayAbbr[d] || d).join(', ')
                          : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {assignment.time || ''}
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
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Student List Modal */}
      {studentListModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full relative">
            <button
              onClick={() => setStudentListModal({ open: false, assignment: null })}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users size={20} /> List of Students
            </h2>
            <div className="text-gray-600 text-sm min-h-[80px]">
              {loadingStudents ? (
                <div className="py-4 text-center text-blue-500">Loading students...</div>
              ) : enrolledStudents.length === 0 ? (
                <div className="py-4 text-center">No students enrolled in <span className="font-semibold">{studentListModal.assignment?.subject_name}</span> (Section {studentListModal.assignment?.section}).</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {enrolledStudents.map((student) => (
                    <li key={student.id} className="py-2 flex flex-col">
                      <span className="font-medium text-gray-900">{student.name}</span>
                      <span className="text-xs text-gray-500">{student.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectAssignment;
