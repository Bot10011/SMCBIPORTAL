import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Eye, EyeOff, CheckCircle2, Clock, Users, BookOpen } from 'lucide-react';

interface Grade {
  id: string;
  student_id: string;
  final_grade: number | null;
  midterm_grade: number | null;
  prelim_grade: number | null;
  remarks: string | null;
  graded_by: string | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
  is_released: boolean;
  student_name?: string;
  school_id?: string;
}

export default function StudentGrades() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    setError(null);
    // Fetch grades first
    const { data: gradesData, error: gradesError } = await supabase
      .from('grades')
      .select('*')
      .order('created_at', { ascending: false });
    if (gradesError) {
      setError('Failed to load grades');
      setLoading(false);
      return;
    }
    // Fetch student info for all unique student_ids (school ids)
    const schoolIds = (gradesData || []).map(g => g.student_id);
    const { data: studentsData, error: studentsError } = await supabase
      .from('user_profiles')
      .select('student_id, first_name, last_name, middle_name')
      .in('student_id', schoolIds);
    if (studentsError) {
      setError('Failed to load student info');
      setLoading(false);
      return;
    }
    const studentMap = new Map();
    (studentsData || []).forEach(s => {
      if (!studentMap.has(s.student_id)) {
        studentMap.set(s.student_id, s);
      }
    });
    setGrades(
      (gradesData || []).map(g => {
        const student = studentMap.get(g.student_id);
        return {
          ...g,
          student_name: student
            ? `${student.last_name}, ${student.first_name}${student.middle_name ? ' ' + student.middle_name : ''}`
            : '',
          school_id: g.student_id,
        };
      })
    );
    setLoading(false);
  };

  const handleToggleRelease = async (grade: Grade) => {
    setUpdating(grade.id);
    const { error } = await supabase
      .from('grades')
      .update({ is_released: !grade.is_released })
      .eq('id', grade.id);
    if (!error) {
      setGrades((prev) =>
        prev.map((g) =>
          g.id === grade.id ? { ...g, is_released: !g.is_released } : g
        )
      );
    }
    setUpdating(null);
  };

  // Stats
  const totalGrades = grades.length;
  const releasedGrades = grades.filter(g => g.is_released).length;
  const pendingGrades = grades.filter(g => !g.is_released).length;

  return (
    <div className="min-h-screen  from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
              Grade Release Control
            </h1>
            <p className="text-gray-600 text-lg">Control when student grades become visible. Toggle to release or hide grades for each record.</p>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Grades</p>
              <p className="text-3xl font-bold text-gray-900">{totalGrades}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold text-gray-900">{pendingGrades}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Released</p>
              <p className="text-3xl font-bold text-gray-900">{releasedGrades}</p>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-gray-500 font-medium">Loading grades...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 rounded-xl p-6 text-center font-semibold">{error}</div>
        ) : grades.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No grades found</h3>
            <p className="text-gray-500 mb-6">No grades available for release.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name / School ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prelim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Midterm</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-semibold">{grade.student_name || '-'}</div>
                      <div className="text-xs text-gray-500">{grade.school_id || grade.student_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grade.prelim_grade ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grade.midterm_grade ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grade.final_grade ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grade.remarks ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {grade.is_released ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Released</span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleToggleRelease(grade)}
                        disabled={updating === grade.id}
                        className={`px-3 py-1 rounded-lg shadow-sm font-semibold flex items-center gap-1 focus:outline-none focus:ring-2 transition-colors ${grade.is_released ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'} ${updating === grade.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                        title={grade.is_released ? 'Hide grade from students' : 'Release grade to students'}
                      >
                        {updating === grade.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : grade.is_released ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        {grade.is_released ? 'Hide' : 'Release'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
