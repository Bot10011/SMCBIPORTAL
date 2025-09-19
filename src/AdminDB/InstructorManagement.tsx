import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Grid,
  Avatar,
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Search, 
  GraduationCap,
  BookOpen,
  Users,
  Plus,
  X,
  Eye,
  FileText,
  Download
} from 'lucide-react';
import SubjectAssignmentModal, { SubjectAssignmentModalProps } from './SubjectAssignmentModal';

interface Instructor {
  id: string;
  email: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  role: 'teacher' | 'instructor';
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Program {
  id: number;
  name: string;
  description: string;
  major: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TeacherSubject {
  id?: string;
  teacher_id: string;
  subject_id: string;
  section: string;
  academic_year: string;
  year_level: string;
  semester: string;
  is_active: boolean;
  day?: string;
  time?: string;
  created_at?: string;
  teacher_name?: string;
  teacher_role?: string;
  teacher_profile_picture?: string;
  subject_code?: string;
  subject_name?: string;
  subject_units?: number;
}

interface Course {
  id: string;
  code: string;
  name: string;
  units: number;
  year_level: string;
  display_name: string;
  semester: string;
}

interface SubjectTraceRecord {
  id: string;
  instructor_id: string;
  instructor_name: string;
  instructor_email: string;
  instructor_department: string;
  subject_code: string;
  subject_name: string;
  subject_units: number;
  section: string;
  semester: string;
  academic_year: string;
  year_level: string;
  status: 'Completed' | 'Confirmed by Program Head';
  confirmed_at: string;
  created_at: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`instructor-tabpanel-${index}`}
      aria-labelledby={`instructor-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const InstructorManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  // Removed role/department/status filters from UI
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    role: 'instructor' as 'teacher' | 'instructor', // default to instructor
    department: '', // will be set when programs are loaded
    password: 'TempPass@123',
  });

  // Edit Instructor State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    role: 'instructor' as 'teacher' | 'instructor',
    department: '',
    is_active: true,
  });

  // Delete Confirmation State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [instructorToDelete, setInstructorToDelete] = useState<Instructor | null>(null);

  // View Instructor State
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [instructorToView, setInstructorToView] = useState<Instructor | null>(null);

  // Subject Assignment Modal State (supports create and edit)
  const [subjectAssignmentModal, setSubjectAssignmentModal] = useState({
    isOpen: false,
    selectedTeacherId: '',
    selectedTeacherName: '',
    isEditMode: false,
    editingAssignmentId: '' as string | ''
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Array<{
    id: string;
    name: string;
    year_level: string;
  }>>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
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

  // Year Level Assigned Subjects State
  const [assignments, setAssignments] = useState<TeacherSubject[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>('all');
  const [selectedSections, setSelectedSections] = useState<Record<string, string>>({});
  
  // Assignment Detail Modal State
  const [assignmentDetailModal, setAssignmentDetailModal] = useState<{
    isOpen: boolean;
    assignment: TeacherSubject | null;
  }>({
    isOpen: false,
    assignment: null
  });

  // Deprecated standalone Edit Assignment Modal State (replaced by unified modal)
  const [editAssignmentModal, setEditAssignmentModal] = useState<{
    isOpen: boolean;
    assignment: TeacherSubject | null;
    loading: boolean;
  }>({
    isOpen: false,
    assignment: null,
    loading: false
  });

  // Subject Trace State
  const [subjectTraceRecords, setSubjectTraceRecords] = useState<SubjectTraceRecord[]>([]);
  const [subjectTraceLoading, setSubjectTraceLoading] = useState(true);
  const [subjectTraceSearchTerm, setSubjectTraceSearchTerm] = useState('');
  const [subjectTraceModal, setSubjectTraceModal] = useState<{
    isOpen: boolean;
    instructor: Instructor | null;
    records: SubjectTraceRecord[];
  }>({
    isOpen: false,
    instructor: null,
    records: []
  });

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, year_level, academic_year')
        .order('year_level', { ascending: true })
        .order('name', { ascending: true });
 
      if (error) throw error;
      
      // Validate that sections have proper year_level data
      const validSections = (data || []).filter(section => 
        section.year_level !== null && 
        section.year_level !== undefined && 
        section.name && 
        section.name.trim() !== ''
      );
      
      setSections(validSections);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
      setSections([]);
    }
  };

  const fetchPrograms = async () => {
    try {
      setProgramsLoading(true);
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
      setPrograms([]);
    } finally {
      setProgramsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      console.log('Starting fetchCourses...');
      console.log('Supabase client:', supabase);
      
      // Fetch courses with all necessary fields
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code', { ascending: true });

      console.log('Raw response:', { data, error });
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Data received:', data);
      console.log('Data type:', typeof data);
      console.log('Data length:', data ? data.length : 'null');
      
      // Debug: Show raw year_level values
      if (data && data.length > 0) {
        console.log('Raw year_level values:', data.map(c => ({ id: c.id, year_level: c.year_level, type: typeof c.year_level })));
        console.log('Sample course data:', data[0]);
        console.log('All available fields in first course:', Object.keys(data[0]));
        
        // Check if year_level field exists and has values
        const coursesWithYearLevel = data.filter(c => c.year_level && c.year_level !== null && c.year_level !== '');
        console.log('Courses with year_level:', coursesWithYearLevel.length);
        console.log('Courses without year_level:', data.length - coursesWithYearLevel.length);
        
        // Check semester values
        console.log('Raw semester values:', data.map(c => ({ id: c.id, code: c.code, semester: c.semester, summer: c.summer, type: typeof c.semester })));
        const coursesWithSemester = data.filter(c => c.semester && c.semester !== null && c.semester !== '');
        console.log('Courses with semester:', coursesWithSemester.length);
        console.log('Courses without semester:', data.length - coursesWithSemester.length);
        console.log('Unique semester values:', Array.from(new Set(data.map(c => c.semester))));
        
        // Check summer field values
        const summerCourses = data.filter(c => c.summer === true);
        console.log('Courses with summer=true:', summerCourses.length);
        console.log('Summer courses details:', summerCourses.map(c => ({ id: c.id, code: c.code, name: c.name, summer: c.summer })));
        
        if (coursesWithYearLevel.length === 0) {
          console.warn('WARNING: No courses have year_level values! This is why filtering fails.');
          console.warn('You may need to populate the year_level field in the courses table.');
        }
       
        if (coursesWithSemester.length === 0) {
          console.warn('WARNING: No courses have semester values! This is why semester filtering fails.');
          console.warn('You may need to populate the semester field in the courses table.');
        }
      }
      
      // Transform the data to ensure display_name is available
      const transformedCourses = (data || []).map((course: any) => ({
        ...course,
        display_name: course.display_name || course.name || course.code,
        // Assign default year level if missing
        year_level: course.year_level || (() => {
          // Try to extract year from course code or name
          const code = String(course.code || '').toLowerCase();
          const name = String(course.name || '').toLowerCase();
          
          if (code.includes('1') || name.includes('1') || code.includes('first') || name.includes('first')) return '1st Year';
          if (code.includes('2') || name.includes('2') || code.includes('second') || name.includes('second')) return '2nd Year';
          if (code.includes('3') || name.includes('3') || code.includes('third') || name.includes('third')) return '3rd Year';
          if (code.includes('4') || name.includes('4') || code.includes('fourth') || name.includes('fourth')) return '4th Year';
          
          // Default to 1st Year if no pattern found
          return '1st Year';
        })(),
        // Preserve original semester value and only use fallback logic if semester is not set
        semester: (() => {
          // If semester is already set in the database, use it (don't override based on summer field)
          if (course.semester) {
            return course.semester;
          }
          
          // Only use summer field as fallback if semester is not set
          if (course.summer === true) {
            return 'Summer';
          }
          
          // Try to extract semester from course code or name as last resort
          const code = String(course.code || '').toLowerCase();
          const name = String(course.name || '').toLowerCase();
          
          // Check for summer courses first (highest priority)
          if (code.includes('summer') || name.includes('summer') || 
              code.includes('su') || name.includes('su') ||
              code.includes('sm') || name.includes('sm') ||
              code === 's' || code === 'sum') {
            return 'Summer';
          }
          
          // Check for second semester courses
          if (code.includes('2') || name.includes('second') || 
              code.includes('2nd') || name.includes('2nd') ||
              code.includes('ii') || name.includes('ii')) {
            return 'Second Semester';
          }
          
          // Check for first semester courses (but be more careful to avoid mislabeling)
          if ((code.includes('1') && !code.includes('10') && !code.includes('11') && !code.includes('12')) || 
              name.includes('first') || 
              code.includes('1st') || name.includes('1st') ||
              (code.includes('i') && !code.includes('ii') && !code.includes('iii') && !code.includes('iv'))) {
            return 'First Semester';
          }
          
          // Default to First Semester if no pattern found
          return 'First Semester';
        })()
      }));
      
      console.log('Fetched courses:', data);
      console.log('Transformed courses:', transformedCourses);
      console.log('Setting courses state with:', transformedCourses);
      
      setCourses(transformedCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        error
      });
      toast.error('Failed to load courses');
      setCourses([]);
    }
  };

  const fetchAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select(`
          *,
          teacher:user_profiles!teacher_subjects_teacher_id_fkey(
            id,
            first_name,
            last_name,
            middle_name,
            email,
            role,
            department,
            profile_picture_url
          ),
          subject:courses!teacher_subjects_subject_id_fkey(
            id,
            code,
            name,
            units,
            year_level,
            semester
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedAssignments = (data || []).map((assignment: any) => ({
        id: assignment.id,
        teacher_id: assignment.teacher_id,
        subject_id: assignment.subject_id,
        section: assignment.section,
        academic_year: assignment.academic_year,
        semester: assignment.semester,
        year_level: assignment.year_level,
        is_active: assignment.is_active,
        day: assignment.day,
        time: assignment.time,
        created_at: assignment.created_at,
        teacher_name: assignment.teacher 
          ? `${assignment.teacher.first_name} ${assignment.teacher.middle_name ? assignment.teacher.middle_name + ' ' : ''}${assignment.teacher.last_name}`
          : 'Unknown Teacher',
        teacher_role: assignment.teacher?.role || 'Unknown',
        teacher_profile_picture: assignment.teacher?.profile_picture_url || null,
        subject_code: assignment.subject?.code || 'Unknown',
        subject_name: assignment.subject?.name || 'Unknown',
        subject_units: assignment.subject?.units || 0
      }));

      setAssignments(transformedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['teacher', 'instructor'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstructors(data || []);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      toast.error('Failed to load instructors');
    } finally {
      setLoading(false);
    }
  };

  // Edit Instructor Functions
  const handleEditInstructor = (instructor: Instructor) => {
    setEditForm({
      id: instructor.id,
      firstName: instructor.first_name,
      middleName: instructor.middle_name || '',
      lastName: instructor.last_name,
      email: instructor.email,
      role: instructor.role,
      department: instructor.department || (programs.length > 0 ? programs[0].name : ''),
      is_active: instructor.is_active,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditing(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: editForm.firstName,
          middle_name: editForm.middleName,
          last_name: editForm.lastName,
          role: editForm.role,
          department: editForm.department,
          is_active: editForm.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editForm.id);

      if (error) throw error;

      toast.success('Instructor updated successfully!');
      setEditDialogOpen(false);
      resetEditForm();
      fetchInstructors();
    } catch (error) {
      console.error('Error updating instructor:', error);
      toast.error('Failed to update instructor');
    } finally {
      setEditing(false);
    }
  };

  const resetEditForm = () => {
    setEditForm({
      id: '',
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      role: 'instructor',
      department: programs.length > 0 ? programs[0].name : '',
      is_active: true,
    });
  };

  // Delete Instructor Functions
  const handleDeleteInstructor = (instructor: Instructor) => {
    setInstructorToDelete(instructor);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteInstructor = async () => {
    if (!instructorToDelete) return;
    
    setDeleting(true);
    try {
      // First, check if instructor has any subject assignments
      const { data: assignments, error: assignmentError } = await supabase
        .from('teacher_subjects')
        .select('id')
        .eq('teacher_id', instructorToDelete.id);

      if (assignmentError) throw assignmentError;

      if (assignments && assignments.length > 0) {
        toast.error('Cannot delete instructor with active subject assignments. Please remove assignments first.');
        setDeleteDialogOpen(false);
        setInstructorToDelete(null);
        return;
      }

      // Delete from user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', instructorToDelete.id);

      if (profileError) throw profileError;

      // Note: We don't delete the auth user for security reasons
      // The auth user will remain but won't be able to access the system

      toast.success('Instructor deleted successfully!');
      setDeleteDialogOpen(false);
      setInstructorToDelete(null);
      fetchInstructors();
    } catch (error) {
      console.error('Error deleting instructor:', error);
      toast.error('Failed to delete instructor');
    } finally {
      setDeleting(false);
    }
  };

  const resetDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setInstructorToDelete(null);
  };

  // View Instructor Functions
  const handleViewInstructor = (instructor: Instructor) => {
    setInstructorToView(instructor);
    setViewDialogOpen(true);
  };

  const closeViewDialog = () => {
    setViewDialogOpen(false);
    setInstructorToView(null);
  };

  // Fetch instructors on component mount
  useEffect(() => {
    fetchInstructors();
    fetchCourses();
    fetchSections();
    fetchPrograms();
  }, []);

  // Set default department when programs are loaded
  useEffect(() => {
    if (programs.length > 0 && !createForm.department) {
      setCreateForm(prev => ({ ...prev, department: programs[0].name }));
    }
  }, [programs, createForm.department]);

  // Fetch assignments when tab changes to Year Level Assigned Subjects
  useEffect(() => {
    if (tabValue === 1) {
      fetchAssignments();
    }
  }, [tabValue]);

  // Fetch subject trace records when tab changes to Subject Trace
  useEffect(() => {
    if (tabValue === 2) {
      fetchSubjectTraceRecords();
    }
  }, [tabValue]);

  // Add periodic refresh for subject trace records (every 30 seconds when tab is active)
  useEffect(() => {
    if (tabValue === 2) {
      const interval = setInterval(() => {
        fetchSubjectTraceRecords();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [tabValue]);

  // Listen for custom events to refresh subject trace records
  useEffect(() => {
    const handleSubjectTraceRefresh = () => {
      if (tabValue === 2) {
        fetchSubjectTraceRecords();
      }
    };

    window.addEventListener('subjectTraceRefresh', handleSubjectTraceRefresh);
    return () => {
      window.removeEventListener('subjectTraceRefresh', handleSubjectTraceRefresh);
    };
  }, [tabValue]);




  const handleCreateInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const fullEmail = createForm.email + '@smcbi.edu.ph';
      
      // Check if email already exists
      const { count: emailCount, error: emailError } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('email', fullEmail);
      
      if (emailError) throw emailError;
      if (emailCount && emailCount > 0) {
        toast.error('Email already exists. Please choose a different email.');
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fullEmail,
        password: createForm.password,
        options: {
          data: {
            role: createForm.role,
            first_name: createForm.firstName,
            last_name: createForm.lastName
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create auth user');

      // Create user profile
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        email: fullEmail,
        first_name: createForm.firstName,
        middle_name: createForm.middleName,
        last_name: createForm.lastName,
        role: createForm.role,
        department: createForm.department,
        is_active: true,
        password_changed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) throw profileError;

      toast.success('Instructor created successfully!');
      setCreateDialogOpen(false);
      resetCreateForm();
      fetchInstructors();
    } catch (error) {
      console.error('Error creating instructor:', error);
      toast.error('Failed to create instructor');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      role: 'instructor', // default to instructor
      department: programs.length > 0 ? programs[0].name : '', // default to first available program
      password: 'TempPass@123',
    });
  };

  // Auto-generate email when first and last name are entered
  useEffect(() => {
    if (createForm.firstName && createForm.lastName) {
      const email = (createForm.lastName + createForm.firstName).replace(/\s+/g, '').toLowerCase();
      setCreateForm(f => ({ ...f, email }));
    } else {
      setCreateForm(f => ({ ...f, email: '' }));
    }
  }, [createForm.firstName, createForm.lastName]);

  // Filter instructors based on search and filters
  const filteredInstructors = instructors.filter(instructor => {
    const matchesSearch = !searchTerm || 
      instructor.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.email.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Subject Assignment Functions
  const handleAssignSubject = (instructor: Instructor) => {
    setSubjectAssignmentModal({
      isOpen: true,
      selectedTeacherId: instructor.id,
      selectedTeacherName: `${instructor.first_name} ${instructor.middle_name ? instructor.middle_name + ' ' : ''}${instructor.last_name}`,
      isEditMode: false,
      editingAssignmentId: ''
    });
    
    // Pre-fill the assignment form with the selected teacher
    setNewAssignment({
      teacher_id: instructor.id,
      subject_id: '',
      section: '',
      academic_year: getDefaultSchoolYear(),
      semester: 'First Semester',
      year_level: '',
      is_active: true,
      day: '',
      time: ''
    });
  };

  const getDefaultSchoolYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const nextYear = year + 1;
    return `${year}-${nextYear}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewAssignment(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubjectAssignmentSubmit = async (assignments: TeacherSubject[]): Promise<{ success: boolean; message: string }> => {
    try {
      setFormSubmitting(true);
      
      if (subjectAssignmentModal.isEditMode) {
        // Update existing assignment (use only the first payload)
        const payload = assignments[0];
        if (!subjectAssignmentModal.editingAssignmentId) {
          throw new Error('Missing assignment ID for edit');
        }
        const { error } = await supabase
          .from('teacher_subjects')
          .update({
            teacher_id: payload.teacher_id,
            subject_id: payload.subject_id,
            section: payload.section,
            academic_year: payload.academic_year,
            semester: payload.semester,
            year_level: payload.year_level,
            day: payload.day,
            time: payload.time,
            updated_at: new Date().toISOString()
          })
          .eq('id', subjectAssignmentModal.editingAssignmentId);

        if (error) throw error;

        toast.success('Assignment updated successfully!');
        setSubjectAssignmentModal({ isOpen: false, selectedTeacherId: '', selectedTeacherName: '', isEditMode: false, editingAssignmentId: '' });
        fetchAssignments();
        return { success: true, message: 'Assignment updated successfully!' };
      } else {
        // Insert new assignments
        const { error } = await supabase
          .from('teacher_subjects')
          .insert(assignments);

        if (error) throw error;

        toast.success('Subject assigned successfully!');
        setSubjectAssignmentModal({ isOpen: false, selectedTeacherId: '', selectedTeacherName: '', isEditMode: false, editingAssignmentId: '' });
        fetchAssignments();
        return { success: true, message: 'Subject assigned successfully!' };
      }
    } catch (error) {
      console.error('Error assigning subject:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign subject';
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCloseSubjectAssignmentModal = () => {
    setSubjectAssignmentModal({ isOpen: false, selectedTeacherId: '', selectedTeacherName: '', isEditMode: false, editingAssignmentId: '' });
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

  // Year Level Assigned Subjects Helper Functions
  const toggleSection = (yearLevel: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [yearLevel]: !prev[yearLevel]
    }));
  };

  // Open Subject Assignment Modal prefilled for a specific year level
  const handleOpenSubjectAssignmentForYear = (yearLevel: string) => {
    setFormErrors({});
    setNewAssignment({
      teacher_id: '',
      subject_id: '',
      section: '',
      academic_year: getDefaultSchoolYear(),
      semester: '',
      year_level: yearLevel,
      is_active: true,
      day: '',
      time: ''
    });
    setSubjectAssignmentModal({ isOpen: true, selectedTeacherId: '', selectedTeacherName: '', isEditMode: false, editingAssignmentId: '' });
  };

  const openAssignmentDetail = (assignment: TeacherSubject) => {
    setAssignmentDetailModal({
      isOpen: true,
      assignment
    });
  };

  const closeAssignmentDetail = () => {
    setAssignmentDetailModal({
      isOpen: false,
      assignment: null
    });
  };

  const openEditAssignment = (assignment: TeacherSubject) => {
    // Open the unified SubjectAssignmentModal in edit mode with prefilled data
    setSubjectAssignmentModal({
      isOpen: true,
      selectedTeacherId: assignment.teacher_id,
      selectedTeacherName: assignment.teacher_name || '',
      isEditMode: true,
      editingAssignmentId: assignment.id || ''
    });

    // Use the actual assignment data to ensure consistency
    setNewAssignment({
      teacher_id: assignment.teacher_id,
      subject_id: assignment.subject_id,
      section: assignment.section,
      academic_year: assignment.academic_year,
      semester: normalizeSemester(assignment.semester),
      year_level: normalizeYearLevel(assignment.year_level),
      is_active: assignment.is_active,
      day: expandDayAbbreviations(assignment.day) || '',
      time: assignment.time || ''
    });
  };

  const closeEditAssignment = () => {
    setEditAssignmentModal({
      isOpen: false,
      assignment: null,
      loading: false
    });
  };

  const handleEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAssignmentModal.assignment) return;

    setEditAssignmentModal(prev => ({ ...prev, loading: true }));

    try {
      const { error } = await supabase
        .from('teacher_subjects')
        .update({
          teacher_id: editAssignmentModal.assignment.teacher_id,
          subject_id: editAssignmentModal.assignment.subject_id,
          section: editAssignmentModal.assignment.section,
          academic_year: editAssignmentModal.assignment.academic_year,
          semester: editAssignmentModal.assignment.semester,
          year_level: editAssignmentModal.assignment.year_level,
          day: editAssignmentModal.assignment.day,
          time: editAssignmentModal.assignment.time,
          updated_at: new Date().toISOString()
        })
        .eq('id', editAssignmentModal.assignment.id);

      if (error) throw error;

      toast.success('Assignment updated successfully');
      closeEditAssignment();
      fetchAssignments(); // Refresh the assignments list
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment');
    } finally {
      setEditAssignmentModal(prev => ({ ...prev, loading: false }));
    }
  };

  const dayAbbr: Record<string, string> = {
    'Monday': 'M',
    'Tuesday': 'T',
    'Wednesday': 'W',
    'Thursday': 'Th',
    'Friday': 'F',
    'Saturday': 'S',
    'Sunday': 'Su',
  };

  // Helper: map abbreviations back to full day names for edit prefill
  const abbrToFullDay: Record<string, string> = Object.keys(dayAbbr).reduce((acc: Record<string, string>, full) => {
    const abbr = dayAbbr[full];
    acc[abbr] = full;
    return acc;
  }, {});

  const expandDayAbbreviations = (dayStr?: string): string => {
    if (!dayStr) return '';
    return dayStr
      .split(',')
      .map(d => d.trim())
      .map(d => abbrToFullDay[d] || d)
      .join(',');
  };

  const normalizeYearLevel = (yl?: string): string => {
    if (!yl) return '';
    const s = String(yl).toLowerCase().trim();
    if (s === '1' || s === '1st' || s.includes('1st')) return '1st Year';
    if (s === '2' || s === '2nd' || s.includes('2nd')) return '2nd Year';
    if (s === '3' || s === '3rd' || s.includes('3rd')) return '3rd Year';
    if (s === '4' || s === '4th' || s.includes('4th')) return '4th Year';
    // fallback: try to extract number
    const num = s.match(/\d+/)?.[0];
    if (num === '1') return '1st Year';
    if (num === '2') return '2nd Year';
    if (num === '3') return '3rd Year';
    if (num === '4') return '4th Year';
    return yl;
  };

  const normalizeSemester = (sem?: string): string => {
    if (!sem) return '';
    const s = String(sem).toLowerCase().trim();
    const map: Record<string, string> = {
      'first semester': 'First Semester',
      '1st semester': 'First Semester',
      '1st sem': 'First Semester',
      'first sem': 'First Semester',
      'first': 'First Semester',
      'second semester': 'Second Semester',
      '2nd semester': 'Second Semester',
      '2nd sem': 'Second Semester',
      'second sem': 'Second Semester',
      'second': 'Second Semester',
      'summer': 'Summer',
      'summer semester': 'Summer',
      'summer sem': 'Summer',
      'su': 'Summer',
      'sm': 'Summer',
      'sum': 'Summer'
    };
    if (map[s]) return map[s];
    return sem;
  };

  // Helper function to filter assignments by section
  const filterAssignmentsBySection = (assignments: TeacherSubject[], yearLevel: string): TeacherSubject[] => {
    const cardSectionFilter = selectedSections[yearLevel] || 'all';
    if (cardSectionFilter === 'all') return assignments;
    
    // Get the section name from the section ID
    const selectedSection = sections.find(s => s.id === cardSectionFilter);
    const filtered = selectedSection ? assignments.filter(assignment => assignment.section === selectedSection.name) : [];
    
    // Debug logging
    console.log('Section filtering debug:', {
      yearLevel,
      cardSectionFilter,
      selectedSection,
      totalAssignments: assignments.length,
      filteredCount: filtered.length,
      assignmentSections: assignments.map(a => a.section),
      availableSections: sections.map(s => ({ id: s.id, name: s.name }))
    });
    
    return filtered;
  };

  // Subject Trace Functions
  const fetchSubjectTraceRecords = async () => {
    try {
      setSubjectTraceLoading(true);
      console.log('Fetching subject trace records...');
      const { data, error } = await supabase
        .from('subject_trace_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subject trace records:', error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} subject trace records:`, data);
      setSubjectTraceRecords(data || []);
    } catch (error) {
      console.error('Error fetching subject trace records:', error);
      toast.error('Failed to load subject trace records');
    } finally {
      setSubjectTraceLoading(false);
    }
  };

  const handleViewSubjectTrace = (instructor: Instructor) => {
    console.log('Viewing subject trace for instructor:', instructor);
    console.log('All subject trace records:', subjectTraceRecords);
    const instructorRecords = subjectTraceRecords.filter(record => record.instructor_id === instructor.id);
    console.log(`Found ${instructorRecords.length} records for instructor ${instructor.id}:`, instructorRecords);
    setSubjectTraceModal({
      isOpen: true,
      instructor,
      records: instructorRecords
    });
  };

  const closeSubjectTraceModal = () => {
    setSubjectTraceModal({
      isOpen: false,
      instructor: null,
      records: []
    });
  };

  const generateSubjectTracePDF = async (instructor: Instructor, records: SubjectTraceRecord[]) => {
    try {
      // Dynamically import jsPDF and autoTable
      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      // Set up the document
      doc.setFontSize(20);
      doc.text('Subject Trace Report', 20, 30);
      
      // Instructor details
      doc.setFontSize(14);
      doc.text(`Instructor: ${instructor.first_name} ${instructor.middle_name ? instructor.middle_name + ' ' : ''}${instructor.last_name}`, 20, 50);
      doc.text(`Email: ${instructor.email}`, 20, 60);
      doc.text(`Department: ${instructor.department || 'N/A'}`, 20, 70);
      doc.text(`Role: ${instructor.role.charAt(0).toUpperCase() + instructor.role.slice(1)}`, 20, 80);

      // Table headers
      const tableHeaders = ['Semester', 'Subject Code', 'Subject Name', 'Units', 'Section', 'Status', 'Confirmed At'];
      const tableData = records.map(record => [
        `${record.semester} ${record.academic_year}`,
        record.subject_code,
        record.subject_name,
        record.subject_units.toString(),
        record.section,
        record.status,
        new Date(record.confirmed_at).toLocaleDateString()
      ]);

      // Add table
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 90,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [102, 126, 234] }
      });

      // Save the PDF
      const fileName = `Subject_Trace_${instructor.first_name}_${instructor.last_name}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      p: { xs: 2, sm: 4 },
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      {/* Header */}
      <Box sx={{ 
        mb: 4, 
        background: 'linear-gradient(to right, #667eea, #764ba2)',
        px: 3,
        py: 2,
        borderRadius: 4,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <GraduationCap className="w-8 h-8 text-white" />
        <Box>
          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            color: 'white',
            fontSize: '1.5rem'
          }}>
            Instructor Management
          </Typography>
          <Typography variant="body2" sx={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            fontSize: '0.875rem'
          }}>
            Manage instructors and their subject assignments
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                minHeight: 64,
              },
              '& .Mui-selected': {
                color: '#667eea',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#667eea',
                height: 3,
              }
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Users className="w-5 h-5" />
                  Instructors
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BookOpen className="w-5 h-5" />
                  Year Level Assigned Subjects
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FileText className="w-5 h-5" />
                  Subject Trace
                </Box>
              } 
            />
          </Tabs>
        </Box>

        {/* Instructors Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#374151' }}>
              Manage Instructors ({filteredInstructors.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<UserPlus className="w-5 h-5" />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                }
              }}
            >
              Add Instructor
            </Button>
          </Box>

          {/* Filters */}
          <Card sx={{ mb: 3, p: 2, background: 'rgba(255, 255, 255, 0.8)' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  fullWidth
                  placeholder="Search instructors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search className="w-4 h-4 text-gray-400 mr-2" />
                  }}
                  size="small"
                />
              </Grid>
            </Grid>
          </Card>

          {/* Instructors Table */}
          <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Role</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Department</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                        <CircularProgress />
                        <Typography sx={{ mt: 1 }}>Loading instructors...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredInstructors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="textSecondary">No instructors found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInstructors.map((instructor) => (
                      <TableRow key={instructor.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {instructor.first_name} {instructor.middle_name ? instructor.middle_name + ' ' : ''}{instructor.last_name}
                          </Typography>
                        </TableCell>
                        <TableCell>{instructor.email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={instructor.role.charAt(0).toUpperCase() + instructor.role.slice(1)} 
                            size="small"
                            color={instructor.role === 'teacher' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>{instructor.department || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={instructor.is_active ? 'Active' : 'Inactive'} 
                            size="small"
                            color={instructor.is_active ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            color="info"
                            onClick={() => handleViewInstructor(instructor)}
                            title="View Instructor"
                          >
                            <Eye className="w-4 h-4" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleAssignSubject(instructor)}
                            title="Assign Subject"
                          >
                            <Plus className="w-4 h-4" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleEditInstructor(instructor)}
                            title="Edit Instructor"
                          >
                            <Edit className="w-4 h-4" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteInstructor(instructor)}
                            title="Delete Instructor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </TabPanel>

        {/* Year Level Assigned Subjects Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#374151', mb: 2 }}>
              Year Level Assigned Subjects
            </Typography>
            
            {/* Year Level Filter */}
            <Card sx={{ mb: 3, p: 2, background: 'rgba(255, 255, 255, 0.8)' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filter by Year Level</InputLabel>
                    <Select
                      value={selectedYearLevel}
                      label="Filter by Year Level"
                      onChange={(e) => setSelectedYearLevel(e.target.value)}
                    >
                      <MenuItem value="all">All Year Levels</MenuItem>
                      <MenuItem value="1st Year">1st Year</MenuItem>
                      <MenuItem value="2nd Year">2nd Year</MenuItem>
                      <MenuItem value="3rd Year">3rd Year</MenuItem>
                      <MenuItem value="4th Year">4th Year</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2" color="textSecondary">
                    {selectedYearLevel === 'all' 
                      ? `${assignments.length} total assigned`
                      : `${assignments.filter(a => a.year_level === selectedYearLevel).length} assignments in ${selectedYearLevel}`
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={() => handleOpenSubjectAssignmentForYear(selectedYearLevel === 'all' ? '' : selectedYearLevel)}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': { background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)' }
                    }}
                  >
                    Assign Instructor
                  </Button>
                </Grid>
                <Grid item xs={12} sm={12} sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  
                </Grid>
              </Grid>
            </Card>

            {/* Assignments Display */}
            {assignmentsLoading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Loading assignments...</Typography>
              </Box>
            ) : assignments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <Typography variant="h6" color="textSecondary" sx={{ mb: 2 }}>
                  No Subject Assignments
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  No subjects have been assigned to instructors yet.
                </Typography>
              </Box>
            ) : selectedYearLevel === 'all' ? (
              // Show collapsible sections for "All Year Levels"
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                    <Card key={yearLevel} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                      {/* Year Level Header - Clickable */}
                      <Box 
                        onClick={() => toggleSection(yearLevel)}
                        sx={{ 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          px: 3,
                          py: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          '&:hover': { 
                            background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)'
                          },
                          transition: 'background 0.2s ease'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ 
                            width: 32, 
                            height: 32, 
                            bg: 'rgba(255, 255, 255, 0.2)', 
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.875rem' }}>
                              {yearLevel.split(' ')[0]}
                            </Typography>
                          </Box>
                          <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                            {yearLevel}
                          </Typography>
                          <Chip 
                            label={`${filterAssignmentsBySection(groupedAssignments[yearLevel], yearLevel).length} ${filterAssignmentsBySection(groupedAssignments[yearLevel], yearLevel).length === 1 ? 'Assignment' : 'Assignments'}`}
                            size="small"
                            sx={{ 
                              bg: 'rgba(255, 255, 255, 0.2)', 
                              color: 'white',
                              fontWeight: 'medium'
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box 
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <Select
                              value={selectedSections[yearLevel] || 'all'}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedSections(prev => ({
                                  ...prev,
                                  [yearLevel]: e.target.value
                                }));
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                              }}
                              sx={{ 
                                color: 'white',
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'rgba(255,255,255,0.6)',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'white',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: 'white',
                                },
                                '& .MuiSelect-icon': {
                                  color: 'white',
                                }
                              }}
                              MenuProps={{
                                PaperProps: {
                                  sx: {
                                    bgcolor: 'white',
                                    color: 'black',
                                  }
                                },
                                onClick: (e) => {
                                  e.stopPropagation();
                                }
                              }}
                            >
                              <MenuItem 
                                value="all"
                                onClick={(e) => e.stopPropagation()}
                              >
                                All Sections
                              </MenuItem>
                              {sections
                                .filter(section => {
                                  // Convert year level string to number for comparison (same as ClassManagement)
                                  let yearLevelNumber;
                                  if (yearLevel === '1st Year') yearLevelNumber = 1;
                                  else if (yearLevel === '2nd Year') yearLevelNumber = 2;
                                  else if (yearLevel === '3rd Year') yearLevelNumber = 3;
                                  else if (yearLevel === '4th Year') yearLevelNumber = 4;
                                  else yearLevelNumber = parseInt(yearLevel.replace(' Year', '').replace('st', '').replace('nd', '').replace('rd', '').replace('th', ''));
                                  
                                  return Number(section.year_level) === yearLevelNumber;
                                })
                                .map(section => (
                                  <MenuItem 
                                    key={section.id} 
                                    value={section.id}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {section.name}
                                  </MenuItem>
                                ))}
                              {sections.length === 0 && (
                                <MenuItem disabled>
                                  No sections loaded
                                </MenuItem>
                              )}
                            </Select>
                            </FormControl>
                          </Box>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSubjectAssignmentForYear(yearLevel);
                            }}
                            variant="outlined"
                            size="small"
                            sx={{ 
                              color: 'white',
                              borderColor: 'rgba(255,255,255,0.6)',
                              '&:hover': { borderColor: 'white', bg: 'rgba(255,255,255,0.1)' }
                            }}
                          >
                            Assign Instructor
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent triggering the parent onClick
                              toggleSection(yearLevel);
                            }}
                            sx={{ 
                              color: 'white',
                              '&:hover': { bg: 'rgba(255, 255, 255, 0.1)' }
                            }}
                          >
                            {expandedSections[yearLevel] ? 'Hide' : 'Show'}
                          </Button>
                        </Box>
                      </Box>

                      {/* Assignments Grid - Collapsible */}
                      {expandedSections[yearLevel] && (
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={2}>
                            {filterAssignmentsBySection(groupedAssignments[yearLevel], yearLevel)
                              .map((assignment) => (
                              <Grid item xs={12} md={6} lg={4} key={assignment.id}>
                                <Card 
                                  onClick={() => openAssignmentDetail(assignment)}
                                  sx={{ 
                                    cursor: 'pointer',
                                    bg: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 2,
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                    '&:hover': { 
                                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                      transform: 'translateY(-1px)',
                                      transition: 'all 0.2s ease-in-out'
                                    },
                                    transition: 'all 0.2s ease-in-out',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {/* Compact View - Always Visible */}
                                  <Box sx={{ p: 2.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar
                                          src={assignment.teacher_profile_picture || undefined}
                                          sx={{ 
                                            width: 36, 
                                            height: 36, 
                                            bgcolor: '#dbeafe',
                                            color: '#2563eb',
                                            fontSize: '0.75rem',
                                            fontWeight: 'semibold',
                                            border: '2px solid #e5e7eb'
                                          }}
                                        >
                                          {assignment.teacher_name?.split(' ').map((n: string) => n[0]).join('')}
                                        </Avatar>
                                        <Box>
                                          <Typography variant="body2" sx={{ fontWeight: '600', color: '#111827', mb: 0.5 }}>
                                            {assignment.teacher_name}
                                          </Typography>
                                          <Chip 
                                            label={assignment.teacher_role ? assignment.teacher_role.charAt(0).toUpperCase() + assignment.teacher_role.slice(1) : 'Unknown'}
                                            size="small"
                                            sx={{ 
                                              bgcolor: assignment.teacher_role === 'instructor' ? '#fef3c7' : '#dbeafe',
                                              color: assignment.teacher_role === 'instructor' ? '#92400e' : '#1e40af',
                                              fontSize: '0.7rem',
                                              fontWeight: '500'
                                            }}
                                          />
                                        </Box>
                                      </Box>
                                                                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                         <Chip 
                                           label={`${assignment.subject_units} ${assignment.subject_units === 1 ? 'Unit' : 'Units'}`}
                                           size="medium"
                                           sx={{ 
                                             bg: '#3b82f6', 
                                             color: 'white', 
                                             fontSize: '0.85rem',
                                             fontWeight: '600',
                                             px: 1
                                           }}
                                         />
                                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                           <IconButton
                                             size="small"
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               openEditAssignment(assignment);
                                             }}
                                             sx={{ 
                                               p: 1,
                                               color: '#6b7280',
                                               '&:hover': { 
                                                 color: '#3b82f6',
                                                 bg: 'rgba(59, 130, 246, 0.1)'
                                               }
                                             }}
                                           >
                                             <Edit className="w-4 h-4" />
                                           </IconButton>
                                           <Box sx={{ 
                                             color: '#6b7280',
                                             fontSize: '1rem',
                                             display: 'flex',
                                             alignItems: 'center',
                                             justifyContent: 'center',
                                             width: 32,
                                             height: 32,
                                             borderRadius: '50%',
                                             '&:hover': { 
                                               bg: 'rgba(107, 114, 128, 0.1)'
                                             }
                                           }}>
                                             <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '1.2rem' }}>
                                               👁
                                             </Typography>
                                           </Box>
                                         </Box>
                                       </Box>
                                    </Box>
                                    
                                    {/* Subject Info - Compact */}
                                    <Box sx={{ 
                                      bg: '#f8fafc', 
                                      p: 2, 
                                      border: '1px solid #e2e8f0',
                                      borderRadius: 1.5,
                                      mb: 2
                                    }}>
                                      <Typography variant="h6" sx={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem', mb: 0.5 }}>
                                        {assignment.subject_code}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.8rem', lineHeight: 1.3 }}>
                                        {assignment.subject_name}
                                      </Typography>
                                    </Box>

                                    {/* Quick Details - Compact */}
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                      <Chip 
                                        label={`Section ${assignment.section}`}
                                        size="small"
                                        sx={{ 
                                          bg: '#f1f5f9', 
                                          color: '#475569', 
                                          fontSize: '0.7rem',
                                          fontWeight: '500'
                                        }}
                                      />
                                      <Chip 
                                        label={assignment.semester}
                                        size="small"
                                        sx={{ 
                                          bg: '#f1f5f9', 
                                          color: '#475569', 
                                          fontSize: '0.7rem',
                                          fontWeight: '500'
                                        }}
                                      />
                                      <Chip 
                                        label={`${typeof assignment.day === 'string' && assignment.day ? assignment.day.split(',').map((d: string) => dayAbbr[d] || d).join(', ') : ''} ${assignment.time || ''}`}
                                        size="small"
                                        sx={{ 
                                          bg: '#f1f5f9', 
                                          color: '#475569', 
                                          fontSize: '0.7rem',
                                          fontWeight: '500'
                                        }}
                                      />
                                    </Box>
                                  </Box>


                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )}
                    </Card>
                  ));
                })()}
              </Box>
            ) : (
              // Show filtered assignments for specific year level
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => handleOpenSubjectAssignmentForYear(selectedYearLevel)}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': { background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)' }
                    }}
                  >
                    Assign Instructor
                  </Button>
                </Box>
                {assignments
                  .filter(a => a.year_level === selectedYearLevel)
                  .map((assignment) => (
                    <Card key={assignment.id} sx={{ p: 2, bg: '#f9fafb', border: '1px solid #e5e7eb' }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {assignment.teacher_name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Typography variant="body2">{assignment.subject_code}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2">{assignment.subject_name}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Typography variant="body2">Section {assignment.section}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Typography variant="body2">{assignment.semester}</Typography>
                        </Grid>
                      </Grid>
                    </Card>
                  ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Subject Trace Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#374151', mb: 2 }}>
              Subject Trace Records
            </Typography>
            
            {/* Search Filter */}
            <Card sx={{ mb: 3, p: 2, background: 'rgba(255, 255, 255, 0.8)' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4} md={3}>
                  <TextField
                    fullWidth
                    placeholder="Search instructors..."
                    value={subjectTraceSearchTerm}
                    onChange={(e) => setSubjectTraceSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <Search className="w-4 h-4 text-gray-400 mr-2" />
                    }}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Card>

            {/* Instructors Table */}
            <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Email</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Department</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Role</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subjectTraceLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                          <CircularProgress />
                          <Typography sx={{ mt: 1 }}>Loading instructors...</Typography>
                        </TableCell>
                      </TableRow>
                    ) : filteredInstructors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                          <Typography color="textSecondary">No instructors found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInstructors.map((instructor) => (
                        <TableRow key={instructor.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {instructor.first_name} {instructor.middle_name ? instructor.middle_name + ' ' : ''}{instructor.last_name}
                            </Typography>
                          </TableCell>
                          <TableCell>{instructor.email}</TableCell>
                          <TableCell>{instructor.department || '-'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={instructor.role.charAt(0).toUpperCase() + instructor.role.slice(1)} 
                              size="small"
                              color={instructor.role === 'teacher' ? 'primary' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<Eye className="w-4 h-4" />}
                              onClick={() => handleViewSubjectTrace(instructor)}
                              sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                                }
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        </TabPanel>
      </Card>

      {/* Create Instructor Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            margin: { xs: 0, sm: 2 },
            maxHeight: { xs: '100vh', sm: '90vh' }
          }
        }}
      >
        <DialogTitle 
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            py: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 4 },
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}
        >
          <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Add New Instructor</span>
        </DialogTitle>
        
        <form onSubmit={handleCreateInstructor}>
          <DialogContent sx={{ p: { xs: 2, sm: 4 }, overflow: 'auto' }}>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Middle Name"
                  value={createForm.middleName}
                  onChange={(e) => setCreateForm(f => ({ ...f, middleName: e.target.value }))}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={createForm.email}
                  InputProps={{
                    endAdornment: <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>@smcbi.edu.ph</span>,
                    readOnly: true
                  }}
                  disabled
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f3f4f6'
                    }
                  }}
                />
              </Grid>
              {/* Remove Role Dropdown, use hidden input instead */}
              <input type="hidden" name="role" value="instructor" />
              {/* Department Dropdown */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={createForm.department}
                    label="Department"
                    onChange={(e) => setCreateForm(f => ({ ...f, department: e.target.value }))}
                    disabled={programsLoading}
                  >
                    {programsLoading ? (
                      <MenuItem disabled>Loading departments...</MenuItem>
                    ) : programs.length === 0 ? (
                      <MenuItem disabled>No departments available</MenuItem>
                    ) : (
                      programs.map((program) => (
                        <MenuItem key={program.id} value={program.name}>
                          {program.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  type="text"
                  value={createForm.password}
                  InputProps={{ readOnly: true }}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f9fafb'
                    }
                  }}
                  helperText="Default password will be used. Instructor should change it on first login."
                />
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ 
            p: { xs: 2, sm: 3 }, 
            background: '#f8fafc',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}>
            <Button 
              onClick={() => {
                setCreateDialogOpen(false);
                resetCreateForm();
              }}
              disabled={creating}
              fullWidth={window.innerWidth < 600}
              size="small"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={creating}
              fullWidth={window.innerWidth < 600}
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                }
              }}
            >
              {creating ? 'Creating...' : 'Create Instructor'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Assignment Detail Modal */}
      <Dialog
        open={assignmentDetailModal.isOpen}
        onClose={closeAssignmentDetail}
        maxWidth="sm"
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 2 },
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            maxWidth: { xs: '100%', sm: '500px' },
            width: '100%',
            margin: { xs: 0, sm: 2 },
            maxHeight: { xs: '100vh', sm: '90vh' }
          }
        }}
      >
        {assignmentDetailModal.assignment && (
          <>
            <DialogTitle 
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                py: { xs: 1.5, sm: 2 },
                px: { xs: 2, sm: 3 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                <Typography variant="h6" sx={{ 
                  fontWeight: '600', 
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  Assign Details
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <IconButton
                  onClick={() => openEditAssignment(assignmentDetailModal.assignment!)}
                  sx={{ 
                    color: 'white', 
                    p: { xs: 0.5, sm: 1 },
                    '&:hover': { 
                      bg: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                  size="small"
                >
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                </IconButton>
                <IconButton
                  onClick={closeAssignmentDetail}
                  sx={{ color: 'white', p: { xs: 0.5, sm: 1 } }}
                  size="small"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: { xs: 2, sm: 3 }, overflow: 'auto' }}>
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {/* Teacher Information */}
                <Grid item xs={12}>
                  <Card sx={{ p: { xs: 1.5, sm: 2 }, bg: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: { xs: 1.5, sm: 2 },
                      flexDirection: { xs: 'column', sm: 'row' },
                      textAlign: { xs: 'center', sm: 'left' }
                    }}>
                      <Avatar
                        src={assignmentDetailModal.assignment.teacher_profile_picture || undefined}
                        sx={{ 
                          width: { xs: 40, sm: 48 }, 
                          height: { xs: 40, sm: 48 }, 
                          bgcolor: '#dbeafe',
                          color: '#2563eb',
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          fontWeight: 'semibold',
                          border: '2px solid #e5e7eb'
                        }}
                      >
                        {assignmentDetailModal.assignment.teacher_name?.split(' ').map((n: string) => n[0]).join('')}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="h6" sx={{ 
                          fontWeight: '600', 
                          color: '#111827', 
                          mb: 0.5,
                          fontSize: { xs: '1rem', sm: '1.25rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {assignmentDetailModal.assignment.teacher_name}
                        </Typography>
                        <Chip 
                          label={assignmentDetailModal.assignment.teacher_role ? assignmentDetailModal.assignment.teacher_role.charAt(0).toUpperCase() + assignmentDetailModal.assignment.teacher_role.slice(1) : 'Unknown'}
                          size="small"
                          sx={{ 
                            bgcolor: assignmentDetailModal.assignment.teacher_role === 'instructor' ? '#fef3c7' : '#dbeafe',
                            color: assignmentDetailModal.assignment.teacher_role === 'instructor' ? '#92400e' : '#1e40af',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}
                        />
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                {/* Subject Information */}
                <Grid item xs={12}>
                  <Card sx={{ p: 2, bg: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: '700', color: '#0c4a6e', mb: 0.5 }}>
                          {assignmentDetailModal.assignment.subject_code}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#0369a1', fontWeight: '500' }}>
                          {assignmentDetailModal.assignment.subject_name}
                        </Typography>
                      </Box>
                      <Chip 
                        label={`${assignmentDetailModal.assignment.subject_units} ${assignmentDetailModal.assignment.subject_units === 1 ? 'Unit' : 'Units'}`}
                        size="small"
                        sx={{ 
                          bg: '#0ea5e9', 
                          color: 'white', 
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}
                      />
                    </Box>
                  </Card>
                </Grid>

                {/* Assignment Details */}
                <Grid item xs={12}>
                  <Card sx={{ p: 2, bg: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: '600', color: '#374151', mb: 2 }}>
                      Assignment Details
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: 1.5, 
                          borderRadius: 1, 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                            Section
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: '600', color: '#111827', mt: 0.5 }}>
                            Section {assignmentDetailModal.assignment.section}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: 1.5, 
                          borderRadius: 1, 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                            Semester
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: '600', color: '#111827', mt: 0.5 }}>
                            {assignmentDetailModal.assignment.semester}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: 1.5, 
                          borderRadius: 1, 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                            Schedule
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: '600', color: '#111827', mt: 0.5 }}>
                            {typeof assignmentDetailModal.assignment.day === 'string' && assignmentDetailModal.assignment.day
                              ? assignmentDetailModal.assignment.day.split(',').map((d: string) => dayAbbr[d] || d).join(', ')
                              : ''
                            }
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: '500', color: '#6b7280', mt: 0.25 }}>
                            {assignmentDetailModal.assignment.time || ''}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: 1.5, 
                          borderRadius: 1, 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                            Academic Year
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: '600', color: '#111827', mt: 0.5 }}>
                            {assignmentDetailModal.assignment.academic_year}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>

                {/* Assignment Date */}
                <Grid item xs={12}>
                  <Box sx={{ 
                    bg: '#fef3c7', 
                    p: 1.5, 
                    borderRadius: 1, 
                    border: '1px solid #f59e0b',
                    textAlign: 'center'
                  }}>
                    <Typography variant="body2" sx={{ 
                      color: '#92400e', 
                      fontWeight: '600'
                    }}>
                      Assigned: {new Date(assignmentDetailModal.assignment.created_at || '').toLocaleDateString()}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Edit Assignment Modal is replaced by SubjectAssignmentModal in edit mode */}

      {/* Edit Instructor Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            margin: { xs: 0, sm: 2 },
            maxHeight: { xs: '100vh', sm: '90vh' }
          }
        }}
      >
        <DialogTitle 
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            py: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 4 },
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}
        >
          <Edit className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Edit Instructor</span>
        </DialogTitle>
        
        <form onSubmit={handleUpdateInstructor}>
          <DialogContent sx={{ p: { xs: 2, sm: 4 }, overflow: 'auto' }}>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Middle Name"
                  value={editForm.middleName}
                  onChange={(e) => setEditForm(f => ({ ...f, middleName: e.target.value }))}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                  required
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={editForm.email}
                  InputProps={{ readOnly: true }}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f3f4f6'
                    }
                  }}
                  helperText="Email cannot be changed"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Role"
                  value={editForm.role.charAt(0).toUpperCase() + editForm.role.slice(1)}
                  InputProps={{ readOnly: true }}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f3f4f6'
                    }
                  }}
                  helperText="Role cannot be changed"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={editForm.department}
                    label="Department"
                    onChange={(e) => setEditForm(f => ({ ...f, department: e.target.value }))}
                    disabled={programsLoading}
                  >
                    {programsLoading ? (
                      <MenuItem disabled>Loading departments...</MenuItem>
                    ) : programs.length === 0 ? (
                      <MenuItem disabled>No departments available</MenuItem>
                    ) : (
                      programs.map((program) => (
                        <MenuItem key={program.id} value={program.name}>
                          {program.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editForm.is_active ? 'true' : 'false'}
                    label="Status"
                    onChange={(e) => setEditForm(f => ({ ...f, is_active: e.target.value === 'true' }))}
                  >
                    <MenuItem value="true">Active</MenuItem>
                    <MenuItem value="false">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          
          <DialogActions sx={{ 
            p: { xs: 2, sm: 3 }, 
            background: '#f8fafc',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}>
            <Button 
              onClick={() => {
                setEditDialogOpen(false);
                resetEditForm();
              }}
              disabled={editing}
              fullWidth={window.innerWidth < 600}
              size="small"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={editing}
              fullWidth={window.innerWidth < 600}
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                }
              }}
            >
              {editing ? 'Updating...' : 'Update Instructor'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Instructor Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={closeViewDialog}
        maxWidth="md"
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            margin: { xs: 0, sm: 2 },
            maxHeight: { xs: '100vh', sm: '90vh' }
          }
        }}
      >
        {instructorToView && (
          <>
            <DialogTitle 
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                py: { xs: 2, sm: 3 },
                px: { xs: 2, sm: 4 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
                <Typography variant="h6" sx={{ 
                  fontWeight: '600', 
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  Instructor Details
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <IconButton
                  onClick={() => handleEditInstructor(instructorToView)}
                  sx={{ 
                    color: 'white', 
                    p: { xs: 0.5, sm: 1 },
                    '&:hover': { 
                      bg: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                  size="small"
                >
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                </IconButton>
                <IconButton
                  onClick={closeViewDialog}
                  sx={{ color: 'white', p: { xs: 0.5, sm: 1 } }}
                  size="small"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: { xs: 2, sm: 4 }, overflow: 'auto' }}>
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                {/* Basic Information */}
                <Grid item xs={12}>
                  <Card sx={{ p: { xs: 2, sm: 3 }, bg: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: '600', 
                      color: '#374151', 
                      mb: 2,
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}>
                      Basic Information
                    </Typography>
                    <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: { xs: 1.5, sm: 2 }, 
                          borderRadius: 1, 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: '#6b7280', 
                            fontWeight: '600', 
                            textTransform: 'uppercase',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            First Name
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            fontWeight: '600', 
                            color: '#111827', 
                            mt: 0.5,
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                          }}>
                            {instructorToView.first_name}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: { xs: 1.5, sm: 2 }, 
                          borderRadius: 1, 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: '#6b7280', 
                            fontWeight: '600', 
                            textTransform: 'uppercase',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            Middle Name
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            fontWeight: '600', 
                            color: '#111827', 
                            mt: 0.5,
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                          }}>
                            {instructorToView.middle_name || 'N/A'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: { xs: 1.5, sm: 2 }, 
                          borderRadius: 1, 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: '#6b7280', 
                            fontWeight: '600', 
                            textTransform: 'uppercase',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            Last Name
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            fontWeight: '600', 
                            color: '#111827', 
                            mt: 0.5,
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                          }}>
                            {instructorToView.last_name}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>

                {/* Contact & Role Information */}
                <Grid item xs={12}>
                  <Card sx={{ p: 3, bg: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <Typography variant="h6" sx={{ fontWeight: '600', color: '#0c4a6e', mb: 2 }}>
                      Contact & Role Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: 2, 
                          borderRadius: 1, 
                          border: '1px solid #bae6fd',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: '600', textTransform: 'uppercase' }}>
                            Email Address
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: '600', color: '#0c4a6e', mt: 0.5 }}>
                            {instructorToView.email}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: 2, 
                          borderRadius: 1, 
                          border: '1px solid #bae6fd',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: '600', textTransform: 'uppercase' }}>
                            Role
                          </Typography>
                          <Chip 
                            label={instructorToView.role.charAt(0).toUpperCase() + instructorToView.role.slice(1)}
                            size="small"
                            sx={{ 
                              bgcolor: instructorToView.role === 'instructor' ? '#fef3c7' : '#dbeafe',
                              color: instructorToView.role === 'instructor' ? '#92400e' : '#1e40af',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              mt: 0.5
                            }}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>

                {/* Department & Status */}
                <Grid item xs={12}>
                  <Card sx={{ p: 3, bg: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <Typography variant="h6" sx={{ fontWeight: '600', color: '#14532d', mb: 2 }}>
                      Department & Status
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: 2, 
                          borderRadius: 1, 
                          border: '1px solid #bbf7d0',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: '#15803d', fontWeight: '600', textTransform: 'uppercase' }}>
                            Department
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: '600', color: '#14532d', mt: 0.5 }}>
                            {instructorToView.department || 'N/A'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: 2, 
                          borderRadius: 1, 
                          border: '1px solid #bbf7d0',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: '#15803d', fontWeight: '600', textTransform: 'uppercase' }}>
                            Status
                          </Typography>
                          <Chip 
                            label={instructorToView.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            color={instructorToView.is_active ? 'success' : 'default'}
                            sx={{ 
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              mt: 0.5
                            }}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>

                {/* Account Information */}
                <Grid item xs={12}>
                  <Card sx={{ p: 3, bg: '#fef3c7', border: '1px solid #f59e0b' }}>
                    <Typography variant="h6" sx={{ fontWeight: '600', color: '#92400e', mb: 2 }}>
                      Account Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: 2, 
                          borderRadius: 1, 
                          border: '1px solid #f59e0b',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: '#b45309', fontWeight: '600', textTransform: 'uppercase' }}>
                            Created Date
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: '600', color: '#92400e', mt: 0.5 }}>
                            {new Date(instructorToView.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: 2, 
                          borderRadius: 1, 
                          border: '1px solid #f59e0b',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ color: '#b45309', fontWeight: '600', textTransform: 'uppercase' }}>
                            Last Updated
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: '600', color: '#92400e', mt: 0.5 }}>
                            {new Date(instructorToView.updated_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions sx={{ p: 3, background: '#f8fafc' }}>
              <Button 
                onClick={closeViewDialog}
                variant="outlined"
              >
                Close
              </Button>
              <Button 
                onClick={() => handleEditInstructor(instructorToView)}
                variant="contained"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  }
                }}
              >
                Edit Instructor
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={resetDeleteDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            margin: { xs: 0, sm: 2 },
            maxHeight: { xs: '100vh', sm: '90vh' }
          }
        }}
      >
        <DialogTitle 
          sx={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            color: 'white',
            py: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 4 },
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontSize: { xs: '1.1rem', sm: '1.25rem' }
          }}
        >
          <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>Delete Instructor</span>
        </DialogTitle>
        
        <DialogContent sx={{ p: { xs: 2, sm: 4 }, overflow: 'auto' }}>
          <Typography variant="body1" sx={{ 
            mb: 2,
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}>
            Are you sure you want to delete this instructor?
          </Typography>
          {instructorToDelete && (
            <Box sx={{ 
              bg: '#fef2f2', 
              p: { xs: 2, sm: 3 }, 
              borderRadius: 2, 
              border: '1px solid #fecaca',
              mb: 2
            }}>
              <Typography variant="h6" sx={{ 
                color: '#dc2626', 
                mb: 1,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                wordBreak: 'break-word'
              }}>
                {instructorToDelete.first_name} {instructorToDelete.middle_name ? instructorToDelete.middle_name + ' ' : ''}{instructorToDelete.last_name}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#6b7280',
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                wordBreak: 'break-word'
              }}>
                {instructorToDelete.email}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: '#6b7280',
                fontSize: { xs: '0.8rem', sm: '0.875rem' }
              }}>
                {instructorToDelete.role.charAt(0).toUpperCase() + instructorToDelete.role.slice(1)} • {instructorToDelete.department}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              <strong>Warning:</strong> This action cannot be undone. The instructor will be permanently removed from the system.
            </Typography>
          </Alert>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: { xs: 2, sm: 3 }, 
          background: '#f8fafc',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 }
        }}>
          <Button 
            onClick={resetDeleteDialog}
            disabled={deleting}
            fullWidth={window.innerWidth < 600}
            size="small"
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteInstructor}
            variant="contained"
            disabled={deleting}
            fullWidth={window.innerWidth < 600}
            size="small"
            sx={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
              }
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Instructor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subject Assignment Modal */}
      <SubjectAssignmentModal
        isOpen={subjectAssignmentModal.isOpen}
        onClose={handleCloseSubjectAssignmentModal}
        onSubmit={handleSubjectAssignmentSubmit}
        formErrors={formErrors}
        assignment={newAssignment}
        handleInputChange={handleInputChange}
        formSubmitting={formSubmitting}
        isEditMode={subjectAssignmentModal.isEditMode}
        teachers={instructors.map(instructor => ({
          id: instructor.id,
          first_name: instructor.first_name,
          last_name: instructor.last_name,
          email: instructor.email,
          role: instructor.role,
          department: instructor.department,
          is_active: instructor.is_active,
          full_name: `${instructor.first_name} ${instructor.middle_name ? instructor.middle_name + ' ' : ''}${instructor.last_name}`
        }))}
        courses={courses}
        sections={sections} // Sections for filtering by year level
      />

      {/* Subject Trace Modal */}
      <Dialog
        open={subjectTraceModal.isOpen}
        onClose={closeSubjectTraceModal}
        maxWidth="lg"
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            maxHeight: { xs: '100vh', sm: '90vh' },
            margin: { xs: 0, sm: 2 }
          }
        }}
      >
        {subjectTraceModal.instructor && (
          <>
            <DialogTitle 
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                py: { xs: 2, sm: 3 },
                px: { xs: 2, sm: 4 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                <Typography variant="h6" sx={{ 
                  fontWeight: '600', 
                  fontSize: { xs: '0.9rem', sm: '1.1rem' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  Subject Trace - {subjectTraceModal.instructor.first_name} {subjectTraceModal.instructor.middle_name ? subjectTraceModal.instructor.middle_name + ' ' : ''}{subjectTraceModal.instructor.last_name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <Button
                  variant="contained"
                  startIcon={<Download className="w-3 h-3 sm:w-4 sm:h-4" />}
                  onClick={async () => await generateSubjectTracePDF(subjectTraceModal.instructor!, subjectTraceModal.records)}
                  size="small"
                  sx={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.3)',
                    }
                  }}
                >
                  <span className="hidden sm:inline">Generate PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
                <IconButton
                  onClick={closeSubjectTraceModal}
                  sx={{ color: 'white', p: { xs: 0.5, sm: 1 } }}
                  size="small"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: { xs: 2, sm: 4 }, overflow: 'auto' }}>
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                {/* Instructor Information */}
                <Grid item xs={12}>
                  <Card sx={{ p: { xs: 2, sm: 3 }, bg: '#f8fafc', border: '1px solid #e2e8f0', mb: { xs: 2, sm: 3 } }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: '600', 
                      color: '#374151', 
                      mb: 2,
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}>
                      Instructor Information
                    </Typography>
                    <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: { xs: 1.5, sm: 2 }, 
                          borderRadius: 1, 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: '#6b7280', 
                            fontWeight: '600', 
                            textTransform: 'uppercase',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            Full Name
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            fontWeight: '600', 
                            color: '#111827', 
                            mt: 0.5,
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            wordBreak: 'break-word'
                          }}>
                            {subjectTraceModal.instructor.first_name} {subjectTraceModal.instructor.middle_name ? subjectTraceModal.instructor.middle_name + ' ' : ''}{subjectTraceModal.instructor.last_name}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: { xs: 1.5, sm: 2 }, 
                          borderRadius: 1, 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: '#6b7280', 
                            fontWeight: '600', 
                            textTransform: 'uppercase',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            Email
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            fontWeight: '600', 
                            color: '#111827', 
                            mt: 0.5,
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            wordBreak: 'break-word'
                          }}>
                            {subjectTraceModal.instructor.email}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: { xs: 1.5, sm: 2 }, 
                          borderRadius: 1, 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: '#6b7280', 
                            fontWeight: '600', 
                            textTransform: 'uppercase',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            Department
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            fontWeight: '600', 
                            color: '#111827', 
                            mt: 0.5,
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                          }}>
                            {subjectTraceModal.instructor.department || 'N/A'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ 
                          bg: 'white', 
                          p: { xs: 1.5, sm: 2 }, 
                          borderRadius: 1, 
                          border: '1px solid #e5e7eb',
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: '#6b7280', 
                            fontWeight: '600', 
                            textTransform: 'uppercase',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            Role
                          </Typography>
                          <Chip 
                            label={subjectTraceModal.instructor.role.charAt(0).toUpperCase() + subjectTraceModal.instructor.role.slice(1)}
                            size="small"
                            sx={{ 
                              bgcolor: subjectTraceModal.instructor.role === 'instructor' ? '#fef3c7' : '#dbeafe',
                              color: subjectTraceModal.instructor.role === 'instructor' ? '#92400e' : '#1e40af',
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              fontWeight: '600',
                              mt: 0.5
                            }}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>

                {/* Subject Assignments Table */}
                <Grid item xs={12}>
                  <Card sx={{ p: { xs: 2, sm: 3 }, bg: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: '600', 
                      color: '#0c4a6e', 
                      mb: 2,
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}>
                      Subject Assignments History ({subjectTraceModal.records.length} records)
                    </Typography>
                    
                    {subjectTraceModal.records.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: { xs: 3, sm: 4 } }}>
                        <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
                        <Typography variant="h6" color="textSecondary" sx={{ 
                          mb: 2,
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}>
                          No Subject Assignments Found
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{
                          fontSize: { xs: '0.8rem', sm: '0.875rem' }
                        }}>
                          This instructor has no subject assignment records yet.
                        </Typography>
                      </Box>
                    ) : (
                      <TableContainer sx={{ maxHeight: { xs: 300, sm: 400 }, overflow: 'auto' }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ 
                                fontWeight: 600, 
                                bgcolor: '#e0f2fe',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 1.5 }
                              }}>Semester</TableCell>
                              <TableCell sx={{ 
                                fontWeight: 600, 
                                bgcolor: '#e0f2fe',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 1.5 }
                              }}>Subject Code</TableCell>
                              <TableCell sx={{ 
                                fontWeight: 600, 
                                bgcolor: '#e0f2fe',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 1.5 }
                              }}>Subject Name</TableCell>
                              <TableCell sx={{ 
                                fontWeight: 600, 
                                bgcolor: '#e0f2fe',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 1.5 }
                              }}>Units</TableCell>
                              <TableCell sx={{ 
                                fontWeight: 600, 
                                bgcolor: '#e0f2fe',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 1.5 }
                              }}>Section</TableCell>
                              <TableCell sx={{ 
                                fontWeight: 600, 
                                bgcolor: '#e0f2fe',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 1.5 }
                              }}>Status</TableCell>
                              <TableCell sx={{ 
                                fontWeight: 600, 
                                bgcolor: '#e0f2fe',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                py: { xs: 1, sm: 1.5 }
                              }}>Confirmed At</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {subjectTraceModal.records.map((record) => (
                              <TableRow key={record.id} hover>
                                <TableCell sx={{ py: { xs: 1, sm: 1.5 } }}>
                                  <Typography variant="body2" sx={{ 
                                    fontWeight: '500',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                  }}>
                                    {record.semester} {record.academic_year}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: { xs: 1, sm: 1.5 } }}>
                                  <Typography variant="body2" sx={{ 
                                    fontWeight: '600', 
                                    color: '#1e40af',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                  }}>
                                    {record.subject_code}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: { xs: 1, sm: 1.5 } }}>
                                  <Typography variant="body2" sx={{
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    wordBreak: 'break-word'
                                  }}>
                                    {record.subject_name}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: { xs: 1, sm: 1.5 } }}>
                                  <Chip 
                                    label={`${record.subject_units} ${record.subject_units === 1 ? 'Unit' : 'Units'}`}
                                    size="small"
                                    sx={{ 
                                      bgcolor: '#dbeafe',
                                      color: '#1e40af',
                                      fontWeight: '500',
                                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ py: { xs: 1, sm: 1.5 } }}>
                                  <Typography variant="body2" sx={{
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                  }}>
                                    Section {record.section}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: { xs: 1, sm: 1.5 } }}>
                                  <Chip 
                                    label={record.status}
                                    size="small"
                                    color={record.status === 'Confirmed by Program Head' ? 'success' : 'default'}
                                    sx={{ 
                                      fontWeight: '500',
                                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ py: { xs: 1, sm: 1.5 } }}>
                                  <Typography variant="body2" sx={{ 
                                    color: '#6b7280',
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                  }}>
                                    {new Date(record.confirmed_at).toLocaleDateString()}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default InstructorManagement; 
