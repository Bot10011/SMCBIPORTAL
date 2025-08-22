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
    course: string;
    rating: number;
    students: number;
    color: string;
    yearLabel?: string;
  }[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Unified panel state replaces separate modal flags
  const perfListRef = React.useRef<HTMLDivElement | null>(null);
  const [yearFilter, setYearFilter] = useState<'all' | '1st Year' | '2nd Year' | '3rd Year' | '4th Year'>('all');
  const [activePanel, setActivePanel] = useState<'notifications' | 'notes' | 'calendar'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [personalNotes, setPersonalNotes] = useState<Array<{ id: string; content: string; created_at: string }>>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState<string>("");
  const [programNotifications, setProgramNotifications] = useState<Array<{ id: string; title: string; message: string; severity: 'announcement' | 'reminder' | 'deadline' | 'exam' | 'meeting' | 'advisory' | 'info' | 'success' | 'warning' | 'error'; audience: 'instructor' | 'student' | 'all'; created_by: string | null; created_at: string }>>([]);
  const [editingNotifId, setEditingNotifId] = useState<string | null>(null);
  const [editingNotif, setEditingNotif] = useState<{ title: string; message: string; severity: 'announcement' | 'reminder' | 'deadline' | 'exam' | 'meeting' | 'advisory' | 'info' | 'success' | 'warning' | 'error'; audience: 'instructor' | 'student' | 'all' }>({ title: '', message: '', severity: 'announcement', audience: 'instructor' });

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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
          .select('id, title, message, severity, audience, created_by, created_at')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setProgramNotifications(data || []);
      } catch (err) {
        console.error('ProgramHead notifications fetch error:', err);
        setProgramNotifications([]);
      }
    };
    loadNotifications();
  }, []);

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
          .select('id, code, year_level');
        if (coursesError) throw coursesError;
        const courseMetaMap: Record<string, { code: string; year_level?: string | null }> = {};
        (courses || []).forEach((c: { id: string, code: string, year_level?: string | null }) => {
          courseMetaMap[c.id] = { code: c.code, year_level: c.year_level };
        });
        // Unique students
        const uniqueStudentIds = new Set((enrollments || []).map((e: { student_id: string }) => e.student_id));
        // Unique subjects
        const uniqueSubjectIds = new Set((enrollments || []).map((e: { subject_id: string }) => e.subject_id));
        // Courses Performance: ensure ALL courses show, even without enrollments
        const subjectStudentMap: Record<string, Set<string>> = {};
        (enrollments || []).forEach((e: { subject_id: string, student_id: string }) => {
          if (!subjectStudentMap[e.subject_id]) subjectStudentMap[e.subject_id] = new Set();
          subjectStudentMap[e.subject_id].add(e.student_id);
        });
        const performance = (courses || []).map((c: { id: string; code: string; year_level?: string | null }) => {
          // Normalize year label
          const yl = (c.year_level || '').toString().trim();
          const yearLabel = yl || (() => {
            const match = (c.code || '').match(/(\d{3})/);
            if (!match) return '';
            const digit = match[1][0];
            if (digit === '1') return '1st Year';
            if (digit === '2') return '2nd Year';
            if (digit === '3') return '3rd Year';
            if (digit === '4') return '4th Year';
            return '';
          })();
          return {
            course: (courseMetaMap[c.id]?.code) || c.id,
            rating: 0,
            students: subjectStudentMap[c.id] ? subjectStudentMap[c.id].size : 0,
            color: 'blue',
            yearLabel,
          };
        });
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
        {/* Left: Course Performance Chart (spans 2) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-gray-600" />
              Subjects Performance
            </h2>
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
              <select
                value={yearFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setYearFilter(e.target.value as 'all' | '1st Year' | '2nd Year' | '3rd Year' | '4th Year')}
                className="bg-gray-50 border border-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Years</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </div>

          <div ref={perfListRef} className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
            {studentPerformance
              .filter(course => yearFilter === 'all' || course.yearLabel === yearFilter)
              .map(course => {
              const maxStudents = 100;
              const percent = Math.min((course.students / maxStudents) * 100, 100);
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
                   
                  </div>
                 
                </div>
              );
            })}
          </div>
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
                <h3 className="font-bold text-gray-700 flex items-center mb-3"><Bell className="w-4 h-4 mr-2 text-blue-500" /> Notifications</h3>
                {/* Add notification indicator/form */}
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
                      const { data: inserted, error } = await supabase
                        .from('notifications')
                        .insert({ title, message, severity, audience, created_by: user.id, is_active: true })
                        .select('id, title, message, severity, audience, created_by, created_at')
                        .single();
                      if (error) throw error;
                      if (inserted) setProgramNotifications(prev => [inserted, ...prev]);
                      titleInput.value = '';
                      messageInput.value = '';
                      severitySelect.value = 'info';
                      audienceSelect.value = 'instructor';
                    } catch (err) {
                      console.error('Failed to add notification:', err);
                    }
                  }}
                  className="grid grid-cols-1 gap-2 mb-4"
                >
                  <input name="title" placeholder="Title" className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                  <input name="message" placeholder="Message" className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
                  <div className="flex gap-2">
                    <select name="type" className="px-2 py-2 rounded-lg border border-gray-300 text-sm">
                      <option value="announcement">Announcement</option>
                      <option value="reminder">Reminder</option>
                      <option value="deadline">Deadline</option>
                      <option value="exam">Exam</option>
                      <option value="meeting">Meeting</option>
                      <option value="advisory">Advisory</option>
                    </select>
                    <select name="audience" className="px-2 py-2 rounded-lg border border-gray-300 text-sm">
                      <option value="instructor">Instructors</option>
                      <option value="student">Students</option>
                      <option value="all">All</option>
                    </select>
                    <button type="submit" className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm">Add</button>
                  </div>
                </form>
                {/* List notifications with edit/delete for own items */}
                <div className="space-y-3">
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
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">{n.audience}</span>
                              </div>
                            </>
                          )}
                        </div>
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
                                        .delete()
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
                    ))
                  )}
                </div>
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
