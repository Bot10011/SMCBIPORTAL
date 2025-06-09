import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import ProgramHeadEnrollment from './ProgramHeadEnrollment';
import CoursesOffered from './CoursesOffered';
import SubjectAssignment from './SubjectAssignment';
import { motion } from 'framer-motion';
import {
  Users,
  BookOpen,
  ClipboardList,
  BookOpenCheck,
  BarChart3,
  Calendar,
  Sparkles
} from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';

// Import program head-specific components

// Dashboard Overview Component
const DashboardOverview: React.FC = () => {
  const [stats] = useState({
    activeStudents: 182,
    pendingRequests: 18,
    subjectsManaged: 42,
    completedSubjects: 26
  });

  const [studentPerformance] = useState([
    { course: 'Computer Science', rating: 85, students: 45, color: 'blue' },
    { course: 'Information Technology', rating: 78, students: 62, color: 'green' },
    { course: 'Information Systems', rating: 90, students: 38, color: 'purple' },
    { course: 'Computer Engineering', rating: 82, students: 37, color: 'orange' }
  ]);

  const [recentRequests] = useState([
    { id: 1, student: 'Alex Johnson', type: 'Subject Waiver', status: 'pending', time: '2 hours ago' },
    { id: 2, student: 'Sarah Miller', type: 'Curriculum Adjustment', status: 'approved', time: '1 day ago' },
    { id: 3, student: 'David Chen', type: 'Subject Addition', status: 'pending', time: '3 hours ago' },
    { id: 4, student: 'Emma Rodriguez', type: 'Prerequisite Override', status: 'declined', time: '2 days ago' },
  ]);

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-800">Program Head Dashboard</h1>
        <p className="text-gray-600">Monitor program performance and student progress</p>
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
              Program Performance
            </h2>
            <select className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="current">Current Semester</option>
              <option value="previous">Previous Semester</option>
              <option value="yearly">Yearly Overview</option>
            </select>
          </div>

          <div className="space-y-4">
            {studentPerformance.map(course => (
              <div key={course.course} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">{course.course}</span>
                  <span className="text-gray-500 text-sm">{course.students} students</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${course.rating}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={`h-2.5 rounded-full bg-${course.color}-500`}
                  ></motion.div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Performance Index</span>
                  <span className="font-semibold text-gray-700">{course.rating}%</span>
                </div>
              </div>
            ))}
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

      {/* Student Requests Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-gray-600" />
            Recent Student Requests
          </h2>
          <button className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-medium py-2 px-4 rounded-lg flex items-center transition-colors">
            <Sparkles className="w-4 h-4 mr-1" />
            Process All
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Type</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentRequests.map(request => (
                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="font-medium text-gray-800">{request.student}</div>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap text-gray-600">{request.type}</td>
                  <td className="py-4 px-4 whitespace-nowrap text-gray-500 text-sm">{request.time}</td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap text-sm">
                    <button className="text-indigo-600 hover:text-indigo-900 font-medium">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">Showing 4 of 18 requests</span>
          <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
            View all requests
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </motion.div>
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
          <Route path="/requests" element={<ProgramHeadEnrollment />} />
          <Route path="/assign-subjects" element={<SubjectAssignment />} />
          <Route path="/academic-history" element={<CoursesOffered />} />
          <Route path="*" element={<DashboardOverview />} />
        </Routes>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default ProgramHeadDashboard; 