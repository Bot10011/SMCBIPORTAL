import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import GradeInputModal from './GradeInput';
import { Loader2, BookOpen, Users, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Class {
  id: string;
  name: string;
  code: string;
  description: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  grade?: number;
}

const ClassManagement: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (user?.id) fetchClasses();
  }, [user?.id]);

  async function fetchClasses() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teacher_subjects')
        .select(`
          id,
          section,
          academic_year,
          semester,
          is_active,
          created_at,
          course:courses(id, code, name, description, units)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudents(classId: string) {
    setLoading(true);
    console.log('fetchStudents called with classId:', classId);
    const { data, error } = await supabase
      .from('enrollcourse')
      .select('student:user_profiles(id, first_name, last_name, email)')
      .eq('subject_id', classId)
      .eq('status', 'active');
    console.log('Supabase data:', data, 'error:', error);
    const students = (data || []).map((enrollment: any) => ({
      ...enrollment.student
    }));
    console.log('Mapped students:', students);
    setStudents(students);
  }

  const handleOpenGradeModal = (student: Student) => {
    setSelectedStudent(student);
    setShowGradeModal(true);
  };

  const handleGradeSaved = () => {
    setShowGradeModal(false);
    if (selectedClass) fetchStudents(selectedClass.id);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BookOpen className="text-blue-600" /> Class Management
      </h1>
      {loading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Users className="text-green-600" /> Assigned Classes
          </h2>
          <ul className="space-y-2">
            {classes.length === 0 ? (
              <li className="text-gray-400">No assigned classes.</li>
            ) : (
              classes.map((cls) => (
                <li key={cls.id}>
                  <button
                    className={`w-full text-left px-4 py-3 rounded-lg border border-gray-200 shadow-sm hover:bg-blue-50 transition flex flex-col gap-1 ${selectedClass?.id === cls.id ? 'bg-blue-100 border-blue-400' : ''}`}
                    onClick={() => {
                      setSelectedClass(cls);
                      fetchStudents(cls.id);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">{cls.course?.name}</span>
                      <span className="text-xs text-gray-500">{cls.course?.code}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex gap-4">
                      <span>Section: {cls.section}</span>
                      <span>Year: {cls.academic_year}</span>
                      <span>Semester: {cls.semester}</span>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Students</h2>
          {selectedClass ? (
            <div className="bg-white rounded-xl shadow p-4">
              {students.length === 0 ? (
                <div className="text-gray-400 text-center py-8">No students enrolled.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{student.first_name} {student.last_name}</td>
                        <td className="px-4 py-2">{student.email}</td>
                        <td className="px-4 py-2">{student.grade !== undefined ? student.grade : <span className="text-gray-400">N/A</span>}</td>
                        <td className="px-4 py-2">
                          <button
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            onClick={() => handleOpenGradeModal(student)}
                          >
                            <Edit3 className="w-4 h-4" /> Grade
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">Select a class to view students.</div>
          )}
        </div>
      </div>
      <GradeInputModal
        open={showGradeModal}
        onClose={() => setShowGradeModal(false)}
        student={selectedStudent}
        classId={selectedClass?.id || ''}
        onGradeSaved={handleGradeSaved}
      />
    </div>
  );
};

export default ClassManagement; 
