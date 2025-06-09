import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import ClassManagement from './ClassManagement';
import GradeInput from './GradeInput';
import TeacherSettings from './Settings';
import { BookOpen, Users, ClipboardList, Settings, CheckCircle2 } from 'lucide-react';
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
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
        <CheckCircle2 className="text-blue-500" /> Welcome{user?.first_name ? `, ${user.first_name}` : ''}!
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center border border-gray-100">
          <BookOpen className="w-8 h-8 text-indigo-500 mb-2" />
          <div className="text-2xl font-bold">{stats.classes}</div>
          <div className="text-gray-600">Assigned Classes</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center border border-gray-100">
          <Users className="w-8 h-8 text-green-500 mb-2" />
          <div className="text-2xl font-bold">{stats.students}</div>
          <div className="text-gray-600">Total Students</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center border border-gray-100">
          <ClipboardList className="w-8 h-8 text-yellow-500 mb-2" />
          <div className="text-2xl font-bold">{stats.pendingGrades}</div>
          <div className="text-gray-600">Pending Grades</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <a href="/teacher/dashboard/class-management" className="flex flex-col items-center bg-blue-50 hover:bg-blue-100 rounded-xl p-4 transition shadow group">
          <BookOpen className="w-7 h-7 text-blue-600 mb-2 group-hover:scale-110 transition" />
          <span className="font-medium text-blue-700">Class Management</span>
        </a>
        <a href="/teacher/dashboard/grade-input" className="flex flex-col items-center bg-green-50 hover:bg-green-100 rounded-xl p-4 transition shadow group">
          <ClipboardList className="w-7 h-7 text-green-600 mb-2 group-hover:scale-110 transition" />
          <span className="font-medium text-green-700">Grade Input</span>
        </a>
        <a href="/teacher/dashboard/settings" className="flex flex-col items-center bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition shadow group">
          <Settings className="w-7 h-7 text-gray-600 mb-2 group-hover:scale-110 transition" />
          <span className="font-medium text-gray-700">Settings</span>
        </a>
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
        <Route path="/settings" element={<TeacherSettings />} />
      </Routes>
    </DashboardLayout>  
  );
};

export default TeacherDashboard; 