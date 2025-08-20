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
  Grid,
  Table,
  TableBody,
  TableCell, 
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
  Avatar,
} from '@mui/material';
import { Search, School, Person, Event, MenuBook } from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  student_type: string;
  year_level: number;
  department: string;
  enrollment_status: string;
  created_at: string;
}

const RegistrarProspectus: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  
  // Prospectus modal states
  const [isProspectusModalOpen, setIsProspectusModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([]);
  const [studentConfirmations, setStudentConfirmations] = useState<any[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [prospectusContentRef] = useState<React.RefObject<HTMLDivElement>>(React.createRef());
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    loadStudents();
    loadCourses();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading students:', error);
        toast.error('Failed to load students');
        return;
      }

      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      console.log('Loading courses...');
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        console.error('Error loading courses:', error);
        return;
      }

      console.log('Courses loaded:', data);
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleOpenProspectusModal = async (student: Student) => {
    console.log('Opening prospectus for student:', student);
    console.log('Current courses:', courses);
    
    setSelectedStudent(student);
    setIsProspectusModalOpen(true);
    
    // Fetch student data for prospectus
    await Promise.all([
      fetchStudentGrades(student.student_id),
      fetchStudentEnrollments(student.student_id),
      fetchStudentConfirmations(student.student_id)
    ]);
  };

  const handleCloseProspectusModal = () => {
    setIsProspectusModalOpen(false);
    setSelectedStudent(null);
    setStudentGrades([]);
    setStudentEnrollments([]);
    setStudentConfirmations([]);
  };

  const fetchStudentGrades = async (formattedStudentId: string) => {
    try {
      setLoadingGrades(true);
      
      // First get the UUID from user_profiles using the formatted student_id
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('student_id', formattedStudentId)
        .single();
      
      if (profileError) {
        console.error('Error finding user profile:', profileError);
        return;
      }
      
      // Now fetch grades using the UUID
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select(`
          *,
          course:courses (code, name)
        `)
        .eq('student_id', profileData.id);

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
        return;
      }

      const grades = (gradesData || []).map(grade => ({
        id: grade.id,
        student_id: grade.student_id,
        subject_code: grade.course?.code || '',
        subject_name: grade.course?.name || '',
        prelim_grade: grade.prelim_grade,
        midterm_grade: grade.midterm_grade,
        final_grade: grade.final_grade,
        remarks: grade.remarks,
        year_level: grade.year_level,
        semester: grade.semester,
        academic_year: grade.academic_year,
      }));

      setStudentGrades(grades);
    } catch (error) {
      console.error('Error fetching student grades:', error);
    } finally {
      setLoadingGrades(false);
    }
  };

  const fetchStudentEnrollments = async (formattedStudentId: string) => {
    try {
      // First get the UUID from user_profiles using the formatted student_id
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('student_id', formattedStudentId)
        .single();
      
      if (profileError) {
        console.error('Error finding user profile:', profileError);
        return;
      }
      
      // Now fetch enrollments using the UUID
      const { data, error } = await supabase
        .from('enrollcourse')
        .select(`
          subject_id, 
          status,
          subject:courses(code)
        `)
        .eq('student_id', profileData.id);
      
      if (error) {
        console.error('Error fetching enrollments:', error);
        return;
      }
      
      if (data) {
        setStudentEnrollments(data as any);
      }
    } catch (e) {
      console.error('Error fetching enrollments by formatted ID', e);
    }
  };

  const fetchStudentConfirmations = async (formattedStudentId: string) => {
    try {
      // First get the UUID from user_profiles using the formatted student_id
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('student_id', formattedStudentId)
        .single();
      
      if (profileError) {
        console.error('Error finding user profile:', profileError);
        return;
      }
      
      // Now fetch confirmations using the UUID
      const { data, error } = await supabase
        .from('subject_actions')
        .select('subject_code, status')
        .eq('student_id', profileData.id)
        .eq('action_type', 'confirm');
      
      if (error) {
        console.error('Error fetching confirmations:', error);
        return;
      }
      
      console.log('Fetched confirmations:', data);
      if (data) {
        setStudentConfirmations(data);
      }
    } catch (e) {
      console.error('Error fetching confirmations by formatted ID', e);
    }
  };

  const getEnrollmentStatus = (courseId: string, courseCode?: string) => {
    let rec = studentEnrollments.find(e => e.subject_id === courseId);
    
    if (!rec && courseCode) {
      rec = studentEnrollments.find(e => e.subject?.code === courseCode);
    }
    
    return rec?.status || 'not enrolled';
  };

  const getConfirmationStatus = (subjectCode: string) => {
    const confirmation = studentConfirmations.find(c => c.subject_code === subjectCode);
    console.log(`Checking confirmation for ${subjectCode}:`, confirmation);
    console.log('All confirmations:', studentConfirmations);
    // If a confirmation record exists, it means the student has confirmed this subject
    // The status in the database is 'pending' but for display purposes, we show 'confirmed'
    return confirmation ? 'confirmed' : 'pending';
  };

  const getSubjectGrades = (subjectCode: string) => {
    return studentGrades.find(grade => grade.subject_code === subjectCode);
  };

  const calculateAverageGrade = (prelim: number | null, midterm: number | null, final: number | null) => {
    const grades = [prelim, midterm, final].filter(grade => grade !== null && grade !== undefined);
    if (grades.length === 0) return null;
    const sum = grades.reduce((acc, grade) => acc + (grade || 0), 0);
    return Math.round((sum / grades.length) * 100) / 100;
  };

  const getYearLabel = (year: string | number) => {
    const y = String(year);
    if (y === '1' || /1st/.test(y)) return '1st Year';
    if (y === '2' || /2nd/.test(y)) return '2nd Year';
    if (y === '3' || /3rd/.test(y)) return '3rd Year';
    if (y === '4' || /4th/.test(y)) return '4th Year';
    return 'Year';
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = !filterYear || student.year_level.toString() === filterYear;
    const matchesType = !filterType || student.student_type === filterType;
    const matchesDepartment = !filterDepartment || student.department === filterDepartment;
    
    return matchesSearch && matchesYear && matchesType && matchesDepartment;
  });

  const getStudentTypeColor = (type: string) => {
    switch (type) {
      case 'Freshman': return 'success';
      case 'Regular': return 'primary';
      case 'Irregular': return 'warning';
      case 'Transferee': return 'info';
      default: return 'default';
    }
  };

  const getEnrollmentStatusColor = (status: string) => {
    switch (status) {
      case 'enrolled': return 'success';
      case 'pending': return 'warning';
      case 'dropped': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
          Student Prospectus Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage student academic prospectuses
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                select
                fullWidth
                label="Year Level"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                select
                fullWidth
                label="Student Type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="Freshman">Freshman</option>
                <option value="Regular">Regular</option>
                <option value="Irregular">Irregular</option>
                <option value="Transferee">Transferee</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                select
                fullWidth
                label="Department"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                <option value="BSIT">BSIT</option>
                <option value="BSBA">BSBA</option>
                <option value="BEED">BEED</option>
                <option value="BSED">BSED</option>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={loadStudents}
                sx={{ height: '56px' }}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ background: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Student ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Year Level</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Enrollment Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow 
                    key={student.id}
                    sx={{ 
                      '&:hover': { background: '#f0f9ff' },
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#3b82f6', width: 40, height: 40 }}>
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {student.first_name} {student.middle_name} {student.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {student.student_id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {student.student_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`${student.year_level}${student.year_level === 1 ? 'st' : student.year_level === 2 ? 'nd' : student.year_level === 3 ? 'rd' : 'th'} Year`}
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={student.student_type}
                        color={getStudentTypeColor(student.student_type) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {student.department}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={student.enrollment_status || 'Not Enrolled'}
                        color={getEnrollmentStatusColor(student.enrollment_status || 'not enrolled') as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                                             <Button
                         variant="outlined"
                         size="small"
                         startIcon={<MenuBook />}
                         onClick={() => handleOpenProspectusModal(student)}
                         sx={{ 
                           borderRadius: 2,
                           textTransform: 'none',
                           fontWeight: 600
                         }}
                       >
                         View Prospectus
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {filteredStudents.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center', color: '#6b7280' }}>
              <Typography variant="body1">
                {searchTerm || filterYear || filterType || filterDepartment 
                  ? 'No students match the current filters' 
                  : 'No students found'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Prospectus Modal */}
      <Dialog
        open={isProspectusModalOpen}
        onClose={handleCloseProspectusModal}
        maxWidth="lg"
        fullWidth
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e5e7eb'
          }
        }}
      >
        <DialogTitle sx={{ display: 'none' }} />
        
        <DialogContent sx={{ p: 0 }}>
          <Box ref={prospectusContentRef}>
            {/* Header area moved into scrollable content with white background */}
            <Box sx={{ background: 'white', p: 3, borderBottom: '1px solid #e5e7eb' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, width: '100%' }}>
                <Box sx={{ 
                  width: 50, height: 50, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  border: '2px solid #1e40af', position: 'relative' }}>
                  <Box sx={{ fontSize: '1.25rem', color: 'white', fontWeight: 'bold', textAlign: 'center', lineHeight: 1 }}>M</Box>
                  <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1rem', color: 'white', fontWeight: 'bold' }}>✝</Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937', mb: 0.25, fontSize: '1.125rem' }}>
                    St. Mary's College of Bansalan, Inc.
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontStyle: 'italic', mb: 0.25, fontSize: '0.75rem' }}>
                    (Formerly: Holy Cross of Bansalan College, Inc.)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#374151', mb: 0.5, fontSize: '0.75rem' }}>
                    Dahlia Street, Poblacion Uno, Bansalan, Davao del Sur, 8005 Philippines
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#1e40af', mb: 0.25, fontSize: '1rem' }}>
                    BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY (BSIT)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#374151', fontSize: '0.75rem' }}>
                    Effective SY 2020 - 2021
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.5rem', color: '#1e40af' }}>
                  STUDENT PROSPECTUS
                </Typography>
              </Box>
            </Box>

            {/* Body content */}
            <Box sx={{ p: 3 }}>
              {/* Student Name - Above the highlighted card */}
              <Typography variant="h5" sx={{ 
                fontWeight: 700,
                fontSize: '1.5rem',
                color: '#1f2937',
                textAlign: 'center',
                mb: 2
              }}>
                {selectedStudent?.first_name} {selectedStudent?.middle_name} {selectedStudent?.last_name}
              </Typography>

              {/* Student Information */}
              <Card sx={{ 
                mb: 3, 
                borderRadius: 2, 
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                border: '1px solid #bae6fd'
              }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Student ID
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {selectedStudent?.student_id}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Student Type
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedStudent?.student_type}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Current Year Level
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedStudent?.year_level}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Department
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedStudent?.department}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* All Subjects (since courses don't have year levels yet) */}
              {courses.length > 0 && (
                <Card sx={{ mb: 3, borderRadius: 2 }}>
                  <Box sx={{ 
                    p: 2.5, 
                    borderBottom: '1px solid #e5e7eb',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                  }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700, 
                      color: '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Box sx={{ 
                        px: 1.5, 
                        py: 0.5, 
                        borderRadius: 1, 
                        background: '#1e40af',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        color: 'white',
                        fontWeight: 600
                      }}>
                        All
                      </Box>
                      All Subjects
                      <Box sx={{ 
                        ml: 1, 
                        px: 1.5, 
                        py: 0.3, 
                        borderRadius: 1, 
                        background: '#e0e7ef',
                        fontSize: '0.75rem',
                        color: '#374151',
                        fontWeight: 500
                      }}>
                        {courses.length} subjects
                      </Box>
                      <Box sx={{ 
                        ml: 1, 
                        px: 1.5, 
                        py: 0.3, 
                        borderRadius: 1, 
                        background: '#e0e7ef',
                        fontSize: '0.75rem',
                        color: '#374151',
                        fontWeight: 500
                      }}>
                        {courses.reduce((sum, subject) => sum + (subject.units || 0), 0)} units
                      </Box>
                    </Typography>
                  </Box>
                  
                  <CardContent sx={{ p: 0 }}>
                    <TableContainer>
                      <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                          <col style={{ width: '16%' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '6%' }} />
                          <col style={{ width: '6%' }} />
                          <col style={{ width: '6%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '10%' }} />
                        </colgroup>
                        <TableHead>
                           <TableRow sx={{ background: '#f9fafb' }}>
                             <TableCell sx={{ 
                               fontWeight: 600, 
                               color: '#374151',
                               fontSize: '0.875rem',
                               borderBottom: '2px solid #e5e7eb'
                             }}>
                               Subject Code
                             </TableCell>
                              <TableCell sx={{ 
                               fontWeight: 600, 
                               color: '#374151',
                               fontSize: '0.875rem',
                               borderBottom: '2px solid #e5e7eb'
                             }}>
                               Subject Name
                             </TableCell>
                              <TableCell sx={{ 
                                fontWeight: 600, 
                                color: '#374151',
                                fontSize: '0.875rem',
                                borderBottom: '2px solid #e5e7eb',
                                textAlign: 'center'
                              }}>
                                Enrollment Status
                              </TableCell>
                             <TableCell sx={{ 
                               fontWeight: 600, 
                               color: '#374151',
                               fontSize: '0.875rem',
                               borderBottom: '2px solid #e5e7eb',
                               textAlign: 'center'
                             }}>
                               Units
                             </TableCell>
                             <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>LEC</TableCell>
                             <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>LAB</TableCell>
                             <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Hours/Week</TableCell>
                             <TableCell sx={{ 
                               fontWeight: 600, 
                               color: '#374151',
                               fontSize: '0.875rem',
                               borderBottom: '2px solid #e5e7eb',
                               textAlign: 'center'
                             }}>
                               Type
                             </TableCell>
                             <TableCell sx={{ 
                               fontWeight: 600, 
                               color: '#374151',
                               fontSize: '0.875rem',
                               borderBottom: '2px solid #e5e7eb',
                               textAlign: 'center'
                             }}>
                               Average Grade
                             </TableCell>
                              <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Prerequisites</TableCell>
                           </TableRow>
                        </TableHead>
                        <TableBody>
                          {courses.filter((s:any) => !s.summer && String(s.semester || '').toLowerCase().includes('1')).map((subject, idx) => (
                            <TableRow 
                              key={subject.id} 
                              sx={{ 
                                background: idx % 2 === 0 ? '#f9fafb' : '#ffffff',
                                '&:hover': {
                                  background: '#f0f9ff',
                                  transition: 'background-color 0.2s ease'
                                }
                              }}
                            >
                              <TableCell sx={{ 
                                fontWeight: 600,
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                color: '#1f2937'
                              }}>
                                {subject.code}
                              </TableCell>
                                <TableCell sx={{ 
                                 fontSize: '0.875rem',
                                 color: '#374151',
                                 whiteSpace: 'nowrap',
                                 overflow: 'hidden',
                                 textOverflow: 'ellipsis'
                              }}>
                                {subject.name}
                              </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                  <Box sx={{ 
                                    display: 'inline-block',
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    background: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#dcfce7' : '#f3f4f6',
                                    color: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#166534' : '#374151',
                                    textTransform: 'capitalize'
                                  }}>
                                    {getEnrollmentStatus(subject.id, subject.code) === 'active' ? 'Enrolled' : 'Not enrolled'}
                                  </Box>
                                </TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#059669' }}>{subject.units}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#059669' }}>{subject.lec_units || 0}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#059669' }}>{subject.lab_units || 0}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#059669' }}>{subject.hours_per_week || 0}</TableCell>
                               <TableCell sx={{ textAlign: 'center' }}>
                                 <Box sx={{ 
                                   display: 'inline-block',
                                   px: 1.5,
                                   py: 0.5,
                                   borderRadius: 1,
                                   fontSize: '0.75rem',
                                   fontWeight: 500,
                                   background: subject.code.startsWith('IT') ? '#dbeafe' : '#fef3c7',
                                   color: subject.code.startsWith('IT') ? '#1e40af' : '#92400e',
                                   textTransform: 'uppercase',
                                   letterSpacing: '0.05em'
                                 }}>
                                   {subject.code.startsWith('IT') ? 'Major' : 'Minor'}
                                 </Box>
                               </TableCell>
                               <TableCell sx={{ textAlign: 'center' }}>
                                 {(() => {
                                   const subjectGrades = getSubjectGrades(subject.code);
                                   if (loadingGrades) {
                                     return (
                                       <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                         <CircularProgress size={16} />
                                       </Box>
                                     );
                                   }
                                   if (subjectGrades) {
                                     const hasGrades = subjectGrades.prelim_grade !== null || 
                                                     subjectGrades.midterm_grade !== null || 
                                                     subjectGrades.final_grade !== null;
                                     if (hasGrades) {
                                       const averageGrade = calculateAverageGrade(
                                         subjectGrades.prelim_grade || null,
                                         subjectGrades.midterm_grade || null,
                                         subjectGrades.final_grade || null
                                       );
                                       return (
                                         <Box sx={{ 
                                           fontSize: '0.875rem',
                                           fontWeight: 700,
                                           color: '#0ea5e9',
                                           background: '#f0f9ff',
                                           px: 1.5,
                                           py: 0.5,
                                           borderRadius: 1,
                                           border: '1px solid #0ea5e9'
                                         }}>
                                           {averageGrade}
                                         </Box>
                                       );
                                     }
                                   }
                                   return (
                                     <Box sx={{ 
                                       fontSize: '0.75rem',
                                       color: '#6b7280',
                                       fontStyle: 'italic'
                                     }}>
                                       No grades
                                     </Box>
                                   );
                                 })()}
                               </TableCell>
                                <TableCell sx={{ textAlign: 'center' }}>
                                  {subject.prerequisites && subject.prerequisites.length > 0 ? (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                                      {subject.prerequisites.map((prereq: string, idx: number) => (
                                        <Chip key={idx} label={prereq} size="small" sx={{ fontSize: '0.7rem', height: '20px', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }} />
                                      ))}
                                    </Box>
                                  ) : (
                                    <Box sx={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>None</Box>
                                  )}
                                </TableCell>
                             </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* 2nd Semester */}
                    <Box sx={{ px: 2.5, pt: 3, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#0ea5e9' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1f2937' }}>2nd Semester</Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                          <col style={{ width: '16%' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '6%' }} />
                          <col style={{ width: '6%' }} />
                          <col style={{ width: '6%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '10%' }} />
                        </colgroup>
                        <TableHead>
                           <TableRow sx={{ background: '#f0f9ff' }}>
                             <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd' }}>Subject Code</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd' }}>Subject Name</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Enrollment Status</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Units</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>LEC</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>LAB</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Hours/Week</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Type</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Average Grade</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Prerequisites</TableCell>
                           </TableRow>
                        </TableHead>
                        <TableBody>
                          {courses.filter((s:any) => !s.summer && String(s.semester || '').toLowerCase().includes('2')).map((subject, idx) => (
                            <TableRow key={subject.id} sx={{ background: idx % 2 === 0 ? '#f0f9ff' : '#ffffff' }}>
                              <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem', color: '#0369a1' }}>{subject.code}</TableCell>
                              <TableCell sx={{ fontSize: '0.875rem', color: '#075985', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subject.name}</TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>
                                <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#e0f2fe' : '#f3f4f6', color: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#0369a1' : '#374151', textTransform: 'capitalize' }}>
                                  {getEnrollmentStatus(subject.id, subject.code) === 'active' ? 'Enrolled' : 'Not enrolled'}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.units}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.lec_units || 0}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.lab_units || 0}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.hours_per_week || 0}</TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>
                                <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: subject.code.startsWith('IT') ? '#dbeafe' : '#fef3c7', color: subject.code.startsWith('IT') ? '#1e40af' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {subject.code.startsWith('IT') ? 'Major' : 'Minor'}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>
                                {(() => {
                                  const subjectGrades = getSubjectGrades(subject.code);
                                  if (subjectGrades) {
                                    const hasGrades = subjectGrades.prelim_grade !== null || subjectGrades.midterm_grade !== null || subjectGrades.final_grade !== null;
                                    if (hasGrades) {
                                      const averageGrade = calculateAverageGrade(subjectGrades.prelim_grade || null, subjectGrades.midterm_grade || null, subjectGrades.final_grade || null);
                                      return (<Box sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', px: 1.5, py: 0.5, borderRadius: 1, border: '1px solid #7dd3fc' }}>{averageGrade}</Box>);
                                    }
                                  }
                                  return (<Box sx={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>No grades</Box>);
                                })()}
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>
                                {subject.prerequisites && subject.prerequisites.length > 0 ? (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                                    {subject.prerequisites.map((prereq: string, idx: number) => (
                                      <Chip key={idx} label={prereq} size="small" sx={{ fontSize: '0.7rem', height: '20px', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }} />
                                    ))}
                                  </Box>
                                ) : (
                                  <Box sx={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>None</Box>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Summer Subjects */}
                    <Box sx={{ px: 2.5, pt: 3, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1f2937' }}>Summer</Typography>
                    </Box>
                    <TableContainer>
                      <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                          <col style={{ width: '16%' }} />
                          <col style={{ width: '28%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '6%' }} />
                          <col style={{ width: '6%' }} />
                          <col style={{ width: '6%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '10%' }} />
                        </colgroup>
                        <TableHead>
                           <TableRow sx={{ background: '#fff7ed' }}>
                             <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a' }}>Subject Code</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a' }}>Subject Name</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Enrollment Status</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Units</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>LEC</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>LAB</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Hours/Week</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Type</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Average Grade</TableCell>
                             <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Prerequisites</TableCell>
                           </TableRow>
                        </TableHead>
                        <TableBody>
                          {courses.filter((s:any) => s.summer).map((subject, idx) => (
                            <TableRow key={subject.id} sx={{ background: idx % 2 === 0 ? '#fff7ed' : '#ffffff' }}>
                              <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem', color: '#92400e' }}>{subject.code}</TableCell>
                              <TableCell sx={{ fontSize: '0.875rem', color: '#7c2d12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subject.name}</TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>
                                <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#fef3c7' : '#f3f4f6', color: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#92400e' : '#374151', textTransform: 'capitalize' }}>
                                  {getEnrollmentStatus(subject.id, subject.code) === 'active' ? 'Enrolled' : 'Not enrolled'}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>{subject.units}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>{subject.lec_units || 0}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>{subject.lab_units || 0}</TableCell>
                              <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>{subject.hours_per_week || 0}</TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>
                                <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: subject.code.startsWith('IT') ? '#dbeafe' : '#fef3c7', color: subject.code.startsWith('IT') ? '#1e40af' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {subject.code.startsWith('IT') ? 'Major' : 'Minor'}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ textAlign: 'center' }}>
                                {(() => {
                                  const subjectGrades = getSubjectGrades(subject.code);
                                  if (subjectGrades) {
                                    const hasGrades = subjectGrades.prelim_grade !== null || subjectGrades.midterm_grade !== null || subjectGrades.final_grade !== null;
                                    if (hasGrades) {
                                      const averageGrade = calculateAverageGrade(subjectGrades.prelim_grade || null, subjectGrades.midterm_grade || null, subjectGrades.final_grade || null);
                                      return (<Box sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', px: 1.5, py: 0.5, borderRadius: 1, border: '1px solid #f59e0b' }}>{averageGrade}</Box>);
                                    }
                                  }
                                  return (<Box sx={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>No grades</Box>);
                                })()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          background: '#f8fafc',
          borderTop: '1px solid #e5e7eb',
          gap: 2
        }}>
          <Button 
            onClick={handleCloseProspectusModal}
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
                background: '#f9fafb'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RegistrarProspectus;
