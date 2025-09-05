import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Student {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name: string;
  studentType: 'Freshman' | 'Regular' | 'Irregular' | 'Transferee';
  yearLevel: number;
  currentSubjects: Subject[];
  doneSubjects: Subject[];
  status: 'pending' | 'approved' | 'returned';
  department: string;
  schoolYear: string;
  semester: string;
  section?: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  units: number;
  yearLevel: number;
  status: 'pending' | 'approved' | 'removed';
  hours_per_week?: number;
}

const ProgramHeadEnrollment: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [courses, setCourses] = useState<Array<{
    id: string;
    code: string;
    name: string;
    units: number;
    lec_units?: number;
    lab_units?: number;
    hours_per_week?: number;
    year_level?: string;
    prerequisites?: string[];
    summer?: boolean;
    semester?: string;
  }>>([]);
  const [allowMixedCourses, setAllowMixedCourses] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [editForm, setEditForm] = useState<Student | null>(null);
  const [editFormFields, setEditFormFields] = useState<{
    firstName: string;
    middleName: string;
    lastName: string;
  }>({
    firstName: '',
    middleName: '',
    lastName: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [isExistingModalOpen, setIsExistingModalOpen] = useState(false);
  const [existingStudentsByYear, setExistingStudentsByYear] = useState<Record<string, Student[]>>({});
  const [selectedExistingStudent, setSelectedExistingStudent] = useState<Student | null>(null);
  const [existingFilterYear, setExistingFilterYear] = useState('');
  const [existingFilterSection, setExistingFilterSection] = useState('');
  const [endSemesterOpen, setEndSemesterOpen] = useState(false);
  const [endSemesterLoading, setEndSemesterLoading] = useState(false);
  const [endSemesterConfirmation, setEndSemesterConfirmation] = useState('');
  const [endSemesterConfirmationError, setEndSemesterConfirmationError] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [isProspectusModalOpen, setIsProspectusModalOpen] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [instructorAssignments, setInstructorAssignments] = useState<Array<{
    id: string;
    teacher_id: string;
    subject_id: string;
    section: string;
    academic_year: string;
    semester: string;
    year_level: string;
    is_active: boolean;
    teacher_name: string;
    teacher_role: string;
    subject_code: string;
    subject_name: string;
    subject_units: number;
  }>>([]);

  // Add sections state for the dropdown
  const [sections, setSections] = useState<Array<{ id: string; name: string; year_level: number; academic_year?: string }>>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  // Fetch courses when prospectus modal opens
  useEffect(() => {
    if (isProspectusModalOpen) {
      const fetchCoursesForProspectus = async () => {
        setLoadingCourses(true);
        console.log('=== STARTING COURSE FETCH FOR PROSPECTUS ===');
        
        try {
          // Check current user session first
          console.log('Step 0: Checking user session...');
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('❌ Session error:', sessionError);
          } else if (!session) {
            console.error('❌ No active session');
          } else {
            console.log('✅ Active session found:', {
              userId: session.user.id,
              email: session.user.email,
              role: session.user.user_metadata?.role || 'unknown'
            });
          }
          
          // Check Supabase configuration
          console.log('Step 0.5: Checking Supabase configuration...');
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          
          if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Missing Supabase environment variables');
            console.error('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
            console.error('Key:', supabaseKey ? '✅ Set' : '❌ Missing');
          } else {
            console.log('✅ Supabase environment variables are set');
            console.log('URL length:', supabaseUrl.length);
            console.log('Key length:', supabaseKey.length);
          }
          
          // First, let's check if the courses table has any data at all
          console.log('Step 1: Counting total courses...');
          const { count, error: countError } = await supabase
            .from('courses')
            .select('*', { count: 'exact', head: true });
          
          if (countError) {
            console.error('❌ Error counting courses:', countError);
          } else {
            console.log('✅ Total courses in database:', count);
          }
          
          // Test if we can access any tables at all
          console.log('Step 1.5: Testing table access...');
          const { data: testData, error: testError } = await supabase
            .from('user_profiles')
            .select('id, first_name')
            .limit(1);
          
          if (testError) {
            console.error('❌ Cannot access user_profiles table:', testError);
          } else {
            console.log('✅ Can access user_profiles table:', testData);
          }
          
          // Test database connectivity with a simple operation
          console.log('Step 1.6: Testing database connectivity...');
          try {
            const { data: testInsert, error: insertError } = await supabase
              .from('user_profiles')
              .select('id')
              .limit(1);
            
            if (insertError) {
              console.error('❌ Database connectivity test failed:', insertError);
            } else {
              console.log('✅ Database connectivity test passed');
            }
          } catch (connectError) {
            console.error('❌ Database connectivity test exception:', connectError);
          }
          
          // Test if courses table exists at all
          console.log('Step 1.7: Testing if courses table exists...');
          try {
            const { data: tableTest, error: tableError } = await supabase
              .from('courses')
              .select('id')
              .limit(1);
            
            if (tableError) {
              console.error('❌ Courses table test failed:', tableError);
              console.error('Table error details:', {
                message: tableError.message,
                details: tableError.details,
                hint: tableError.hint,
                code: tableError.code
              });
            } else {
              console.log('✅ Courses table exists and is accessible');
              console.log('✅ Table test result:', tableTest);
            }
          } catch (tableException) {
            console.error('❌ Courses table test exception:', tableException);
          }
          
          // Try a completely basic query first
          console.log('Step 2: Trying basic query (select *)...');
          const { data: basicData, error: basicError } = await supabase
            .from('courses')
            .select('*')
            .limit(5);
          
          if (basicError) {
            console.error('❌ Basic query error:', basicError);
            
            // Try alternative table names
            console.log('Step 2.5: Trying alternative table names...');
            const alternativeTables = ['course', 'subject', 'subjects'];
            
            for (const tableName of alternativeTables) {
              console.log(`Trying table: ${tableName}`);
              const { data: altData, error: altError } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
              
              if (!altError && altData) {
                console.log(`✅ Found alternative table: ${tableName}`, altData);
                break;
              } else {
                console.log(`❌ Table ${tableName} not accessible:`, altError);
              }
            }
          } else {
            console.log('✅ Basic query result (first 5):', basicData);
            console.log('✅ Basic query count:', basicData?.length || 0);
          }
          
          // Now try the specific query we need
          console.log('Step 3: Trying specific query...');
          const { data, error } = await supabase
            .from('courses')
            .select('id, code, name,  lec_units, lab_units, units, hours_per_week, year_level, prerequisites, summer, semester')
            .order('code', { ascending: true });
          
          if (error) {
            console.error('❌ Specific query error:', error);
            console.error('Error details:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
            
            // Try a fallback query without ordering
            console.log('Step 3.5: Trying fallback query without ordering...');
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('courses')
              .select('id, code, name,  lec_units, lab_units, units, hours_per_week, year_level, prerequisites, summer, semester');
            
            if (fallbackError) {
              console.error('❌ Fallback query also failed:', fallbackError);
              
              // Try the most basic query possible
              console.log('Step 3.6: Trying most basic query...');
              const { data: basicData2, error: basicError2 } = await supabase
                .from('courses')
                .select('*');
              
              if (basicError2) {
                console.error('❌ Even basic query failed:', basicError2);
              } else {
                console.log('✅ Basic query succeeded:', basicData2);
                if (basicData2 && basicData2.length > 0) {
                  setCourses(basicData2);
                  console.log('✅ Courses set from basic query');
                }
              }
            } else {
              console.log('✅ Fallback query succeeded:', fallbackData);
              if (fallbackData && fallbackData.length > 0) {
                setCourses(fallbackData);
                console.log('✅ Courses set from fallback query');
              }
            }
          } else {
            console.log('✅ Specific query success!');
            console.log('✅ Fetched courses count:', data?.length || 0);
            console.log('✅ First few courses:', data?.slice(0, 3));
            console.log('✅ All courses:', data);
            
            if (data && data.length > 0) {
              setCourses(data);
              console.log('✅ Courses state updated successfully');
            } else {
              console.log('⚠️ No courses returned from query');
            }
          }
          
        } catch (catchError) {
          console.error('❌ Unexpected error during course fetch:', catchError);
        } finally {
          setLoadingCourses(false);
          console.log('=== COURSE FETCH COMPLETED ===');
        }
      };
      
      fetchCoursesForProspectus();
    }
  }, [isProspectusModalOpen]);

  // Semester helpers used for sub-categorization (must be defined before render)
  const isFirstSemesterCourse = (course: any) => {
    if (!course || course.summer) return false;
    const src = String(course.semester || course.year_level || '').toLowerCase();
    return src.includes('1') || src.includes('first');
  };

  const isSecondSemesterCourse = (course: any) => {
    if (!course || course.summer) return false;
    const src = String(course.semester || course.year_level || '').toLowerCase();
    return src.includes('2') || src.includes('second');
  };

  // Helper function to render subjects
  const renderSubjects = () => {
    console.log('renderSubjects called, courses:', courses);
    console.log('courses length:', courses.length);
    console.log('loadingCourses:', loadingCourses);
    console.log('courses data:', JSON.stringify(courses, null, 2));
    
    if (loadingCourses) {
      console.log('Courses are loading, showing loading state');
      return (
        <Box sx={{ p: 3, textAlign: 'center', color: '#6b7280' }}>
          <CircularProgress size={24} sx={{ mb: 2 }} />
          <Typography variant="body2">
            Loading courses...
          </Typography>
        </Box>
      );
    }
    
    if (!courses || courses.length === 0) {
      console.log('No courses available, returning empty');
      return (
        <Box sx={{ p: 3, textAlign: 'center', color: '#6b7280' }}>
          <Typography variant="body2">
            No courses available. Please check if courses are loaded.
          </Typography>
        </Box>
      );
    }
    
    // First, check if we have any courses with year levels
    const coursesWithYearLevel = courses.filter(course => course.year_level);
    const coursesWithoutYearLevel = courses.filter(course => !course.year_level);
    
    console.log('Total courses:', courses.length);
    console.log('Courses with year level:', coursesWithYearLevel.length);
    console.log('Courses without year level:', coursesWithoutYearLevel.length);
    
    // If no courses have year levels, show all courses in one section
    if (coursesWithYearLevel.length === 0) {
      const totalUnits = courses.reduce((sum, subj) => sum + (subj.units || 0), 0);
      console.log('Showing all subjects section, total units:', totalUnits);
      return (
        <Box className="year-section">
          <Box className="year-header">
            <Box className="year-number">📚</Box>
            <Typography className="year-title">All Subjects</Typography>
            <Box className="year-stats">
              <Box className="stat-item">{courses.length} subjects</Box>
              <Box className="stat-item">{totalUnits} units</Box>
              </Box>
          </Box>
          
            {courses.length > 0 ? (
              <TableContainer>
              <Table className="prospectus-table" size="small">
                  <TableHead>
                   <TableRow>
                     <TableCell>Subject Code</TableCell>
                     <TableCell>Subject Name</TableCell>
                     <TableCell>Enrollment Status</TableCell>
                     <TableCell>LEC</TableCell>
                     <TableCell>LAB</TableCell>
                     <TableCell>Units</TableCell>
                     <TableCell>Hours/Week</TableCell>
                     <TableCell>Type</TableCell>
                     <TableCell>Average Grade</TableCell>
                     <TableCell>Prerequisites</TableCell>
                     <TableCell>Status</TableCell>
                      </TableRow>
                   </TableHead>
                   <TableBody>
                     {courses.map((subject, idx) => (
                       <TableRow key={subject.id}>
                         <TableCell className="subject-code">{subject.code}</TableCell>
                         <TableCell className="subject-name">{subject.name}</TableCell>
                         <TableCell>
                           <Box className={`status ${getEnrollmentStatus(subject.id, subject.code) === 'active' ? 'confirmed' : 'pending'}`}>
                               {getEnrollmentStatus(subject.id, subject.code) === 'active' ? 'Enrolled' : 'Not enrolled'}
                             </Box>
                           </TableCell>
                         <TableCell className="lec-lab">{subject.units}</TableCell>
                         <TableCell className="lec-lab">{subject.lec_units || 0}</TableCell>
                         <TableCell className="lec-lab">{subject.lab_units || 0}</TableCell>
                         <TableCell className="hours">{subject.hours_per_week || 0}</TableCell>
                         <TableCell>
                           <Box className={`type ${subject.code.startsWith('IT') ? 'major' : 'minor'}`}>
                              {subject.code.startsWith('IT') ? 'Major' : 'Minor'}
                            </Box>
                          </TableCell>
                         <TableCell>
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
                                   <Box className="grade">
                                      {averageGrade}
                                    </Box>
                                  );
                                }
                              }
                              return (
                               <Box className="no-grade">
                                  No grades
                                </Box>
                              );
                            })()}
                          </TableCell>
                         <TableCell>
                            {(() => {
                              console.log(`Prerequisites for ${subject.code}:`, subject.prerequisites);
                              return subject.prerequisites && subject.prerequisites.length > 0 ? (
                               <Box className="prerequisites">
                                 {subject.prerequisites.join(', ')}
                                </Box>
                              ) : (
                               <Typography className="no-grade">
                                  None
                                </Typography>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                             {(() => {
                               const confirmationStatus = getConfirmationStatus(subject.code);
                               const isConfirmed = confirmationStatus === 'confirmed';
                               const subjectGrades = getSubjectGrades(subject.code);
                               const hasGrades = subjectGrades && (subjectGrades.prelim_grade !== null || 
                                                subjectGrades.midterm_grade !== null || 
                                                subjectGrades.final_grade !== null);
                               
                               if (isConfirmed) {
                                 return (
                                   <Box className={`status ${isConfirmed ? 'confirmed' : 'pending'}`}>
                                     {isConfirmed ? 'Confirmed' : 'Pending'}
                                   </Box>
                                 );
                               } else if (hasGrades) {
                                 return (
                                   <Button 
                                     size="small" 
                                     variant="outlined" 
                                     color="success" 
                                     onClick={() => handleConfirmSubject(subject.code)}
                                     sx={{ fontSize: '0.7rem', py: 0.5, px: 1 }}
                                   >
                                     Confirm
                                   </Button>
                                 );
                               } else {
                                 return (
                                   <Box className={`status ${isConfirmed ? 'confirmed' : 'pending'}`}>
                                     {isConfirmed ? 'Confirmed' : 'Pending'}
                                   </Box>
                                 );
                               }
                             })()}
                           </TableCell>
                        </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </TableContainer>
             ) : (
               <Box sx={{ 
                 p: 3, 
                 textAlign: 'center',
                 color: '#6b7280'
               }}>
                 <Typography variant="body2">
                   No subjects available
                 </Typography>
               </Box>
             )}
           </Box>
       );
     }
     
     // If courses have year levels, show them by year
     return [1, 2, 3, 4].map((yearLevel) => {
       const yearSubjects = courses.filter(course => {
         // Handle string year_level formats
         const courseYearLevel = course.year_level;
         if (courseYearLevel) {
           // Check for various string formats
           const matches = courseYearLevel.includes(String(yearLevel)) || 
                  courseYearLevel.toLowerCase().includes(`${yearLevel}st`) ||
                  courseYearLevel.toLowerCase().includes(`${yearLevel}nd`) ||
                  courseYearLevel.toLowerCase().includes(`${yearLevel}rd`) ||
                  courseYearLevel.toLowerCase().includes(`${yearLevel}th`);
           if (matches) {
             console.log(`Course ${course.code} (${courseYearLevel}) matches year ${yearLevel}`);
           }
           return matches;
         }
         return false;
       });
       console.log(`Year ${yearLevel}: ${yearSubjects.length} subjects found`);
       const categorizedSubjects = categorizeCourses(yearSubjects);
       const totalUnits = yearSubjects.reduce((sum, subj) => sum + (subj.units || 0), 0);
      
      return (
        <Card key={yearLevel} sx={{ 
          mb: 2, 
          borderRadius: 2, 
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
            p: 2,
            borderBottom: '1px solid #e5e7eb'
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: '#374151',
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
                color: 'white',
                fontWeight: 600
              }}>
                {yearLevel}
              </Box>
              {getYearLabel(String(yearLevel))} Subjects
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
                {yearSubjects.length} subjects
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
                {totalUnits} units
              </Box>
            </Typography>
          </Box>
          
          <CardContent sx={{ p: 0 }}>
            {yearSubjects.length > 0 ? (
              <>
                {/* 1st Semester */}
                <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1f2937' }}>1st Semester</Typography>
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
                      <col style={{ width: '10%' }} />
                    </colgroup>
                    <TableHead>
                      <TableRow sx={{ background: '#f0f9ff' }}>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd' }}>Subject Code</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd' }}>Subject Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Enrollment Status</TableCell>
                        
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>LEC</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>LAB</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Units</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Hours/Week</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Average Grade</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Prerequisites</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {yearSubjects.filter(isFirstSemesterCourse).map((subject, idx) => (
                        <TableRow key={subject.id} sx={{ background: idx % 2 === 0 ? '#f0f9ff' : '#ffffff' }}>
                          <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem', color: '#0369a1' }}>{subject.code}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem', color: '#075985', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subject.name}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#e0f2fe' : '#f3f4f6', color: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#0369a1' : '#374151', textTransform: 'capitalize' }}>{getEnrollmentStatus(subject.id, subject.code) === 'active' ? 'Enrolled' : 'Not enrolled'}</Box>
                          </TableCell>
                          
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.lec_units || 0}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.lab_units || 0}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.units}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.hours_per_week || 0}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: subject.code.startsWith('IT') ? '#dbeafe' : '#fef3c7', color: subject.code.startsWith('IT') ? '#1e40af' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{subject.code.startsWith('IT') ? 'Major' : 'Minor'}</Box>
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
                                  <Chip key={`${subject.id}-prereq-${idx}`} label={prereq} size="small" sx={{ fontSize: '0.7rem', height: '20px', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }} />
                                ))}
                              </Box>
                            ) : (
                              <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>None</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {(() => {
                              const confirmationStatus = getConfirmationStatus(subject.code);
                              const isConfirmed = confirmationStatus === 'confirmed';
                              const subjectGrades = getSubjectGrades(subject.code);
                              const hasGrades = subjectGrades && (subjectGrades.prelim_grade !== null || 
                                                subjectGrades.midterm_grade !== null || 
                                                subjectGrades.final_grade !== null);
                              
                              if (isConfirmed) {
                                return (
                                  <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: '#dcfce7', color: '#166534', textTransform: 'capitalize' }}>
                                    Confirmed
                                  </Box>
                                );
                              } else if (hasGrades) {
                                return (
                                  <Button 
                                    size="small" 
                                    variant="outlined" 
                                    color="success" 
                                    onClick={() => handleConfirmSubject(subject.code)}
                                    sx={{ fontSize: '0.7rem', py: 0.5, px: 1 }}
                                  >
                                    Confirm
                                  </Button>
                                );
                              } else {
                                return (
                                  <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: '#e5e7eb', color: '#374151', textTransform: 'capitalize' }}>
                                    Pending
                                  </Box>
                                );
                              }
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* 2nd Semester */}
                <Box sx={{ px: 2, pt: 3, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                      <col style={{ width: '10%' }} />
                    </colgroup>
                    <TableHead>
                      <TableRow sx={{ background: '#f0f9ff' }}>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd' }}>Subject Code</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd' }}>Subject Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Enrollment Status</TableCell>
                        
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>LEC</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>LAB</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Units</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Hours/Week</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Average Grade</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Prerequisites</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.875rem', borderBottom: '2px solid #bae6fd', textAlign: 'center' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {yearSubjects.filter(isSecondSemesterCourse).map((subject, idx) => (
                        <TableRow key={subject.id} sx={{ background: idx % 2 === 0 ? '#f0f9ff' : '#ffffff' }}>
                          <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem', color: '#0369a1' }}>{subject.code}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem', color: '#075985', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subject.name}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#e0f2fe' : '#f3f4f6', color: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#0369a1' : '#374151', textTransform: 'capitalize' }}>{getEnrollmentStatus(subject.id, subject.code) === 'active' ? 'Enrolled' : 'Not enrolled'}</Box>
                          </TableCell>
                          
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.lec_units || 0}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.lab_units || 0}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.units}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subject.hours_per_week || 0}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: subject.code.startsWith('IT') ? '#dbeafe' : '#fef3c7', color: subject.code.startsWith('IT') ? '#1e40af' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{subject.code.startsWith('IT') ? 'Major' : 'Minor'}</Box>
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
                                  <Chip key={`${subject.id}-prereq-${idx}`} label={prereq} size="small" sx={{ fontSize: '0.7rem', height: '20px', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }} />
                                ))}
                              </Box>
                            ) : (
                              <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>None</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {(() => {
                              const confirmationStatus = getConfirmationStatus(subject.code);
                              const isConfirmed = confirmationStatus === 'confirmed';
                              return (
                                <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: isConfirmed ? '#dcfce7' : '#e5e7eb', color: isConfirmed ? '#166534' : '#374151', textTransform: 'capitalize' }}>{isConfirmed ? 'Confirmed' : 'Pending'}</Box>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Summer */}
                <Box sx={{ px: 2, pt: 3, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                      <col style={{ width: '10%' }} />
                    </colgroup>
                    <TableHead>
                      <TableRow sx={{ background: '#fff7ed' }}>
                        <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a' }}>Subject Code</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a' }}>Subject Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Enrollment Status</TableCell>
                        
                        <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>LEC</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>LAB</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Units</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Hours/Week</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Average Grade</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Prerequisites</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem', borderBottom: '2px solid #fde68a', textAlign: 'center' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {yearSubjects.filter(s => s.summer).map((subject, idx) => (
                        <TableRow key={subject.id} sx={{ background: idx % 2 === 0 ? '#fff7ed' : '#ffffff' }}>
                          <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem', color: '#92400e' }}>{subject.code}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem', color: '#7c2d12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subject.name}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#fef3c7' : '#f3f4f6', color: getEnrollmentStatus(subject.id, subject.code) === 'active' ? '#92400e' : '#374151', textTransform: 'capitalize' }}>
                              {getEnrollmentStatus(subject.id, subject.code) === 'active' ? 'Enrolled' : 'Not enrolled'}
                            </Box>
                          </TableCell>
                          
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>{subject.lec_units || 0}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>{subject.lab_units || 0}</TableCell>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>{subject.units}</TableCell>
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
                          <TableCell sx={{ textAlign: 'center' }}>
                            {subject.prerequisites && subject.prerequisites.length > 0 ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                                {subject.prerequisites.map((prereq, idx) => (
                                  <Chip key={`${subject.id}-prereq-${idx}`} label={prereq} size="small" sx={{ fontSize: '0.7rem', height: '20px', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }} />
                                ))}
                              </Box>
                            ) : (
                              <Typography sx={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>None</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {(() => {
                              const confirmationStatus = getConfirmationStatus(subject.code);
                              const isConfirmed = confirmationStatus === 'confirmed';
                              return (
                                <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: isConfirmed ? '#dcfce7' : '#e5e7eb', color: isConfirmed ? '#166534' : '#374151', textTransform: 'capitalize' }}>{isConfirmed ? 'Confirmed' : 'Pending'}</Box>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
             ) : (
               <Box sx={{ 
                 p: 3, 
                 textAlign: 'center',
                 color: '#6b7280'
               }}>
                 <Typography variant="body2">
                   No subjects available for {getYearLabel(String(yearLevel))}
                 </Typography>
               </Box>
             )}
           </CardContent>
         </Card>
       );
     });
   };

  // Prerequisite checking function
  const checkPrerequisites = async (studentId: string, courseCode: string): Promise<{ canEnroll: boolean; missingPrerequisites: string[] }> => {
    try {
      // Get the course with its prerequisites
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('prerequisites')
        .eq('code', courseCode)
        .single();

      if (courseError || !courseData?.prerequisites || courseData.prerequisites.length === 0) {
        return { canEnroll: true, missingPrerequisites: [] };
      }

      const prerequisites = courseData.prerequisites as string[];
      
      // Get student's completed subjects (grades with passing marks)
      const { data: studentGrades, error: gradesError } = await supabase
        .from('grades')
        .select(`
          course:courses(code),
          final_grade
        `)
        .eq('student_id', studentId);

      if (gradesError) {
        console.error('Error fetching student grades:', gradesError);
        return { canEnroll: false, missingPrerequisites: prerequisites };
      }

      // Get student's profile year level for Year Standing checks
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('year_level')
        .eq('id', studentId)
        .single();
      const studentYear = Number((profileData as any)?.year_level || 0);

      // Check if student has completed all prerequisites
      const completedSubjects = (studentGrades || [])
        .filter(grade => grade.final_grade && grade.final_grade >= 75) // Assuming 75 is passing
        .map(grade => (grade.course as any)?.code)
        .filter(Boolean);

      const missingPrerequisites: string[] = [];

      for (const prereq of prerequisites) {
        // Year Standing pattern: '1st Year Standing', '2nd Year Standing', etc.
        const ysMatch = prereq.match(/^(\d)(st|nd|rd|th)\s+Year\s+Standing$/i);
        if (ysMatch) {
          const requiredYear = Number(ysMatch[1]);
          if (!studentYear || studentYear < requiredYear) {
            missingPrerequisites.push(prereq);
          }
          continue;
        }
        // Subject prerequisite
        if (!completedSubjects.includes(prereq)) {
          missingPrerequisites.push(prereq);
        }
      }

      return {
        canEnroll: missingPrerequisites.length === 0,
        missingPrerequisites
      };
    } catch (error) {
      console.error('Error checking prerequisites:', error);
      return { canEnroll: false, missingPrerequisites: [] };
    }
  };
  const [selectedStudentForProspectus, setSelectedStudentForProspectus] = useState<Student | null>(null);
  const [studentGrades, setStudentGrades] = useState<Array<{
    id: string;
    student_id: string;
    subject_code: string;
    subject_name: string;
    prelim_grade?: number;
    midterm_grade?: number;
    final_grade?: number;
    remarks?: string;
    year_level?: string;
    semester?: string;
    academic_year?: string;
  }>>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const prospectusContentRef = useRef<HTMLDivElement>(null);

  const getDefaultSchoolYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const nextYear = year + 1;
    return `${year}-${nextYear}`;
  };

  const [createForm, setCreateForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: 'TempPass@123',
    studentType: 'Freshman',
    yearLevel: 1,
    schoolYear: getDefaultSchoolYear(),
    studentId: '',
    department: 'BSIT',
    semester: '1st Semester',
    section: '',
  });

  useEffect(() => {
    loadEnrollments();
    fetchSections();
    fetchInstructorAssignments();
  }, []);

  // Refresh instructor assignments when createForm changes (year level or section)
  useEffect(() => {
    if (createForm.yearLevel || createForm.section) {
      // Re-trigger the instructor matching by updating the component
      // This will cause the getInstructorForCourse function to re-evaluate
    }
  }, [createForm.yearLevel, createForm.section]);

  // Update section ID when sections are loaded and we have a selected existing student
  useEffect(() => {
    if (selectedExistingStudent && sections.length > 0 && createForm.section === '') {
      // Check if student.section is already a section ID
      const isSectionId = sections.some(s => s.id === selectedExistingStudent.section);
      let sectionId = '';
      
      if (isSectionId) {
        sectionId = selectedExistingStudent.section || '';
      } else {
        sectionId = getSectionId(selectedExistingStudent.section) || '';
      }
      
      if (sectionId) {
        setCreateForm(prev => ({
          ...prev,
          section: sectionId
        }));
      }
    }
  }, [sections, selectedExistingStudent, createForm.section]);

  // Function to fetch available sections
  const fetchSections = async () => {
    setSectionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, year_level, academic_year')
        .order('year_level', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      setSections(data || []);
    } catch (err) {
      console.error('Failed to fetch sections:', err);
      setSections([]);
    } finally {
      setSectionsLoading(false);
    }
  };

  // Helper function to get section name by ID
  const getSectionName = (sectionId: string | null | undefined): string => {
    if (!sectionId) return 'Unassigned';
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : 'Unknown Section';
  };

  // Helper function to get section ID by name
  const getSectionId = (sectionName: string | null | undefined): string => {
    if (!sectionName) return '';
    const section = sections.find(s => s.name === sectionName);
    return section ? section.id : '';
  };

  // Fetch instructor assignments for courses
  const fetchInstructorAssignments = async () => {
    try {
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
        .eq('is_active', true)
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
        teacher_name: assignment.teacher 
          ? `${assignment.teacher.first_name} ${assignment.teacher.middle_name ? assignment.teacher.middle_name + ' ' : ''}${assignment.teacher.last_name}`
          : 'Unknown Teacher',
        teacher_role: assignment.teacher?.role || 'Unknown',
        subject_code: assignment.subject?.code || 'Unknown',
        subject_name: assignment.subject?.name || 'Unknown',
        subject_units: assignment.subject?.units || 0
      }));

      setInstructorAssignments(transformedAssignments);
    } catch (error) {
      console.error('Error fetching instructor assignments:', error);
    }
  };

  // Helper function to get instructor information for a course
  const getInstructorForCourse = (courseId: string, studentYearLevel?: string, studentSection?: string) => {
    const currentAcademicYear = createForm.schoolYear || getDefaultSchoolYear();
    const currentSemester = createForm.semester || '1st Semester';
    
    const assignments = instructorAssignments.filter(assignment => 
      assignment.subject_id === courseId && 
      assignment.academic_year === currentAcademicYear &&
      assignment.semester === currentSemester &&
      assignment.is_active
    );

    // If we have student year level and section, try to find exact match first
    if (studentYearLevel && studentSection) {
      // Convert section ID to section name for comparison
      const sectionName = getSectionName(studentSection);
      
      const exactMatch = assignments.find(assignment => 
        assignment.year_level === studentYearLevel && 
        assignment.section === sectionName
      );
      if (exactMatch) {
        return {
          ...exactMatch,
          isExactMatch: true
        };
      }
    }

    // If no exact match, return the first available assignment
    if (assignments.length > 0) {
      return {
        ...assignments[0],
        isExactMatch: false
      };
    }

    return null;
  };

  // Helper function to check if student section matches instructor section
  const isSectionMatch = (courseId: string, studentSection?: string) => {
    if (!studentSection) return false;
    
    const currentAcademicYear = createForm.schoolYear || getDefaultSchoolYear();
    const currentSemester = createForm.semester || '1st Semester';
    const sectionName = getSectionName(studentSection);
    
    return instructorAssignments.some(assignment => 
      assignment.subject_id === courseId && 
      assignment.section === sectionName &&
      assignment.academic_year === currentAcademicYear &&
      assignment.semester === currentSemester &&
      assignment.is_active
    );
  };

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
    // Clear section when year level changes
    setCreateForm(f => ({ ...f, section: '' }));
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
        
        try {
          // Query how many students are already enrolled in this school year
          const { count, error } = await supabase
            .from('user_profiles')
            .select('id', { count: 'exact', head: true })
            .ilike('student_id', `C-${yearPrefix}%`);
          
          if (error) {
            console.error('Error counting existing students:', error);
            return;
          }
          
          let regNum = 1;
          if (typeof count === 'number') {
            regNum = count + 1;
          }
          
          // Generate a unique student ID with padding
          const regNumStr = regNum.toString().padStart(4, '0');
          const studentId = `C-${yearPrefix}${regNumStr}`;
          
          // Double-check that this ID doesn't already exist
          const { data: existingStudent, error: checkError } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('student_id', studentId)
            .single();
          
          if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking existing student ID:', checkError);
            return;
          }
          
          if (existingStudent) {
            // If ID exists, increment and try again
            regNum += 1;
            const newRegNumStr = regNum.toString().padStart(4, '0');
            const newStudentId = `C-${yearPrefix}${newRegNumStr}`;
            setCreateForm(f => ({ ...f, studentId: newStudentId }));
          } else {
            setCreateForm(f => ({ ...f, studentId }));
          }
        } catch (err) {
          console.error('Error generating student ID:', err);
        }
      } else {
        setCreateForm(f => ({ ...f, studentId: '' }));
      }
    };
    
    // Add a small delay to prevent rapid successive calls
    const timeoutId = setTimeout(generateStudentId, 100);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [createForm.schoolYear, createForm.firstName, createForm.lastName]);

  useEffect(() => {
    // Fetch courses on mount
    const fetchCourses = async () => {
      setLoadingCourses(true);
      console.log('Initial fetchCourses called');
      const { data, error } = await supabase
        .from('courses')
        .select('id, code, name, units, lec_units, lab_units, hours_per_week, year_level, prerequisites, summer, semester')
        .order('code', { ascending: true });
      if (!error && data) {
        console.log('Initial fetchCourses success:', data);
        console.log('Initial courses count:', data.length);
        setCourses(data);
      } else if (error) {
        console.error('Initial fetchCourses error:', error);
        console.error('Initial error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      }
      setLoadingCourses(false);
    };
    fetchCourses();
  }, []);

  // Initialize edit form fields when editForm is set
  useEffect(() => {
    if (editForm) {
      // Prefer explicit fields if present, fallback to parsing full name
      const derivedFirst = editForm.firstName || '';
      const derivedMiddle = editForm.middleName || '';
      const derivedLast = editForm.lastName || '';

      if (derivedFirst || derivedMiddle || derivedLast) {
        setEditFormFields({ firstName: derivedFirst, middleName: derivedMiddle, lastName: derivedLast });
        return;
      }

      const nameParts = editForm.name.split(' ').filter(Boolean);
      let firstName = '';
      let middleName = '';
      let lastName = '';

      if (nameParts.length === 1) {
        lastName = nameParts[0];
      } else if (nameParts.length === 2) {
        firstName = nameParts[1];
        lastName = nameParts[0];
      } else if (nameParts.length >= 3) {
        firstName = nameParts[nameParts.length - 1];
        lastName = nameParts[0];
        middleName = nameParts.slice(1, nameParts.length - 1).join(' ');
      }

      setEditFormFields({ firstName, middleName, lastName });
    }
  }, [editForm]);

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
      const students = (data || []).map((student: Record<string, unknown>, index: number) => {
        const firstName = String(student.first_name || '');
        const middleName = String(student.middle_name || '');
        const lastName = String(student.last_name || '');
        
        // Construct full name with middle name if available
        const fullName = middleName 
          ? `${lastName} ${middleName} ${firstName}`
          : `${lastName} ${firstName}`;
        
        // Use a unique identifier: prefer student_id if available, otherwise use UUID with index fallback
        const uniqueId = student.student_id 
          ? String(student.student_id)
          : `${String(student.id)}-${index}`;
        
        return {
          id: uniqueId,
          name: fullName,
          firstName,
          middleName,
          lastName,
          studentType: (student.student_type as Student['studentType']) || 'Freshman',
          yearLevel: Number(student.year_level) || 1,
          currentSubjects: [],
          doneSubjects: [],
          status: (student.enrollment_status as Student['status']) || 'pending',
          department: String(student.department || ''),
          schoolYear: String(student.school_year || ''),
          semester: String(student.semester || ''),
          section: String(student.section || ''),
        };
      });
      
      // Remove any potential duplicates by filtering unique IDs
      const uniqueStudents = students.filter((student, index, self) => 
        index === self.findIndex(s => s.id === student.id)
      );
      
      setStudents(uniqueStudents);
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
      // Capitalize first letter of first name and last name
      const capitalizedFirstName = createForm.firstName.charAt(0).toUpperCase() + createForm.firstName.slice(1).toLowerCase();
      const capitalizedLastName = createForm.lastName.charAt(0).toUpperCase() + createForm.lastName.slice(1).toLowerCase();
      const capitalizedMiddleName = createForm.middleName ? createForm.middleName.charAt(0).toUpperCase() + createForm.middleName.slice(1).toLowerCase() : '';

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
          first_name: capitalizedFirstName,
          middle_name: capitalizedMiddleName,
          last_name: capitalizedLastName,
          student_type: createForm.studentType,
          year_level: String(createForm.yearLevel),
          school_year: createForm.schoolYear,
          student_id: originalStudentId,
          department: createForm.department,
          semester: createForm.semester,
          section: createForm.section || null,
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
        handleCloseCreateDialog();
        setCreateForm({ firstName: '', middleName: '', lastName: '', email: '', password: 'TempPass@123', studentType: 'Freshman', yearLevel: 1, schoolYear: getDefaultSchoolYear(), studentId: '', department: 'BSIT', semester: '1st Semester', section: '' });
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
            first_name: capitalizedFirstName,
            last_name: capitalizedLastName
          }
        }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create auth user');
      
      // 3. Create user profile with the auth user ID
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user!.id, // Use the auth user ID
        email: fullEmail,
        first_name: capitalizedFirstName,
        middle_name: capitalizedMiddleName,
        last_name: capitalizedLastName,
        role: 'student',
        is_active: true,
        student_type: createForm.studentType,
        year_level: String(createForm.yearLevel),
        school_year: createForm.schoolYear,
        student_id: createForm.studentId,
        department: createForm.department,
        semester: createForm.semester,
        section: createForm.section || null,
        enrollment_status: 'pending',
        password_changed: false, // Initialize as false since they're using default password
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;
      // Insert enrollments for selected courses
      if (selectedCourses.length > 0) {
        const enrollments = selectedCourses.map(courseId => ({
          student_id: authData.user!.id, // Use the auth user ID directly
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
      setCreateForm({ firstName: '', middleName: '', lastName: '', email: '', password: 'TempPass@123', studentType: 'Freshman', yearLevel: 1, schoolYear: getDefaultSchoolYear(), studentId: '', department: 'BSIT', semester: '1st Semester', section: '' });
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
  const categorizeCourses = (courses: Array<{
    id: string;
    code: string;
    name: string;
    units: number;
    year_level?: string;
  }>) => {
    const categories: Record<string, Record<string, Array<{
      id: string;
      code: string;
      name: string;
      units: number;
      year_level?: string;
    }>>> = {};
    courses.forEach((course) => {
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
    
    // Apply search filter
    if (courseSearch.trim() !== '') {
      const search = courseSearch.trim().toLowerCase();
      filteredCourses = courses.filter(
        (c: { id: string; code: string; name: string; units: number; year_level?: string; status?: string }) =>
          c.code.toLowerCase().includes(search) || c.name.toLowerCase().includes(search)
      );
    }

    // Filter courses based on instructor assignments for the selected section
    if (createForm.section && createForm.section !== '') {
      const yearMap: Record<string, string> = {
        '1': '1st Year',
        '2': '2nd Year',
        '3': '3rd Year',
        '4': '4th Year',
      };
      const yearLabel = yearMap[String(createForm.yearLevel)] || '1st Year';
      
      // Convert section ID to section name for comparison
      const selectedSectionName = getSectionName(createForm.section);
      
      // Get course IDs that have instructors assigned to the selected section and year level
      const currentAcademicYear = createForm.schoolYear || getDefaultSchoolYear();
      const currentSemester = createForm.semester || '1st Semester';
      
      const availableCourseIds = instructorAssignments
        .filter(assignment => 
          assignment.section === selectedSectionName &&
          assignment.year_level === yearLabel &&
          assignment.academic_year === currentAcademicYear &&
          assignment.semester === currentSemester &&
          assignment.is_active
        )
        .map(assignment => assignment.subject_id);

      // Filter courses to only show those with instructor assignments
      filteredCourses = filteredCourses.filter(course => 
        availableCourseIds.includes(course.id)
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
    const yearLabel = yearMap[String(createForm.yearLevel)] || '1st Year';
    const filtered: Record<string, Record<string, Array<{
      id: string;
      code: string;
      name: string;
      units: number;
      year_level?: string;
    }>>> = {};
    if (categorized['Major'] && categorized['Major'][yearLabel]) {
      filtered['Major'] = { [yearLabel]: categorized['Major'][yearLabel] };
    }
    if (categorized['Minor']) {
      filtered['Minor'] = categorized['Minor'];
    }
    return filtered;
  };

  const visibleCourses = useMemo(() => getVisibleCourses(), [courses, createForm, courseSearch, allowMixedCourses, instructorAssignments]);

  // Filtered students
  const filteredStudents = useMemo(() => students.filter(student => {
    const matchesSearch =
      filterSearch === '' ||
      student.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      (student.id && student.id.toLowerCase().includes(filterSearch.toLowerCase()));
    const matchesYear = filterYear === '' || String(student.yearLevel) === filterYear;
    const matchesType = filterType === '' || student.studentType === filterType;
    const matchesStatus = filterStatus === '' || (student.status && student.status.toLowerCase() === filterStatus.toLowerCase());
    const matchesSection = filterSection === '' || student.section === filterSection;
    return matchesSearch && matchesYear && matchesType && matchesStatus && matchesSection;
  }), [students, filterSearch, filterYear, filterType, filterStatus, filterSection]);

  // Handler to save edited student
  const handleSaveEdit = async () => {
    if (!editForm) return;
    setSavingEdit(true);
    try {
      // Capitalize first letter of first name and last name
      const capitalizedFirstName = editFormFields.firstName.charAt(0).toUpperCase() + editFormFields.firstName.slice(1).toLowerCase();
      const capitalizedLastName = editFormFields.lastName.charAt(0).toUpperCase() + editFormFields.lastName.slice(1).toLowerCase();
      const capitalizedMiddleName = editFormFields.middleName ? editFormFields.middleName.charAt(0).toUpperCase() + editFormFields.middleName.slice(1).toLowerCase() : '';

      const { error } = await supabase.from('user_profiles').update({
        first_name: capitalizedFirstName,
        middle_name: capitalizedMiddleName,
        last_name: capitalizedLastName,
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
      setEditFormFields({ firstName: '', middleName: '', lastName: '' });
      loadEnrollments();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update student';
      toast.error(errorMessage);
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

  // Handler to close create dialog and clear existing student selection
  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setSelectedExistingStudent(null);
  };

  // Handler to enroll existing student
  const handleEnrollExisting = (student: Student) => {
    setSelectedExistingStudent(student);
    
    // Parse the student name to handle middle names
    const nameParts = student.name.split(' ');
    let firstName = '';
    let middleName = '';
    let lastName = '';
    
    if (nameParts.length === 1) {
      lastName = nameParts[0];
    } else if (nameParts.length === 2) {
      firstName = nameParts[1];
      lastName = nameParts[0];
    } else if (nameParts.length >= 3) {
      firstName = nameParts[nameParts.length - 1]; // Last part is first name
      lastName = nameParts[0]; // First part is last name
      middleName = nameParts.slice(1, nameParts.length - 1).join(' '); // Everything in between is middle name
    }
    
    // Try to determine if student.section is already an ID or a name
    let sectionId = '';
    if (sections.length > 0) {
      // Check if student.section is already a section ID
      const isSectionId = sections.some(s => s.id === student.section);
      if (isSectionId) {
        sectionId = student.section || '';
      } else {
        // Convert section name to section ID
        sectionId = getSectionId(student.section) || '';
      }
    }
    
    setCreateForm({
      firstName,
      middleName,
      lastName,
      email: '', // Not editable
      password: 'TempPass@123', // Not editable
      studentType: student.studentType,
      yearLevel: student.yearLevel,
      schoolYear: student.schoolYear,
      studentId: student.id, // Always use the original student.id
      department: student.department,
      semester: student.semester,
      section: sectionId, // Use determined section ID
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end semester';
      toast.error(errorMessage);
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

  // Handler to open prospectus modal
  const handleOpenProspectusModal = (student: Student) => {
    setSelectedStudentForProspectus(student);
    setIsProspectusModalOpen(true);
    // We need to get the UUID from user_profiles since student.id contains the formatted student_id
    fetchStudentGradesByFormattedId(student.id);
    fetchStudentEnrollmentsByFormattedId(student.id);
    fetchStudentConfirmations(student.id);
  };

  // Handler to close prospectus modal
  const handleCloseProspectusModal = () => {
    setIsProspectusModalOpen(false);
    setSelectedStudentForProspectus(null);
    setStudentGrades([]);
  };

  // Handler to confirm subject for program head
  const handleConfirmSubject = async (subjectCode: string) => {
    if (!selectedStudentForProspectus) return;
    
    try {
      // Get the UUID from user_profiles using the formatted student_id
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('student_id', selectedStudentForProspectus.id)
        .single();
      
      if (profileError) {
        console.error('Error finding user profile:', profileError);
        toast.error('Failed to find student profile');
        return;
      }
      
      // Insert confirmation into Supabase
      const { error } = await supabase
        .from('subject_actions')
        .insert({
          student_id: profileData.id,
          subject_code: subjectCode,
          action_type: 'confirm',
          status: 'pending'
        });

      if (error) {
        console.error('Error saving confirmation:', error);
        toast.error('Failed to confirm subject');
        return;
      }

      // Refresh the prospectus data
      await fetchStudentConfirmations(selectedStudentForProspectus.id);
      toast.success('Subject confirmed successfully');
    } catch (error) {
      console.error('Error confirming subject:', error);
      toast.error('Failed to confirm subject');
    }
  };

  // Function to fetch student grades
  const fetchStudentGrades = async (studentId: string) => {
    try {
      setLoadingGrades(true);
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select(`
          *,
          course:courses (code, name)
        `)
        .eq('student_id', studentId);

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

  const fetchStudentGradesByFormattedId = async (formattedStudentId: string) => {
    try {
      setLoadingGrades(true);
      console.log('Fetching grades for formatted student ID:', formattedStudentId);
      
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
      
      console.log('Found profile with UUID:', profileData?.id);
      
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
      console.error('Error fetching student grades by formatted ID:', error);
    } finally {
      setLoadingGrades(false);
    }
  };

  // Helper function to get grades for a specific subject
  const getSubjectGrades = (subjectCode: string) => {
    return studentGrades.find(grade => grade.subject_code === subjectCode);
  };

  // Helper function to calculate average grade
  const calculateAverageGrade = (prelim: number | null, midterm: number | null, final: number | null) => {
    const grades = [prelim, midterm, final].filter(grade => grade !== null && grade !== undefined);
    if (grades.length === 0) return null;
    
    const sum = grades.reduce((acc, grade) => acc + (grade || 0), 0);
    return Math.round((sum / grades.length) * 100) / 100; // Round to 2 decimal places
  };

  // Fetch enrollment selections to compute enrollment status per subject
  const [studentEnrollments, setStudentEnrollments] = useState<Array<{ subject_id: string; status: string; subject?: { code: string } }>>([]);
  const [studentConfirmations, setStudentConfirmations] = useState<Array<{ subject_code: string; status: string }>>([]);
  const fetchStudentEnrollments = async (studentId: string) => {
    try {
      console.log('Fetching enrollments for student UUID:', studentId);
      
      const { data, error } = await supabase
        .from('enrollcourse')
        .select(`
          subject_id, 
          status,
          subject:courses(code)
        `)
        .eq('student_id', studentId);
      
      if (error) {
        console.error('Error fetching enrollments:', error);
        return;
      }
      
      console.log('Raw enrollment data:', data);
      if (data) {
        setStudentEnrollments(data as any);
        console.log('Processed enrollments:', data);
      }
    } catch (e) {
      console.error('Error fetching enrollments', e);
    }
  };

  const fetchStudentEnrollmentsByFormattedId = async (formattedStudentId: string) => {
    try {
      console.log('Fetching enrollments for formatted student ID:', formattedStudentId);
      
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
      
      console.log('Found profile with UUID:', profileData?.id);
      
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
      
      console.log('Raw enrollment data:', data);
      if (data) {
        setStudentEnrollments(data as any);
        console.log('Processed enrollments:', data);
      }
    } catch (e) {
      console.error('Error fetching enrollments by formatted ID', e);
    }
  };

  // Function to fetch student confirmations
  const fetchStudentConfirmations = async (formattedStudentId: string) => {
    try {
      console.log('Fetching confirmations for formatted student ID:', formattedStudentId);
      
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
      
      console.log('Found profile with UUID:', profileData?.id);
      
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
      
      console.log('Raw confirmation data:', data);
      if (data) {
        setStudentConfirmations(data);
        console.log('Processed confirmations:', data);
      }
    } catch (e) {
      console.error('Error fetching confirmations by formatted ID', e);
    }
  };
  
  const getEnrollmentStatus = (courseId: string, courseCode?: string) => {
    // Try to find by subject_id first, then by subject code as fallback
    let rec = studentEnrollments.find(e => e.subject_id === courseId);
    
    if (!rec && courseCode) {
      rec = studentEnrollments.find(e => e.subject?.code === courseCode);
    }
    
    return rec?.status || 'not enrolled';
  };

  // Helper function to get confirmation status for a subject
  const getConfirmationStatus = (subjectCode: string) => {
    const confirmation = studentConfirmations.find(c => c.subject_code === subjectCode);
    console.log(`Checking confirmation for ${subjectCode}:`, confirmation ? 'confirmed' : 'pending');
    return confirmation ? 'confirmed' : 'pending';
  };

  // Helper functions for course selection
  const getTotalAvailableCourses = () => {
    return Object.values(visibleCourses).reduce((total, subcats) => {
      return total + Object.values(subcats as Record<string, unknown[]>).reduce((subTotal, courseList) => {
        return subTotal + (courseList as any[]).length;
      }, 0);
    }, 0);
  };

  const getAllAvailableCourseIds = () => {
    const allIds: string[] = [];
    Object.values(visibleCourses).forEach(subcats => {
      Object.values(subcats as Record<string, unknown[]>).forEach(courseList => {
        (courseList as any[]).forEach(course => {
          allIds.push(course.id);
        });
      });
    });
    return allIds;
  };

  // Helper to reset the new student form
  const flushNewStudentForm = () => {
    setCreateForm({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      password: 'TempPass@123',
      studentType: 'Freshman',
      yearLevel: 1,
      schoolYear: getDefaultSchoolYear(),
      studentId: '',
      department: 'BSIT',
      semester: '1st Semester',
      section: '',
    });
    setSelectedCourses([]);

    
    setAllowMixedCourses(false);
  };

  // Print handler
  const handlePrintProspectus = () => {
    if (prospectusContentRef.current) {
      const printContents = prospectusContentRef.current.innerHTML;
      const printWindow = window.open('', '', 'height=800,width=1200');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Student Prospectus</title>');
        printWindow.document.write(`
          <style>
            @media print {
              body { 
                font-family: 'Arial', 'Helvetica', sans-serif; 
                font-size: 10px;
                line-height: 1.2;
                color: #000;
                margin: 0;
                padding: 15px;
                background: white;
              }
              
              /* Header Styling */
              .prospectus-header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #333;
              }
              
              .school-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 3px;
                color: #1e40af;
              }
              
              .school-subtitle {
                font-size: 10px;
                font-style: italic;
                margin-bottom: 3px;
                color: #666;
              }
              
              .school-address {
                font-size: 9px;
                margin-bottom: 3px;
                color: #333;
              }
              
              .course-title {
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 3px;
                color: #1e40af;
              }
              
              .prospectus-title {
                font-size: 18px;
                font-weight: bold;
                margin: 15px 0;
                color: #1f2937;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              /* Student Info Styling */
              .student-info {
                margin: 15px 0;
                padding: 10px;
                background: #f8fafc;
                border: 1px solid #e5e7eb;
                border-radius: 3px;
              }
              
              .student-name {
                font-size: 14px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 10px;
                color: #1f2937;
              }
              
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 5px;
              }
              
              .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 3px 0;
                border-bottom: 0.5px solid #e5e7eb;
              }
              
              .info-label {
                font-weight: 600;
                color: #374151;
                min-width: 100px;
                font-size: 9px;
              }
              
              .info-value {
                font-weight: 500;
                color: #1f2937;
                text-align: right;
                font-size: 9px;
              }
              
              /* Table Styling */
              .prospectus-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-size: 8px;
                page-break-inside: avoid;
                border: 1px solid #374151;
              }
              
              .prospectus-table th {
                background: #1e40af;
                color: white;
                font-weight: 700;
                text-align: center;
                padding: 6px 2px;
                border: 1px solid #374151;
                font-size: 7px;
                vertical-align: middle;
                position: relative;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .prospectus-table th:not(:last-child)::after {
                content: '';
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 1px;
                background: #374151;
              }
              
              .prospectus-table td {
                padding: 3px 2px;
                border: 1px solid #374151;
                text-align: center;
                vertical-align: middle;
                font-size: 7px;
                position: relative;
              }
              
              .prospectus-table td:not(:last-child)::after {
                content: '';
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 1px;
                background: #374151;
              }
              
              .prospectus-table tr:not(:last-child) td::before {
                content: '';
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                height: 1px;
                background: #374151;
              }
              
              .prospectus-table .subject-code {
                font-weight: 600;
                font-family: 'Courier New', monospace;
                color: #1e40af;
                text-align: left;
                padding-left: 4px;
                font-size: 7px;
              }
              
              .prospectus-table .subject-name {
                text-align: left;
                padding-left: 4px;
                color: #374151;
                max-width: 150px;
                word-wrap: break-word;
                font-size: 7px;
                line-height: 1.1;
              }
              
              .prospectus-table .units {
                font-weight: 600;
                color: #059669;
                font-size: 7px;
              }
              
              .prospectus-table .lec-lab {
                font-weight: 600;
                color: #0369a1;
                font-size: 7px;
              }
              
              .prospectus-table .hours {
                font-weight: 600;
                color: #7c3aed;
                font-size: 7px;
              }
              
              .prospectus-table .type {
                font-size: 6px;
                font-weight: 600;
                padding: 1px 2px;
                border-radius: 2px;
                text-transform: uppercase;
              }
              
              .prospectus-table .type.major {
                background: #dbeafe;
                color: #1e40af;
              }
              
              .prospectus-table .type.minor {
                background: #fef3c7;
                color: #92400e;
              }
              
              .prospectus-table .grade {
                font-weight: 700;
                color: #0ea5e9;
                background: #f0f9ff;
                padding: 1px 3px;
                border-radius: 2px;
                border: 0.5px solid #0ea5e9;
                font-size: 7px;
              }
              
              .prospectus-table .no-grade {
                font-size: 6px;
                color: #6b7280;
                font-style: italic;
              }
              
              .prospectus-table .prerequisites {
                font-size: 6px;
                color: #92400e;
                max-width: 80px;
                word-wrap: break-word;
                line-height: 1.1;
              }
              
              .prospectus-table .status {
                font-size: 6px;
                font-weight: 600;
                padding: 1px 3px;
                border-radius: 2px;
                text-transform: capitalize;
              }
              
              .prospectus-table .status.confirmed {
                background: #dcfce7;
                color: #166534;
              }
              
              .prospectus-table .status.pending {
                background: #e5e7eb;
                color: #374151;
              }
              
              /* Year Level Section Styling */
              .year-section {
                margin: 20px 0;
                page-break-inside: avoid;
              }
              
              .year-header {
                background: #f3f4f6;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-bottom: 1px solid #667eea;
                margin-bottom: 0;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              
              .year-number {
                background: #667eea;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
              }
              
              .year-title {
                font-size: 14px;
                font-weight: 700;
                color: #374151;
                margin: 0;
              }
              
              .year-stats {
                margin-left: auto;
                display: flex;
                gap: 10px;
              }
              
              .stat-item {
                background: #e0e7ef;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 9px;
                color: #374151;
                font-weight: 500;
              }
              
              /* Semester Section Styling */
              .semester-section {
                margin: 10px 0;
                page-break-inside: avoid;
              }
              
              .semester-header {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background: #f8fafc;
                border-left: 3px solid #3b82f6;
                margin: 10px 0 8px 0;
              }
              
              .semester-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #3b82f6;
              }
              
              .semester-title {
                font-size: 10px;
                font-weight: 700;
                color: #1f2937;
                margin: 0;
              }
              
              /* Summer Section */
              .semester-header.summer {
                border-left-color: #f59e0b;
              }
              
              .semester-header.summer .semester-dot {
                background: #f59e0b;
              }
              
              /* Page Break Controls */
              .page-break {
                page-break-before: always;
              }
              
              .avoid-break {
                page-break-inside: avoid;
              }
              
              /* Footer */
              .prospectus-footer {
                margin-top: 20px;
                padding-top: 15px;
                border-top: 0.5px solid #e5e7eb;
                text-align: center;
                font-size: 8px;
                color: #6b7280;
              }
              
              /* Alternating row colors for better readability */
              .prospectus-table tr:nth-child(even) {
                background-color: #f8fafc;
              }
              
              .prospectus-table tr:nth-child(odd) {
                background-color: #ffffff;
              }
              
              /* Enhanced table styling */
              .prospectus-table td {
                padding: 4px 3px;
                min-height: 20px;
              }
              
              .prospectus-table th {
                padding: 6px 3px;
              }
              
              /* Better spacing for content */
              .prospectus-table .subject-name {
                line-height: 1.2;
                max-width: 160px;
              }
              
              .prospectus-table .prerequisites {
                max-width: 90px;
                line-height: 1.2;
              }
              
              /* Responsive adjustments for print */
              @page {
                margin: 0.75in;
                size: A4;
              }
              
              /* Hide elements not needed in print */
              .no-print {
                display: none !important;
              }
            }
            
            /* Screen styles for preview */
            @media screen {
              body { 
                font-family: 'Arial', 'Helvetica', sans-serif; 
                font-size: 10px;
                line-height: 1.2;
                color: #000;
                margin: 0;
                padding: 15px;
                background: white;
              }
              
              .prospectus-header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #333;
              }
              
              .school-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 3px;
                color: #1e40af;
              }
              
              .school-subtitle {
                font-size: 10px;
                font-style: italic;
                margin-bottom: 3px;
                color: #666;
              }
              
              .school-address {
                font-size: 9px;
                margin-bottom: 3px;
                color: #333;
              }
              
              .course-title {
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 3px;
                color: #1e40af;
              }
              
              .prospectus-title {
                font-size: 18px;
                font-weight: bold;
                margin: 15px 0;
                color: #1f2937;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .student-info {
                margin: 15px 0;
                padding: 10px;
                background: #f8fafc;
                border: 1px solid #e5e7eb;
                border-radius: 3px;
              }
              
              .student-name {
                font-size: 14px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 10px;
                color: #1f2937;
              }
              
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 5px;
              }
              
              .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 3px 0;
                border-bottom: 0.5px solid #e5e7eb;
              }
              
              .info-label {
                font-weight: 600;
                color: #374151;
                min-width: 100px;
                font-size: 9px;
              }
              
              .info-value {
                font-weight: 500;
                color: #1f2937;
                text-align: right;
                font-size: 9px;
              }
              
              .prospectus-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-size: 8px;
                border: 1px solid #374151;
              }
              
              .prospectus-table th {
                background: #1e40af;
                color: white;
                font-weight: 700;
                text-align: center;
                padding: 6px 2px;
                border: 1px solid #374151;
                font-size: 7px;
                vertical-align: middle;
                position: relative;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .prospectus-table th:not(:last-child)::after {
                content: '';
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 1px;
                background: #374151;
              }
              
              .prospectus-table td {
                padding: 3px 2px;
                border: 1px solid #374151;
                text-align: center;
                vertical-align: middle;
                font-size: 7px;
                position: relative;
              }
              
              .prospectus-table td:not(:last-child)::after {
                content: '';
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 1px;
                background: #374151;
              }
              
              .prospectus-table tr:not(:last-child) td::before {
                content: '';
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                height: 1px;
                background: #374151;
              }
              
              .prospectus-table .subject-code {
                font-weight: 600;
                font-family: 'Courier New', monospace;
                color: #1e40af;
                text-align: left;
                padding-left: 4px;
                font-size: 7px;
              }
              
              .prospectus-table .subject-name {
                text-align: left;
                padding-left: 4px;
                color: #374151;
                max-width: 150px;
                word-wrap: break-word;
                font-size: 7px;
                line-height: 1.1;
              }
              
              .prospectus-table .units {
                font-weight: 600;
                color: #059669;
                font-size: 7px;
              }
              
              .prospectus-table .lec-lab {
                font-weight: 600;
                color: #0369a1;
                font-size: 7px;
              }
              
              .prospectus-table .hours {
                font-weight: 600;
                color: #7c3aed;
                font-size: 7px;
              }
              
              .prospectus-table .type {
                font-size: 6px;
                font-weight: 600;
                padding: 1px 2px;
                border-radius: 2px;
                text-transform: uppercase;
              }
              
              .prospectus-table .type.major {
                background: #dbeafe;
                color: #1e40af;
              }
              
              .prospectus-table .type.minor {
                background: #fef3c7;
                color: #92400e;
              }
              
              .prospectus-table .grade {
                font-weight: 700;
                color: #0ea5e9;
                background: #f0f9ff;
                padding: 1px 3px;
                border-radius: 2px;
                border: 0.5px solid #0ea5e9;
                font-size: 7px;
              }
              
              .prospectus-table .no-grade {
                font-size: 6px;
                color: #6b7280;
                font-style: italic;
              }
              
              .prospectus-table .prerequisites {
                font-size: 6px;
                color: #92400e;
                max-width: 80px;
                word-wrap: break-word;
                line-height: 1.1;
              }
              
              .prospectus-table .status {
                font-size: 6px;
                font-weight: 600;
                padding: 1px 3px;
                border-radius: 2px;
                text-transform: capitalize;
              }
              
              .prospectus-table .status.confirmed {
                background: #dcfce7;
                color: #166534;
              }
              
              .prospectus-table .status.pending {
                background: #e5e7eb;
                color: #374151;
              }
              
              .year-section {
                margin: 20px 0;
              }
              
              .year-header {
                background: #f3f4f6;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-bottom: 1px solid #667eea;
                margin-bottom: 0;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              
              .year-number {
                background: #667eea;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
              }
              
              .year-title {
                font-size: 14px;
                font-weight: 700;
                color: #374151;
                margin: 0;
              }
              
              .year-stats {
                margin-left: auto;
                display: flex;
                gap: 10px;
              }
              
              .stat-item {
                background: #e0e7ef;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 9px;
                color: #374151;
                font-weight: 500;
              }
              
              .semester-section {
                margin: 10px 0;
              }
              
              .semester-header {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background: #f8fafc;
                border-left: 3px solid #3b82f6;
                margin: 10px 0 8px 0;
              }
              
              .semester-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #3b82f6;
              }
              
              .semester-title {
                font-size: 10px;
                font-weight: 700;
                color: #1f2937;
                margin: 0;
              }
              
              .semester-header.summer {
                border-left-color: #f59e0b;
              }
              
              .semester-header.summer .semester-dot {
                background: #f59e0b;
              }
              
              .prospectus-footer {
                margin-top: 20px;
                padding-top: 15px;
                border-top: 0.5px solid #e5e7eb;
                text-align: center;
                font-size: 8px;
                color: #6b7280;
              }
              
              /* Alternating row colors for better readability */
              .prospectus-table tr:nth-child(even) {
                background-color: #f8fafc;
              }
              
              .prospectus-table tr:nth-child(odd) {
                background-color: #ffffff;
              }
              
              /* Hover effect for rows */
              .prospectus-table tr:hover {
                background-color: #f0f9ff !important;
              }
            }
          </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  // PDF handler - Generate proper PDF instead of screenshot
  const handleDownloadPDF = async () => {
    if (prospectusContentRef.current) {
      try {
      const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (2 * margin);
        let currentY = margin;
        
        // Set font styles
        pdf.setFont('helvetica');
        
        // Header Section
        pdf.setFontSize(18);
        pdf.setTextColor(30, 64, 175); // #1e40af
        pdf.text('St. Mary\'s College of Bansalan, Inc.', pageWidth / 2, currentY, { align: 'center' });
        currentY += 8;
        
        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128); // #6b7280
        pdf.text('(Formerly: Holy Cross of Bansalan College, Inc.)', pageWidth / 2, currentY, { align: 'center' });
        currentY += 6;
        
        pdf.setTextColor(55, 65, 81); // #374151
        pdf.text('Dahlia Street, Poblacion Uno, Bansalan, Davao del Sur, 8005 Philippines', pageWidth / 2, currentY, { align: 'center' });
        currentY += 8;
        
        pdf.setFontSize(12);
        pdf.setTextColor(30, 64, 175); // #1e40af
        pdf.text('BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY (BSIT)', pageWidth / 2, currentY, { align: 'center' });
        currentY += 6;
        
        pdf.setFontSize(9);
        pdf.setTextColor(55, 65, 81); // #374151
        pdf.text('Effective SY 2020 - 2021', pageWidth / 2, currentY, { align: 'center' });
        currentY += 12;
        
        // Title
        pdf.setFontSize(16);
        pdf.setTextColor(30, 64, 175); // #1e40af
        pdf.text('STUDENT PROSPECTUS', pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;
        
        // Student Information
        if (selectedStudentForProspectus) {
          pdf.setFontSize(14);
          pdf.setTextColor(31, 41, 55); // #1f2937
          pdf.text(selectedStudentForProspectus.name, pageWidth / 2, currentY, { align: 'center' });
          currentY += 12;
          
          // Student details box
          const detailsY = currentY;
          pdf.setFillColor(240, 249, 255); // #f0f9ff
          pdf.rect(margin, currentY - 5, contentWidth, 25, 'F');
          pdf.setDrawColor(186, 230, 253); // #bae6fd
          pdf.rect(margin, currentY - 5, contentWidth, 25, 'D');
          
          currentY += 5;
          pdf.setFontSize(9);
          pdf.setTextColor(55, 65, 81); // #374151
          
          // Student ID
          pdf.text('Student ID:', margin + 5, currentY);
          pdf.setTextColor(31, 41, 55); // #1f2937
          pdf.text(selectedStudentForProspectus.id, margin + 80, currentY);
          currentY += 5;
          
          // Student Type
          pdf.setTextColor(55, 65, 81); // #374151
          pdf.text('Student Type:', margin + 5, currentY);
          pdf.setTextColor(31, 41, 55); // #1f2937
          pdf.text(selectedStudentForProspectus.studentType, margin + 80, currentY);
          currentY += 5;
          
          // Year Level
          pdf.setTextColor(55, 65, 81); // #374151
          pdf.text('Current Year Level:', margin + 5, currentY);
          pdf.setTextColor(31, 41, 55); // #1f2937
          pdf.text(String(selectedStudentForProspectus.yearLevel), margin + 80, currentY);
          currentY += 5;
          
          // Department
          pdf.setTextColor(55, 65, 81); // #374151
          pdf.text('Department:', margin + 5, currentY);
          pdf.setTextColor(31, 41, 55); // #1f2937
          pdf.text(selectedStudentForProspectus.department, margin + 80, currentY);
          
          currentY = detailsY + 30;
        }
        
        // Subjects Section
        pdf.setFontSize(12);
        pdf.setTextColor(31, 41, 55); // #1f2937
        pdf.text('Subjects', margin, currentY);
        currentY += 8;
        
        // Check if we need to add a new page
        if (currentY > pageHeight - 50) {
          pdf.addPage();
          currentY = margin;
        }
        
        // Generate subjects content
        if (courses && courses.length > 0) {
          // Group courses by year level
          const coursesByYear: Record<string, typeof courses> = {};
          courses.forEach(course => {
            const yearLevel = course.year_level || '1';
            if (!coursesByYear[yearLevel]) {
              coursesByYear[yearLevel] = [];
            }
            coursesByYear[yearLevel].push(course);
          });
          
          // Process each year level
          Object.keys(coursesByYear).sort().forEach(yearLevel => {
            const yearCourses = coursesByYear[yearLevel];
            const yearLabel = getYearLabel(yearLevel);
            
            // Check if we need a new page
            if (currentY > pageHeight - 80) {
              pdf.addPage();
              currentY = margin;
            }
            
            // Year header
            pdf.setFillColor(243, 244, 246); // #f3f4f6
            pdf.rect(margin, currentY - 3, contentWidth, 12, 'F');
            pdf.setDrawColor(102, 126, 234); // #667eea
            pdf.rect(margin, currentY - 3, contentWidth, 12, 'D');
            
            pdf.setFontSize(10);
            pdf.setTextColor(31, 41, 55); // #1f2937
            pdf.text(`${yearLabel} Subjects`, margin + 5, currentY + 3);
            
            // Year stats
            const totalUnits = yearCourses.reduce((sum: number, course: any) => sum + (course.units || 0), 0);
            pdf.setFontSize(8);
            pdf.setTextColor(107, 114, 128); // #6b7280
            pdf.text(`${yearCourses.length} subjects, ${totalUnits} units`, pageWidth - margin - 5, currentY + 3, { align: 'right' });
            
            currentY += 15;
            
            // Check if we need a new page for the table
            if (currentY > pageHeight - 60) {
              pdf.addPage();
              currentY = margin;
            }
            
            // Table headers
            const headers = ['Code', 'Name', 'Units', 'LEC', 'LAB', 'Hours', 'Type', 'Grade', 'Prereq', 'Status'];
            const colWidths = [20, 50, 15, 15, 15, 20, 20, 20, 25, 20];
            let colX = margin;
            
            // Draw header background
            pdf.setFillColor(30, 64, 175); // #1e40af
            pdf.rect(colX, currentY - 3, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
            
            // Header text
            pdf.setFontSize(7);
            pdf.setTextColor(255, 255, 255);
            headers.forEach((header, index) => {
              pdf.text(header, colX + 2, currentY + 2);
              colX += colWidths[index];
            });
            
            currentY += 10;
            
            // Table rows
            yearCourses.forEach((course: any, index: number) => {
              // Check if we need a new page
              if (currentY > pageHeight - 20) {
                pdf.addPage();
                currentY = margin;
                
                // Redraw headers on new page
                colX = margin;
                pdf.setFillColor(30, 64, 175);
                pdf.rect(colX, currentY - 3, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
                
                pdf.setFontSize(7);
                pdf.setTextColor(255, 255, 255);
                headers.forEach((header, idx) => {
                  pdf.text(header, colX + 2, currentY + 2);
                  colX += colWidths[idx];
                });
                
                currentY += 10;
              }
              
              // Row background (alternating)
              if (index % 2 === 0) {
                pdf.setFillColor(248, 250, 252); // #f8fafc
                pdf.rect(margin, currentY - 2, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
              }
              
              // Row content
              colX = margin;
              pdf.setFontSize(6);
              pdf.setTextColor(31, 41, 55); // #1f2937
              
              // Subject Code
              pdf.text(course.code || '', colX + 2, currentY + 2);
              colX += colWidths[0];
              
              // Subject Name
              const courseName = course.name || '';
              if (courseName.length > 25) {
                pdf.text(courseName.substring(0, 22) + '...', colX + 2, currentY + 2);
              } else {
                pdf.text(courseName, colX + 2, currentY + 2);
              }
              colX += colWidths[1];
              
              // Units
              pdf.text(String(course.units || 0), colX + 2, currentY + 2);
              colX += colWidths[2];
              
              // LEC
              pdf.text(String(course.lec_units || 0), colX + 2, currentY + 2);
              colX += colWidths[3];
              
              // LAB
              pdf.text(String(course.lab_units || 0), colX + 2, currentY + 2);
              colX += colWidths[4];
              
              // Hours
              pdf.text(String(course.hours_per_week || 0), colX + 2, currentY + 2);
              colX += colWidths[5];
              
              // Type
              const courseType = course.code && course.code.startsWith('IT') ? 'Major' : 'Minor';
              pdf.text(courseType, colX + 2, currentY + 2);
              colX += colWidths[6];
              
              // Grade
              const subjectGrades = getSubjectGrades(course.code);
              if (subjectGrades && (subjectGrades.prelim_grade || subjectGrades.midterm_grade || subjectGrades.final_grade)) {
                const avgGrade = calculateAverageGrade(
                  subjectGrades.prelim_grade || null,
                  subjectGrades.midterm_grade || null,
                  subjectGrades.final_grade || null
                );
                pdf.text(String(avgGrade || 'N/A'), colX + 2, currentY + 2);
              } else {
                pdf.text('No grade', colX + 2, currentY + 2);
              }
              colX += colWidths[7];
              
              // Prerequisites
              if (course.prerequisites && course.prerequisites.length > 0) {
                const prereqText = course.prerequisites.join(', ');
                if (prereqText.length > 20) {
                  pdf.text(prereqText.substring(0, 17) + '...', colX + 2, currentY + 2);
                } else {
                  pdf.text(prereqText, colX + 2, currentY + 2);
                }
              } else {
                pdf.text('None', colX + 2, currentY + 2);
              }
              colX += colWidths[8];
              
              // Status
              const enrollmentStatus = getEnrollmentStatus(course.id, course.code);
              const statusText = enrollmentStatus === 'active' ? 'Enrolled' : 'Not enrolled';
              pdf.text(statusText, colX + 2, currentY + 2);
              
              currentY += 10;
            });
            
            currentY += 5;
          });
        } else {
          pdf.setFontSize(10);
          pdf.setTextColor(107, 114, 128); // #6b7280
          pdf.text('No courses available', pageWidth / 2, currentY, { align: 'center' });
        }
        
        // Footer
        const totalPages = (pdf as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(8);
          pdf.setTextColor(107, 114, 128); // #6b7280
          pdf.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
          pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        }
        
        // Save the PDF
      pdf.save('student_prospectus.pdf');
        
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate PDF. Please try again.');
      }
    }
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
      position: 'relative'
    }}>
      {/* Header Section */}
      <Box sx={{ 
        mb: 4, 
        background: 'linear-gradient(to right, #2563eb, #9333ea)',
        px: 3,
        py: 2,
        borderRadius: 4,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 1.5
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              color: 'white',
              letterSpacing: '-0.025em',
              fontSize: '1.5rem'
            }}>
              Enrollment Management
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              fontSize: '0.875rem',
              fontWeight: 500
            }}>
              Manage student enrollments, course assignments, and academic status
            </Typography>
          </Box>
        </Box>
       
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

          {/* Enroll New Student - Temporarily Hidden */}
          {<Card sx={{ 
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
          </Card>}
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
                    Section
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
                    <TableCell sx={{ 
                      fontWeight: 500,
                      fontSize: '0.875rem'
                    }}>
                      {getSectionName(student.section)}
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
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleOpenProspectusModal(student)}
                          title="View Prospectus"
                          sx={{
                            borderRadius: 2,
                            px: 2,
                            py: 0.5,
                            fontWeight: 600,
                            borderColor: '#10b981',
                            color: '#10b981',
                            '&:hover': {
                              borderColor: '#059669',
                              backgroundColor: '#f0fdf4',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ fontSize: '0.8rem' }}>📋</Box>
                            Prospectus
                          </Box>
                        </Button>
                      </Box>
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
          handleCloseCreateDialog();
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
                    <Grid item xs={12} sm={4}>
                      <TextField 
                        label="First Name" 
                        value={createForm.firstName} 
                        onChange={e => {
                          const value = e.target.value;
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                          setCreateForm(f => ({ ...f, firstName: capitalized }));
                        }}
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
                    <Grid item xs={12} sm={4}>
                      <TextField 
                        label="Middle Name" 
                        value={createForm.middleName} 
                        onChange={e => {
                          const value = e.target.value;
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                          setCreateForm(f => ({ ...f, middleName: capitalized }));
                        }}
                        fullWidth 
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
                    <Grid item xs={12} sm={4}>
                      <TextField 
                        label="Last Name" 
                        value={createForm.lastName} 
                        onChange={e => {
                          const value = e.target.value;
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                          setCreateForm(f => ({ ...f, lastName: capitalized }));
                        }}
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
                          <MenuItem value="Summer">Summer</MenuItem>
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
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Section</InputLabel>
                        <Select
                          value={createForm.section}
                          label="Section"
                          onChange={e => setCreateForm(f => ({ ...f, section: e.target.value }))}
                          required
                          disabled={sectionsLoading || selectedExistingStudent !== null}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#d1d5db'
                              }
                            }
                          }}
                        >
                          <MenuItem value="">Select Section</MenuItem>
                          {sections
                            .filter(section => section.year_level === createForm.yearLevel)
                            .map(section => (
                              <MenuItem key={section.id} value={section.id}>
                                {section.name}{section.academic_year ? ` (${section.academic_year})` : ''}
                              </MenuItem>
                            ))}
                        </Select>
                        {selectedExistingStudent !== null && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Changing section is avaialable at Class Manangement.
                          </Typography>
                        )}
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
                  
                  {/* Course selection summary and check all option */}
                  <Box sx={{ 
                    mb: 2, 
                    p: 2, 
                    borderRadius: 2, 
                    background: selectedCourses.length > 0 ? '#f0f9ff' : '#f9fafb',
                    border: `1px solid ${selectedCourses.length > 0 ? '#0ea5e9' : '#e5e7eb'}`
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
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
                      
                      {/* Check All / Uncheck All Button */}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          if (selectedCourses.length === getTotalAvailableCourses()) {
                            // If all are selected, uncheck all
                            setSelectedCourses([]);
                          } else {
                            // If not all are selected, check all
                            const allCourseIds = getAllAvailableCourseIds();
                            setSelectedCourses(allCourseIds);
                          }
                        }}
                        sx={{
                          borderRadius: 1,
                          px: 1.5,
                          py: 0.5,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          borderColor: selectedCourses.length === getTotalAvailableCourses() ? '#ef4444' : '#10b981',
                          color: selectedCourses.length === getTotalAvailableCourses() ? '#ef4444' : '#10b981',
                          '&:hover': {
                            borderColor: selectedCourses.length === getTotalAvailableCourses() ? '#dc2626' : '#059669',
                            background: selectedCourses.length === getTotalAvailableCourses() ? '#fef2f2' : '#f0fdf4'
                          }
                        }}
                      >
                        {selectedCourses.length === getTotalAvailableCourses() ? 'Uncheck All' : 'Check All'}
                      </Button>
                    </Box>
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
                              {(courseList as { id: string; code: string; name: string; units: number; yearLevel?: number; status?: string; prerequisites?: string[] }[]).map((course) => (
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
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                          {course.code}
                                        </Typography>
                                        {course.prerequisites && course.prerequisites.length > 0 && (
                                          <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 0.5,
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: 0.5,
                                            background: '#fef3c7',
                                            border: '1px solid #f59e0b'
                                          }}>
                                            <Typography variant="caption" sx={{ 
                                              color: '#92400e', 
                                              fontWeight: 600,
                                              fontSize: '0.7rem'
                                            }}>
                                              Prereq
                                            </Typography>
                                            <Typography variant="caption" sx={{ 
                                              color: '#92400e',
                                              fontSize: '0.7rem'
                                            }}>
                                              ({course.prerequisites.length})
                                            </Typography>
                                          </Box>
                                        )}
                                      </Box>
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
                onClick={handleCloseCreateDialog} 
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
                    <Grid item xs={12} sm={4}>
                      <TextField 
                        label="First Name" 
                        value={createForm.firstName} 
                        onChange={e => {
                          const value = e.target.value;
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                          setCreateForm(f => ({ ...f, firstName: capitalized }));
                        }} 
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
                    <Grid item xs={12} sm={4}>
                      <TextField 
                        label="Middle Name" 
                        value={createForm.middleName} 
                        onChange={e => {
                          const value = e.target.value;
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                          setCreateForm(f => ({ ...f, middleName: capitalized }));
                        }} 
                        fullWidth 
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
                    <Grid item xs={12} sm={4}>
                      <TextField 
                        label="Last Name" 
                        value={createForm.lastName} 
                        onChange={e => {
                          const value = e.target.value;
                          const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                          setCreateForm(f => ({ ...f, lastName: capitalized }));
                        }} 
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
                          <MenuItem value="Summer">Summer</MenuItem>
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
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Section</InputLabel>
                        <Select
                          value={createForm.section}
                          label="Section"
                          onChange={e => setCreateForm(f => ({ ...f, section: e.target.value }))}
                          required
                          disabled={sectionsLoading || selectedExistingStudent !== null}
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
                          <MenuItem value="">Select Section</MenuItem>
                          {sections
                            .filter(section => section.year_level === createForm.yearLevel)
                            .map(section => (
                              <MenuItem key={section.id} value={section.id}>
                                {section.name}{section.academic_year ? ` (${section.academic_year})` : ''}
                              </MenuItem>
                            ))}
                        </Select>
                        {selectedExistingStudent !== null && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Section is pre-assigned for existing student
                          </Typography>
                        )}
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
                  
                  {/* Course selection summary and check all option */}
                  <Box sx={{ 
                    mb: 2, 
                    p: 2, 
                    borderRadius: 2, 
                    background: selectedCourses.length > 0 ? '#f0f9ff' : '#f9fafb',
                    border: `1px solid ${selectedCourses.length > 0 ? '#0ea5e9' : '#e5e7eb'}`
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
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
                      
                      {/* Check All / Uncheck All Button */}
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          if (selectedCourses.length === getTotalAvailableCourses()) {
                            // If all are selected, uncheck all
                            setSelectedCourses([]);
                          } else {
                            // If not all are selected, check all
                            const allCourseIds = getAllAvailableCourseIds();
                            setSelectedCourses(allCourseIds);
                          }
                        }}
                        sx={{
                          borderRadius: 1,
                          px: 1.5,
                          py: 0.5,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          borderColor: selectedCourses.length === getTotalAvailableCourses() ? '#ef4444' : '#10b981',
                          color: selectedCourses.length === getTotalAvailableCourses() ? '#ef4444' : '#10b981',
                          '&:hover': {
                            borderColor: selectedCourses.length === getTotalAvailableCourses() ? '#dc2626' : '#059669',
                            background: selectedCourses.length === getTotalAvailableCourses() ? '#fef2f2' : '#f0fdf4'
                          }
                        }}
                      >
                        {selectedCourses.length === getTotalAvailableCourses() ? 'Uncheck All' : 'Check All'}
                      </Button>
                    </Box>
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
                                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                          {course.code}
                                        </Typography>
                                        <Typography variant="body2" sx={{ 
                                          fontWeight: 500, 
                                          color: '#6b7280',
                                          fontSize: '0.75rem'
                                        }}>
                                          {course.units} {course.units === 1 ? 'Unit' : 'Units'}
                                        </Typography>
                                      </Box>
                                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem', mb: 0.5 }}>
                                        {course.name}
                                      </Typography>
                                      {(() => {
                                        const instructor = getInstructorForCourse(course.id, createForm.yearLevel?.toString(), createForm.section);
                                        const isMatch = isSectionMatch(course.id, createForm.section);
                                        
                                        if (instructor) {
                                          return (
                                            <Box sx={{ 
                                              display: 'flex', 
                                              flexDirection: 'column', 
                                              gap: 0.5,
                                              p: 1,
                                              borderRadius: 1,
                                              background: instructor.isExactMatch ? '#f0fdf4' : '#fef3c7',
                                              border: `1px solid ${instructor.isExactMatch ? '#bbf7d0' : '#fde68a'}`,
                                              mt: 0.5
                                            }}>
                                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2" sx={{ 
                                                  fontSize: '0.75rem',
                                                  fontWeight: 500,
                                                  color: instructor.isExactMatch ? '#166534' : '#92400e'
                                                }}>
                                                  👨‍🏫 Instructor: {instructor.teacher_name}
                                                </Typography>
                                                {instructor.isExactMatch && (
                                                  <Box sx={{
                                                    px: 1,
                                                    py: 0.25,
                                                    borderRadius: 0.5,
                                                    background: '#10b981',
                                                    color: 'white',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 600
                                                  }}>
                                                    MATCH
                                                  </Box>
                                                )}
                                              </Box>
                                              <Typography variant="body2" sx={{ 
                                                fontSize: '0.7rem',
                                                color: instructor.isExactMatch ? '#166534' : '#92400e'
                                              }}>
                                                Section: {instructor.section} • {instructor.teacher_role}
                                              </Typography>
                                            </Box>
                                          );
                                        } else {
                                          return (
                                            <Box sx={{ 
                                              p: 1,
                                              borderRadius: 1,
                                              background: '#f3f4f6',
                                              border: '1px solid #e5e7eb',
                                              mt: 0.5
                                            }}>
                                              <Typography variant="body2" sx={{ 
                                                fontSize: '0.75rem',
                                                color: '#6b7280',
                                                fontStyle: 'italic'
                                              }}>
                                                No instructor assigned
                                              </Typography>
                                            </Box>
                                          );
                                        }
                                      })()}
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
                    
                    {/* Show message when no courses are available for selected section */}
                    {Object.keys(visibleCourses).length === 0 && createForm.section && createForm.section !== '' && (
                      <Box sx={{ 
                        textAlign: 'center', 
                        py: 4,
                        px: 2
                      }}>
                        <Box sx={{ 
                          mb: 2,
                          fontSize: '3rem',
                          color: '#9ca3af'
                        }}>
                          📚
                        </Box>
                        <Typography variant="h6" sx={{ 
                          color: '#6b7280', 
                          mb: 1,
                          fontWeight: 500
                        }}>
                          No Courses Available
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: '#9ca3af',
                          mb: 2
                        }}>
                          No courses have instructors assigned to section "{createForm.section}" for {createForm.yearLevel ? `${createForm.yearLevel}${createForm.yearLevel === 1 ? 'st' : createForm.yearLevel === 2 ? 'nd' : createForm.yearLevel === 3 ? 'rd' : 'th'} Year` : 'the selected year level'}.
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: '#9ca3af',
                          fontSize: '0.875rem'
                        }}>
                          Please contact the program head to assign instructors to courses for this section.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseCreateDialog} disabled={creating}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary" disabled={creating}>{creating ? 'Enrolling...' : 'Enroll'}</Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* Edit Student Modal */}
      <Dialog open={!!editForm} onClose={() => { setEditForm(null); }} maxWidth="md" fullWidth scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            maxHeight: '90vh'
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
            minWidth: { xs: 0, sm: 700, md: 900 },
            background: '#ffffff',
            borderRadius: 0,
            p: { xs: 2, sm: 4 },
            position: 'relative',
            maxHeight: '70vh',
            overflowY: 'auto',
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
            <Grid container spacing={2} alignItems="flex-start" sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField 
                  label="First Name" 
                  value={editFormFields.firstName} 
                  onChange={e => {
                    const value = e.target.value;
                    const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                    setEditFormFields(f => ({ ...f, firstName: capitalized }));
                  }} 
                  size="small"
                  variant="outlined"
                  fullWidth 
                  required 
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField 
                  label="Middle Name" 
                  value={editFormFields.middleName} 
                  onChange={e => {
                    const value = e.target.value;
                    const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                    setEditFormFields(f => ({ ...f, middleName: capitalized }));
                  }} 
                  size="small"
                  variant="outlined"
                  fullWidth 
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField 
                  label="Last Name" 
                  value={editFormFields.lastName} 
                  onChange={e => {
                    const value = e.target.value;
                    const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                    setEditFormFields(f => ({ ...f, lastName: capitalized }));
                  }} 
                  size="small"
                  variant="outlined"
                  fullWidth 
                  required 
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Student Type</InputLabel>
                  <Select
                    value={editForm.studentType}
                    label="Student Type"
                    onChange={e => setEditForm((f: Student | null) => f ? { ...f, studentType: e.target.value as Student['studentType'] } : null)}
                    size="small" required
                  >
                    <MenuItem value="Freshman">Freshman</MenuItem>
                    <MenuItem value="Regular">Regular</MenuItem>
                    <MenuItem value="Irregular">Irregular</MenuItem>
                    <MenuItem value="Transferee">Transferee</MenuItem>
                  </Select>
                </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Year Level</InputLabel>
                  <Select
                    value={editForm.yearLevel}
                    label="Year Level"
                    onChange={e => setEditForm((f: Student | null) => f ? { ...f, yearLevel: e.target.value as Student['yearLevel'] } : null)}
                    size="small" required
                  >
                    <MenuItem value={1}>1st Year</MenuItem>
                    <MenuItem value={2}>2nd Year</MenuItem>
                    <MenuItem value={3}>3rd Year</MenuItem>
                    <MenuItem value={4}>4th Year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="School Year" value={editForm.schoolYear} onChange={e => setEditForm((f: Student | null) => f ? { ...f, schoolYear: e.target.value as Student['schoolYear'] } : null)} fullWidth size="small" variant="outlined" required />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={editForm.semester}
                    label="Semester"
                    onChange={e => setEditForm((f: Student | null) => f ? { ...f, semester: e.target.value as Student['semester'] } : null)}
                    size="small" required
                  >
                    <MenuItem value="1st Semester">1st Semester</MenuItem>
                    <MenuItem value="2nd Semester">2nd Semester</MenuItem>
                    <MenuItem value="Summer">Summer</MenuItem>
                  </Select>
                </FormControl>
                </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Student ID" value={editForm.id} fullWidth size="small" variant="outlined" required disabled />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                <Select
                    value={editForm.department}
                    label="Department"
                    onChange={e => setEditForm((f: Student | null) => f ? { ...f, department: e.target.value as Student['department'] } : null)}
                    size="small" required
                  >
                    <MenuItem value="BSIT">BSIT</MenuItem>
                    {/* Add more departments here if needed */}
                </Select>
              </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { 
            setEditForm(null); 
            setEditFormFields({ firstName: '', middleName: '', lastName: '' }); 
          }} disabled={savingEdit}>Cancel</Button>
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
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filter by Section</InputLabel>
              <Select
                value={existingFilterSection}
                label="Filter by Section"
                onChange={e => setExistingFilterSection(e.target.value)}
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
                <MenuItem value="">All Sections</MenuItem>
                {sections
                  .filter(section => !existingFilterYear || section.year_level === Number(existingFilterYear))
                  .map(section => (
                    <MenuItem key={section.id} value={section.id}>
                      {section.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
          {Object.keys(existingStudentsByYear).sort().filter(year => !existingFilterYear || year === existingFilterYear).map(year => {
            // Filter students by section if section filter is applied
            const filteredStudents = existingStudentsByYear[year].filter(student => 
              !existingFilterSection || student.section === existingFilterSection
            );
            
            // Only show year if there are students after filtering
            if (filteredStudents.length === 0) return null;
            
            return (
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
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Section</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStudents.map(student => (
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
                            background: '#e0e7ef',
                            color: '#111827',
                            textTransform: 'capitalize'
                          }}>
                            {getSectionName(student.section)}
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
            );
          })}
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
            {/* Header area with proper CSS classes */}
            <Box className="prospectus-header" sx={{ background: 'white', p: 3, borderBottom: '1px solid #e5e7eb' }}>
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
                  <Typography className="school-name" variant="h6" sx={{ fontWeight: 700, color: '#1f2937', mb: 0.25, fontSize: '1.125rem' }}>
                    St. Mary's College of Bansalan, Inc.
                  </Typography>
                  <Typography className="school-subtitle" variant="caption" sx={{ color: '#6b7280', fontStyle: 'italic', mb: 0.25, fontSize: '0.75rem' }}>
                    (Formerly: Holy Cross of Bansalan College, Inc.)
                  </Typography>
                  <Typography className="school-address" variant="caption" sx={{ color: '#374151', mb: 0.5, fontSize: '0.75rem' }}>
                    Dahlia Street, Poblacion Uno, Bansalan, Davao del Sur, 8005 Philippines
                  </Typography>
                  <Typography className="course-title" variant="body1" sx={{ fontWeight: 700, color: '#1e40af', mb: 0.25, fontSize: '1rem' }}>
                    BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY (BSIT)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#374151', fontSize: '0.75rem' }}>
                    Effective SY 2020 - 2021
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography className="prospectus-title" variant="h5" sx={{ fontWeight: 700, fontSize: '1.5rem', color: '#1e40af' }}>
                  STUDENT PROSPECTUS
                </Typography>
              </Box>
            </Box>

            {/* Body content */}
            <Box sx={{ p: 3 }}>
              {/* Student Name */}
              <Typography className="student-name" variant="h5" sx={{ 
              fontWeight: 700,
              fontSize: '1.5rem',
              color: '#1f2937',
              textAlign: 'center',
              mb: 2
            }}>
              {selectedStudentForProspectus?.name}
            </Typography>

            {/* Student Information */}
              <Box className="student-info" sx={{ 
              mb: 3, 
              borderRadius: 2, 
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                border: '1px solid #bae6fd',
                p: 2.5
              }}>
                <Box className="info-grid">
                  <Box className="info-item">
                    <Typography className="info-label" variant="body2" sx={{ fontWeight: 500 }}>
                      Student ID
                    </Typography>
                    <Typography className="info-value" variant="body1" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {selectedStudentForProspectus?.id}
                    </Typography>
                  </Box>
                  <Box className="info-item">
                    <Typography className="info-label" variant="body2" sx={{ fontWeight: 500 }}>
                      Student Type
                    </Typography>
                    <Typography className="info-value" variant="body1" sx={{ fontWeight: 600 }}>
                      {selectedStudentForProspectus?.studentType}
                    </Typography>
                  </Box>
                  <Box className="info-item">
                    <Typography className="info-label" variant="body2" sx={{ fontWeight: 500 }}>
                      Current Year Level
                    </Typography>
                    <Typography className="info-value" variant="body1" sx={{ fontWeight: 600 }}>
                      {selectedStudentForProspectus?.yearLevel}
                    </Typography>
                  </Box>
                  <Box className="info-item">
                    <Typography className="info-label" variant="body2" sx={{ fontWeight: 500 }}>
                      Department
                    </Typography>
                    <Typography className="info-value" variant="body1" sx={{ fontWeight: 600 }}>
                      {selectedStudentForProspectus?.department}
                    </Typography>
                  </Box>
                </Box>
              </Box>

            {/* Available Subjects by Year Level */}
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: '#374151',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Box sx={{ fontSize: '1.2rem' }}>📚</Box>
              Subjects
            </Typography>

            {/* Show all subjects from 1st to 4th year */}
            {renderSubjects()}
            </Box>
            
            {/* Footer */}
            <Box className="prospectus-footer" sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.75rem' }}>
                Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </Typography>
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
            onClick={handlePrintProspectus}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ fontSize: '1rem' }}>🖨️</Box>
              Print
            </Box>
          </Button>
          <Button 
            onClick={handleDownloadPDF}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ fontSize: '1rem' }}>⬇️</Box>
              Download PDF
            </Box>
          </Button>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ fontSize: '1rem' }}>✕</Box>
              Close
            </Box>
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProgramHeadEnrollment; 
