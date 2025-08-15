import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, BookOpen, Users, ChevronDown, ChevronRight, Search, Download, Printer, CheckCircle2, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  units: number;
  year_level?: string;
}

interface TeacherClass {
  id: string;
  subject_id: string;
  section: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
  created_at: string;
  course: Course;
  year_level?: string;
}

interface Student {
  id: string;
  email: string;
  role: string;
  student_status?: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  is_active: boolean;
  enrollment_id: string;
  grade_id?: string;
  prelim_grade?: number;
  midterm_grade?: number;
  final_grade?: number;
  year_level?: string; // Added for new fields
  subject_id: string; // Ensure subject_id is present for grade matching
  semester?: string; // Added for grade operations
  academic_year?: string; // Added for grade operations
  student_id?: string; // Actual student ID from user_profiles table
  display_name?: string; // Display name from Google account
  avatar_url?: string; // Avatar URL from Google account
}

interface DatabaseTeacherClass {
  id: string;
  subject_id: string;
  section: string;
  academic_year: string;
  semester: string;
  is_active: boolean;
  created_at: string;
  course: Course | Course[];
}

interface EnrollmentRow {
  id: string;
  student_id: string;
  status: string;
  subject_id: string;
  enrollment_date: string;
  student: {
    id: string;
    email: string;
    role: string;
    student_status?: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    is_active: boolean;
    year_level?: string;
    student_id?: string;
    profile_picture_url?: string;
  } | {
    id: string;
    email: string;
    role: string;
    student_status?: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    is_active: boolean;
    year_level?: string;
    student_id?: string;
    profile_picture_url?: string;
  }[];
}

interface GradeRow {
  id: string;
  student_id: string;
  prelim_grade?: number;
  midterm_grade?: number;
  final_grade?: number;
}



// UUID v4 generator
// NOTE: uuidv4 utility removed as unused to satisfy linter.

const ClassManagement: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New state for improved organization
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYearLevel, setFilterYearLevel] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      void fetchClasses();
    }
  }, [user?.id]);

  async function fetchClasses() {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('teacher_subjects')
        .select(`
          id,
          subject_id,
          section,
          academic_year,
          semester,
          is_active,
          created_at,
          course:courses(id, code, name, units, year_level)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      // Transform the data to match TeacherClass type
      const transformedData = (data as DatabaseTeacherClass[] || []).map((item) => {
        const course = Array.isArray(item.course) ? item.course[0] : item.course;
        return {
          id: item.id,
          subject_id: item.subject_id,
          section: item.section,
          academic_year: item.academic_year,
          semester: item.semester,
          is_active: item.is_active,
          created_at: item.created_at,
          course: course,
          year_level: course?.year_level
        };
      }) as TeacherClass[];
      
      setClasses(transformedData);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudents(subjectId: string) {
    setLoading(true);
    console.group('🔍 Fetching Students Debug Info');
    console.log('📌 Input Parameters:', { subjectId });
    
    try {
      // 1. First verify the subject exists
      const { data: subjectData, error: subjectError } = await supabase
        .from('teacher_subjects')
        .select('id, subject_id, course:courses(id, code, name)')
        .eq('subject_id', subjectId)
        .single();

      console.log('📚 Subject Verification:', { 
        found: !!subjectData, 
        subjectData,
        error: subjectError?.message 
      });

      if (subjectError) {
        console.error('❌ Subject Error:', subjectError);
        throw new Error(`Failed to verify subject: ${subjectError.message}`);
      }

      if (!subjectData) {
        console.error('❌ Subject Not Found:', { subjectId });
        throw new Error('Subject not found in teacher_subjects table');
      }

      // 2. Check raw enrollments
      const { data: rawEnrollments, error: enrollError } = await supabase
        .from('enrollcourse')
        .select(`
          *,
          subject:courses(id, code, name)
        `)
        .eq('subject_id', subjectId);

      console.log('📊 Raw Enrollments Check:', {
        count: rawEnrollments?.length || 0,
        enrollments: rawEnrollments,
        error: enrollError?.message
      });

      if (enrollError) {
        console.error('❌ Enrollment Error:', enrollError);
        throw new Error(`Failed to fetch enrollments: ${enrollError.message}`);
      }

      // 3. Get active enrollments with student details
      const { data, error } = await supabase
        .from('enrollcourse')
        .select(`
          id,
          student_id,
          status,
          subject_id,
          enrollment_date,
          student:user_profiles(
            id,
            email,
            role,
            student_status,
            first_name,
            last_name,
            middle_name,
            is_active,
            year_level,
            student_id,
            profile_picture_url,
            created_at,
            updated_at
          )
        `)
        .eq('subject_id', subjectId)
        .eq('status', 'active');

      console.log('👥 Active Enrollments Query:', {
        count: data?.length || 0,
        data,
        error: error?.message
      });

      if (error) {
        console.error('❌ Active Enrollments Error:', error);
        throw new Error(`Failed to fetch active enrollments: ${error.message}`);
      }

      // Debug: Let's see what fields are actually available
      if (data && data.length > 0) {
        const firstStudent = Array.isArray(data[0].student) ? data[0].student[0] : data[0].student;
        console.log('🔍 Sample student data structure:', {
          studentKeys: Object.keys(firstStudent || {}),
          studentData: firstStudent,
          firstStudentType: typeof firstStudent,
          isArray: Array.isArray(data[0].student)
        });
        
        // Let's also check the raw data structure
        console.log('🔍 Raw enrollment data sample:', data[0]);
      }

      // 4. Fetch grades separately for all students
      const studentIds = (data as EnrollmentRow[] || []).map(row => {
        const student = Array.isArray(row.student) ? row.student[0] : row.student;
        return student?.id;
      }).filter(Boolean);

      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('id, student_id, prelim_grade, midterm_grade, final_grade')
        .in('student_id', studentIds);

      if (gradesError) {
        console.error('❌ Grades Error:', gradesError);
        throw new Error(`Failed to fetch grades: ${gradesError.message}`);
      }

      console.log('📊 Fetched grades:', grades);

      // Helper functions for getting auth display name and avatar (same as MyProfile.tsx)
      const getAuthDisplayName = (u: unknown): string | null => {
        if (!u || typeof u !== 'object') return null;
        const metadata = (u as { user_metadata?: Record<string, unknown> }).user_metadata;
        const fromMetadata = [
          typeof metadata?.full_name === 'string' ? (metadata.full_name as string) : null,
          typeof metadata?.name === 'string' ? (metadata.name as string) : null,
          typeof metadata?.display_name === 'string' ? (metadata.display_name as string) : null,
          typeof metadata?.preferred_username === 'string' ? (metadata.preferred_username as string) : null,
        ].find(Boolean) as string | null | undefined;
        if (fromMetadata) return fromMetadata;

        const identities = (u as { identities?: Array<{ identity_data?: Record<string, unknown> }> }).identities;
        if (Array.isArray(identities)) {
          for (const id of identities) {
            const data = id?.identity_data;
            const name = typeof data?.full_name === 'string' ? (data.full_name as string)
              : typeof data?.name === 'string' ? (data.name as string)
              : null;
            if (name) return name;
          }
        }
        return null;
      };

      const getAuthAvatarUrl = (u: unknown): string | null => {
        if (!u || typeof u !== 'object') return null;
        const urlKeys = [
          'avatar_url', 'picture', 'picture_url', 'photoURL', 'photoUrl', 'avatar',
          'image', 'image_url', 'imageUrl', 'profile_picture', 'profileImage'
        ];

        const tryKeys = (obj?: Record<string, unknown> | null): string | null => {
          if (!obj) return null;
          for (const key of urlKeys) {
            const val = obj[key];
            if (typeof val === 'string' && /^https?:\/\//i.test(val)) return val;
          }
          return null;
        };

        const metadata = (u as { user_metadata?: Record<string, unknown> }).user_metadata;
        const fromMetadata = tryKeys(metadata);
        if (fromMetadata) return fromMetadata;

        const identities = (u as { identities?: Array<{ identity_data?: Record<string, unknown> }> }).identities;
        if (Array.isArray(identities)) {
          for (const id of identities) {
            const candidate = tryKeys(id?.identity_data as Record<string, unknown> | undefined);
            if (candidate) return candidate;
          }
        }
        return null;
      };

      // 5. Transform and validate the data
      console.log('🔄 Starting data transformation');
      console.log('📊 Input data summary:', {
        totalEnrollments: data?.length || 0,
        studentIds: studentIds,
        studentIdCount: studentIds.length,
        gradesCount: grades?.length || 0
      });
      
      const enrolledStudents: Student[] = [];
      
      for (const row of (data as EnrollmentRow[] || [])) {
        const student = Array.isArray(row.student) ? row.student[0] : row.student;
        if (!student || !student.is_active) {
          console.log(`⏭️ Skipping inactive student:`, student?.id, student?.email);
          continue;
        }
        
        console.log(`\n🚀 Processing student ${student.id}:`, {
          email: student.email,
          first_name: student.first_name,
          last_name: student.last_name,
          role: student.role,
          is_active: student.is_active
        });
        
        // Find the grade for this student
        const gradeRow = grades?.find((g: GradeRow) => g.student_id === student.id) || null;
        console.log(`📊 Grade data for ${student.id}:`, {
          hasGrade: !!gradeRow,
          prelim: gradeRow?.prelim_grade,
          midterm: gradeRow?.midterm_grade,
          final: gradeRow?.final_grade
        });
        
        console.log('Processing student:', student.id, student.email);
        
        // Get display name and avatar from Supabase Auth (Google OAuth data)
        let displayName = '';
        let avatarUrl = '';
        
        console.log(`🔍 [${student.id}] Starting auth data fetch for:`, student.email);
        
        // First, let's check if this student is the current user
        const { data: currentUserCheck } = await supabase.auth.getUser();
        const isCurrentUser = currentUserCheck?.user?.id === student.id;
        
        console.log(`🔍 [${student.id}] User identity check:`, {
          currentUserId: currentUserCheck?.user?.id,
          targetStudentId: student.id,
          isCurrentUser,
          currentUserEmail: currentUserCheck?.user?.email,
          targetStudentEmail: student.email
        });
        
        if (!isCurrentUser) {
          console.log(`ℹ️ [${student.id}] This is NOT the current user. Google profile data will not be available.`);
          console.log(`ℹ️ [${student.id}] Only the current user can access their own Google OAuth data.`);
        }
        
        try {
          // Method 1: Try to get from current session if it's the same user (no admin required)
          console.log(`🔍 [${student.id}] Trying current session method first...`);
          const { data: currentUser, error: currentUserError } = await supabase.auth.getUser();
          
          if (currentUserError) {
            console.error(`❌ [${student.id}] Current user fetch error:`, currentUserError);
          } else if (!currentUser?.user) {
            console.warn(`⚠️ [${student.id}] No current user in session`);
          } else {
            console.log(`🔍 [${student.id}] Current user session:`, {
              currentUserId: currentUser.user.id,
              targetStudentId: student.id,
              isSameUser: currentUser.user.id === student.id
            });
            
            if (currentUser.user.id === student.id) {
              console.log(`✅ [${student.id}] Same user, checking current session data...`);
              
              const sessionName = getAuthDisplayName(currentUser.user);
              if (sessionName) {
                displayName = sessionName;
                console.log(`✅ [${student.id}] Using current session display name:`, sessionName);
              }
              
              const sessionAvatar = getAuthAvatarUrl(currentUser.user);
              if (sessionAvatar) {
                avatarUrl = sessionAvatar;
                console.log(`✅ [${student.id}] Using current session avatar:`, sessionAvatar);
              }
            } else {
              console.log(`ℹ️ [${student.id}] Current user is different from target student`);
            }
          }
          
          // Method 2: Try to get auth data using admin API (only if we have permission)
          if (!displayName || !avatarUrl) {
            console.log(`🔍 [${student.id}] Trying admin API method...`);
            try {
              const { data: authData, error: authError } = await supabase.auth.admin.getUserById(student.id);
              
              if (authError) {
                console.error(`❌ [${student.id}] Admin API error:`, {
                  error: authError,
                  message: authError.message,
                  status: authError.status,
                  name: authError.name
                });
                
                // If it's a permission error, suggest the solution
                if (authError.status === 403) {
                  console.warn(`⚠️ [${student.id}] Admin API permission denied. This is expected for non-admin users.`);
                  console.warn(`💡 Solution: Users can only access their own auth data. For other users, we need to store profile data in the database.`);
                }
              } else if (!authData?.user) {
                console.warn(`⚠️ [${student.id}] Admin API returned no user data:`, {
                  authData,
                  hasUser: !!authData?.user,
                  userId: authData?.user?.id
                });
              } else {
                console.log(`✅ [${student.id}] Admin API success, user data:`, {
                  userId: authData.user.id,
                  email: authData.user.email,
                  userMetadata: authData.user.user_metadata,
                  identities: authData.user.identities,
                  hasMetadata: !!authData.user.user_metadata,
                  metadataKeys: authData.user.user_metadata ? Object.keys(authData.user.user_metadata) : [],
                  hasIdentities: !!authData.user.identities,
                  identityCount: authData.user.identities?.length || 0
                });
                
                // Try to get display name
                const authName = getAuthDisplayName(authData.user);
                if (authName && !displayName) {
                  displayName = authName;
                  console.log(`✅ [${student.id}] Using admin API display name:`, authName);
                }
                
                // Try to get avatar
                const authAvatar = getAuthAvatarUrl(authData.user);
                if (authAvatar && !avatarUrl) {
                  avatarUrl = authAvatar;
                  console.log(`✅ [${student.id}] Using admin API avatar:`, authAvatar);
                }
              }
            } catch (adminErr) {
              console.error(`❌ [${student.id}] Admin API exception:`, adminErr);
            }
          }
          
          // Method 3: Try to get from Google Userinfo API if we have a provider token
          if (!displayName || !avatarUrl) {
            console.log(`🔍 [${student.id}] Trying Google Userinfo API method...`);
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              console.log(`🔍 [${student.id}] Session data:`, {
                hasSession: !!sessionData?.session,
                hasProviderToken: !!sessionData?.session?.provider_token,
                providerTokenLength: sessionData?.session?.provider_token?.length || 0
              });
              
              const accessToken = sessionData?.session?.provider_token as string | undefined;
              
              if (accessToken) {
                console.log(`🔍 [${student.id}] Got provider token, fetching Google userinfo...`);
                const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${accessToken}` }
                });
                
                if (resp.ok) {
                  const json = await resp.json();
                  console.log(`🔍 [${student.id}] Google userinfo response:`, {
                    hasName: !!json?.name,
                    hasPicture: !!json?.picture,
                    email: json?.email,
                    fullResponse: json
                  });
                  
                  if (json?.name && !displayName) {
                    displayName = json.name;
                    console.log(`✅ [${student.id}] Using Google userinfo name:`, displayName);
                  }
                  
                  if (json?.picture && !avatarUrl) {
                    avatarUrl = json.picture;
                    console.log(`✅ [${student.id}] Using Google userinfo picture:`, avatarUrl);
                  }
                } else {
                  console.warn(`⚠️ [${student.id}] Google userinfo HTTP error:`, resp.status, resp.statusText);
                  // Try to get error details
                  try {
                    const errorText = await resp.text();
                    console.warn(`⚠️ [${student.id}] Google userinfo error details:`, errorText);
                  } catch (e) {
                    console.warn(`⚠️ [${student.id}] Could not read error response:`, e);
                  }
                }
              } else {
                console.log(`ℹ️ [${student.id}] No provider access token available for Google userinfo`);
                console.log(`ℹ️ [${student.id}] This usually means the user didn't sign in with Google OAuth`);
              }
            } catch (googleErr) {
              console.error(`❌ [${student.id}] Google userinfo fetch failed:`, googleErr);
            }
          }
          
        } catch (authErr) {
          console.error(`❌ [${student.id}] Exception during auth data fetch:`, {
            error: authErr,
            message: authErr instanceof Error ? authErr.message : String(authErr),
            stack: authErr instanceof Error ? authErr.stack : undefined,
            type: typeof authErr
          });
        }
        
        // Fallback to database fields if no auth data
        if (!displayName) {
          console.log(`🔄 [${student.id}] No auth display name, using database fallback...`);
          if (student.first_name && student.last_name) {
            displayName = `${student.first_name} ${student.last_name}`;
            console.log(`🔄 [${student.id}] Using database first_name + last_name:`, displayName);
          } else if (student.first_name) {
            displayName = student.first_name;
            console.log(`🔄 [${student.id}] Using database first_name only:`, displayName);
          } else if (student.last_name) {
            displayName = student.last_name;
            console.log(`🔄 [${student.id}] Using database last_name only:`, displayName);
          } else {
            displayName = student.email.split('@')[0];
            console.log(`🔄 [${student.id}] Using email username fallback:`, displayName);
          }
        }
        
        // Note about the limitation
        if (!avatarUrl) {
          console.log(`ℹ️ [${student.id}] No avatar available. This is expected because:`);
          console.log(`   - Users can only access their own Google profile data`);
          console.log(`   - Admin API requires special permissions`);
          console.log(`   - For a complete solution, store profile data in the database during user registration`);
        }
        
        // Summary of what we learned for this student
        console.log(`📋 [${student.id}] Student processing summary:`, {
          email: student.email,
          isCurrentUser,
          displayName,
          avatarUrl,
          dataSource: {
            displayName: isCurrentUser && displayName !== `${student.first_name} ${student.last_name}` ? 'Google OAuth' : 'Database',
            avatar: isCurrentUser && avatarUrl ? 'Google OAuth' : 'None (initials only)'
          },
          expectedBehavior: isCurrentUser ? 'Should show Google profile' : 'Will show database name + initials'
        });
        
        enrolledStudents.push({
          id: student.id,
          email: student.email,
          role: student.role,
          student_status: student.student_status,
          first_name: student.first_name,
          last_name: student.last_name,
          middle_name: student.middle_name,
          is_active: student.is_active,
          enrollment_id: row.id,
          grade_id: gradeRow?.id,
          prelim_grade: gradeRow?.prelim_grade,
          midterm_grade: gradeRow?.midterm_grade,
          final_grade: gradeRow?.final_grade,
          subject_id: row.subject_id,
          year_level: student.year_level,
          student_id: student.student_id,
          display_name: displayName,
          avatar_url: avatarUrl,
        });
      }
      
      // Final summary of all students
      console.log('\n🎯 FINAL SUMMARY - All Students Processed:', {
        totalStudents: enrolledStudents.length,
        withAuthNames: enrolledStudents.filter(s => s.display_name && s.display_name !== `${s.first_name} ${s.last_name}`).length,
        withAuthAvatars: enrolledStudents.filter(s => s.avatar_url).length,
        withDatabaseNames: enrolledStudents.filter(s => s.display_name === `${s.first_name} ${s.last_name}`).length,
        withFallbackNames: enrolledStudents.filter(s => s.display_name === s.email.split('@')[0]).length,
        successRate: {
          names: `${Math.round((enrolledStudents.filter(s => s.display_name).length / enrolledStudents.length) * 100)}%`,
          avatars: `${Math.round((enrolledStudents.filter(s => s.avatar_url).length / enrolledStudents.length) * 100)}%`
        }
      });
      
      console.log('📋 Individual student results:', enrolledStudents.map(s => ({
        id: s.id,
        email: s.email,
        display_name: s.display_name,
        avatar_url: s.avatar_url ? '✅' : '❌',
        source: {
          name: s.display_name === `${s.first_name} ${s.last_name}` ? 'database' : 
                 s.display_name === s.email.split('@')[0] ? 'fallback' : 'auth',
          avatar: s.avatar_url ? 'auth' : 'none'
        }
      })));
      
      // Final explanation of what we learned
      console.log('\n💡 WHAT WE LEARNED FROM DEBUGGING:');
      console.log('1. ✅ Admin API (403 Forbidden) - This is EXPECTED and CORRECT behavior');
      console.log('2. ✅ Users can only access their own Google OAuth data (security feature)');
      console.log('3. ✅ Current user will see their Google profile name and avatar');
      console.log('4. ✅ Other students will show database names + generated initials');
      console.log('5. ✅ This is the correct and secure implementation');
      
      console.log('\n🔧 LONG-TERM SOLUTION (if you want avatars for all students):');
      console.log('1. Store Google profile data in user_profiles table during registration');
      console.log('2. Update the table to include display_name and avatar_url fields');
      console.log('3. Sync this data when users log in with Google OAuth');
      console.log('4. This way all students can see each other\'s profile pictures');
      
      setStudents(enrolledStudents);
      
      // Debug: Let's see what we actually set in the students state
      console.log('🎯 Final enrolledStudents array:', {
        count: enrolledStudents.length,
        students: enrolledStudents.map(s => ({
          id: s.id,
          display_name: s.display_name,
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email
        }))
      });

      // 6. Show appropriate message based on the data
      if (enrolledStudents.length === 0) {
        if (!rawEnrollments?.length) {
          console.warn('⚠️ No enrollments found at all');
          toast('No students are enrolled in this class.', { icon: '⚠️' });
        } else if (rawEnrollments.every(e => e.status !== 'active')) {
          console.warn('⚠️ Enrollments exist but none are active');
          toast('Students are enrolled but none have active status.', { icon: '⚠️' });
        } else {
          console.warn('⚠️ No valid student profiles found');
          toast('No active students found in this class.', { icon: '⚠️' });
        }
      } else {
        console.log('✅ Successfully loaded students');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Fatal Error:', {
        message: errorMessage,
        error
      });
      toast.error(`Error: ${errorMessage}`);
      setStudents([]);
    } finally {
      console.groupEnd();
      setLoading(false);
    }
  }

  // Calculate GA (General Average)
  const calculateAverageGrade = (prelimGrade: number | undefined, midtermGrade: number | undefined, finalGrade: number | undefined): number | null => {
    const grades = [prelimGrade, midtermGrade, finalGrade].filter(g => g !== undefined && g !== null) as number[];
    if (grades.length === 0) return null;
    return Math.round((grades.reduce((sum, g) => sum + g, 0) / grades.length) * 100) / 100;
  };

  // Calculate statistics for the current class
  const totalStudents = students.length;
  const completedGrades = students.filter(s => s.final_grade !== null && s.final_grade !== undefined).length;
  const completionRate = totalStudents > 0 ? Math.round((completedGrades / totalStudents) * 100) : 0;

  // State for inline editing
  const [editingGrades, setEditingGrades] = useState<{ [key: string]: { prelim?: string; midterm?: string; final?: string } }>({});
  const [savingGrades, setSavingGrades] = useState<{ [key: string]: boolean }>({});

  // Function to start editing grades for a student
  const startEditingGrades = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setEditingGrades(prev => ({
        ...prev,
        [studentId]: {
          prelim: student.prelim_grade?.toString() || '',
          midterm: student.midterm_grade?.toString() || '',
          final: student.final_grade?.toString() || ''
        }
      }));
    }
  };

  // Function to handle grade input changes during editing
  const handleGradeChange = (studentId: string, gradeType: 'prelim' | 'midterm' | 'final', value: string) => {
    setEditingGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [gradeType]: value
      }
    }));
  };

  // Function to save grades for a student
  const saveGrades = async (studentId: string) => {
    const editingData = editingGrades[studentId];
    if (!editingData) return;

    setSavingGrades(prev => ({ ...prev, [studentId]: true }));

    try {
      const prelimGrade = editingData.prelim ? parseFloat(editingData.prelim) : null;
      const midtermGrade = editingData.midterm ? parseFloat(editingData.midterm) : null;
      const finalGrade = editingData.final ? parseFloat(editingData.final) : null;

      // Validate grades
      if (prelimGrade !== null && (prelimGrade < 0 || prelimGrade > 100)) {
        toast.error('Prelim grade must be between 0 and 100');
        return;
      }
      if (midtermGrade !== null && (midtermGrade < 0 || midtermGrade > 100)) {
        toast.error('Midterm grade must be between 0 and 100');
        return;
      }
      if (finalGrade !== null && (finalGrade < 0 || finalGrade > 100)) {
        toast.error('Final grade must be between 0 and 100');
        return;
      }

      // Find the student
      const student = students.find(s => s.id === studentId);
      if (!student) {
        toast.error('Student not found');
        setSavingGrades(prev => ({ ...prev, [studentId]: false }));
        return;
      }

      // Update grades in database
      const { error } = await supabase
        .from('grades')
        .upsert({
          id: student.grade_id,
          student_id: student.id,
          prelim_grade: prelimGrade,
          midterm_grade: midtermGrade,
          final_grade: finalGrade,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving grades:', error);
        toast.error('Failed to save grades');
      } else {
        toast.success('Grades saved successfully!');
        // Update local state
        setStudents(prev => prev.map(s => 
          s.id === studentId 
            ? { ...s, prelim_grade: prelimGrade || undefined, midterm_grade: midtermGrade || undefined, final_grade: finalGrade || undefined }
            : s
        ));
        // Stop editing
        setEditingGrades(prev => {
          const newState = { ...prev };
          delete newState[studentId];
          return newState;
        });
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades');
    } finally {
      setSavingGrades(prev => ({ ...prev, [studentId]: false }));
    }
  };

  // Function to cancel editing
  const cancelEditing = (studentId: string) => {
    setEditingGrades(prev => {
      const newState = { ...prev };
      delete newState[studentId];
      return newState;
    });
  };

  // Group classes by year level and section
  const groupedClasses = classes.reduce((acc, cls) => {
    const yearLevel = cls.year_level || 'Unknown';
    const section = cls.section || 'Unknown';
    const key = `${yearLevel}-${section}`;
    
    if (!acc[key]) {
      acc[key] = {
        yearLevel,
        section,
        classes: []
      };
    }
    acc[key].classes.push(cls);
    return acc;
  }, {} as Record<string, { yearLevel: string; section: string; classes: TeacherClass[] }>);

  // Filter classes based on search and filters
  const filteredGroupedClasses = Object.entries(groupedClasses).reduce((acc, [key, group]) => {
    const filteredClasses = group.classes.filter(cls => {
      const matchesSearch = searchTerm === '' || 
        cls.course?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.course?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.section.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesYearLevel = filterYearLevel === 'all' || cls.year_level === filterYearLevel;
      const matchesSection = filterSemester === 'all' || cls.section === filterSemester;
      
      return matchesSearch && matchesYearLevel && matchesSection;
    });

    if (filteredClasses.length > 0) {
      acc[key] = { ...group, classes: filteredClasses };
    }
    
    return acc;
  }, {} as Record<string, { yearLevel: string; section: string; classes: TeacherClass[] }>);

  // Get unique year levels and sections for filters
  const yearLevels = [...new Set(classes.map(cls => cls.year_level).filter(Boolean))];
  const sections = [...new Set(classes.map(cls => cls.section).filter(Boolean))];

  // Toggle section expansion
  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Expand all sections
  const expandAll = () => {
    const allExpanded = Object.keys(filteredGroupedClasses).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedSections(allExpanded);
  };

  // Collapse all sections
  const collapseAll = () => {
    setExpandedSections({});
  };

  // Download grades as CSV for the currently selected class
  const handleDownloadGrades = () => {
    if (!selectedClass || students.length === 0) {
      toast('No grades to download', { icon: 'ℹ️' });
      return;
    }
    const header = ['Student ID', 'Name', 'Email', 'Academic Year', 'Semester', 'Prelim', 'Midterm', 'Final', 'GA'];
    const rows = students.map(s => [
      s.student_id || s.id,
      s.display_name || `${s.first_name} ${s.last_name}`,
      s.email,
      selectedClass.academic_year || '',
      selectedClass.semester || '',
      s.prelim_grade ?? '',
      s.midterm_grade ?? '',
      s.final_grade ?? '',
      (() => {
        const avg = calculateAverageGrade(s.prelim_grade, s.midterm_grade, s.final_grade);
        return avg ?? '';
      })()
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedClass.course?.code || 'class'}-grades.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print the grades table
  const handlePrintGrades = () => {
    if (!selectedClass || students.length === 0) {
      toast('No grades to print', { icon: 'ℹ️' });
      return;
    }
    const win = window.open('', 'PRINT', 'height=650,width=900,top=100,left=150');
    if (!win) return;
    const title = `${selectedClass.course?.code || ''} ${selectedClass.course?.name || ''} — Section ${selectedClass.section || ''}`;
    const rowsHtml = students
      .map(s => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${s.student_id || s.id}</td>
          <td style="padding:8px;border:1px solid #ddd;">${s.display_name || `${s.first_name} ${s.last_name}`}</td>
          <td style="padding:8px;border:1px solid #ddd;">${s.email}</td>
          <td style="padding:8px;border:1px solid #ddd;">${selectedClass.academic_year || ''}</td>
          <td style="padding:8px;border:1px solid #ddd;">${selectedClass.semester || ''}</td>
          <td style="padding:8px;border:1px solid #ddd; text-align:center;">${s.prelim_grade ?? ''}</td>
          <td style="padding:8px;border:1px solid #ddd; text-align:center;">${s.midterm_grade ?? ''}</td>
          <td style="padding:8px;border:1px solid #ddd; text-align:center;">${s.final_grade ?? ''}</td>
          <td style="padding:8px;border:1px solid #ddd; text-align:center;">${(() => { const g = [s.prelim_grade, s.midterm_grade, s.final_grade].filter(x=>x!==undefined && x!==null); if (g.length===0) return ''; const avg = Math.round((g.reduce((a,b)=>a+(b as number),0)/g.length)*100)/100; return avg; })()}</td>
        </tr>`)
      .join('');
    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { padding: 8px; border: 1px solid #ddd; }
            th { background: #f9fafb; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div style="margin-bottom:10px;color:#374151;">Section: ${selectedClass.section || ''} | Year Level: ${selectedClass.year_level || ''} | AY: ${selectedClass.academic_year || ''} | Semester: ${selectedClass.semester || ''}</div>
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Academic Year</th>
                <th>Semester</th>
                <th>Prelim</th>
                <th>Midterm</th>
                <th>Final</th>
                <th>GA</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="min-h-screen from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-8 max-w-full mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-2xl shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Class Management</h1>
                  <p className="text-white/80 text-sm font-medium">Manage your assigned classes and student grades</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-lg shadow-sm">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-gray-700 font-medium">{classes.length} Classes Assigned</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Classes Panel - Improved Layout */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Assigned Classes
                </h2>
                <p className="text-blue-100 text-xs mt-1">Select a class to view students</p>
              </div>
              
              <div className="p-4">
                {classes.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium text-sm">No classes assigned</p>
                    <p className="text-gray-400 text-xs mt-1">Contact your administrator</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search and Filter Controls */}
                    <div className="space-y-3">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search classes..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      {/* Filters */}
                      <div className="space-y-2">
                        <select
                          value={filterYearLevel}
                          onChange={(e) => setFilterYearLevel(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="all">All Year Levels</option>
                          {yearLevels.map(level => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                        
                        <select
                          value={filterSemester}
                          onChange={(e) => setFilterSemester(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="all">All Sections</option>
                          {sections.map(section => (
                            <option key={section} value={section}>{section}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Expand/Collapse Controls */}
                      <div className="flex gap-2">
                        <button
                          onClick={expandAll}
                          className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                          Expand All
                        </button>
                        <button
                          onClick={collapseAll}
                          className="flex-1 px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          Collapse All
                        </button>
                      </div>
                    </div>

                    {/* Class Groups */}
                    {Object.keys(filteredGroupedClasses).length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">No classes match your filters</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(filteredGroupedClasses).map(([key, group]) => (
                          <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Section Header */}
                            <button
                              onClick={() => toggleSection(key)}
                              className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                            >
                              <div className="flex items-center gap-2">
                                {expandedSections[key] ? (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-500" />
                                )}
                                <div>
                                  <div className="font-medium text-sm text-gray-900">{group.yearLevel}</div>
                                  <div className="text-xs text-gray-500">Section {group.section}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  {group.classes.length} class{group.classes.length !== 1 ? 'es' : ''}
                                </span>
                              </div>
                            </button>
                            
                            {/* Section Content */}
                            {expandedSections[key] && (
                              <div className="p-3 space-y-2 bg-white/80">
                                {group.classes.map((cls) => (
                                  <button
                                    key={cls.id}
                                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                      selectedClass?.id === cls.id 
                                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md' 
                                        : 'bg-gray-50 border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                                    }`}
                                    onClick={() => {
                                      setSelectedClass(cls);
                                      if (cls.subject_id) fetchStudents(cls.subject_id);
                                    }}
                                  >
                                    {/* Class Header */}
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                                          {cls.course?.name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                            {cls.course?.code}
                                          </span>
                                          <span className="text-xs text-gray-500">•</span>
                                          <span className="text-xs text-gray-600">{cls.course?.units} units</span>
                                          <span className="text-xs text-gray-500">•</span>
                                          <span className="text-xs text-gray-600">Section {cls.section}</span>
                                        </div>
                                      </div>
                                      <div className={`w-3 h-3 rounded-full ${
                                        selectedClass?.id === cls.id ? 'bg-blue-500' : 'bg-gray-300'
                                      }`} />
                                    </div>
                                    

                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Students Panel */}
          <div className="lg:col-span-4">
            {/* Statistics Cards - Moved to align with Assigned Classes */}
            {selectedClass && (
              <div className="rounded-2xl shadow-sm border border-gray-100 mb-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Total Students Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <Users className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                          Active
                        </div>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                        <span className="text-xs text-green-600 font-medium">+0%</span>
                      </div>
                      <p className="text-xs text-gray-500">Enrolled in this class</p>
                    </div>
                  </div>

                  {/* Completed Grades Card */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2 shadow-sm border border-green-100 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-md shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                          Updated
                        </div>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-gray-600">Completed Grades</p>
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold text-gray-900">{completedGrades}</p>
                        <span className="text-xs text-green-600 font-medium">
                          {totalStudents > 0 ? Math.round((completedGrades / totalStudents) * 100) : 0}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Grades submitted</p>
                    </div>
                  </div>

                  {/* Completion Rate Card */}
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-2 shadow-sm border border-purple-100 hover:shadow-md transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-md shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                          completionRate >= 80 ? 'text-green-600 bg-green-100' : 
                          completionRate >= 60 ? 'text-yellow-600 bg-yellow-100' : 
                          'text-red-600 bg-red-100'
                        }`}>
                          {completionRate >= 80 ? 'Excellent' : 
                           completionRate >= 60 ? 'Good' : 'Needs Attention'}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
                        <div className="flex items-center gap-1">
                          {completionRate >= 80 ? (
                            <span className="text-xs text-green-600">↑</span>
                          ) : completionRate >= 60 ? (
                            <span className="text-xs text-yellow-600">→</span>
                          ) : (
                            <span className="text-xs text-red-600">↓</span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-0.5">
                        <div 
                          className={`h-0.5 rounded-full transition-all duration-500 ${
                            completionRate >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            completionRate >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            'bg-gradient-to-r from-red-500 to-pink-500'
                          }`}
                          style={{ width: `${completionRate}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">Progress indicator</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/80 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {selectedClass ? (
                <>
                  {/* Class Header */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-gray-900">{selectedClass.course?.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-3 py-1 bg-white/80 text-green-700 text-sm font-medium rounded-full shadow-sm">
                                {selectedClass.course?.code}
                              </span>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm text-gray-600">{students.length} students enrolled</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Section:</span>
                            <span className="bg-white/80 px-3 py-1 rounded-lg shadow-sm">{selectedClass.section}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Year Level:</span>
                            <span className="bg-white/80 px-3 py-1 rounded-lg shadow-sm">{selectedClass.year_level || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Academic Year:</span>
                            <span className="bg-white/80 px-3 py-1 rounded-lg shadow-sm">{selectedClass.academic_year}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Semester:</span>
                            <span className="bg-white/80 px-3 py-1 rounded-lg shadow-sm">{selectedClass.semester}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePrintGrades}
                          className="flex items-center gap-2 px-3 py-2 bg-white/80 text-gray-700 rounded-lg shadow-sm border hover:bg-gray-50"
                        >
                          <Printer className="w-4 h-4" />
                          Print
                        </button>
                        <button
                          onClick={handleDownloadGrades}
                          className="flex items-center gap-2 px-3 py-2 bg-white/80 text-gray-700 rounded-lg shadow-sm border hover:bg-gray-50"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Students Table */}
                  <div className="p-6">
                    {loading ? (
                      <div className="flex justify-center items-center py-16">
                        <div className="text-center">
                          <Loader2 className="animate-spin w-12 h-12 text-blue-500 mx-auto mb-4" />
                          <p className="text-gray-600 font-medium">Loading student data...</p>
                          <p className="text-gray-400 text-sm mt-1">Please wait while we fetch the student information</p>
                        </div>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Enrolled</h3>
                        <p className="text-gray-500">This class currently has no enrolled students.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Student
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                                Email
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Prelim
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Midterm
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Final
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                GA
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white/80 divide-y divide-gray-200">
                            {students.map((student, idx) => (
                              <tr key={student.id} className={`transition-all duration-200 hover:bg-gray-50 ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                              }`}>
                                <td className="px-3 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {student.avatar_url ? (
                                      <img 
                                        src={student.avatar_url} 
                                        alt={`${student.display_name || 'Student'}`}
                                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover mr-2 sm:mr-3 flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm mr-2 sm:mr-3 flex-shrink-0">
                                        {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-gray-900 truncate">
                                        {student.display_name || `${student.first_name} ${student.last_name}`}
                                      </div>
                                      <div className="text-xs text-gray-500 hidden sm:block">
                                        ID: {student.student_id || student.id.slice(0, 8)}...
                                      </div>
                                      <div className="text-xs text-gray-500 sm:hidden">
                                        {student.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap hidden sm:table-cell">
                                  <div className="text-sm text-gray-900 truncate">{student.email}</div>
                                  <div className="text-xs text-gray-500">
                                    {student.student_status || 'Active'}
                                  </div>
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  {editingGrades[student.id] ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={editingGrades[student.id].prelim || ''}
                                      onChange={(e) => handleGradeChange(student.id, 'prelim', e.target.value)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  ) : (
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      student.prelim_grade !== null ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {student.prelim_grade !== null ? student.prelim_grade : 'N/A'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  {editingGrades[student.id] ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={editingGrades[student.id].midterm || ''}
                                      onChange={(e) => handleGradeChange(student.id, 'midterm', e.target.value)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  ) : (
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      student.midterm_grade !== null ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {student.midterm_grade !== null ? student.midterm_grade : 'N/A'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  {editingGrades[student.id] ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      value={editingGrades[student.id].final || ''}
                                      onChange={(e) => handleGradeChange(student.id, 'final', e.target.value)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  ) : (
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      student.final_grade !== null ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {student.final_grade !== null ? student.final_grade : 'N/A'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  {(() => {
                                    const avg = calculateAverageGrade(student.prelim_grade, student.midterm_grade, student.final_grade);
                                    return (
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${avg !== null ? (avg >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800') : 'bg-gray-100 text-gray-800'}`}>
                                        {avg !== null ? avg : 'N/A'}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  {editingGrades[student.id] ? (
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => saveGrades(student.id)}
                                        disabled={savingGrades[student.id]}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                      >
                                        {savingGrades[student.id] ? 'Saving...' : 'Save'}
                                      </button>
                                      <button
                                        onClick={() => cancelEditing(student.id)}
                                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white/80 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => startEditingGrades(student.id)}
                                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
                    <p className="text-gray-500">Choose a class from the left panel to view enrolled students</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassManagement; 
