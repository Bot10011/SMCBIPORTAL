import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import ClassManagement from './ClassManagement';
import GradeInput from './GradeInput';
import TeacherSettings from './Settings';
import { BookOpen, Search, Bell, ChevronDown, Download, Trash2, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import userAvatar from '../../img/user-avatar.png';

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
interface TeacherSubject {
  id: string;
  subject_id: string;
  day?: string;
  time?: string;
  year_level?: string;
  semester?: string;
  section?: string;
  teacher_id: string;
  course?: {
    name: string;
    code: string;
    units: number;
  };
}

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
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [documents, setDocuments] = useState<Document[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [notifications, setNotifications] = useState(3);
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  
  // Search states
  const [searchResults, setSearchResults] = useState<{
    classes: ClassData[];
    documents: Document[];
    notes: string[];
    students: StudentData[];
  }>({ classes: [], documents: [], notes: [], students: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Personal notes data
  const personalNotes = [
    "Check Official IELTS Practice Materials Volume 2",
    "C1 English (Advanced) - prepare new materials",
    "Business English vocabulary study, write out new examples",
    "Prepare materials for the group class...."
  ];

  // Cache states to prevent refetching
  const [profileCache, setProfileCache] = useState<{ 
    pictureUrl: string | null; 
    name: string; 
    timestamp: number 
  } | null>(null);
  const [classesCache, setClassesCache] = useState<{ data: ClassData[]; timestamp: number } | null>(null);
  const [documentsCache, setDocumentsCache] = useState<{ data: Document[]; timestamp: number } | null>(null);

  // Cache duration in milliseconds (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  // Check if cache is valid
  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  // Fetch teacher profile info (name, profile picture) with caching
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      // Check cache first
      if (profileCache && isCacheValid(profileCache.timestamp)) {
        setProfilePictureUrl(profileCache.pictureUrl);
        setTeacherName(profileCache.name);
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
        
        // Get teacher's full name
        const fullName = data?.first_name && data?.last_name 
          ? `${data.first_name} ${data.last_name}`
          : data?.first_name || data?.last_name || 'Unknown Teacher';
        
        setProfilePictureUrl(pictureUrl);
        setTeacherName(fullName);
        // Cache the result
        setProfileCache({ 
          pictureUrl, 
          name: fullName, 
          timestamp: Date.now() 
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfilePictureUrl(null);
        setTeacherName('Unknown Teacher');
        setProfileCache({ 
          pictureUrl: null, 
          name: 'Unknown Teacher', 
          timestamp: Date.now() 
        });
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id]);

  // Fetch teacher classes with caching
  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.id) return;
      
      // Check cache first
      if (classesCache && isCacheValid(classesCache.timestamp)) {
        setClasses(classesCache.data);
        return;
      }

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
          const classData = data.map((item: any) => ({
            id: item.id,
            name: `${item.course?.code || 'Unknown'} - ${item.course?.name || 'Unknown Course'}`,
            sections: 1, // Each teacher_subject record represents one section
            students: Math.floor(Math.random() * 30) + 10, // Mock student count
            icon: 'BookOpen',
            day: item.day,
            time: item.time,
            year_level: item.year_level,
            semester: item.semester,
            section: item.section,
            units: item.course?.units || 0
          }));
          setClasses(classData);
          // Cache the result
          setClassesCache({ data: classData, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setClasses([]);
      }
    };
    fetchClasses();
  }, [user?.id]);

  // Fetch enrolled students - ONLY for this teacher's assigned subjects
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.id) {
        console.log('No user ID, skipping student fetch');
        return;
      }
      
      console.log(`Fetching students for teacher ID: ${user.id}`);
      
      try {
        // Step 1: First verify this teacher has assigned subjects (simplified query)
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
          console.log(`Teacher ${user.id} has no assigned subjects`);
          setStudents([]);
          return;
        }
        
        const teacherSubjectIds = teacherSubjects.map(ts => ts.subject_id);
        console.log(`Teacher ${user.id} assigned subjects:`, teacherSubjectIds);
        
        // Step 2: Fetch students ONLY enrolled in this teacher's subjects
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
        
        console.log(`Found ${enrollments?.length || 0} enrollments for teacher ${user.id}`);
        
        if (enrollments && enrollments.length > 0) {
          // Get unique student IDs and subject IDs
          const studentIds = [...new Set(enrollments.map((e: Enrollment) => e.student_id))];
          const subjectIds = [...new Set(enrollments.map((e: Enrollment) => e.subject_id))];
          
          // Fetch student details
          const { data: studentProfiles, error: studentError } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name, email')
            .in('id', studentIds);
          
          if (studentError) {
            console.error('Error fetching student profiles:', studentError);
            setStudents([]);
            return;
          }
          
          // Fetch subject details
          const { data: subjectDetails, error: subjectError } = await supabase
            .from('courses')
            .select('id, name, code')
            .in('id', subjectIds);
          
          if (subjectError) {
            console.error('Error fetching course details:', subjectError);
            setStudents([]);
            return;
          }
          
          // Create lookup maps
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
          
          // Remove duplicate students based on student ID
          const uniqueStudents = studentData.filter((student, index, self) => 
            index === self.findIndex(s => s.id === student.id)
          );
          
          console.log(`Processed ${studentData.length} enrollments, ${uniqueStudents.length} unique students for teacher ${user.id}`);
          setStudents(uniqueStudents);
        } else {
          console.log(`No students found for teacher ${user.id}`);
          setStudents([]);
        }
      } catch (error) {
        console.error('Error in fetchStudents for teacher', user.id, ':', error);
        setStudents([]);
      }
    };
    
    fetchStudents();
  }, [user?.id]);

  // Mock documents data with caching
  useEffect(() => {
    // Check cache first
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
    // Cache the result
    setDocumentsCache({ data: mockDocuments, timestamp: Date.now() });
  }, []);

  // Listen for page visibility changes to refresh cache when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, check if cache is stale
        if (profileCache && !isCacheValid(profileCache.timestamp)) {
          setProfileCache(null);
        }
        if (classesCache && !isCacheValid(classesCache.timestamp)) {
          setClassesCache(null);
        }
        if (documentsCache && !isCacheValid(documentsCache.timestamp)) {
          setDocumentsCache(null);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [profileCache, classesCache, documentsCache]);

  // Search functionality
  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults({ classes: [], documents: [], notes: [], students: [] });
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase();

    console.log('🔍 Performing search for:', query);
    console.log('📊 Available data:');
    console.log('- Classes:', classes.length);
    console.log('- Documents:', documents.length);
    console.log('- Notes:', personalNotes.length);
    console.log('- Students:', students.length);

    // Search in classes
    const filteredClasses = classes.filter(classItem =>
      classItem.name.toLowerCase().includes(lowerQuery) ||
      classItem.sections.toString().includes(lowerQuery) ||
      classItem.students.toString().includes(lowerQuery)
    );

    // Search in documents
    const filteredDocuments = documents.filter(doc =>
      doc.name.toLowerCase().includes(lowerQuery) ||
      doc.size.toLowerCase().includes(lowerQuery) ||
      doc.date.toLowerCase().includes(lowerQuery)
    );

    // Search in personal notes
    const filteredNotes = personalNotes.filter(note =>
      note.toLowerCase().includes(lowerQuery)
    );

    // Search in students
    const filteredStudents = students.filter(student => {
      const matchesName = student.name.toLowerCase().includes(lowerQuery);
      const matchesEmail = student.email.toLowerCase().includes(lowerQuery);
      const matchesClass = student.class_name.toLowerCase().includes(lowerQuery);
      const matchesStatus = student.status.toLowerCase().includes(lowerQuery);
      
      console.log(`👤 Student "${student.name}" search results:`, {
        name: matchesName,
        email: matchesEmail,
        class: matchesClass,
        status: matchesStatus,
        query: lowerQuery
      });
      
      return matchesName || matchesEmail || matchesClass || matchesStatus;
    });

    console.log('🔍 Search results:');
    console.log('- Classes found:', filteredClasses.length);
    console.log('- Documents found:', filteredDocuments.length);
    console.log('- Notes found:', filteredNotes.length);
    console.log('- Students found:', filteredStudents.length);

    setSearchResults({
      classes: filteredClasses,
      documents: filteredDocuments,
      notes: filteredNotes,
      students: filteredStudents
    });
    setShowSearchResults(true);
    setIsSearching(false);
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      performSearch(query);
    } else {
      setShowSearchResults(false);
      setSearchResults({ classes: [], documents: [], notes: [], students: [] });
    }
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults({ classes: [], documents: [], notes: [], students: [] });
  };

  // Highlight search terms in text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-semibold">{part}</span>
      ) : part
    );
  };

  // Handle calendar navigation
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Handle document actions
  const handleDownloadDocument = (documentId: string) => {
    console.log('Downloading document:', documentId);
    // Implement actual download logic
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    console.log('Deleting document:', documentId);
  };

  // Handle class navigation
  const handleClassClick = (classId: string) => {
    navigate(`/dashboard/class-management/${classId}`);
  };

  // Handle get started button
  const handleGetStarted = () => {
    navigate('/dashboard/class-management');
  };

  // Handle notification click
  const handleNotificationClick = () => {
    setNotifications(0);
    console.log('Notifications clicked');
  };

  // Handle profile dropdown
  const handleProfileClick = () => {
    navigate('/dashboard/profile');
  };

  // Get current day and time for class status
  const getCurrentDayAndTime = () => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    return { currentDay, currentTime };
  };

  // Determine class status (current, upcoming, past, or today)
  const getClassStatus = (classDay: string, classTime: string) => {
    const { currentDay, currentTime } = getCurrentDayAndTime();
    
    // Normalize day names for comparison
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

    // If it's not today, determine if it's upcoming or past
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

    // If it's today, compare times
    if (!classTime) return 'today';
    
    // Convert time to comparable format (HH:MM)
    const parseTime = (timeStr: string) => {
      const time = timeStr.replace(/\s*(AM|PM)/i, '').trim();
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const classMinutes = parseTime(classTime);
    const currentMinutes = parseTime(currentTime);
    
    // Class is considered "current" if it's within 30 minutes before or after the scheduled time
    const timeDiff = Math.abs(classMinutes - currentMinutes);
    
    if (timeDiff <= 30) {
      return 'current';
    } else if (classMinutes > currentMinutes) {
      return 'upcoming';
    } else {
      return 'past';
    }
  };

  // Get status indicator styles
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'current':
        return {
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          icon: '🟢',
          label: 'Now'
        };
      case 'upcoming':
        return {
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
          icon: '⏰',
          label: 'Upcoming'
        };
      case 'today':
        return {
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          icon: '📅',
          label: 'Today'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          icon: '📚',
          label: 'Past'
        };
    }
  };

  // Generate calendar dates
  const getCalendarDates = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    
    // Adjust to start from Monday (1) instead of Sunday (0)
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday becomes 6, others become 0-5
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    const dates = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const calendarDates = getCalendarDates();

  return (
    <div className="flex flex-col h-full  min-h-screen">
      <div className="flex-1 overflow-auto">
        <div className="p-6 sm:p-8 max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="mb-6">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search classes, documents, notes..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Promotional Banner */}
              <div className="bg-gradient-to-r from-blue-600/90 to-purple-600/90 backdrop-blur-xl rounded-2xl p-6 text-white relative overflow-hidden border border-white/20 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">
                      Track Your Students' Progress Easier With St. Mary's College Portal
                    </h2>
                    <button 
                      onClick={handleGetStarted}
                      className="bg-teal-400/90 backdrop-blur-sm hover:bg-teal-500/90 text-white px-6 py-2 rounded-lg font-medium transition-colors border border-white/20 shadow-lg"
                    >
                      Get Started
                    </button>
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

              {/* Student Performance Graph */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="font-bold text-gray-700 text-lg mb-4">Student performance</h3>
                <div className="h-64 bg-gray-50/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  {/* Graph Placeholder */}
                  <div className="h-full flex items-end justify-between">
                    {[20, 45, 30, 60, 40, 80, 65, 90, 75, 85, 70, 73].map((value, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div 
                          className="bg-teal-500 rounded-t w-8 mb-2 relative shadow-lg cursor-pointer hover:bg-teal-600 transition-colors"
                          style={{ height: `${value}%` }}
                        >
                          {index === 6 && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600/90 backdrop-blur-sm text-white px-2 py-1 rounded text-xs border border-white/20 shadow-lg">
                              Average 73
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* My Classes Section */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-bold text-gray-700 text-lg">My Classes</h3>
                    <span className="text-sm text-gray-500">({classes.length} classes)</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">Current</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Upcoming</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-600">Today</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="text-gray-600">Past</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white z-20 shadow-sm">
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left py-3 px-4 font-bold text-gray-800 bg-white">Day</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-800 bg-white">Time</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-800 bg-white">Course</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-800 bg-white">Year Level</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-800 bg-white">Semester</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-800 bg-white">Section</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-800 bg-white">Units</th>
                          <th className="text-left py-3 px-4 font-bold text-gray-800 bg-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                      {classes
                        .sort((a, b) => {
                          // Sort by day first, then by time
                          const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                          const dayA = daysOrder.indexOf(a.day || '');
                          const dayB = daysOrder.indexOf(b.day || '');
                          
                          if (dayA !== dayB) {
                            return dayA - dayB;
                          }
                          
                          // If same day, sort by time
                          return (a.time || '').localeCompare(b.time || '');
                        })
                        .map((classItem) => {
                          const status = getClassStatus(classItem.day || '', classItem.time || '');
                          
                          return (
                            <tr 
                              key={classItem.id}
                              onClick={() => handleClassClick(classItem.id)}
                              className={`border-b border-gray-100 hover:bg-gray-100/80 cursor-pointer transition-colors bg-gray-50/60 ${
                                status === 'current' ? 'bg-green-100/80 border-l-4 border-l-green-500' :
                                status === 'upcoming' ? 'bg-blue-100/80 border-l-4 border-l-blue-500' :
                                status === 'today' ? 'bg-yellow-100/80 border-l-4 border-l-yellow-500' :
                                'border-l-4 border-l-gray-400'
                              }`}
                            >
                              <td className="py-3 px-4">
                                <span className="font-semibold text-gray-800">{classItem.day || 'N/A'}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-gray-700">{classItem.time || 'N/A'}</span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-gray-900">{classItem.name}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-gray-700">{classItem.year_level || 'N/A'}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-gray-700">{classItem.semester || 'N/A'}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-block px-2 py-1 bg-blue-200 text-blue-800 text-xs font-bold rounded-full shadow-sm">
                                  {classItem.section || 'N/A'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-gray-700">{classItem.units || 0} units</span>
                              </td>
                              <td className="py-3 px-4">
                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* User Profile & Notifications */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={handleNotificationClick}
                      className="relative cursor-pointer"
                    >
                      <Bell className="w-6 h-6 text-gray-600 hover:text-gray-800 transition-colors" />
                      {notifications > 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"></div>
                      )}
                    </button>
                  </div>
                  <button 
                    onClick={handleProfileClick}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50/50 rounded-lg p-1 transition-colors"
                  >
                    <img
                      src={profilePictureUrl || userAvatar}
                      alt="Profile"
                      className="w-8 h-8 rounded-full shadow-lg"
                    />
                    <div>
                      <p className="font-medium text-gray-700">{teacherName}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Calendar */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-700">
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

              {/* Personal Notes */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="font-bold text-gray-700 mb-4">Personal Notes</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  {personalNotes.map((note, index) => (
                    <li key={index} className="flex items-start cursor-pointer hover:bg-gray-50/30 rounded p-1 transition-colors">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                      {highlightText(note, searchQuery)}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recent Documents */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
                <h3 className="font-bold text-gray-700 mb-4">Recent Documents</h3>
                <div className="space-y-3">
                  {documents.map((document) => (
                    <div key={document.id} className="flex items-center justify-between p-3 bg-gray-50/50 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center shadow-lg">
                          <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-700">{document.name}</p>
                          <p className="text-xs text-gray-500">{document.size} • {document.date}</p>
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
