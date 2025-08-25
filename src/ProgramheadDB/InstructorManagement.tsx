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
  Filter,
  GraduationCap,
  BookOpen,
  Users,
  Plus,
  X,
  Eye
} from 'lucide-react';
import SubjectAssignmentModal from './SubjectAssignmentModal';

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
  const [filterRole, setFilterRole] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    role: 'instructor' as 'teacher' | 'instructor', // default to instructor
    department: 'BSIT', // default to BSIT
    password: 'TempPass@123',
  });

  // Subject Assignment Modal State
  const [subjectAssignmentModal, setSubjectAssignmentModal] = useState({
    isOpen: false,
    selectedTeacherId: '',
    selectedTeacherName: ''
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<any[]>([]);
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
  
  // Assignment Detail Modal State
  const [assignmentDetailModal, setAssignmentDetailModal] = useState<{
    isOpen: boolean;
    assignment: TeacherSubject | null;
  }>({
    isOpen: false,
    assignment: null
  });

  // Edit Assignment Modal State
  const [editAssignmentModal, setEditAssignmentModal] = useState<{
    isOpen: boolean;
    assignment: TeacherSubject | null;
    loading: boolean;
  }>({
    isOpen: false,
    assignment: null,
    loading: false
  });

  const fetchSections = async () => {
    try {
      console.log('Fetching sections...');
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, year_level')
        .order('name', { ascending: true });
 
      if (error) throw error;
      
      console.log('Fetched sections:', data);
      
      // Validate that sections have proper year_level data
      const validSections = (data || []).filter(section => 
        section.year_level !== null && 
        section.year_level !== undefined && 
        section.name && 
        section.name.trim() !== ''
      );
      
      console.log('Valid sections:', validSections);
      setSections(validSections);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
      setSections([]);
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
        console.log('Raw semester values:', data.map(c => ({ id: c.id, code: c.code, semester: c.semester, type: typeof c.semester })));
        const coursesWithSemester = data.filter(c => c.semester && c.semester !== null && c.semester !== '');
        console.log('Courses with semester:', coursesWithSemester.length);
        console.log('Courses without semester:', data.length - coursesWithSemester.length);
        console.log('Unique semester values:', Array.from(new Set(data.map(c => c.semester))));
        
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
        // Assign default semester if missing
        semester: course.semester || (() => {
          // Try to extract semester from course code or name
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

  // Fetch instructors on component mount
  useEffect(() => {
    fetchInstructors();
    fetchCourses();
    fetchSections();
  }, []);

  // Fetch assignments when tab changes to Year Level Assigned Subjects
  useEffect(() => {
    if (tabValue === 1) {
      fetchAssignments();
    }
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
      department: 'BSIT', // default to BSIT
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
    
    const matchesRole = !filterRole || instructor.role === filterRole;
    const matchesDepartment = !filterDepartment || instructor.department === filterDepartment;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && instructor.is_active) ||
      (filterStatus === 'inactive' && !instructor.is_active);

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Subject Assignment Functions
  const handleAssignSubject = (instructor: Instructor) => {
    setSubjectAssignmentModal({
      isOpen: true,
      selectedTeacherId: instructor.id,
      selectedTeacherName: `${instructor.first_name} ${instructor.middle_name ? instructor.middle_name + ' ' : ''}${instructor.last_name}`
    });
    
    // Pre-fill the assignment form with the selected teacher
    setNewAssignment({
      teacher_id: instructor.id,
      subject_id: '',
      section: '',
      academic_year: getDefaultSchoolYear(),
      semester: '1st Semester',
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
      
      // Insert the assignment into the database
      const { error } = await supabase
        .from('teacher_subjects')
        .insert(assignments);

      if (error) throw error;

      toast.success('Subject assigned successfully!');
      setSubjectAssignmentModal({ isOpen: false, selectedTeacherId: '', selectedTeacherName: '' });
      
      return { success: true, message: 'Subject assigned successfully!' };
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
    setSubjectAssignmentModal({ isOpen: false, selectedTeacherId: '', selectedTeacherName: '' });
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
    setSubjectAssignmentModal({ isOpen: true, selectedTeacherId: '', selectedTeacherName: '' });
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
    setEditAssignmentModal({
      isOpen: true,
      assignment,
      loading: false
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
              <Grid item xs={12} sm={3}>
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
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={filterRole}
                    label="Role"
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <MenuItem value="">All Roles</MenuItem>
                    <MenuItem value="teacher">Teacher</MenuItem>
                    <MenuItem value="instructor">Instructor</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={filterDepartment}
                    label="Department"
                    onChange={(e) => setFilterDepartment(e.target.value)}
                  >
                    <MenuItem value="">All Departments</MenuItem>
                    <MenuItem value="BSIT">BSIT</MenuItem>
                    <MenuItem value="BSBA">BSBA</MenuItem>
                    <MenuItem value="BSA">BSA</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    label="Status"
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
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
                            color="success"
                            onClick={() => handleAssignSubject(instructor)}
                            title="Assign Subject"
                          >
                            <Plus className="w-4 h-4" />
                          </IconButton>
                          <IconButton size="small" color="primary">
                            <Edit className="w-4 h-4" />
                          </IconButton>
                          <IconButton size="small" color="error">
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
                  <Button
                    variant="outlined"
                    onClick={() => {
                      console.log('Manual test: fetching courses...');
                      void fetchCourses();
                    }}
                    sx={{ ml: 2 }}
                  >
                    Test Fetch Courses
                  </Button>
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
                            label={`${groupedAssignments[yearLevel].length} ${groupedAssignments[yearLevel].length === 1 ? 'Assignment' : 'Assignments'}`}
                            size="small"
                            sx={{ 
                              bg: 'rgba(255, 255, 255, 0.2)', 
                              color: 'white',
                              fontWeight: 'medium'
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            {groupedAssignments[yearLevel].map((assignment) => (
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
      </Card>

      {/* Create Instructor Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        <DialogTitle 
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            py: 3,
            px: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <UserPlus className="w-6 h-6" />
          Add New Instructor
        </DialogTitle>
        
        <form onSubmit={handleCreateInstructor}>
          <DialogContent sx={{ p: 4 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Middle Name"
                  value={createForm.middleName}
                  onChange={(e) => setCreateForm(f => ({ ...f, middleName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  value={createForm.email}
                  InputProps={{
                    endAdornment: <span style={{ color: '#6b7280' }}>@smcbi.edu.ph</span>,
                    readOnly: true
                  }}
                  disabled
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f3f4f6'
                    }
                  }}
                />
              </Grid>
              {/* Remove Role Dropdown, use hidden input instead */}
              <input type="hidden" name="role" value="instructor" />
              {/* Remove Department Dropdown, use read-only text field instead */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={createForm.department}
                  InputProps={{ readOnly: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f9fafb'
                    }
                  }}
                  helperText="Department is set to BSIT by default."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  type="text"
                  value={createForm.password}
                  InputProps={{ readOnly: true }}
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
          
          <DialogActions sx={{ p: 3, background: '#f8fafc' }}>
            <Button 
              onClick={() => {
                setCreateDialogOpen(false);
                resetCreateForm();
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={creating}
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
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            maxWidth: '500px',
            width: '100%'
          }
        }}
      >
        {assignmentDetailModal.assignment && (
          <>
            <DialogTitle 
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                py: 2,
                px: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <BookOpen className="w-5 h-5" />
                <Typography variant="h6" sx={{ fontWeight: '600', fontSize: '1.1rem' }}>
                  Assignment Details
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  onClick={() => openEditAssignment(assignmentDetailModal.assignment!)}
                  sx={{ 
                    color: 'white', 
                    p: 1,
                    '&:hover': { 
                      bg: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                  size="medium"
                >
                  <Edit className="w-5 h-5" />
                </IconButton>
                <IconButton
                  onClick={closeAssignmentDetail}
                  sx={{ color: 'white', p: 1 }}
                  size="medium"
                >
                  <X className="w-5 h-5" />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={2}>
                {/* Teacher Information */}
                <Grid item xs={12}>
                  <Card sx={{ p: 2, bg: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        src={assignmentDetailModal.assignment.teacher_profile_picture || undefined}
                        sx={{ 
                          width: 48, 
                          height: 48, 
                          bgcolor: '#dbeafe',
                          color: '#2563eb',
                          fontSize: '1rem',
                          fontWeight: 'semibold',
                          border: '2px solid #e5e7eb'
                        }}
                      >
                        {assignmentDetailModal.assignment.teacher_name?.split(' ').map((n: string) => n[0]).join('')}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: '600', color: '#111827', mb: 0.5 }}>
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

      {/* Edit Assignment Modal */}
      <Dialog
        open={editAssignmentModal.isOpen}
        onClose={closeEditAssignment}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        {editAssignmentModal.assignment && (
          <form onSubmit={handleEditAssignment}>
            <DialogTitle 
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                py: 2,
                px: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Edit className="w-5 h-5" />
                <Typography variant="h6" sx={{ fontWeight: '600', fontSize: '1.1rem' }}>
                  Edit Assignment
                </Typography>
              </Box>
              <IconButton
                onClick={closeEditAssignment}
                sx={{ color: 'white', p: 0.5 }}
                size="small"
              >
                <X className="w-4 h-4" />
              </IconButton>
            </DialogTitle>
            
            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={2}>
                {/* Instructor Selection */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Instructor</InputLabel>
                    <Select
                      value={editAssignmentModal.assignment.teacher_id}
                      onChange={(e) => setEditAssignmentModal(prev => ({
                        ...prev,
                        assignment: prev.assignment ? {
                          ...prev.assignment,
                          teacher_id: e.target.value
                        } : null
                      }))}
                      label="Instructor"
                    >
                      {instructors.map((instructor) => (
                        <MenuItem key={instructor.id} value={instructor.id}>
                          {instructor.first_name} {instructor.middle_name ? instructor.middle_name + ' ' : ''}{instructor.last_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Subject Selection */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Subject</InputLabel>
                    <Select
                      value={editAssignmentModal.assignment.subject_id}
                      onChange={(e) => setEditAssignmentModal(prev => ({
                        ...prev,
                        assignment: prev.assignment ? {
                          ...prev.assignment,
                          subject_id: e.target.value
                        } : null
                      }))}
                      label="Subject"
                    >
                      {courses.map((course) => (
                        <MenuItem key={course.id} value={course.id}>
                          {course.code} - {course.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Section */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Section"
                    value={editAssignmentModal.assignment.section}
                    onChange={(e) => setEditAssignmentModal(prev => ({
                      ...prev,
                      assignment: prev.assignment ? {
                        ...prev.assignment,
                        section: e.target.value
                      } : null
                    }))}
                  />
                </Grid>

                {/* Semester */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Semester</InputLabel>
                    <Select
                      value={editAssignmentModal.assignment.semester}
                      onChange={(e) => setEditAssignmentModal(prev => ({
                        ...prev,
                        assignment: prev.assignment ? {
                          ...prev.assignment,
                          semester: e.target.value
                        } : null
                      }))}
                      label="Semester"
                    >
                      <MenuItem value="First Semester">First Semester</MenuItem>
                      <MenuItem value="Second Semester">Second Semester</MenuItem>
                      <MenuItem value="Summer">Summer</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Academic Year */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Academic Year"
                    value={editAssignmentModal.assignment.academic_year}
                    onChange={(e) => setEditAssignmentModal(prev => ({
                      ...prev,
                      assignment: prev.assignment ? {
                        ...prev.assignment,
                        academic_year: e.target.value
                      } : null
                    }))}
                  />
                </Grid>

                {/* Year Level */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Year Level</InputLabel>
                    <Select
                      value={editAssignmentModal.assignment.year_level}
                      onChange={(e) => setEditAssignmentModal(prev => ({
                        ...prev,
                        assignment: prev.assignment ? {
                          ...prev.assignment,
                          year_level: e.target.value
                        } : null
                      }))}
                      label="Year Level"
                    >
                      <MenuItem value="1st Year">1st Year</MenuItem>
                      <MenuItem value="2nd Year">2nd Year</MenuItem>
                      <MenuItem value="3rd Year">3rd Year</MenuItem>
                      <MenuItem value="4th Year">4th Year</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Schedule */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Days (e.g., Monday, Tuesday)"
                    value={editAssignmentModal.assignment.day || ''}
                    onChange={(e) => setEditAssignmentModal(prev => ({
                      ...prev,
                      assignment: prev.assignment ? {
                        ...prev.assignment,
                        day: e.target.value
                      } : null
                    }))}
                    placeholder="Monday, Tuesday, Wednesday"
                  />
                </Grid>

                {/* Time */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Time"
                    value={editAssignmentModal.assignment.time || ''}
                    onChange={(e) => setEditAssignmentModal(prev => ({
                      ...prev,
                      assignment: prev.assignment ? {
                        ...prev.assignment,
                        time: e.target.value
                      } : null
                    }))}
                    placeholder="9:00 AM - 10:30 AM"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions sx={{ p: 3, background: '#f8fafc' }}>
              <Button 
                onClick={closeEditAssignment}
                disabled={editAssignmentModal.loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained"
                disabled={editAssignmentModal.loading}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  }
                }}
              >
                {editAssignmentModal.loading ? 'Updating...' : 'Update Assignment'}
              </Button>
            </DialogActions>
          </form>
        )}
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
        isEditMode={false}
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
        sections={sections}
      />
    </Box>
  );
};

export default InstructorManagement; 
