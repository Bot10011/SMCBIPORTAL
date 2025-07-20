import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import ProgramHeadEnrollment from './ProgramHeadEnrollment';
import CoursesOffered from './CoursesOffered';
import SubjectAssignment from './SubjectAssignment';
import EnrollmentValidation from './EnrollmentValidation';
import Settings from './Settings';

import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  ClipboardList,
  BookOpenCheck,
  BarChart3,
  Calendar
} from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';
import { supabase } from '../lib/supabase';

// Import program head-specific components

// Dashboard Overview Component
const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState({
    activeStudents: 0,
    pendingRequests: 0,
    subjectsManaged: 0,
    completedSubjects: 0
  });
  const [studentPerformance, setStudentPerformance] = useState<{
    course: string;
    rating: number;
    students: number;
    color: string;
  }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setError(null);
        // 1. All Students (count unique student_id in enrollcourse)
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollcourse')
          .select('student_id, subject_id, status');
        if (enrollmentsError) throw enrollmentsError;
        // 2. Fetch all courses to map subject_id to code
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id, code');
        if (coursesError) throw coursesError;
        const courseCodeMap: Record<string, string> = {};
        (courses || []).forEach((c: { id: string, code: string }) => {
          courseCodeMap[c.id] = c.code;
        });
        // Unique students
        const uniqueStudentIds = new Set((enrollments || []).map((e: { student_id: string }) => e.student_id));
        // Unique subjects
        const uniqueSubjectIds = new Set((enrollments || []).map((e: { subject_id: string }) => e.subject_id));
        // Courses Performance: for each subject_id, count unique student_id
        const subjectStudentMap: Record<string, Set<string>> = {};
        (enrollments || []).forEach((e: { subject_id: string, student_id: string }) => {
          if (!subjectStudentMap[e.subject_id]) subjectStudentMap[e.subject_id] = new Set();
          subjectStudentMap[e.subject_id].add(e.student_id);
        });
        const performance = Object.entries(subjectStudentMap).map(([subjectId, studentsSet]) => ({
          course: courseCodeMap[subjectId] || subjectId,
          rating: 0,
          students: studentsSet.size,
          color: 'blue',
        }));
        setStats({
          activeStudents: uniqueStudentIds.size,
          pendingRequests: 0,
          subjectsManaged: uniqueSubjectIds.size,
          completedSubjects: 0
        });
        setStudentPerformance(performance);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(errorMsg);
        console.error('Dashboard fetch error:', err);
      }
    };
    fetchDashboardData();
  }, []);

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
        className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 shadow-lg"
        style={{ marginLeft: '-2rem', marginRight: '-2rem' }}
      >
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
          title="Subjects Managed" 
          value={stats.subjectsManaged} 
          icon={<BookOpen className="w-8 h-8 text-emerald-500" />} 
          color="emerald"
          trend="3 new this term"
        />
        <StatsCard 
          title="Completed Subjects" 
          value={stats.completedSubjects} 
          icon={<BookOpenCheck className="w-8 h-8 text-violet-500" />} 
          color="violet"
          trend="62% completion rate"
        />
      </motion.div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Performance Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-gray-600" />
              Courses Performance
            </h2>
            <select className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="current">Current Semester</option>
              <option value="previous">Previous Semester</option>
              <option value="yearly">Yearly Overview</option>
            </select>
          </div>

          <div className="space-y-4">
            {studentPerformance.map(course => {
              const maxStudents = 100;
              const percent = Math.min((course.students / maxStudents) * 100, 100);
              // Year indicator from course code (e.g., IT101 => 1st Year, IT202 => 2nd Year)
              let yearLabel = '';
              const match = course.course.match(/(\d{3})/);
              if (match) {
                const yearDigit = match[1][0];
                if (yearDigit === '1') yearLabel = '1st Year';
                else if (yearDigit === '2') yearLabel = '2nd Year';
                else if (yearDigit === '3') yearLabel = '3rd Year';
                else if (yearDigit === '4') yearLabel = '4th Year';
              }
              return (
                <div key={course.course} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">Course Code: {course.course}</span>
                    <span className="text-gray-500 text-sm">{course.students} students</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className={`h-2.5 rounded-full bg-${course.color}-500`}
                    ></motion.div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Enrolled Students</span>
                    <span className="font-semibold text-gray-700">{course.students}</span>
                  </div>
                  {yearLabel && (
                    <div className="text-xs text-blue-600 font-semibold mt-1">{yearLabel}</div>
                  )}
                </div>
              );
            })}
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
            <Calendar className="w-5 h-5 mr-2 text-gray-600" />
            Academic Calendar
          </h2>
          
          <div className="mt-4 space-y-3">
            <CalendarEvent 
              date="June 5" 
              title="Faculty Meeting" 
              time="1:00 PM - 3:00 PM" 
              type="meeting" 
            />
            <CalendarEvent 
              date="June 8" 
              title="Curriculum Review" 
              time="10:00 AM - 12:00 PM" 
              type="important" 
            />
            <CalendarEvent 
              date="June 12" 
              title="Grade Submission Deadline" 
              time="11:59 PM" 
              type="deadline" 
            />
            <CalendarEvent 
              date="June 15" 
              title="Department Planning" 
              time="2:00 PM - 4:00 PM" 
              type="regular" 
            />
          </div>
          
          <button className="mt-6 text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
            View full calendar
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </motion.div>
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
          <Route path="/enrollment-validation" element={<EnrollmentValidation />} />
          <Route path="/settings" element={<Settings />} />

          <Route path="*" element={<DashboardOverview />} />
        </Routes>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default ProgramHeadDashboard; 
