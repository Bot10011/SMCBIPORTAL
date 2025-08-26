import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import ProgramHeadEnrollment from './ProgramHeadEnrollment';
import CoursesOffered from './CoursesOffered';
import SubjectAssignment from './SubjectAssignment';
import UserManagement from './UserManagement';
import InstructorManagement from './InstructorManagement';
import ClassManagement from './ClassManagement';
import Settings from './Settings';

import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  ClipboardList,
  BookOpenCheck,
  BarChart3,
  Calendar,
  UserPlus,
  GraduationCap,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  FileText,
  Settings as SettingsIcon,
  Users2,
  Award
} from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';
import { supabase } from '../lib/supabase';

// Dashboard Overview Component
const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState({
    activeStudents: 0,
    pendingEnrollments: 0,
    totalSubjects: 0,
    activeInstructors: 0,
    totalClasses: 0,
    enrollmentRate: 0
  });
  const [recentEnrollments, setRecentEnrollments] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setError(null);
        setLoading(true);

        // Fetch enrollment data
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollcourse')
          .select('student_id, subject_id, status, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        if (enrollmentsError) throw enrollmentsError;

        // Fetch courses/subjects
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id, code, name, units');

        if (coursesError) throw coursesError;

        // Fetch user profiles for students and instructors
        const { data: userProfiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, role, first_name, last_name, department');

        if (profilesError) throw profilesError;

        // Fetch recent activities from actual data
        const { data: recentEnrollmentsData, error: recentError } = await supabase
          .from('enrollcourse')
          .select(`
            id,
            created_at,
            status,
            student_id,
            subject_id
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentError) throw recentError;

        // Fetch instructor assignments
        const { data: instructorAssignments, error: instructorError } = await supabase
          .from('instructor_assignments')
          .select(`
            id,
            created_at,
            instructor:user_profiles(first_name, last_name),
            subject:courses(code, name)
          `)
          .order('created_at', { ascending: false })
          .limit(3);

        if (instructorError) {
          console.log('No instructor assignments table found, using mock data');
        }

        // Fetch subject assignments
        const { data: subjectAssignments, error: subjectAssignError } = await supabase
          .from('subject_assignments')
          .select(`
            id,
            created_at,
            student:user_profiles(first_name, last_name),
            subject:courses(code, name)
          `)
          .order('created_at', { ascending: false })
          .limit(3);

        if (subjectAssignError) {
          console.log('No subject assignments table found, using mock data');
        }

        // Calculate statistics
        const uniqueStudents = new Set(enrollments?.map(e => e.student_id) || []);
        const pendingEnrollments = enrollments?.filter(e => e.status === 'pending').length || 0;
        const activeInstructors = userProfiles?.filter(u => u.role === 'teacher').length || 0;
        const totalClasses = courses?.length || 0;

        // Calculate enrollment rate (this semester vs last semester)
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const isFirstSemester = currentMonth >= 5 && currentMonth <= 9; // June to October
        const isSecondSemester = currentMonth >= 10 || currentMonth <= 2; // November to March

        let enrollmentRate = 0;
        if (enrollments && enrollments.length > 0) {
          const recentEnrollments = enrollments.filter(e => {
            const enrollDate = new Date(e.created_at);
            const enrollMonth = enrollDate.getMonth();
            return (isFirstSemester && enrollMonth >= 5 && enrollMonth <= 9) ||
                   (isSecondSemester && (enrollMonth >= 10 || enrollMonth <= 2));
          });
          enrollmentRate = Math.round((recentEnrollments.length / enrollments.length) * 100);
        }

        // Process recent enrollments for display
        const processedEnrollmentsData = recentEnrollmentsData?.map((enrollment, index) => {
          const student = userProfiles?.find(u => u.id === enrollment.student_id);
          const subject = courses?.find(c => c.id === enrollment.subject_id);
          return {
            id: `enrollment-${index}`,
            studentName: student ? 
              `${student.first_name} ${student.last_name}` : 'Unknown Student',
            subjectCode: subject?.code || 'Unknown Subject',
            status: enrollment.status,
            date: new Date(enrollment.created_at).toLocaleDateString()
          };
        }) || [];

        // Process subject statistics
        const subjectStatsData = courses?.slice(0, 6).map(course => ({
          code: course.code,
          name: course.name,
          units: course.units,
          enrolledStudents: enrollments?.filter(e => e.subject_id === course.id).length || 0
        })) || [];

        // Process recent activities from actual data
        const activities: any[] = [];
        
        // Add enrollment activities
        if (processedEnrollmentsData) {
          processedEnrollmentsData.forEach(enrollment => {
            activities.push({
              id: `enrollment-${enrollment.id}`,
              action: 'Student enrollment',
              student: enrollment.studentName,
              subject: enrollment.subjectCode,
              time: enrollment.date,
              type: 'enrollment'
            });
          });
        }

        // Add instructor assignment activities
        if (instructorAssignments) {
          instructorAssignments.forEach((assignment: any) => {
            activities.push({
              id: `instructor-${assignment.id}`,
              action: 'Instructor assigned',
              student: assignment.instructor ? 
                `${assignment.instructor.first_name} ${assignment.instructor.last_name}` : 'Unknown Instructor',
              subject: assignment.subject?.code || 'Unknown Subject',
              time: new Date(assignment.created_at).toLocaleDateString(),
              type: 'instructor'
            });
          });
        }

        // Add subject assignment activities
        if (subjectAssignments) {
          subjectAssignments.forEach((assignment: any) => {
            activities.push({
              id: `subject-${assignment.id}`,
              action: 'Subject assigned',
              student: assignment.student ? 
                `${assignment.student.first_name} ${assignment.student.last_name}` : 'Unknown Student',
              subject: assignment.subject?.code || 'Unknown Subject',
              time: new Date(assignment.created_at).toLocaleDateString(),
              type: 'subject'
            });
          });
        }

        // Sort activities by time and take the most recent 5
        const sortedActivities = activities
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, 5);

        // Generate calendar events based on actual data
        const currentEvents = [];
        const today = new Date();
        
        // Add enrollment deadline (end of current month)
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        currentEvents.push({
          date: endOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          title: 'Enrollment Deadline',
          time: '11:59 PM',
          type: 'deadline'
        });

        // Add faculty meeting (first Monday of next month)
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const firstMonday = new Date(nextMonth);
        while (firstMonday.getDay() !== 1) {
          firstMonday.setDate(firstMonday.getDate() + 1);
        }
        currentEvents.push({
          date: firstMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          title: 'Faculty Meeting',
          time: '1:00 PM - 3:00 PM',
          type: 'meeting'
        });

        // Add grade submission deadline (15th of next month)
        const gradeDeadline = new Date(today.getFullYear(), today.getMonth() + 1, 15);
        currentEvents.push({
          date: gradeDeadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          title: 'Grade Submission Deadline',
          time: '11:59 PM',
          type: 'deadline'
        });

        // Add department planning (last Friday of current month)
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const lastFriday = new Date(lastDay);
        while (lastFriday.getDay() !== 5) {
          lastFriday.setDate(lastFriday.getDate() - 1);
        }
        currentEvents.push({
          date: lastFriday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          title: 'Department Planning',
          time: '2:00 PM - 4:00 PM',
          type: 'regular'
        });

        // Generate system status based on actual data
        const systemStatusData = [
          {
            title: 'Enrollment System',
            status: 'operational',
            description: pendingEnrollments > 0 ? `${pendingEnrollments} pending enrollments` : 'All enrollments processed'
          },
          {
            title: 'Student Records',
            status: 'operational',
            description: `${uniqueStudents.size} active students`
          },
          {
            title: 'Subject Management',
            status: 'operational',
            description: `${totalClasses} subjects available`
          },
          {
            title: 'Instructor System',
            status: 'operational',
            description: `${activeInstructors} active instructors`
          }
        ];

        setStats({
          activeStudents: uniqueStudents.size,
          pendingEnrollments,
          totalSubjects: totalClasses,
          activeInstructors,
          totalClasses,
          enrollmentRate
        });

        setRecentEnrollments(processedEnrollmentsData);
        setSubjectStats(subjectStatsData);
        setRecentActivities(sortedActivities);
        setCalendarEvents(currentEvents);
        setSystemStatus(systemStatusData);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(errorMsg);
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded mb-4">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 rounded-2xl shadow-lg"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Program Head Dashboard</h1>
              <p className="text-white/80 text-sm font-medium">Comprehensive overview of academic program management</p>
            </div>
          </div>
          <div className="text-right text-white/80">
            <p className="text-sm">Current Semester</p>
            <p className="text-lg font-semibold">2024-2025</p>
          </div>
        </div>
      </motion.div>

      {/* Main Stats Cards */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatsCard 
          title="Active Students" 
          value={stats.activeStudents} 
          icon={<Users className="w-8 h-8 text-blue-500" />} 
          color="blue"
          trend={`${stats.enrollmentRate}% enrollment rate`}
        />
        <StatsCard 
          title="Pending Enrollments" 
          value={stats.pendingEnrollments} 
          icon={<UserPlus className="w-8 h-8 text-amber-500" />} 
          color="amber"
          trend="Requires attention"
        />
        <StatsCard 
          title="Total Subjects" 
          value={stats.totalSubjects} 
          icon={<BookOpen className="w-8 h-8 text-emerald-500" />} 
          color="emerald"
          trend="Curriculum active"
        />
        <StatsCard 
          title="Active Instructors" 
          value={stats.activeInstructors} 
          icon={<Users2 className="w-8 h-8 text-purple-500" />} 
          color="purple"
          trend="Faculty assigned"
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Enrollments & Subject Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Enrollments */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
                Recent Enrollments
              </h2>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View all
              </button>
            </div>
            
            <div className="space-y-3">
              {recentEnrollments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No recent enrollments</p>
                </div>
              ) : (
                recentEnrollments.map((enrollment, index) => (
                  <div key={enrollment.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        enrollment.status === 'active' ? 'bg-green-500' : 
                        enrollment.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-800">{enrollment.studentName}</p>
                        <p className="text-sm text-gray-600">{enrollment.subjectCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        enrollment.status === 'active' ? 'bg-green-100 text-green-800' : 
                        enrollment.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {enrollment.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{enrollment.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Subject Statistics */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                Subject Overview
              </h2>
              <select className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="current">Current Semester</option>
                <option value="previous">Previous Semester</option>
              </select>
            </div>

            <div className="space-y-4">
              {subjectStats.map((subject, index) => {
                const maxStudents = Math.max(...subjectStats.map(s => s.enrolledStudents), 1);
                const percent = Math.round((subject.enrolledStudents / maxStudents) * 100);
                
                return (
                  <div key={subject.code} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-700 font-medium">{subject.code}</span>
                        <span className="text-gray-500 text-sm ml-2">({subject.units} units)</span>
                      </div>
                      <span className="text-gray-500 text-sm">{subject.enrolledStudents} students</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      ></motion.div>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{subject.name}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right Column - Quick Actions & Calendar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2 text-indigo-600" />
              Quick Actions
            </h2>
            
            <div className="space-y-3">
              <QuickActionButton 
                icon={<UserPlus className="w-5 h-5" />}
                title="Enroll New Student"
                description="Add new student to program"
                color="blue"
                onClick={() => window.location.href = '/dashboard/enroll-student'}
              />
              <QuickActionButton 
                icon={<BookOpen className="w-5 h-5" />}
                title="Assign Subjects"
                description="Manage subject assignments"
                color="green"
                onClick={() => window.location.href = '/dashboard/assign-subjects'}
              />
              <QuickActionButton 
                icon={<Users2 className="w-5 h-5" />}
                title="Manage Instructors"
                description="Update instructor assignments"
                color="purple"
                onClick={() => window.location.href = '/dashboard/instructor-management'}
              />
              <QuickActionButton 
                icon={<ClipboardList className="w-5 h-5" />}
                title="View Classes"
                description="Monitor class schedules"
                color="amber"
                onClick={() => window.location.href = '/dashboard/class-management'}
              />
            </div>
          </motion.div>

          {/* Academic Calendar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-red-600" />
              Academic Calendar
            </h2>
            
            <div className="space-y-3">
              {calendarEvents.map((event, index) => (
                <CalendarEvent 
                  key={index}
                  date={event.date} 
                  title={event.title} 
                  time={event.time} 
                  type={event.type} 
                />
              ))}
            </div>
            
            <button className="mt-4 text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
              View full calendar
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Bottom Row - Recent Activities & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gray-600" />
            Recent Activities
          </h2>
          
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent activities</p>
              </div>
            ) : (
              recentActivities.map(activity => (
                <div key={activity.id} className="flex items-start p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3"></div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium">
                      {activity.action}
                      {activity.student && <span className="text-blue-600"> - {activity.student}</span>}
                      {activity.subject && <span className="text-green-600"> - {activity.subject}</span>}
                    </p>
                    <p className="text-gray-500 text-sm">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <button className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
            View all activity
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </motion.div>

        {/* System Status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            System Status
          </h2>
          
          <div className="space-y-4">
            {systemStatus.map((status, index) => (
              <StatusItem 
                key={index}
                title={status.title}
                status={status.status}
                description={status.description}
              />
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center text-green-800">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">All systems operational</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Helper Components
const StatsCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string; trend: string }> = ({ 
  title, value, icon, color, trend 
}) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-100",
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    purple: "bg-purple-50 border-purple-100",
  };

  return (
    <motion.div 
      whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
      className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-2xl p-6 transition-all duration-300`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className="bg-white p-2 rounded-xl shadow-sm">
          {icon}
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">{trend}</p>
    </motion.div>
  );
};

const QuickActionButton: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}> = ({ icon, title, description, color, onClick }) => {
  const colorClasses = {
    blue: "hover:bg-blue-50 border-blue-200 text-blue-700",
    green: "hover:bg-green-50 border-green-200 text-green-700",
    purple: "hover:bg-purple-50 border-purple-200 text-purple-700",
    amber: "hover:bg-amber-50 border-amber-200 text-amber-700",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-xl border-2 transition-all duration-200 text-left ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white">
          {icon}
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm opacity-75">{description}</p>
        </div>
      </div>
    </button>
  );
};

const CalendarEvent: React.FC<{ date: string; title: string; time: string; type: string }> = ({ 
  date, title, time, type 
}) => {
  const typeClasses = {
    important: "border-red-400 bg-red-50",
    meeting: "border-blue-400 bg-blue-50",
    deadline: "border-amber-400 bg-amber-50",
    regular: "border-emerald-400 bg-emerald-50",
  };

  return (
    <div className={`p-3 rounded-xl border-l-4 ${typeClasses[type as keyof typeof typeClasses]} hover:shadow-md transition-shadow`}>
      <div className="flex justify-between">
        <span className="font-semibold text-gray-800">{title}</span>
        <span className="text-sm text-gray-500">{date}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{time}</p>
    </div>
  );
};

const StatusItem: React.FC<{ title: string; status: string; description: string }> = ({ 
  title, status, description 
}) => {
  const statusIcon = status === 'operational' ? 
    <CheckCircle className="w-4 h-4 text-green-500" /> : 
    <AlertTriangle className="w-4 h-4 text-red-500" />;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
      <div className="flex items-center gap-3">
        {statusIcon}
        <div>
          <p className="font-medium text-gray-800">{title}</p>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        status === 'operational' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {status}
      </span>
    </div>
  );
};

const ProgramHeadDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/dashboard" element={<DashboardOverview />} />
          <Route path="/enroll-student" element={<ProgramHeadEnrollment />} />
          <Route path="/assign-subjects" element={<SubjectAssignment />} />
          <Route path="/academic-history" element={<CoursesOffered />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/instructor-management" element={<InstructorManagement />} />
          <Route path="/class-management" element={<ClassManagement />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<DashboardOverview />} />
        </Routes>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default ProgramHeadDashboard; 
