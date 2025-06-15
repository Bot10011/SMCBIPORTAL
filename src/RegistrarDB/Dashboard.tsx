import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import RegistrarEnrollment from './RegistrarEnrollment';
import { motion } from 'framer-motion';
import Settings from './Settings';
import { 
  CheckSquare, 
  FileText, 
  AlertTriangle, 
  BookOpen, 
  BarChart4, 
  Calendar, 
  Clock
} from 'lucide-react';
import { RegistrarGradeViewer } from './Allcourse';

// Import registrar-specific components
const StudentRecords = () => <div>Student Records</div>;

// Dashboard Overview Components
const DashboardOverview: React.FC = () => {
  const [stats] = useState({
    pendingEnrollments: 24,
    subjectsForReview: 15,
    studentRecords: 350,
    classesWithConflicts: 3
  });

  const [recentActivities] = useState([
    { id: 1, action: "Approved enrollment request", student: "Maria Santos", time: "10 minutes ago" },
    { id: 2, action: "Updated subject schedule", subject: "COMP 101", time: "1 hour ago" },
    { id: 3, action: "Reviewed student records", student: "John Smith", time: "2 hours ago" },
    { id: 4, action: "Resolved schedule conflict", classes: "MATH 201 & PHYS 101", time: "Yesterday" }
  ]);

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-800">Registrar Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
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
          title="Subjects for Review" 
          value={stats.subjectsForReview} 
          icon={<BookOpen className="w-8 h-8 text-green-500" />} 
          color="green"
        />
        <StatsCard 
          title="Student Records" 
          value={stats.studentRecords} 
          icon={<FileText className="w-8 h-8 text-purple-500" />} 
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
          className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-gray-600" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentActivities.map(activity => (
              <div key={activity.id} className="flex items-start p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3"></div>
                <div>
                  <p className="text-gray-800 font-medium">
                    {activity.action}
                    {activity.student && <span className="text-blue-600"> - {activity.student}</span>}
                    {activity.subject && <span className="text-green-600"> - {activity.subject}</span>}
                    {activity.classes && <span className="text-red-600"> - {activity.classes}</span>}
                  </p>
                  <p className="text-gray-500 text-sm">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
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
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-gray-600" />
            Upcoming Schedule
          </h2>
          <div className="space-y-3">
            <ScheduleItem date="June 5" event="Enrollment Deadline" type="important" />
            <ScheduleItem date="June 7" event="Faculty Meeting" type="meeting" />
            <ScheduleItem date="June 10" event="Grade Submission" type="deadline" />
            <ScheduleItem date="June 15" event="Class Schedule Release" type="regular" />
          </div>
          <button className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
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
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <BarChart4 className="w-5 h-5 mr-2 text-gray-600" />
          Enrollment Summary
        </h2>
        <div className="h-60 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>Enrollment chart visualization would be displayed here</p>
            <p className="text-sm">(Sample data - would be connected to actual database)</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Helper Components
const StatsCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({ 
  title, value, icon, color 
}) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    purple: "bg-purple-50 border-purple-200",
    red: "bg-red-50 border-red-200",
  };

  return (
    <motion.div 
      whileHover={{ y: -5, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
      className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-2xl p-6 flex items-center transition-all duration-300`}
    >
      <div className="mr-4">
        {icon}
      </div>
      <div>
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </motion.div>
  );
};

const ScheduleItem: React.FC<{ date: string; event: string; type: string }> = ({ date, event, type }) => {
  const typeClasses = {
    important: "bg-red-100 text-red-800",
    meeting: "bg-blue-100 text-blue-800",
    deadline: "bg-yellow-100 text-yellow-800",
    regular: "bg-green-100 text-green-800",
  };

  return (
    <div className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="w-12 text-center text-gray-600 font-medium text-sm">
        {date}
      </div>
      <div className="ml-3 flex-1">
        <p className="text-gray-800">{event}</p>
      </div>
      <div className={`px-2 py-1 rounded-full text-xs font-medium ${typeClasses[type as keyof typeof typeClasses]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </div>
    </div>
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
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<DashboardOverview />} />
      </Routes>
    </DashboardLayout>
  );
};

export default RegistrarDashboard; 
