import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import ClassManagement from './ClassManagement';
import GradeInput from './GradeInput';
import TeacherSettings from './Settings';
import { BookOpen, Users, ClipboardList, CheckCircle2, TrendingUp, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const TeacherDashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ classes: 0, students: 0, pendingGrades: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        // 1. Fetch all classes assigned to this teacher
        const { data: classes, error: classError } = await supabase
          .from('teacher_subjects')
          .select('id, subject_id')
          .eq('teacher_id', user.id)
          .eq('is_active', true);
        if (classError) throw classError;
        const classList: { id: string; subject_id: string }[] = classes || [];
        const classIds = classList.map((c) => c.subject_id);
        // 2. Fetch all active enrollments for these classes
        let totalStudents = 0;
        let pendingGrades = 0;
        if (classIds.length > 0) {
          // Fetch all enrollments for all classes in one query
          const { data: enrollments, error: enrollError } = await supabase
            .from('enrollcourse')
            .select('id, subject_id, status, student_id')
            .in('subject_id', classIds)
            .eq('status', 'active');
          if (enrollError) throw enrollError;
          type Enrollment = { id: string; subject_id: string; status: string; student_id: string };
          const enrollmentList: Enrollment[] = enrollments || [];
          totalStudents = enrollmentList.length;
          // 3. Fetch all grades for these enrollments
          const enrollmentIds = enrollmentList.map((e) => e.id);
          type Grade = { id: string; student_id: string; prelim_grade: number | null; midterm_grade: number | null; final_grade: number | null };
          let grades: Grade[] = [];
          if (enrollmentIds.length > 0) {
            const { data: gradesData, error: gradesError } = await supabase
              .from('grades')
              .select('id, student_id, prelim_grade, midterm_grade, final_grade')
              .in('student_id', enrollmentIds);
            if (gradesError) throw gradesError;
            grades = (gradesData as Grade[]) || [];
          }
          // 4. Count pending grades (any grade field is null or undefined)
          pendingGrades = grades.filter((g) =>
            g.prelim_grade == null || g.midterm_grade == null || g.final_grade == null
          ).length;
        }
        setStats({
          classes: classList.length,
          students: totalStudents,
          pendingGrades: pendingGrades
        });
      } catch {
        setStats({ classes: 0, students: 0, pendingGrades: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user?.id]);

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
            <div className="border-b border-gray-200" />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button onClick={() => navigate('/teacher/class-management')} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">Manage Classes</button>
            <button onClick={() => navigate('/teacher/grade-input')} className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition">Input Grades</button>
            <button onClick={() => navigate('/teacher/profile')} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition">Profile</button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Classes */}
            <button
              className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-2xl hover:scale-[1.03] transition-all duration-200 hover:border-blue-400 w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-400 relative"
              onClick={() => navigate('/teacher/class-management')}
              disabled={loading}
              tabIndex={0}
              aria-label="View assigned classes"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/teacher/class-management'); }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {loading ? <span className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span> : stats.classes}
              </div>
              <div className="text-gray-600 font-medium">Assigned Classes</div>
              <div className="text-sm text-gray-500 mt-2">Active teaching sessions</div>
              <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded pointer-events-none">
                Click to view classes
              </span>
            </button>
            {/* Students */}
            <button
              className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-2xl hover:scale-[1.03] transition-all duration-200 hover:border-green-400 w-full text-left focus:outline-none focus:ring-2 focus:ring-green-400 relative"
              onClick={() => navigate('/teacher/class-management')}
              disabled={loading}
              tabIndex={0}
              aria-label="View total students"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/teacher/class-management'); }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {loading ? <span className="inline-block w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></span> : stats.students}
              </div>
              <div className="text-gray-600 font-medium">Total Students</div>
              <div className="text-sm text-gray-500 mt-2">Enrolled across all classes</div>
              <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-green-100 text-green-700 px-2 py-1 rounded pointer-events-none">
                Click to view students
              </span>
            </button>
            {/* Pending Grades */}
            <button
              className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-2xl hover:scale-[1.03] transition-all duration-200 hover:border-yellow-400 w-full text-left focus:outline-none focus:ring-2 focus:ring-yellow-400 relative"
              onClick={() => navigate('/teacher/grade-input')}
              disabled={loading}
              tabIndex={0}
              aria-label="View pending grades"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/teacher/grade-input'); }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {loading ? <span className="inline-block w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></span> : stats.pendingGrades}
              </div>
              <div className="text-gray-600 font-medium">Pending Grades</div>
              <div className="text-sm text-gray-500 mt-2">Awaiting submission</div>
              <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded pointer-events-none">
                Click to view pending grades
              </span>
            </button>
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
