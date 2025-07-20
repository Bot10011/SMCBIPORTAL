import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Eye, EyeOff, CheckCircle2, Clock, BookOpen, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

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
  general_average?: number;
  year_level?: string;
  section?: string;
  program_name?: string;
  program_code?: string;
}

interface GradeGroup {
  year_level: string;
  section: string;
  program_name: string;
  program_code: string;
  grades: Grade[];
  isExpanded: boolean;
  hasIncompleteGrades: boolean;
  allReleased: boolean;
}

export default function StudentGrades() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeGroups, setGradeGroups] = useState<GradeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [updatingGroup, setUpdatingGroup] = useState<string | null>(null);
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
    // Fetch student info for all unique student_ids (user UUIDs)
    const userIds = (gradesData || []).map(g => g.student_id);
    const { data: studentsData, error: studentsError } = await supabase
      .from('user_profiles')
      .select('id, student_id, first_name, last_name, middle_name, year_level, section, program_id')
      .in('id', userIds);
    if (studentsError) {
      setError('Failed to load student info');
      setLoading(false);
      return;
    }
    // Fetch programs data
    const programIds = (studentsData || []).map(s => s.program_id).filter(Boolean);
    const { data: programsData, error: programsError } = await supabase
      .from('programs')
      .select('id, name, code')
      .in('id', programIds);
    
    if (programsError) {
      console.error('Error fetching programs:', programsError);
    }
    
    const programMap = new Map();
    (programsData || []).forEach(p => {
      programMap.set(p.id, { name: p.name, code: p.code });
    });
    
    const studentMap = new Map();
    (studentsData || []).forEach(s => {
      if (!studentMap.has(s.id)) {
        studentMap.set(s.id, s);
      }
    });
    
    const processedGrades = (gradesData || []).map(g => {
      const student = studentMap.get(g.student_id);
      
      // Calculate General Average
      const grades = [g.prelim_grade, g.midterm_grade, g.final_grade].filter(grade => grade !== null && grade !== undefined);
      const general_average = grades.length > 0 
        ? Math.round((grades.reduce((sum, grade) => sum + (grade || 0), 0) / grades.length) * 100) / 100
        : null;
      
      return {
        ...g,
        student_name: student
          ? `${student.last_name}, ${student.first_name}${student.middle_name ? ' ' + student.middle_name : ''}`
          : '',
        school_id: student?.student_id || g.student_id,
        general_average,
        year_level: student?.year_level || 'Unknown',
        section: student?.section || 'Unknown',
        program_name: student?.program_id ? programMap.get(student.program_id)?.name || 'Unknown Program' : 'Unknown Program',
        program_code: student?.program_id ? programMap.get(student.program_id)?.code || 'UNK' : 'UNK',
      };
    });
    
    setGrades(processedGrades);
    
    // Group grades by year level, section, and program
    const groups = new Map<string, Grade[]>();
    processedGrades.forEach(grade => {
      const key = `${grade.year_level}-${grade.section}-${grade.program_code}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(grade);
    });
    
    const gradeGroupsData: GradeGroup[] = Array.from(groups.entries()).map(([key, groupGrades]) => {
      const [year_level, section, program_code] = key.split('-');
      const hasIncompleteGrades = groupGrades.some(grade => 
        grade.prelim_grade === null || grade.midterm_grade === null || grade.final_grade === null
      );
      const allReleased = groupGrades.every(grade => grade.is_released);
      
      return {
        year_level,
        section,
        program_name: groupGrades[0]?.program_name || 'Unknown Program',
        program_code,
        grades: groupGrades,
        isExpanded: false,
        hasIncompleteGrades,
        allReleased,
      };
    }).sort((a, b) => {
      // Sort by year level first, then by program code, then by section
      const yearOrder = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };
      const yearA = yearOrder[a.year_level as keyof typeof yearOrder] || 999;
      const yearB = yearOrder[b.year_level as keyof typeof yearOrder] || 999;
      if (yearA !== yearB) return yearA - yearB;
      if (a.program_code !== b.program_code) return a.program_code.localeCompare(b.program_code);
      return a.section.localeCompare(b.section);
    });
    
    setGradeGroups(gradeGroupsData);
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
      // Update grade groups
      setGradeGroups((prev) =>
        prev.map((group) => ({
          ...group,
          grades: group.grades.map((g) =>
            g.id === grade.id ? { ...g, is_released: !g.is_released } : g
          ),
          allReleased: group.grades.every((g) => g.id === grade.id ? !g.is_released : g.is_released),
        }))
      );
      toast.success(grade.is_released ? 'Grade hidden from student' : 'Grade released to student');
    } else {
      toast.error('Failed to update grade release status');
    }
    setUpdating(null);
  };

  const handleToggleGroupRelease = async (group: GradeGroup) => {
    if (group.hasIncompleteGrades) {
      toast.error('Cannot release grades: Some students have missing grades');
      return;
    }
    
    setUpdatingGroup(`${group.year_level}-${group.section}-${group.program_code}`);
    const newReleaseStatus = !group.allReleased;
    
    try {
      // Update all grades in the group
      const gradeIds = group.grades.map(g => g.id);
      const { error } = await supabase
        .from('grades')
        .update({ is_released: newReleaseStatus })
        .in('id', gradeIds);
      
      if (!error) {
        // Update local state
        setGrades((prev) =>
          prev.map((g) =>
            gradeIds.includes(g.id) ? { ...g, is_released: newReleaseStatus } : g
          )
        );
        
        setGradeGroups((prev) =>
          prev.map((g) =>
            g.year_level === group.year_level && g.section === group.section && g.program_code === group.program_code
              ? {
                  ...g,
                  grades: g.grades.map((grade) => ({ ...grade, is_released: newReleaseStatus })),
                  allReleased: newReleaseStatus,
                }
              : g
          )
        );
        
        toast.success(
          newReleaseStatus 
            ? `All grades for ${group.program_code}-${group.year_level.replace(' Year', '')} ${group.section} have been released`
            : `All grades for ${group.program_code}-${group.year_level.replace(' Year', '')} ${group.section} have been hidden`
        );
      } else {
        toast.error('Failed to update grade release status');
      }
    } catch {
      toast.error('Failed to update grade release status');
    } finally {
      setUpdatingGroup(null);
    }
  };

  const toggleGroupExpansion = (yearLevel: string, section: string, programCode: string) => {
    setGradeGroups((prev) =>
      prev.map((group) =>
        group.year_level === yearLevel && group.section === section && group.program_code === programCode
          ? { ...group, isExpanded: !group.isExpanded }
          : group
      )
    );
  };

  // Stats
  const totalGrades = grades.length;
  const releasedGrades = grades.filter(g => g.is_released).length;
  const pendingGrades = grades.filter(g => !g.is_released).length;

  return (
    <div className="min-h-screen  from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-2xl mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Grade Release Control</h1>
                <p className="text-white/80 text-sm font-medium">Control when student grades become visible. Toggle to release or hide grades for each record.</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80"></div>
              </div>
            </div>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-sm border border-blue-200/50 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-sm font-semibold uppercase tracking-wide mb-1">Total Grades</p>
                <p className="text-4xl font-bold text-blue-900">{totalGrades}</p>
                <p className="text-blue-600 text-xs mt-1">All grade records</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 shadow-sm border border-amber-200/50 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-700 text-sm font-semibold uppercase tracking-wide mb-1">Pending</p>
                <p className="text-4xl font-bold text-amber-900">{pendingGrades}</p>
                <p className="text-amber-600 text-xs mt-1">Awaiting release</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 shadow-sm border border-emerald-200/50 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-700 text-sm font-semibold uppercase tracking-wide mb-1">Released</p>
                <p className="text-4xl font-bold text-emerald-900">{releasedGrades}</p>
                <p className="text-emerald-600 text-xs mt-1">Visible to students</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
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
        ) : gradeGroups.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No grades found</h3>
            <p className="text-gray-500 mb-6">No grades available for release.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gradeGroups.map((group) => (
              <div key={`${group.year_level}-${group.section}-${group.program_code}`} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Group Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleGroupExpansion(group.year_level, group.section, group.program_code)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        {group.isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {group.program_code}-{group.year_level.replace(' Year', '')} {group.section}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {group.grades.length} student{group.grades.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {group.hasIncompleteGrades && (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm font-medium">Missing grades</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleToggleGroupRelease(group)}
                        disabled={group.hasIncompleteGrades || updatingGroup === `${group.year_level}-${group.section}-${group.program_code}`}
                        className={`px-4 py-2 rounded-lg shadow-sm font-semibold flex items-center gap-2 focus:outline-none focus:ring-2 transition-colors ${
                          group.hasIncompleteGrades
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : group.allReleased
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                        title={
                          group.hasIncompleteGrades
                            ? 'Cannot release: Some students have missing grades'
                            : group.allReleased
                            ? 'Hide all grades from students'
                            : 'Release all grades to students'
                        }
                      >
                        {updatingGroup === `${group.year_level}-${group.section}-${group.program_code}` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : group.allReleased ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        {group.allReleased ? 'Hide All' : 'Release All'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Group Content */}
                {group.isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name / School ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prelim</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Midterm</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GA</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.grades.map((grade) => (
                          <tr key={grade.id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="font-semibold">{grade.student_name || '-'}</div>
                              <div className="text-xs text-gray-500">{grade.school_id || grade.student_id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {grade.prelim_grade ?? '-'}
                              {(grade.prelim_grade === null || grade.prelim_grade === undefined) && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {grade.midterm_grade ?? '-'}
                              {(grade.midterm_grade === null || grade.midterm_grade === undefined) && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {grade.final_grade ?? '-'}
                              {(grade.final_grade === null || grade.final_grade === undefined) && (
                                <span className="ml-1 text-red-500">*</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {grade.general_average !== null && grade.general_average !== undefined 
                                ? grade.general_average.toFixed(2) 
                                : '-'}
                            </td>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
