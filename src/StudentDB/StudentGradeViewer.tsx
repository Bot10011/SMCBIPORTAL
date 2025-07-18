import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GradeSummary } from '../types/grades';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  BookOpen, 
  Users, 
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const YEAR_LABELS = [
  'First Year',
  'Second Year',
  'Third Year',
  'Fourth Year',
];

const YEAR_ICONS: Record<string, JSX.Element> = {
  'First Year': <BookOpen className="w-5 h-5 text-blue-600" />,
  'Second Year': <BookOpen className="w-5 h-5 text-green-600" />,
  'Third Year': <BookOpen className="w-5 h-5 text-yellow-600" />,
  'Fourth Year': <BookOpen className="w-5 h-5 text-purple-600" />,
};

const YEAR_COLORS: Record<string, string> = {
  'First Year': 'from-blue-500 to-blue-600',
  'Second Year': 'from-green-500 to-green-600',
  'Third Year': 'from-yellow-500 to-yellow-600',
  'Fourth Year': 'from-purple-500 to-purple-600',
};

export const StudentGradeViewer: React.FC = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState<(GradeSummary & { year_level: string | null })[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'First Year': false,
    'Second Year': false,
    'Third Year': false,
    'Fourth Year': false,
  });
  const [selectedYearLevel, setSelectedYearLevel] = useState<string | null>(null);
  const [currentYearLevel, setCurrentYearLevel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Add this function near the top of the component (before useEffect):
  const normalizeYearLevel = (year: string | null | undefined) => {
    if (!year) return null;
    const y = year.toString().trim().toLowerCase();
    if (["1", "1st year", "first year"].includes(y)) return "First Year";
    if (["2", "2nd year", "second year"].includes(y)) return "Second Year";
    if (["3", "3rd year", "third year"].includes(y)) return "Third Year";
    if (["4", "4th year", "fourth year"].includes(y)) return "Fourth Year";
    return null;
  };

  // Fetch user's current year level from profile
  useEffect(() => {
    const fetchYearLevel = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('year_level')
            .eq('id', user.id)
            .single();
          if (error) throw error;
          if (data?.year_level) {
            // Normalize to match YEAR_LABELS, case-insensitive, ignore spaces, support numeric and word forms
            const year = (data.year_level || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
            if (year === '1st year' || year === 'first year' || year === '1') setCurrentYearLevel('First Year');
            else if (year === '2nd year' || year === 'second year' || year === '2') setCurrentYearLevel('Second Year');
            else if (year === '3rd year' || year === 'third year' || year === '3') setCurrentYearLevel('Third Year');
            else if (year === '4th year' || year === 'fourth year' || year === '4') setCurrentYearLevel('Fourth Year');
            else {
              setCurrentYearLevel(null);
              console.error('Unrecognized year_level value:', data.year_level);
            }
          } else {
            setCurrentYearLevel(null);
            console.error('No year_level found in user_profiles for user', user.id);
          }
        } catch (err) {
          setCurrentYearLevel(null);
          console.error('Error fetching year_level from user_profiles:', err);
        }
      }
    };
    fetchYearLevel();
  }, [user?.id]);

  // When currentYearLevel changes, update selectedYearLevel
  useEffect(() => {
    setSelectedYearLevel(currentYearLevel);
  }, [currentYearLevel]);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        if (user?.id) {
          // Fetch all grades for the current student, including course info
          const { data: gradesData, error: gradesError } = await supabase
            .from('grades')
            .select(`
              *,
              course:courses (code, name),
              teacher:user_profiles!grades_graded_by_fkey (first_name, last_name)
            `)
            .eq('student_id', user.id);

          console.log('Raw gradesData from Supabase:', gradesData);
          if (gradesError) {
            setErrorMsg('Error fetching grades: ' + gradesError.message);
            throw gradesError;
          }
          if (!gradesData || gradesData.length === 0) {
            setErrorMsg('No grades found for your account.');
            console.warn('No grades found for user:', user.id);
          }

          // Map to GradeSummary[]
          const gradesSummary = (gradesData || []).map(grade => ({
            id: grade.id,
            student_id: grade.student_id,
            student_name: '', // Fill if needed
            subject_code: grade.course?.code || '',
            subject_name: grade.course?.name || '',
            teacher_name: grade.teacher ? `${grade.teacher.first_name} ${grade.teacher.last_name}` : '',
            prelim_grade: grade.prelim_grade ?? null,
            midterm_grade: grade.midterm_grade ?? null,
            final_grade: grade.final_grade ?? null,
            status: grade.status ?? '',
            remarks: grade.remarks ?? null,
            year_level: normalizeYearLevel(grade.year_level),
            semester: grade.semester ?? null,
            academic_year: grade.academic_year ?? null,
          }));
          console.log('Fetched grades:', gradesSummary);

          setGrades(gradesSummary);
        }
      } catch (error) {
        console.error('Error fetching grades:', error);
        setErrorMsg('An error occurred while fetching your grades. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchGrades();
  }, [user?.id]);

  // Filter grades by search
  const filteredGrades = grades.filter(g =>
    g.subject_code.toLowerCase().includes(search.toLowerCase()) ||
    g.subject_name.toLowerCase().includes(search.toLowerCase())
  );

  // For now, all grades go to 'Unsorted'.
  const gradesByYear: { [key: string]: (GradeSummary & { year_level: string | null })[] } = {
    'First Year': [],
    'Second Year': [],
    'Third Year': [],
    'Fourth Year': [],
  };
  filteredGrades.forEach(g => {
    switch (g.year_level) {
      case '1st Year':
      case 'First Year':
        gradesByYear['First Year'].push(g);
        break;
      case '2nd Year':
      case 'Second Year':
        gradesByYear['Second Year'].push(g);
        break;
      case '3rd Year':
      case 'Third Year':
        gradesByYear['Third Year'].push(g);
        break;
      case '4th Year':
      case 'Fourth Year':
        gradesByYear['Fourth Year'].push(g);
        break;
    }
  });

  const currentYearIndex = currentYearLevel ? YEAR_LABELS.indexOf(currentYearLevel) : -1;
  const yearOptions = currentYearIndex !== -1 ? YEAR_LABELS.slice(0, currentYearIndex + 1) : [YEAR_LABELS[0]];

  const toggleSection = (year: string) => {
    setOpenSections(prev => ({ ...prev, [year]: !prev[year] }));
  };

  // Calculate GPA for display
  const calculateGPA = (grades: GradeSummary[]) => {
    const validGrades = grades.filter(g => g.final_grade !== null && g.final_grade !== undefined);
    if (validGrades.length === 0) return null;
    
    const total = validGrades.reduce((sum, grade) => sum + (grade.final_grade || 0), 0);
    return (total / validGrades.length).toFixed(2);
  };

  const overallGPA = calculateGPA(grades);

  if (loading) {
    return (
      <div className="w-full space-y-8 p-4 sm:p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-b-transparent"></div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="w-full space-y-8 p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-inner shadow-inner-strong border border-red-100 p-6"
        >
          <div className="text-center">
            <div className="p-3 rounded-full bg-red-50 mb-4 mx-auto w-fit">
              <Award className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Grades</h3>
            <p className="text-sm text-red-600">{errorMsg}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (currentYearLevel === null || currentYearIndex === -1) {
    return (
      <div className="w-full space-y-8 p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-inner shadow-inner-strong border border-red-100 p-6"
        >
          <div className="text-center">
            <div className="p-3 rounded-full bg-red-50 mb-4 mx-auto w-fit">
              <Clock className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-700 mb-2">Year Level Not Found</h3>
            <p className="text-sm text-red-600">Your year level could not be determined. Please contact support or check your profile information.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 p-4 sm:p-6">
      {/* Premium Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-inner shadow-inner-strong border border-blue-100"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Academic Grades</h1>
                <p className="text-white/80 text-sm font-medium">Track your academic performance</p>
              </div>
            </div>
            {overallGPA && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-4 flex justify-center sm:justify-start w-full sm:w-auto"
              >
                <div className="w-44 h-10 rounded-xl shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.1),inset_0_1px_2px_0_rgba(0,0,0,0.06)] bg-white/95 backdrop-blur-sm flex items-center justify-center gap-2 border border-white/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-base font-semibold text-gray-800 tracking-wide">
                    GPA: {overallGPA}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Search and Stats Section */}
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-inner shadow-inner-strong border border-blue-100 p-6"
      >
        <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md flex-shrink-0 mb-2 sm:mb-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm font-medium text-gray-900 placeholder-gray-500 transition-all duration-200"
            />
          </div>
          {/* Stats and Year Level Dropdown in one line on mobile/tablet */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-end">
            <div className="flex flex-row gap-2 w-auto sm:gap-4">
              <div className="w-auto min-w-0 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 shadow-sm justify-center">
                <BookOpen className="w-4 h-4 text-gray-600" />
                <span className="text-xs sm:text-sm font-semibold text-gray-700 truncate whitespace-nowrap">{gradesByYear[selectedYearLevel || currentYearLevel || 'First Year'].length} Subjects</span>
              </div>
              <div className="w-auto min-w-0 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 shadow-sm justify-center">
                <TrendingUp className="w-4 h-4 text-gray-600" />
                <span className="text-xs sm:text-sm font-semibold text-gray-700 truncate whitespace-nowrap">
                  {gradesByYear[selectedYearLevel || currentYearLevel || 'First Year'].filter(g => g.final_grade !== null).length} Graded
                </span>
              </div>
            </div>
            <div className="relative flex items-center justify-center px-3 py-2 bg-white rounded-xl border border-gray-200 w-full sm:w-44 h-10 mt-2 sm:mt-0 shadow-sm">
              <select
                id="year-level-select"
                value={selectedYearLevel || ''}
                onChange={e => setSelectedYearLevel(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setIsDropdownOpen(false)}
                style={{ textAlign: 'center', textAlignLast: 'center' }}
                className="w-full appearance-none pl-4 pr-6 py-2 bg-white text-gray-800 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none hover:bg-gray-50 transition font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ease-in-out transform ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Year Section (only for selected year) */}
      <AnimatePresence>
        {selectedYearLevel && [selectedYearLevel].map((year, index) => (
          <motion.div 
            key={year} 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            className="bg-white rounded-2xl shadow-inner shadow-inner-strong border border-blue-100 overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-blue-50 transition-colors duration-200 focus:outline-none"
              onClick={() => toggleSection(year)}
            >
              <div className="flex items-center min-w-0 flex-1">
                <div className={`w-1.5 sm:w-2 h-6 sm:h-8 rounded-full bg-gradient-to-b ${YEAR_COLORS[year]} mr-2 sm:mr-4 flex-shrink-0`} />
                <div className="flex items-center min-w-0 flex-1">
                  <div className="p-1.5 sm:p-2 rounded-full bg-blue-50 mr-2 sm:mr-3 flex-shrink-0">
                    {YEAR_ICONS[year]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 tracking-tight truncate">{year} Grades</h2>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
                {openSections[year] ? (
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                )}
              </div>
            </button>
            <AnimatePresence>
              {openSections[year] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-blue-100">
                    {gradesByYear[year].length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-3 rounded-full bg-gray-100">
                            <BookOpen className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500 text-base font-medium">No grades found</p>
                          <p className="text-sm text-gray-400">Grades will appear here once posted</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card View */}
                        <div className="block sm:hidden p-4 space-y-4">
                          {gradesByYear[year].map((grade) => (
                            <motion.div 
                              key={grade.id} 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="p-4 rounded-xl border border-blue-100 bg-white shadow-inner"
                            >
                              <div className="font-bold text-gray-800 mb-2 text-base">{grade.subject_code} - {grade.subject_name}</div>
                              <div className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {grade.teacher_name || 'TBA'}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Prelim:</span>
                                  <span className="font-semibold">{grade.prelim_grade ?? 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Midterm:</span>
                                  <span className="font-semibold">{grade.midterm_grade ?? 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Final:</span>
                                  <span className="font-semibold">{grade.final_grade ?? 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">GA:</span>
                                  <span className="font-semibold">
                                    {grade.prelim_grade != null && grade.midterm_grade != null && grade.final_grade != null
                                      ? ((Number(grade.prelim_grade) + Number(grade.midterm_grade) + Number(grade.final_grade)) / 3).toFixed(2)
                                      : 'N/A'}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Status: </span>
                                <span className={`font-semibold ${
                                  grade.remarks === 'Passed' ? 'text-green-700' :
                                  grade.remarks === 'Failed' ? 'text-red-700' :
                                  grade.remarks === 'Incomplete' ? 'text-yellow-800' :
                                  'text-gray-600'
                                }`}>{grade.remarks || 'Pending'}</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        {/* Desktop/Tablet Table View */}
                        <div className="hidden sm:block">
                          <table className="min-w-full border-2 border-gray-500 rounded-lg overflow-hidden">
                            <thead className="bg-gray-50 border-b-2 border-gray-500">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r-2 border-gray-500">Subject</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r-2 border-gray-500">Teacher</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r-2 border-gray-500">Prelim</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r-2 border-gray-500">Midterm</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r-2 border-gray-500">Final</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r-2 border-gray-500">GA</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {gradesByYear[year].map((grades, gradesIndex) => (
                                <motion.tr 
                                  key={grades.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, delay: gradesIndex * 0.05 }}
                                  className="hover:bg-gray-50 transition-colors duration-200 group border-b-2 border-gray-500"
                                >
                                  <td className="px-6 py-4 border-r-2 border-gray-500">
                                    <span className="text-sm font-medium text-gray-800">{grades.subject_name}</span>
                                  </td>
                                  <td className="px-6 py-4 border-r-2 border-gray-500">
                                    <div className="flex items-center">
                                      <Users className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm text-gray-600">{grades.teacher_name || 'TBA'}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center border-r-2 border-gray-500">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
                                      grades.prelim_grade !== null 
                                        ? 'bg-gray-100 text-gray-800 border border-gray-200' 
                                        : 'bg-gray-50 text-gray-500 border border-gray-200'
                                    }`}>
                                      {grades.prelim_grade ?? 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center border-r-2 border-gray-500">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
                                      grades.midterm_grade !== null 
                                        ? 'bg-gray-100 text-gray-800 border border-gray-200' 
                                        : 'bg-gray-50 text-gray-500 border border-gray-200'
                                    }`}>
                                      {grades.midterm_grade ?? 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center border-r-2 border-gray-500">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
                                      grades.final_grade !== null 
                                        ? 'bg-gray-100 text-gray-800 border border-gray-200' 
                                        : 'bg-gray-50 text-gray-500 border border-gray-200'
                                    }`}>
                                      {grades.final_grade ?? 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center border-r-2 border-gray-500">
                                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                      {grades.prelim_grade !== undefined && grades.prelim_grade !== null &&
                                       grades.midterm_grade !== undefined && grades.midterm_grade !== null &&
                                       grades.final_grade !== undefined && grades.final_grade !== null
                                        ? ((Number(grades.prelim_grade) + Number(grades.midterm_grade) + Number(grades.final_grade)) / 3).toFixed(2)
                                        : 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border
                                      ${grades.remarks === 'Passed' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                        grades.remarks === 'Failed' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                        grades.remarks === 'Incomplete' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                                        'bg-gray-50 text-gray-500 border-gray-200'}`}
                                    >
                                      {grades.remarks || 'Pending'}
                                    </span>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
