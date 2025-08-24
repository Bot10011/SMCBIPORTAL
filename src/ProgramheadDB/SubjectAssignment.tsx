import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, AlertCircle, FileEdit, Trash2, Users } from 'lucide-react';
import SubjectAssignmentModal from './SubjectAssignmentModal';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';

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
  const [enrolledStudents, setEnrolledStudents] = useState<{ 
    id: string; 
    name: string; 
    email: string; 
    displayName: string; 
    avatar: string | null; 
    provider: string; 
  }[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentError, setStudentError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; assignment: TeacherSubject | null }>({ open: false, assignment: null });


  useEffect(() => {
    fetchAssignments();
    fetchTeachers();
    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchEnrolledStudents = async () => {
      if (!studentListModal.open || !studentListModal.assignment) return;
      
      console.log('Fetching students for assignment:', studentListModal.assignment); // Debug log
      
      setLoadingStudents(true);
      setEnrolledStudents([]);
      setStudentError('');
      setDebugInfo('');
      
      try {
        // First, let's check what's in the enrollcourse table
        const { data: allEnrollments, error: allError } = await supabase
          .from('enrollcourse')
          .select('*')
          .limit(10);
        
        if (allError) {
          console.error('Error fetching all enrollments:', allError);
          setStudentError(`Database error: ${allError.message}`);
          return;
        } else {
          console.log('Sample enrollments from table:', allEnrollments); // Debug log
          setDebugInfo(`Sample enrollments: ${JSON.stringify(allEnrollments, null, 2)}`);
        }

        // Also check if there are any enrollments at all
        const { count: totalEnrollments, error: countError } = await supabase
          .from('enrollcourse')
          .select('*', { count: 'exact', head: true });
          
        if (countError) {
          console.error('Error counting enrollments:', countError);
          setStudentError(`Count error: ${countError.message}`);
          return;
        } else {
          console.log('Total enrollments in table:', totalEnrollments); // Debug log
          setDebugInfo(prev => prev + `\nTotal enrollments: ${totalEnrollments}`);
        }

        // Check if there are any enrollments for this subject (regardless of section)
        const { data: subjectEnrollments, error: subjectError } = await supabase
          .from('enrollcourse')
          .select('student_id, subject_id, section')
          .eq('subject_id', studentListModal.assignment.subject_id);
          
        if (subjectError) {
          console.error('Error fetching subject enrollments:', subjectError);
          setStudentError(`Subject query error: ${subjectError.message}`);
          return;
        } else {
          console.log('Enrollments for subject only:', subjectEnrollments); // Debug log
          setDebugInfo(prev => prev + `\nSubject enrollments: ${JSON.stringify(subjectEnrollments, null, 2)}`);
        }

        // Fetch enrollments for this subject (ignore section since enrollments don't have section info)
        const { data: enrollments, error } = await supabase
          .from('enrollcourse')
          .select('student_id, subject_id, section')
          .eq('subject_id', studentListModal.assignment.subject_id);
          
        console.log('Query params - subject_id:', studentListModal.assignment.subject_id, 'section:', studentListModal.assignment.section); // Debug log
        console.log('Found enrollments for subject (ignoring section):', enrollments); // Debug log
        
        if (error) {
          console.error('Error in final query:', error);
          setStudentError(`Final query error: ${error.message}`);
          return;
        }
        
        if (!enrollments || enrollments.length === 0) {
          console.log('No enrollments found for this subject'); // Debug log
          setStudentError(`No students enrolled in ${studentListModal.assignment.subject_name}\n\nDebug Info:\nQuery: subject_id=${studentListModal.assignment.subject_id}\n\n${debugInfo}`);
          setEnrolledStudents([]);
          setLoadingStudents(false);
          return;
        }
        
        // Get student profiles with auth data
        const studentIds = enrollments.map((e: any) => e.student_id);
        console.log('Student IDs found:', studentIds); // Debug log
        
        // Get user profiles with all the data we need (including stored Google user data)
        const { data: students, error: studentError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, email, display_name, avatar_url, auth_provider')
          .in('id', studentIds);
          
        if (studentError) {
          console.error('Error fetching student profiles:', studentError);
          setStudentError(`Student profile error: ${studentError.message}`);
          return;
        }
        
        console.log('Student profiles found:', students); // Debug log
        
        // Use the stored Google user data from user_profiles table
        const enrichedStudents = (students || []).map((s: { 
          id: string; 
          first_name: string; 
          last_name: string; 
          email: string;
          display_name?: string;
          avatar_url?: string;
          auth_provider?: string;
        }) => {
          return {
            id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            email: s.email,
            displayName: s.display_name || `${s.first_name} ${s.last_name}`,
            avatar: s.avatar_url || null,
            provider: s.auth_provider || 'email'
          };
        });
        
        setEnrolledStudents(enrichedStudents);
        
        // Clear any previous errors if successful
        setStudentError('');
        setDebugInfo('');
        
      } catch (err) {
        console.error('Error fetching enrolled students:', err); // Debug log
        setStudentError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setEnrolledStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchEnrolledStudents();
  }, [studentListModal]);

  // Handle body scroll locking when modals are open
  useEffect(() => {
    if (studentListModal.open || deleteModal.open) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [studentListModal.open, deleteModal.open]);

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
                semester: assignment.semester || courseData.semester // Use assignment semester first, fallback to course semester
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
    console.log('Editing assignment:', assignment); // Debug log
    setNewAssignment({
      ...assignment,
      subject_id: assignment.subject_id, // Ensure subject_id is preserved
      day: typeof assignment.day === 'string' ? assignment.day : '',
      semester: assignment.semester || '',
    });
    setModalState({
      isOpen: true,
      isEditMode: true
    });
  };

  const handleDelete = async (id: string) => {
    const assignment = assignments.find(a => a.id === id);
    if (assignment) {
      setDeleteModal({ open: true, assignment });
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.assignment?.id) return;

    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('id', deleteModal.assignment.id);

      if (error) throw error;
      
      toast.success('Subject assignment deleted successfully');
      fetchAssignments();
      setDeleteModal({ open: false, assignment: null });
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
    
    // Refresh assignments list when modal closes to show new assignments
    fetchAssignments();
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
              <p className="text-white/80 text-sm font-medium">Manage subject assignments for Instructors</p>
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
      <div className="bg-white/80 rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
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
        <div className="bg-white/80 rounded-xl shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subject assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white/80 rounded-xl shadow-md p-8 text-center">
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
                className="bg-white/80 rounded-xl shadow-md overflow-hidden"
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
        onSuccess={fetchAssignments}
        formErrors={formErrors}
        assignment={newAssignment}
        handleInputChange={handleInputChange}
        formSubmitting={formSubmitting}
        isEditMode={modalState.isEditMode}
        teachers={teachers}
        courses={courses}
      />

      {/* Student List Modal */}
      {studentListModal.open && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md" 
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
          <div 
            className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-gray-100 relative z-10 flex flex-col student-list-modal"
            style={{
              transform: 'translateZ(0)',
              willChange: 'transform',
              maxHeight: '85vh',
              height: 'fit-content',
              minHeight: '500px'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">List of Students</h3>
                <p className="text-sm text-gray-600">Students enrolled in this subject</p>
              </div>
              <button
                onClick={() => setStudentListModal({ open: false, assignment: null })}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Assignment Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Instructor:</span>
                  <p className="text-blue-900 font-semibold">{studentListModal.assignment?.teacher_name}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Year and Section:</span>
                  <p className="text-blue-900 font-semibold">{studentListModal.assignment?.year_level} -{studentListModal.assignment?.section}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium text-blue-800">Subject:</span>
                  <p className="text-blue-900 font-semibold">{studentListModal.assignment?.subject_code} - {studentListModal.assignment?.subject_name}</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            {enrolledStudents.length > 0 && (
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-h-[80px] max-h-[400px] overflow-y-auto">
              {loadingStudents ? (
                <div className="py-4 text-center text-blue-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span>Loading students...</span>
                  </div>
                </div>
              ) : studentError ? (
                <div className="py-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="font-semibold text-red-800">Error Loading Students</span>
                    </div>
                    <p className="text-sm text-red-700 whitespace-pre-line">{studentError}</p>
                  </div>
                  
                  {debugInfo && (
                    <details className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                        Debug Information (Click to expand)
                      </summary>
                      <pre className="text-xs text-gray-600 bg-white p-2 rounded border overflow-auto max-h-32">
                        {debugInfo}
                      </pre>
                    </details>
                  )}
                </div>
              ) : enrolledStudents.length === 0 ? (
                <div className="py-4 text-center text-gray-500">
                  No students enrolled in <span className="font-semibold text-gray-900">{studentListModal.assignment?.subject_name}</span> (Section {studentListModal.assignment?.section}).
                </div>
              ) : (
                <div className="space-y-3">
                  {enrolledStudents
                    .filter(student => 
                      student.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      student.email.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((student) => (
                      <div key={student.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {student.avatar ? (
                              <img 
                                src={student.avatar} 
                                alt={student.displayName}
                                className="w-10 h-10 rounded-full border-2 border-gray-200"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm ${student.avatar ? 'hidden' : ''}`}>
                              {student.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                          </div>
                          
                          {/* Student Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 truncate">{student.displayName}</span>
                              {student.provider !== 'email' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {student.provider}
                                </span>
                              )}
                            </div>
                            <span className="block text-xs text-gray-500 truncate">{student.email}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md delete-modal-overlay" 
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
          <div 
            className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 max-w-md w-full relative mx-4 border border-white/20 delete-modal-content"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              transform: 'translateZ(0)',
              willChange: 'transform'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Delete Assignment</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
              <button 
                onClick={() => setDeleteModal({ open: false, assignment: null })}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>


            {/* Warning Message */}
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-red-100 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">
                    Are you sure you want to delete this subject assignment? This action will permanently remove the assignment and cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, assignment: null })}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Assignment
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Additional CSS for modal positioning and blur effects */}
      <style>{`
        .student-list-modal-overlay {
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
        
        .student-list-modal-content {
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          transform: translateZ(0) !important;
          will-change: transform !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
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
          .student-list-modal-overlay {
            padding: 1rem !important;
          }
          
          .student-list-modal-content {
            max-height: 85vh !important;
            margin: 0.5rem !important;
          }
        }
        
        /* Ensure body doesn't scroll when modal is open */
        body.modal-open {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
        }
        
        /* Ensure modal is always on top */
        .student-list-modal-overlay * {
          z-index: 9999 !important;
        }
        
        /* Student List Modal specific styles */
        .student-list-modal {
          display: flex !important;
          flex-direction: column !important;
          max-height: 85vh !important;
          overflow: hidden !important;
        }
        
        .student-list-modal .modal-content {
          flex: 1 !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        
        /* Delete Modal Styles */
        .delete-modal-overlay {
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
        
        .delete-modal-content {
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          transform: translateZ(0) !important;
          will-change: transform !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
          animation: slideIn 0.3s ease-out !important;
        }
        
        @media (max-width: 640px) {
          .delete-modal-overlay {
            padding: 1rem !important;
          }
          
          .delete-modal-content {
            max-height: 85vh !important;
            margin: 0.5rem !important;
          }
        }
        
        /* Ensure delete modal is always on top */
        .delete-modal-overlay * {
          z-index: 9999 !important;
        }
      `}</style>
    </div>
  );
};

export default SubjectAssignment;
