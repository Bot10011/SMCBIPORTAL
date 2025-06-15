import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  course_id: string | null;
  year_level: string;
  enrollment_status: string;
  role: string;
  enrolled_courses?: string[];
  department?: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  units: number;
  created_at: string;
  updated_at: string;
}

const RegistrarEnrollment: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch students and courses on component mount
  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'student')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      // First, let's see what columns actually exist
      const { data: tableInfo, error: tableError } = await supabase
        .from('courses')
        .select('*')
        .limit(1);

      if (tableError) {
        console.error('Error checking table structure:', tableError);
        throw tableError;
      }

      // Log the column names to see what we're working with
      console.log('Available columns:', Object.keys(tableInfo?.[0] || {}));

      // Now fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')  // Select all columns first to see what we get
        .order('name', { ascending: true });

      if (coursesError) throw coursesError;
      console.log('First course data:', coursesData?.[0]);  // Log first course to see structure
      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const handleEnrollStudent = async (studentId: string, subjectIds: string[]) => {
    try {
      // First, get current enrollments
      const { data: currentEnrollments, error: fetchError } = await supabase
        .from('enrollcourse')
        .select('subject_id')
        .eq('student_id', studentId);

      if (fetchError) throw fetchError;

      const currentSubjectIds = currentEnrollments?.map(e => e.subject_id) || [];

      // Prepare arrays for new enrollments and removals
      const subjectsToAdd = subjectIds.filter(id => !currentSubjectIds.includes(id));
      const subjectsToRemove = currentSubjectIds.filter(id => !subjectIds.includes(id));

      // Handle new enrollments
      if (subjectsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('enrollcourse')
          .insert(
            subjectsToAdd.map(subjectId => ({
              student_id: studentId,
              subject_id: subjectId,
              status: 'active',
              enrollment_date: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
          );

        if (insertError) throw insertError;
      }

      // Handle course removals
      if (subjectsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('enrollcourse')
          .delete()
          .eq('student_id', studentId)
          .in('subject_id', subjectsToRemove);

        if (deleteError) throw deleteError;
      }

      // Update local state
      setStudents(students.map(student => 
        student.id === studentId 
          ? { ...student, enrolled_courses: subjectIds }
          : student
      ));

      toast.success('Student enrollment updated successfully');
      setSelectedStudent(null);
      setSelectedCourses([]);
    } catch (error) {
      console.error('Error updating enrollments:', error);
      toast.error('Failed to update enrollments');
    }
  };

  // Function to fetch student's current enrollments
  const fetchStudentEnrollments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('enrollcourse')
        .select('subject_id')
        .eq('student_id', studentId)
        .eq('status', 'active');

      if (error) throw error;
      return data?.map(e => e.subject_id) || [];
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      return [];
    }
  };

  // Update the click handler for the Enroll button
  const handleEnrollClick = async (student: Student) => {
    const currentEnrollments = await fetchStudentEnrollments(student.id);
    setSelectedStudent(student);
    setSelectedCourses(currentEnrollments);
    setShowConfirmModal(true);
  };

  // New function to confirm enrollment
  const handleConfirmEnroll = async () => {
    if (!selectedStudent) return;
    try {
      // Update the student's status to 'enrolled'
      const { error } = await supabase
        .from('user_profiles')
        .update({ enrollment_status: 'enrolled' })
        .eq('id', selectedStudent.id);
      if (error) throw error;

      // Prepare COE data
      const studentProfile = selectedStudent;
      // Try to get school_year and semester from the student profile or set as current
      const schoolYear = new Date().getMonth() >= 5
        ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
        : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
      const semester = '1st Semester'; // You may want to fetch this from student profile if available
      const dateIssued = new Date().toISOString();
      // Build subjects array from selectedCourses and courses
      const enrolledSubjects = selectedCourses.map(subjectId => {
        const course = courses.find(c => c.id === subjectId);
        return course ? {
          code: course.code,
          name: course.name,
          department: course.department,
          units: course.units
        } : null;
      }).filter(Boolean);
      // Registrar name (issuer) - replace with actual registrar name if available
      const registrar = 'Registrar';
      // Insert into COE table
      const coePayload = {
        student_id: studentProfile.id, // UUID
        student_number: studentProfile.student_id, // Official student number
        school_year: schoolYear,
        semester: semester,
        year_level: studentProfile.year_level,
        date_issued: dateIssued,
        subjects: enrolledSubjects,
        status: 'active',
        registrar: registrar,
        full_name: `${studentProfile.first_name} ${studentProfile.last_name}`,
        department: courses.find(c => c.id === studentProfile.course_id)?.department || studentProfile.department || '',
        email: studentProfile.email
      };
      console.log('COE Payload:', coePayload); // Debug log
      const { error: coeError, data: coeData } = await supabase
        .from('coe')
        .insert(coePayload);
      if (coeError) {
        console.error('COE Insert Error:', coeError, 'Payload:', coePayload);
        throw coeError;
      }

      toast.success('Student successfully enrolled and COE issued!');
      setShowConfirmModal(false);
      setSelectedStudent(null);
      setSelectedCourses([]);
      fetchStudents();
    } catch (error) {
      toast.error('Failed to enroll student or issue COE');
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || student.enrollment_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Student Enrollment</h1>
          <button
            onClick={fetchStudents}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
          >
            Refresh List
          </button>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="enrolled">Enrolled</option>
              <option value="pending">Pending</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.student_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.last_name}, {student.first_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.year_level}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {courses.find(c => c.id === student.course_id)?.name || 'Not Enrolled'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${student.enrollment_status === 'enrolled' ? 'bg-green-100 text-green-800' : 
                          student.enrollment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {student.enrollment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.enrollment_status === 'pending' ? (
                      <button
                        onClick={() => handleEnrollClick(student)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Enroll
                      </button>
                      ) : (
                        <span className="text-gray-400 cursor-not-allowed">Enroll</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Enrollment Modal */}
        {showConfirmModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Confirm Enrollment
              </h2>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <div><span className="font-medium">Student ID:</span> {selectedStudent.student_id}</div>
                  <div><span className="font-medium">Name:</span> {selectedStudent.last_name}, {selectedStudent.first_name}</div>
                  <div><span className="font-medium">Email:</span> {selectedStudent.email}</div>
                  <div><span className="font-medium">Year Level:</span> {selectedStudent.year_level}</div>
                  <div><span className="font-medium">Current Course:</span> {courses.find(c => c.id === selectedStudent.course_id)?.name || 'Not Enrolled'}</div>
                  <div><span className="font-medium">Status:</span> {selectedStudent.enrollment_status}</div>
                </div>
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Courses for Enrollment</h3>
                  <div className="space-y-2">
                  {selectedCourses.length === 0 ? (
                    <div className="text-sm text-gray-500">No courses selected.</div>
                  ) : (
                    selectedCourses.map(courseId => {
                      const course = courses.find(c => c.id === courseId);
                      return course ? (
                        <div key={courseId} className="text-sm text-gray-600">
                          <span className="font-medium">{course.name}</span> ({course.code})
                        </div>
                      ) : null;
                    })
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedStudent(null);
                    setSelectedCourses([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmEnroll}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Confirm Enrollment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default RegistrarEnrollment; 
