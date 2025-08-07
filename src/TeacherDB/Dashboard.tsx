import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import ClassManagement from './ClassManagement';
import GradeInput from './GradeInput';
import TeacherSettings from './Settings';
import { BookOpen, Search, Bell, Download, Trash2, FileText, StickyNote, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import userAvatar from '../../img/user-avatar.png';
import { LuNotebookPen } from 'react-icons/lu';
import { IoDocuments } from 'react-icons/io5';

interface Document {
  id: string;
  name: string;
  size: string;
  date: string;
  type: string;
}

interface ClassData {
  id: string;
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

const TeacherDashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Performance optimized state management with useReducer for complex state
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [documents, setDocuments] = useState<Document[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [notifications] = useState(3);
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  
  // Loading states for better UX
  const [isLoading, setIsLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  
  // Search states with debouncing - optimized with useMemo
  const [searchResults, setSearchResults] = useState<{
    classes: ClassData[];
    documents: Document[];
    notes: string[];
    students: StudentData[];
  }>({ classes: [], documents: [], notes: [], students: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Personal notes data - memoized for performance
  const personalNotes = useMemo(() => [
    "Check Official IELTS Practice Materials Volume 2",
    "C1 English (Advanced) - prepare new materials",
    "Business English vocabulary study, write out new examples",
    "Prepare materials for the group class...."
  ], []);

  // Cache states with longer duration for slow connections
  const [profileCache, setProfileCache] = useState<{ 
    pictureUrl: string | null; 
    timestamp: number 
  } | null>(null);
  const [classesCache, setClassesCache] = useState<{ data: ClassData[]; timestamp: number } | null>(null);
  const [documentsCache, setDocumentsCache] = useState<{ data: Document[]; timestamp: number } | null>(null);

  // Extended cache duration for slow connections (10 minutes)
  const CACHE_DURATION = 10 * 60 * 1000;

  // Memoized cache validation - optimized with useMemo
  const isCacheValid = useMemo(() => (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  }, []);



  // Optimized profile fetching with error handling
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
        
        let pictureUrl = null;
        if (data?.profile_picture_url) {
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from('avatar')
            .createSignedUrl(data.profile_picture_url, 60 * 60);
          if (!signedUrlError && signedUrlData?.signedUrl) {
            pictureUrl = signedUrlData.signedUrl;
          }
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

  // Optimized classes fetching with loading state
  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.id) return;
      
      // Check cache first
      if (classesCache && isCacheValid(classesCache.timestamp)) {
        setClasses(classesCache.data);
        setClassesLoading(false);
        return;
      }

      setClassesLoading(true);
      try {
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
        
        if (!error && data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const classData = data.map((item: any) => ({
            id: item.id,
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
          setClassesCache({ data: classData, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setClasses([]);
      } finally {
        setClassesLoading(false);
      }
    };
    fetchClasses();
  }, [user?.id, classesCache, isCacheValid]);

  // Optimized students fetching with loading state
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.id) {
        setStudentsLoading(false);
        return;
      }
      
      setStudentsLoading(true);
      try {
        const { data: teacherSubjects, error: teacherSubjectsError } = await supabase
          .from('teacher_subjects')
          .select('subject_id')
          .eq('teacher_id', user.id)
          .eq('is_active', true);
        
        if (teacherSubjectsError) {
          console.error('Error fetching teacher subjects:', teacherSubjectsError);
          setStudents([]);
          setStudentsLoading(false);
          return;
        }
        
        if (!teacherSubjects || teacherSubjects.length === 0) {
          setStudents([]);
          setStudentsLoading(false);
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
          setStudentsLoading(false);
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
            setStudentsLoading(false);
            return;
          }
          
          const { data: subjectDetails, error: subjectError } = await supabase
            .from('courses')
            .select('id, name, code')
            .in('id', subjectIds);
          
          if (subjectError) {
            console.error('Error fetching course details:', subjectError);
            setStudents([]);
            setStudentsLoading(false);
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
      } finally {
        setStudentsLoading(false);
      }
    };
    
    fetchStudents();
  }, [user?.id]);

  // Optimized documents with caching
  useEffect(() => {
    if (documentsCache && isCacheValid(documentsCache.timestamp)) {
      setDocuments(documentsCache.data);
      return;
    }

    const mockDocuments: Document[] = [
      {
        id: '1',
        name: 'C2_Proficient.pdf',
        size: '313 KB',
        date: '01 Jul. 2023',
        type: 'pdf'
      },
      {
        id: '2',
        name: 'Computing SB 1-3.pdf',
        size: '478 KB',
        date: '03 Jul, 2023',
        type: 'pdf'
      },
      {
        id: '3',
        name: 'IELTS 15 Academic.pdf',
        size: '1.2 MB',
        date: '05 Jul, 2023',
        type: 'pdf'
      }
    ];
    setDocuments(mockDocuments);
    setDocumentsCache({ data: mockDocuments, timestamp: Date.now() });
  }, [documentsCache, isCacheValid]);

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
          doc.size.toLowerCase().includes(lowerQuery) ||
          doc.date.toLowerCase().includes(lowerQuery)
        );

        // Search in personal notes - memoized for performance
        const filteredNotes = personalNotes.filter(note =>
          note.toLowerCase().includes(lowerQuery)
        );

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

  // Memoized navigation handlers
  const handleClassClick = useCallback((classId: string) => {
    navigate(`/dashboard/class-management/${classId}`);
  }, [navigate]);

  const handleGetStarted = useCallback(() => {
    navigate('/dashboard/class-management');
  }, [navigate]);

  // Memoized current day and time calculation - optimized with useMemo
  const getCurrentDayAndTime = useMemo(() => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    return { currentDay, currentTime };
  }, []);

  // Memoized class status calculation - optimized with useMemo
  const getClassStatus = useMemo(() => (classDay: string, classTime: string) => {
    const { currentDay, currentTime } = getCurrentDayAndTime;
    
    const normalizeDay = (day: string) => {
      const dayMap: { [key: string]: string } = {
        'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 'Th': 'Thursday', 
        'F': 'Friday', 'S': 'Saturday', 'Su': 'Sunday',
        'MON': 'Monday', 'TUE': 'Tuesday', 'WED': 'Wednesday', 'THU': 'Thursday',
        'FRI': 'Friday', 'SAT': 'Saturday', 'SUN': 'Sunday'
      };
      return dayMap[day] || day;
    };

    const normalizedClassDay = normalizeDay(classDay);
    const normalizedCurrentDay = normalizeDay(currentDay);

    if (normalizedClassDay !== normalizedCurrentDay) {
      const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const classDayIndex = daysOrder.indexOf(normalizedClassDay);
      const currentDayIndex = daysOrder.indexOf(normalizedCurrentDay);
      
      if (classDayIndex > currentDayIndex) {
        return 'upcoming';
      } else {
        return 'past';
      }
    }

    if (!classTime) return 'today';
    
    const parseTime = (timeStr: string) => {
      const time = timeStr.replace(/\s*(AM|PM)/i, '').trim();
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const classMinutes = parseTime(classTime);
    const currentMinutes = parseTime(currentTime);
    
    const timeDiff = Math.abs(classMinutes - currentMinutes);
    
    if (timeDiff <= 30) {
      return 'current';
    } else if (classMinutes > currentMinutes) {
      return 'upcoming';
    } else {
      return 'past';
    }
  }, [getCurrentDayAndTime]);

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

  // Modal states
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Set initial loading state with reduced delay for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Reduced from 1000ms to 500ms for faster initial load
    return () => clearTimeout(timer);
  }, []);

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
        <div className="p-6 sm:p-8 max-w-7xl mx-auto transform-gpu">
          {/* Search Bar */}
          <div className="mb-6 contain-layout">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search classes, documents, notes, students..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300 ease-out bg-white shadow-inner transform-gpu will-change-transform shadow-lg hover:shadow-xl focus:shadow-2xl focus:shadow-blue-500/25"
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
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </form>
            
            {/* Search Results */}
            {showSearchResults && (
              <div className="mt-4 bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-700">
                    Search Results for "{searchQuery}"
                  </h3>
                  <button
                    onClick={clearSearch}
                    className="text-gray-400 hover:text-gray-600 text-sm"
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
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                          <BookOpen className="w-4 h-4 mr-2" />
                          Classes ({searchResults.classes.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {searchResults.classes.map((classItem) => (
                            <div
                              key={classItem.id}
                              onClick={() => handleClassClick(classItem.id)}
                              className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl p-3 flex items-center justify-between shadow-lg cursor-pointer hover:bg-white/80 transition-all duration-200"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                                  <BookOpen className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <h5 className="font-medium text-gray-700 text-sm">
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
                                    {document.size} • {document.date}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 contain-layout">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6 contain-layout">
              {/* Promotional Banner */}
              <div className="bg-gradient-to-r from-blue-600/90 to-purple-600/90 backdrop-blur-xl rounded-2xl p-6 text-white relative overflow-hidden border border-white/20 shadow-xl transform-gpu will-change-transform transition-all duration-500 ease-out">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">
                      Track Your Students' Progress Easier With St. Mary's College Portal
                    </h2>
                    
                    {/* Stats and Button in horizontal layout */}
                    <div className="flex items-center gap-4 mb-3">
                        {/* Get Started Button */}
                        <button 
                          onClick={handleGetStarted}
                          className="bg-teal-400/90 backdrop-blur-sm hover:bg-teal-500/90 text-white px-6 py-2 rounded-lg font-medium transition-colors border border-white/20 shadow-lg"
                        >
                          Get Started
                        </button>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                            <span className="text-sm text-blue-100">
                              {classesLoading ? 'Loading...' : `${classes.length} Subjects`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                            <span className="text-sm text-blue-100">
                              {studentsLoading ? 'Loading...' : `${students.length} Students`}
                            </span>
                          </div>
                        </div>
                      </div>
                  </div>
                  <div className="hidden md:block">
                    {/* Teacher Profile Picture */}
                    <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center overflow-hidden backdrop-blur-sm border border-white/20">
                      {profileLoading ? (
                        <div className="w-16 h-16 bg-white/30 rounded-full animate-pulse" />
                      ) : (
                        <img
                          src={profilePictureUrl || userAvatar}
                          alt="Teacher Profile"
                          className="w-28 h-28 object-cover shadow-lg rounded-full"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>



              {/* My Classes Section */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 transform-gpu will-change-transform transition-all duration-300 ease-out">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-bold text-gray-700 text-xl">My Classes</h3>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {classesLoading ? 'Loading...' : `(${classes.length} classes)`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">Current</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Upcoming</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-600">Today</span>
                    </div>
                  </div>
                </div>
                
                {classesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-48 bg-gray-200 rounded-xl"></div>
                      </div>
                    ))}
                  </div>
                                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedClasses}
                  </div>
                )}
                
                {!classesLoading && classes.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-6xl mb-4">📚</div>
                    <h4 className="text-gray-600 font-medium mb-2">No Classes Yet</h4>
                    <p className="text-gray-500 text-sm">Your assigned classes will appear here</p>
                  </div>
                )}
              </div>
            </div>

                      {/* Right Column - Sidebar */}
            <div className="lg:col-span-1 space-y-3 contain-layout">
              {/* Google Classroom Integration */}
              <div className="bg-gradient-to-r from-blue-500/90 to-purple-600/90 backdrop-blur-xl rounded-2xl py-6 px-4 shadow-xl border border-white/20 relative glassmorphism transform-gpu will-change-transform transition-all duration-300 ease-out">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Google Classroom</h3>
                      <p className="text-white/80 text-xs">Access and organize classwork easily</p>
                    </div>
                  </div>
                  <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition-colors flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-xs font-medium">Connect</span>
                  </button>
                </div>
              </div>

              {/* User Profile & Notifications + Notes/Documents Icons */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/20 relative glassmorphism transform-gpu will-change-transform transition-all duration-300 ease-out">
                                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-4">
                      {/* Bell Icon */}
                      <div className="relative flex flex-col items-center">
                        <button onClick={() => {
                          setShowNotesModal(false);
                          setShowDocumentsModal(false);
                          setShowCalendarModal(false);
                          setShowNotificationsModal(true);
                        }} className={`relative cursor-pointer group rounded-xl p-3 shadow-lg border transition-all duration-200 hover:shadow-xl ${
                          showNotificationsModal 
                            ? 'bg-blue-100 border-blue-300 shadow-blue-200' 
                            : 'bg-white/60 hover:bg-white/80 border-white/30'
                        }`}>
                          <Bell className={`w-6 h-6 transition-colors ${
                            showNotificationsModal ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
                          }`} />
                          {notifications > 0 && !showNotificationsModal && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"></div>
                          )}
                        </button>
                      </div>
                      {/* Notes Icon */}
                      <div className="relative flex flex-col items-center">
                        <button onClick={() => {
                          setShowDocumentsModal(false);
                          setShowCalendarModal(false);
                          setShowNotificationsModal(false);
                          setShowNotesModal(true);
                        }} className={`relative cursor-pointer group rounded-xl p-3 shadow-lg border transition-all duration-200 hover:shadow-xl ${
                          showNotesModal 
                            ? 'bg-yellow-100 border-yellow-300 shadow-yellow-200' 
                            : 'bg-white/60 hover:bg-white/80 border-white/30'
                        }`}>
                          <LuNotebookPen className={`w-6 h-6 transition-colors ${
                            showNotesModal ? 'text-yellow-600' : 'text-gray-600 hover:text-gray-800'
                          }`} />
                        </button>
                      </div>
                      {/* Documents Icon */}
                      <div className="relative flex flex-col items-center">
                        <button onClick={() => {
                          setShowNotesModal(false);
                          setShowCalendarModal(false);
                          setShowNotificationsModal(false);
                          setShowDocumentsModal(true);
                        }} className={`relative cursor-pointer group rounded-xl p-3 shadow-lg border transition-all duration-200 hover:shadow-xl ${
                          showDocumentsModal 
                            ? 'bg-red-100 border-red-300 shadow-red-200' 
                            : 'bg-white/60 hover:bg-white/80 border-white/30'
                        }`}>
                          <IoDocuments className={`w-6 h-6 transition-colors ${
                            showDocumentsModal ? 'text-red-600' : 'text-gray-600 hover:text-gray-800'
                          }`} />
                        </button>
                      </div>
                      {/* Calendar Icon */}
                      <div className="relative flex flex-col items-center">
                        <button onClick={() => {
                          setShowNotesModal(false);
                          setShowDocumentsModal(false);
                          setShowNotificationsModal(false);
                          setShowCalendarModal(true);
                        }} className={`relative cursor-pointer group rounded-xl p-3 shadow-lg border transition-all duration-200 hover:shadow-xl ${
                          showCalendarModal 
                            ? 'bg-green-100 border-green-300 shadow-green-200' 
                            : 'bg-white/60 hover:bg-white/80 border-white/30'
                        }`}>
                          <Calendar className={`w-6 h-6 transition-colors ${
                            showCalendarModal ? 'text-green-600' : 'text-gray-600 hover:text-gray-800'
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>
              </div>



              {/* Calendar */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 relative glassmorphism transform-gpu will-change-transform transition-all duration-300 ease-out">
                {/* Notifications Modal - Positioned in calendar area */}
                {showNotificationsModal && (
                  <div className="absolute z-[9999] top-0 left-0 right-0 bottom-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-4 glassmorphism">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-gray-700 flex items-center"><Bell className="w-4 h-4 mr-1 text-blue-500" /> Notifications</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-sm text-gray-700">New assignment submitted</p>
                            <p className="text-xs text-gray-500">Math 101 - John Doe submitted Assignment #3</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">2 min ago</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-sm text-gray-700">Class reminder</p>
                            <p className="text-xs text-gray-500">Physics 201 starts in 15 minutes</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">5 min ago</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <div>
                            <p className="font-medium text-sm text-gray-700">Grade update</p>
                            <p className="text-xs text-gray-500">Chemistry 101 grades have been updated</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">1 hour ago</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes Modal - Positioned in calendar area */}
                {showNotesModal && (
                  <div className="absolute z-[9999] top-0 left-0 right-0 bottom-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-4 glassmorphism">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-gray-700 flex items-center"><StickyNote className="w-4 h-4 mr-1 text-yellow-500" /> Personal Notes</h3>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {personalNotes.map((note, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Documents Modal - Positioned in calendar area */}
                {showDocumentsModal && (
                  <div className="absolute z-[9999] top-0 left-0 right-0 bottom-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-4 glassmorphism">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-gray-700 flex items-center"><FileText className="w-4 h-4 mr-1 text-red-500" /> Recent Documents</h3>
                    </div>
                    <div className="space-y-3">
                      {documents.map((document) => (
                        <div key={document.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm text-gray-700">{document.name}</p>
                            <p className="text-xs text-gray-500">{document.size} • {document.date}</p>
                          </div>
                          <button onClick={() => handleDownloadDocument(document.id)} className="text-gray-400 hover:text-gray-600">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calendar Modal - Positioned in calendar area */}
                {showCalendarModal && (
                  <div className="absolute z-[9999] top-0 left-0 right-0 bottom-0 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
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
                    
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                        <div key={day} className="text-xs font-medium text-gray-500 py-1">{day}</div>
                      ))}
                      
                      {/* Calendar dates */}
                      {calendarDates.map((date, index) => {
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
                      })}
                    </div>
                  </div>
                )}

                {/* Modal Tails - Positioned to point to specific icons */}
                {showNotesModal && (
                  <div className="absolute z-[9999] -top-3 left-1/4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white shadow-lg"></div>
                )}
                {showDocumentsModal && (
                  <div className="absolute z-[9999] -top-3 left-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white shadow-lg"></div>
                )}
                {showCalendarModal && (
                  <div className="absolute z-[9999] -top-3 left-3/4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white shadow-lg"></div>
                )}



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
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                    <div key={day} className="text-xs font-medium text-gray-500 py-1">{day}</div>
                  ))}
                  
                  {/* Calendar dates - optimized with memoization */}
                  {memoizedCalendarDates}
                </div>
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
        <Route path="/grade-input" element={<GradeInput />} />
        <Route path="/profile" element={<TeacherSettings />} />
      </Routes>
    </DashboardLayout>  
  );
};

export default TeacherDashboard; 
