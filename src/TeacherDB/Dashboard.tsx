import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import ClassManagement from './ClassManagement';
import GradeInput from './GradeInput';
import TeacherSettings from './Settings';
import { BookOpen, Users, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import userAvatar from '../../img/user-avatar.png';

interface TeacherProfile {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  role: string;
  department?: string;
  is_active: boolean;
  profile_picture_url?: string;
}

const TeacherDashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ classes: 0, students: 0, pendingGrades: 0 });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch teacher profile info (name, profile picture)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setProfile(data);
        if (data?.profile_picture_url) {
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from('avatar')
            .createSignedUrl(data.profile_picture_url, 60 * 60);
          if (!signedUrlError && signedUrlData?.signedUrl) {
            setProfilePictureUrl(signedUrlData.signedUrl);
          } else {
            setProfilePictureUrl(null);
          }
        } else {
          setProfilePictureUrl(null);
        }
      } catch {
        setProfile(null);
        setProfilePictureUrl(null);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id]);

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
    <div className="flex flex-col h-full bg-white min-h-screen">
      <div className="flex-1 overflow-auto">
        <div className="p-6 sm:p-8 max-w-7xl mx-auto">
          {/* Main dashboard row: left and right columns */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Left: stacked welcome and stats/calendar */}
            <div className="flex flex-col gap-4 flex-1">
              {/* Top row: welcome + stats/calendar */}
              <div className="flex flex-col md:flex-row gap-4 w-full">
                {/* Welcome Banner */}
                <div className="bg-blue-500 rounded-2xl overflow-hidden shadow-lg w-full md:w-1/2 flex flex-col justify-between min-h-[120px]">
                  <div className="flex flex-col md:flex-row items-center p-4 h-full">
                    {/* Avatar Section - now larger and on the left */}
                    <div className="flex-shrink-0 flex items-center justify-center mb-3 md:mb-0 md:mr-6">
                      {profileLoading ? (
                        <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-blue-400 animate-pulse" />
                      ) : (
                        <img
                          src={profilePictureUrl || userAvatar}
                          alt="Profile Avatar"
                          className="w-20 h-20 md:w-28 md:h-28 rounded-full shadow-md border-4 border-white bg-white object-cover"
                        />
                      )}
                    </div>
                    {/* Text Section */}
                    <div className="w-full text-white z-10 text-center md:text-left">
                      <h1 className="text-xl md:text-2xl font-bold mb-1">
                        Welcome back, {profile ? profile.first_name : 'Teacher'}
                      </h1>
                      <p className="text-blue-100 mb-2 text-sm md:text-base">
                        You have 3 pending tasks waiting for you. Don't forget to check your to-do list!
                      </p>
                      <p className="text-blue-100 text-xs md:text-sm mb-2">
                        Have a good day!
                      </p>
                      <div className="mt-2">
                        <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all text-sm">
                          To-Do List
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Stats and Calendar Grid */}
                <div className="w-full md:w-1/2 flex flex-col justify-between">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 h-full">
                    {/* Classes Stats */}
                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-2 flex flex-col items-center justify-center min-h-[40px]">
                      <div className="p-1 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl mb-1">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-xs font-extrabold text-gray-900 mb-0.5">
                        {loading ? <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span> : stats.classes}
                      </div>
                      <div className="text-gray-600 font-medium text-[10px]">Assigned Classes</div>
                    </div>
                    {/* Students Stats */}
                    <div className="bg-white rounded-xl shadow-sm border border-green-100 p-2 flex flex-col items-center justify-center min-h-[40px]">
                      <div className="p-1 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mb-1">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-xs font-extrabold text-gray-900 mb-0.5">
                        {loading ? <span className="inline-block w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></span> : stats.students}
                      </div>
                      <div className="text-gray-600 font-medium text-[10px]">Total Students</div>
                    </div>
                    {/* Pending Grades Stats */}
                    <div className="bg-white rounded-xl shadow-sm border border-yellow-100 p-2 flex flex-col items-center justify-center min-h-[40px]">
                      <div className="p-1 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl mb-1">
                        <ClipboardList className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-xs font-extrabold text-gray-900 mb-0.5">
                        {loading ? <span className="inline-block w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></span> : stats.pendingGrades}
                      </div>
                      <div className="text-gray-600 font-medium text-[10px]">Pending Grades</div>
                    </div>
                    {/* Calendar */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 flex flex-col min-h-[40px]">
                      <h3 className="font-bold text-gray-700 mb-1 text-xs">Calendar</h3>
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-[10px] font-medium text-gray-600">July 2025</h4>
                        <div className="flex gap-0.5">
                          <button className="p-0.5 rounded-md bg-gray-100 hover:bg-gray-200 transition text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button className="p-0.5 rounded-md bg-gray-100 hover:bg-gray-200 transition text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-0 text-center mb-0.5">
                        <div className="text-[8px] font-medium text-gray-400">S</div>
                        <div className="text-[8px] font-medium text-gray-400">M</div>
                        <div className="text-[8px] font-medium text-gray-400">T</div>
                        <div className="text-[8px] font-medium text-gray-400">W</div>
                        <div className="text-[8px] font-medium text-gray-400">T</div>
                        <div className="text-[8px] font-medium text-gray-400">F</div>
                        <div className="text-[8px] font-medium text-gray-400">S</div>
                      </div>
                      <div className="grid grid-cols-7 gap-0 text-center">
                        {[...Array(35)].map((_, i) => {
                          const day = i - 3;
                          const isCurrentMonth = day > 0 && day <= 31;
                          const isToday = day === 24;
                          return (
                            <div 
                              key={i} 
                              className={`h-4 w-4 mx-auto flex items-center justify-center text-[8px] rounded-full
                                         ${isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}
                                         ${isToday ? 'bg-blue-500 text-white font-medium' : ''}
                                         ${(day === 12 || day === 17 || day === 25) ? 'border-b-2 border-blue-400' : ''}`}
                            >
                              {day <= 0 ? day + 31 : day > 31 ? day - 31 : day}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Enrolled Students (bottom of left column) */}
              <div className="bg-white rounded-xl shadow p-4 h-48 overflow-y-auto">
                <h2 className="font-bold text-gray-700 text-sm mb-2">Enrolled Students</h2>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>Student 1</li>
                  <li>Student 2</li>
                  <li>Student 3</li>
                  <li>...</li>
                </ul>
              </div>
            </div>
            {/* Right: vertical stack of assignment upload and enrolled students */}
            <div className="flex flex-col gap-4 w-full md:w-[400px]">
              {/* Assignment Upload Box */}
              <div className="bg-white rounded-xl shadow p-4 flex-1 min-h-[100px]">
                <h2 className="font-bold text-gray-700 text-sm mb-2">Upload Schedule</h2>
                <div className="flex flex-col items-center justify-center h-full">
                  {/* Placeholder for upload UI */}
                  <button className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold shadow hover:bg-blue-600">Upload Image/Assignment</button>
                </div>
              </div>
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
