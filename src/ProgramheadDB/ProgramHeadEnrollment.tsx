import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Switch,
  Paper,
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  name: string;
  studentType: 'Freshman' | 'Regular' | 'Irregular' | 'Transferee';
  yearLevel: number;
  currentSubjects: Subject[];
  doneSubjects: Subject[];
  status: 'pending' | 'approved' | 'returned';
  department: string;
  schoolYear: string;
  semester: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  units: number;
  yearLevel: number;
  status: 'pending' | 'approved' | 'removed';
}

const ProgramHeadEnrollment: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [allowMixedCourses, setAllowMixedCourses] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editForm, setEditForm] = useState<Student | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [isExistingModalOpen, setIsExistingModalOpen] = useState(false);
  const [existingStudentsByYear, setExistingStudentsByYear] = useState<Record<string, Student[]>>({});
  const [selectedExistingStudent, setSelectedExistingStudent] = useState<Student | null>(null);
  const [existingFilterYear, setExistingFilterYear] = useState('');
  const [endSemesterOpen, setEndSemesterOpen] = useState(false);
  const [endSemesterLoading, setEndSemesterLoading] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  const getDefaultSchoolYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const nextYear = year + 1;
    return `${year}-${nextYear}`;
  };

  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'TempPass@123',
    studentType: 'Freshman',
    yearLevel: 1,
    schoolYear: getDefaultSchoolYear(),
    studentId: '',
    department: 'BSIT',
    semester: '1st Semester',
  });

  useEffect(() => {
    loadEnrollments();
  }, []);

  useEffect(() => {
    // Auto-generate email when first and last name are entered
    if (createForm.firstName && createForm.lastName) {
      const email = (createForm.lastName + createForm.firstName).replace(/\s+/g, '').toLowerCase();
      setCreateForm(f => ({ ...f, email }));
    } else {
      setCreateForm(f => ({ ...f, email: '' }));
    }
    // eslint-disable-next-line
  }, [createForm.firstName, createForm.lastName]);

  useEffect(() => {
    // If year level is 2 or higher, set student type to 'Regular' and restrict 'Freshman'
    if (Number(createForm.yearLevel) >= 2 && createForm.studentType === 'Freshman') {
      setCreateForm(f => ({ ...f, studentType: 'Regular' }));
    }
  }, [createForm.yearLevel]);

  useEffect(() => {
    // Auto-generate student ID when school year, first and last name are entered
    const generateStudentId = async () => {
      if (createForm.schoolYear && createForm.firstName && createForm.lastName) {
        // Extract last two digits of school year start
        const match = createForm.schoolYear.match(/(\d{4})/);
        if (!match) {
          setCreateForm(f => ({ ...f, studentId: '' }));
          return;
        }
        const yearPrefix = match[1].slice(-2);
        // Query how many students are already enrolled in this school year
        const { data, count, error } = await supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .ilike('student_id', `C-${yearPrefix}%`);
        let regNum = 1;
        if (!error && typeof count === 'number') {
          regNum = count + 1;
        }
        const regNumStr = regNum.toString().padStart(4, '0');
        const studentId = `C-${yearPrefix}${regNumStr}`;
        setCreateForm(f => ({ ...f, studentId }));
      } else {
        setCreateForm(f => ({ ...f, studentId: '' }));
      }
    };
    generateStudentId();
    // eslint-disable-next-line
  }, [createForm.schoolYear, createForm.firstName, createForm.lastName]);

  useEffect(() => {
    // Fetch courses on mount
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, code, name, description, units')
        .order('code', { ascending: true });
      if (!error && data) setCourses(data);
    };
    fetchCourses();
  }, []);

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      // Fetch real students from the database
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: true });
      if (error) throw error;
      // Map to Student interface if needed
      const students = (data || []).map((student: Record<string, unknown>) => ({
        id: String(student.student_id || student.id),
        name: `${String(student.first_name)} ${String(student.last_name)}`,
        studentType: (student.student_type as Student['studentType']) || 'Freshman',
        yearLevel: Number(student.year_level) || 1,
        currentSubjects: [],
        doneSubjects: [],
        status: (student.enrollment_status as Student['status']) || 'pending',
        department: String(student.department || ''),
        schoolYear: String(student.school_year || ''),
        semester: String(student.semester || ''),
      }));
      setStudents(students);
    } catch (err) {
      setError('Failed to load enrollments');
      console.error('Error loading enrollments:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStudentTypeColor = (type: string) => {
    switch (type) {
      case 'Freshman': return 'primary';
      case 'Regular': return 'success';
      case 'Irregular': return 'warning';
      case 'Transferee': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'returned': return 'error';
      default: return 'default';
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      // Note: The authentication issue where creating a student would log out the program head
      // has been resolved by removing the problematic signInWithPassword calls in ProtectedRoute
      // and StudentDashboard components. The password change modal will only appear for actual students.
      if (selectedExistingStudent) {
        // Look up the UUID for the existing student_id
        const { data: userProfile, error: lookupError } = await supabase
          .from('user_profiles')
          .select('id, student_id')
          .eq('student_id', selectedExistingStudent.id)
          .single();
        if (lookupError || !userProfile) throw new Error('Could not find user UUID for this student');
        const userId = userProfile.id;
        const originalStudentId = userProfile.student_id;
        // Update existing student profile
        const { error: updateError } = await supabase.from('user_profiles').update({
          first_name: createForm.firstName,
          last_name: createForm.lastName,
          student_type: createForm.studentType,
          year_level: String(createForm.yearLevel),
          school_year: createForm.schoolYear,
          student_id: originalStudentId,
          department: createForm.department,
          semester: createForm.semester,
          enrollment_status: 'pending',
          updated_at: new Date().toISOString(),
        }).eq('student_id', originalStudentId);
        if (updateError) throw updateError;
        // Insert or update enrollments for selected courses (upsert)
        if (selectedCourses.length > 0) {
          const enrollments = selectedCourses.map(courseId => ({
            student_id: userId, // Use UUID here
            subject_id: courseId,
            status: 'active',
            enrollment_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            school_year: createForm.schoolYear,
            semester: createForm.semester,
          }));
          const { error: enrollError } = await supabase.from('enrollcourse').upsert(enrollments, { onConflict: 'student_id,subject_id' });
          if (enrollError) throw enrollError;
        }
        toast.success('Existing student enrollment updated!');
        setIsCreateDialogOpen(false);
        setCreateForm({ firstName: '', lastName: '', email: '', password: 'TempPass@123', studentType: 'Freshman', yearLevel: 1, schoolYear: getDefaultSchoolYear(), studentId: '', department: 'BSIT', semester: '1st Semester' });
        setSelectedCourses([]);
        setSelectedExistingStudent(null);
        loadEnrollments();
        return;
      }
      const fullEmail = createForm.email + '@smcbi.edu.ph';
      // 1. Check if email already exists
      const { count: emailCount, error: emailError } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('email', fullEmail);
      if (emailError) throw emailError;
      if (emailCount && emailCount > 0) {
        toast.error('Email already exists. Please choose a different email.');
        setCreating(false);
        return;
      }
      
      // 2. Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fullEmail,
        password: createForm.password,
        options: {
          data: {
            role: 'student',
            first_name: createForm.firstName,
            last_name: createForm.lastName
          }
        }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create auth user');
      
      // 3. Create user profile with the auth user ID
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id, // Use the auth user ID
        email: fullEmail,
        first_name: createForm.firstName,
        last_name: createForm.lastName,
        role: 'student',
        is_active: true,
        student_type: createForm.studentType,
        year_level: String(createForm.yearLevel),
        school_year: createForm.schoolYear,
        student_id: createForm.studentId,
        department: createForm.department,
        semester: createForm.semester,
        enrollment_status: 'pending',
        password_changed: false, // Initialize as false since they're using default password
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;
      // Insert enrollments for selected courses
      if (selectedCourses.length > 0) {
        const enrollments = selectedCourses.map(courseId => ({
          student_id: authData.user.id, // Use the auth user ID directly
          subject_id: courseId,
          status: 'active',
          enrollment_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const { error: enrollError } = await supabase.from('enrollcourse').insert(enrollments);
        if (enrollError) throw enrollError;
      }
      toast.success('Student account successfully created.');
      setIsCreateDialogOpen(false);
      setCreateForm({ firstName: '', lastName: '', email: '', password: 'TempPass@123', studentType: 'Freshman', yearLevel: 1, schoolYear: getDefaultSchoolYear(), studentId: '', department: 'BSIT', semester: '1st Semester' });
      setSelectedCourses([]);
      setSelectedExistingStudent(null);
      loadEnrollments();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create student';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleCourseCheckbox = (courseId: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  // Helper to categorize courses
  const categorizeCourses = (courses: Record<string, unknown>[]) => {
    const categories: Record<string, Record<string, unknown[]>> = {};
    courses.forEach(course => {
      if (course.code.startsWith('IT')) {
        // Major
        const yearDigit = course.code.replace('IT', '').trim()[0];
        let yearLabel = '';
        if (yearDigit === '1') yearLabel = '1st Year';
        else if (yearDigit === '2') yearLabel = '2nd Year';
        else if (yearDigit === '3') yearLabel = '3rd Year';
        else if (yearDigit === '4') yearLabel = '4th Year';
        else yearLabel = 'Other Year';
        if (!categories['Major']) categories['Major'] = {};
        if (!categories['Major'][yearLabel]) categories['Major'][yearLabel] = [];
        categories['Major'][yearLabel].push(course);
      } else {
        // Minor (was 'Other')
        if (!categories['Minor']) categories['Minor'] = {};
        if (!categories['Minor']['All']) categories['Minor']['All'] = [];
        categories['Minor']['All'].push(course);
      }
    });
    return categories;
  };

  // Helper to filter courses by student type, year level, and search
  const getVisibleCourses = () => {
    // If Irregular or Transferee, show all
    let filteredCourses = courses;
    if (courseSearch.trim() !== '') {
      const search = courseSearch.trim().toLowerCase();
      filteredCourses = courses.filter(
        c => c.code.toLowerCase().includes(search) || c.name.toLowerCase().includes(search)
      );
    }
    const categorized = categorizeCourses(filteredCourses);
    if (["Irregular", "Transferee"].includes(createForm.studentType)) {
      return categorized;
    }
    if (createForm.studentType === "Regular" && allowMixedCourses) {
      return categorized;
    }
    const yearMap: Record<string, string> = {
      '1': '1st Year',
      '2': '2nd Year',
      '3': '3rd Year',
      '4': '4th Year',
    };
    const yearLabel = (yearMap as any)[String(createForm.yearLevel)] || '1st Year';
    const filtered: any = {};
    if ((categorized as any)['Major'] && (categorized as any)['Major'][yearLabel]) {
      filtered['Major'] = { [yearLabel]: (categorized as any)['Major'][yearLabel] };
    }
    if ((categorized as any)['Minor']) {
      filtered['Minor'] = (categorized as any)['Minor'];
    }
    return filtered;
  };

  const visibleCourses = getVisibleCourses();

  // Filtered students
  const filteredStudents = students.filter(student => {
    const matchesSearch =
      filterSearch === '' ||
      student.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      (student.id && student.id.toLowerCase().includes(filterSearch.toLowerCase()));
    const matchesYear = filterYear === '' || String(student.yearLevel) === filterYear;
    const matchesType = filterType === '' || student.studentType === filterType;
    const matchesStatus = filterStatus === '' || (student.status && student.status.toLowerCase() === filterStatus.toLowerCase());
    return matchesSearch && matchesYear && matchesType && matchesStatus;
  });

  // Handler to save edited student
  const handleSaveEdit = async () => {
    if (!editForm) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase.from('user_profiles').update({
        first_name: editForm.name.split(' ')[1] || '',
        last_name: editForm.name.split(' ')[0] || '',
        student_type: editForm.studentType,
        year_level: String(editForm.yearLevel),
        school_year: editForm.schoolYear,
        student_id: editForm.id,
        department: editForm.department,
        semester: editForm.semester,
        enrollment_status: editForm.status,
      }).eq('student_id', editForm.id);
      if (error) throw error;
      toast.success('Student info updated!');
      setEditForm(null);
      loadEnrollments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update student');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handler to open existing student modal
  const handleOpenExistingModal = () => {
    // Categorize students by year level
    const byYear: Record<string, Student[]> = {};
    students.forEach(student => {
      const year = String(student.yearLevel);
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(student);
    });
    setExistingStudentsByYear(byYear);
    setIsExistingModalOpen(true);
  };

  // Handler to enroll existing student
  const handleEnrollExisting = (student: Student) => {
    setSelectedExistingStudent(student);
    setCreateForm({
      firstName: student.name.split(' ')[1] || '',
      lastName: student.name.split(' ')[0] || '',
      email: '', // Not editable
      password: 'TempPass@123', // Not editable
      studentType: student.studentType,
      yearLevel: student.yearLevel,
      schoolYear: student.schoolYear,
      studentId: student.id, // Always use the original student.id
      department: student.department,
      semester: student.semester,
    });
    setIsExistingModalOpen(false);
    setIsCreateDialogOpen(true);
  };

  // Helper to format year level as ordinal
  const getYearLabel = (year: string) => {
    switch (year) {
      case '1': return '1st Year';
      case '2': return '2nd Year';
      case '3': return '3rd Year';
      case '4': return '4th Year';
      default: return `${year} Year`;
    }
  };

  // Handler for end semester
  const handleEndSemester = async () => {
    setEndSemesterLoading(true);
    try {
      const { error } = await supabase.from('user_profiles').update({ enrollment_status: 'active' }).eq('enrollment_status', 'enrolled');
      if (error) throw error;
      toast.success('All enrolled students are now active!');
      setEndSemesterOpen(false);
      loadEnrollments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to end semester');
    } finally {
      setEndSemesterLoading(false);
    }
  };

  // Helper to reset the new student form
  const flushNewStudentForm = () => {
    setCreateForm({
      firstName: '',
      lastName: '',
      email: '',
      password: 'TempPass@123',
      studentType: 'Freshman',
      yearLevel: 1,
      schoolYear: getDefaultSchoolYear(),
      studentId: '',
      department: 'BSIT',
      semester: '1st Semester',
    });
    setSelectedCourses([]);
    setAllowMixedCourses(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box component={Paper} elevation={3} sx={{ p: { xs: 1, sm: 3 }, borderRadius: 4, background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)', minHeight: '100vh' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom mb={3} sx={{ letterSpacing: 1 }}>
        Enrollment Management
      </Typography>
      <Card sx={{ mb: 3, p: 2, borderRadius: 3, boxShadow: 2, background: 'rgba(255,255,255,0.95)' }}>
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" mb={2}>
          <Button variant="outlined" color="error" size="medium" onClick={() => setEndSemesterOpen(true)} startIcon={<i className="fas fa-calendar-times" />} sx={{ borderRadius: 99, px: 3, fontWeight: 600 }}>
            End Semester
          </Button>
          <Button variant="contained" color="primary" size="medium" onClick={() => { setSelectedExistingStudent(null); flushNewStudentForm(); setIsCreateDialogOpen(true); }} startIcon={<i className="fas fa-user-plus" />} sx={{ borderRadius: 99, px: 3, fontWeight: 600, boxShadow: 1 }}>
            Enroll New Student
          </Button>
          <Button variant="contained" color="success" size="medium" onClick={handleOpenExistingModal} startIcon={<i className="fas fa-user-check" />} sx={{ borderRadius: 99, px: 3, fontWeight: 600, boxShadow: 1 }}>
            Enroll Existing Student
          </Button>
          <Button variant="outlined" color="primary" size="medium" onClick={loadEnrollments} startIcon={<i className="fas fa-sync-alt" />} sx={{ borderRadius: 99, px: 3, fontWeight: 600 }}>
            Refresh List
          </Button>
        </Box>
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" justifyContent="flex-start" sx={{ background: '#f3f6fa', borderRadius: 99, p: 2, boxShadow: 0, mb: 1 }}>
          <TextField
            label="Search by Name or Student ID"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 220, borderRadius: 99, background: '#fff' }}
            InputProps={{ startAdornment: <i className="fas fa-search" style={{ marginRight: 8 }} /> }}
          />
          <FormControl size="small" sx={{ minWidth: 140, borderRadius: 99, background: '#fff' }}>
            <InputLabel>Year Level</InputLabel>
            <Select
              value={filterYear}
              label="Year Level"
              onChange={e => setFilterYear(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="1">1st Year</MenuItem>
              <MenuItem value="2">2nd Year</MenuItem>
              <MenuItem value="3">3rd Year</MenuItem>
              <MenuItem value="4">4th Year</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140, borderRadius: 99, background: '#fff' }}>
            <InputLabel>Student Type</InputLabel>
            <Select
              value={filterType}
              label="Student Type"
              onChange={e => setFilterType(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Freshman">Freshman</MenuItem>
              <MenuItem value="Regular">Regular</MenuItem>
              <MenuItem value="Irregular">Irregular</MenuItem>
              <MenuItem value="Transferee">Transferee</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={e => setFilterStatus(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="enrolled">Enrolled</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="returned">Returned</MenuItem>
              <MenuItem value="dropped">Dropped</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Card>
      <Typography variant="h6" fontWeight={600} gutterBottom mb={1}>
        Student List
      </Typography>
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ background: '#f0f4f8' }}>
                <TableRow>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Year Level</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ position: 'sticky', right: 0, background: '#fff', zIndex: 1 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.map((student, idx) => (
                  <TableRow key={student.id} sx={{ background: idx % 2 === 0 ? '#f9fbfc' : '#fff' }}>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={student.studentType}
                        color={getStudentTypeColor(student.studentType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{student.yearLevel}</TableCell>
                    <TableCell>{student.department}</TableCell>
                    <TableCell>
                      <Chip
                        label={student.status.toUpperCase()}
                        color={getStatusColor(student.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ position: 'sticky', right: 0, background: '#fff', zIndex: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => { setEditForm(student); }}
                        title="Review and Edit Student"
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setSelectedExistingStudent(null);
          flushNewStudentForm();
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{selectedExistingStudent ? 'Enroll Existing Student' : 'Enroll New Student'}</DialogTitle>
        {selectedExistingStudent ? (
          <form onSubmit={handleCreateStudent}>
            <DialogContent
              sx={{
                minWidth: { xs: 0, sm: 700, md: 950 },
                background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
                borderRadius: 4,
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
                border: '1px solid #e5e7eb',
                p: { xs: 2, sm: 4 },
              }}
            >
              <Grid container spacing={3} alignItems="flex-start">
                {/* Left side: Existing student info (read-only) */}
                <Grid item xs={12} md={6}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="First Name" value={createForm.firstName} fullWidth required InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Last Name" value={createForm.lastName} fullWidth required InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Email" type="text" value={createForm.email} fullWidth required InputProps={{ endAdornment: <span>@smcbi.edu.ph</span>, readOnly: true }} disabled />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Student Type</InputLabel>
                        <Select value={createForm.studentType} label="Student Type" onChange={e => setCreateForm(f => ({ ...f, studentType: e.target.value }))} required fullWidth>
                          <MenuItem value="Freshman">Freshman</MenuItem>
                          <MenuItem value="Regular">Regular</MenuItem>
                          <MenuItem value="Irregular">Irregular</MenuItem>
                          <MenuItem value="Transferee">Transferee</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Year Level</InputLabel>
                        <Select value={createForm.yearLevel} label="Year Level" onChange={e => setCreateForm(f => ({ ...f, yearLevel: Number(e.target.value) }))} required fullWidth>
                          <MenuItem value={1}>1st Year</MenuItem>
                          <MenuItem value={2}>2nd Year</MenuItem>
                          <MenuItem value={3}>3rd Year</MenuItem>
                          <MenuItem value={4}>4th Year</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="School Year" type="text" value={createForm.schoolYear} fullWidth required InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Semester</InputLabel>
                        <Select value={createForm.semester} label="Semester" onChange={e => setCreateForm(f => ({ ...f, semester: e.target.value }))} required fullWidth>
                          <MenuItem value="1st Semester">1st Semester</MenuItem>
                          <MenuItem value="2nd Semester">2nd Semester</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Student ID" type="text" value={createForm.studentId} fullWidth required InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Course</InputLabel>
                        <Select value={createForm.department} label="Course" disabled fullWidth>
                          <MenuItem value="BSIT">BSIT</MenuItem>
                          {/* Add more courses here if needed */}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>
                {/* Right side: Courses Offered (checkboxes) */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Courses Offered</Typography>
                  {/* Search bar for filtering courses */}
                  <TextField
                    label="Search Courses"
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ mb: 2 }}
                    placeholder="Type course code or name..."
                  />
                  {/* Render categorized courses */}
                  {Object.entries(visibleCourses).map(([category, subcats]) => (
                    <Box key={category} mb={2}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>{category}</Typography>
                      {Object.entries(subcats as Record<string, unknown[]>).map(([subcat, courseList]) => (
                        <Box key={subcat} ml={2} mb={1}>
                          {subcat !== 'All' && (
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{subcat}</Typography>
                          )}
                          <FormGroup row>
                            {(courseList as unknown[]).map((course: unknown) => (
                              <FormControlLabel
                                key={course.id}
                                control={
                                  <Checkbox
                                    checked={selectedCourses.includes(course.id)}
                                    onChange={() => handleCourseCheckbox(course.id)}
                                  />
                                }
                                label={`${(course as { id: string; code: string; name: string; units: number; yearLevel: number; status: string }).code} - ${(course as { id: string; code: string; name: string; units: number; yearLevel: number; status: string }).name}`}
                              />
                            ))}
                          </FormGroup>
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsCreateDialogOpen(false)} disabled={creating}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={creating}>{creating ? 'Enrolling...' : 'Enroll'}</Button>
            </DialogActions>
          </form>
        ) : (
          <form onSubmit={handleCreateStudent}>
            <DialogContent
              sx={{
                minWidth: { xs: 0, sm: 700, md: 950 },
                background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
                borderRadius: 4,
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
                border: '1px solid #e5e7eb',
                p: { xs: 2, sm: 4 },
              }}
            >
              <Grid container spacing={3} alignItems="flex-start">
                <Grid item xs={12} md={6}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="First Name" value={createForm.firstName} onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))} fullWidth required />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Last Name" value={createForm.lastName} onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))} fullWidth required />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Email" type="text" value={createForm.email} fullWidth required InputProps={{ endAdornment: <span>@smcbi.edu.ph</span>, readOnly: true }} disabled />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Password" type="text" value={createForm.password} fullWidth required InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Student Type</InputLabel>
                        <Select
                          value={createForm.studentType}
                          label="Student Type"
                          onChange={e => setCreateForm(f => ({ ...f, studentType: e.target.value }))}
                          required
                        >
                          <MenuItem value="Freshman" disabled={Number(createForm.yearLevel) >= 2}>Freshman</MenuItem>
                          <MenuItem value="Regular">Regular</MenuItem>
                          <MenuItem value="Irregular">Irregular</MenuItem>
                          <MenuItem value="Transferee">Transferee</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Year Level</InputLabel>
                        <Select
                          value={createForm.yearLevel}
                          label="Year Level"
                          onChange={e => setCreateForm(f => ({ ...f, yearLevel: Number(e.target.value) }))}
                          required
                        >
                          <MenuItem value={1}>1st Year</MenuItem>
                          <MenuItem value={2}>2nd Year</MenuItem>
                          <MenuItem value={3}>3rd Year</MenuItem>
                          <MenuItem value={4}>4th Year</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="School Year" type="text" value={createForm.schoolYear} fullWidth required InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Semester</InputLabel>
                        <Select
                          value={createForm.semester}
                          label="Semester"
                          onChange={e => setCreateForm(f => ({ ...f, semester: e.target.value }))}
                          required
                        >
                          <MenuItem value="1st Semester">1st Semester</MenuItem>
                          <MenuItem value="2nd Semester">2nd Semester</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Student ID" type="text" value={createForm.studentId} fullWidth required InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Course</InputLabel>
                        <Select
                          value={createForm.department}
                          label="Course"
                          onChange={e => setCreateForm(f => ({ ...f, department: e.target.value }))}
                          required
                        >
                          <MenuItem value="BSIT">BSIT</MenuItem>
                          {/* Add more courses here if needed */}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>
                {/* Right side: Courses Offered */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Courses Offered</Typography>
                  {/* Search bar for filtering courses */}
                  <TextField
                    label="Search Courses"
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ mb: 2 }}
                    placeholder="Type course code or name..."
                  />
                  {/* Move Mixed year toggle for Regular students below the heading */}
                  {createForm.studentType === 'Regular' && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={allowMixedCourses}
                          onChange={e => setAllowMixedCourses(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Allow Mixed Year Courses"
                      sx={{ mb: 1 }}
                    />
                  )}
                  {/* Render categorized courses */}
                  {Object.entries(visibleCourses).map(([category, subcats]) => (
                    <Box key={category} mb={2}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>{category}</Typography>
                      {Object.entries(subcats as Record<string, unknown[]>).map(([subcat, courseList]) => (
                        <Box key={subcat} ml={2} mb={1}>
                          {subcat !== 'All' && (
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{subcat}</Typography>
                          )}
                          <FormGroup row>
                            {(courseList as unknown[]).map((course: unknown) => (
                              <FormControlLabel
                                key={course.id}
                                control={
                                  <Checkbox
                                    checked={selectedCourses.includes(course.id)}
                                    onChange={() => handleCourseCheckbox(course.id)}
                                  />
                                }
                                label={`${(course as { id: string; code: string; name: string; units: number; yearLevel: number; status: string }).code} - ${(course as { id: string; code: string; name: string; units: number; yearLevel: number; status: string }).name}`}
                              />
                            ))}
                          </FormGroup>
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsCreateDialogOpen(false)} disabled={creating}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={creating}>{creating ? 'Enrolling...' : 'Enroll'}</Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* Edit Student Modal */}
      <Dialog open={!!editForm} onClose={() => { setEditForm(null); }} maxWidth="md" fullWidth>
        <DialogTitle>Edit Student Info</DialogTitle>
        <DialogContent
          sx={{
            minWidth: { xs: 0, sm: 600, md: 800 },
            background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
            borderRadius: 4,
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
            border: '1px solid #e5e7eb',
            p: { xs: 2, sm: 4 },
          }}
        >
          {editForm && (
            <Grid container spacing={3} alignItems="flex-start">
              <Grid item xs={12} sm={6}>
                <TextField label="First Name" value={editForm.name.split(' ')[1] || ''} onChange={e => setEditForm((f: any) => ({ ...f, name: `${f.name.split(' ')[0]} ${e.target.value}` }))} fullWidth required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Last Name" value={editForm.name.split(' ')[0] || ''} onChange={e => setEditForm((f: any) => ({ ...f, name: `${e.target.value} ${f.name.split(' ')[1]}` }))} fullWidth required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Student Type</InputLabel>
                  <Select
                    value={editForm.studentType}
                    label="Student Type"
                    onChange={e => setEditForm((f: any) => ({ ...f, studentType: e.target.value }))}
                    required
                  >
                    <MenuItem value="Freshman">Freshman</MenuItem>
                    <MenuItem value="Regular">Regular</MenuItem>
                    <MenuItem value="Irregular">Irregular</MenuItem>
                    <MenuItem value="Transferee">Transferee</MenuItem>
                  </Select>
                </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Year Level</InputLabel>
                  <Select
                    value={editForm.yearLevel}
                    label="Year Level"
                    onChange={e => setEditForm((f: any) => ({ ...f, yearLevel: e.target.value }))}
                    required
                  >
                    <MenuItem value={1}>1st Year</MenuItem>
                    <MenuItem value={2}>2nd Year</MenuItem>
                    <MenuItem value={3}>3rd Year</MenuItem>
                    <MenuItem value={4}>4th Year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="School Year" value={editForm.schoolYear} onChange={e => setEditForm((f: any) => ({ ...f, schoolYear: e.target.value }))} fullWidth required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={editForm.semester}
                    label="Semester"
                    onChange={e => setEditForm((f: any) => ({ ...f, semester: e.target.value }))}
                    required
                  >
                    <MenuItem value="1st Semester">1st Semester</MenuItem>
                    <MenuItem value="2nd Semester">2nd Semester</MenuItem>
                  </Select>
                </FormControl>
                </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Student ID" value={editForm.id} fullWidth required disabled />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                <Select
                    value={editForm.department}
                    label="Department"
                    onChange={e => setEditForm((f: any) => ({ ...f, department: e.target.value }))}
                    required
                  >
                    <MenuItem value="BSIT">BSIT</MenuItem>
                    {/* Add more departments here if needed */}
                </Select>
              </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editForm.status}
                    label="Status"
                    onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}
                    required
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="enrolled">Enrolled</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="returned">Returned</MenuItem>
                    <MenuItem value="dropped">Dropped</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditForm(null); }} disabled={savingEdit}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary" disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save Changes'}</Button>
        </DialogActions>
      </Dialog>

      {/* Enroll Existing Student Modal */}
      <Dialog open={isExistingModalOpen} onClose={() => setIsExistingModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Enroll Existing Student</DialogTitle>
        <DialogContent sx={{ minWidth: { xs: 0, sm: 600, md: 800 }, p: { xs: 2, sm: 4 } }}>
          <Box mb={2} display="flex" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filter by Year Level</InputLabel>
              <Select
                value={existingFilterYear}
                label="Filter by Year Level"
                onChange={e => setExistingFilterYear(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="1">1st Year</MenuItem>
                <MenuItem value="2">2nd Year</MenuItem>
                <MenuItem value="3">3rd Year</MenuItem>
                <MenuItem value="4">4th Year</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {Object.keys(existingStudentsByYear).sort().filter(year => !existingFilterYear || year === existingFilterYear).map(year => (
            <Box key={year} mb={3}>
              <Typography variant="h6" sx={{ mb: 1 }}>{getYearLabel(year)}</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {existingStudentsByYear[year].map(student => (
                      <TableRow key={student.id}>
                        <TableCell>{student.id}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.studentType}</TableCell>
                        <TableCell>{student.status}</TableCell>
                        <TableCell>
                          <Button variant="contained" size="small" onClick={() => handleEnrollExisting(student)}>
                            Enroll
          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsExistingModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* End Semester Confirmation Dialog */}
      <Dialog open={endSemesterOpen} onClose={() => setEndSemesterOpen(false)}>
        <DialogTitle>End Semester</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to end the semester? This will set all students with status 'enrolled' to 'active'.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndSemesterOpen(false)} disabled={endSemesterLoading}>Cancel</Button>
          <Button onClick={handleEndSemester} color="error" variant="contained" disabled={endSemesterLoading}>
            {endSemesterLoading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProgramHeadEnrollment; 
