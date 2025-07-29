import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, Clock, BookOpen, ChevronRight, Search } from 'lucide-react';
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
  general_average?: number | null;
  year_level?: string;
  section?: string;
  program_name?: string;
  program_code?: string;
  student_status?: string;
  enrollment_status?: string;
  student_type?: string;
  course_id?: string;
  course_code?: string;
  teacher_name?: string;
}

interface YearLevelSection {
  year_level: string;
  section: string;
  studentCount: number;
}

interface YearLevelSectionSubject {
  year_level: string;
  section: string;
  subject: string;
  studentCount: number;
}

export default function StudentGrades() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for selection interface
  const [selectedYearLevel, setSelectedYearLevel] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [showSelection, setShowSelection] = useState(true);

  const [yearLevelSectionSubjects, setYearLevelSectionSubjects] = useState<YearLevelSectionSubject[]>([]);
  
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('');
  
  // State for bulk actions
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    setError(null);
    
    console.log('Fetching grades and student data...');
    
    try {
      // First, get all students with their year level and section info
      const { data: studentsData, error: studentsError } = await supabase
        .from('user_profiles')
        .select('id, student_id, first_name, last_name, middle_name, year_level, section, program_id, student_status, enrollment_status, student_type')
        .eq('role', 'student')
        .not('year_level', 'is', null)
        .not('section', 'is', null);
        
      if (studentsError) {
        console.error('Students error:', studentsError);
        setError('Failed to load student information');
        setLoading(false);
        return;
      }
      
      console.log('Students data:', studentsData?.length || 0, 'records');
      
      // Get unique year level and section combinations
      const yearLevelSectionMap = new Map<string, Set<string>>();
      const studentMap = new Map();
      
      (studentsData || []).forEach(student => {
        if (student.year_level && student.section) {
          if (!yearLevelSectionMap.has(student.year_level)) {
            yearLevelSectionMap.set(student.year_level, new Set());
          }
          yearLevelSectionMap.get(student.year_level)!.add(student.section);
          studentMap.set(student.id, student);
        }
      });
      
      // Create year level sections array for display
      const yearLevelSectionsArray: YearLevelSection[] = [];
      yearLevelSectionMap.forEach((sections, yearLevel) => {
        sections.forEach(section => {
          const studentCount = (studentsData || []).filter(s => 
            s.year_level === yearLevel && s.section === section
          ).length;
          yearLevelSectionsArray.push({
            year_level: yearLevel,
            section: section,
            studentCount
          });
        });
      });
      
      // Sort by year level and section
      yearLevelSectionsArray.sort((a, b) => {
        const yearOrder = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
        const aYearIndex = yearOrder.indexOf(a.year_level);
        const bYearIndex = yearOrder.indexOf(b.year_level);
        
        if (aYearIndex !== bYearIndex) {
          return aYearIndex - bYearIndex;
        }
        return a.section.localeCompare(b.section);
      });
      

      
      // Fetch grades for students who have year level and section
      const studentIds = (studentsData || []).map(s => s.id);
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });
        
      if (gradesError) {
        console.error('Grades error:', gradesError);
        setError('Failed to load grades');
        setLoading(false);
        return;
      }
      
      console.log('Grades data:', gradesData?.length || 0, 'records');
      
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

      // Fetch courses data if subject_id exists in grades (subject_id actually references courses)
      const courseIds = (gradesData || []).map(g => g.subject_id).filter(Boolean);
      const coursesMap = new Map();
      if (courseIds.length > 0) {
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, code')
          .in('id', courseIds);
        
        if (coursesError) {
          console.error('Error fetching courses:', coursesError);
        } else {
          (coursesData || []).forEach(c => {
            coursesMap.set(c.id, { code: c.code });
          });
        }
      }

      // Fetch teacher data if graded_by exists in grades
      const teacherIds = (gradesData || []).map(g => g.graded_by).filter(Boolean);
      const teachersMap = new Map();
      if (teacherIds.length > 0) {
        const { data: teachersData, error: teachersError } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .in('id', teacherIds);
        
        if (teachersError) {
          console.error('Error fetching teachers:', teachersError);
        } else {
          (teachersData || []).forEach(t => {
            teachersMap.set(t.id, { first_name: t.first_name, last_name: t.last_name });
          });
        }
      }
      
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
          student_status: student?.student_status || 'Unknown',
          enrollment_status: student?.enrollment_status || 'Unknown',
          student_type: student?.student_type || 'Unknown',
          course_id: g.subject_id,
          course_code: g.subject_id ? coursesMap.get(g.subject_id)?.code || 'Unknown' : 'Unknown',
          teacher_name: g.graded_by ? `${teachersMap.get(g.graded_by)?.first_name || ''} ${teachersMap.get(g.graded_by)?.last_name || ''}`.trim() || 'Unknown Teacher' : 'Unknown Teacher',
        };
      });
      
      console.log('Processed grades:', processedGrades.length, 'records');
      setGrades(processedGrades);
      

      
      // Create year level, section, and subject combinations
      const yearLevelSectionSubjectMap = new Map<string, Map<string, Set<string>>>();
      
      processedGrades.forEach(grade => {
        if (grade.year_level && grade.section && grade.course_code) {
          const key = `${grade.year_level}-${grade.section}`;
          if (!yearLevelSectionSubjectMap.has(key)) {
            yearLevelSectionSubjectMap.set(key, new Map());
          }
          const sectionMap = yearLevelSectionSubjectMap.get(key)!;
          if (!sectionMap.has(grade.section)) {
            sectionMap.set(grade.section, new Set());
          }
          sectionMap.get(grade.section)!.add(grade.course_code);
        }
      });
      
      const yearLevelSectionSubjectsArray: YearLevelSectionSubject[] = [];
      yearLevelSectionSubjectMap.forEach((sectionMap, key) => {
        const [yearLevel] = key.split('-');
        sectionMap.forEach((subjects, sectionName) => {
          subjects.forEach(subject => {
            const studentCount = processedGrades.filter(g => 
              g.year_level === yearLevel && 
              g.section === sectionName && 
              g.course_code === subject
            ).length;
            
            yearLevelSectionSubjectsArray.push({
              year_level: yearLevel,
              section: sectionName,
              subject: subject,
              studentCount
            });
          });
        });
      });
      
      // Sort by year level, section, and subject
      yearLevelSectionSubjectsArray.sort((a, b) => {
        const yearOrder = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
        const aYearIndex = yearOrder.indexOf(a.year_level);
        const bYearIndex = yearOrder.indexOf(b.year_level);
        
        if (aYearIndex !== bYearIndex) {
          return aYearIndex - bYearIndex;
        }
        
        if (a.section !== b.section) {
          return a.section.localeCompare(b.section);
        }
        
        return a.subject.localeCompare(b.subject);
      });
      
      setYearLevelSectionSubjects(yearLevelSectionSubjectsArray);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    }
    
    setLoading(false);
  };





  const handleBackToSelection = () => {
    setShowSelection(true);
  };

  // Get filtered students based on selection
  const getFilteredStudents = () => {
    if (!selectedYearLevel || !selectedSection || !selectedSubject) return [];
    
    const filtered = grades.filter(grade => 
      grade.year_level === selectedYearLevel && 
      grade.section === selectedSection &&
      grade.course_code === selectedSubject
    ).sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));
    
    console.log('Filtered students:', filtered.length, 'for', selectedYearLevel, 'Section', selectedSection, 'Subject', selectedSubject);
    return filtered;
  };

  // Bulk action handlers
  const handleBulkRelease = async () => {
    const filteredStudents = getFilteredStudents();
    if (filteredStudents.length === 0) return;
    
    setBulkUpdating(true);
    
    try {
      const { error } = await supabase
        .from('grades')
        .update({ is_released: true })
        .in('id', filteredStudents.map(s => s.id));
      
      if (!error) {
        setGrades((prev) =>
          prev.map((g) =>
            filteredStudents.some(s => s.id === g.id) ? { ...g, is_released: true } : g
          )
        );
        
        toast.success(`Released grades for ${filteredStudents.length} students`);
      } else {
        toast.error('Failed to release grades');
      }
    } catch {
      toast.error('Failed to release grades');
    }
    
    setBulkUpdating(false);
  };

  const handleBulkHide = async () => {
    const filteredStudents = getFilteredStudents();
    if (filteredStudents.length === 0) return;
    
    setBulkUpdating(true);
    
    try {
      const { error } = await supabase
        .from('grades')
        .update({ is_released: false })
        .in('id', filteredStudents.map(s => s.id));
      
      if (!error) {
        setGrades((prev) =>
          prev.map((g) =>
            filteredStudents.some(s => s.id === g.id) ? { ...g, is_released: false } : g
          )
        );
        
        toast.success(`Hidden grades for ${filteredStudents.length} students`);
      } else {
        toast.error('Failed to hide grades');
      }
    } catch {
      toast.error('Failed to hide grades');
    }
    
    setBulkUpdating(false);
  };

  // Stats
  const totalGrades = grades.length;
  const releasedGrades = grades.filter(g => g.is_released).length;
  const pendingGrades = grades.filter(g => !g.is_released).length;

  return (
    <div className="min-h-screen from-blue-50 via-white to-indigo-50 py-8">
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
                ) : showSelection ? (
          // Fast Selection Interface
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Quick Grade Management</h2>
              <p className="text-gray-600">Click on any combination to view and manage student grades</p>
            </div>
            
            <div className="max-w-6xl mx-auto">
              {/* Search and Filter Controls */}
              <div className="mb-6 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by year level, section, or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                </div>
                
                {/* Quick Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  {/* Year Level Filter */}
                  <select
                    value={selectedYearFilter}
                    onChange={(e) => setSelectedYearFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-sm"
                  >
                    <option value="">All Year Levels</option>
                    {[...new Set(yearLevelSectionSubjects.map(item => item.year_level))].sort().map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  
                  {/* Section Filter */}
                  <select
                    value={selectedSectionFilter}
                    onChange={(e) => setSelectedSectionFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-sm"
                  >
                    <option value="">All Sections</option>
                    {[...new Set(yearLevelSectionSubjects.map(item => item.section))].sort().map(section => (
                      <option key={section} value={section}>Section {section}</option>
                    ))}
                  </select>
                  
                  {/* Clear Filters Button */}
                  {(searchTerm || selectedYearFilter || selectedSectionFilter) && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedYearFilter('');
                        setSelectedSectionFilter('');
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
              
              {/* Quick Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {yearLevelSectionSubjects
                  .filter(item => {
                    const matchesSearch = !searchTerm || 
                      item.year_level.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.subject.toLowerCase().includes(searchTerm.toLowerCase());
                    
                    const matchesYearFilter = !selectedYearFilter || item.year_level === selectedYearFilter;
                    const matchesSectionFilter = !selectedSectionFilter || item.section === selectedSectionFilter;
                    
                    return matchesSearch && matchesYearFilter && matchesSectionFilter;
                  })
                  .map((item) => (
                  <div
                    key={`${item.year_level}-${item.section}-${item.subject}`}
                    onClick={() => {
                      setSelectedYearLevel(item.year_level);
                      setSelectedSection(item.section);
                      setSelectedSubject(item.subject);
                      setShowSelection(false);
                    }}
                    className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-700">
                          BSIT-{item.year_level.replace(/\D/g, '')}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                        {item.studentCount} students
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-lg font-bold text-gray-800">
                        Section {item.section}
                      </div>
                      <div className="text-sm font-medium text-gray-600">
                        {item.subject}
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Click to view</span>
                        <BookOpen className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Results Counter */}
              {(() => {
                const filteredResults = yearLevelSectionSubjects.filter(item => {
                  const matchesSearch = !searchTerm || 
                    item.year_level.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.subject.toLowerCase().includes(searchTerm.toLowerCase());
                  
                  const matchesYearFilter = !selectedYearFilter || item.year_level === selectedYearFilter;
                  const matchesSectionFilter = !selectedSectionFilter || item.section === selectedSectionFilter;
                  
                  return matchesSearch && matchesYearFilter && matchesSectionFilter;
                });
                
                return (
                  <div className="mb-4 text-sm text-gray-600">
                    Showing {filteredResults.length} of {yearLevelSectionSubjects.length} combinations
                  </div>
                );
              })()}
              
              {yearLevelSectionSubjects.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <BookOpen className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Data Available</h3>
                  <p className="text-gray-500">No year level, section, and subject combinations found.</p>
                </div>
              )}
              
              {yearLevelSectionSubjects.length > 0 && (() => {
                const filteredResults = yearLevelSectionSubjects.filter(item => {
                  const matchesSearch = !searchTerm || 
                    item.year_level.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.subject.toLowerCase().includes(searchTerm.toLowerCase());
                  
                  const matchesYearFilter = !selectedYearFilter || item.year_level === selectedYearFilter;
                  const matchesSectionFilter = !selectedSectionFilter || item.section === selectedSectionFilter;
                  
                  return matchesSearch && matchesYearFilter && matchesSectionFilter;
                });
                
                return filteredResults.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Search className="w-16 h-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No Results Found</h3>
                    <p className="text-gray-500">Try adjusting your search or filters.</p>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        ) : (
          // Students List View
          <div className="space-y-6">
            {/* Back Button and Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToSelection}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to Selection
              </button>
                      <div className="text-center flex-1">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl shadow-lg inline-block">
            <h2 className="text-2xl font-bold">
              BSIT-{selectedYearLevel.replace(/\D/g, '')} Section {selectedSection}
            </h2>
            {getFilteredStudents().length > 0 && (
              <div className="mt-3 text-base font-medium">
                <span className="mr-6">Subject: {getFilteredStudents()[0]?.course_code || 'Unknown'}</span>
                <span>Teacher: {getFilteredStudents()[0]?.teacher_name || 'Unknown'}</span>
              </div>
            )}
          </div>
        </div>
              <div className="w-32"></div> {/* Spacer to balance the layout */}
            </div>

            {/* Students Table - Only show when both year level and section are selected */}
            {selectedYearLevel && selectedSection ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Bulk Action Controls */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700">
                        {getFilteredStudents().length} students in {selectedYearLevel} Section {selectedSection}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleBulkRelease}
                        disabled={bulkUpdating}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          bulkUpdating
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg'
                        }`}
                      >
                        {bulkUpdating ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating...
                          </div>
                        ) : (
                          'Release All Grades'
                        )}
                      </button>
                      <button
                        onClick={handleBulkHide}
                        disabled={bulkUpdating}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          bulkUpdating
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:shadow-lg'
                        }`}
                      >
                        {bulkUpdating ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Updating...
                          </div>
                        ) : (
                          'Hide All Grades'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold">Student Name</th>
                        <th className="px-6 py-4 text-left font-semibold">Student ID</th>
                        <th className="px-6 py-4 text-center font-semibold">Status</th>

                        <th className="px-6 py-4 text-center font-semibold">Prelim</th>
                        <th className="px-6 py-4 text-center font-semibold">Midterm</th>
                        <th className="px-6 py-4 text-center font-semibold">Final</th>
                        <th className="px-6 py-4 text-center font-semibold">GA</th>
                        <th className="px-6 py-4 text-center font-semibold">Release Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getFilteredStudents().map((grade, index) => (
                        <tr key={grade.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {grade.student_name || 'Unknown Student'}
                              </div>
                              <div className="flex gap-1 mt-1">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                  BSIT
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {grade.school_id || grade.student_id}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {grade.student_type || 'Unknown'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-lg">
                              {grade.prelim_grade ?? '-'}
                              {(grade.prelim_grade === null || grade.prelim_grade === undefined) && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-lg">
                              {grade.midterm_grade ?? '-'}
                              {(grade.midterm_grade === null || grade.midterm_grade === undefined) && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-lg">
                              {grade.final_grade ?? '-'}
                              {(grade.final_grade === null || grade.final_grade === undefined) && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-xl text-blue-800">
                              {grade.general_average !== null && grade.general_average !== undefined 
                                ? grade.general_average.toFixed(2) 
                                : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {grade.is_released ? (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Released
                              </span>
                            ) : (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Select Year Level & Section</h3>
                <p className="text-gray-500">Please select both year level and section to view students.</p>
              </div>
            )}

            {/* Empty State - Only show when both are selected but no students found */}
            {selectedYearLevel && selectedSection && getFilteredStudents().length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No students found</h3>
                <p className="text-gray-500">No students available for the selected year level and section.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
