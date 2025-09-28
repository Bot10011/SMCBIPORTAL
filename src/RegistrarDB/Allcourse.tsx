import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
// import { Database } from '../types/supabase';
import { BookOpen, Search, GraduationCap } from 'lucide-react';
//import { Modal } from '../components/MessageModal'; 
import { createPortal } from 'react-dom';

interface Course {
  id?: string;
  code: string;
  name: string;
  description: string;
  units: number;
  department: string;
  created_at?: string;
  image_url?: string;
}

export const RegistrarGradeViewer: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [courseImages, setCourseImages] = useState<{ [id: string]: string }>({});
  const [imageLoading, setImageLoading] = useState<{ [id: string]: boolean }>({});
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [subjectDetails, setSubjectDetails] = useState<{
    teachers: string[];
    students: { name: string; avatar_url: string | null; year_level: string | number | null; section: string | null; school_id: string | null }[];
  } | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  
  // State to control which program sections are expanded
  const [openPrograms, setOpenPrograms] = useState<{ [program: string]: boolean }>({});
  
  // State for section mapping
  const [sectionMap, setSectionMap] = useState<Map<string, string>>(new Map());
  
  // State to track which subjects have instructors assigned
  const [subjectsWithInstructors, setSubjectsWithInstructors] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('courses').select('*');
      if (error) {
        setError('Failed to load subjects');
      } else {
        setCourses(data || []);
        // Fetch instructor assignments for all courses
        await fetchInstructorAssignments(data || []);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

  // Function to fetch instructor assignments for all courses
  const fetchInstructorAssignments = async (coursesData: Course[]) => {
    try {
      const courseIds = coursesData.map(course => course.id).filter(Boolean);
      if (courseIds.length === 0) return;

      const { data: assignments, error } = await supabase
        .from('teacher_subjects')
        .select('subject_id')
        .in('subject_id', courseIds)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching instructor assignments:', error);
        return;
      }

      // Create a set of course IDs that have instructors assigned
      const assignedSubjects = new Set<string>();
      if (assignments) {
        assignments.forEach(assignment => {
          if (assignment.subject_id) {
            assignedSubjects.add(assignment.subject_id);
          }
        });
      }

      setSubjectsWithInstructors(assignedSubjects);
    } catch (error) {
      console.error('Error in fetchInstructorAssignments:', error);
    }
  };

  // Fetch sections data to map UIDs to names
  useEffect(() => {
    const fetchSections = async () => {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select('id, name');
        
      if (sectionsError) {
        console.error('Sections error:', sectionsError);
        return;
      }
      
      // Create a map of section UIDs to section names
      const map = new Map<string, string>();
      if (sectionsData) {
        sectionsData.forEach(section => {
          map.set(section.id, section.name);
        });
        console.log('Section map created:', map.size, 'entries');
      }
      
      setSectionMap(map);
    };
    
    fetchSections();
  }, []);

  // Map of courseId -> year level from courses table
  const [courseYearsMap, setCourseYearsMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchCourseYears = async () => {
      if (!courses.length) return;
      const { data } = await supabase
        .from('courses')
        .select('id, year_level');
      const map = new Map<string, string>();
      (data || []).forEach((course: { id: string; year_level: string | null }) => {
        if (course.id && course.year_level) {
          // Handle "1st Year", "2nd Year", etc. format
          const yearMatch = String(course.year_level).match(/^(\d+)/);
          if (yearMatch) {
            map.set(course.id, yearMatch[1]);
          }
        }
      });
      setCourseYearsMap(map);
    };
    fetchCourseYears();
  }, [courses]);

  useEffect(() => {
    const fetchImages = async () => {
      const newImages: { [id: string]: string } = {};
      const newLoading: { [id: string]: boolean } = {};
      for (const course of courses) {
        const imagePath = course.image_url;
        if (imagePath && imagePath.trim() !== '' && course.id) {
          newLoading[String(course.id)] = true;
          try {
            const { data: fileData, error: fileError } = await supabase.storage
              .from('course')
              .download(imagePath);
            if (!fileError && fileData) {
              const blobUrl = URL.createObjectURL(fileData);
              newImages[String(course.id)] = blobUrl;
            }
          } catch (error) {
            console.error('Error fetching image for course:', course.id, error);
          } finally {
            newLoading[String(course.id)] = false;
          }
        }
      }
      setCourseImages(newImages);
      setImageLoading(newLoading);
    };
    if (courses.length > 0) fetchImages();
  }, [courses]);

  // Helper function to get student name
  const getStudentName = (student: {display_name?: string, first_name?: string, last_name?: string, middle_name?: string}) => {
    if (student?.display_name && student.display_name.trim() !== '') {
      return student.display_name;
    }
    
    // Fallback to concatenating first_name, last_name, middle_name
    const firstName = student?.first_name || '';
    const lastName = student?.last_name || '';
    const middleName = student?.middle_name || '';
    
    const nameParts = [firstName, middleName, lastName].filter(part => part.trim() !== '');
    return nameParts.length > 0 ? nameParts.join(' ') : 'Unknown Student';
  };

  // Function to fetch subject details (teacher, sections, students)
  const fetchSubjectDetails = async (courseId: string) => {
    setDetailsLoading(true);
    // 1. Get teacher(s) for this subject
    const { data: teacherLinks } = await supabase
      .from('teacher_subjects')
      .select(`
        teacher_id,
        teacher:user_profiles!teacher_subjects_teacher_id_fkey(
          display_name,
          first_name,
          last_name,
          middle_name
        )
      `)
      .eq('subject_id', courseId)
      .eq('is_active', true);
    
    let teachers: string[] = [];
    if (teacherLinks && teacherLinks.length > 0) {
      // Use a Set to track unique teacher IDs to avoid duplicates
      const uniqueTeacherIds = new Set<string>();
      const uniqueTeachers: string[] = [];
      
      teacherLinks.forEach(link => {
        if (link.teacher_id && !uniqueTeacherIds.has(link.teacher_id)) {
          uniqueTeacherIds.add(link.teacher_id);
          
          const teacher = link.teacher as { display_name?: string; first_name?: string; last_name?: string; middle_name?: string } | null;
          let teacherName = '';
          
          if (teacher?.display_name && teacher.display_name.trim() !== '') {
            teacherName = teacher.display_name;
          } else {
            // Fallback to concatenating name parts
            const firstName = teacher?.first_name || '';
            const lastName = teacher?.last_name || '';
            const middleName = teacher?.middle_name || '';
            const nameParts = [firstName, middleName, lastName].filter(part => part.trim() !== '');
            teacherName = nameParts.length > 0 ? nameParts.join(' ') : 'Unknown Teacher';
          }
          
          if (teacherName && teacherName !== 'Unknown Teacher') {
            uniqueTeachers.push(teacherName);
          }
        }
      });
      
      teachers = uniqueTeachers;
    }
    // 2. Get students enrolled in this subject
    const { data: enrollments } = await supabase
      .from('enrollcourse')
      .select('student_id')
      .eq('subject_id', courseId);
    const studentIds = enrollments?.map(e => e.student_id) || [];
    let students: { name: string; avatar_url: string | null; year_level: string | number | null; section: string | null; school_id: string | null }[] = [];
    if (studentIds.length > 0) {
      const { data: studentRows } = await supabase
        .from('user_profiles')
        .select('id, display_name, first_name, last_name, middle_name, avatar_url, year_level, section, student_id, email')
        .in('id', studentIds);
      
      // Get auth users data for avatar fallback
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUsersMap = new Map();
      if (authUsers?.users) {
        authUsers.users.forEach(user => {
          authUsersMap.set(user.id, user.user_metadata?.avatar_url || user.user_metadata?.picture);
        });
      }
      
      students = studentRows
        ? studentRows.map(s => {
            // Convert section UID to name if available
            const sectionName = sectionMap.get(s.section || '') || s.section;
            
            // Get avatar from user_profiles first, then fallback to auth users
            let avatarUrl = (s.avatar_url as string) || null;
            if (!avatarUrl) {
              // Find the corresponding auth user by matching email or other identifier
              const authUser = authUsers?.users?.find(authUser => {
                // Try to match by email if available in user_profiles
                return authUser.email === s.email || authUser.id === s.id;
              });
              avatarUrl = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null;
            }
            
            return {
              name: getStudentName(s),
              avatar_url: avatarUrl,
              year_level: (s.year_level as string | number | null) ?? null,
              section: sectionName,
              school_id: (s.student_id as string | null) ?? null
            };
          })
        : [];
    }
    // Sort students alphabetically by name
    students.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    setSubjectDetails({ teachers, students });
    setDetailsLoading(false);
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.name.toLowerCase().includes(search.toLowerCase()) ||
      course.code.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (!yearFilter) return true;
    const courseYear = courseYearsMap.get(course.id || '');
    return courseYear === yearFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading subjects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <BookOpen className="w-16 h-16 text-red-400" />
        <div className="bg-red-50 text-red-800 border border-red-200 rounded-xl px-6 py-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen from-blue-50 via-white to-indigo-50">
      <div className="mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-2xl mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text w-6 h-6 text-white">
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                  <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                  <path d="M10 9H8"></path>
                  <path d="M16 13H8"></path>
                  <path d="M16 17H8"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Subjects Overview</h1>
                <p className="text-white/80 text-sm font-medium">Review and manage all subjects offered in the institution</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
          <div className="bg-white/90 rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Subjects</p>
                <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white/90 rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Average Units</p>
                <p className="text-3xl font-bold text-gray-900">
                  {courses.length > 0 ? (courses.reduce((sum, course) => sum + (course.units || 0), 0) / courses.length).toFixed(1) : '0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white/90 rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Subjects</p>
                <p className="text-3xl font-bold text-gray-900">{filteredCourses.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white/90 rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search subjects by name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
            <div className="w-full lg:w-48">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full py-3 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">All Year Levels</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subjects grouped by program/department */}
        {(() => {
          const grouped: { [dept: string]: Course[] } = {};
          filteredCourses.forEach(c => {
            const key = c.department || 'BSIT';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(c);
          });
          const programNames = Object.keys(grouped).sort((a,b)=>a.localeCompare(b));
          if (programNames.length === 0) {
            return (
              <div className="bg-white/90 rounded-2xl p-12 text-center shadow-lg border border-gray-100">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No subjects found</h3>
                <p className="text-gray-500 mb-6">
                  {search ? 'Try adjusting your search criteria.' : 'No subjects available.'}
                </p>
              </div>
            );
          }
          return (
            <div className="space-y-6">
              {programNames.map(program => (
                <div key={program} className="bg-white/90 rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-purple-50"
                    onClick={() => setOpenPrograms(prev => ({ ...prev, [program]: !prev[program] }))}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-gray-900">{program}</div>
                        <div className="text-xs text-gray-600">{grouped[program].length} subject(s)</div>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-blue-700">{openPrograms[program] ? 'Hide' : 'View'} Subjects</span>
                  </button>
                  {openPrograms[program] && (
                    <div className="p-5 pt-6">
                      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))` }}>
                        {grouped[program].map((course) => {
                          const hasInstructor = subjectsWithInstructors.has(course.id || '');
                          return (
                            <div
                              key={course.id}
                              className={`rounded-2xl shadow border overflow-hidden hover:shadow-md transition-all duration-300 group ${
                                hasInstructor 
                                  ? 'bg-white border-gray-100' 
                                  : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className={`relative h-32 flex items-center justify-center overflow-hidden ${
                                hasInstructor 
                                  ? 'bg-gradient-to-br from-blue-50 to-indigo-50' 
                                  : 'bg-gradient-to-br from-red-50 to-pink-50'
                              }`}>
                                {imageLoading[String(course.id)] ? (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                  </div>
                                ) : courseImages[String(course.id)] ? (
                                  <img
                                    src={courseImages[String(course.id)]}
                                    alt={course.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error('Image failed to load:', courseImages[String(course.id)]);
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : (
                                  <BookOpen className={`w-12 h-12 ${hasInstructor ? 'text-blue-400' : 'text-red-400'}`} />
                                )}
                              </div>
                              <div className="p-6">
                                <div className="flex items-center justify-between mb-3">
                                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                    hasInstructor 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {course.code}
                                  </span>
                                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                                    {course.units} Unit{course.units !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <h3 className={`text-xl font-bold mb-2 line-clamp-2 ${
                                  hasInstructor ? 'text-gray-900' : 'text-red-900'
                                }`}>{course.name}</h3>
                                <p className={`text-sm mb-4 line-clamp-3 ${
                                  hasInstructor ? 'text-gray-600' : 'text-red-700'
                                }`}>{course.description}</p>
                                <div className="flex items-center justify-between">
                                  <div className={`flex items-center gap-2 text-sm ${
                                    hasInstructor ? 'text-gray-500' : 'text-red-600'
                                  }`}>
                                    <span>Created {course.created_at ? new Date(course.created_at).toLocaleDateString() : '-'}</span>
                                  </div>
                                </div>
                                <button
                                  className={`mt-2 px-4 py-2 rounded-lg transition ${
                                    hasInstructor 
                                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                      : 'bg-red-600 text-white hover:bg-red-700'
                                  }`}
                                  onClick={async () => {
                                    setSelectedCourse(course);
                                    setDetailsOpen(true);
                                    await fetchSubjectDetails(course.id!);
                                  }}
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
      {detailsOpen && selectedCourse && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-3xl w-full relative">
            <button onClick={() => setDetailsOpen(false)} className="absolute top-2 right-2 text-gray-500 text-2xl">&times;</button>
            <h2 className="text-2xl font-bold mb-4 text-black">Subject Details</h2>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm text-gray-500">Subject</div>
                <div className="text-gray-900 font-semibold">{selectedCourse.name}</div>
              </div>
              <div className="flex-1 text-right">
                <div className="text-sm text-gray-500">Instructor</div>
                <div className="text-gray-900 font-semibold">{subjectDetails?.teachers.length ? subjectDetails.teachers.join(', ') : 'N/A'}</div>
              </div>
            </div>
            {detailsLoading ? (
              <div className="text-center py-8 text-blue-600 font-semibold">Loading...</div>
            ) : subjectDetails ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="font-semibold text-gray-700">Enrolled Students</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search student name..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-48 sm:w-60 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{subjectDetails?.students.length || 0}</span>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-lg bg-gray-50 p-3">
                  {subjectDetails.students.length === 0 ? (
                    <div className="text-gray-500 px-2">No students enrolled</div>
                  ) : (
                    <ul className="divide-y">
                      {subjectDetails.students
                        .filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map((student, idx) => (
                        <li key={idx} className="py-2 flex items-center gap-3">
                          <img
                            src={student.avatar_url || '/img/user-avatar.png'}
                            alt={student.name}
                            className="w-8 h-8 rounded-full border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/img/user-avatar.png';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-gray-900 font-medium truncate">{student.name}</div>
                            <div className="text-xs text-gray-600 flex items-center gap-2">
                              {(() => {
                                const sectionPart = student.section ? student.section : '';
                                return <span className="font-semibold">{sectionPart}</span>;
                              })()}
                              <span className="ml-2 text-gray-500">{student.school_id ?? '-'}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">No details found.</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}; 
