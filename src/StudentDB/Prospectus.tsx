import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';

interface EnrollmentSubject {
      id: string;
      code: string;
      name: string;
      units: number;
      year_level: string;
  has_grade?: boolean;
  enrollment_status?: string;
  lec_units?: number;
  lab_units?: number;
  hours_per_week?: number;
  prerequisites?: string[];
  summer?: boolean;
  semester?: string;
}

interface StudentProfile {
      id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  student_type?: string;
  year_level?: string | number;
  department?: string;
  enrollment_status?: string;
}

const getYearLabel = (year: string | number) => {
  const y = String(year);
  if (y === '1' || /1st/.test(y)) return '1st Year';
  if (y === '2' || /2nd/.test(y)) return '2nd Year';
  if (y === '3' || /3rd/.test(y)) return '3rd Year';
  if (y === '4' || /4th/.test(y)) return '4th Year';
  return 'Year';
};

const Prospectus: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<EnrollmentSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradesBySubjectCode, setGradesBySubjectCode] = useState<Map<string, any>>(new Map());
  const [confirmedSubjects, setConfirmedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        console.log('Current user ID:', user.id);
        // Fetch profile first to know the formatted student ID (e.g., C-250004)
        const { data: p } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
        if (p) {
          setProfile(p as unknown as StudentProfile);
          console.log('User profile:', p);
          
          // Load existing confirmations after profile is loaded
          await loadConfirmations();
        }

        const [coursesRes, enrollRes, gradesByUuidRes, gradesByCodeRes] = await Promise.all([
          supabase.from('courses').select('id, code, name, units, year_level, lec_units, lab_units, hours_per_week, prerequisites, summer, semester').order('code', { ascending: true }),
          supabase.from('enrollcourse').select('subject_id, status, subject:courses(code)').eq('student_id', user.id),
          supabase
            .from('grades')
            .select('*, course:courses(code, name)')
            .eq('student_id', user.id),
          p?.student_id
            ? supabase
                .from('grades')
                .select('*, course:courses(code, name)')
                .eq('student_id', p.student_id)
            : Promise.resolve({ data: [] as any[] } as any),
        ]);

        const coursesData = coursesRes.data || [];
        const enrollData = enrollRes.data || [];
        const gradeRows = [
          ...((gradesByUuidRes.data as any[]) || []),
          ...((gradesByCodeRes.data as any[]) || []),
        ];
        console.log('Raw grade data from UUID query:', gradesByUuidRes.data);
        console.log('Raw grade data from formatted ID query:', gradesByCodeRes.data);
        console.log('Combined grade rows:', gradeRows);

        const enrollmentBySubjectId = new Map<string, string>();
        const enrollmentBySubjectCode = new Map<string, string>();
        (enrollData || []).forEach((e: any) => {
          if (e?.subject_id) {
            enrollmentBySubjectId.set(String(e.subject_id), String(e.status || ''));
            // Also store by subject code if available from the relation
            if (e?.subject?.code) {
              enrollmentBySubjectCode.set(String(e.subject.code), String(e.status || ''));
            }
          }
        });

        // Create a map of grades by subject code for easier lookup
        const gradesBySubjectCode = new Map<string, any>();
        console.log('Processing grade rows:', gradeRows);
        (gradeRows || []).forEach((g: any) => {
          const courseCode = String(g?.course?.code || '');
          console.log('Processing grade:', { 
            courseCode, 
            course: g?.course, 
            grade: g,
            prelim: g?.prelim_grade,
            midterm: g?.midterm_grade,
            final: g?.final_grade,
            is_releases: g?.is_releases
          });
          if (!courseCode) return;
          // Respect release flag if provided
          if (g?.is_releases === false) {
            console.log('Skipping unreleased grade for:', courseCode);
            return;
          }
          gradesBySubjectCode.set(courseCode, g);
          console.log('Added grade for subject:', courseCode);
        });
        console.log('Final grades map:', Array.from(gradesBySubjectCode.entries()));
        setGradesBySubjectCode(gradesBySubjectCode);

        const flat: EnrollmentSubject[] = (coursesData || []).map((row: any) => {
          // Try to find enrollment by subject ID first, then by subject code as fallback
          let raw = enrollmentBySubjectId.get(String(row.id));
          if (!raw) {
            raw = enrollmentBySubjectCode.get(String(row.code));
          }
          
          let enrollment_status: string = 'not enrolled';
          if (raw) {
            enrollment_status = String(raw).toLowerCase() === 'active' ? 'enrolled' : 'pending';
          }
          
          return {
            id: row.id,
            code: row.code,
            name: row.name,
            units: row.units ?? 0,
            year_level: row.year_level ?? '',
            has_grade: gradesBySubjectCode.has(String(row.code)),
            enrollment_status,
            lec_units: row.lec_units ?? 0,
            lab_units: row.lab_units ?? 0,
            hours_per_week: row.hours_per_week ?? 0,
            prerequisites: row.prerequisites ?? [],
            summer: !!row.summer,
            semester: row.semester || '',
          };
        });

        setSubjects(flat);
    } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  // Helper function to calculate average grade
  const calculateAverageGrade = (prelim: number | null, midterm: number | null, final: number | null) => {
    const grades = [prelim, midterm, final].filter(grade => grade !== null && grade !== undefined);
    if (grades.length === 0) return null;
    
    const sum = grades.reduce((acc, grade) => acc + (grade || 0), 0);
    return Math.round((sum / grades.length) * 100) / 100; // Round to 2 decimal places
  };

  const groupedByYear = useMemo(() => {
    const map: Record<number, EnrollmentSubject[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const subj of subjects) {
      const yl = subj.year_level?.toLowerCase?.() ?? '';
      const year = [1, 2, 3, 4].find(
        (y) =>
          yl.includes(String(y)) ||
          yl.includes(`${y}st`) ||
          yl.includes(`${y}nd`) ||
          yl.includes(`${y}rd`) ||
          yl.includes(`${y}th`)
      );
      if (year) map[year].push(subj);
    }
    return map;
  }, [subjects]);

  const isFirstSem = (sem?: string) => {
    if (!sem) return false;
    const s = String(sem).toLowerCase();
    return s.includes('1') || s.includes('first');
  };

  const isSecondSem = (sem?: string) => {
    if (!sem) return false;
    const s = String(sem).toLowerCase();
    return s.includes('2') || s.includes('second');
  };

  // Load existing confirmations from Supabase
  const loadConfirmations = async () => {
      if (!user?.id) return;
    
      try {
        const { data, error } = await supabase
        .from('subject_actions')
        .select('subject_code')
          .eq('student_id', user.id)
        .eq('action_type', 'confirm');

      if (error) {
        console.error('Error loading confirmations:', error);
        return;
      }

      const confirmedCodes = new Set(data?.map(item => item.subject_code) || []);
      setConfirmedSubjects(confirmedCodes);
      console.log('Loaded confirmations:', confirmedCodes);
      } catch (error) {
      console.error('Error loading confirmations:', error);
    }
  };

  // Handler for confirm action
  const handleConfirm = async (code: string) => {
    if (!user?.id) return;
    
    try {
      // Insert confirmation into Supabase
      const { error } = await supabase
        .from('subject_actions')
        .insert({
          student_id: user.id,
          subject_code: code,
          action_type: 'confirm',
          status: 'pending'
        });

      if (error) {
        console.error('Error saving confirmation:', error);
        return;
      }

      // Update local state
      setConfirmedSubjects(prev => new Set([...prev, code]));
      console.log('Subject confirmed and saved:', code);
    } catch (error) {
      console.error('Error confirming subject:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e40af', textAlign: 'center', mb: 2 }}>
            STUDENT PROSPECTUS
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Student ID</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{profile?.student_id || user?.id}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Student Type</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{profile?.student_type || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Current Year Level</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{getYearLabel(profile?.year_level || '')}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Department</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{profile?.department || 'BSIT'}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ fontWeight: 600, color: '#374151', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ fontSize: '1.2rem' }}>📚</Box>
        Subjects
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {[1, 2, 3, 4].map((year) => {
        const list = groupedByYear[year] || [];
        const totalUnits = list.reduce((s, x) => s + (x.units || 0), 0);
  return (
          <Card key={year} sx={{ mb: 2, borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <Box sx={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)', p: 2, borderBottom: '1px solid #e5e7eb' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', background: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>{year}</Box>
                {getYearLabel(year)} Subjects
                <Box sx={{ ml: 1, px: 1.5, py: 0.3, borderRadius: 1, background: '#e0e7ef', fontSize: '0.75rem', color: '#374151', fontWeight: 500 }}>{list.length} subjects</Box>
                <Box sx={{ ml: 1, px: 1.5, py: 0.3, borderRadius: 1, background: '#e0e7ef', fontSize: '0.75rem', color: '#374151', fontWeight: 500 }}>{totalUnits} units</Box>
              </Typography>
            </Box>
            <CardContent sx={{ p: 0 }}>
              {list.length > 0 ? (
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
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '8%' }} />
                      </colgroup>
                      <TableHead>
                        <TableRow sx={{ background: '#f9fafb' }}>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb' }}>Subject Code</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb' }}>Subject Name</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Enrollment Status</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>LEC</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>LAB</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Units</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Hours/Week</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Average Grade</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Prerequisites</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {list.filter(s => !s.summer && isFirstSem(s.semester)).map((subj, idx) => (
                          <TableRow key={subj.id} sx={{ background: idx % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
                            <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem', color: '#1f2937' }}>{subj.code}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subj.name}</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Box sx={{
                                display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500,
                                background: subj.enrollment_status === 'enrolled' ? '#dcfce7' : (subj.enrollment_status === 'pending' ? '#fef3c7' : '#f3f4f6'),
                                color: subj.enrollment_status === 'enrolled' ? '#166534' : (subj.enrollment_status === 'pending' ? '#92400e' : '#374151'),
                                textTransform: 'capitalize'
                              }}>
                                {subj.enrollment_status}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#059669' }}>{subj.lec_units || 0}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#059669' }}>{subj.lab_units || 0}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#059669' }}>{subj.units}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#059669' }}>{subj.hours_per_week || 0}</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: subj.code?.startsWith('IT') ? '#dbeafe' : '#fef3c7', color: subj.code?.startsWith('IT') ? '#1e40af' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {subj.code?.startsWith('IT') ? 'Major' : 'Minor'}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              {(() => {
                                const subjectGrades = gradesBySubjectCode.get(subj.code);
                                console.log('Looking for grades for subject:', subj.code, 'Found:', subjectGrades);
                                if (subjectGrades) {
                                  const hasGrades = subjectGrades.prelim_grade !== null || 
                                                  subjectGrades.midterm_grade !== null || 
                                                  subjectGrades.final_grade !== null;
                                  console.log('Has grades check:', { 
                                    prelim: subjectGrades.prelim_grade, 
                                    midterm: subjectGrades.midterm_grade, 
                                    final: subjectGrades.final_grade,
                                    hasGrades 
                                  });
                                  if (hasGrades) {
                                    const averageGrade = calculateAverageGrade(
                                      subjectGrades.prelim_grade || null,
                                      subjectGrades.midterm_grade || null,
                                      subjectGrades.final_grade || null
                                    );
                                    console.log('Calculated average:', averageGrade);
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
                                  <Box sx={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>No grades</Box>
                                );
                              })()}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              {subj.prerequisites && subj.prerequisites.length > 0 ? (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                                  {subj.prerequisites.map((prereq, idx) => (
                                    <Chip key={idx} label={prereq} size="small" sx={{ fontSize: '0.7rem', height: '20px', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }} />
                                  ))}
                                </Box>
                              ) : (
                                <Box sx={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>None</Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              {subj.has_grade ? (
                                confirmedSubjects.has(subj.code) ? (
                                  <Box sx={{ 
                                    display: 'inline-block',
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    background: '#dcfce7',
                                    color: '#166534',
                                    textTransform: 'capitalize'
                                  }}>
                                    Confirmed
                                  </Box>
                                ) : (
                                  <Button 
                                    size="small" 
                                    variant="outlined" 
                                    color="success" 
                                    onClick={() => handleConfirm(subj.code)}
                                  >
                                    Confirm
                                  </Button>
                                )
                              ) : (
                                <Box sx={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>No actions</Box>
                              )}
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
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '8%' }} />
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
                        {list.filter(s => !s.summer && isSecondSem(s.semester)).map((subj, idx) => (
                          <TableRow key={subj.id} sx={{ background: idx % 2 === 0 ? '#f0f9ff' : '#ffffff' }}>
                            <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem', color: '#0369a1' }}>{subj.code}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', color: '#075985', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subj.name}</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: subj.enrollment_status === 'enrolled' ? '#e0f2fe' : '#f3f4f6', color: subj.enrollment_status === 'enrolled' ? '#0369a1' : '#374151', textTransform: 'capitalize' }}>{subj.enrollment_status}</Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subj.lec_units || 0}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subj.lab_units || 0}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subj.units}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#0369a1' }}>{subj.hours_per_week || 0}</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: subj.code?.startsWith('IT') ? '#dbeafe' : '#fef3c7', color: subj.code?.startsWith('IT') ? '#1e40af' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{subj.code?.startsWith('IT') ? 'Major' : 'Minor'}</Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              {(() => {
                                const subjectGrades = gradesBySubjectCode.get(subj.code);
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
                              {subj.prerequisites && subj.prerequisites.length > 0 ? (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                                  {subj.prerequisites.map((prereq, idx) => (
                                    <Chip key={idx} label={prereq} size="small" sx={{ fontSize: '0.7rem', height: '20px', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }} />
                                  ))}
                                </Box>
                              ) : (
                                <Box sx={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>None</Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              {subj.has_grade ? (
                                confirmedSubjects.has(subj.code) ? (
                                  <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: '#dcfce7', color: '#166534', textTransform: 'capitalize' }}>Confirmed</Box>
                                ) : (
                                  <Button size="small" variant="outlined" color="success" onClick={() => handleConfirm(subj.code)}>Confirm</Button>
                                )
                              ) : (
                                <Box sx={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>No actions</Box>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Summer Subjects */}
                  <Box sx={{ px: 2, pt: 3, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1f2937' }}>Summer</Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                      <colgroup>
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '8%' }} />
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
                        {list.filter(s => s.summer).map((subj, idx) => (
                          <TableRow key={subj.id} sx={{ background: idx % 2 === 0 ? '#fff7ed' : '#ffffff' }}>
                            <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem', color: '#92400e' }}>{subj.code}</TableCell>
                            <TableCell sx={{ fontSize: '0.875rem', color: '#7c2d12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subj.name}</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: subj.enrollment_status === 'enrolled' ? '#fef3c7' : '#f3f4f6', color: subj.enrollment_status === 'enrolled' ? '#92400e' : '#374151', textTransform: 'capitalize' }}>
                                {subj.enrollment_status}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>{subj.lec_units || 0}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>{subj.lab_units || 0}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>{subj.units}</TableCell>
                            <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>{subj.hours_per_week || 0}</TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: subj.code?.startsWith('IT') ? '#dbeafe' : '#fef3c7', color: subj.code?.startsWith('IT') ? '#1e40af' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {subj.code?.startsWith('IT') ? 'Major' : 'Minor'}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              {(() => {
                                const subjectGrades = gradesBySubjectCode.get(subj.code);
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
                              {subj.prerequisites && subj.prerequisites.length > 0 ? (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                                  {subj.prerequisites.map((prereq, idx) => (
                                    <Chip key={idx} label={prereq} size="small" sx={{ fontSize: '0.7rem', height: '20px', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }} />
                                  ))}
                                </Box>
                              ) : (
                                <Box sx={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>None</Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ textAlign: 'center' }}>
                              {subj.has_grade ? (
                                confirmedSubjects.has(subj.code) ? (
                                  <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: '#dcfce7', color: '#166534', textTransform: 'capitalize' }}>Confirmed</Box>
                                ) : (
                                  <Button size="small" variant="outlined" color="success" onClick={() => handleConfirm(subj.code)}>Confirm</Button>
                                )
                              ) : (
                                <Box sx={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>No actions</Box>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center', color: '#6b7280' }}>
                  <Typography variant="body2">No subjects available for {getYearLabel(year)}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}


    </Box>
  );
};

export default Prospectus;
