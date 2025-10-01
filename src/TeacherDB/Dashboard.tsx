import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import ClassManagement from './ClassManagement';
import TeacherSettings from './Settings';
import { BookOpen, Search, Bell, Download, Trash2, FileText, StickyNote, Calendar, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { getGoogleClassroomConnectionInfo } from '../lib/services/googleClassroomService';
import { googleDriveService, DriveItem } from '../lib/services/googleDriveService';
import { StudentGoogleClassroom } from '../components/StudentGoogleClassroom';
import userAvatar from '../../img/user-avatar.png';
import { LuNotebookPen } from 'react-icons/lu';
import { IoDocuments } from 'react-icons/io5';
import { motion } from 'framer-motion';

// Dashboard Card Component matching AdminDB styling
const DashboardCard: React.FC<{
  title: React.ReactNode;
  subtitle: string;
  icon?: React.ReactNode;
  delay?: number;
  onClick?: () => void;
  status?: 'connected' | 'disconnected' | 'checking';
  className?: string;
  children?: React.ReactNode;
  height?: string;
}> = ({ title, subtitle, icon, delay = 0, onClick, status, className = "", children, height }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`bg-[#00A7E1] rounded-xl sm:rounded-2xl p-3 sm:p-4 relative ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.15), -4px -4px 8px rgba(0, 0, 0, 0.05), inset 1px 1px 2px rgba(255, 255, 255, 0.1)',
        height: height || ''
      }}
      onClick={onClick}
    >
      <div className="p-2 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-white/90 break-words">{title}</p>
            <p className="mt-1 text-xs text-white/70 break-words">{subtitle}</p>
            {status && (
              <div className="flex items-center gap-1 sm:gap-2 mt-2">
                <span className="text-xs font-medium text-white">
                  {status === 'checking' ? 'Checking...' : 
                   status === 'connected' ? 'Connected' : 
                   'Not Connected'}
                </span>
                {status === 'connected' && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
                {status === 'disconnected' && <span className="w-2 h-2 bg-[#f43e19] rounded-full" />}
                {status === 'checking' && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
              </div>
            )}
          </div>
          {icon && (
            <div 
              className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm flex-shrink-0"
              style={{
                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.1)'
              }}
            >
              <motion.div 
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatDelay: 3,
                  ease: "easeInOut" 
                }}
              >
                {icon}
              </motion.div>
            </div>
          )}
        </div>
        {children}
      </div>
    </motion.div>
  );
};

interface ClassData {
  id: string;
  subject_id?: string;
  name: string;
  sections: number;
  students: number;
  icon: string;
  day?: string;
  time?: string;
  year_level?: string;
  semester?: string;
  section?: string;
  units?: number;
}

interface StudentData {
  id: string;
  name: string;
  email: string;
  class_name: string;
  status: string;
}

// Database interfaces
interface Enrollment {
  id: string;
  student_id: string;
  subject_id: string;
  status: string;
}

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface CourseDetail {
  id: string;
  name: string;
  code: string;
}

// Notification item type
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: string;
  audience?: string;
  created_at: string;
  expires_at?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  time?: string;
}

const TeacherDashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Performance optimized state management with useReducer for complex state
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [documents, setDocuments] = useState<DriveItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<'all' | 'presentation' | 'document' | 'pdf' | 'spreadsheet'>('all');
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [personalNotes, setPersonalNotes] = useState<Array<{ id: string; content: string; created_at: string }>>([]);
  const [dailyBibleVerse, setDailyBibleVerse] = useState<{ verse: string; reference: string } | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [instructorNotifications, setInstructorNotifications] = useState<NotificationItem[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [googleClassroomStatus, setGoogleClassroomStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [activePanel, setActivePanel] = useState<'notifications' | 'notes' | 'documents' | 'calendar'>('calendar');
  const [gradeEditRequests, setGradeEditRequests] = useState<Array<{
    id: string;
    student_id: string;
    student_name?: string | null;
    subject_id?: string | null;
    course_code?: string | null;
    course_name?: string | null;
    section?: string | null;
    year_level?: string | null;
    edit_reason?: string | null;
    edit_status?: string | null;
    created_at?: string | null;
  }>>([]);
  
  // Notification form state
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [creatingNotification, setCreatingNotification] = useState(false);
  const [notificationRefresh, setNotificationRefresh] = useState(0);
  type NotificationSeverity = 'announcement' | 'reminder' | 'deadline' | 'exam' | 'meeting' | 'advisory' | 'info' | 'success' | 'warning' | 'error';
  
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    severity: 'announcement' as NotificationSeverity,
    audience: 'all',
    priority: 1,
    timeInterval: 'none',
    timeValue: 1
  });
  
  // Handle notification creation
  const handleCreateNotification = async () => {
    try {
      if (!user?.id) {
        toast.error('No user found');
        return;
      }
      if (!notificationForm.title || !notificationForm.message) {
        toast.error('Please fill out all notification fields');
        return;
      }

      setCreatingNotification(true);

      // Calculate expiration date if time interval is set
      let expiresAt = null;
      if (notificationForm.timeInterval !== 'none' && notificationForm.timeValue > 0) {
        const now = new Date();
        switch (notificationForm.timeInterval) {
          case 'hours':
            expiresAt = new Date(now.getTime() + (notificationForm.timeValue * 60 * 60 * 1000));
            break;
          case 'days':
            expiresAt = new Date(now.getTime() + (notificationForm.timeValue * 24 * 60 * 60 * 1000));
            break;
          case 'weeks':
            expiresAt = new Date(now.getTime() + (notificationForm.timeValue * 7 * 24 * 60 * 60 * 1000));
            break;
          default:
            expiresAt = null;
        }
      }

      // Sanitize audience to supported enum
      type AllowedAudience = 'all' | 'instructor' | 'student';
      const allowedAudience: readonly AllowedAudience[] = ['all', 'instructor', 'student'] as const;
      const selectedAudience = String(notificationForm.audience);
      const audience: AllowedAudience = (allowedAudience as readonly string[]).includes(selectedAudience)
        ? (selectedAudience as AllowedAudience)
        : 'all';

      const { error } = await supabase
        .from('notifications')
        .insert([{
          title: notificationForm.title,
          message: notificationForm.message,
          severity: notificationForm.severity,
          audience,
          expires_at: expiresAt,
          created_by: user.id,
          is_active: true
        }]);

      if (error) {
        throw error;
      }

      toast.success('Notification sent successfully to all users!');
      setNotificationForm({ title: '', message: '', severity: 'announcement', audience: 'all', priority: 1, timeInterval: 'none', timeValue: 1 });
      setShowNotificationForm(false);
      
      // Trigger a notification refresh by calling the effect
      setNotificationRefresh(prev => prev + 1);
      
    } catch (err) {
      console.error('Error creating notification:', err);
      toast.error('Failed to send notification');
    } finally {
      setCreatingNotification(false);
    }
  };

  // Loading states for better UX
  const [isLoading, setIsLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);
  
  // Search states with debouncing - optimized with useMemo
  const [searchResults, setSearchResults] = useState<{
    classes: ClassData[];
    documents: DriveItem[];
    notes: string[];
    students: StudentData[];
  }>({ classes: [], documents: [], notes: [], students: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Personal notes now loaded from database (see fetchNotes effect)

  // Cache states with longer duration for slow connections
  const [profileCache, setProfileCache] = useState<{ 
    pictureUrl: string | null; 
    timestamp: number 
  } | null>(null);
  const [classesCache, setClassesCache] = useState<{ data: ClassData[]; timestamp: number } | null>(null);
  const [documentsCache, setDocumentsCache] = useState<{ data: DriveItem[]; timestamp: number } | null>(null);

  // Extended cache duration for slow connections (10 minutes)
  const CACHE_DURATION = 10 * 60 * 1000;

  // Memoized cache validation - optimized with useMemo
  const isCacheValid = useMemo(() => (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  }, [CACHE_DURATION]);



  // Optimized profile fetching with error handling
  useEffect(() => {
    // Mirror Student dashboard Google Classroom connection indicator
    const checkGoogleClassroomStatus = () => {
      if (!user?.id) {
        setGoogleClassroomStatus('disconnected');
        return;
      }
      const connectionInfo = getGoogleClassroomConnectionInfo(user.id);
      setGoogleClassroomStatus(connectionInfo.status);
    };

    checkGoogleClassroomStatus();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('google_classroom_token_') || e.key?.includes('google_auth_code_')) {
        checkGoogleClassroomStatus();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.id]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      // Check cache first
      if (profileCache && isCacheValid(profileCache.timestamp)) {
        setProfilePictureUrl(profileCache.pictureUrl);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        // Use davatar_url from user_profiles, fallback to placeholder in UI
        let pictureUrl: string | null = (data as unknown as { avatar_url?: string | null })?.avatar_url || null;
        if (typeof pictureUrl === 'string' && pictureUrl.trim() === '') {
          pictureUrl = null;
        }
        setProfilePictureUrl(pictureUrl);
        setProfileCache({ pictureUrl, timestamp: Date.now() });
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfilePictureUrl(null);
        setProfileCache({ pictureUrl: null, timestamp: Date.now() });
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id, profileCache, isCacheValid]);

  // Fetch personal notes for the logged-in user
  useEffect(() => {
    const fetchNotes = async () => {
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
        console.error('Error fetching personal notes:', err);
        setPersonalNotes([]);
      }
    };
    fetchNotes();
  }, [user?.id]);

  // Fetch notifications visible to instructors
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, title, message, severity, created_at, expires_at, created_by')
          .eq('is_active', true)
          .eq('audience', 'instructor')
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        const notifications = (data as NotificationItem[]) || [];
        // Resolve creator names from user_profiles
        const creatorIds = Array.from(new Set((notifications
          .map(n => n.created_by)
          .filter(Boolean) as string[])));
        if (creatorIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('user_profiles')
            .select('id, display_name, first_name, last_name')
            .in('id', creatorIds);
          if (!profileError && profiles) {
            const nameMap = new Map<string, string>();
            profiles.forEach((p: { id: string; display_name?: string | null; first_name?: string | null; last_name?: string | null; }) => {
              const display = (p.display_name && p.display_name.trim())
                || [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
                || 'Unknown';
              nameMap.set(p.id, display);
            });
            notifications.forEach(n => {
              if (n.created_by) {
                n.created_by_name = nameMap.get(n.created_by) || null;
              }
            });
          }
        }
        setInstructorNotifications(notifications);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setInstructorNotifications([]);
      }
    };
    fetchNotifications();
  }, [user?.id, notificationRefresh]);

  // Periodic cleanup of expired notifications created by current user
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
    runCleanup(); // run once immediately
    const intervalId = setInterval(runCleanup, 60 * 1000); // every minute
    return () => clearInterval(intervalId);
  }, [user?.id]);

  // Fetch grade edit requests for this teacher
  const fetchGradeEditRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('grades')
        .select(`
          id,
          student_id,
          subject_id,
          section,
          year_level,
          edit_reason,
          edit_status,
          edit_requested_by,
          edit_student_name,
          created_at,
          course:courses(code, name)
        `)
        .eq('edit_requested_by', user.id)
        .or('edit_requested.eq.true,edit_status.eq.granted')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedRequests = (data || []).map((req: any) => ({
        id: req.id,
        student_id: req.student_id,
        student_name: req.edit_student_name,
        subject_id: req.subject_id,
        course_code: req.course?.code,
        course_name: req.course?.name,
        section: req.section,
        year_level: req.year_level,
        edit_reason: req.edit_reason,
        edit_status: req.edit_status,
        created_at: req.created_at
      }));
      
      setGradeEditRequests(mappedRequests);
    } catch (err) {
      console.error('Error fetching grade edit requests:', err);
      setGradeEditRequests([]);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGradeEditRequests();
  }, [fetchGradeEditRequests]);

  // Refresh grade edit requests when user returns to dashboard
  useEffect(() => {
    const handleFocus = () => {
      fetchGradeEditRequests();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchGradeEditRequests]);

  // Optimized classes fetching with loading state
  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.id) return;
      
      console.group('🎓 My Classes: Fetch Start');
      console.log('teacher_id:', user.id);
      // Check cache first
      if (classesCache && isCacheValid(classesCache.timestamp)) {
        setClasses(classesCache.data);
        setClassesLoading(false);
        console.log('Using cached classes:', classesCache.data.length);
        // If cache is empty, don't return; continue to try fetch again to recover
        if ((classesCache.data?.length || 0) > 0) {
          console.groupEnd();
          return;
        }
        console.warn('Cached classes are empty; attempting fresh fetch...');
      }
 
      setClassesLoading(true);
      try {
        // Primary: active assignments only
        const { data, error } = await supabase
          .from('teacher_subjects')
          .select(`
            id,
            subject_id,
            day,
            time,
            year_level,
            semester,
            section,
            teacher_id,
            course:courses(name, code, units)
          `)
          .eq('teacher_id', user.id)
          .eq('is_active', true);
        
        console.log('Raw fetch result:', { error, rows: data?.length || 0 });
        let rows = data;
        let fetchError = error;

        // Fallback: if zero rows, try without is_active to diagnose data shape
        if (!fetchError && (rows?.length || 0) === 0) {
          console.warn('No active classes found. Trying fallback without is_active filter...');
          const { data: fallbackRows, error: fallbackError } = await supabase
            .from('teacher_subjects')
            .select(`
              id,
              subject_id,
              day,
              time,
              year_level,
              semester,
              section,
              teacher_id,
              course:courses(name, code, units)
            `)
            .eq('teacher_id', user.id);
          console.log('Fallback fetch result:', { error: fallbackError, rows: fallbackRows?.length || 0 });
          if (!fallbackError) {
            rows = fallbackRows || [];
            fetchError = null;
          }
        }

        if (!fetchError && rows) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const classData = rows.map((item: any) => ({
            id: item.id,
            subject_id: item.subject_id,
            name: `${item.course?.code || 'Unknown'} - ${item.course?.name || 'Unknown Course'}`,
            sections: 1,
            students: Math.floor(Math.random() * 30) + 10,
            icon: 'BookOpen',
            day: item.day,
            time: item.time,
            year_level: item.year_level,
            semester: item.semester,
            section: item.section,
            units: item.course?.units || 0
          }));
          setClasses(classData);
          if ((classData?.length || 0) > 0) {
            setClassesCache({ data: classData, timestamp: Date.now() });
          }
          console.log('Transformed classes:', classData.length);
          if (classData.length === 0) {
            console.warn('My Classes: No classes found for this teacher. Check teacher_subjects and is_active.');
          }
        } else if (fetchError) {
          setClasses([]);
          console.error('My Classes fetch error:', fetchError);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setClasses([]);
      } finally {
        setClassesLoading(false);
        console.groupEnd();
      }
    };
    fetchClasses();
  }, [user?.id, classesCache, isCacheValid]);

  // Optimized students fetching with loading state
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.id) {
        return;
      }
      
      try {
        const { data: teacherSubjects, error: teacherSubjectsError } = await supabase
          .from('teacher_subjects')
          .select('subject_id')
          .eq('teacher_id', user.id)
          .eq('is_active', true);
        
        if (teacherSubjectsError) {
          console.error('Error fetching teacher subjects:', teacherSubjectsError);
          setStudents([]);
          return;
        }
        
        if (!teacherSubjects || teacherSubjects.length === 0) {
          setStudents([]);
          return;
        }
        
        const teacherSubjectIds = teacherSubjects.map(ts => ts.subject_id);
        
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('enrollcourse')
          .select(`
            id,
            student_id,
            subject_id,
            status
          `)
          .in('subject_id', teacherSubjectIds)
          .eq('status', 'active');
        
        if (enrollmentError) {
          console.error('Error fetching enrollments:', enrollmentError);
          setStudents([]);
          return;
        }
        
        if (enrollments && enrollments.length > 0) {
          const studentIds = [...new Set(enrollments.map((e: Enrollment) => e.student_id))];
          const subjectIds = [...new Set(enrollments.map((e: Enrollment) => e.subject_id))];
          
          const { data: studentProfiles, error: studentError } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name, email')
            .in('id', studentIds);
          
          if (studentError) {
            console.error('Error fetching student profiles:', studentError);
            setStudents([]);
            return;
          }
          
          const { data: subjectDetails, error: subjectError } = await supabase
            .from('courses')
            .select('id, name, code')
            .in('id', subjectIds);
          
          if (subjectError) {
            console.error('Error fetching course details:', subjectError);
            setStudents([]);
            return;
          }
          
          const studentMap = new Map(studentProfiles?.map((s: StudentProfile) => [s.id, s]) || []);
          const subjectMap = new Map(subjectDetails?.map((s: CourseDetail) => [s.id, s]) || []);
          
          const studentData = enrollments.map((enrollment: Enrollment) => {
            const student = studentMap.get(enrollment.student_id);
            const subject = subjectMap.get(enrollment.subject_id);
            
            return {
              id: enrollment.student_id,
              name: `${student?.first_name || 'Unknown'} ${student?.last_name || 'Student'}`,
              email: student?.email || 'No email',
              class_name: `${subject?.code || 'Unknown'} - ${subject?.name || 'Unknown Course'}`,
              status: enrollment.status
            };
          });
          
          const uniqueStudents = studentData.filter((student, index, self) => 
            index === self.findIndex(s => s.id === student.id)
          );
          
          setStudents(uniqueStudents);
        } else {
          setStudents([]);
        }
      } catch (error) {
        console.error('Error in fetchStudents for teacher', user.id, ':', error);
        setStudents([]);
      }
    };
    
    fetchStudents();
  }, [user?.id]);

  // Fetch Google Drive documents
  useEffect(() => {
    const fetchGoogleDriveDocuments = async () => {
      console.log('🔍 Fetching Google Drive documents...', {
        userId: user?.id,
        googleClassroomStatus,
        isConnected: googleClassroomStatus === 'connected'
      });

      if (!user?.id) {
        console.log('❌ No user ID found');
        setDocuments([]);
        return;
      }

      if (googleClassroomStatus !== 'connected') {
        console.log('❌ Google Classroom not connected:', googleClassroomStatus);
        setDocuments([]);
        return;
      }

      try {
        setDocumentsLoading(true);
        setDocumentsError(null);
        
        console.log('✅ Attempting to fetch Google Drive files...');
        const driveFiles = await googleDriveService.getFiles(user.id);
        console.log('📁 Raw Google Drive files:', driveFiles);
        
        // Filter to show only school-related files (not folders) and limit to recent ones
        const schoolFiles = driveFiles
          .filter(file => {
            if (file.isFolder) return false;
            
            // Only show school-related file types
            const mimeType = file.mimeType?.toLowerCase() || '';
            const fileName = file.name?.toLowerCase() || '';
            
            // School document types
            const isSchoolDocument = 
              mimeType.includes('pdf') || // PDF files
              mimeType.includes('presentation') || // PowerPoint
              mimeType.includes('document') || // Word documents
              mimeType.includes('spreadsheet') || // Excel files
              mimeType.includes('image') || // Images for presentations
              mimeType.includes('text/plain') || // Text files
              mimeType.includes('application/vnd.openxmlformats-officedocument') || // Modern Office files
              mimeType.includes('application/vnd.ms-') || // Legacy Office files
              fileName.includes('.ppt') || fileName.includes('.pptx') || // PowerPoint
              fileName.includes('.doc') || fileName.includes('.docx') || // Word
              fileName.includes('.xls') || fileName.includes('.xlsx') || // Excel
              fileName.includes('.pdf') || // PDF
              fileName.includes('.txt') || // Text files
              fileName.includes('class') || fileName.includes('lesson') || fileName.includes('lecture') || // Class-related
              fileName.includes('assignment') || fileName.includes('homework') || fileName.includes('quiz') || // Academic
              fileName.includes('syllabus') || fileName.includes('curriculum') || fileName.includes('notes'); // Course materials
            
            return isSchoolDocument;
          })
          .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
          .slice(0, 15); // Show up to 15 school files
        
        console.log('📄 Filtered school files:', schoolFiles);
        setDocuments(schoolFiles);
      } catch (error) {
        console.error('❌ Error fetching Google Drive documents:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Google Drive documents';
        setDocumentsError(errorMessage);
        setDocuments([]);
      } finally {
        setDocumentsLoading(false);
      }
    };

    fetchGoogleDriveDocuments();
  }, [user?.id, googleClassroomStatus]);

  // Optimized visibility change handler with throttling and requestAnimationFrame
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let rafId: number;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Throttle cache invalidation to prevent excessive updates
        clearTimeout(timeoutId);
        cancelAnimationFrame(rafId);
        
        timeoutId = setTimeout(() => {
          rafId = requestAnimationFrame(() => {
            if (profileCache && !isCacheValid(profileCache.timestamp)) {
              setProfileCache(null);
            }
            if (classesCache && !isCacheValid(classesCache.timestamp)) {
              setClassesCache(null);
            }
            if (documentsCache && !isCacheValid(documentsCache.timestamp)) {
              setDocumentsCache(null);
            }
          });
        }, 50); // Reduced throttle for better responsiveness
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, [profileCache, classesCache, documentsCache, isCacheValid]);

  // Optimized search functionality with debouncing and memoization
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults({ classes: [], documents: [], notes: [], students: [] });
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    
    // Use requestAnimationFrame for smoother performance
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        const lowerQuery = query.toLowerCase();

        // Search in classes - memoized for performance
        const filteredClasses = classes.filter(classItem =>
          classItem.name.toLowerCase().includes(lowerQuery) ||
          classItem.sections.toString().includes(lowerQuery) ||
          classItem.students.toString().includes(lowerQuery)
        );

        // Search in documents - memoized for performance
        const filteredDocuments = documents.filter(doc =>
          doc.name.toLowerCase().includes(lowerQuery) ||
          (doc.size && doc.size.toLowerCase().includes(lowerQuery)) ||
          doc.modifiedTime.toLowerCase().includes(lowerQuery)
        );

        // Search in personal notes - memoized for performance
        const filteredNotes = personalNotes
          .map(n => n.content)
          .filter(note => note.toLowerCase().includes(lowerQuery));

        // Search in students - memoized for performance
        const filteredStudents = students.filter(student => {
          const matchesName = student.name.toLowerCase().includes(lowerQuery);
          const matchesEmail = student.email.toLowerCase().includes(lowerQuery);
          const matchesClass = student.class_name.toLowerCase().includes(lowerQuery);
          const matchesStatus = student.status.toLowerCase().includes(lowerQuery);
          
          return matchesName || matchesEmail || matchesClass || matchesStatus;
        });

        setSearchResults({
          classes: filteredClasses,
          documents: filteredDocuments,
          notes: filteredNotes,
          students: filteredStudents
        });
        setShowSearchResults(true);
        setIsSearching(false);
      });
    }, 300); // Reduced debounce delay for better responsiveness

    return () => clearTimeout(timeoutId);
  }, [classes, documents, personalNotes, students]);

  // Optimized search input handler with debouncing
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      performSearch(query);
    } else {
      setShowSearchResults(false);
      setSearchResults({ classes: [], documents: [], notes: [], students: [] });
    }
  }, [performSearch]);

  // Memoized search form handler
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  }, [searchQuery, performSearch]);

  // Memoized clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults({ classes: [], documents: [], notes: [], students: [] });
  }, []);

  // Memoized text highlighting
  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-semibold">{part}</span>
      ) : part
    );
  }, []);

  // Memoized calendar navigation
  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // Memoized document actions
  const handleDownloadDocument = useCallback((documentId: string) => {
    console.log('Downloading document:', documentId);
  }, []);

  const handleDeleteDocument = useCallback((documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    console.log('Deleting document:', documentId);
  }, []);

  // Daily Bible verse for motivation - randomized only on login
  const generateDailyBibleVerse = () => {
    // Generate a random index each time the function is called
    // This ensures different verses on each login session
    const randomIndex = Math.floor(Math.random() * 12); // 12 verses available
    
    const verses = [
      {
        verse: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.",
        reference: "Jeremiah 29:11"
      },
      {
        verse: "I can do all things through Christ who strengthens me.",
        reference: "Philippians 4:13"
      },
      {
        verse: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
        reference: "Proverbs 3:5-6"
      },
      {
        verse: "The Lord is my strength and my shield; my heart trusts in him, and he helps me.",
        reference: "Psalm 28:7"
      },
      {
        verse: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
        reference: "Joshua 1:9"
      },
      {
        verse: "Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.",
        reference: "Matthew 5:16"
      },
      {
        verse: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
        reference: "Romans 8:28"
      },
      {
        verse: "The Lord gives strength to his people; the Lord blesses his people with peace.",
        reference: "Psalm 29:11"
      },
      {
        verse: "Commit to the Lord whatever you do, and he will establish your plans.",
        reference: "Proverbs 16:3"
      },
      {
        verse: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
        reference: "Isaiah 40:31"
      },
      {
        verse: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.",
        reference: "2 Timothy 1:7"
      },
      {
        verse: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.",
        reference: "Psalm 23:1-3"
      }
    ];
    
    // Return randomly selected verse - changes only on login
    return verses[randomIndex];
  };

  // Generate new Bible verse only when user logs in (when user.id changes)
  useEffect(() => {
    if (user?.id) {
      setDailyBibleVerse(generateDailyBibleVerse());
    }
  }, [user?.id]);

  // Memoized navigation handlers
  const handleClassClick = useCallback((classId: string) => {
    setActivePanel('calendar');
    const cls = classes.find(c => c.id === classId);
    if (cls?.subject_id) {
      navigate(`/dashboard/class-management?subjectId=${encodeURIComponent(cls.subject_id)}`);
    } else {
      navigate('/dashboard/class-management');
    }
  }, [navigate, classes]);

 

  // Live clock state to keep statuses accurate; updates every minute
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Memoized class status calculation - robust parsing of days and times
  const getClassStatus = useMemo(() => (rawClassDay: string, rawClassTime: string) => {
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const normalizeSingleDay = (token: string) => {
      const t = (token || '').trim();
      const key = t.toUpperCase();
      const map: Record<string, string> = {
        'M': 'Monday', 'MON': 'Monday', 'MONDAY': 'Monday',
        'T': 'Tuesday', 'TU': 'Tuesday', 'TUE': 'Tuesday', 'TUESDAY': 'Tuesday',
        'W': 'Wednesday', 'WED': 'Wednesday', 'WEDNESDAY': 'Wednesday',
        'TH': 'Thursday', 'THU': 'Thursday', 'THUR': 'Thursday', 'THURSDAY': 'Thursday',
        'F': 'Friday', 'FRI': 'Friday', 'FRIDAY': 'Friday',
        'S': 'Saturday', 'SAT': 'Saturday', 'SATURDAY': 'Saturday',
        'SU': 'Sunday', 'SUN': 'Sunday', 'SUNDAY': 'Sunday'
      };
      return map[key] || t;
    };

    const expandCombinedDays = (value: string): string[] => {
      if (!value) return [];
      const v = value.replace(/\s+/g, '');
      const upper = v.toUpperCase();
      // Common combos
      if (upper === 'MWF') return ['M', 'W', 'F'].map(normalizeSingleDay);
      if (upper === 'TTH' || upper === 'TUTH') return ['T', 'Th'].map(normalizeSingleDay);
      if (upper.includes(',')) return upper.split(',').map(normalizeSingleDay);
      if (upper.includes('/')) return upper.split('/').map(normalizeSingleDay);
      // Hyphenated ranges like MON-FRI -> expand to weekdays
      if (upper.includes('-')) {
        const [start, end] = upper.split('-');
        const startFull = normalizeSingleDay(start);
        const endFull = normalizeSingleDay(end);
        const si = daysOrder.indexOf(startFull);
        const ei = daysOrder.indexOf(endFull);
        if (si !== -1 && ei !== -1) {
          const result: string[] = [];
          for (let i = si; i !== ei; i = (i + 1) % 7) {
            result.push(daysOrder[i]);
            if (i === (ei + 6) % 7) break; // safety
          }
          result.push(daysOrder[ei]);
          return result;
        }
      }
      // Space separated words like "Mon Wed"
      if (/\s/.test(value.trim())) return value.trim().split(/\s+/).map(normalizeSingleDay);
      return [normalizeSingleDay(value)];
    };

    const classDays = new Set(expandCombinedDays(rawClassDay));
    const currentDayFull = now.toLocaleDateString('en-US', { weekday: 'long' });

    // If no day provided, fallback to time-only logic as 'today' if time present
    if (classDays.size === 0) {
      if (!rawClassTime) return 'today';
    }

    if (!classDays.has(currentDayFull)) {
      // Determine if the next occurrence is ahead or passed this week
      const todayIndex = daysOrder.indexOf(currentDayFull);
      const nextIndex = Math.min(
        ...[...classDays].map(d => daysOrder.indexOf(d)).filter(i => i >= 0).map(i => (i - todayIndex + 7) % 7)
      );
      return nextIndex > 0 ? 'upcoming' : 'past';
    }

    if (!rawClassTime) return 'today';

    const toMinutes = (date: Date) => date.getHours() * 60 + date.getMinutes();
    const currentMinutes = toMinutes(now);

    const parseSingleTimeToMinutes = (value: string | number): number | null => {
      if (value == null) return null;
      if (typeof value === 'number') {
        const str = value.toString().padStart(4, '0'); // e.g., 900 -> 0900
        const hours = parseInt(str.slice(0, 2));
        const minutes = parseInt(str.slice(2, 4));
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
      return hours * 60 + minutes;
      }
      const raw = value.trim();
      // Handle 1330 or 0900
      if (/^\d{3,4}$/.test(raw)) {
        const str = raw.padStart(4, '0');
        const hours = parseInt(str.slice(0, 2));
        const minutes = parseInt(str.slice(2, 4));
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
        return hours * 60 + minutes;
      }
      // Handle HH:MM with optional AM/PM
      const match = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridiem = match[3]?.toUpperCase();
        if (meridiem === 'AM' && hours === 12) hours = 0;
        if (meridiem === 'PM' && hours < 12) hours += 12;
        return hours * 60 + minutes;
      }
      return null;
    };

    const parseTimeRange = (value: string | number): { start: number; end: number } | null => {
      if (typeof value === 'number') {
        const start = parseSingleTimeToMinutes(value);
        if (start == null) return null;
        return { start, end: start + 60 }; // assume 1 hour
      }
      const raw = value.trim();
      // Range formats: "HH:MM-HH:MM", "1300-1430"
      const parts = raw.split(/\s*-\s*/);
      if (parts.length === 2) {
        const start = parseSingleTimeToMinutes(parts[0]);
        const end = parseSingleTimeToMinutes(parts[1]);
        if (start != null && end != null) return { start, end };
      }
      const single = parseSingleTimeToMinutes(raw);
      if (single != null) return { start: single, end: single + 60 };
      return null;
    };

    const range = parseTimeRange(rawClassTime as unknown as string | number);
    if (!range) return 'today';

    const { start, end } = range;
    if (currentMinutes >= start && currentMinutes <= end) return 'current';
    if (currentMinutes < start) return 'upcoming';
      return 'past';
  }, [now]);

  // Memoized calendar dates generation - optimized with useMemo
  const calendarDates = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    const dates = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentMonth]);

  // Memoized sorted classes for performance
  const sortedClasses = useMemo(() => {
    return classes
      .sort((a, b) => {
        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayA = daysOrder.indexOf(a.day || '');
        const dayB = daysOrder.indexOf(b.day || '');
        
        if (dayA !== dayB) return dayA - dayB;
        return (a.time || '').localeCompare(b.time || '');
      })
      .map((classItem) => {
        const status = getClassStatus(classItem.day || '', classItem.time || '');
        
        return (
                                    <div 
                            key={classItem.id}
                            onClick={() => handleClassClick(classItem.id)}
                            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ease-out hover:shadow-2xl hover:scale-105 backdrop-blur-sm transform-gpu will-change-transform ${
                              status === 'current' ? 'border-green-300/60 bg-gradient-to-br from-green-50/90 to-emerald-50/90 shadow-lg shadow-green-200/50' :
                              status === 'upcoming' ? 'border-blue-300/60 bg-gradient-to-br from-blue-50/90 to-indigo-50/90 shadow-lg shadow-blue-200/50' :
                              status === 'today' ? 'border-yellow-300/60 bg-gradient-to-br from-yellow-50/90 to-amber-50/90 shadow-lg shadow-yellow-200/50' :
                              'border-gray-200/60 bg-gradient-to-br from-gray-50/90 to-slate-50/90 shadow-lg shadow-gray-200/50'
                            } hover:shadow-xl hover:shadow-opacity-50`}
                            style={{
                              boxShadow: `
                                0 4px 6px -1px rgba(0, 0, 0, 0.1),
                                0 2px 4px -1px rgba(0, 0, 0, 0.06),
                                inset 0 1px 0 rgba(255, 255, 255, 0.8),
                                inset 0 -1px 0 rgba(0, 0, 0, 0.05)
                              `,
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              backfaceVisibility: 'hidden',
                              transform: 'translateZ(0)'
                            }}
                          >
            {/* Glossy overlay */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full shadow-lg ${
                    status === 'current' ? 'bg-green-500 shadow-green-300' :
                    status === 'upcoming' ? 'bg-blue-500 shadow-blue-300' :
                    status === 'today' ? 'bg-yellow-500 shadow-yellow-300' :
                    'bg-gray-400 shadow-gray-300'
                  }`}></div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 text-base drop-shadow-sm">{classItem.day || 'N/A'} - {classItem.time || 'N/A'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                    status === 'current' ? 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-green-300' :
                    status === 'upcoming' ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-blue-300' :
                    status === 'today' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-yellow-300' :
                    'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-gray-300'
                  }`}>
                    {status === 'current' ? 'NOW' : 
                     status === 'upcoming' ? 'NEXT' : 
                     status === 'today' ? 'TODAY' : 'PAST'}
                  </div>
                </div>
              </div>
              
              <h4 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 drop-shadow-sm">{classItem.name}</h4>
              
              <div className="space-y-1 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">Year Level:</span>
                  <span className="font-semibold text-gray-800">{classItem.year_level || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">Section:</span>
                  <span className="font-semibold text-gray-800">{classItem.section || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">Semester:</span>
                  <span className="font-semibold text-gray-800">{classItem.semester || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">Units:</span>
                  <span className="font-semibold text-gray-800">{classItem.units || 0}</span>
                </div>
              </div>
            </div>
          </div>
        );
      });
  }, [classes, getClassStatus, handleClassClick]);

  // Memoized calendar dates rendering for performance
  const memoizedCalendarDates = useMemo(() => {
    return calendarDates.map((date, index) => {
      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
      const isToday = date.getDate() === selectedDate && isCurrentMonth;
      const isSelected = date.getDate() === selectedDate && isCurrentMonth;
      
      // Get day name for this date and convert to abbreviated format
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dayAbbrev = dayName === 'Monday' ? 'M' :
                      dayName === 'Tuesday' ? 'T' :
                      dayName === 'Wednesday' ? 'W' :
                      dayName === 'Thursday' ? 'Th' :
                      dayName === 'Friday' ? 'F' :
                      dayName === 'Saturday' ? 'S' :
                      dayName === 'Sunday' ? 'Su' : '';
      
      // Also check for alternative day formats that might be in the database
      const alternativeDayFormats = [
        dayAbbrev,
        dayName.toUpperCase().substring(0, 3), // MON, TUE, etc.
        dayName.substring(0, 2).toUpperCase(), // MO, TU, etc.
        dayName.substring(0, 1).toUpperCase()  // M, T, etc.
      ];
      
      // Check if there are classes on this day
      const classesOnThisDay = classes.filter(cls => 
        cls.day && alternativeDayFormats.includes(cls.day)
      );
      
      return (
        <div key={index} className="relative group">
          <button
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
            {/* Class indicators */}
            {isCurrentMonth && classesOnThisDay.length > 0 && (
              <div className="flex justify-center mt-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
              </div>
            )}
          </button>
          
          {/* Hover tooltip for class details */}
          {isCurrentMonth && classesOnThisDay.length > 0 && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg min-w-[280px] max-w-[320px]">
                <div className="font-semibold mb-2 text-sm">{dayName} ({dayAbbrev})</div>
                {classesOnThisDay.map((cls, idx) => (
                  <div key={idx} className="mb-2 last:mb-0 p-2 bg-gray-800 rounded">
                    <div className="font-medium text-sm mb-1">{cls.name}</div>
                    <div className="text-gray-300 text-xs space-y-1">
                      <div>⏰ {cls.time}</div>
                      <div>📚 Section {cls.section}</div>
                      <div>📖 {cls.units} units</div>
                      <div>🎓 {cls.year_level}</div>
                    </div>
                  </div>
                ))}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
        </div>
      );
    });
  }, [calendarDates, currentMonth, selectedDate, classes]);

  // Deprecated modal flags replaced by unified activePanel

  // Set initial loading state with reduced delay for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Reduced from 1000ms to 500ms for faster initial load
    return () => clearTimeout(timer);
  }, []);

  // Reset active panel to calendar on route change and refresh grade edit requests
  useEffect(() => {
    setActivePanel('calendar');
    // Refresh grade edit requests when returning to dashboard
    if (location.pathname === '/dashboard') {
      fetchGradeEditRequests();
    }
  }, [location.pathname, fetchGradeEditRequests]);

  // Loading skeleton component with smooth animations
  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-screen will-change-transform">
        <div className="flex-1 overflow-auto transform-gpu">
          <div className="p-6 sm:p-8 max-w-7xl mx-auto transform-gpu">
            <div className="animate-pulse space-y-6">
              {/* Search skeleton */}
              <div className="h-12 bg-gray-200 rounded-full transform-gpu will-change-transform"></div>
              
              {/* Banner skeleton */}
              <div className="h-32 bg-gray-200 rounded-2xl transform-gpu will-change-transform"></div>
              
              {/* Classes skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-gray-200 rounded-xl transform-gpu will-change-transform"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-screen will-change-transform">
      <div className="flex-1 overflow-auto transform-gpu">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-none w-full mx-auto transform-gpu">
          {/* Search Bar */}
          <div className="mb-4 sm:mb-6 contain-layout">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search classes, documents, notes, students..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-8 sm:pl-10 pr-8 sm:pr-12 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300 ease-out bg-white/80 shadow-inner transform-gpu will-change-transform shadow-lg hover:shadow-xl focus:shadow-2xl focus:shadow-blue-500/25 text-sm sm:text-base"
                style={{
                  boxShadow: `
                    inset 0 2px 4px 0 rgba(0, 0, 0, 0.06), 
                    inset 0 1px 2px 0 rgba(0, 0, 0, 0.1),
                    0 10px 15px -3px rgba(0, 0, 0, 0.1),
                    0 4px 6px -2px rgba(0, 0, 0, 0.05),
                    0 0 0 1px rgba(59, 130, 246, 0.1)
                  `,
                  backfaceVisibility: 'hidden',
                  contain: 'layout style paint'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10 p-1"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </form>
            
            {/* Search Results */}  
            {showSearchResults && (
              <div className="mt-3 sm:mt-4 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-xl border border-white/20 transform-gpu will-change-transform transition-all duration-300 ease-out" style={{
                backgroundColor: '#FFFFFFE6',
                boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.7), inset 2px 2px 4px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                  <h3 className="font-bold text-gray-700 text-sm sm:text-base break-words">
                    Search Results for "{searchQuery}"
                  </h3>
                  <button
                    onClick={clearSearch}
                    className="text-gray-400 hover:text-gray-600 text-xs sm:text-sm self-start sm:self-auto flex-shrink-0"
                  >
                    Clear Search
                  </button>
                </div>
                
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">Searching...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Classes Results */}
                    {searchResults.classes.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                          <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                          Classes ({searchResults.classes.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                          {searchResults.classes.map((classItem) => (
                            <div
                              key={classItem.id}
                              onClick={() => handleClassClick(classItem.id)}
                              className="bg-white/80 backdrop-blur-sm border border-white/80 rounded-lg sm:rounded-xl p-2 sm:p-3 flex items-center justify-between shadow-lg cursor-pointer hover:bg-white/80 transition-all duration-200"
                            >
                              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-md sm:rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-medium text-gray-700 text-xs sm:text-sm break-words">
                                    {highlightText(classItem.name, searchQuery)}
                                  </h5>
                                  <p className="text-xs text-gray-500">
                                    {classItem.sections} Sections • {classItem.students} students
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Documents Results */}
                    {searchResults.documents.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          Documents ({searchResults.documents.length})
                        </h4>
                        <div className="space-y-2">
                          {searchResults.documents.map((document) => (
                            <div key={document.id} className="flex items-center justify-between p-3 bg-gray-50/50 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center shadow-lg">
                                  <FileText className="w-3 h-3 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-gray-700">
                                    {highlightText(document.name, searchQuery)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {document.size ? `${(parseInt(document.size) / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'} • Modified {new Date(document.modifiedTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleDownloadDocument(document.id)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteDocument(document.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes Results */}
                    {searchResults.notes.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Notes ({searchResults.notes.length})
                        </h4>
                        <div className="space-y-2">
                          {searchResults.notes.map((note, index) => (
                            <div key={index} className="flex items-start p-3 bg-gray-50/50 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg">
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                              <span className="text-sm text-gray-600">
                                {highlightText(note, searchQuery)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Students Results */}
                    {searchResults.students.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7" />
                          </svg>
                          Students ({searchResults.students.length})
                        </h4>
                        <div className="space-y-2">
                          {searchResults.students.map((student) => (
                            <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50/50 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center shadow-lg">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="font-medium text-sm text-gray-700">
                                    {highlightText(student.name, searchQuery)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Email: {student.email} • Class: {student.class_name}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Results */}
                    {searchResults.classes.length === 0 && 
                     searchResults.documents.length === 0 && 
                     searchResults.notes.length === 0 && 
                     searchResults.students.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">
                          <Search className="w-12 h-12 mx-auto" />
                        </div>
                        <p className="text-gray-500">No results found for "{searchQuery}"</p>
                        <p className="text-sm text-gray-400 mt-1">Try searching for classes, documents, notes, or students</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 contain-layout">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 xl:col-span-2 space-y-3 sm:space-y-4 lg:space-y-3 contain-layout">
              {/* Daily Bible Verse Card */}
              <DashboardCard
                title={
                  <div className="flex items-center gap-1 sm:gap-2">
                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-white flex-shrink-0" />
                    <span className="text-white text-sm sm:text-base">Daily Bible Verse</span>
                  </div>
                }
                subtitle="Today's guidance for your teaching journey"
                delay={0.2}
                className="h-auto sm:h-[220px]"
              >
                <div className="mt-3 sm:mt-4 h-full flex flex-col">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center flex-1 gap-3 sm:gap-0">
                    <div className="flex-1 flex flex-col h-full">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm md:text-sm text-white/95 italic leading-relaxed font-medium break-words hyphens-auto">
                          "{dailyBibleVerse?.verse || 'Loading...'}"
                        </p>
                      </div>
                      <div className="mt-auto pt-2 sm:pt-3 mt-3 sm:mt-4">
                        <p className="text-xs sm:text-sm text-blue-200 font-semibold">
                          "{dailyBibleVerse?.reference || ''}"
                        </p>
                      </div>
                    </div>
                    <div className="hidden sm:block sm:ml-4 flex-shrink-0 -mt-0 sm:-mt-8">
                      {/* Teacher Profile Picture */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white/20 rounded-full flex items-center justify-center overflow-hidden backdrop-blur-sm border border-white/20">
                        {profileLoading ? (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white/30 rounded-full animate-pulse" />
                        ) : (
                          <img
                            src={profilePictureUrl || userAvatar}
                            alt="Teacher Profile"
                            className="w-18 h-18 sm:w-22 sm:h-22 md:w-26 md:h-26 object-cover shadow-lg rounded-full"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.onerror = null; // prevent infinite loop
                              target.src = userAvatar;
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </DashboardCard>



              {/* My Classes Section */}
              <div className="backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-xl border border-white/20 transform-gpu will-change-transform transition-all duration-300 ease-out" style={{
                backgroundColor: '#FFFFFFE6',
                boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.7), inset 2px 2px 4px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <h3 className="font-bold text-gray-700 text-lg sm:text-xl">My Classes</h3>
                    <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                      {classesLoading ? 'Loading...' : `(${classes.length} classes)`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3 text-xs overflow-x-auto">
                    <div className="flex items-center space-x-1 whitespace-nowrap">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-600">Current</span>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 whitespace-nowrap">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-600">Upcoming</span>
                    </div>
                    <div className="flex items-center space-x-1 whitespace-nowrap">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-600">Today</span>
                    </div>
                  </div>
                </div>
                {/* Scrollable list with responsive height */}
                <div className="h-[400px] sm:h-[480px] lg:h-[520px] overflow-y-auto pr-1">
                {classesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-40 sm:h-48 bg-gray-200 rounded-lg sm:rounded-xl"></div>
                      </div>
                    ))}
                  </div>
                  ) : classes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                    {sortedClasses}
                  </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-6 sm:py-8">
                      <div className="text-gray-400 text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">📚</div>
                      <h4 className="text-gray-600 font-medium mb-2 text-sm sm:text-base">No Classes Yet</h4>
                      <p className="text-gray-500 text-xs sm:text-sm">Your assigned classes will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

                      {/* Right Column - Sidebar */}
            <div className="lg:col-span-1 xl:col-span-1 space-y-2 sm:space-y-3 contain-layout">
              {/* Google Classroom Integration */}
              <DashboardCard
                title={<span className="text-white text-sm sm:text-base">Google Classroom</span>}
                subtitle="Access and organize classwork easily"
                icon={
                  <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                    <span className="text-white font-bold text-base sm:text-lg">G</span>
                  </div>
                }
                status={googleClassroomStatus}
                delay={0.1}
                height="100px sm:120px"
                onClick={() => { 
                  setActivePanel('calendar');
                  navigate('/dashboard/google-classroom');
                }}
              />

              {/* User Profile & Notifications + Notes/Documents Icons */}
                <div className="backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20 relative glassmorphism transform-gpu will-change-transform transition-all duration-300 ease-out h-[88px]" style={{
                  backgroundColor: '#FFFFFFE6',
                  boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.7), inset 2px 2px 4px rgba(0, 0, 0, 0.05)'
                }}>
                                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-4">
                      {/* Bell Icon */}
                      <div className="relative flex flex-col items-center">
                        <button onClick={() => setActivePanel('notifications')} className={`relative cursor-pointer group rounded-xl p-3 border transition-all duration-200 ${
                          activePanel === 'notifications' 
                            ? 'bg-blue-100 border-blue-300 text-blue-600' 
                            : 'border-white/80 text-gray-600 hover:text-gray-800'
                        }`} style={{
                          backgroundColor: activePanel === 'notifications' ? undefined : '#FFFFFFE6',
                          boxShadow: activePanel === 'notifications' 
                            ? 'inset 4px 4px 8px rgba(0, 0, 0, 0.1), inset -4px -4px 8px rgba(255, 255, 255, 0.7)'
                            : '4px 4px 8px rgba(0, 0, 0, 0.1), -4px -4px 8px rgba(255, 255, 255, 0.7)'
                        }}>
                          <Bell className={`w-6 h-6 transition-colors ${
                            activePanel === 'notifications' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
                          }`} />
                          {instructorNotifications.length > 0 && activePanel !== 'notifications' && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"></div>
                          )}
                        </button>
                      </div>
                      {/* Notes Icon */}
                      <div className="relative flex flex-col items-center">
                        <button onClick={() => setActivePanel('notes')} className={`relative cursor-pointer group rounded-lg sm:rounded-xl p-2 sm:p-3 border transition-all duration-200 ${
                          activePanel === 'notes' 
                            ? 'bg-yellow-100 border-yellow-300 text-yellow-600' 
                            : 'border-white/80 text-gray-600 hover:text-gray-800'
                        }`} style={{
                          backgroundColor: activePanel === 'notes' ? undefined : '#FFFFFFE6',
                          boxShadow: activePanel === 'notes' 
                            ? 'inset 4px 4px 8px rgba(0, 0, 0, 0.1), inset -4px -4px 8px rgba(255, 255, 255, 0.7)'
                            : '4px 4px 8px rgba(0, 0, 0, 0.1), -4px -4px 8px rgba(255, 255, 255, 0.7)'
                        }}>
                          <LuNotebookPen className={`w-6 h-6 transition-colors ${
                            activePanel === 'notes' ? 'text-yellow-600' : 'text-gray-600 hover:text-gray-800'
                          }`} />
                        </button>
                      </div>
                      {/* Documents Icon */}
                      <div className="relative flex flex-col items-center">
                        <button onClick={() => setActivePanel('documents')} className={`relative cursor-pointer group rounded-xl p-3 border transition-all duration-200 ${
                          activePanel === 'documents' 
                            ? 'bg-red-100 border-red-300 text-red-600' 
                            : 'border-white/80 text-gray-600 hover:text-gray-800'
                        }`} style={{
                          backgroundColor: activePanel === 'documents' ? undefined : '#FFFFFFE6',
                          boxShadow: activePanel === 'documents' 
                            ? 'inset 4px 4px 8px rgba(0, 0, 0, 0.1), inset -4px -4px 8px rgba(255, 255, 255, 0.7)'
                            : '4px 4px 8px rgba(0, 0, 0, 0.1), -4px -4px 8px rgba(255, 255, 255, 0.7)'
                        }}>
                          <IoDocuments className={`w-6 h-6 transition-colors ${
                            activePanel === 'documents' ? 'text-red-600' : 'text-gray-600 hover:text-gray-800'
                          }`} />
                        </button>
                      </div>
                      {/* Calendar Icon */}
                      <div className="relative flex flex-col items-center">
                        <button onClick={() => setActivePanel('calendar')} className={`relative cursor-pointer group rounded-xl p-3 border transition-all duration-200 ${
                          activePanel === 'calendar' 
                            ? 'bg-green-100 border-green-300 text-green-600' 
                            : 'border-white/80 text-gray-600 hover:text-gray-800'
                        }`} style={{
                          backgroundColor: activePanel === 'calendar' ? undefined : '#FFFFFFE6',
                          boxShadow: activePanel === 'calendar' 
                            ? 'inset 4px 4px 8px rgba(0, 0, 0, 0.1), inset -4px -4px 8px rgba(255, 255, 255, 0.7)'
                            : '4px 4px 8px rgba(0, 0, 0, 0.1), -4px -4px 8px rgba(255, 255, 255, 0.7)'
                        }}>
                          <Calendar className={`w-6 h-6 transition-colors ${
                            activePanel === 'calendar' ? 'text-green-600' : 'text-gray-600 hover:text-gray-800'
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>
              </div>



              {/* Unified panel container controlled by activePanel */}
              <div className="backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-xl border border-white/20 relative glassmorphism transform-gpu will-change-transform transition-all duration-300 ease-out mt-4 sm:mt-6 lg:mt-8 h-[250px] sm:h-[280px] md:h-[300px] overflow-y-auto" style={{
                backgroundColor: '#FFFFFFE6',
                boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.7), inset 2px 2px 4px rgba(0, 0, 0, 0.05)'
              }}>
                {activePanel === 'notifications' && (
                  <div className="h-full overflow-y-auto">
                    <div className="flex items-center justify-between mb-3 px-3 pt-3">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                      </div>
                      {!showNotificationForm ? (
                        <button
                          onClick={() => setShowNotificationForm(true)}
                          className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                          style={{
                            boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.2), -2px -2px 4px rgba(255, 255, 255, 0.1)'
                          }}
                          aria-label="Add"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowNotificationForm(false)}
                          className="p-2 rounded-md text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200"
                          style={{
                            boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.7)'
                          }}
                          aria-label="Close"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {!showNotificationForm ? (
                      <div className="py-1 h-[220px] overflow-y-auto pr-1 px-3 pb-3">
                        {instructorNotifications.length === 0 ? (
                          <p className="text-gray-500 text-sm">No notifications</p>
                        ) : (
                          <div className="space-y-1">
                            {instructorNotifications.map(n => (
                              <div 
                                key={n.id} 
                                className="bg-blue-50 rounded p-2.5"
                                style={{
                                  boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.08), inset -2px -2px 4px rgba(255, 255, 255, 0.5)'
                                }}
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-800 leading-tight">{n.title || 'Untitled'}</p>
                                    <p className="text-xs text-gray-600 mt-0.5 break-words leading-snug whitespace-normal">{n.message}</p>
                                  </div>
                                  <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
                                    <span className="text-[8px] text-gray-500 whitespace-nowrap">
                                      {new Date(n.created_at).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-0.5 flex items-center gap-0.5 flex-wrap">
                                  <span 
                                    className="text-[7px] px-1 py-0.5 rounded-full bg-gray-200 text-gray-700"
                                    style={{
                                      boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.1), inset -1px -1px 2px rgba(255, 255, 255, 0.7)'
                                    }}
                                  >
                                    {n.severity}
                                  </span>
                                  {n.audience && (
                                    <span 
                                      className="text-[7px] px-1 py-0.5 rounded-full bg-gray-200 text-gray-700"
                                      style={{
                                        boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.1), inset -1px -1px 2px rgba(255, 255, 255, 0.7)'
                                      }}
                                    >
                                      {n.audience === 'all' ? 'All' : n.audience}
                                    </span>
                                  )}
                                  {n.expires_at ? (
                                    <span 
                                      className="text-[7px] px-1 py-0.5 rounded-full bg-orange-100 text-orange-700"
                                      style={{
                                        boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.1), inset -1px -1px 2px rgba(255, 255, 255, 0.7)'
                                      }}
                                    >
                                      {(() => {
                                        const now = new Date();
                                        const expires = new Date(n.expires_at);
                                        const diff = expires.getTime() - now.getTime();
                                        if (diff <= 0) return 'Expired';
                                        const hours = Math.floor(diff / (1000 * 60 * 60));
                                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                        if (hours > 0) return `${hours}h ${minutes}m`;
                                        return `${minutes}m`;
                                      })()}
                                    </span>
                                  ) : (
                                    <span 
                                      className="text-[7px] px-1 py-0.5 rounded-full bg-gray-100 text-gray-600"
                                      style={{
                                        boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.1), inset -1px -1px 2px rgba(255, 255, 255, 0.7)'
                                      }}
                                    >
                                      permanent
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-[252px] overflow-y-auto pr-1 px-3 pb-3">
                        <div className="space-y-1">
                        {/* Title + Duration row */}
                        <div className="grid grid-cols-2 gap-1">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-0">Title *</label>
                            <input
                              type="text"
                              value={notificationForm.title}
                              onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                              className="w-full px-2 py-0.5 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-500 text-xs"
                              style={{
                                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.7)'
                              }}
                              placeholder="Enter notification title"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-0">Duration</label>
                            <select
                              value={`${notificationForm.timeInterval === 'none' ? 'none' : notificationForm.timeValue + (notificationForm.timeInterval === 'hours' ? 'h' : notificationForm.timeInterval === 'days' ? 'd' : notificationForm.timeInterval === 'weeks' ? 'w' : 'm')}`}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === 'none') return setNotificationForm(prev => ({ ...prev, timeInterval: 'none', timeValue: 1 }));
                                const n = parseInt(v);
                                if (v.endsWith('h')) return setNotificationForm(prev => ({ ...prev, timeInterval: 'hours', timeValue: n }));
                                if (v.endsWith('d')) return setNotificationForm(prev => ({ ...prev, timeInterval: 'days', timeValue: n }));
                                if (v.endsWith('w')) return setNotificationForm(prev => ({ ...prev, timeInterval: 'weeks', timeValue: n }));
                                if (v.endsWith('m')) return setNotificationForm(prev => ({ ...prev, timeInterval: 'months', timeValue: n }));
                              }}
                              className="w-full px-2 py-0.5 border border-gray-300 rounded-lg bg-white text-black text-xs"
                              style={{
                                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.7)'
                              }}
                            >
                              <option value="none">Never</option>
                              <option value="1h">1h</option>
                              <option value="3h">3h</option>
                              <option value="6h">6h</option>
                              <option value="12h">12h</option>
                              <option value="1d">1d</option>
                              <option value="3d">3d</option>
                              <option value="1w">1w</option>
                            </select>
                          </div>
                        </div>

                        {/* Message */}
                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 mb-0">Message *</label>
                          <textarea
                            value={notificationForm.message}
                            onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                            rows={2}
                            className="w-full px-2 py-0.5 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-500 text-xs resize-none"
                            style={{
                              boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.7)'
                            }}
                            placeholder="Enter notification message..."
                            required
                          />
                        </div>

                        {/* Severity & Audience */}
                        <div className="grid grid-cols-2 gap-1 pt-0">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-0">Severity *</label>
                            <select
                              value={notificationForm.severity}
                              onChange={(e) => setNotificationForm(prev => ({ ...prev, severity: e.target.value as NotificationSeverity }))}
                              className="w-full px-2 py-0.5 border border-gray-300 rounded-lg bg-white text-black text-xs"
                              style={{
                                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.7)'
                              }}
                              required
                            >
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
                            <label className="block text-[11px] font-medium text-gray-700 mb-0">Audience *</label>
                            <select
                              value={notificationForm.audience}
                              onChange={(e) => setNotificationForm(prev => ({ ...prev, audience: e.target.value }))}
                              className="w-full px-2 py-0.5 border border-gray-300 rounded-lg bg-white text-black text-xs"
                              style={{
                                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.1), inset -2px -2px 4px rgba(255, 255, 255, 0.7)'
                              }}
                              required
                            >
                              <option value="student">Students</option>
                            </select>
                          </div>
                        </div>

                        {/* Send button full width */}
                        <div className="pt-3">
                          <button
                            onClick={handleCreateNotification}
                            disabled={creatingNotification}
                            className={`w-full px-4 py-2 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors duration-200 ${
                              creatingNotification ? 'bg-blue-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                            style={{
                              boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.2), -2px -2px 4px rgba(255, 255, 255, 0.1)'
                            }}
                          >
                            {creatingNotification ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Bell className="w-4 h-4" />
                            )}
                            {creatingNotification ? 'Sending...' : 'Send Notification'}
                          </button>
                        </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activePanel === 'notes' && (
                  <div>
                    <h3 className="font-bold text-gray-700 flex items-center mb-2"><StickyNote className="w-4 h-4 mr-2 text-yellow-500" /> Personal Notes</h3>
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
                          if (inserted) {
                            setPersonalNotes(prev => [inserted, ...prev]);
                          }
                          input.value = '';
                        } catch (err) {
                          console.error('Failed to add note:', err);
                        }
                      }}
                      className="flex items-center gap-2 mb-3"
                    >
                      <input
                        type="text"
                        name="note"
                        placeholder="Type a new note and press Enter..."
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white/70 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
                      />
                      <button type="submit" className="px-3 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-sm">Add</button>
                    </form>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {personalNotes.map((note) => (
                        <li key={note.id} className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                            {editingNoteId === note.id ? (
                              <input
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white/70 focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
                              />
                            ) : (
                              <span>{note.content}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {editingNoteId === note.id ? (
                              <>
                                <button
                                  className="px-2 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600"
                                  onClick={async () => {
                                    const newText = editingContent.trim();
                                    if (!newText) return;
                                    try {
                                      const { error } = await supabase
                                        .from('personal_notes')
                                        .update({ content: newText })
                                        .eq('id', note.id)
                                        .eq('user_id', user?.id || '');
                                      if (error) throw error;
                                      setPersonalNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: newText } : n));
                                      setEditingNoteId(null);
                                      setEditingContent('');
                                    } catch (err) {
                                      console.error('Failed to update note:', err);
                                    }
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  onClick={() => { setEditingNoteId(null); setEditingContent(''); }}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                  onClick={() => { setEditingNoteId(note.id); setEditingContent(note.content); }}
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
                                        .eq('id', note.id)
                                        .eq('user_id', user?.id || '');
                                      if (error) throw error;
                                      setPersonalNotes(prev => prev.filter(n => n.id !== note.id));
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
                {activePanel === 'documents' && (
                  <div className="flex flex-col h-full">


                    <h3 className="font-bold text-gray-700 flex items-center mb-2 shrink-0">
                      <IoDocuments className="w-4 h-4 mr-2 text-red-500" /> 
                      School Documents
                    </h3>
                   
                    
                    {/* Search and Filter Bar - Horizontal Layout */}
                    <div className="mb-3 flex gap-3 shrink-0">
                      {/* Search Bar */}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Search documents..."
                          value={documentSearchQuery}
                          onChange={(e) => setDocumentSearchQuery(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white/80"
                        />
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      
                      {/* Filter Dropdown */}
                      <div className="flex-shrink-0">
                        <select
                          value={documentTypeFilter}
                          onChange={(e) => setDocumentTypeFilter(e.target.value as 'all' | 'presentation' | 'document' | 'pdf' | 'spreadsheet')}
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white/80 min-w-[140px]"
                        >
                          <option value="all">All Types</option>
                          <option value="presentation">📊 Presentations</option>
                          <option value="document">📝 Documents</option>
                          <option value="pdf">📄 PDFs</option>
                          <option value="spreadsheet">📈 Spreadsheets</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Add Document Button */}
                    <div className="mb-2 shrink-0">
                      <button
                        onClick={() => setShowAddDocument(true)}
                        className="w-full px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Document
                      </button>
                    </div>

                    {/* Add Document Modal */}
                    {showAddDocument && (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-4 w-full max-w-sm mx-3">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-800">Add New Document</h3>
                            <button
                              onClick={() => setShowAddDocument(false)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Upload File
                              </label>
                              <input
                                type="file"
                                id="file-upload"
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    console.log('File selected:', file.name, file.size);
                                    // Store the selected file for upload
                                    setSelectedFile(file);
                                  }
                                }}
                                className="hidden"
                              />
                              <label 
                                htmlFor="file-upload"
                                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-red-400 transition-colors cursor-pointer block min-h-[140px] flex flex-col items-center justify-center"
                              >
                                <svg className="w-7 h-7 text-gray-400 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium text-red-500">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-[11px] text-gray-500 mt-1">PDF, DOC, PPT, XLS up to 10MB</p>
                                {selectedFile && (
                                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                                    <p className="text-xs text-green-700 font-medium">Selected: {selectedFile.name}</p>
                                    <p className="text-[11px] text-green-600">Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                  </div>
                                )}
                              </label>
                            </div>
                          </div>
                          
                          <div className="flex gap-2.5 mt-4">
                            <button
                              onClick={() => {
                                setShowAddDocument(false);
                                setSelectedFile(null);
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async (event) => {
                                if (selectedFile) {
                                  if (!user?.id) {
                                    alert('You must be signed in to upload documents.');
                                    return;
                                  }
                                  try {
                                    // Show loading state
                                    const button = event.currentTarget as HTMLButtonElement;
                                    button.textContent = 'Uploading...';
                                    button.disabled = true;
                                    
                                    // Real upload to Google Drive
                                    const uploaded = await googleDriveService.uploadFile(user.id, {
                                      file: selectedFile,
                                    });

                                    // Refresh list from Drive to ensure metadata/links are correct
                                    const driveFiles = await googleDriveService.getFiles(user.id);
                                    const schoolFiles = driveFiles
                                      .filter(file => {
                                        if (file.isFolder) return false;
                                        const mimeType = file.mimeType?.toLowerCase() || '';
                                        const fileName = file.name?.toLowerCase() || '';
                                        const isSchoolDocument = 
                                          mimeType.includes('pdf') ||
                                          mimeType.includes('presentation') ||
                                          mimeType.includes('document') ||
                                          mimeType.includes('spreadsheet') ||
                                          mimeType.includes('image') ||
                                          mimeType.includes('text/plain') ||
                                          mimeType.includes('application/vnd.openxmlformats-officedocument') ||
                                          mimeType.includes('application/vnd.ms-') ||
                                          fileName.includes('.ppt') || fileName.includes('.pptx') ||
                                          fileName.includes('.doc') || fileName.includes('.docx') ||
                                          fileName.includes('.xls') || fileName.includes('.xlsx') ||
                                          fileName.includes('.pdf') ||
                                          fileName.includes('.txt') ||
                                          fileName.includes('class') || fileName.includes('lesson') || fileName.includes('lecture') ||
                                          fileName.includes('assignment') || fileName.includes('homework') || fileName.includes('quiz') ||
                                          fileName.includes('syllabus') || fileName.includes('curriculum') || fileName.includes('notes');
                                        return isSchoolDocument;
                                      })
                                      .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
                                      .slice(0, 15);

                                    setDocuments(schoolFiles);

                                    alert(`Document "${uploaded.name}" uploaded successfully!`);
                                    setShowAddDocument(false);
                                    setSelectedFile(null);
                                  } catch (error) {
                                    console.error('Upload failed:', error);
                                    alert('Upload failed. Please try again.');
                                  }
                                } else {
                                  alert('Please select a file to upload');
                                }
                              }}
                              disabled={!selectedFile}
                              className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                                selectedFile 
                                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Upload Document
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Documents List */}
                    <div className="space-y-3 pr-2 flex-1 overflow-y-auto">
                      {documentsLoading ? (
                        <div className="text-center py-6">
                          <div className="text-gray-400 mb-2">
                            <div className="w-12 h-12 mx-auto border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                          </div>
                          <p className="text-gray-500 text-sm">Loading Google Drive documents...</p>
                        </div>
                      ) : documentsError ? (
                        <div className="text-center py-6">
                          <div className="text-red-400 mb-2">
                            <IoDocuments className="w-12 h-12 mx-auto" />
                          </div>
                          <p className="text-red-500 text-sm font-medium">Error loading documents</p>
                          <p className="text-red-400 text-xs mt-1">{documentsError}</p>
                          <div className="mt-3 space-y-2">
                            {documentsError.includes('Token expired') ? (
                              <button 
                                onClick={() => {
                                  // Clear expired token and redirect to reconnect
                                  localStorage.removeItem(`google_classroom_token_${user?.id}`);
                                  setGoogleClassroomStatus('disconnected');
                                  alert('Please reconnect to Google Classroom to access your documents.');
                                  navigate('/dashboard/google-classroom');
                                }}
                                className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                              >
                                Reconnect to Google Classroom
                              </button>
                            ) : (
                              <button 
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200 transition-colors"
                              >
                                Try Again
                              </button>
                            )}
                          </div>
                        </div>
                      ) : documents.length === 0 ? (
                        <div className="py-3">
                          
                          {googleClassroomStatus !== 'connected' && (
                            <button 
                              onClick={() => navigate('/dashboard/google-classroom')}
                              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Connect to Google Classroom
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Documents count indicator */}
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-2 px-1">
                            <span data-document-count>Showing {documents.length} school documents</span>
                            <span className="text-gray-400">Scroll for more</span>
                          </div>
                          
                          {/* Documents list */}
                          <div className="space-y-2">
                            {(() => {
                              // Apply search and filter
                              let filteredDocs = documents;
                              
                              // Apply type filter
                              if (documentTypeFilter !== 'all') {
                                filteredDocs = filteredDocs.filter(doc => {
                                  const mimeType = doc.mimeType?.toLowerCase() || '';
                                  const fileName = doc.name?.toLowerCase() || '';
                                  
                                  switch (documentTypeFilter) {
                                    case 'presentation':
                                      return mimeType.includes('presentation') || 
                                             fileName.includes('.ppt') || 
                                             fileName.includes('.pptx');
                                    case 'document':
                                      return mimeType.includes('document') || 
                                             fileName.includes('.doc') || 
                                             fileName.includes('.docx');
                                    case 'pdf':
                                      return mimeType.includes('pdf') || 
                                             fileName.includes('.pdf');
                                    case 'spreadsheet':
                                      return mimeType.includes('spreadsheet') || 
                                             fileName.includes('.xls') || 
                                             fileName.includes('.xlsx');
                                    default:
                                      return true;
                                  }
                                });
                              }
                              
                              // Apply search query
                              if (documentSearchQuery.trim()) {
                                filteredDocs = filteredDocs.filter(doc =>
                                  doc.name.toLowerCase().includes(documentSearchQuery.toLowerCase())
                                );
                              }
                              
                              // Update the count to show filtered results
                              const countElement = document.querySelector('[data-document-count]');
                              if (countElement) {
                                countElement.textContent = `Showing ${filteredDocs.length} of ${documents.length} school documents`;
                              }
                              
                              return filteredDocs.length === 0 ? (
                                <div className="text-center py-4">
                                  <p className="text-gray-500 text-sm">
                                    {documentSearchQuery.trim() 
                                      ? `No documents found matching "${documentSearchQuery}"`
                                      : 'No documents match the selected filter'}
                                  </p>
                                </div>
                              ) : (
                                filteredDocs.map((document) => {
                                  const fileSize = document.size ? `${(parseInt(document.size) / 1024 / 1024).toFixed(1)} MB` : 'Unknown size';
                                  const modifiedDate = new Date(document.modifiedTime).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  });
                                  
                                  return (
                                    <div key={document.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div>
                                        <p className="font-medium text-sm text-gray-700">{document.name}</p>
                                        <p className="text-xs text-gray-500">{fileSize} • {modifiedDate}</p>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <a 
                                          href={document.webViewLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                                          title="Open in Google Drive"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                        <button 
                                          onClick={() => handleDownloadDocument(document.id)} 
                                          className="text-gray-400 hover:text-green-600 transition-colors p-1.5 rounded-lg hover:bg-green-50"
                                          title="Download"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteDocument(document.id)} 
                                          className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              );
                            })()}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {activePanel === 'calendar' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-700 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h3>
                      <div className="flex space-x-1">
                        <button 
                          onClick={handlePreviousMonth}
                          className="p-1 hover:bg-gray-100/50 backdrop-blur-sm rounded border border-white/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button 
                          onClick={handleNextMonth}
                          className="p-1 hover:bg-gray-100/50 backdrop-blur-sm rounded border border-white/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                        <div key={day} className="text-xs font-medium text-gray-500 py-1">{day}</div>
                      ))}
                      {memoizedCalendarDates}
                    </div>
                  </div>
                )}
              </div>

              {/* Registrar Grade Edit Confirmation Card - placed under the unified panel */}
              <div className="backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl border border-white/20 relative glassmorphism transform-gpu will-change-transform transition-all duration-300 ease-out mt-2 sm:mt-3 h-[250px] sm:h-[280px] md:h-[310px] overflow-y-auto" style={{
                backgroundColor: '#FFFFFFE6',
                boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.7), inset 2px 2px 4px rgba(0, 0, 0, 0.05)'
              }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <h3 className="font-bold text-gray-700 text-sm sm:text-base">Grade Edit Requests</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full self-start sm:self-auto">
                    {gradeEditRequests.length} request{gradeEditRequests.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {gradeEditRequests.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="text-gray-400 mb-2">
                      <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500">No grade edit requests</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {gradeEditRequests.map((request) => (
                      <div 
                        key={request.id}
                        onClick={() => {
                          if (request.edit_status === 'granted') {
                            navigate(`/dashboard/class-management?studentId=${request.student_id}&subjectId=${request.subject_id}`);
                          }
                        }}
                        className={`p-2 sm:p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                          request.edit_status === 'granted' 
                            ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
                            : request.edit_status === 'denied'
                            ? 'bg-red-50 border-red-200 hover:bg-red-100'
                            : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-2 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <span className="font-medium text-xs sm:text-sm text-gray-800 break-words">
                                {request.student_name || 'Unknown Student'}
                              </span>
                              {request.edit_status === 'granted' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 self-start">
                                  <CheckCircle className="w-3 h-3 flex-shrink-0" /> Approved
                                </span>
                              )}
                              {request.edit_status === 'denied' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 self-start">
                                  <XCircle className="w-3 h-3 flex-shrink-0" /> Denied
                                </span>
                              )}
                              {request.edit_status === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 self-start">
                                  <Clock className="w-3 h-3 flex-shrink-0" /> Pending
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="break-words">Subject: {request.course_code || 'Unknown'} - {request.course_name || 'Unknown'}</div>
                              <div className="break-words">Section: {request.section || 'N/A'} • Year: {request.year_level || 'N/A'}</div>
                              {request.edit_reason && (
                                <div className="text-gray-500 italic break-words">"{request.edit_reason}"</div>
                              )}
                            </div>
                          </div>
                          {request.edit_status === 'granted' && (
                            <div className="flex-shrink-0 sm:ml-2 self-end sm:self-start">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {request.created_at ? new Date(request.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Unknown date'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Remove old Personal Notes and Recent Documents sections from sidebar */}
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
        <Route path="/profile" element={<TeacherSettings />} />
        <Route path="/google-classroom" element={<StudentGoogleClassroom />} />
      </Routes>
    </DashboardLayout>  
  );
};

export default TeacherDashboard; 
