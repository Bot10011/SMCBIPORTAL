import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import ProgramHeadEnrollment from './ProgramHeadEnrollment';
import CoursesOffered from './CoursesOffered';
import SubjectAssignment from './SubjectAssignment';
import ClassManagement from './ClassManagement';
import InstructorManagement from './InstructorManagement';
import UserManagement from './UserManagement';
import Settings from './Settings';

import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  ClipboardList,
  BookOpenCheck,
  BarChart3,
  Calendar,
  Bell,
  StickyNote,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
// import { getGoogleClassroomConnectionInfo } from '../lib/services/googleClassroomService';
// import { StudentGoogleClassroom } from '../components/StudentGoogleClassroom';

// Import program head-specific components

// Dashboard Overview Component
const DashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    activeStudents: 0,
    pendingRequests: 0,
    subjectsManaged: 0,
    completedSubjects: 0
  });
  const [studentPerformance, setStudentPerformance] = useState<{
    section: string;
    students: number;
    maxCapacity: number;
    color: string;
    isFull: boolean;
  }[]>([]);
  // Removed enrollmentData state as we now use enrollmentStudents for detailed view
  const [enrollmentStudents, setEnrollmentStudents] = useState<Array<{
    id: string;
    student_id: string;
    first_name: string;
    last_name: string;
    section: string;
    section_name: string;
    enrollment_status: string;
    department: string;
    year_level: string;
    created_at: string;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  // Unified panel state replaces separate modal flags
  const perfListRef = React.useRef<HTMLDivElement | null>(null);
  const [activePanel, setActivePanel] = useState<'notifications' | 'notes' | 'calendar'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [personalNotes, setPersonalNotes] = useState<Array<{ id: string; content: string; created_at: string }>>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState<string>("");
  const [programNotifications, setProgramNotifications] = useState<Array<{ id: string; title: string; message: string; severity: 'announcement' | 'reminder' | 'deadline' | 'exam' | 'meeting' | 'advisory' | 'info' | 'success' | 'warning' | 'error'; audience: 'instructor' | 'student' | 'programhead' | 'all'; created_by: string | null; created_at: string; expires_at?: string | null; created_by_name?: string | null }>>([]);
  const [editingNotifId, setEditingNotifId] = useState<string | null>(null);
  const [editingNotif, setEditingNotif] = useState<{ title: string; message: string; severity: 'announcement' | 'reminder' | 'deadline' | 'exam' | 'meeting' | 'advisory' | 'info' | 'success' | 'warning' | 'error'; audience: 'instructor' | 'student' | 'programhead' | 'all' }>({ title: '', message: '', severity: 'announcement', audience: 'instructor' });
  const [viewMode, setViewMode] = useState<'capacity' | 'enrollment'>('capacity');
  const [isLoadingEnrollment, setIsLoadingEnrollment] = useState(false);
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<string>('all');
  const [notifDurationMinutes, setNotifDurationMinutes] = useState<number | null>(60);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [creatingNotification, setCreatingNotification] = useState(false);

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Function to fetch recent enrollment data
  const fetchEnrollmentData = async () => {
    try {
      setIsLoadingEnrollment(true);
      setError(null);
      
      console.log('Starting enrollment data fetch...');
      
      // Get program head's department from user_profiles
      const { data: programHeadProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('department')
        .eq('id', user?.id)
        .single();
      
      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }
      
      console.log('Program head department:', programHeadProfile?.department);

      // Fetch recent enrollments (students enrolled in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      console.log('Looking for enrollments after:', thirtyDaysAgo.toISOString());

      // Get all sections to create a mapping
      const { data: sections, error: sectionsError } = await supabase
        .from('sections')
        .select('id, name, year_level');
      if (sectionsError) {
        console.error('Sections error:', sectionsError);
        throw sectionsError;
      }
      
      console.log('Sections found:', sections?.length);

      // Create a map of section UUIDs to section names
      const sectionMap = new Map<string, string>();
      sections?.forEach(section => {
        sectionMap.set(section.id, section.name);
      });

      // Fetch all enrolled and pending students from user_profiles
      let recentEnrollments = null;
      
      console.log('Fetching all students...');
      const { data: userProfiles, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select('id, student_id, first_name, last_name, department, year_level, section, created_at, enrollment_status')
        .eq('role', 'student')
        .eq('department', programHeadProfile?.department)
        .not('section', 'is', null);
        
      if (userProfilesError) {
        console.error('User profiles error:', userProfilesError);
        throw userProfilesError;
      }
      
      recentEnrollments = userProfiles;
      console.log('All students found:', recentEnrollments?.length);
      
      // If no enrolled/pending students, get any students from the department (for testing)
      if (!recentEnrollments || recentEnrollments.length === 0) {
        console.log('No enrolled/pending students found, getting any students from department...');
        const { data: anyStudents, error: anyStudentsError } = await supabase
          .from('user_profiles')
          .select('id, student_id, first_name, last_name, department, year_level, section, created_at, enrollment_status')
          .eq('role', 'student')
          .eq('department', programHeadProfile?.department)
          .not('section', 'is', null)
          .limit(10); // Limit to 10 for testing
          
        if (!anyStudentsError && anyStudents) {
          console.log('Found students in department:', anyStudents.length);
          recentEnrollments = anyStudents;
        }
      }
      
      console.log('Recent enrollments found:', recentEnrollments?.length);
      console.log('Recent enrollments data:', recentEnrollments);

      // Process student data with names and section names
      const processedStudents = recentEnrollments?.map((student: { 
        id: string; 
        student_id: string; 
        first_name: string; 
        last_name: string; 
        department: string; 
        year_level: string; 
        section: string; 
        created_at: string; 
        enrollment_status: string 
      }) => ({
        id: student.id,
        student_id: student.student_id,
        first_name: student.first_name || 'N/A',
        last_name: student.last_name || 'N/A',
        section: student.section,
        section_name: sectionMap.get(student.section) || student.section,
        enrollment_status: student.enrollment_status,
        department: student.department,
        year_level: student.year_level,
        created_at: student.created_at
      })) || [];

      // Group recent enrollments by section for capacity view
      const enrollmentMap = new Map<string, {
        section: string;
        students: number;
        maxCapacity: number;
        color: string;
        isFull: boolean;
      }>();

      recentEnrollments?.forEach((student: { 
        id: string; 
        student_id: string; 
        first_name: string; 
        last_name: string; 
        department: string; 
        year_level: string; 
        section: string; 
        created_at: string; 
        enrollment_status: string 
      }) => {
        const sectionName = sectionMap.get(student.section) || student.section;
        const key = sectionName;
        
        if (enrollmentMap.has(key)) {
          const existing = enrollmentMap.get(key)!;
          existing.students += 1;
          existing.isFull = existing.students >= existing.maxCapacity;
        } else {
          const maxCapacity = 50; // Default max capacity per section
          enrollmentMap.set(key, {
            section: sectionName,
            students: 1,
            maxCapacity,
            color: 'blue',
            isFull: false
          });
        }
      });

      // Convert to array and update full status
      const enrollment = Array.from(enrollmentMap.values()).map(item => ({
        ...item,
        isFull: item.students >= item.maxCapacity,
        color: item.students >= item.maxCapacity ? 'red' : item.students >= item.maxCapacity * 0.8 ? 'yellow' : 'green'
      }));

      console.log('Final enrollment data:', enrollment);
      console.log('Processed students:', processedStudents);
      setEnrollmentStudents(processedStudents);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load enrollment data';
      setError(errorMsg);
      console.error('Enrollment fetch error:', err);
    } finally {
      setIsLoadingEnrollment(false);
    }
  };

  const calendarDates = (() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // start week on Monday
    startDate.setDate(startDate.getDate() - daysToSubtract);
    const dates: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  })();

  // (Optional) Google Classroom connection check removed for now

  // Load personal notes for program head
  useEffect(() => {
    const loadNotes = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('personal_notes')
          .select('id, content, created_at')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setPersonalNotes(data || []);
      } catch (err) {
        console.error('ProgramHead notes fetch error:', err);
        setPersonalNotes([]);
      }
    };
    loadNotes();
  }, [user?.id]);

  // Load notifications for management (program head can create/manage)
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, title, message, severity, audience, created_by, created_at, expires_at')
          .eq('is_active', true)
          .or(`audience.eq.programhead,audience.eq.all${user?.id ? `,created_by.eq.${user.id}` : ''}`)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        const base = (data || []) as Array<{ id: string; title: string; message: string; severity: 'announcement' | 'reminder' | 'deadline' | 'exam' | 'meeting' | 'advisory' | 'info' | 'success' | 'warning' | 'error'; audience: 'instructor' | 'student' | 'programhead' | 'all'; created_by: string | null; created_at: string; expires_at?: string | null }>;
        const creatorIds = Array.from(new Set(base.map(n => n.created_by).filter(Boolean))) as string[];
        let validIds = new Set<string>();
        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id')
            .in('id', creatorIds);
          if (profiles) {
            validIds = new Set((profiles as Array<{ id: string }>).map(p => p.id));
          }
        }
        const filtered = base.filter(n => !n.created_by || validIds.has(n.created_by));
        setProgramNotifications(filtered);
      } catch (err) {
        console.error('ProgramHead notifications fetch error:', err);
        setProgramNotifications([]);
      }
    };
    loadNotifications();
  }, [user?.id]);

  // Periodic cleanup of expired notifications created by current program head
  useEffect(() => {
    if (!user?.id) return;
    const runCleanup = async () => {
      try {
        await supabase
          .from('notifications')
          .delete()
          .lte('expires_at', new Date().toISOString())
          .eq('created_by', user.id);
      } catch {
        // ignore
      }
    };
    runCleanup();
    const intervalId = setInterval(runCleanup, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [user?.id]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setError(null);
        
        // 1. Get program head's department from user_profiles
        const { data: programHeadProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('department')
          .eq('id', user?.id)
          .single();
        if (profileError) throw profileError;

        // 2. Fetch courses/subjects (all courses)
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id, code, name');
        if (coursesError) throw coursesError;

        // 3. Fetch instructors count from user_profiles where role = 'instructor'
        const { data: instructors, error: instructorsError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('role', 'instructor');
        if (instructorsError) throw instructorsError;

        // 4. Fetch pending enrollment requests for program head's department
        const { data: pendingRequests, error: pendingError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('role', 'student')
          .eq('enrollment_status', 'pending')
          .eq('department', programHeadProfile?.department);
        if (pendingError) throw pendingError;

        // 5. Fetch students with their department, year level, and section information
        // First get all sections to create a mapping
        const { data: sections, error: sectionsError } = await supabase
          .from('sections')
          .select('id, name, year_level');
        if (sectionsError) throw sectionsError;

        // Create a map of section UUIDs to section names
        const sectionMap = new Map<string, string>();
        sections?.forEach(section => {
          sectionMap.set(section.id, section.name);
        });

        // Then fetch students with their section UUIDs
        const { data: students, error: studentsError } = await supabase
          .from('user_profiles')
          .select('id, student_id, department, year_level, section')
          .eq('role', 'student')
          .not('department', 'is', null)
          .not('year_level', 'is', null)
          .not('section', 'is', null);
        if (studentsError) throw studentsError;

        // 5. Filter students by program head's department
        const filteredStudents = students?.filter(student => student.department === programHeadProfile?.department) || [];

        // Group students by section name only
        const capacityMap = new Map<string, {
          section: string;
          students: number;
          maxCapacity: number;
          color: string;
          isFull: boolean;
        }>();

        filteredStudents.forEach((student: { 
          id: string; 
          student_id: string; 
          department: string; 
          year_level: string; 
          section: string; 
        }) => {
          // Use the section name from the section map
          const sectionName = sectionMap.get(student.section) || student.section;
          const key = sectionName; // Use only section name as key
          
          if (capacityMap.has(key)) {
            const existing = capacityMap.get(key)!;
            existing.students += 1;
            existing.isFull = existing.students >= existing.maxCapacity;
          } else {
            const maxCapacity = 50; // Default max capacity per section
            capacityMap.set(key, {
              section: sectionName,
              students: 1,
              maxCapacity,
              color: 'blue',
              isFull: false
            });
          }
        });

        // Convert to array and update full status
        const performance = Array.from(capacityMap.values()).map(item => ({
          ...item,
          isFull: item.students >= item.maxCapacity,
          color: item.students >= item.maxCapacity ? 'red' : item.students >= item.maxCapacity * 0.8 ? 'yellow' : 'green'
        }));

        // Unique students count
        const uniqueStudentIds = new Set((students || []).map((s: { id: string }) => s.id));
        setStats({
          activeStudents: uniqueStudentIds.size,
          pendingRequests: pendingRequests?.length || 0, // Use actual pending requests count
          subjectsManaged: courses?.length || 0, // Use courses count from courses table
          completedSubjects: instructors?.length || 0 // Use instructors count for the "Instructors" stat
        });
        setStudentPerformance(performance);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(errorMsg);
        console.error('Dashboard fetch error:', err);
      }
    };
    fetchDashboardData();
  }, [user?.id]);

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      {/* Header */}
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
                  className="w-6 h-6 text-white"
                >
                  <path d="M5 12h14"></path>
                  <path d="M12 5v14"></path>
                </svg>
              </div>
              <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Program Head Dashboard</h1>
               <p className="text-white/80 text-sm font-medium">Monitor program performance and student progress</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80">
               
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>


      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatsCard 
          title="Active Students" 
          value={stats.activeStudents} 
          icon={<Users className="w-8 h-8 text-indigo-500" />} 
          color="indigo"
          trend="+5% from last semester"
        />
        <StatsCard 
          title="Pending Requests" 
          value={stats.pendingRequests} 
          icon={<ClipboardList className="w-8 h-8 text-amber-500" />} 
          color="amber"
          trend="4 urgent"
        />
        <StatsCard 
          title="Subjects" 
          value={stats.subjectsManaged} 
          icon={<BookOpen className="w-8 h-8 text-emerald-500" />} 
          color="emerald"
          trend="3 new this term"
        />
        <StatsCard 
          title="Instructors" 
          value={stats.completedSubjects} 
          icon={<BookOpenCheck className="w-8 h-8 text-violet-500" />} 
          color="violet"
          trend="62% completion rate"
        />
      </motion.div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Course Performance Chart (spans 2) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-gray-600" />
                {viewMode === 'capacity' ? 'Section Capacity' : 'Recent Enrollment'}
            </h2>
              <button
                onClick={async () => {
                  console.log('Button clicked, current viewMode:', viewMode);
                  if (viewMode === 'capacity') {
                    console.log('Fetching enrollment data...');
                    await fetchEnrollmentData();
                    setViewMode('enrollment');
                    console.log('Switched to enrollment mode');
                  } else {
                    console.log('Switching back to capacity mode');
                    setViewMode('capacity');
                  }
                }}
                disabled={isLoadingEnrollment}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isLoadingEnrollment ? 'Loading...' : (viewMode === 'capacity' ? 'Switch to Enrollment' : 'Switch to Capacity')}
              </button>
              {viewMode === 'enrollment' && (
                <select
                  value={enrollmentStatusFilter}
                  onChange={(e) => setEnrollmentStatusFilter(e.target.value)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => perfListRef.current?.scrollBy({ top: -200, behavior: 'smooth' })}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600"
                title="Scroll up"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => perfListRef.current?.scrollBy({ top: 200, behavior: 'smooth' })}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600"
                title="Scroll down"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div ref={perfListRef} className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
            {viewMode === 'capacity' ? (
              // Capacity view - show section capacity bars
              studentPerformance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No section data available</div>
              ) : (
                studentPerformance.map(course => {
              const percent = Math.min((course.students / course.maxCapacity) * 100, 100);
              return (
                <div key={course.section} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-gray-700 font-medium">{course.section}</span>
                      <div className="text-gray-500 text-sm">Section Capacity</div>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-700 font-medium">{course.students}/{course.maxCapacity}</span>
                      {course.isFull && (
                        <div className="text-red-600 text-xs font-medium">FULL</div>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-2.5 rounded-full ${
                        course.isFull ? 'bg-red-500' : 
                        course.students >= course.maxCapacity * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    ></motion.div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Capacity</span>
                    <span className={`text-sm font-medium ${
                      course.isFull ? 'text-red-600' : 
                      course.students >= course.maxCapacity * 0.8 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {Math.round(percent)}%
                    </span>
                  </div>
                </div>
              );
                })
              )
            ) : (
              // Enrollment view - show individual students
              (() => {
                const filteredStudents = enrollmentStatusFilter === 'all' 
                  ? enrollmentStudents 
                  : enrollmentStudents.filter(student => student.enrollment_status === enrollmentStatusFilter);
                
                return filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {enrollmentStatusFilter === 'all' 
                      ? 'No students found' 
                      : `No ${enrollmentStatusFilter} students found`
                    }
                  </div>
                ) : (
                  filteredStudents.map(student => (
                  <div key={student.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-800">
                            {student.first_name} {student.last_name}
                          </h3>
                          <span className="text-sm text-gray-500">({student.student_id})</span>
                          {(() => {
                            const enrollmentDate = new Date(student.created_at);
                            const sevenDaysAgo = new Date();
                            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                            return enrollmentDate > sevenDaysAgo ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                NEW
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-4">

                          <span><span className="font-medium">Department:</span> {student.department}</span>
                          <span className="text-gray-400">•</span>
                          <span><span className="font-medium">Course & Year Level:</span> {student.section_name}</span>
                          <span className="text-gray-400">•</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium">Enrolled:</span> {new Date(student.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.enrollment_status === 'enrolled' 
                            ? 'bg-green-100 text-green-800' 
                            : student.enrollment_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : student.enrollment_status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : student.enrollment_status === 'withdrawn'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {student.enrollment_status === 'enrolled' ? '✓ Enrolled' : 
                           student.enrollment_status === 'pending' ? '⏳ Pending' : 
                           student.enrollment_status === 'rejected' ? '✗ Rejected' :
                           student.enrollment_status === 'withdrawn' ? '↩ Withdrawn' :
                           student.enrollment_status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
                );
              })()
            )}
          </div>
          
          {/* Department Summary */}
          {(viewMode === 'capacity' ? studentPerformance.length > 0 : enrollmentStudents.length > 0) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-blue-800">Department Summary</h3>
                  <p className="text-blue-600 text-sm">
                    {viewMode === 'capacity' 
                      ? 'Total students in your department' 
                      : `Students overview ${enrollmentStatusFilter !== 'all' ? `(${enrollmentStatusFilter})` : ''}`
                    }
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-blue-800">
                    {viewMode === 'capacity' 
                      ? studentPerformance.reduce((total, item) => total + item.students, 0)
                      : (() => {
                          const filteredStudents = enrollmentStatusFilter === 'all' 
                            ? enrollmentStudents 
                            : enrollmentStudents.filter(student => student.enrollment_status === enrollmentStatusFilter);
                          return filteredStudents.length;
                        })()
                    }
                  </span>
                  <div className="text-blue-600 text-sm">
                    {viewMode === 'capacity' ? 'Total Students' : `${enrollmentStatusFilter === 'all' ? 'All Students' : enrollmentStatusFilter.charAt(0).toUpperCase() + enrollmentStatusFilter.slice(1)}`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Right: Toolbar + Calendar stacked */}
        <div className="lg:col-span-1 space-y-6">
          {/* Icon toolbar like Teacher dashboard */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20 relative">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button onClick={() => setActivePanel('notifications')} className={`relative cursor-pointer group rounded-xl p-3 shadow-lg border transition-all duration-200 ${
                  activePanel === 'notifications' ? 'bg-blue-100 border-blue-300' : 'bg-white/80 border-white/80'
                }`}>
                  <Bell className={`w-6 h-6 ${activePanel === 'notifications' ? 'text-blue-600' : 'text-gray-600'}`} />
                </button>
                {/* Notes */}
                <button onClick={() => setActivePanel('notes')} className={`relative cursor-pointer group rounded-xl p-3 shadow-lg border transition-all duration-200 ${
                  activePanel === 'notes' ? 'bg-yellow-100 border-yellow-300' : 'bg-white/80 border-white/80'
                }`}>
                  <StickyNote className={`w-6 h-6 ${activePanel === 'notes' ? 'text-yellow-600' : 'text-gray-600'}`} />
                </button>
                {/* Calendar */}
                <button onClick={() => setActivePanel('calendar')} className={`relative cursor-pointer group rounded-xl p-3 shadow-lg border transition-all duration-200 ${
                  activePanel === 'calendar' ? 'bg-green-100 border-green-300' : 'bg-white/80 border-white/80'
                }`}>
                  <Calendar className={`w-6 h-6 ${activePanel === 'calendar' ? 'text-green-600' : 'text-gray-600'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Unified container that switches based on selected icon */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20"
          >
            {activePanel === 'notifications' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-700 flex items-center"><Bell className="w-4 h-4 mr-2 text-blue-500" /> Notifications</h3>
                  <button
                    onClick={() => setShowNotificationForm(!showNotificationForm)}
                    className={`p-2 rounded-lg transition-colors duration-200 ${
                      showNotificationForm ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {showNotificationForm ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Add notification form (hidden until +) */}
                {showNotificationForm ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget as HTMLFormElement;
                    const titleInput = form.elements.namedItem('title') as HTMLInputElement;
                    const messageInput = form.elements.namedItem('message') as HTMLInputElement;
                    const severitySelect = form.elements.namedItem('type') as HTMLSelectElement;
                    const audienceSelect = form.elements.namedItem('audience') as HTMLSelectElement;
                    const title = (titleInput?.value || '').trim();
                    const message = (messageInput?.value || '').trim();
                    const severity = (severitySelect?.value || 'announcement') as 'announcement' | 'reminder' | 'deadline' | 'exam' | 'meeting' | 'advisory' | 'info' | 'success' | 'warning' | 'error';
                    const audience = (audienceSelect?.value || 'instructor') as 'instructor' | 'student' | 'all';
                    if (!title || !message || !user?.id) return;
                    try {
                      setCreatingNotification(true);
                      const expires_at = notifDurationMinutes === null ? null : new Date(Date.now() + notifDurationMinutes * 60000).toISOString();
                      const { data: inserted, error } = await supabase
                        .from('notifications')
                        .insert({ title, message, severity, audience, created_by: user.id, is_active: true, expires_at })
                        .select('id, title, message, severity, audience, created_by, created_at, expires_at')
                        .single();
                      if (error) throw error;
                      if (inserted) setProgramNotifications(prev => [inserted, ...prev]);
                      titleInput.value = '';
                      messageInput.value = '';
                      severitySelect.value = 'announcement';
                      audienceSelect.value = 'instructor';
                      setNotifDurationMinutes(60);
                      setShowNotificationForm(false);
                    } catch (err) {
                      console.error('Failed to add notification:', err);
                    } finally {
                      setCreatingNotification(false);
                    }
                  }}
                  className="space-y-3 mb-4"
                >
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Title *</label>
                      <input 
                        name="title" 
                        placeholder="Enter notification title" 
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Duration</label>
                      <select
                        value={notifDurationMinutes === null ? 'never' : String(notifDurationMinutes)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNotifDurationMinutes(val === 'never' ? null : parseInt(val, 10));
                        }}
                        className="w-full px-2 py-2 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="15">15m</option>
                        <option value="30">30m</option>
                        <option value="60">1h</option>
                        <option value="180">3h</option>
                        <option value="1440">1d</option>
                        <option value="4320">3d</option>
                        <option value="10080">7d</option>
                        <option value="never">Never</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Message *</label>
                    <textarea 
                      name="message" 
                      placeholder="Enter notification message..." 
                      rows={2}
                      className="w-full px-2.5 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" 
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Severity *</label>
                      <select name="type" className="w-full px-2.5 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                        <option value="announcement">Announcement</option>
                        <option value="reminder">Reminder</option>
                        <option value="deadline">Deadline</option>
                        <option value="exam">Exam</option>
                        <option value="meeting">Meeting</option>
                        <option value="advisory">Advisory</option>
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Audience *</label>
                      <select name="audience" className="w-full px-2.5 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                        <option value="instructor">Instructors Only</option>
                        <option value="student">Students Only</option>
                        <option value="all">All (Instructors & Students)</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={creatingNotification} className={`w-full px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${creatingNotification ? 'bg-blue-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                      {creatingNotification ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4" />
                          <span>Send</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
                ) : (
                <div className="space-y-1.5">
                  {programNotifications.length === 0 ? (
                    <div className="text-sm text-gray-500">No notifications</div>
                  ) : (
                    programNotifications.map((n) => (
                      <div key={n.id} className={`p-3 rounded-lg border flex items-start justify-between ${
                        n.severity === 'success' ? 'bg-green-50 border-green-200' :
                        n.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                        n.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex-1 pr-3">
                          {editingNotifId === n.id ? (
                            <div className="space-y-2">
                              <input
                                value={editingNotif.title}
                                onChange={(e) => setEditingNotif(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-2 py-1 rounded border border-gray-300 text-sm"
                              />
                              <input
                                value={editingNotif.message}
                                onChange={(e) => setEditingNotif(prev => ({ ...prev, message: e.target.value }))}
                                className="w-full px-2 py-1 rounded border border-gray-300 text-sm"
                              />
                              <div className="flex gap-2">
                                <select value={editingNotif.severity} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditingNotif(prev => ({ ...prev, severity: e.target.value as 'announcement' | 'reminder' | 'deadline' | 'exam' | 'meeting' | 'advisory' | 'info' | 'success' | 'warning' | 'error' }))} className="px-2 py-1 rounded border border-gray-300 text-sm">
                                  <option value="announcement">Announcement</option>
                                  <option value="reminder">Reminder</option>
                                  <option value="deadline">Deadline</option>
                                  <option value="exam">Exam</option>
                                  <option value="meeting">Meeting</option>
                                  <option value="advisory">Advisory</option>
                                  <option value="info">Info</option>
                                  <option value="success">Success</option>
                                  <option value="warning">Warning</option>
                                  <option value="error">Error</option>
                                </select>
                                <select value={editingNotif.audience} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditingNotif(prev => ({ ...prev, audience: e.target.value as 'instructor' | 'student' | 'all' }))} className="px-2 py-1 rounded border border-gray-300 text-sm">
                                  <option value="instructor">Instructors</option>
                                  <option value="student">Students</option>
                                  <option value="all">All</option>
                                </select>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-sm text-gray-700">{n.title}</div>
                              <div className="text-xs text-gray-600">{n.message}</div>
                              <div className="mt-1 inline-flex items-center gap-2 text-[10px]">
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">{n.severity}</span>
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                  {n.audience === 'programhead' ? 'Program Head' : n.audience === 'instructor' ? 'Instructors' : n.audience === 'student' ? 'Students' : 'All'}
                                </span>
                              </div>
                              {/* Creator hidden by request */}
                            </>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-xs text-gray-400 font-medium">
                            {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                          {n.expires_at && (
                            <div className="text-[10px] text-gray-400">
                              Expires in {(() => {
                                const ms = new Date(n.expires_at as string).getTime() - Date.now();
                                if (ms <= 0) return '0m';
                                const mins = Math.ceil(ms / 60000);
                                if (mins < 60) return `${mins}m`;
                                const hrs = Math.floor(mins / 60);
                                const rem = mins % 60;
                                return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
                              })()}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                          {n.created_by === (user?.id || null) ? (
                            editingNotifId === n.id ? (
                              <>
                                <button
                                  className="px-2 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('notifications')
                                        .update({ title: editingNotif.title, message: editingNotif.message, severity: editingNotif.severity, audience: editingNotif.audience })
                                        .eq('id', n.id);
                                      if (error) throw error;
                                      setProgramNotifications(prev => prev.map(x => x.id === n.id ? { ...x, ...editingNotif } : x));
                                      setEditingNotifId(null);
                                    } catch (err) {
                                      console.error('Failed to update notification:', err);
                                    }
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  onClick={() => setEditingNotifId(null)}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                  onClick={() => { setEditingNotifId(n.id); setEditingNotif({ title: n.title, message: n.message, severity: n.severity, audience: n.audience }); }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('notifications')
                                        .update({ is_active: false })
                                        .eq('id', n.id);
                                      if (error) throw error;
                                      setProgramNotifications(prev => prev.filter(x => x.id !== n.id));
                                    } catch (err) {
                                      console.error('Failed to delete notification:', err);
                                    }
                                  }}
                                >
                                  Delete
                                </button>
                              </>
                            )
                          ) : (
                            <span className="text-[10px] text-gray-400">read-only</span>
                          )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                )}
              </div>
            )}
            {activePanel === 'notes' && (
              <div>
                <h3 className="font-bold text-gray-700 flex items-center mb-3"><StickyNote className="w-4 h-4 mr-2 text-yellow-500" /> Personal Notes</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget as HTMLFormElement;
                    const input = form.elements.namedItem('note') as HTMLInputElement;
                    const text = (input?.value || '').trim();
                    if (!text) return;
                    try {
                      const { data: inserted, error } = await supabase
                        .from('personal_notes')
                        .insert({ user_id: user?.id, content: text })
                        .select('id, content, created_at')
                        .single();
                      if (error) throw error;
                      if (inserted) setPersonalNotes(prev => [inserted, ...prev]);
                      input.value = '';
                    } catch (err) {
                      console.error('Failed to add note:', err);
                    }
                  }}
                  className="flex items-center gap-2 mb-3"
                >
                  <input type="text" name="note" placeholder="Type a new note and press Enter..." className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white/70 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm" />
                  <button type="submit" className="px-3 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm">Add</button>
                </form>
                <ul className="space-y-2 text-sm text-gray-600">
                  {personalNotes.map((n) => (
                    <li key={n.id} className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        {editingNoteId === n.id ? (
                          <input
                            value={editingNoteContent}
                            onChange={(e) => setEditingNoteContent(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white/70 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
                          />
                        ) : (
                          <span>{n.content}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {editingNoteId === n.id ? (
                          <>
                            <button
                              className="px-2 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600"
                              onClick={async () => {
                                const text = editingNoteContent.trim();
                                if (!text) return;
                                try {
                                  const { error } = await supabase
                                    .from('personal_notes')
                                    .update({ content: text })
                                    .eq('id', n.id)
                                    .eq('user_id', user?.id || '');
                                  if (error) throw error;
                                  setPersonalNotes(prev => prev.map(x => x.id === n.id ? { ...x, content: text } : x));
                                  setEditingNoteId(null);
                                  setEditingNoteContent('');
                                } catch (err) {
                                  console.error('Failed to update note:', err);
                                }
                              }}
                            >
                              Save
                            </button>
                            <button
                              className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                              onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              onClick={() => { setEditingNoteId(n.id); setEditingNoteContent(n.content); }}
                            >
                              Edit
                            </button>
                            <button
                              className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('personal_notes')
                                    .delete()
                                    .eq('id', n.id)
                                    .eq('user_id', user?.id || '');
                                  if (error) throw error;
                                  setPersonalNotes(prev => prev.filter(x => x.id !== n.id));
                                } catch (err) {
                                  console.error('Failed to delete note:', err);
                                }
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {activePanel === 'calendar' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-700 flex items-center"><Calendar className="w-5 h-5 mr-2 text-blue-600" /> {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                  <div className="flex space-x-1">
                    <button onClick={handlePreviousMonth} className="p-1 hover:bg-gray-100/50 backdrop-blur-sm rounded border border-white/20 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100/50 backdrop-blur-sm rounded border border-white/20 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                    <div key={day} className="text-xs font-medium text-gray-500 py-1">{day}</div>
                  ))}
                  {calendarDates.map((date, index) => {
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                    const isSelected = isCurrentMonth && date.getDate() === selectedDate;
                    const isToday = isCurrentMonth && date.getDate() === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();
                    return (
                      <button
                        key={index}
                        onClick={() => isCurrentMonth && setSelectedDate(date.getDate())}
                        className={`text-xs py-1 rounded transition-colors w-full ${
                          isCurrentMonth
                            ? isToday
                              ? 'bg-green-500/90 backdrop-blur-sm text-white font-medium shadow-lg'
                              : isSelected
                              ? 'bg-blue-500/90 backdrop-blur-sm text-white'
                              : 'text-gray-700 hover:bg-gray-100/50 backdrop-blur-sm'
                            : 'text-gray-400'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Student Requests Table removed due to missing table */}
    </div>
  );
};

// Helper Components
const StatsCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string; trend: string }> = ({ 
  title, value, icon, color, trend 
}) => {
  const colorClasses = {
    indigo: "bg-indigo-50 border-indigo-100",
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    violet: "bg-violet-50 border-violet-100",
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

// CalendarEvent removed (not used after aligning with Teacher dashboard)

const ProgramHeadDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/dashboard" element={<DashboardOverview />} />
          <Route path="/requests" element={<ProgramHeadEnrollment />} />
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
