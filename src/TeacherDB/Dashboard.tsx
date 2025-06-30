import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import ClassManagement from './ClassManagement';
import GradeInput from './GradeInput';
import TeacherSettings from './Settings';
import { BookOpen, Users, ClipboardList, CheckCircle2, TrendingUp, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';

const TeacherDashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ classes: 0, students: 0, pendingGrades: 0 });

  useEffect(() => {
    // TODO: Replace with real fetch logic
    setStats({ classes: 3, students: 75, pendingGrades: 5 });
  }, []);

  return (
    <div className="flex flex-col h-full from-slate-50 to-blue-50">
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-blue-600" />
                  </div>
                  Welcome{user?.first_name ? `, ${user.first_name}` : ''}!
                </h1>
                <p className="text-lg text-gray-600">Here's what's happening with your classes today</p>
              </div>
              <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-lg transition-all duration-300 hover:border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stats.classes}</div>
              <div className="text-gray-600 font-medium">Assigned Classes</div>
              <div className="text-sm text-gray-500 mt-2">Active teaching sessions</div>
            </div>

            <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-lg transition-all duration-300 hover:border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stats.students}</div>
              <div className="text-gray-600 font-medium">Total Students</div>
              <div className="text-sm text-gray-500 mt-2">Enrolled across all classes</div>
            </div>

            <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-lg transition-all duration-300 hover:border-yellow-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stats.pendingGrades}</div>
              <div className="text-gray-600 font-medium">Pending Grades</div>
              <div className="text-sm text-gray-500 mt-2">Awaiting submission</div>
            </div>
          </div>
          </div>
        </div>
      </div>
  );
};

const TeacherDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<TeacherDashboardOverview />} />
        <Route path="/class-management" element={<ClassManagement />} />
        <Route path="/grade-input" element={<GradeInput />} />
        <Route path="/profile" element={<TeacherSettings />} />
      </Routes>
    </DashboardLayout>  
  );
};

export default TeacherDashboard; 