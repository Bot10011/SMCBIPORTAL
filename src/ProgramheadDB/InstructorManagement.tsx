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
  Plus
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
    role: 'teacher' as 'teacher' | 'instructor',
    department: '',
    password: 'TempPass@123',
  });

  // Subject Assignment Modal State
  const [subjectAssignmentModal, setSubjectAssignmentModal] = useState({
    isOpen: false,
    selectedTeacherId: '',
    selectedTeacherName: ''
  });
  const [courses, setCourses] = useState<Course[]>([]);
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

  // Fetch instructors on component mount
  useEffect(() => {
    fetchInstructors();
    fetchCourses();
  }, []);

  // Fetch assignments when tab changes to Year Level Assigned Subjects
  useEffect(() => {
    if (tabValue === 1) {
      fetchAssignments();
    }
  }, [tabValue]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
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
            department
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
      role: 'teacher',
      department: '',
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
                <Grid item xs={12} sm={8}>
                  <Typography variant="body2" color="textSecondary">
                    {selectedYearLevel === 'all' 
                      ? `${assignments.length} total assignments`
                      : `${assignments.filter(a => a.year_level === selectedYearLevel).length} assignments in ${selectedYearLevel}`
                    }
                  </Typography>
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
                      {/* Year Level Header */}
                      <Box sx={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        px: 3,
                        py: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
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
                        <Button
                          onClick={() => toggleSection(yearLevel)}
                          sx={{ 
                            color: 'white',
                            '&:hover': { bg: 'rgba(255, 255, 255, 0.1)' }
                          }}
                        >
                          {expandedSections[yearLevel] ? 'Hide' : 'Show'}
                        </Button>
                      </Box>

                      {/* Assignments Grid - Collapsible */}
                      {expandedSections[yearLevel] && (
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={2}>
                            {groupedAssignments[yearLevel].map((assignment) => (
                              <Grid item xs={12} md={6} lg={4} key={assignment.id}>
                                <Card sx={{ 
                                  p: 2, 
                                  bg: '#f9fafb',
                                  border: '1px solid #e5e7eb',
                                  '&:hover': { boxShadow: 2 }
                                }}>
                                  {/* Teacher Info */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Box sx={{ 
                                        width: 32, 
                                        height: 32, 
                                        bg: '#dbeafe', 
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}>
                                        <Typography sx={{ color: '#2563eb', fontWeight: 'semibold', fontSize: '0.75rem' }}>
                                          {assignment.teacher_name?.split(' ').map((n: string) => n[0]).join('')}
                                        </Typography>
                                      </Box>
                                      <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#111827' }}>
                                          {assignment.teacher_name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                          Teacher
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>

                                  {/* Course Info */}
                                  <Box sx={{ mb: 2 }}>
                                    <Card sx={{ bg: 'white', p: 2, border: '1px solid #e5e7eb' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'semibold', color: '#111827' }}>
                                          {assignment.subject_code}
                                        </Typography>
                                        <Chip 
                                          label={`${assignment.subject_units} ${assignment.subject_units === 1 ? 'Unit' : 'Units'}`}
                                          size="small"
                                          sx={{ bg: '#dbeafe', color: '#1e40af', fontSize: '0.75rem' }}
                                        />
                                      </Box>
                                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                        {assignment.subject_name}
                                      </Typography>
                                    </Card>
                                  </Box>

                                  {/* Assignment Details */}
                                  <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                      <Box sx={{ bg: 'white', p: 1, borderRadius: 1, border: '1px solid #e5e7eb' }}>
                                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Section</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#111827' }}>
                                          Section {assignment.section}
                                        </Typography>
                                      </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Box sx={{ bg: 'white', p: 1, borderRadius: 1, border: '1px solid #e5e7eb' }}>
                                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Semester</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#111827' }}>
                                          {assignment.semester}
                                        </Typography>
                                      </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Box sx={{ bg: 'white', p: 1, borderRadius: 1, border: '1px solid #e5e7eb' }}>
                                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Day(s)</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#111827' }}>
                                          {typeof assignment.day === 'string' && assignment.day
                                            ? assignment.day.split(',').map((d: string) => dayAbbr[d] || d).join(', ')
                                            : ''
                                          }
                                        </Typography>
                                      </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Box sx={{ bg: 'white', p: 1, borderRadius: 1, border: '1px solid #e5e7eb' }}>
                                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Time</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#111827' }}>
                                          {assignment.time || ''}
                                        </Typography>
                                      </Box>
                                    </Grid>
                                    <Grid item xs={12}>
                                      <Box sx={{ bg: 'white', p: 1, borderRadius: 1, border: '1px solid #e5e7eb' }}>
                                        <Typography variant="caption" sx={{ color: '#6b7280' }}>Academic Year</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#111827' }}>
                                          {assignment.academic_year}
                                        </Typography>
                                      </Box>
                                    </Grid>
                                  </Grid>

                                  {/* Date Assigned */}
                                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e5e7eb' }}>
                                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                      Assigned: {new Date(assignment.created_at || '').toLocaleDateString()}
                                    </Typography>
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
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={createForm.role}
                    label="Role"
                    onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value as 'teacher' | 'instructor' }))}
                    required
                  >
                    <MenuItem value="teacher">Teacher</MenuItem>
                    <MenuItem value="instructor">Instructor</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={createForm.department}
                    label="Department"
                    onChange={(e) => setCreateForm(f => ({ ...f, department: e.target.value }))}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    <MenuItem value="BSIT">BSIT</MenuItem>
                    <MenuItem value="BSBA">BSBA</MenuItem>
                    <MenuItem value="BSA">BSA</MenuItem>
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
      />
    </Box>
  );
};

export default InstructorManagement; 