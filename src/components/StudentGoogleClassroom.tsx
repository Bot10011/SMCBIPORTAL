import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, CheckCircle, AlertCircle, Loader2, BookOpen, Clock, FileText, Upload, Bell, Target, AlertTriangle, Folder, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { googleClassroomService, type GoogleCourse, type GoogleAssignment, type GoogleSubmission } from '../lib/services/googleClassroomService';
import { SmartNotificationService } from '../lib/services/smartNotificationService';
import { ImageProxyService } from '../lib/services/imageProxyService';
import SmartNotificationCenter from './SmartNotificationCenter';
import { toast } from 'react-toastify';
import { googleDriveService, DriveItem, DriveFolder } from '../lib/services/googleDriveService';


interface StudentGoogleClassroomProps {
  onClose?: () => void;
}



export const StudentGoogleClassroom: React.FC<StudentGoogleClassroomProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [assignments, setAssignments] = useState<GoogleAssignment[]>([]);
  const [courses, setCourses] = useState<GoogleCourse[]>([]);
  const [submissions, setSubmissions] = useState<{ [key: string]: GoogleSubmission }>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'courses' | 'files'>('assignments');
  const [assignmentFilter, setAssignmentFilter] = useState<'assigned' | 'missing' | 'done'>('assigned');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<GoogleAssignment | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [urgentNotifications, setUrgentNotifications] = useState(0);
  

  
  // Google Drive Manager states
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const [driveFiles, setDriveFiles] = useState<DriveItem[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openContextMenu, setOpenContextMenu] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState<DriveItem | null>(null);
  const [newName, setNewName] = useState('');
  const [breadcrumb, setBreadcrumb] = useState<DriveFolder[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveItem, setMoveItem] = useState<DriveItem | null>(null);
  const [selectedTargetFolder, setSelectedTargetFolder] = useState<string>('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveItem | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const driveFileInputRef = useRef<HTMLInputElement>(null);

  const hasInitializedRef = useRef(false);

  // Enhanced error handling and validation utilities
  const validateUser = () => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return user.id;
  };

  const validateAssignment = (assignment: GoogleAssignment) => {
    if (!assignment?.id || !assignment?.courseId) {
      throw new Error('Invalid assignment data');
    }
    return assignment;
  };

  const validateSubmission = (submission: GoogleSubmission | null) => {
    if (submission && (!submission.id || !submission.courseWorkId)) {
      throw new Error('Invalid submission data');
    }
    return submission;
  };

  const validateDriveItem = (item: DriveItem) => {
    if (!item?.id || !item?.name) {
      throw new Error('Invalid drive item data');
    }
    return item;
  };

  // Enhanced state management with error recovery
  const resetErrorState = () => {
    setError(null);
    setDriveError(null);
  };

  const handleApiError = (error: unknown, context: string) => {
    console.error(`❌ Error in ${context}:`, error);
    
    let errorMessage = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Your session has expired. Please reconnect to continue.';
        setIsConnected(false);
        setConnectionStatus('disconnected');
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'You don\'t have permission to perform this action.';
      } else if (error.message.includes('Network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('Rate limit') || error.message.includes('quota')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else {
        errorMessage = error.message;
      }
    }
    
    setError(errorMessage);
    toast.error(errorMessage);
  };

  // Enhanced data fetching with retry logic
  const fetchWithRetry = async (
    fetchFn: () => Promise<any>,
    maxRetries: number = 3,
    context: string = 'API call'
  ): Promise<any> => {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fetchFn();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt}/${maxRetries} failed for ${context}:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  };

  // Initialize smart services
  useEffect(() => {
    SmartNotificationService.initialize();
    // Clear old notifications to prevent stale data
    SmartNotificationService.clearAllNotifications();
  }, []);

  // Check if Google Classroom is connected
  useEffect(() => {
    const checkConnection = async () => {
      if (!user?.id) {
        setConnectionStatus('disconnected');
        setIsConnected(false);
        return;
      }
      
      try {
        setConnectionStatus('checking');
        
        // Check if user has Google Classroom token stored (preferred) or auth code
        const token = localStorage.getItem(`google_classroom_token_${user.id}`);
        const authCode = localStorage.getItem(`google_auth_code_${user.id}`);
        
        if (token || authCode) {
          setConnectionStatus('connected');
          setIsConnected(true);
          hasInitializedRef.current = true;
          
          // Only fetch data if we don't already have it
          if (courses.length === 0 && assignments.length === 0) {
            await fetchClassroomData();
          }
        } else {
          setConnectionStatus('disconnected');
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error checking Google Classroom connection:', error);
        setConnectionStatus('disconnected');
        setIsConnected(false);
      }
    };

    checkConnection();
  }, [user?.id]);

  const fetchClassroomData = async () => {
    try {
      const userId = validateUser();
      
      // Prevent multiple simultaneous requests
      if (isDataLoading) {
        console.log('Data loading already in progress, skipping...');
        return;
      }

      setIsDataLoading(true);
      resetErrorState();

      console.log('🔄 Fetching Google Classroom data...');
      
      // Use retry logic for critical data fetching
      const [coursesData, assignmentsData] = await Promise.all([
        fetchWithRetry(
          () => googleClassroomService.getCourses(userId),
          3,
          'fetching courses'
        ),
        fetchWithRetry(
          () => googleClassroomService.getAllAssignments(userId),
          3,
          'fetching assignments'
        )
      ]);

      // Validate data before setting state
      if (!Array.isArray(coursesData) || !Array.isArray(assignmentsData)) {
        throw new Error('Invalid data format received from Google Classroom API');
      }

      setCourses(coursesData);
      setAssignments(assignmentsData);

      // Fetch submissions with individual error handling
      const submissionsData: { [key: string]: GoogleSubmission } = {};
      
      for (const assignment of assignmentsData) {
        try {
          const validatedAssignment = validateAssignment(assignment);
          const submission = await googleClassroomService.getMySubmission(
            userId,
            validatedAssignment.courseId,
            validatedAssignment.id
          );
          
          if (submission) {
            const validatedSubmission = validateSubmission(submission);
            submissionsData[validatedAssignment.id] = validatedSubmission;
          }
        } catch (submissionError) {
          console.warn(`Failed to fetch submission for assignment ${assignment.id}:`, submissionError);
          // Continue with other assignments even if one fails
        }
      }

      setSubmissions(submissionsData);

      // Create smart notifications
      createSmartNotifications(assignmentsData, submissionsData);

      console.log('✅ Google Classroom data loaded successfully');
      console.log('📊 Summary:', {
        courses: coursesData.length,
        assignments: assignmentsData.length,
        submissions: Object.keys(submissionsData).length
      });

    } catch (error) {
      handleApiError(error, 'fetching Google Classroom data');
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleConnectGoogleClassroom = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Google OAuth 2.0 configuration
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      // Debug logging
      console.log('Environment variables check:');
      console.log('VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
      console.log('All env vars:', import.meta.env);
      
      // Check if Google Client ID is configured
      if (!clientId) {
        console.error('Google Client ID is missing or undefined');
        setError('Google OAuth is not configured. Please contact your administrator.');
        return;
      }

      console.log('Client ID found:', clientId);

      const redirectUri = `${window.location.origin}/google-classroom-callback`;
      const scope = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me https://www.googleapis.com/auth/classroom.rosters.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/classroom.coursework.students https://www.googleapis.com/auth/classroom.profile.emails https://www.googleapis.com/auth/classroom.profile.photos';

      // Generate state parameter for security
      const state = Math.random().toString(36).substring(7);
      if (user?.id) {
        localStorage.setItem(`google_oauth_state_${user.id}`, state);
      }

      // Redirect to Google OAuth
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${state}&` +
        `access_type=offline&` +
        `prompt=consent`;

      console.log('Redirecting to Google OAuth URL:', authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting to Google Classroom:', error);
      setError('Failed to connect to Google Classroom');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;

    try {
      setIsDisconnecting(true);
      setError(null);

      // Simulate a brief delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear all Google Classroom data
      localStorage.removeItem(`google_classroom_token_${user.id}`);
      localStorage.removeItem(`google_classroom_refresh_token_${user.id}`);
      localStorage.removeItem(`google_auth_code_${user.id}`);
      localStorage.removeItem(`google_oauth_state_${user.id}`);

      setIsConnected(false);
      setConnectionStatus('disconnected');
      setAssignments([]);
      setCourses([]);
      setSubmissions({});
      setError(null);
      setShowDisconnectConfirm(false);
      hasInitializedRef.current = false;

      console.log('Google Classroom disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting from Google Classroom:', error);
      setError('Failed to disconnect from Google Classroom');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleJoinCourse = async () => {
    if (!user?.id || !enrollmentCode.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      const newCourse = await googleClassroomService.joinCourse(user.id, enrollmentCode.trim());
      setCourses(prev => [...prev, newCourse]);
      setEnrollmentCode('');
      
      // Refresh assignments
      await fetchClassroomData();
    } catch (error) {
      console.error('Error joining course:', error);
      setError('Failed to join course. Please check the enrollment code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleSubmitAssignment = async () => {
    if (!user?.id || !selectedAssignment || !selectedFile) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await googleClassroomService.submitAssignment(
        user.id,
        selectedAssignment.courseId,
        selectedAssignment.id,
        selectedFile
      );

      if (result.success) {
        // Check the type of message to provide appropriate feedback
        if (result.message.includes('submitted and turned in successfully')) {
          // Automatic submission and turn-in worked
          toast.success('Assignment submitted and turned in successfully!');
          alert(`${result.message}\n\n✅ Your assignment has been automatically submitted and turned in to Google Classroom!\n\nYou can verify it at: https://classroom.google.com/c/${selectedAssignment?.courseId}/a/${selectedAssignment?.id}/submissions`);
        } else if (result.message.includes('submitted successfully! Please turn it in manually')) {
          // Submitted but needs manual turn in
          const classroomUrl = `https://classroom.google.com/c/${selectedAssignment?.courseId}/a/${selectedAssignment?.id}/submissions`;
          toast.success('Assignment submitted! Please turn it in manually.');
          const userConfirmed = confirm(`${result.message}\n\nFile Link: ${result.fileLink}\n\nTo turn in your assignment:\n1. Click "OK" to open Google Classroom\n2. Find your submitted assignment\n3. Click "Turn In"\n\nClick "OK" to open Google Classroom now, or "Cancel" to do it later.`);
          
          if (userConfirmed) {
            window.open(classroomUrl, '_blank');
          }
        } else if (result.message.includes('Due to browser security restrictions')) {
          // Manual submission needed due to CORS
          const classroomUrl = `https://classroom.google.com/c/${selectedAssignment?.courseId}/a/${selectedAssignment?.id}/submissions`;
          toast.success('File uploaded to Google Drive! Please submit manually.');
          const userConfirmed = confirm(`${result.message}\n\nFile Link: ${result.fileLink}\n\nClick "OK" to open Google Classroom and submit your file manually.`);
          
          if (userConfirmed) {
            window.open(classroomUrl, '_blank');
          }
        } else {
          // Generic success message
          toast.success('Assignment submitted successfully!');
          alert(result.message);
        }
        
        // Close modal and reset
        setShowSubmitModal(false);
        setSelectedAssignment(null);
        setSelectedFile(null);
        
        // Refresh data to show updated status
        await fetchClassroomData();
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      setError('Failed to upload file. Please try again.');
      toast.error('Failed to submit assignment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTurnIn = async (assignment: GoogleAssignment) => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      await googleClassroomService.turnInAssignment(user.id, assignment.courseId, assignment.id);
      
      // Refresh submissions
      const submission = await googleClassroomService.getMySubmission(
        user.id,
        assignment.courseId,
        assignment.id
      );
      
      if (submission) {
        setSubmissions(prev => ({
          ...prev,
          [assignment.id]: submission
        }));
      }
    } catch (error) {
      console.error('Error turning in assignment:', error);
      setError('Failed to turn in assignment');
    } finally {
      setIsLoading(false);
    }
  };

  const createSmartNotifications = (assignments: GoogleAssignment[], submissions: { [key: string]: GoogleSubmission }) => {
    const now = new Date();
    
    // Clear existing notifications to avoid duplicates
    SmartNotificationService.clearAllNotifications();
    
    // Check each assignment for real status
    assignments.forEach(assignment => {
      // Debug: Log assignment information
      console.log(`Assignment: ${assignment.title}`);
      console.log(`Creation time:`, assignment.creationTime);
      console.log(`Update time:`, assignment.updateTime);
      console.log(`Due date data:`, assignment.dueDate);
      
      // Parse assignment creation time (when teacher posted the assignment)
      let assignmentCreatedDate: Date;
      try {
        assignmentCreatedDate = new Date(assignment.creationTime);
        if (isNaN(assignmentCreatedDate.getTime())) {
          console.error(`Invalid creation time for assignment: ${assignment.title}`, assignment.creationTime);
          return;
        }
      } catch (error) {
        console.error(`Error parsing creation time for assignment: ${assignment.title}`, assignment.creationTime, error);
        return;
      }
      
      // Calculate how long the assignment has been available
      const assignmentAgeMs = now.getTime() - assignmentCreatedDate.getTime();
      const assignmentAgeDays = Math.floor(assignmentAgeMs / (1000 * 60 * 60 * 24));
      
      console.log(`Assignment age: ${assignmentAgeDays} days`);
      
      // Only process assignments that have a due date
      if (!assignment.dueDate) {
        console.log(`No due date for assignment: ${assignment.title}`);
        return;
      }
      
      // More robust due date parsing
      let dueDate: Date;
      try {
        // Try parsing as ISO string first (if it's a string)
        if (typeof assignment.dueDate === 'string') {
          dueDate = new Date(assignment.dueDate);
        } else {
          // Parse as Google Classroom date object
          dueDate = new Date(
            assignment.dueDate.year,
            assignment.dueDate.month - 1,
            assignment.dueDate.day
          );
        }
        
        // Validate the date
        if (isNaN(dueDate.getTime())) {
          console.error(`Invalid due date for assignment: ${assignment.title}`, assignment.dueDate);
          return;
        }
        
        // Additional validation: check if date is reasonable (not too far in past or future)
        const yearDiff = Math.abs(dueDate.getFullYear() - now.getFullYear());
        if (yearDiff > 10) {
          console.error(`Due date seems unreasonable for assignment: ${assignment.title}`, dueDate);
          return;
        }
      } catch (error) {
        console.error(`Error parsing due date for assignment: ${assignment.title}`, assignment.dueDate, error);
        return;
      }
      
      // Debug: Log the calculated dates
      console.log(`Assignment created: ${assignmentCreatedDate.toDateString()}`);
      console.log(`Due date: ${dueDate.toDateString()}`);
      console.log(`Current date: ${now.toDateString()}`);
      
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      const submission = submissions[assignment.id];
      
      // Only create notifications for assignments that are not completed
      if (submission && submission.state === 'TURNED_IN') {
        console.log(`Assignment completed: ${assignment.title}`);
        return;
      }
      
      // Create deadline notifications based on real due dates
      if (hoursUntilDue > 0 && hoursUntilDue <= 168) { // Within 1 week
        SmartNotificationService.addNotification(
          SmartNotificationService.createDeadlineNotification(
            assignment.id,
            assignment.courseId,
            assignment.title,
            dueDate,
            hoursUntilDue
          )
        );
      }
      
      // Create overdue notifications only for assignments not turned in
      if (hoursUntilDue < 0 && (!submission || submission.state !== 'TURNED_IN')) {
        // Calculate days overdue using the due date
        const timeDiff = now.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        
        // Only create notification if it's actually overdue (not future date)
        if (daysOverdue > 0) {
          console.log(`Assignment overdue: ${assignment.title}, Due: ${dueDate.toDateString()}, Days overdue: ${daysOverdue}, Assignment age: ${assignmentAgeDays} days`);
          SmartNotificationService.addNotification(
            SmartNotificationService.createOverdueNotification(
              assignment.id,
              assignment.courseId,
              assignment.title,
              daysOverdue,
              assignmentAgeDays // Pass assignment age for context
            )
          );
        }
      }
    });
    
    // Create study reminder based on actual assignment status
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => {
      const submission = submissions[a.id];
      return submission && submission.state === 'TURNED_IN';
    }).length;
    
    const overdueCount = assignments.filter(a => {
      if (!a.dueDate) return false;
      
      // Parse due date
      const dueDate = new Date(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day);
      const submission = submissions[a.id];
      const timeDiff = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      // Only count as overdue if it's actually overdue and not completed
      return daysOverdue > 0 && (!submission || submission.state !== 'TURNED_IN');
    }).length;
    
    const upcomingDeadlines = assignments.filter(a => {
      if (!a.dueDate) return false;
      const dueDate = new Date(a.dueDate.year, a.dueDate.month - 1, a.dueDate.day);
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      const submission = submissions[a.id];
      return hoursUntilDue > 0 && hoursUntilDue <= 72 && (!submission || submission.state !== 'TURNED_IN');
    }).length;
    
    // Only create study reminder if there are actual pending assignments
    if (totalAssignments > completedAssignments) {
      SmartNotificationService.addNotification(
        SmartNotificationService.createStudyReminder(
          totalAssignments - completedAssignments, 
          overdueCount, 
          upcomingDeadlines
        )
      );
    }
    
    // Check for grade updates
    assignments.forEach(assignment => {
      const submission = submissions[assignment.id];
      if (submission && submission.assignedGrade !== undefined && submission.assignedMaxPoints) {
        // Check if this is a new grade (you might want to store last checked grades)
        const gradeKey = `grade_${assignment.id}`;
        const lastGrade = localStorage.getItem(gradeKey);
        const currentGrade = `${submission.assignedGrade}/${submission.assignedMaxPoints}`;
        
        if (lastGrade !== currentGrade) {
          // New grade posted
          SmartNotificationService.addNotification(
            SmartNotificationService.createGradeNotification(
              assignment.id,
              assignment.courseId,
              assignment.title,
              submission.assignedGrade,
              submission.assignedMaxPoints
            )
          );
          
          // Store the new grade
          localStorage.setItem(gradeKey, currentGrade);
        }
      }
    });
    
    // Update notification counts
    setUnreadNotifications(SmartNotificationService.getUnreadCount());
    setUrgentNotifications(SmartNotificationService.getUrgentCount());
  };

  const formatDueDate = (assignment: GoogleAssignment) => {
    if (!assignment.dueDate) {
      return 'No due date';
    }

    const date = new Date(
      assignment.dueDate.year,
      assignment.dueDate.month - 1,
      assignment.dueDate.day
    );
    
    // Also calculate assignment age for context
    const assignmentCreatedDate = new Date(assignment.creationTime);
    const now = new Date();
    const assignmentAgeMs = now.getTime() - assignmentCreatedDate.getTime();
    const assignmentAgeDays = Math.floor(assignmentAgeMs / (1000 * 60 * 60 * 24));
    
    return `${date.toLocaleDateString()} (Posted ${assignmentAgeDays} day${assignmentAgeDays === 1 ? '' : 's'} ago)`;
  };

  // Correct Google Classroom API status detection based on official documentation
  const getAssignmentStatus = (assignment: GoogleAssignment, submission: GoogleSubmission | null) => {
    if (!submission) {
      return { status: 'NOT_STARTED', displayStatus: 'Not Started', isCompleted: false, isMissing: false, isGraded: false, isTurnedIn: false, isSubmitted: false, isLate: false, grade: null };
    }
    
    const isDueDatePassed = assignment.dueDate && new Date() > new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day);
    
    if (assignment.state === 'DELETED') {
      return { status: 'DELETED', displayStatus: 'Not accepting work', isCompleted: false, isMissing: false, isGraded: false, isTurnedIn: false, isSubmitted: false, isLate: false, grade: null };
    }
    
    // Check if graded first
    if ((submission.state === 'RETURNED' && submission.assignedGrade !== undefined) || submission.assignedGrade !== undefined || submission.draftGrade !== undefined) {
      return { status: 'GRADED', displayStatus: 'Graded', isCompleted: true, isMissing: false, isGraded: true, isTurnedIn: true, isSubmitted: true, isLate: submission.late, grade: submission.assignedGrade || submission.draftGrade };
    }
    
    // Check if turned in (including late submissions)
    if (submission.state === 'TURNED_IN') {
      const isLate = submission.late || isDueDatePassed;
      return { 
        status: isLate ? 'TURNED_IN_LATE' : 'TURNED_IN', 
        displayStatus: isLate ? 'Submitted (Late)' : 'Submitted', 
        isCompleted: true, 
        isMissing: false, 
        isGraded: false, 
        isTurnedIn: true, 
        isSubmitted: true, 
        isLate: isLate, 
        grade: null 
      };
    }
    
    // Check if missing (overdue and not turned in)
    if (submission.state === 'CREATED' && (submission.late || isDueDatePassed)) {
      return { status: 'MISSING', displayStatus: 'Missing', isCompleted: false, isMissing: true, isGraded: false, isTurnedIn: false, isSubmitted: false, isLate: submission.late, grade: null };
    }
    
    // Check if not accepting work
    if (isDueDatePassed && submission.state === 'CREATED') {
      return { status: 'NOT_ACCEPTING', displayStatus: 'Not accepting work', isCompleted: false, isMissing: false, isGraded: false, isTurnedIn: false, isSubmitted: false, isLate: submission.late, grade: null };
    }
    
    // Draft status
    if (submission.state === 'CREATED') {
      return { status: 'DRAFT', displayStatus: 'Draft', isCompleted: false, isMissing: false, isGraded: false, isTurnedIn: false, isSubmitted: false, isLate: false, grade: null };
    }
    
    return { status: 'UNKNOWN', displayStatus: 'Unknown', isCompleted: false, isMissing: false, isGraded: false, isTurnedIn: false, isSubmitted: false, isLate: false, grade: null };
  };

  // Test the Done filter specifically
  const testDoneFilter = () => {
    console.log('=== TESTING DONE FILTER ===');
    console.log('Current filter:', assignmentFilter);
    console.log('Total assignments:', assignments.length);
    console.log('Total submissions:', Object.keys(submissions).length);
    
    const filteredAssignments = getFilteredAssignments();
    console.log('Filtered assignments count:', filteredAssignments.length);
    console.log('Filtered assignments:', filteredAssignments.map(a => a.title));
    
    // Test each assignment manually
    assignments.forEach(assignment => {
      const submission = submissions[assignment.id];
      const assignmentStatus = getAssignmentStatus(assignment, submission);
      console.log(`\nAssignment: ${assignment.title}`);
      console.log(`  - Status: ${assignmentStatus.status}`);
      console.log(`  - Is Completed: ${assignmentStatus.isCompleted}`);
      console.log(`  - Is Graded: ${assignmentStatus.isGraded}`);
      console.log(`  - Grade: ${assignmentStatus.grade}`);
      console.log(`  - Should show in Done: ${assignmentStatus.isCompleted || assignmentStatus.isGraded || assignmentStatus.grade !== null}`);
    });
    console.log('=== END DONE FILTER TEST ===');
  };

  // Simple test function to check data
  const testData = () => {
    console.log('=== TEST DATA ===');
    console.log('Total assignments:', assignments.length);
    console.log('Total submissions:', Object.keys(submissions).length);
    console.log('All assignments:', assignments);
    console.log('All submissions:', submissions);
    
    // Test each assignment
    assignments.forEach(assignment => {
      const submission = submissions[assignment.id];
      console.log(`\nAssignment: ${assignment.title}`);
      console.log(`  - ID: ${assignment.id}`);
      console.log(`  - Submission:`, submission);
      if (submission) {
        console.log(`  - State: ${submission.state}`);
        console.log(`  - Assigned Grade: ${submission.assignedGrade}`);
        console.log(`  - Draft Grade: ${submission.draftGrade}`);
        console.log(`  - Late: ${submission.late}`);
      } else {
        console.log(`  - NO SUBMISSION FOUND`);
      }
    });
    console.log('=== END TEST ===');
  };

  // Debug function to check submission states
  const debugSubmissionStates = () => {
    console.log('=== DEBUG SUBMISSION STATES ===');
    console.log('All assignments:', assignments);
    console.log('All submissions:', submissions);
    
    assignments.forEach(assignment => {
      const submission = submissions[assignment.id];
      console.log(`Assignment: ${assignment.title}`);
      console.log(`  - ID: ${assignment.id}`);
      console.log(`  - Course ID: ${assignment.courseId}`);
      console.log(`  - Submission:`, submission);
      console.log(`  - Submission state: ${submission?.state || 'NO_SUBMISSION'}`);
      console.log(`  - Due date:`, assignment.dueDate);
      console.log(`  - Is overdue:`, assignment.dueDate ? new Date() > new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day) : 'No due date');
      console.log('---');
    });
    console.log('=== END DEBUG ===');
  };

  const getFilteredAssignments = () => {
    console.log('=== FILTERING ASSIGNMENTS ===');
    console.log('Total assignments:', assignments.length);
    console.log('Total submissions:', Object.keys(submissions).length);
    console.log('Current filter:', assignmentFilter);
    console.log('Selected class:', selectedClass);
    console.log('All submissions data:', submissions);
    
    const filteredAssignments = assignments.filter(assignment => {
      console.log(`\n--- Processing Assignment: ${assignment.title} ---`);
      console.log(`Assignment ID: ${assignment.id}`);
      console.log(`Course ID: ${assignment.courseId}`);
      
      // Class filter
      if (selectedClass !== 'all' && assignment.courseId !== selectedClass) {
        console.log(`❌ Filtered out by class filter (selected: ${selectedClass}, assignment course: ${assignment.courseId})`);
        return false;
      }
      console.log(`✅ Passed class filter`);
      
      const submission = submissions[assignment.id];
      console.log(`Submission for this assignment:`, submission);
      
      // Use the new status detection system
      const assignmentStatus = getAssignmentStatus(assignment, submission);
      console.log(`Assignment status:`, assignmentStatus);
      
      // Calculate overdue status for missing filter
      let isOverdue = false;
      if (assignment.dueDate) {
        const dueDate = new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day);
        const now = new Date();
        isOverdue = now.getTime() > dueDate.getTime();
        console.log(`Due date: ${dueDate.toDateString()}`);
        console.log(`Is overdue: ${isOverdue}`);
      } else {
        console.log(`No due date for this assignment`);
      }
      
      let shouldInclude = false;
      let reason = '';
      
      switch (assignmentFilter) {
        case 'assigned':
          // Show assignments that are not completed (not turned in, not graded)
          shouldInclude = !assignmentStatus.isCompleted;
          reason = `Assigned filter: !isCompleted = ${!assignmentStatus.isCompleted}`;
          break;
        case 'missing':
          // Show assignments that are overdue AND not completed
          shouldInclude = isOverdue && !assignmentStatus.isCompleted;
          reason = `Missing filter: isOverdue && !isCompleted = ${isOverdue} && ${!assignmentStatus.isCompleted} = ${shouldInclude}`;
          break;
        case 'done':
          // Show assignments that are completed (turned in, graded, or returned)
          // Also include any assignment that has a grade, even if not marked as completed
          shouldInclude = assignmentStatus.isCompleted || assignmentStatus.isGraded || assignmentStatus.grade !== null;
          reason = `Done filter: isCompleted=${assignmentStatus.isCompleted} OR isGraded=${assignmentStatus.isGraded} OR hasGrade=${assignmentStatus.grade !== null} = ${shouldInclude}`;
          console.log(`🔍 DONE FILTER DEBUG for "${assignment.title}":`);
          console.log(`  - Status: ${assignmentStatus.status}`);
          console.log(`  - Display Status: ${assignmentStatus.displayStatus}`);
          console.log(`  - Is Completed: ${assignmentStatus.isCompleted}`);
          console.log(`  - Is Graded: ${assignmentStatus.isGraded}`);
          console.log(`  - Grade: ${assignmentStatus.grade}`);
          console.log(`  - Should Include: ${shouldInclude}`);
          break;
        default:
          shouldInclude = true;
          reason = 'Default filter: always true';
      }
      
      console.log(`Filter result: ${shouldInclude ? '✅ INCLUDED' : '❌ EXCLUDED'}`);
      console.log(`Reason: ${reason}`);
      console.log(`--- End Processing Assignment: ${assignment.title} ---\n`);
      
      return shouldInclude;
    });
    
    console.log(`=== FILTERING COMPLETE ===`);
    console.log(`Filtered assignments count: ${filteredAssignments.length}`);
    console.log(`Filtered assignments:`, filteredAssignments.map(a => a.title));
    console.log(`====================\n`);
    
    return filteredAssignments;
  };

  // Convert course ID to Google Classroom URL format
  const getCourseUrl = (courseId: string) => {
    // Google Classroom uses base64 encoding for course IDs in URLs
    // Convert the numeric ID to the proper format
    try {
      // First try to convert the ID to the proper format
      const encodedId = btoa(courseId);
      return `https://classroom.google.com/c/${encodedId}`;
    } catch {
      // If that fails, use the original ID
      return `https://classroom.google.com/c/${courseId}`;
    }
  };

  // Convert assignment ID to Google Classroom URL format
  const getAssignmentUrl = (courseId: string, assignmentId: string) => {
    try {
      const encodedCourseId = btoa(courseId);
      const encodedAssignmentId = btoa(assignmentId);
      return `https://classroom.google.com/c/${encodedCourseId}/a/${encodedAssignmentId}`;
    } catch {
      return `https://classroom.google.com/c/${courseId}/a/${assignmentId}`;
    }
  };

  const testSubmissionFetching = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }

    console.log('=== TESTING SUBMISSION FETCHING ===');
    console.log('User ID:', user.id);
    
    try {
      // Test with the first assignment if available
      const assignments = await googleClassroomService.getAllAssignments(user.id);
      console.log('All assignments:', assignments);
      
      if (assignments.length > 0) {
        const firstAssignment = assignments[0];
        console.log('Testing with first assignment:', firstAssignment);
        
        const submissions = await googleClassroomService.getSubmissions(
          user.id,
          firstAssignment.courseId,
          firstAssignment.id
        );
        console.log('Submissions for first assignment:', submissions);
        
        const mySubmission = await googleClassroomService.getMySubmission(
          user.id,
          firstAssignment.courseId,
          firstAssignment.id
        );
        console.log('My submission for first assignment:', mySubmission);
      } else {
        console.log('No assignments found to test with');
      }
    } catch (error) {
      console.error('Error testing submission fetching:', error);
    }
  };

  // Google Drive Manager functions
  const loadDriveFiles = async () => {
    try {
      const userId = validateUser();
      
      setDriveLoading(true);
      setDriveError(null);
      
      const filesData = await fetchWithRetry(
        () => googleDriveService.getFiles(userId, currentFolderId),
        3,
        'loading drive files'
      );
      
      // Validate files data
      if (!Array.isArray(filesData)) {
        throw new Error('Invalid files data received from Google Drive API');
      }
      
      setDriveFiles(filesData);
      
      // Update breadcrumb with error handling
      if (currentFolderId) {
        try {
          const path = await googleDriveService.getFolderPath(userId, currentFolderId);
          setBreadcrumb(Array.isArray(path) ? path : []);
        } catch (breadcrumbError) {
          console.warn('Failed to load breadcrumb:', breadcrumbError);
          setBreadcrumb([]);
        }
      } else {
        setBreadcrumb([]);
      }
    } catch (error) {
      handleApiError(error, 'loading Google Drive files');
      setDriveError('Failed to load files');
    } finally {
      setDriveLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!user?.id || !newFolderName.trim()) return;
    
    try {
      setIsCreatingFolder(true);
      await googleDriveService.createFolder(user.id, {
        name: newFolderName.trim(),
        parentId: currentFolderId
      });
      
      setNewFolderName('');
      setShowCreateFolder(false);
      loadDriveFiles();
    } catch (error) {
      console.error('Error creating folder:', error);
      setDriveError('Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user?.id) return;
    
    try {
      setIsUploading(true);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await googleDriveService.uploadFile(user.id, {
          file,
          parentId: currentFolderId
        });
      }
      
      loadDriveFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      setDriveError('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (item: DriveItem) => {
    if (!user?.id) return;
    
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    
    try {
      setDriveLoading(true);
      await googleDriveService.deleteItem(user.id, item.id);
      loadDriveFiles();
    } catch (error) {
      console.error('Error deleting item:', error);
      setDriveError('Failed to delete item');
    } finally {
      setDriveLoading(false);
    }
  };

  const getFileIcon = (item: DriveItem) => {
    if (item.isFolder) return <Folder className="w-5 h-5 text-blue-500" />;
    
    const name = item.name.toLowerCase();
    if (name.includes('.pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (name.includes('.doc') || name.includes('.docx')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (name.includes('.xls') || name.includes('.xlsx')) return <FileText className="w-5 h-5 text-green-500" />;
    if (name.includes('.ppt') || name.includes('.pptx')) return <FileText className="w-5 h-5 text-orange-500" />;
    if (name.includes('.jpg') || name.includes('.png') || name.includes('.gif')) return <FileText className="w-5 h-5 text-purple-500" />;
    if (name.includes('.mp4') || name.includes('.avi') || name.includes('.mov')) return <FileText className="w-5 h-5 text-red-500" />;
    if (name.includes('.mp3') || name.includes('.wav')) return <FileText className="w-5 h-5 text-green-500" />;
    if (name.includes('.zip') || name.includes('.rar')) return <FileText className="w-5 h-5 text-gray-500" />;
    if (name.includes('.js') || name.includes('.ts') || name.includes('.py') || name.includes('.java')) return <FileText className="w-5 h-5 text-yellow-500" />;
    if (name.includes('.sql') || name.includes('.db')) return <FileText className="w-5 h-5 text-blue-500" />;
    
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (size: string) => {
    const bytes = parseInt(size);
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isImageFile = (fileName: string) => {
    const lowerCaseFileName = fileName.toLowerCase();
    return lowerCaseFileName.endsWith('.jpg') || lowerCaseFileName.endsWith('.jpeg') || lowerCaseFileName.endsWith('.png') || lowerCaseFileName.endsWith('.gif');
  };

  const loadImageUrl = async (fileId: string) => {
    if (!user?.id) return;
    
    try {
      console.log('🖼️ Loading image URL for file:', fileId);
      setImageLoading(true);
      
      // Get the access token
      const token = localStorage.getItem(`google_classroom_token_${user.id}`);
      if (!token) {
        throw new Error('No access token found');
      }
      
      // Try to fetch the image as a blob with authentication
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      console.log('✅ Image loaded successfully as blob');
      setImageUrl(url);
      
    } catch (error) {
      console.error('❌ Error loading image URL:', error);
      setImageUrl(null);
    } finally {
      setImageLoading(false);
    }
  };

  const handleImageError = (fileId: string) => {
    console.log('🔄 Image failed to load, trying alternative URL...');
    // Try alternative Google Drive URL format
    const alternativeUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    setImageUrl(alternativeUrl);
  };

  const handleDriveFileClick = (item: DriveItem) => {
    if (item.isFolder) {
      setCurrentFolderId(item.id);
    } else {
      setSelectedDriveFile(item);
      setShowFileViewer(true);
      
      setImageUrl(null); // Reset image URL
      
      // Load image URL if it's an image file
      if (isImageFile(item.name)) {
        loadImageUrl(item.id);
      }
    }
  };

  const handleDriveSearch = async () => {
    if (!user?.id || !searchQuery.trim()) {
      // If search is empty, load current folder files
      loadDriveFiles();
      return;
    }
    
    try {
      setDriveLoading(true);
      setDriveError(null);
      
      const searchResults = await googleDriveService.searchFiles(user.id, searchQuery);
      setDriveFiles(searchResults);
    } catch (error) {
      console.error('Error searching files:', error);
      setDriveError('Failed to search files');
    } finally {
      setDriveLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === 'files' && user?.id) {
        if (searchQuery.trim()) {
          handleDriveSearch();
        } else {
          loadDriveFiles();
        }
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeTab, user?.id, currentFolderId]);

  // Load drive files when files tab is active
  useEffect(() => {
    if (activeTab === 'files' && user?.id) {
      loadDriveFiles();
    }
  }, [activeTab, user?.id, currentFolderId]);



  // Cleanup blob URLs when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  return (
    <>
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 flex flex-col h-screen max-h-screen">
        {/* Fixed Header - Never scrolls */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-2xl flex-shrink-0 z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Google Classroom</h1>
                <p className="text-white/80 text-sm font-medium">Access your assignments and courses</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Area - Only this scrolls */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <div className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700">{error}</span>
                  </div>
                </div>
              )}

              {!isConnected ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {connectionStatus === 'checking' ? 'Checking Connection...' : 'Connect to Google Classroom'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {connectionStatus === 'checking' 
                      ? 'Verifying your Google Classroom connection...'
                      : 'Connect your Google Classroom account to access assignments, submit work, and track your progress.'
                    }
                  </p>
                  {connectionStatus === 'checking' ? (
                    <div className="flex items-center justify-center space-x-2 text-blue-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span>Checking connection...</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleConnectGoogleClassroom}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Connecting...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <ExternalLink className="w-4 h-4" />
                          <span>Connect Google Classroom</span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {/* Connection Status and Smart Features */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-700 font-medium">Connected to Google Classroom</span>
                      </div>
                      
                      {/* Analytics Summary */}
                      {analytics && (
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Target className="w-4 h-4 text-blue-500" />
                            <span className="text-gray-600">
                              {analytics.completedAssignments}/{analytics.totalAssignments} completed
                            </span>
                          </div>
                          {analytics.overdueAssignments > 0 && (
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                              <span className="text-red-600 font-medium">
                                {analytics.overdueAssignments} overdue
                              </span>
                            </div>
                          )}
                          {analytics.upcomingDeadlines > 0 && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4 text-orange-500" />
                              <span className="text-orange-600 font-medium">
                                {analytics.upcomingDeadlines} due soon
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Notification Bell */}
                      <button
                        onClick={() => setShowNotificationCenter(true)}
                        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Bell className="w-5 h-5" />
                        {(unreadNotifications > 0 || urgentNotifications > 0) && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {urgentNotifications > 0 ? urgentNotifications : unreadNotifications}
                          </span>
                        )}
                      </button>
                      
                      <button
                        onClick={() => window.open('https://classroom.google.com', '_blank')}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Classroom</span>
                      </button>
                      <button
                        onClick={() => setShowDisconnectConfirm(true)}
                        disabled={isDisconnecting}
                        className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDisconnecting ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Disconnecting...
                          </div>
                        ) : (
                          'Disconnect'
                        )}
                      </button>
                    </div>
                  </div>

                                    {/* Enhanced Tab Navigation */}
                  <div className="mb-8">
                    <div className="flex bg-white rounded-xl shadow-lg border border-gray-200 p-1 sticky top-0 z-10">
                      <button
                        onClick={() => setActiveTab('assignments')}
                        className={`flex-1 px-6 py-4 rounded-lg text-sm font-semibold transition-all duration-200 relative ${
                          activeTab === 'assignments'
                            ? 'text-blue-700 bg-blue-50 shadow-md'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <FileText className={`w-4 h-4 ${
                            activeTab === 'assignments' ? 'text-blue-600' : 'text-gray-500'
                          }`} />
                          <span>Assignments</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            activeTab === 'assignments'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {assignments.length}
                          </span>
                        </div>
                        {activeTab === 'assignments' && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('courses')}
                        className={`flex-1 px-6 py-4 rounded-lg text-sm font-semibold transition-all duration-200 relative ${
                          activeTab === 'courses'
                            ? 'text-blue-700 bg-blue-50 shadow-md'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <BookOpen className={`w-4 h-4 ${
                            activeTab === 'courses' ? 'text-blue-600' : 'text-gray-500'
                          }`} />
                          <span>Courses</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            activeTab === 'courses'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {courses.length}
                          </span>
                        </div>
                        {activeTab === 'courses' && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('files')}
                        className={`flex-1 px-6 py-4 rounded-lg text-sm font-semibold transition-all duration-200 relative ${
                          activeTab === 'files'
                            ? 'text-blue-700 bg-blue-50 shadow-md'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Folder className="w-4 h-4 text-gray-500" />
                          <span>File Organizer</span>
                        </div>
                        {activeTab === 'files' && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Assignment Filter Tabs (when assignments tab is active) */}
                  {activeTab === 'assignments' && (
                    <div className="mb-6">
                      {/* Assignment Status Tabs */}
                      <div className="flex justify-center mb-4">
                        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setAssignmentFilter('assigned')}
                          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                            assignmentFilter === 'assigned'
                              ? 'text-blue-600 border-b-2 border-blue-600'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Assigned
                        </button>
                        <button
                          onClick={() => setAssignmentFilter('missing')}
                          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                            assignmentFilter === 'missing'
                                ? 'text-red-600 border-b-2 border-red-600'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Missing
                        </button>
                        <button
                            onClick={() => {
                              console.log('=== CLICKING DONE FILTER ===');
                              console.log('Current filter before:', assignmentFilter);
                              console.log('Current submissions:', submissions);
                              console.log('Current assignments:', assignments);
                              setAssignmentFilter('done');
                              console.log('Setting filter to: done');
                              
                              // Force a re-render by calling getFilteredAssignments
                              setTimeout(() => {
                                console.log('=== AFTER SETTING DONE FILTER ===');
                                console.log('New filter value:', assignmentFilter);
                                const filtered = getFilteredAssignments();
                                console.log('Filtered assignments for Done:', filtered.length);
                                console.log('Filtered assignment titles:', filtered.map(a => a.title));
                              }, 100);
                            }}
                          className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                            assignmentFilter === 'done'
                                ? 'text-green-600 border-b-2 border-green-600'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Done
                        </button>
                        </div>
                      </div>

                      {/* Color Legend */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 text-center">Status Color Guide:</h4>
                        <div className="flex flex-wrap gap-4 text-xs justify-center">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                            <span className="text-gray-600">Graded</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-gray-600">Submitted</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-gray-600">Missing</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-gray-600">Draft</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                            <span className="text-gray-600">Not Accepting</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                            <span className="text-gray-600">Unknown</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className="text-gray-600">Submitted (Late)</span>
                          </div>
                        </div>
                      </div>

                      {/* Class Filter Dropdown */}
                      <div className="flex justify-center mb-4">
                        <div className="relative border-2 border-black rounded-lg p-1 bg-gray-50">
                          <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">All classes</option>
                            {courses.map((course) => (
                              <option key={course.id} value={course.id}>
                                {course.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                                    {/* Scrollable Content - Only this scrolls */}
                  <div className="overflow-y-auto">
                    {activeTab === 'assignments' && (
                      <div className="space-y-4">
                        {isDataLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          </div>
                                                ) : assignments.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No assignments found</p>
                          </div>
                        ) : (
                          (() => {
                            const filteredAssignments = getFilteredAssignments();
                            
                            if (filteredAssignments.length === 0) {
                              return (
                                <div className="text-center py-8 text-gray-500">
                                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                  <p>No {assignmentFilter} assignments found</p>
                                  <p className="text-sm text-gray-400 mt-2">
                                    {selectedClass !== 'all' ? `in ${courses.find(c => c.id === selectedClass)?.name || 'selected class'}` : ''}
                                  </p>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="space-y-4">
                                {/* Google Classroom Style Layout */}
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                  {filteredAssignments.map((assignment, index) => {
                                      const submission = submissions[assignment.id];
                                      const course = courses.find(c => c.id === assignment.courseId);
                                      
                                      // Calculate due date info
                                      const now = new Date();
                                      const dueDate = assignment.dueDate ? new Date(
                                        assignment.dueDate.year,
                                        assignment.dueDate.month - 1,
                                        assignment.dueDate.day
                                      ) : null;
                                      
                                      const isOverdue = dueDate && dueDate < now && (!submission || submission.state !== 'TURNED_IN');
                                    const assignmentStatus = getAssignmentStatus(assignment, submission);
                                    
                                    // Determine icon color based on assignment type and status (matching the image)
                                    let iconColor = 'bg-blue-500';
                                    if (assignmentStatus.isCompleted) {
                                      iconColor = 'bg-green-500';
                                    } else if (assignment.title.toLowerCase().includes('essay')) {
                                      iconColor = 'bg-gray-500';
                                    } else if (assignment.title.toLowerCase().includes('module') || assignment.title.toLowerCase().includes('lesson')) {
                                      iconColor = 'bg-green-500';
                                    } else {
                                      iconColor = 'bg-blue-500'; // Default for quizzes, worksheets, etc.
                                    }
                                      
                                      return (
                                        <div
                                          key={assignment.id}
                                        className={`flex items-center p-4 hover:bg-gray-50 transition-colors ${
                                          index !== filteredAssignments.length - 1 ? 'border-b border-gray-100' : ''
                                          }`}
                                        >
                                        {/* Left Section - Icon (matching the image exactly) */}
                                        <div className="flex-shrink-0 mr-4">
                                          <div className={`w-10 h-10 rounded-lg ${iconColor} flex items-center justify-center`}>
                                            <FileText className="w-5 h-5 text-white" />
                                          </div>
                                              </div>
                                              
                                        {/* Middle Section - Assignment Details (matching the image exactly) */}
                                        <div className="flex-1 min-w-0">
                                          <h3 className="text-base font-semibold text-gray-900 truncate">
                                            {assignment.title}
                                          </h3>
                                              {course && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                    {course.name}
                                            </p>
                                              )}
                                            </div>
                                            
                                        {/* Status Indicator */}
                                        <div className="flex-shrink-0 mx-4">
                                          <div className={`w-3 h-3 rounded-full ${
                                            assignmentStatus.status === 'GRADED' ? 'bg-purple-500' :
                                            assignmentStatus.status === 'TURNED_IN' ? 'bg-green-500' :
                                            assignmentStatus.status === 'TURNED_IN_LATE' ? 'bg-orange-500' :
                                            assignmentStatus.status === 'MISSING' ? 'bg-red-500' :
                                            assignmentStatus.status === 'DRAFT' ? 'bg-yellow-500' :
                                            assignmentStatus.status === 'NOT_ACCEPTING' ? 'bg-gray-500' :
                                            'bg-gray-400'
                                          }`} title={assignmentStatus.displayStatus}></div>
                                          </div>
                                          
                                        {/* Right Section - Due Date/Status (matching the image exactly) */}
                                        <div className="flex-shrink-0 text-right mr-4">
                                          {dueDate ? (
                                            <div>
                                              <div className={`text-sm font-medium ${
                                                isOverdue ? 'text-gray-500' : 'text-red-600'
                                              }`}>
                                                {dueDate.toLocaleDateString('en-US', { 
                                                  weekday: 'long', 
                                                  month: 'short', 
                                                  day: 'numeric' 
                                    })}
                                  </div>
                                              {isOverdue && (
                                                <div className="text-xs text-gray-400 italic mt-1">
                                                  Not accepting work
                              </div>
                        )}
                      </div>
                                ) : (
                                            <div className="text-sm text-gray-500">
                                              No due date
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* View Button */}
                                        <div className="flex-shrink-0">
                                        <button
                                          onClick={() => window.open(getAssignmentUrl(assignment.courseId, assignment.id), '_blank')}
                                            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                            <span>View</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                          </div>
                            );
                          })()
                        )}
                      </div>
                    )}

                    {activeTab === 'courses' && (
                      <div className="space-y-4">
                        {isDataLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          </div>
                        ) : courses.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No courses found</p>
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            {courses.map((course) => (
                              <div
                                key={course.id}
                                className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 mb-1">
                                      {course.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                      {course.section || 'No section'}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => window.open(getCourseUrl(course.id), '_blank')}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium ml-2"
                                  >
                                    Open Course
                                  </button>
                                </div>
                                
                                {/* Teacher Information - From Google Classroom */}
                                {course.teachers && course.teachers.length > 0 ? (
                                  <div className="mb-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                          {course.teachers.length > 1 ? 'Teachers' : 'Teacher'}:
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {/* Show only first 2 teachers to avoid clutter */}
                                        {course.teachers.slice(0, 2).map((teacher) => (
                                          <div key={teacher.userId} className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
                                            {/* Teacher Avatar */}
                                            <div className="relative">
                                              {teacher.profile.photoUrl ? (
                                                <>
                                                  <img
                                                    src={ImageProxyService.getProxyImageUrl(teacher.profile.photoUrl)}
                                                    alt={teacher.profile.name.fullName}
                                                    className="w-8 h-8 rounded-full border-2 border-gray-200 object-cover"
                                                    onLoad={() => {
                                                      console.log('✅ Teacher image loaded successfully:', teacher.profile.name.fullName);
                                                    }}
                                                    onError={(e) => {
                                                      console.log('❌ Teacher image failed to load:', teacher.profile.name.fullName, teacher.profile.photoUrl);
                                                      const target = e.target as HTMLImageElement;
                                                      target.style.display = 'none';
                                                      const fallback = target.nextElementSibling as HTMLElement;
                                                      if (fallback) fallback.classList.remove('hidden');
                                                    }}
                                                  />
                                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${ImageProxyService.getNameColor(teacher.profile.name.fullName)} flex items-center justify-center border-2 border-gray-200 hidden`}>
                                                    <span className="text-sm font-bold text-white">
                                                      {ImageProxyService.getInitials(teacher.profile.name.fullName)}
                                                    </span>
                                                  </div>
                                                </>
                                              ) : (
                                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${ImageProxyService.getNameColor(teacher.profile.name.fullName)} flex items-center justify-center border-2 border-gray-200`}>
                                                  <span className="text-sm font-bold text-white">
                                                    {ImageProxyService.getInitials(teacher.profile.name.fullName)}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            
                                            {/* Teacher Name */}
                                            <div className="flex flex-col">
                                              <span className="text-sm font-medium text-gray-900">
                                                {teacher.profile.name.fullName}
                                              </span>
                                              {teacher.profile.verifiedTeacher && (
                                                <span className="text-xs text-green-600 font-medium">
                                                  ✓ Verified Teacher
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                        {/* Show note if there are more than 2 teachers */}
                                        {course.teachers.length > 2 && (
                                          <div className="text-xs text-gray-500 italic">
                                            +{course.teachers.length - 2} more teacher{course.teachers.length - 2 > 1 ? 's' : ''}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mb-3">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-500">?</span>
                                      </div>
                                      <span className="text-sm text-gray-500">Teacher information not available</span>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    {course.enrollmentCode ? `Code: ${course.enrollmentCode}` : 'No enrollment code'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'files' && (
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4 flex items-center justify-between border-b border-gray-100">
                          <h3 className="text-lg font-semibold text-gray-900">My Google Drive</h3>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setShowCreateFolder(true)}
                              disabled={isCreatingFolder}
                              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              {isCreatingFolder ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              ) : (
                                <Folder className="w-4 h-4" />
                              )}
                              <span>{isCreatingFolder ? 'Creating...' : 'New Folder'}</span>
                            </button>
                            
                            <button
                              onClick={() => driveFileInputRef.current?.click()}
                              disabled={isUploading}
                              className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              {isUploading ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              <span>{isUploading ? 'Uploading...' : 'Upload Files'}</span>
                            </button>
                            
                            <button
                              onClick={() => window.open('https://drive.google.com', '_blank')}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Open Drive
                            </button>
                          </div>
                        </div>

                        {/* Search Bar */}
                        <div className="p-3 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center space-x-2">
                            <div className="relative flex-1 max-w-md">
                              <input
                                type="text"
                                placeholder="Type to search files and folders..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                <Search className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                            {searchQuery && (
                              <button
                                onClick={() => {
                                  setSearchQuery('');
                                  loadDriveFiles();
                                }}
                                className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Breadcrumb Navigation */}
                        {(currentFolderId || breadcrumb.length > 0) && (
                          <div className="p-3 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setCurrentFolderId(undefined)}
                                className="flex items-center space-x-1 px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded text-sm font-medium"
                              >
                                <Folder className="w-4 h-4" />
                                <span>My Drive</span>
                              </button>
                              
                              {breadcrumb.map((item, index) => (
                                <div key={item.id} className="flex items-center">
                                  <span className="text-gray-400 mx-1">/</span>
                                  <button
                                    onClick={() => setCurrentFolderId(item.id)}
                                    className="px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded text-sm font-medium"
                                  >
                                    {item.name}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="p-4">
                          {driveLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                          ) : driveError ? (
                            <div className="text-center text-red-600 py-8">{driveError}</div>
                          ) : driveFiles.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                              <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                              <p>No files found</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {driveFiles.map((item) => (
                                <div
                                  key={item.id}
                                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                                  onClick={() => handleDriveFileClick(item)}
                                >
                                  <div className="flex items-center space-x-3">
                                    {getFileIcon(item)}
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                      <p className="text-xs text-gray-500">{item.isFolder ? 'Folder' : formatFileSize(item.size || '0')} • {formatDate(item.modifiedTime)}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Hidden file input for upload */}
                        <input
                          ref={driveFileInputRef}
                          type="file"
                          multiple
                          onChange={handleUploadFile}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Assignment Modal */}
      {showSubmitModal && selectedAssignment && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Submit Assignment: {selectedAssignment.title}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {selectedFile && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setSelectedAssignment(null);
                  setSelectedFile(null);
                }}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAssignment}
                disabled={isLoading || !selectedFile}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Disconnect Google Classroom?
              </h3>
              <p className="text-gray-600 mb-6">
                This will remove your Google Classroom connection and clear all cached data. 
                You'll need to reconnect to access your courses and assignments again.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  disabled={isDisconnecting}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDisconnecting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Disconnecting...</span>
                    </div>
                  ) : (
                    'Disconnect'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Smart Notification Center */}
      <SmartNotificationCenter
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />

      {/* Create Folder Modal */}
      {showCreateFolder && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowCreateFolder(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* File Viewer Modal */}
      {showFileViewer && selectedDriveFile && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] backdrop-blur-md">
          <div className="bg-white rounded-lg shadow-xl w-3/10 h-11/12 max-w-md max-h-5xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {getFileIcon(selectedDriveFile)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedDriveFile.name}</h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedDriveFile.size || '0')} • {formatDate(selectedDriveFile.modifiedTime)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFileViewer(false)}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-auto">
              {isImageFile(selectedDriveFile.name) ? (
                // Image Preview
                <div className="h-full flex flex-col">
                  <div className="flex-1 flex items-center justify-center">
                    {imageLoading ? (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-sm">Loading image...</p>
                      </div>
                    ) : imageUrl ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <img 
                          src={imageUrl}
                          alt={selectedDriveFile.name}
                          className="max-w-[90%] max-h-[80%] object-contain rounded-lg shadow-lg"
                          onLoad={() => {
                            console.log('✅ Image loaded successfully:', imageUrl);
                          }}
                          onError={(e) => {
                            console.error('❌ Image failed to load:', imageUrl);
                            // Try alternative URL
                            handleImageError(selectedDriveFile.id);
                          }}
                        />
                        <div className="hidden text-center py-6">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                            {getFileIcon(selectedDriveFile)}
                          </div>
                          <p className="text-sm text-gray-500 mb-2">Image preview not available</p>
                          <p className="text-xs text-gray-400">This image may be private or require special permissions</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                          {getFileIcon(selectedDriveFile)}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">Image preview not available</p>
                        <p className="text-xs text-gray-400">Unable to load image preview</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center space-x-3 mt-4">
                    <button
                      onClick={() => window.open(selectedDriveFile.webViewLink, '_blank')}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Open in Google Drive
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = `https://drive.google.com/uc?export=download&id=${selectedDriveFile.id}`;
                        link.target = '_blank';
                        link.download = selectedDriveFile.name;
                        link.click();
                      }}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ) : (
                // Non-image file details
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    {getFileIcon(selectedDriveFile)}
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">{selectedDriveFile.name}</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    {formatFileSize(selectedDriveFile.size || '0')} • Modified {formatDate(selectedDriveFile.modifiedTime)}
                  </p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => window.open(selectedDriveFile.webViewLink, '_blank')}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Open in Google Drive
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedDriveFile.webViewLink;
                        link.target = '_blank';
                        link.download = selectedDriveFile.name;
                        link.click();
                      }}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

 
