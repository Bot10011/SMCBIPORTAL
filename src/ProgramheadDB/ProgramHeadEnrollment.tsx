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
} from '@mui/material';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import axios from 'axios';

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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedDoneSubjects, setSelectedDoneSubjects] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [allowMixedCourses, setAllowMixedCourses] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [isExistingModalOpen, setIsExistingModalOpen] = useState(false);
  const [existingStudentsByYear, setExistingStudentsByYear] = useState<Record<string, Student[]>>({});
  const [selectedExistingStudent, setSelectedExistingStudent] = useState<Student | null>(null);
  const [existingFilterYear, setExistingFilterYear] = useState('');
  const [endSemesterOpen, setEndSemesterOpen] = useState(false);
  const [endSemesterLoading, setEndSemesterLoading] = useState(false);

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
      const students = (data || []).map((student: any) => ({
        id: student.student_id || student.id,
        name: `${student.first_name} ${student.last_name}`,
        studentType: student.student_type || 'Freshman',
        yearLevel: student.year_level || 1,
          currentSubjects: [],
          doneSubjects: [],
        status: student.enrollment_status || 'pending',
        department: student.department || '',
        schoolYear: student.school_year || '',
        semester: student.semester || '',
      }));
      setStudents(students);
    } catch (err) {
      setError('Failed to load enrollments');
      console.error('Error loading enrollments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (student: Student) => {
    setSelectedStudent(student);
    setSelectedSubjects(student.currentSubjects.map(subject => subject.id));
    setSelectedDoneSubjects(student.doneSubjects.map(subject => subject.id));
  };

  const handleApprove = async () => {
    try {
      // TODO: Implement API call
      toast.success('Enrollment approved successfully');
      loadEnrollments();
    } catch (err) {
      toast.error('Failed to approve enrollment');
      console.error('Error approving enrollment:', err);
    }
  };

  const handleReturn = async () => {
    try {
      // TODO: Implement API call
      toast('Enrollment returned for revision');
      loadEnrollments();
    } catch (err) {
      toast.error('Failed to return enrollment');
      console.error('Error returning enrollment:', err);
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
      // 1. Create auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: fullEmail,
        password: createForm.password,
        options: {
          data: {
            first_name: createForm.firstName,
            last_name: createForm.lastName,
            role: 'student',
          },
        },
      });
      if (signUpError) throw signUpError;
      const userId = signUpData.user?.id;
      if (!userId) throw new Error('User ID not returned from sign up');
      // 2. Create user profile
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: userId,
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;
      // Insert enrollments for selected courses
      if (selectedCourses.length > 0) {
        const enrollments = selectedCourses.map(courseId => ({
          student_id: userId,
          subject_id: courseId,
          status: 'active',
          enrollment_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const { error: enrollError } = await supabase.from('enrollcourse').insert(enrollments);
        if (enrollError) throw enrollError;
      }
      toast.success('Student account created and enrolled!');
      setIsCreateDialogOpen(false);
      setCreateForm({ firstName: '', lastName: '', email: '', password: 'TempPass@123', studentType: 'Freshman', yearLevel: 1, schoolYear: getDefaultSchoolYear(), studentId: '', department: 'BSIT', semester: '1st Semester' });
      setSelectedCourses([]);
      setSelectedExistingStudent(null);
      loadEnrollments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create student');
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
  const categorizeCourses = (courses: any[]) => {
    const categories: Record<string, Record<string, any[]>> = {};
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

  const categorizedCourses = categorizeCourses(courses);

  // Helper to filter courses by student type and year level
  const getVisibleCourses = () => {
    // If Irregular or Transferee, show all
    if (["Irregular", "Transferee"].includes(createForm.studentType)) {
      return categorizedCourses;
    }
    // For Regular, allow mixed if toggled
    if (createForm.studentType === "Regular" && allowMixedCourses) {
      return categorizedCourses;
    }
    // For Regular or Freshman, only show courses for the selected year level
    const yearMap: Record<string, string> = {
      '1': '1st Year',
      '2': '2nd Year',
      '3': '3rd Year',
      '4': '4th Year',
    };
    const yearLabel = yearMap[String(createForm.yearLevel) as keyof typeof yearMap] || '1st Year';
    const filtered: Record<string, Record<string, any[]>> = {};
    // Major: only show for the year
    if (categorizedCourses['Major'] && categorizedCourses['Major'][yearLabel]) {
      filtered['Major'] = { [yearLabel]: categorizedCourses['Major'][yearLabel] };
    }
    // Minor: always show all
    if (categorizedCourses['Minor']) {
      filtered['Minor'] = categorizedCourses['Minor'];
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
    if (!editStudent || !editForm) return;
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
      setEditStudent(null);
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

  const handleExistingSubmit = async () => {
    try {
      const response = await axios.post('/api/enrollments/update', {
        studentId: existingForm.studentId,
        schoolYear: existingForm.schoolYear,
        semester: existingForm.semester,
        subjects: existingForm.subjects,
        type: existingForm.type,
        yearLevel: existingForm.yearLevel,
        status: 'pending'
      });
      toast.success('Student enrolled successfully');
      setExistingDialogOpen(false);
      loadEnrollments();
    } catch (err) {
      toast.error('Failed to enroll student');
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
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="h5" gutterBottom>
        Enrollment Management
      </Typography>
        <Button variant="contained" color="primary" size="small" onClick={loadEnrollments}>
          Refresh List
        </Button>
      </Box>
      {/* Student List Filters */}
      <Box mb={2}>
        <Box display="flex" gap={2} justifyContent="center" mb={2}>
          <Button variant="outlined" color="error" size="small" onClick={() => setEndSemesterOpen(true)}>
            End Semester
          </Button>
          <Button variant="contained" color="primary" size="small" onClick={() => {
            setSelectedExistingStudent(null);
            flushNewStudentForm();
            setIsCreateDialogOpen(true);
          }}>
            Enroll New Student
          </Button>
          <Button variant="contained" color="success" size="small" onClick={handleOpenExistingModal}>
            Enroll Existing Student
          </Button>
        </Box>
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" justifyContent="center">
          <TextField
            label="Search by Name or Student ID"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
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
          <FormControl size="small" sx={{ minWidth: 140 }}>
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
      </Box>
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Year Level</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
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
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => { setEditStudent(student); setEditForm({ ...student }); }}
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
                  {/* Render categorized courses */}
                  {Object.entries(visibleCourses).map(([category, subcats]) => (
                    <Box key={category} mb={2}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>{category}</Typography>
                      {Object.entries(subcats).map(([subcat, courseList]) => (
                        <Box key={subcat} ml={2} mb={1}>
                          {subcat !== 'All' && (
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{subcat}</Typography>
                          )}
                          <FormGroup row>
                            {courseList.map((course: any) => (
                              <FormControlLabel
                                key={course.id}
                                control={
                                  <Checkbox
                                    checked={selectedCourses.includes(course.id)}
                                    onChange={() => handleCourseCheckbox(course.id)}
                                  />
                                }
                                label={`${course.code} - ${course.name}`}
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
                      {Object.entries(subcats).map(([subcat, courseList]) => (
                        <Box key={subcat} ml={2} mb={1}>
                          {subcat !== 'All' && (
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{subcat}</Typography>
                          )}
                          <FormGroup row>
                            {courseList.map((course: any) => (
                              <FormControlLabel
                                key={course.id}
                                control={
                                  <Checkbox
                                    checked={selectedCourses.includes(course.id)}
                                    onChange={() => handleCourseCheckbox(course.id)}
                                  />
                                }
                                label={`${course.code} - ${course.name}`}
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
      <Dialog open={!!editStudent} onClose={() => { setEditStudent(null); setEditForm(null); }} maxWidth="md" fullWidth>
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
          <Button onClick={() => { setEditStudent(null); setEditForm(null); }} disabled={savingEdit}>Cancel</Button>
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
