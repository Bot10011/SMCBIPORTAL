import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import RegistrarEnrollment from './RegistrarEnrollment';
import RegistrarProspectus from './RegistrarProspectus';
import { motion } from 'framer-motion';
import ClassList from './ClassList';
import Settings from './Settings';
import { 
  CheckSquare, 
  FileText, 
  BookOpen, 
  BarChart4, 
  Clock,
  Users,
  Clock4,
  ShieldAlert,
} from 'lucide-react';
import { RegistrarGradeViewer } from './Allcourse';
import { supabase } from '../lib/supabase';
import StudentGrades from './StudentGrades';
import SubjectsList from './SubjectsList';

// Import registrar-specific components
const StudentRecords = () => <div>Student Records</div>;

// Dashboard Overview Components
type ActivityLog = {
  id: string;
  action?: string;
  description?: string;
  student?: string;
  subject?: string;
  classes?: string;
  time?: string;
  created_at?: string;
};



type EnrollmentData = {
  year: string;
  count: number;
  status: string;
};

type CapacityData = {
  id: string;
  program: string;
  yearLevel: string;
  section: string;
  studentCount: number;
  maxCapacity: number;
};

// Helper function to format school year professionally
const formatSchoolYear = (year: string): string => {
  if (!year || year === 'Unknown') return 'Unknown';
  
  // If it's already formatted (e.g., "2023-2024"), return as is
  if (year.includes('-')) return year;
  
  // If it's a single year, format it as "YYYY-YYYY+1"
  const yearNum = parseInt(year);
  if (!isNaN(yearNum)) {
    return `${yearNum}-${yearNum + 1}`;
  }
  
  return year;
};

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingEnrollments: 0,
    totalCourses: 0,
    studentRecords: 0
  });
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [capacityData, setCapacityData] = useState<CapacityData[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [instructorRequests, setInstructorRequests] = useState<Array<{
    id: string;
    student_id: string;
    student_name?: string | null;
    instructor_id?: string | null;
    instructor_name?: string | null;
    subject_id?: string | null;
    section?: string | null;
    academic_year?: string | null;
    edit_reason?: string | null;
    edit_status?: string | null;
    created_at?: string | null;
  }>>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch pending enrollments from user_profiles table (where RegistrarEnrollment.tsx checks)
        const { data: enrollmentsData, error: enrollError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'student')
          .eq('enrollment_status', 'pending');
        
        if (enrollError) {
          console.error('Error fetching enrollments:', enrollError);
          throw enrollError;
        }
        const enrollments = enrollmentsData || [];

        // Fetch available courses - get all active courses
        let subjects = [];
        try {
          const { data: subjectsData, error: subjectsError } = await supabase
            .from('courses')
            .select('*')
            .order('name', { ascending: true });
          
          if (!subjectsError) {
            subjects = subjectsData || [];
          }
        } catch (error) {
          console.error('Error fetching courses:', error);
          subjects = [];
        }

        // Fetch student records count
        const { count: studentCount, error: studentError } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');
        
        if (studentError) {
          console.error('Error fetching student count:', studentError);
          throw studentError;
        }


        // Fetch recent activities from real data
        const activities = await fetchRecentActivities();

        // Fetch capacity data from real data
        const capacityStats = await fetchCapacityData();

        // Fetch enrollment data from real data
        const enrollmentStats = await fetchEnrollmentData();

        setStats({
          pendingEnrollments: enrollments.length,
          totalCourses: subjects.length,
          studentRecords: studentCount || 0
        });
        setRecentActivities(activities);
        setCapacityData(capacityStats);
        setEnrollmentData(enrollmentStats);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Fetch instructor grade-edit requests (from grades table)
  useEffect(() => {
    const fetchInstructorRequests = async () => {
      try {
        setRequestsLoading(true);
        const { data, error } = await supabase
          .from('grades')
          .select('id, student_id, subject_id, section, academic_year, edit_reason, edit_status, edit_requested_by, edit_requested_by_name, edit_student_name, created_at')
          .eq('edit_requested', true)
          .eq('edit_status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const mapped = (data || []).map((g: any) => ({
          id: g.id,
          student_id: g.student_id,
          student_name: g.edit_student_name,
          instructor_id: g.edit_requested_by,
          instructor_name: g.edit_requested_by_name,
          subject_id: g.subject_id,
          section: g.section,
          academic_year: g.academic_year,
          edit_reason: g.edit_reason,
          edit_status: g.edit_status,
          created_at: g.created_at
        }));
        setInstructorRequests(mapped);
      } catch (e) {
        console.error('Failed to load instructor requests:', e);
        setInstructorRequests([]);
      } finally {
        setRequestsLoading(false);
      }
    };
    fetchInstructorRequests();
  }, []);

  const refreshInstructorRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('id, student_id, subject_id, section, academic_year, edit_reason, edit_status, edit_requested_by, edit_requested_by_name, edit_student_name, created_at')
        .eq('edit_requested', true)
        .eq('edit_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map((g: any) => ({
        id: g.id,
        student_id: g.student_id,
        student_name: g.edit_student_name,
        instructor_id: g.edit_requested_by,
        instructor_name: g.edit_requested_by_name,
        subject_id: g.subject_id,
        section: g.section,
        academic_year: g.academic_year,
        edit_reason: g.edit_reason,
        edit_status: g.edit_status,
        created_at: g.created_at
      }));
      setInstructorRequests(mapped);
    } catch (e) {
      console.error('Failed to refresh requests:', e);
    }
  };

  const approveRequest = async (gradeId: string) => {
    try {
      const { error } = await supabase
        .from('grades')
        .update({ edit_status: 'granted', edit_requested: false, approved_at: new Date().toISOString() })
        .eq('id', gradeId);
      if (error) throw error;
      await refreshInstructorRequests();
    } catch (e) {
      console.error('Approve failed:', e);
    }
  };

  const denyRequest = async (gradeId: string) => {
    try {
      const { error } = await supabase
        .from('grades')
        .update({ edit_status: 'denied', edit_requested: false })
        .eq('id', gradeId);
      if (error) throw error;
      await refreshInstructorRequests();
    } catch (e) {
      console.error('Deny failed:', e);
    }
  };


  const fetchRecentActivities = async (): Promise<ActivityLog[]> => {
    try {
      // Fetch recent enrollment activities from user_profiles table
      const { data: enrollments, error: enrollError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          created_at,
          enrollment_status,
          student_id,
          display_name,
          first_name,
          last_name,
          middle_name,
          department,
          year_level
        `)
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (enrollError) {
        console.error('Error fetching recent activities:', enrollError);
        return [];
      }
      
      return enrollments?.map(enrollment => {
        // Helper function to get student name
        const getStudentName = () => {
          if (enrollment.display_name && enrollment.display_name.trim() !== '') {
            return enrollment.display_name;
          }
          
          // Fallback to concatenating first_name, last_name, middle_name
          const firstName = enrollment.first_name || '';
          const lastName = enrollment.last_name || '';
          const middleName = enrollment.middle_name || '';
          
          const nameParts = [firstName, middleName, lastName].filter(part => part.trim() !== '');
          return nameParts.length > 0 ? nameParts.join(' ') : 'Unknown Student';
        };

        return {
          id: enrollment.id,
          action: `Enrollment ${enrollment.enrollment_status}`,
          student: getStudentName(),
          subject: `${enrollment.department || 'Unknown'} - ${enrollment.year_level || 'Unknown'}`,
          time: new Date(enrollment.created_at).toLocaleString(),
          created_at: enrollment.created_at
        };
      }) || [];
    } catch (error) {
      console.error('Error in fetchRecentActivities:', error);
      return [];
    }
  };

  const fetchCapacityData = async (): Promise<CapacityData[]> => {
    try {
      // Try different join approaches - first let's see what tables exist
      console.log('Attempting to fetch sections table directly...');
      
      // First, let's try to fetch from sections table directly to see if it exists
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('*')
        .limit(5);
      
      if (sectionsError) {
        console.log('Sections table error:', sectionsError);
        // If sections table doesn't exist, fall back to using section values directly
        const { data: students, error } = await supabase
          .from('user_profiles')
          .select('department, year_level, section')
          .eq('role', 'student')
          .not('department', 'is', null)
          .not('year_level', 'is', null)
          .not('section', 'is', null);
        
        if (error) {
          console.error('Error fetching capacity data:', error);
          return [];
        }
        
        console.log('Sample section data:', students?.slice(0, 3));
        
        // Group students by program, year level, and section
        const capacityMap = new Map<string, CapacityData>();
        
        students?.forEach(student => {
          const sectionName = student.section || 'Unknown';
          const key = `${student.department}-${student.year_level}-${sectionName}`;
          const existing = capacityMap.get(key);
          
          if (existing) {
            existing.studentCount += 1;
          } else {
            capacityMap.set(key, {
              id: key,
              program: student.department || 'Unknown',
              yearLevel: student.year_level || 'Unknown',
              section: sectionName,
              studentCount: 1,
              maxCapacity: 50 // Default max capacity per section
            });
          }
        });
        
        return Array.from(capacityMap.values()).sort((a, b) => {
          if (a.program !== b.program) return a.program.localeCompare(b.program);
          if (a.yearLevel !== b.yearLevel) return a.yearLevel.localeCompare(b.yearLevel);
          return a.section.localeCompare(b.section);
        });
      } else {
        console.log('Sections table exists:', sectionsData);
        
        // Check what's in the sections table
        console.log('Sections table structure:', sectionsData[0]);
        
        // Since there's no foreign key relationship, let's try a different approach
        // First get all students with their section UIDs
        const { data: students, error } = await supabase
          .from('user_profiles')
          .select('department, year_level, section')
          .eq('role', 'student')
          .not('department', 'is', null)
          .not('year_level', 'is', null)
          .not('section', 'is', null);
        
        if (error) {
          console.error('Error fetching students:', error);
          return [];
        }
        
        console.log('Sample student data:', students?.slice(0, 3));
        
        // Create a map of section UIDs to names
        const sectionMap = new Map<string, string>();
        sectionsData.forEach(section => {
          sectionMap.set(section.id, section.name);
        });
        
        console.log('Section map:', Object.fromEntries(sectionMap));
        
        // Group students by program, year level, and section
        const capacityMap = new Map<string, CapacityData>();
        
        students?.forEach(student => {
          // Convert section UID to name using our map
          const sectionName = sectionMap.get(student.section) || student.section || 'Unknown';
          const key = `${student.department}-${student.year_level}-${sectionName}`;
          const existing = capacityMap.get(key);
          
          if (existing) {
            existing.studentCount += 1;
          } else {
            capacityMap.set(key, {
              id: key,
              program: student.department || 'Unknown',
              yearLevel: student.year_level || 'Unknown',
              section: sectionName,
              studentCount: 1,
              maxCapacity: 50 // Default max capacity per section
            });
          }
        });
        
        return Array.from(capacityMap.values()).sort((a, b) => {
          if (a.program !== b.program) return a.program.localeCompare(b.program);
          if (a.yearLevel !== b.yearLevel) return a.yearLevel.localeCompare(b.yearLevel);
          return a.section.localeCompare(b.section);
        });
      }
    } catch (error) {
      console.error('Error in fetchCapacityData:', error);
      return [];
    }
  };

  const fetchEnrollmentData = async (): Promise<EnrollmentData[]> => {
    try {
      // Fetch ALL students with school_year
      const { data: enrollments, error } = await supabase
        .from('user_profiles')
        .select('school_year, enrollment_status')
        .eq('role', 'student')
        .not('school_year', 'is', null); // Only get students with school_year
      
      if (error) {
        console.error('Error fetching enrollment data:', error);
        return [];
      }
      
      // Group students by school_year
      const yearlyData: { [key: string]: number } = {};
      
      enrollments?.forEach(enrollment => {
        const schoolYear = enrollment.school_year?.toString() || 'Unknown';
        yearlyData[schoolYear] = (yearlyData[schoolYear] || 0) + 1;
      });
      
      // Convert to array format and sort by year with professional formatting
      const result = Object.entries(yearlyData)
        .map(([year, count]) => ({
          year: formatSchoolYear(year),
          count,
          status: 'current'
        }))
        .sort((a, b) => {
          // Sort by year numerically if possible, otherwise alphabetically
          const yearA = parseInt(a.year.split('-')[0]) || 0;
          const yearB = parseInt(b.year.split('-')[0]) || 0;
          return yearB - yearA; // Most recent first
        });
      
      return result;
    } catch (error) {
      console.error('Error in fetchEnrollmentData:', error);
      return [];
    }
  };






  const handleViewAllActivity = () => {
    setShowActivityModal(true);
  };

  const handleViewCapacityDetails = () => {
    setShowCapacityModal(true);
  };

  const handleViewEnrollmentDetails = () => {
    navigate('/dashboard/enrollment-approvals');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Global fullscreen modals - centered on the monitor */}
      {showActivityModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowActivityModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-[92%] max-w-3xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">All Recent Activity</h3>
              <button onClick={() => setShowActivityModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto" style={{ maxHeight: '75vh' }}>
              {recentActivities.length === 0 ? (
                <div className="text-center text-gray-500 py-10">No recent activity.</div>
              ) : (
                <div className="space-y-3">
                  {recentActivities.map(item => (
                    <div key={item.id} className="flex items-start p-3 rounded-xl border hover:bg-gray-50 transition">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-800 font-medium truncate">
                          {item.action || item.description}
                          {item.student && <span className="text-blue-600"> - {item.student}</span>}
                          {item.subject && <span className="text-green-600"> - {item.subject}</span>}
                          {item.classes && <span className="text-red-600"> - {item.classes}</span>}
                        </p>
                        <p className="text-gray-500 text-sm">{item.time || item.created_at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setShowActivityModal(false)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {showCapacityModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCapacityModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-[92%] max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Capacity Details</h3>
              <button onClick={() => setShowCapacityModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto" style={{ maxHeight: '75vh' }}>
              {capacityData.length === 0 ? (
                <div className="text-center text-gray-500 py-10">No capacity data available.</div>
              ) : (
                <div className="divide-y">
                  {capacityData.map(row => (
                    <div key={row.id} className="py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-gray-900 font-semibold truncate">{row.program} - {row.yearLevel}</p>
                        <p className="text-gray-600 text-sm">Section: {row.section}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900 font-semibold">{row.studentCount}/{row.maxCapacity}</p>
                        <div className="w-36 h-2 bg-gray-200 rounded-full overflow-hidden ml-auto">
                          <div className={`${(row.studentCount/row.maxCapacity)*100 >= 100 ? 'bg-red-500' : (row.studentCount/row.maxCapacity)*100 >= 80 ? 'bg-yellow-500' : 'bg-green-500'} h-2`} style={{ width: `${Math.min((row.studentCount/row.maxCapacity)*100, 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setShowCapacityModal(false)} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Registrar Dashboard</h1>
                <p className="text-white/80 text-sm font-medium">Welcome back! Here's what's happening today.</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80">
                  <span>Last updated: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <StatsCard 
          title="Pending Enrollments" 
          value={stats.pendingEnrollments} 
          icon={<CheckSquare className="w-8 h-8 text-blue-500" />} 
          color="blue"
       
        />
        <StatsCard 
          title="Total Subjects" 
          value={stats.totalCourses} 
          icon={<BookOpen className="w-8 h-8 text-green-500" />} 
          color="green"
        />
        <StatsCard 
          title="Total Students" 
          value={stats.studentRecords} 
          icon={<Users className="w-8 h-8 text-purple-500" />} 
          color="purple"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2 bg-white/90 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-gray-600" />
              Recent Activity
            </h2>
            <span className="text-sm text-gray-500">{recentActivities.length} activities</span>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {recentActivities.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <Clock4 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No recent activity.</p>
              </div>
            ) : (
              recentActivities.map(activity => (
                <motion.div 
                  key={activity.id} 
                  className="flex items-start p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium">
                      {activity.action || activity.description}
                      {activity.student && <span className="text-blue-600"> - {activity.student}</span>}
                      {activity.subject && <span className="text-green-600"> - {activity.subject}</span>}
                      {activity.classes && <span className="text-red-600"> - {activity.classes}</span>}
                    </p>
                    <p className="text-gray-500 text-sm">{activity.time || activity.created_at}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          <button 
            onClick={handleViewAllActivity}
            className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center hover:underline"
          >
            View all activity
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </motion.div>

        {/* Capacity Tracking */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/90 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <Users className="w-5 h-5 mr-2 text-gray-600" />
              Capacity Tracking
            </h2>
          </div>
          <div className="border-t border-gray-200 my-2"></div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {capacityData.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No capacity data available.</p>
              </div>
            ) : (
              capacityData.map(capacity => (
                <CapacityItem 
                  key={capacity.id}
                  program={capacity.program}
                  yearLevel={capacity.yearLevel}
                  section={capacity.section}
                  studentCount={capacity.studentCount}
                  maxCapacity={capacity.maxCapacity}
                />
              ))
            )}
          </div>
          <button 
            onClick={handleViewCapacityDetails}
            className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center hover:underline"
          >
            View capacity details
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </motion.div>
        
        {/* Grade Change Request moved next to Enrollment Summary below */}
      </div>

      {/* Enrollment Summary and Grade Change Request side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white/90 rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart4 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Enrollment Summary</h2>
              <p className="text-sm text-gray-500">Students by school year</p>
            </div>
          </div>
          <button 
            onClick={handleViewEnrollmentDetails}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors"
          >
            View All →
          </button>
        </div>
        <div className="border-t border-gray-200 mb-4"></div>

        {/* Professional Bar Chart with Proper Alignment */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
          {enrollmentData.length > 0 ? (
            <div className="space-y-4">
              {/* Chart Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Total Students</span>
                </div>
                <div className="text-sm text-gray-500">
                  {enrollmentData.reduce((sum, item) => sum + item.count, 0)} total students
                </div>
              </div>

              {/* Chart Container - Dynamic Responsive Design */}
              <div className="relative overflow-x-auto">
                {/* Chart area with dynamic spacing based on number of years */}
                <div className={`flex h-64 ${enrollmentData.length <= 3 ? 'min-w-[400px]' : enrollmentData.length <= 6 ? 'min-w-[600px]' : 'min-w-[800px]'}`}>
                  {/* Y-axis with proper alignment */}
                  <div className="flex flex-col justify-between pr-3 text-xs text-gray-500 font-medium flex-shrink-0">
                    {[1000, 900, 800, 700, 600, 500, 400, 300, 200, 100].map((value, i) => (
                      <div key={i} className="h-6 flex items-center justify-end">
                        {value}
                      </div>
                    ))}
                  </div>
                  
                  {/* Chart area with grid lines and bars */}
                  <div className="flex-1 relative">
                    {/* Horizontal grid lines with proper spacing */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[1000, 900, 800, 700, 600, 500, 400, 300, 200, 100].map((value, i) => (
                        <div key={i} className="border-t border-gray-300 h-6"></div>
                      ))}
                    </div>
                    
                    {/* Dynamic bars with responsive spacing */}
                    <div className={`relative flex items-end h-full px-2 ${enrollmentData.length <= 3 ? 'gap-6' : enrollmentData.length <= 6 ? 'gap-4' : 'gap-2'}`}>
                      {enrollmentData.map((item) => {
                        // Fixed scale 0–1000 to align with Y-axis indicators 100–1000
                        const minScale = 0;
                        const maxScale = 1000;
                        const clampedValue = Math.max(minScale, Math.min(maxScale, item.count));
                        // Subtract a slightly larger margin so values just below a grid line don't touch it visually
                        const heightPercentage = Math.max((clampedValue / maxScale) * 100 - 1.5, 0);
                        
                        // Dynamic bar width based on number of years
                        const barWidth = enrollmentData.length <= 3 ? 'w-16 sm:w-20 md:w-24' : 
                                       enrollmentData.length <= 6 ? 'w-14 sm:w-16 md:w-20' : 
                                       'w-12 sm:w-14 md:w-16';
                        
                        return (
                          <div key={item.year} className={`flex flex-col items-center justify-end h-full ${barWidth}`}>
                            {/* Value indicator above bar */}
                            <div className="text-xs font-bold text-gray-800 mb-1 bg-white px-2 py-1 rounded-full shadow-sm border whitespace-nowrap">
                              {item.count}
                            </div>
                            
                            {/* Bar with dynamic height */}
                            <div 
                              className={`${barWidth} bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer relative group`}
                              style={{ 
                                height: `${Math.max(heightPercentage, 5)}%` // Minimum 5% for visibility
                              }}
                            >
                              {/* Hover effect */}
                              <div className="absolute inset-0 bg-gradient-to-t from-blue-700 to-blue-500 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Dynamic year labels with responsive spacing */}
                <div className={`flex mt-2 px-2 ${enrollmentData.length <= 3 ? 'gap-6' : enrollmentData.length <= 6 ? 'gap-4' : 'gap-2'}`}>
                  {enrollmentData.map((item) => {
                    // Dynamic label width based on number of years
                    const labelWidth = enrollmentData.length <= 3 ? 'w-16 sm:w-20 md:w-24' : 
                                     enrollmentData.length <= 6 ? 'w-14 sm:w-16 md:w-20' : 
                                     'w-12 sm:w-14 md:w-16';
                    
                    return (
                      <div key={item.year} className={`text-center ${labelWidth}`}>
                        <div className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-1.5 rounded-lg text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-shadow duration-300 whitespace-nowrap translate-x-1 sm:translate-x-9">
                          {item.year}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart4 className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold text-lg">No Enrollment Data</p>
              <p className="text-sm text-gray-500 mt-1">Students will appear here once they enroll</p>
            </div>
          )}
        </div>
      </motion.div>
         {/* Instructor Grade Edit Requests */}
         <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="bg-white/90 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <ShieldAlert className="w-5 h-5 mr-2 text-amber-600" />
           Grade Change Request
            </h2>
            <span className="text-sm text-gray-500">{instructorRequests.length} request(s)</span>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {requestsLoading ? (
              <div className="text-gray-500 text-center py-8">Loading requests…</div>
            ) : instructorRequests.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No pending requests.</div>
            ) : (
              instructorRequests.map(req => {
                const status = (req.edit_status || '').toLowerCase();
                const requestedAt = req.created_at ? new Date(req.created_at).toLocaleString() : 'Unknown';
                return (
                  <div key={req.id} className="p-3 rounded-xl border bg-white/80">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">Instructor: {req.instructor_name || 'Unknown Instructor'}</div>
                        <div className="text-xs text-gray-900 truncate">Student: {req.student_name || req.student_id}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${status === 'pending' ? 'bg-amber-100 text-amber-700' : status === 'granted' ? 'bg-emerald-100 text-emerald-700' : status === 'denied' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'}`}>{status || 'pending'}</span>
                        <button onClick={() => approveRequest(req.id)} className="px-2 py-1 text-xs rounded-md bg-emerald-600 text-white">Approve</button>
                        <button onClick={() => denyRequest(req.id)} className="px-2 py-1 text-xs rounded-md bg-rose-600 text-white">Deny</button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 truncate">Section: {req.section || 'N/A'} • AY: {req.academic_year || 'N/A'} • Requested: {requestedAt}</div>
                    {req.edit_reason && (
                      <div className="mt-1 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 whitespace-pre-wrap break-words">
                        {req.edit_reason}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Helper Components
const StatsCard: React.FC<{ 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string;
  onClick?: () => void;
}> = ({ title, value, icon, color, onClick }) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    green: "bg-green-50 border-green-200 hover:bg-green-100",
    purple: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    red: "bg-red-50 border-red-200 hover:bg-red-100",
  };

  return (
    <motion.div 
      whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
      className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-2xl p-6 flex items-center transition-all duration-300 cursor-pointer`}
      onClick={onClick}
    >
      <div className="mr-4">
        {icon}
      </div>
      <div>
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
      </div>
    </motion.div>
  );
};

const CapacityItem: React.FC<{ 
  program: string; 
  yearLevel: string; 
  section: string;
  studentCount: number;
  maxCapacity: number;
}> = ({ program, yearLevel, section, studentCount, maxCapacity }) => {
  const capacityPercentage = (studentCount / maxCapacity) * 100;
  const isNearCapacity = capacityPercentage >= 80;
  const isAtCapacity = capacityPercentage >= 100;

  const getCapacityColor = () => {
    if (isAtCapacity) return "bg-red-500";
    if (isNearCapacity) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getCapacityIcon = () => {
    if (isAtCapacity) return "🔴";
    if (isNearCapacity) return "🟡";
    return "🟢";
  };

  return (
    <motion.div 
      className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
      whileHover={{ x: 5 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-1">
        <p className="text-gray-800 font-medium">
          {program} - {yearLevel}
        </p>
        <p className="text-gray-600 text-sm">
           {section}
        </p>
      </div>
      <div className="text-right">
        <p className="text-gray-800 font-medium mb-2">
          {studentCount}/{maxCapacity}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${getCapacityColor()}`}
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            ></div>
          </div>
          <span className="text-lg">{getCapacityIcon()}</span>
        </div>
      </div>
    </motion.div>
    
  );
};

const RegistrarDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/dashboard" element={<DashboardOverview />} />
        <Route path="/enrollment-approvals" element={<RegistrarEnrollment />} />
        <Route path="/student-records" element={<StudentRecords />} />
        <Route path="/subject-review" element={<RegistrarGradeViewer />} />
        <Route path="/student-grades" element={<StudentGrades />} />
        <Route path="/class-list" element={<ClassList />} />
        <Route path="/prospectus" element={<RegistrarProspectus />} />
        <Route path="/profile" element={<Settings />} />
        <Route path="*" element={<DashboardOverview />} />
      </Routes>
    </DashboardLayout>
  );
};

export default RegistrarDashboard; 
