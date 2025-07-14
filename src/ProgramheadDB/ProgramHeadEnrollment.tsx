import React, { useState, useEffect, useMemo } from 'react';
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
  const [endSemesterConfirmation, setEndSemesterConfirmation] = useState('');
  const [endSemesterConfirmationError, setEndSemesterConfirmationError] = useState(false);
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
    courses.forEach((course: { id: string; code: string; name: string; units: number; yearLevel?: number; status?: string }) => {
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
        (c: { id: string; code: string; name: string; units: number; yearLevel?: number; status?: string }) =>
          c.code.toLowerCase().includes(search) || c.name.toLowerCase().includes(search)
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

  const visibleCourses = useMemo(() => getVisibleCourses(), [courses, createForm, courseSearch, allowMixedCourses]);

  // Filtered students
  const filteredStudents = useMemo(() => students.filter(student => {
    const matchesSearch =
      filterSearch === '' ||
      student.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      (student.id && student.id.toLowerCase().includes(filterSearch.toLowerCase()));
    const matchesYear = filterYear === '' || String(student.yearLevel) === filterYear;
    const matchesType = filterType === '' || student.studentType === filterType;
    const matchesStatus = filterStatus === '' || (student.status && student.status.toLowerCase() === filterStatus.toLowerCase());
    return matchesSearch && matchesYear && matchesType && matchesStatus;
  }), [students, filterSearch, filterYear, filterType, filterStatus]);

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
      setEndSemesterConfirmation('');
      setEndSemesterConfirmationError(false);
      loadEnrollments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to end semester');
    } finally {
      setEndSemesterLoading(false);
    }
  };

  // Helper to reset end semester modal state
  const handleOpenEndSemesterModal = () => {
    setEndSemesterOpen(true);
    setEndSemesterConfirmation('');
    setEndSemesterConfirmationError(false);
  };

  const handleCloseEndSemesterModal = () => {
    setEndSemesterOpen(false);
    setEndSemesterConfirmation('');
    setEndSemesterConfirmationError(false);
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
    <Box sx={{ 
      minHeight: '100vh',
      p: { xs: 2, sm: 4 },
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
      }
    }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, position: 'relative' }}>
        <Typography variant="h3" sx={{ 
          fontWeight: 800, 
          color: '#1f2937',
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Box sx={{ 
            width: 48, 
            height: 48, 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: 'white'
          }}>
            📚
          </Box>
          Enrollment Management
        </Typography>
        <Typography variant="body1" sx={{ color: '#6b7280', fontSize: '1.1rem' }}>
          Manage student enrollments, course assignments, and academic status
        </Typography>
      </Box>

      {/* Action Cards Section */}
      <Box sx={{ mb: 2, width: '100%' }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600, 
          color: '#374151',
          mb: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: '1rem'
        }}>
          <Box sx={{ 
            width: 18, 
            height: 18, 
            borderRadius: '50%', 
            background: '#667eea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            color: 'white'
          }}>
            ⚡
          </Box>
          Quick Actions
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: 1,
          mb: 1,
          width: '100%',
          maxWidth: 600,
          mx: 'auto',
        }}>
          {/* Enroll New Student */}
          <Card sx={{ 
            borderRadius: 2,
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            background: '#fff',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s',
            minHeight: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0,
          }}>
            <CardContent sx={{ p: 0.5, textAlign: 'center', width: '100%', pb: '8px!important' }}>
              <Button 
                variant="contained" 
                color="primary" 
                size="small"
                onClick={() => { setSelectedExistingStudent(null); flushNewStudentForm(); setIsCreateDialogOpen(true); }}
                sx={{
                  borderRadius: 1.5,
                  px: 0.8,
                  py: 0.4,
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  background: '#667eea',
                  minHeight: 28,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.2
                }}
              >
                <Box sx={{ fontSize: '0.9rem', mb: 0.1 }}>➕</Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'white', fontSize: '0.8rem' }}>
                  Enroll New
                </Typography>
              </Button>
            </CardContent>
          </Card>
          {/* Enroll Existing Student */}
          <Card sx={{ 
            borderRadius: 2,
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            background: '#fff',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s',
            minHeight: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0,
          }}>
            <CardContent sx={{ p: 0.5, textAlign: 'center', width: '100%', pb: '8px!important' }}>
              <Button 
                variant="contained" 
                color="success" 
                size="small"
                onClick={handleOpenExistingModal}
                sx={{
                  borderRadius: 1.5,
                  px: 0.8,
                  py: 0.4,
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  background: '#10b981',
                  minHeight: 28,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.2
                }}
              >
                <Box sx={{ fontSize: '0.9rem', mb: 0.1 }}>👥</Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'white', fontSize: '0.8rem' }}>
                  Enroll Existing
                </Typography>
              </Button>
            </CardContent>
          </Card>
          {/* Refresh List */}
          <Card sx={{ 
            borderRadius: 2,
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            background: '#fff',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s',
            minHeight: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0,
          }}>
            <CardContent sx={{ p: 0.5, textAlign: 'center', width: '100%', pb: '8px!important' }}>
              <Button 
                variant="outlined" 
                color="primary" 
                size="small"
                onClick={loadEnrollments}
                sx={{
                  borderRadius: 1.5,
                  px: 0.8,
                  py: 0.4,
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  borderColor: '#667eea',
                  color: '#667eea',
                  minHeight: 28,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.2
                }}
              >
                <Box sx={{ fontSize: '0.9rem', mb: 0.1 }}>🔄</Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                  Refresh
                </Typography>
              </Button>
            </CardContent>
          </Card>
          {/* End Semester */}
          <Card sx={{ 
            borderRadius: 2,
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            background: '#fff',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s',
            minHeight: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0,
          }}>
            <CardContent sx={{ p: 0.5, textAlign: 'center', width: '100%', pb: '8px!important' }}>
              <Button 
                variant="outlined" 
                color="error" 
                size="small"
                onClick={handleOpenEndSemesterModal}
                sx={{
                  borderRadius: 1.5,
                  px: 0.8,
                  py: 0.4,
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  minHeight: 28,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.2
                }}
              >
                <Box sx={{ fontSize: '0.9rem', mb: 0.1 }}>⚠️</Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                  End Semester
                </Typography>
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Filters Section */}
      <Card sx={{ 
        mb: 4, 
        borderRadius: 3, 
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid #e5e7eb'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            color: '#374151',
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <Box sx={{ 
              width: 24, 
              height: 24, 
              borderRadius: '50%', 
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              color: 'white'
            }}>
              🔍
            </Box>
            Search & Filter
          </Typography>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2
          }}>
            <TextField
              label="Search by Name or Student ID"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              size="small"
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: '#d1d5db'
                  },
                  '&:hover fieldset': {
                    borderColor: '#9ca3af'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea'
                  }
                }
              }}
              InputProps={{ 
                startAdornment: (
                  <Box sx={{ mr: 1, color: '#6b7280' }}>
                    🔍
                  </Box>
                )
              }}
            />
            
            <FormControl size="small">
              <InputLabel>Year Level</InputLabel>
              <Select
                value={filterYear}
                label="Year Level"
                onChange={e => setFilterYear(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: '#d1d5db'
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  }
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="1">1st Year</MenuItem>
                <MenuItem value="2">2nd Year</MenuItem>
                <MenuItem value="3">3rd Year</MenuItem>
                <MenuItem value="4">4th Year</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small">
              <InputLabel>Student Type</InputLabel>
              <Select
                value={filterType}
                label="Student Type"
                onChange={e => setFilterType(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: '#d1d5db'
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  }
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Freshman">Freshman</MenuItem>
                <MenuItem value="Regular">Regular</MenuItem>
                <MenuItem value="Irregular">Irregular</MenuItem>
                <MenuItem value="Transferee">Transferee</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={e => setFilterStatus(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': {
                      borderColor: '#d1d5db'
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  }
                }}
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
        </CardContent>
      </Card>
      {/* Student List Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ 
          fontWeight: 600, 
          color: '#374151',
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Box sx={{ 
            width: 24, 
            height: 24, 
            borderRadius: '50%', 
            background: '#667eea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            color: 'white'
          }}>
            👥
          </Box>
          Student List
          <Box sx={{ 
            ml: 2, 
            px: 2, 
            py: 0.5, 
            borderRadius: 2, 
            background: '#f3f4f6',
            fontSize: '0.875rem',
            color: '#6b7280',
            fontWeight: 500
          }}>
            {filteredStudents.length} students
          </Box>
        </Typography>
        
        <Card sx={{ 
          borderRadius: 3, 
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)' }}>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    fontSize: '0.875rem',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    Student ID
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    fontSize: '0.875rem',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    Name
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    fontSize: '0.875rem',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    Type
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    fontSize: '0.875rem',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    Year Level
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    fontSize: '0.875rem',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    Department
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    fontSize: '0.875rem',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ 
                    position: 'sticky', 
                    right: 0, 
                    background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                    zIndex: 1,
                    fontWeight: 600, 
                    color: '#374151',
                    fontSize: '0.875rem',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.map((student, idx) => (
                  <TableRow 
                    key={student.id} 
                    sx={{ 
                      background: idx % 2 === 0 ? '#f9fafb' : '#ffffff',
                      '&:hover': {
                        background: '#f0f9ff',
                        transform: 'scale(1.01)',
                        transition: 'all 0.2s ease'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <TableCell sx={{ 
                      fontWeight: 500, 
                      fontFamily: 'monospace',
                      fontSize: '0.875rem'
                    }}>
                      {student.id}
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 500,
                      fontSize: '0.875rem'
                    }}>
                      {student.name}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ 
                        display: 'inline-block',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: '#e0e7ef',
                        color: '#111827',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {student.studentType}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 500,
                      fontSize: '0.875rem'
                    }}>
                      {student.yearLevel}
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 500,
                      fontSize: '0.875rem'
                    }}>
                      {student.department}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ 
                        display: 'inline-block',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        background: '#f3f4f6',
                        color: '#111827',
                        textTransform: 'capitalize'
                      }}>
                        {student.status}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      position: 'sticky', 
                      right: 0, 
                      background: idx % 2 === 0 ? '#f9fafb' : '#ffffff',
                      zIndex: 1
                    }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => { setEditForm(student); }}
                        title="Review and Edit Student"
                        sx={{
                          borderRadius: 2,
                          px: 2,
                          py: 0.5,
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ fontSize: '0.8rem' }}>✏️</Box>
                          Review
                        </Box>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      <Dialog
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setSelectedExistingStudent(null);
          flushNewStudentForm();
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden'
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
            gap: 2,
            '& .MuiTypography-root': {
              fontSize: '1.5rem',
              fontWeight: 600
            }
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}
          >
            {selectedExistingStudent ? '👤' : '➕'}
          </Box>
          {selectedExistingStudent ? 'Enroll Existing Student' : 'Enroll New Student'}
        </DialogTitle>
        {selectedExistingStudent ? (
          <form onSubmit={handleCreateStudent}>
            <DialogContent
              sx={{
                minWidth: { xs: 0, sm: 700, md: 950 },
                background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
                borderRadius: 0,
                p: { xs: 2, sm: 4 },
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                }
              }}
            >
              <Grid container spacing={3} alignItems="flex-start">
                {/* Left side: Existing student info (read-only) */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      color: '#374151',
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        background: '#667eea',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        color: 'white'
                      }}>
                        👤
                      </Box>
                      Student Information
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="First Name" 
                        value={createForm.firstName} 
                        fullWidth 
                        required 
                        InputProps={{ readOnly: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#f9fafb',
                            '& fieldset': {
                              borderColor: '#d1d5db'
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="Last Name" 
                        value={createForm.lastName} 
                        fullWidth 
                        required 
                        InputProps={{ readOnly: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#f9fafb',
                            '& fieldset': {
                              borderColor: '#d1d5db'
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField 
                        label="Email" 
                        type="text" 
                        value={createForm.email} 
                        fullWidth 
                        required 
                        InputProps={{ 
                          endAdornment: <span style={{ color: '#6b7280' }}>@smcbi.edu.ph</span>, 
                          readOnly: true 
                        }} 
                        disabled
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#f3f4f6',
                            '& fieldset': {
                              borderColor: '#d1d5db'
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Student Type</InputLabel>
                        <Select 
                          value={createForm.studentType} 
                          label="Student Type" 
                          onChange={e => setCreateForm(f => ({ ...f, studentType: e.target.value }))} 
                          required 
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d1d5db'
                              }
                            }
                          }}
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
                          value={createForm.yearLevel} 
                          label="Year Level" 
                          onChange={e => setCreateForm(f => ({ ...f, yearLevel: Number(e.target.value) }))} 
                          required 
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d1d5db'
                              }
                            }
                          }}
                        >
                          <MenuItem value={1}>1st Year</MenuItem>
                          <MenuItem value={2}>2nd Year</MenuItem>
                          <MenuItem value={3}>3rd Year</MenuItem>
                          <MenuItem value={4}>4th Year</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="School Year" 
                        type="text" 
                        value={createForm.schoolYear} 
                        fullWidth 
                        required 
                        InputProps={{ readOnly: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#f9fafb',
                            '& fieldset': {
                              borderColor: '#d1d5db'
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Semester</InputLabel>
                        <Select 
                          value={createForm.semester} 
                          label="Semester" 
                          onChange={e => setCreateForm(f => ({ ...f, semester: e.target.value }))} 
                          required 
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d1d5db'
                              }
                            }
                          }}
                        >
                          <MenuItem value="1st Semester">1st Semester</MenuItem>
                          <MenuItem value="2nd Semester">2nd Semester</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="Student ID" 
                        type="text" 
                        value={createForm.studentId} 
                        fullWidth 
                        required 
                        InputProps={{ readOnly: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#f9fafb',
                            '& fieldset': {
                              borderColor: '#d1d5db'
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Course</InputLabel>
                        <Select 
                          value={createForm.department} 
                          label="Course" 
                          disabled 
                          fullWidth
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#f3f4f6',
                              '& fieldset': {
                                borderColor: '#d1d5db'
                              }
                            }
                          }}
                        >
                          <MenuItem value="BSIT">BSIT</MenuItem>
                          {/* Add more courses here if needed */}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Grid>
                {/* Right side: Courses Offered (checkboxes) */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      color: '#374151',
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        background: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        color: 'white'
                      }}>
                        📚
                      </Box>
                      Course Selection
                    </Typography>
                  </Box>
                  
                  {/* Search bar for filtering courses */}
                  <TextField
                    label="Search Courses"
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ 
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: '#d1d5db'
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#667eea'
                        }
                      }
                    }}
                    placeholder="Type course code or name..."
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ mr: 1, color: '#6b7280' }}>
                          🔍
                        </Box>
                      )
                    }}
                  />
                  
                  {/* Course selection summary */}
                  <Box sx={{ 
                    mb: 2, 
                    p: 2, 
                    borderRadius: 2, 
                    background: selectedCourses.length > 0 ? '#f0f9ff' : '#f9fafb',
                    border: `1px solid ${selectedCourses.length > 0 ? '#0ea5e9' : '#e5e7eb'}`
                  }}>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 500, 
                      color: selectedCourses.length > 0 ? '#0369a1' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Box sx={{ 
                        width: 16, 
                        height: 16, 
                        borderRadius: '50%', 
                        background: selectedCourses.length > 0 ? '#0ea5e9' : '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6rem',
                        color: 'white'
                      }}>
                        {selectedCourses.length > 0 ? '✓' : '0'}
                      </Box>
                      {selectedCourses.length > 0 
                        ? `${selectedCourses.length} course${selectedCourses.length > 1 ? 's' : ''} selected`
                        : 'No courses selected'
                      }
                    </Typography>
                  </Box>
                  
                  {/* Render categorized courses */}
                  <Box sx={{ 
                    maxHeight: 400, 
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    p: 2,
                    background: '#ffffff'
                  }}>
                    {Object.entries(visibleCourses).map(([category, subcats]) => (
                      <Box key={category} mb={3}>
                        <Typography variant="subtitle1" sx={{ 
                          fontWeight: 600, 
                          color: '#374151',
                          mb: 2,
                          pb: 1,
                          borderBottom: '2px solid #f3f4f6'
                        }}>
                          {category}
                        </Typography>
                        {Object.entries(subcats as Record<string, unknown[]>).map(([subcat, courseList]) => (
                          <Box key={subcat} mb={2}>
                            {subcat !== 'All' && (
                              <Typography variant="body2" sx={{ 
                                fontWeight: 500, 
                                mb: 1,
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                                letterSpacing: '0.05em'
                              }}>
                                {subcat}
                              </Typography>
                            )}
                            <FormGroup>
                              {(courseList as { id: string; code: string; name: string; units: number; yearLevel?: number; status?: string }[]).map((course) => (
                                <FormControlLabel
                                  key={course.id}
                                  control={
                                    <Checkbox
                                      checked={selectedCourses.includes(course.id)}
                                      onChange={() => handleCourseCheckbox(course.id)}
                                      sx={{
                                        color: '#d1d5db',
                                        '&.Mui-checked': {
                                          color: '#667eea'
                                        }
                                      }}
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {course.code}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                        {course.name}
                                      </Typography>
                                    </Box>
                                  }
                                  sx={{
                                    margin: 0,
                                    padding: '8px 12px',
                                    borderRadius: 1,
                                    '&:hover': {
                                      background: '#f9fafb'
                                    },
                                    '&.Mui-checked': {
                                      background: '#f0f9ff'
                                    }
                                  }}
                                />
                              ))}
                            </FormGroup>
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ 
              p: 3, 
              background: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
              gap: 2
            }}>
              <Button 
                onClick={() => setIsCreateDialogOpen(false)} 
                disabled={creating}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                  borderColor: '#d1d5db',
                  color: '#374151',
                  '&:hover': {
                    borderColor: '#9ca3af',
                    background: '#f3f4f6'
                  }
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={creating}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                  },
                  '&:disabled': {
                    background: '#d1d5db',
                    transform: 'none',
                    boxShadow: 'none'
                  }
                }}
              >
                {creating ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} sx={{ color: 'white' }} />
                    Enrolling...
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ fontSize: '1rem' }}>✓</Box>
                    Enroll Student
                  </Box>
                )}
              </Button>
            </DialogActions>
          </form>
        ) : (
          <form onSubmit={handleCreateStudent}>
            <DialogContent
              sx={{
                minWidth: { xs: 0, sm: 700, md: 950 },
                background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
                borderRadius: 0,
                p: { xs: 2, sm: 4 },
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                }
              }}
            >
              <Grid container spacing={3} alignItems="flex-start">
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      color: '#374151',
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        background: '#667eea',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        color: 'white'
                      }}>
                        👤
                      </Box>
                      Student Information
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="First Name" 
                        value={createForm.firstName} 
                        onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))} 
                        fullWidth 
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: '#d1d5db'
                            },
                            '&:hover fieldset': {
                              borderColor: '#9ca3af'
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#667eea'
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="Last Name" 
                        value={createForm.lastName} 
                        onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))} 
                        fullWidth 
                        required
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: '#d1d5db'
                            },
                            '&:hover fieldset': {
                              borderColor: '#9ca3af'
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#667eea'
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField 
                        label="Email" 
                        type="text" 
                        value={createForm.email} 
                        fullWidth 
                        required 
                        InputProps={{ 
                          endAdornment: <span style={{ color: '#6b7280' }}>@smcbi.edu.ph</span>, 
                          readOnly: true 
                        }} 
                        disabled
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#f3f4f6',
                            '& fieldset': {
                              borderColor: '#d1d5db'
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="Password" 
                        type="text" 
                        value={createForm.password} 
                        fullWidth 
                        required 
                        InputProps={{ readOnly: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#f9fafb',
                            '& fieldset': {
                              borderColor: '#d1d5db'
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Student Type</InputLabel>
                        <Select
                          value={createForm.studentType}
                          label="Student Type"
                          onChange={e => setCreateForm(f => ({ ...f, studentType: e.target.value }))}
                          required
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d1d5db'
                              },
                              '&:hover fieldset': {
                                borderColor: '#9ca3af'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#667eea'
                              }
                            }
                          }}
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
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d1d5db'
                              },
                              '&:hover fieldset': {
                                borderColor: '#9ca3af'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#667eea'
                              }
                            }
                          }}
                        >
                          <MenuItem value={1}>1st Year</MenuItem>
                          <MenuItem value={2}>2nd Year</MenuItem>
                          <MenuItem value={3}>3rd Year</MenuItem>
                          <MenuItem value={4}>4th Year</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="School Year" 
                        type="text" 
                        value={createForm.schoolYear} 
                        fullWidth 
                        required 
                        InputProps={{ readOnly: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#f9fafb',
                            '& fieldset': {
                              borderColor: '#d1d5db'
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Semester</InputLabel>
                        <Select
                          value={createForm.semester}
                          label="Semester"
                          onChange={e => setCreateForm(f => ({ ...f, semester: e.target.value }))}
                          required
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d1d5db'
                              },
                              '&:hover fieldset': {
                                borderColor: '#9ca3af'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#667eea'
                              }
                            }
                          }}
                        >
                          <MenuItem value="1st Semester">1st Semester</MenuItem>
                          <MenuItem value="2nd Semester">2nd Semester</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        label="Student ID" 
                        type="text" 
                        value={createForm.studentId} 
                        fullWidth 
                        required 
                        InputProps={{ readOnly: true }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#f9fafb',
                            '& fieldset': {
                              borderColor: '#d1d5db'
                            }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Course</InputLabel>
                        <Select
                          value={createForm.department}
                          label="Course"
                          onChange={e => setCreateForm(f => ({ ...f, department: e.target.value }))}
                          required
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d1d5db'
                              },
                              '&:hover fieldset': {
                                borderColor: '#9ca3af'
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#667eea'
                              }
                            }
                          }}
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
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      color: '#374151',
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Box sx={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: '50%', 
                        background: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        color: 'white'
                      }}>
                        📚
                      </Box>
                      Course Selection
                    </Typography>
                  </Box>
                  
                  {/* Search bar for filtering courses */}
                  <TextField
                    label="Search Courses"
                    value={courseSearch}
                    onChange={e => setCourseSearch(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ 
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: '#d1d5db'
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#667eea'
                        }
                      }
                    }}
                    placeholder="Type course code or name..."
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ mr: 1, color: '#6b7280' }}>
                          🔍
                        </Box>
                      )
                    }}
                  />
                  
                  {/* Move Mixed year toggle for Regular students */}
                  {createForm.studentType === 'Regular' && (
                    <Box sx={{ mb: 2, p: 2, borderRadius: 2, background: '#f0f9ff', border: '1px solid #0ea5e9' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={allowMixedCourses}
                            onChange={e => setAllowMixedCourses(e.target.checked)}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#0ea5e9',
                                '& + .MuiSwitch-track': {
                                  backgroundColor: '#0ea5e9'
                                }
                              }
                            }}
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#0369a1' }}>
                            Allow Mixed Year Courses
                          </Typography>
                        }
                      />
                    </Box>
                  )}
                  
                  {/* Course selection summary */}
                  <Box sx={{ 
                    mb: 2, 
                    p: 2, 
                    borderRadius: 2, 
                    background: selectedCourses.length > 0 ? '#f0f9ff' : '#f9fafb',
                    border: `1px solid ${selectedCourses.length > 0 ? '#0ea5e9' : '#e5e7eb'}`
                  }}>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 500, 
                      color: selectedCourses.length > 0 ? '#0369a1' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Box sx={{ 
                        width: 16, 
                        height: 16, 
                        borderRadius: '50%', 
                        background: selectedCourses.length > 0 ? '#0ea5e9' : '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6rem',
                        color: 'white'
                      }}>
                        {selectedCourses.length > 0 ? '✓' : '0'}
                      </Box>
                      {selectedCourses.length > 0 
                        ? `${selectedCourses.length} course${selectedCourses.length > 1 ? 's' : ''} selected`
                        : 'No courses selected'
                      }
                    </Typography>
                  </Box>
                  
                  {/* Render categorized courses */}
                  <Box sx={{ 
                    maxHeight: 400, 
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    p: 2,
                    background: '#ffffff'
                  }}>
                    {Object.entries(visibleCourses).map(([category, subcats]) => (
                      <Box key={category} mb={3}>
                        <Typography variant="subtitle1" sx={{ 
                          fontWeight: 600, 
                          color: '#374151',
                          mb: 2,
                          pb: 1,
                          borderBottom: '2px solid #f3f4f6'
                        }}>
                          {category}
                        </Typography>
                        {Object.entries(subcats as Record<string, unknown[]>).map(([subcat, courseList]) => (
                          <Box key={subcat} mb={2}>
                            {subcat !== 'All' && (
                              <Typography variant="body2" sx={{ 
                                fontWeight: 500, 
                                mb: 1,
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                                letterSpacing: '0.05em'
                              }}>
                                {subcat}
                              </Typography>
                            )}
                            <FormGroup>
                              {(courseList as { id: string; code: string; name: string; units: number; yearLevel?: number; status?: string }[]).map((course) => (
                                <FormControlLabel
                                  key={course.id}
                                  control={
                                    <Checkbox
                                      checked={selectedCourses.includes(course.id)}
                                      onChange={() => handleCourseCheckbox(course.id)}
                                      sx={{
                                        color: '#d1d5db',
                                        '&.Mui-checked': {
                                          color: '#667eea'
                                        }
                                      }}
                                    />
                                  }
                                  label={
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {course.code}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                        {course.name}
                                      </Typography>
                                    </Box>
                                  }
                                  sx={{
                                    margin: 0,
                                    padding: '8px 12px',
                                    borderRadius: 1,
                                    '&:hover': {
                                      background: '#f9fafb'
                                    },
                                    '&.Mui-checked': {
                                      background: '#f0f9ff'
                                    }
                                  }}
                                />
                              ))}
                            </FormGroup>
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Box>
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
      <Dialog open={!!editForm} onClose={() => { setEditForm(null); }} maxWidth="md" fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden'
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
            gap: 2,
            '& .MuiTypography-root': {
              fontSize: '1.5rem',
              fontWeight: 600
            }
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}
          >
            ✏️
          </Box>
          Edit Student Info
        </DialogTitle>
        <DialogContent
          sx={{
            minWidth: { xs: 0, sm: 600, md: 800 },
            background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
            borderRadius: 0,
            p: { xs: 2, sm: 4 },
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
            }
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
      <Dialog open={isExistingModalOpen} onClose={() => setIsExistingModalOpen(false)} maxWidth="md" fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden'
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
            gap: 2,
            '& .MuiTypography-root': {
              fontSize: '1.5rem',
              fontWeight: 600
            }
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}
          >
            👥
          </Box>
          Enroll Existing Student
        </DialogTitle>
        <DialogContent 
          sx={{ 
            minWidth: { xs: 0, sm: 600, md: 800 }, 
            p: { xs: 2, sm: 4 },
            background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
            }
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: '#374151',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Box sx={{ 
                width: 24, 
                height: 24, 
                borderRadius: '50%', 
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                color: 'white'
              }}>
                🔍
              </Box>
              Student Filter
            </Typography>
          </Box>
          <Box mb={3} display="flex" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filter by Year Level</InputLabel>
              <Select
                value={existingFilterYear}
                label="Filter by Year Level"
                onChange={e => setExistingFilterYear(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#d1d5db'
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea'
                    }
                  }
                }}
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
            <Box key={year} mb={4}>
              <Typography variant="h6" sx={{ 
                mb: 2, 
                fontWeight: 600,
                color: '#374151',
                pb: 1,
                borderBottom: '2px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Box sx={{ 
                  width: 20, 
                  height: 20, 
                  borderRadius: '50%', 
                  background: '#667eea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  color: 'white'
                }}>
                  {year}
                </Box>
                {getYearLabel(year)}
              </Typography>
              <TableContainer sx={{ 
                borderRadius: 2,
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ background: '#f9fafb' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Student ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {existingStudentsByYear[year].map(student => (
                      <TableRow key={student.id} sx={{ 
                        '&:hover': { 
                          background: '#f9fafb',
                          transform: 'scale(1.01)',
                          transition: 'all 0.2s ease'
                        },
                        transition: 'all 0.2s ease'
                      }}>
                        <TableCell sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{student.id}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{student.name}</TableCell>
                        <TableCell>
                          <Box sx={{ 
                            display: 'inline-block',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            background: '#e0e7ef',
                            color: '#111827',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {student.studentType}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ 
                            display: 'inline-block',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            background: '#f3f4f6',
                            color: '#111827',
                            textTransform: 'capitalize'
                          }}>
                            {student.status}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="contained" 
                            size="small" 
                            onClick={() => handleEnrollExisting(student)}
                            sx={{
                              borderRadius: 2,
                              px: 2,
                              py: 0.5,
                              fontWeight: 600,
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Box sx={{ fontSize: '0.8rem' }}>➕</Box>
                              Enroll
                            </Box>
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
        <DialogActions sx={{ 
          p: 3, 
          background: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          gap: 2
        }}>
          <Button 
            onClick={() => setIsExistingModalOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600,
              borderColor: '#d1d5db',
              color: '#374151',
              '&:hover': {
                borderColor: '#9ca3af',
                background: '#f3f4f6'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ fontSize: '1rem' }}>✕</Box>
              Close
            </Box>
          </Button>
        </DialogActions>
      </Dialog>

      {/* End Semester Confirmation Dialog */}
      <Dialog open={endSemesterOpen} onClose={handleCloseEndSemesterModal}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle 
          sx={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            py: 3,
            px: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            '& .MuiTypography-root': {
              fontSize: '1.5rem',
              fontWeight: 600
            }
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}
          >
            ⚠️
          </Box>
          End Semester
        </DialogTitle>
        <DialogContent
          sx={{
            p: 4,
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: '50%', 
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              ⚠️
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#991b1b' }}>
              Important Action Required
            </Typography>
          </Box>
          
          <Typography sx={{ 
            color: '#7f1d1d',
            fontSize: '1rem',
            lineHeight: 1.6,
            mb: 3
          }}>
            Are you sure you want to end the semester? This action will:
          </Typography>
          
          <Box sx={{ 
            mb: 3,
            p: 3,
            borderRadius: 2,
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <Typography sx={{ 
              color: '#7f1d1d',
              fontSize: '0.95rem',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontWeight: 500
            }}>
              <Box sx={{ 
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                color: 'white'
              }}>
                1
              </Box>
              Set all students with status 'enrolled' to 'active'
            </Typography>
            <Typography sx={{ 
              color: '#7f1d1d',
              fontSize: '0.95rem',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontWeight: 500
            }}>
              <Box sx={{ 
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                color: 'white'
              }}>
                2
              </Box>
              This action cannot be undone
            </Typography>
            <Typography sx={{ 
              color: '#7f1d1d',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontWeight: 500
            }}>
              <Box sx={{ 
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                color: 'white'
              }}>
                3
              </Box>
              Please ensure all enrollments are complete
            </Typography>
          </Box>
          
          <Box sx={{ 
            p: 2, 
            borderRadius: 2, 
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 3
          }}>
            <Box sx={{ fontSize: '1.2rem' }}>💡</Box>
            <Typography sx={{ 
              color: '#92400e',
              fontSize: '0.875rem',
              fontWeight: 500
            }}>
              Tip: Review all student enrollments before proceeding
            </Typography>
          </Box>
          
          {/* Typing Confirmation Section */}
          <Box sx={{ 
            p: 3, 
            borderRadius: 2, 
            background: '#f8fafc',
            border: '1px solid #e5e7eb',
            mb: 3
          }}>
            <Typography sx={{ 
              color: '#374151',
              fontSize: '0.95rem',
              fontWeight: 600,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Box sx={{ 
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                color: 'white'
              }}>
                🔒
              </Box>
              Safety Confirmation Required
            </Typography>
            
            <Typography sx={{ 
              color: '#6b7280',
              fontSize: '0.875rem',
              mb: 2
            }}>
              To prevent accidental actions, please type <strong>"END SEMESTER"</strong> to confirm:
            </Typography>
            
            <TextField
              fullWidth
              size="small"
              placeholder="Type 'END SEMESTER' to confirm"
              value={endSemesterConfirmation}
              onChange={(e) => {
                setEndSemesterConfirmation(e.target.value);
                setEndSemesterConfirmationError(false);
              }}
              error={endSemesterConfirmationError}
              helperText={endSemesterConfirmationError ? "Please type exactly 'END SEMESTER' to continue" : ""}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: endSemesterConfirmationError ? '#ef4444' : '#d1d5db'
                  },
                  '&:hover fieldset': {
                    borderColor: endSemesterConfirmationError ? '#ef4444' : '#9ca3af'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: endSemesterConfirmationError ? '#ef4444' : '#667eea'
                  }
                }
              }}
            />
            
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              borderRadius: 1, 
              background: endSemesterConfirmation === 'END SEMESTER' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${endSemesterConfirmation === 'END SEMESTER' ? '#bbf7d0' : '#fecaca'}`
            }}>
              <Typography sx={{ 
                color: endSemesterConfirmation === 'END SEMESTER' ? '#166534' : '#991b1b',
                fontSize: '0.875rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Box sx={{ fontSize: '1rem' }}>
                  {endSemesterConfirmation === 'END SEMESTER' ? '✅' : '⏳'}
                </Box>
                {endSemesterConfirmation === 'END SEMESTER' 
                  ? 'Confirmation complete - Proceed with caution'
                  : 'Waiting for confirmation...'
                }
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          background: '#fef2f2',
          borderTop: '1px solid #fecaca',
          gap: 2
        }}>
          <Button 
            onClick={handleCloseEndSemesterModal} 
            disabled={endSemesterLoading}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600,
              borderColor: '#fca5a5',
              color: '#991b1b',
              '&:hover': {
                borderColor: '#f87171',
                background: '#fef2f2'
              },
              '&:disabled': {
                borderColor: '#d1d5db',
                color: '#9ca3af'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ fontSize: '1rem' }}>✕</Box>
              Cancel
            </Box>
          </Button>
          <Button 
            onClick={() => {
              if (endSemesterConfirmation !== 'END SEMESTER') {
                setEndSemesterConfirmationError(true);
                return;
              }
              handleEndSemester();
            }}
            variant="contained" 
            disabled={endSemesterLoading || endSemesterConfirmation !== 'END SEMESTER'}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontWeight: 600,
              background: endSemesterConfirmation === 'END SEMESTER' 
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : '#d1d5db',
              '&:hover': {
                background: endSemesterConfirmation === 'END SEMESTER'
                  ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                  : '#d1d5db',
                transform: endSemesterConfirmation === 'END SEMESTER' ? 'translateY(-1px)' : 'none',
                boxShadow: endSemesterConfirmation === 'END SEMESTER' 
                  ? '0 4px 12px rgba(239, 68, 68, 0.4)'
                  : 'none'
              },
              '&:disabled': {
                background: '#d1d5db',
                transform: 'none',
                boxShadow: 'none'
              }
            }}
          >
            {endSemesterLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} sx={{ color: 'white' }} />
                Processing...
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ fontSize: '1rem' }}>
                  {endSemesterConfirmation === 'END SEMESTER' ? '⚠️' : '🔒'}
                </Box>
                {endSemesterConfirmation === 'END SEMESTER' 
                  ? 'Confirm End Semester'
                  : 'Type Confirmation First'
                }
              </Box>
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProgramHeadEnrollment; 
