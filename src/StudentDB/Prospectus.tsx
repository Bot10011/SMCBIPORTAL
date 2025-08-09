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
} from '@mui/material';

interface EnrollmentSubject {
      id: string;
      code: string;
      name: string;
      units: number;
      year_level: string;
  has_grade?: boolean;
  enrollment_status?: string;
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

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [{ data: p }, { data: coursesData }, { data: enrollData }, { data: gradeRows }] = await Promise.all([
          supabase.from('user_profiles').select('*').eq('id', user.id).single(),
          supabase.from('courses').select('id, code, name, units, year_level').order('code', { ascending: true }),
          supabase.from('enrollcourse').select('subject_id, status').eq('student_id', user.id),
          supabase.from('grades').select('subject_code, final_grade, midterm_grade, prelim_grade').eq('student_id', user.id),
        ]);

        if (p) setProfile(p as unknown as StudentProfile);

        const enrollmentBySubjectId = new Map<string, string>();
        (enrollData || []).forEach((e: any) => {
          if (e?.subject_id) enrollmentBySubjectId.set(String(e.subject_id), String(e.status || ''));
        });

        const hasGradeCodes = new Set<string>();
        (gradeRows || []).forEach((g: any) => {
          if (g?.final_grade != null || g?.midterm_grade != null || g?.prelim_grade != null) {
            if (g.subject_code) hasGradeCodes.add(String(g.subject_code));
          }
        });

        const flat: EnrollmentSubject[] = (coursesData || []).map((row: any) => {
          const raw = enrollmentBySubjectId.get(String(row.id));
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
            has_grade: hasGradeCodes.has(String(row.code)),
            enrollment_status,
          };
        });

        setSubjects(flat);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

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

  // Placeholder handlers; real logic to be added later
  const handleConfirm = (code: string) => {
    console.log('Confirm clicked for', code);
  };
  const handleAppeal = (code: string) => {
    console.log('Appeal clicked for', code);
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
                <TableContainer>
                  <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '36%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8%' }} />
                    </colgroup>
                    <TableHead>
                      <TableRow sx={{ background: '#f9fafb' }}>
                        <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb' }}>Subject Code</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb' }}>Subject Name</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Enrollment Status</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Units</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Grades</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', borderBottom: '2px solid #e5e7eb', textAlign: 'center' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {list.map((subj, idx) => (
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
                          <TableCell sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#059669' }}>{subj.units}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 500, background: subj.code?.startsWith('IT') ? '#dbeafe' : '#fef3c7', color: subj.code?.startsWith('IT') ? '#1e40af' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {subj.code?.startsWith('IT') ? 'Major' : 'Minor'}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>No grades</Box>
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {subj.has_grade ? (
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                <Button size="small" variant="outlined" color="success" onClick={() => handleConfirm(subj.code)}>Confirm</Button>
                                <Button size="small" variant="outlined" color="warning" onClick={() => handleAppeal(subj.code)}>Appeal</Button>
                              </Box>
                            ) : (
                              <Box sx={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>No actions</Box>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
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
