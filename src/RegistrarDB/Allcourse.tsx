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
  created_at?: string;
  image_url?: string;
}

export const RegistrarGradeViewer: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [courseImages, setCourseImages] = useState<{ [id: string]: string }>({});
  const [imageLoading, setImageLoading] = useState<{ [id: string]: boolean }>({});
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [subjectDetails, setSubjectDetails] = useState<{
    teachers: string[];
    students: string[];
  } | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.from('courses').select('*');
      if (error) {
        setError('Failed to load subjects');
      } else {
        setCourses(data || []);
      }
      setLoading(false);
    };
    fetchCourses();
  }, []);

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

  // Function to fetch subject details (teacher, sections, students)
  const fetchSubjectDetails = async (courseId: string) => {
    setDetailsLoading(true);
    // 1. Get teacher(s) for this subject
    const { data: teacherLinks } = await supabase
      .from('teacher_subjects')
      .select('teacher_id')
      .eq('subject_id', courseId);
    const teacherIds = teacherLinks?.map(link => link.teacher_id) || [];
    let teachers: string[] = [];
    if (teacherIds.length > 0) {
      const { data: teacherRows } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .in('id', teacherIds);
      teachers = teacherRows ? teacherRows.map(t => `${t.first_name} ${t.last_name}`) : [];
    }
    // 2. Get students enrolled in this subject
    const { data: enrollments } = await supabase
      .from('enrollcourse')
      .select('student_id')
      .eq('subject_id', courseId);
    const studentIds = enrollments?.map(e => e.student_id) || [];
    let students: string[] = [];
    if (studentIds.length > 0) {
      const { data: studentRows } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .in('id', studentIds);
      students = studentRows ? studentRows.map(s => `${s.first_name} ${s.last_name}`) : [];
    }
    setSubjectDetails({ teachers, students });
    setDetailsLoading(false);
  };

  const filteredCourses = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(search.toLowerCase()) ||
      course.code.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
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
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
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
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
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
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
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
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
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
          </div>
        </div>

        {/* Subjects Display */}
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No subjects found</h3>
            <p className="text-gray-500 mb-6">
              {search ? 'Try adjusting your search criteria.' : 'No subjects available.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6" style={{ 
            gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`,
            maxHeight: 'calc(5 * (280px + 24px))',
            overflowY: 'auto'
          }}>
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group"
              >
                <div className="relative h-32 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden">
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
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : (
                    <BookOpen className="w-12 h-12 text-blue-400" />
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                      {course.code}
                    </span>
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                      {course.units} Unit{course.units !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{course.name}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{course.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <span>Created {course.created_at ? new Date(course.created_at).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                  <button
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
            ))}
          </div>
        )}
      </div>
      {detailsOpen && selectedCourse && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-lg w-full relative">
            <button onClick={() => setDetailsOpen(false)} className="absolute top-2 right-2 text-gray-500 text-2xl">&times;</button>
            <h2 className="text-2xl font-bold mb-4 text-blue-700">Subject Details</h2>
            <div className="mb-4">
              <span className="font-semibold text-gray-700">Subject:</span>
              <span className="ml-2 text-gray-900">{selectedCourse.name}</span>
            </div>
            {detailsLoading ? (
              <div className="text-center py-8 text-blue-600 font-semibold">Loading...</div>
            ) : subjectDetails ? (
              <>
                <div className="mb-4">
                  <span className="font-semibold text-gray-700">Teacher(s):</span>
                  <span className="ml-2 text-gray-900">{subjectDetails.teachers.length > 0 ? subjectDetails.teachers.join(', ') : 'N/A'}</span>
                </div>
                <div className="mb-2 font-semibold text-gray-700">Enrolled Students:</div>
                <div className="max-h-64 overflow-y-auto border rounded-lg bg-gray-50 p-2">
                  <ul className="list-decimal ml-6">
                    {subjectDetails.students.length === 0 ? (
                      <li className="text-gray-500">No students enrolled</li>
                    ) : (
                      subjectDetails.students.map((student, idx) => (
                        <li key={idx} className="text-gray-800 py-1 border-b last:border-b-0">{student}</li>
                      ))
                    )}
                  </ul>
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
