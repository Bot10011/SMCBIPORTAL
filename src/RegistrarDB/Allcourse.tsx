import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  InputAdornment,
  TextField,
  Tooltip,
  Chip
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import SearchIcon from '@mui/icons-material/Search';

export const RegistrarGradeViewer: React.FC = () => {
  const [courses, setCourses] = useState<Database['public']['Tables']['courses']['Row'][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('courses').select('*');
      if (error) {
        setError('Failed to load subjects');
      } else {
        setCourses(data || []);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(search.toLowerCase()) ||
      course.code.toLowerCase().includes(search.toLowerCase())
  );

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
    <Box p={{ xs: 1, md: 3 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap">
        <Typography variant="h4" fontWeight="bold" color="primary" gutterBottom>
          <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Subjects Overview
        </Typography>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search by code or name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250, mb: { xs: 2, md: 0 } }}
        />
      </Box>
      <Grid container spacing={3}>
        {filteredCourses.length === 0 ? (
          <Grid item xs={12}>
            <Alert severity="info">No subjects found.</Alert>
          </Grid>
        ) : (
          filteredCourses.map((course) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={course.id}>
              <Tooltip title={course.description || 'No description'} arrow>
                <Card
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    boxShadow: 3,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-6px) scale(1.03)',
                      boxShadow: 6,
                    },
                    cursor: 'pointer',
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <SchoolIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" fontWeight={600} noWrap>
                        {course.code}
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" fontWeight={500} gutterBottom noWrap>
                      {course.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {course.description || <em>No description</em>}
                    </Typography>
                    <Chip label={`${course.units} unit${course.units !== 1 ? 's' : ''}`} color="secondary" size="small" />
                  </CardContent>
                </Card>
              </Tooltip>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}; 