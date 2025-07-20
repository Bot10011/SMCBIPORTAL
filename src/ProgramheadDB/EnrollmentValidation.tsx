import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Search,
  Refresh,
  Warning,
  Info,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface EnrollmentRequest {
  id: string;
  student_id: string;
  student_name: string;
  student_type: string;
  year_level: number;
  department: string;
  school_year: string;
  semester: string;
  subjects: string[];
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  total_units: number;
}

const EnrollmentValidation: React.FC = () => {
  console.log('EnrollmentValidation component loaded');
  const [enrollments, setEnrollments] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      // Fetch enrollment requests from the database
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          student_id,
          first_name,
          last_name,
          student_type,
          year_level,
          department,
          school_year,
          semester,
          enrollment_status,
          created_at
        `)
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match our interface
      const transformedData: EnrollmentRequest[] = (data || []).map((item: any) => ({
        id: item.id,
        student_id: item.student_id,
        student_name: `${item.first_name} ${item.last_name}`,
        student_type: item.student_type,
        year_level: item.year_level,
        department: item.department,
        school_year: item.school_year,
        semester: item.semester,
        subjects: [], // Will be populated from enrollcourse table
        status: item.enrollment_status || 'pending',
        submitted_at: item.created_at,
        total_units: 0, // Will be calculated
      }));

      setEnrollments(transformedData);
      updateStats(transformedData);
    } catch (error) {
      console.error('Error loading enrollments:', error);
      toast.error('Failed to load enrollment requests');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (data: EnrollmentRequest[]) => {
    setStats({
      pending: data.filter(item => item.status === 'pending').length,
      approved: data.filter(item => item.status === 'approved').length,
      rejected: data.filter(item => item.status === 'rejected').length,
      total: data.length,
    });
  };

  const handleApprove = async (enrollmentId: string) => {
    try {
      setProcessing(true);
      const { error } = await supabase
        .from('user_profiles')
        .update({ enrollment_status: 'approved' })
        .eq('id', enrollmentId);

      if (error) throw error;

      toast.success('Enrollment approved successfully');
      loadEnrollments();
    } catch (error) {
      console.error('Error approving enrollment:', error);
      toast.error('Failed to approve enrollment');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (enrollmentId: string, reason: string) => {
    try {
      setProcessing(true);
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          enrollment_status: 'rejected',
          rejection_reason: reason 
        })
        .eq('id', enrollmentId);

      if (error) throw error;

      toast.success('Enrollment rejected');
      loadEnrollments();
    } catch (error) {
      console.error('Error rejecting enrollment:', error);
      toast.error('Failed to reject enrollment');
    } finally {
      setProcessing(false);
    }
  };

  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesStatus = !filterStatus || enrollment.status === filterStatus;
    const matchesSearch = !searchTerm || 
      enrollment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      case 'pending': return <Warning />;
      default: return <Info />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
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
          <Box sx={{ 
            p: 1, 
            borderRadius: 2, 
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ color: 'white' }}
            >
              <path d="M5 12h14"></path>
              <path d="M12 5v14"></path>
            </svg>
          </Box>
          <Box>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              color: 'white',
              letterSpacing: '-0.025em',
              fontSize: '1.5rem'
            }}>
              Enrollment Validation
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              fontSize: '0.875rem',
              fontWeight: 500
            }}>
              Review and validate student enrollment requests
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ 
                    color: '#64748b', 
                    fontWeight: 500, 
                    fontSize: '0.875rem',
                    mb: 1 
                  }}>
                    Total Requests
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700, 
                    fontSize: '1.875rem',
                    color: '#1e293b'
                  }}>
                    {stats.total}
                  </Typography>
                </Box>
                <Box sx={{ 
                  backgroundColor: '#e0e7ff',
                  p: 1.5,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 2,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ 
                    color: '#92400e', 
                    fontWeight: 500, 
                    fontSize: '0.875rem',
                    mb: 1 
                  }}>
                    Pending Review
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700, 
                    fontSize: '1.875rem',
                    color: '#92400e'
                  }}>
                    {stats.pending}
                  </Typography>
                </Box>
                <Box sx={{ 
                  backgroundColor: '#fef3c7',
                  p: 1.5,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12,6 12,12 16,14"></polyline>
                  </svg>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 2,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ 
                    color: '#166534', 
                    fontWeight: 500, 
                    fontSize: '0.875rem',
                    mb: 1 
                  }}>
                    Approved
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700, 
                    fontSize: '1.875rem',
                    color: '#166534'
                  }}>
                    {stats.approved}
                  </Typography>
                </Box>
                <Box sx={{ 
                  backgroundColor: '#dcfce7',
                  p: 1.5,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                  </svg>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 2,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ 
                    color: '#991b1b', 
                    fontWeight: 500, 
                    fontSize: '0.875rem',
                    mb: 1 
                  }}>
                    Rejected
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700, 
                    fontSize: '1.875rem',
                    color: '#991b1b'
                  }}>
                    {stats.rejected}
                  </Typography>
                </Box>
                <Box sx={{ 
                  backgroundColor: '#fee2e2',
                  p: 1.5,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ 
        mb: 3, 
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(0, 0, 0, 0.06)'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            color: '#374151', 
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
            </svg>
            Search & Filter
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                placeholder="Search by student name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: '#f9fafb',
                    '&:hover': {
                      backgroundColor: '#f3f4f6',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, color: '#6b7280' }}>
                      <Search />
                    </Box>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#6b7280' }}>Filter by Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Filter by Status"
                  sx={{
                    borderRadius: 2,
                    backgroundColor: '#f9fafb',
                    '&:hover': {
                      backgroundColor: '#f3f4f6',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
                    }
                  }}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="pending">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        backgroundColor: '#f59e0b' 
                      }} />
                      Pending
                    </Box>
                  </MenuItem>
                  <MenuItem value="approved">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        backgroundColor: '#10b981' 
                      }} />
                      Approved
                    </Box>
                  </MenuItem>
                  <MenuItem value="rejected">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        backgroundColor: '#ef4444' 
                      }} />
                      Rejected
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={loadEnrollments}
                disabled={loading}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 14px rgba(102, 126, 234, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                    transform: 'translateY(-1px)',
                  },
                  '&:disabled': {
                    background: '#e5e7eb',
                    color: '#9ca3af',
                    boxShadow: 'none',
                    transform: 'none',
                  }
                }}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

            {/* Enrollments Table */}
      <Card sx={{ 
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        overflow: 'hidden'
      }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={40} sx={{ color: '#667eea', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Loading enrollment data...
                </Typography>
              </Box>
            </Box>
          ) : (
            <>
              <Box sx={{ 
                p: 3, 
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                backgroundColor: '#f9fafb'
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                  </svg>
                  Enrollment Requests ({filteredEnrollments.length})
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Student
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Student ID
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Type
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Year Level
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Programs
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Status
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Submitted
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEnrollments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: '#9ca3af', margin: '0 auto 16px' }}>
                              <circle cx="11" cy="11" r="8"></circle>
                              <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                              No enrollment requests found
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Try adjusting your search or filter criteria
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEnrollments.map((enrollment, index) => (
                        <TableRow 
                          key={enrollment.id}
                          sx={{ 
                            '&:hover': { 
                              backgroundColor: '#f8fafc',
                              transition: 'background-color 0.2s ease'
                            },
                            '&:nth-of-type(even)': {
                              backgroundColor: '#fafbfc'
                            }
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Box sx={{ 
                                width: 40, 
                                height: 40, 
                                borderRadius: '50%', 
                                backgroundColor: '#667eea',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.875rem'
                              }}>
                                {enrollment.student_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </Box>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
                                  {enrollment.student_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {enrollment.student_type}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ 
                              fontFamily: 'monospace', 
                              backgroundColor: '#f3f4f6',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: '0.75rem'
                            }}>
                              {enrollment.student_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={enrollment.student_type}
                              size="small"
                              sx={{
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                fontWeight: 500,
                                fontSize: '0.75rem'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {enrollment.year_level}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {enrollment.department}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(enrollment.status)}
                              label={enrollment.status}
                              color={getStatusColor(enrollment.status) as any}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                '& .MuiChip-icon': {
                                  fontSize: '1rem'
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(enrollment.submitted_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedEnrollment(enrollment);
                                    setDetailDialogOpen(true);
                                  }}
                                  sx={{
                                    backgroundColor: '#f3f4f6',
                                    '&:hover': {
                                      backgroundColor: '#e5e7eb',
                                    }
                                  }}
                                >
                                  <Visibility sx={{ fontSize: '1rem' }} />
                                </IconButton>
                              </Tooltip>
                              {enrollment.status === 'pending' && (
                                <>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<CheckCircle />}
                                    onClick={() => handleApprove(enrollment.id)}
                                    disabled={processing}
                                    sx={{
                                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                      borderRadius: 2,
                                      px: 2,
                                      py: 0.5,
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      '&:hover': {
                                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                                        transform: 'translateY(-1px)',
                                      },
                                      '&:disabled': {
                                        background: '#e5e7eb',
                                        color: '#9ca3af',
                                        boxShadow: 'none',
                                        transform: 'none',
                                      }
                                    }}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<Cancel />}
                                    onClick={() => handleReject(enrollment.id, 'Rejected by program head')}
                                    disabled={processing}
                                    sx={{
                                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                      borderRadius: 2,
                                      px: 2,
                                      py: 0.5,
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      '&:hover': {
                                        background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                                        transform: 'translateY(-1px)',
                                      },
                                      '&:disabled': {
                                        background: '#e5e7eb',
                                        color: '#9ca3af',
                                        boxShadow: 'none',
                                        transform: 'none',
                                      }
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Enrollment Details</DialogTitle>
        <DialogContent>
          {selectedEnrollment && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Student Name</Typography>
                <Typography variant="body1">{selectedEnrollment.student_name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Student ID</Typography>
                <Typography variant="body1">{selectedEnrollment.student_id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Student Type</Typography>
                <Typography variant="body1">{selectedEnrollment.student_type}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Year Level</Typography>
                <Typography variant="body1">{selectedEnrollment.year_level}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Programs</Typography>
                <Typography variant="body1">{selectedEnrollment.department}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">School Year</Typography>
                <Typography variant="body1">{selectedEnrollment.school_year}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Semester</Typography>
                <Typography variant="body1">{selectedEnrollment.semester}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip
                  icon={getStatusIcon(selectedEnrollment.status)}
                  label={selectedEnrollment.status}
                  color={getStatusColor(selectedEnrollment.status) as any}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnrollmentValidation;
