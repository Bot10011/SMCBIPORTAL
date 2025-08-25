import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import RegistrarEnrollment from './RegistrarEnrollment';
import { motion } from 'framer-motion';
import ClassList from './ClassList';
import Settings from './Settings';
import { 
  CheckSquare, 
  FileText, 
  AlertTriangle, 
  BookOpen, 
  BarChart4, 
  Calendar, 
  Clock,
  Users,
  Clock4
} from 'lucide-react';
import { RegistrarGradeViewer } from './Allcourse';
import { supabase } from '../lib/supabase';
import StudentGrades from './StudentGrades';

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

type ScheduleEvent = {
  id: string;
  date: string;
  event: string;
  type: 'important' | 'meeting' | 'deadline' | 'regular';
  description?: string;
};

type EnrollmentData = {
  month: string;
  count: number;
  status: string;
};

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingEnrollments: 0,
    totalCourses: 0,
    studentRecords: 0,
    classesWithConflicts: 0
  });
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch classes with conflicts (check for schedule overlaps)
        const conflicts = await fetchClassConflicts();

        // Fetch recent activities from real data
        const activities = await fetchRecentActivities();

        // Fetch schedule events from real data
        const events = await fetchScheduleEvents();

        // Fetch enrollment data from real data
        const enrollmentStats = await fetchEnrollmentData();

        setStats({
          pendingEnrollments: enrollments.length,
          totalCourses: subjects.length,
          studentRecords: studentCount || 0,
          classesWithConflicts: conflicts.length
        });
        setRecentActivities(activities);
        setScheduleEvents(events);
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

  const fetchClassConflicts = async (): Promise<Array<{id: string, class_name: string, conflict: string}>> => {
    try {
      // Try to fetch class conflicts, but handle missing status column gracefully
      let conflicts: Array<{id: string, subject?: {code?: string, name?: string}, student?: {student_id?: string, first_name?: string, last_name?: string}}> = [];
      try {
        const { data: conflictsData, error } = await supabase
          .from('enrollcourse')
          .select(`
            id,
            subject:courses(code, name),
            student:user_profiles(student_id, first_name, last_name)
          `)
          .eq('status', 'conflict')
          .limit(5);
        
        if (!error) {
          conflicts = conflictsData || [];
        }
      } catch {
        // If status column doesn't exist, return empty array
        conflicts = [];
      }
      
      return conflicts?.map(conflict => ({
        id: conflict.id,
        class_name: (conflict.subject as {code?: string})?.code || 'Unknown',
        conflict: 'Schedule conflict detected'
      })) || [];
    } catch (error) {
      console.error('Error in fetchClassConflicts:', error);
      return [];
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
      
      return enrollments?.map(enrollment => ({
        id: enrollment.id,
        action: `Enrollment ${enrollment.enrollment_status}`,
        student: enrollment.display_name || 'Unknown Student',
        subject: `${enrollment.department || 'Unknown'} - ${enrollment.year_level || 'Unknown'}`,
        time: new Date(enrollment.created_at).toLocaleString(),
        created_at: enrollment.created_at
      })) || [];
    } catch (error) {
      console.error('Error in fetchRecentActivities:', error);
      return [];
    }
  };

  const fetchScheduleEvents = async (): Promise<ScheduleEvent[]> => {
    try {
      // Fetch real schedule events from the database
      // For now, we'll create events based on enrollment deadlines and semester dates
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      
      // Create semester-based events
      const events: ScheduleEvent[] = [];
      
      // Add semester start/end dates
      if (currentMonth >= 5 && currentMonth <= 8) { // June to September
        events.push({
          id: '1',
          date: 'June 15',
          event: '1st Semester Start',
          type: 'important',
          description: 'First semester classes begin'
        });
      } else if (currentMonth >= 9 && currentMonth <= 11) { // October to December
        events.push({
          id: '2',
          date: 'October 15',
          event: '2nd Semester Start',
          type: 'important',
          description: 'Second semester classes begin'
        });
      }
      
      // Add enrollment deadline (30 days before semester start)
      events.push({
        id: '3',
        date: 'May 15',
        event: 'Enrollment Deadline',
        type: 'deadline',
        description: 'Final deadline for student enrollment'
      });
      
      // Add grade submission deadline
      events.push({
        id: '4',
        date: 'December 15',
        event: 'Grade Submission',
        type: 'deadline',
        description: 'Deadline for grade submission'
      });
      
      return events;
    } catch (error) {
      console.error('Error in fetchScheduleEvents:', error);
      return [];
    }
  };

  const fetchEnrollmentData = async (): Promise<EnrollmentData[]> => {
    try {
      // Fetch real enrollment data by month from user_profiles table
      const { data: enrollments, error } = await supabase
        .from('user_profiles')
        .select('created_at, enrollment_status')
        .eq('role', 'student')
        .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString()); // From January 1st of current year
      
      if (error) {
        console.error('Error fetching enrollment data:', error);
        return [];
      }
      
      // Group enrollments by month
      const monthlyData: { [key: string]: number } = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      enrollments?.forEach(enrollment => {
        const date = new Date(enrollment.created_at);
        const month = monthNames[date.getMonth()];
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      });
      
      // Convert to array format
      return monthNames.map(month => ({
        month,
        count: monthlyData[month] || 0,
        status: monthNames.indexOf(month) < new Date().getMonth() ? 'completed' : 'pending'
      }));
    } catch (error) {
      console.error('Error in fetchEnrollmentData:', error);
      return [];
    }
  };





  const handleViewAllActivity = () => {
    // Navigate to activity log page or show modal
    console.log('View all activity clicked');
  };

  const handleViewFullCalendar = () => {
    // Navigate to calendar page or show modal
    console.log('View full calendar clicked');
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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
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
        <StatsCard 
          title="Classes with Conflicts" 
          value={stats.classesWithConflicts} 
          icon={<AlertTriangle className="w-8 h-8 text-red-500" />} 
          color="red"
        
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

        {/* Calendar Overview */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/90 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-gray-600" />
              Upcoming Schedule
            </h2>
            <span className="text-sm text-gray-500">{scheduleEvents.length} events</span>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {scheduleEvents.map(event => (
              <ScheduleItem 
                key={event.id}
                date={event.date} 
                event={event.event} 
                type={event.type}
                description={event.description}
              />
            ))}
          </div>
          <button 
            onClick={handleViewFullCalendar}
            className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center hover:underline"
          >
            View full calendar
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </motion.div>
      </div>

      {/* Enrollment Summary Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white/90 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <BarChart4 className="w-5 h-5 mr-2 text-gray-600" />
            Enrollment Summary
          </h2>
          <button 
            onClick={handleViewEnrollmentDetails}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
          >
            View Details
          </button>
        </div>
        <div className="h-60">
          {enrollmentData.length > 0 ? (
            <div className="flex items-end justify-between h-full space-x-2">
              {enrollmentData.map((item, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all duration-300 hover:from-blue-600 hover:to-blue-400"
                    style={{ height: `${(item.count / 300) * 200}px` }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-2 text-center">
                    <div className="font-medium">{item.month}</div>
                    <div className="text-gray-400">{item.count}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <BarChart4 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No enrollment data available</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
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

const ScheduleItem: React.FC<{ 
  date: string; 
  event: string; 
  type: string;
  description?: string;
}> = ({ date, event, type, description }) => {
  const typeClasses = {
    important: "bg-red-100 text-red-800",
    meeting: "bg-blue-100 text-blue-800",
    deadline: "bg-yellow-100 text-yellow-800",
    regular: "bg-green-100 text-green-800",
  };

  return (
    <motion.div 
      className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
      whileHover={{ x: 5 }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-12 text-center text-gray-600 font-medium text-sm flex-shrink-0">
        {date}
      </div>
      <div className="ml-3 flex-1">
        <p className="text-gray-800 font-medium">{event}</p>
        {description && (
          <p className="text-gray-500 text-xs mt-1">{description}</p>
        )}
      </div>
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${typeClasses[type as keyof typeof typeClasses]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
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
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<DashboardOverview />} />
      </Routes>
    </DashboardLayout>
  );
};

export default RegistrarDashboard; 
