import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GradeSummary as BaseGradeSummary } from '../types/grades';
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

interface GradeSummary extends BaseGradeSummary {
  year_level: string | null;
  is_released?: boolean;
  teacher_avatar_url?: string;
}

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
  const [grades, setGrades] = useState<GradeSummary[]>([]);
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
  const normalizeYearLevel = (year: string | number | null | undefined) => {
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
            const year = normalizeYearLevel(data.year_level);
            if (year) {
              setCurrentYearLevel(year);
            } else {
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
        
        // Security check: Ensure user is authenticated
        if (!user?.id) {
          setErrorMsg('You must be logged in to view grades.');
          setLoading(false);
          return;
        }

        // Additional security: Verify the user is a student
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !userProfile) {
          setErrorMsg('Unable to verify your account. Please contact support.');
          setLoading(false);
          return;
        }

        // Only allow students to view grades
        if (userProfile.role !== 'student') {
          setErrorMsg('Access denied. Only students can view grades.');
          setLoading(false);
          return;
        }

        // Fetch all grades for the current student, including course info
        const { data: gradesData, error: gradesError } = await supabase
          .from('grades')
          .select(`
            *,
            course:courses!fk_grades_course (code, name),
            teacher:user_profiles!grades_graded_by_fkey (display_name, avatar_url)
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
          teacher_name: grade.teacher?.display_name || '',
          teacher_avatar_url: grade.teacher?.avatar_url || undefined,
          prelim_grade: grade.prelim_grade ?? null,
          midterm_grade: grade.midterm_grade ?? null,
          final_grade: grade.final_grade ?? null,
          final_computed_grade: undefined, // Not in the new schema
          status: 'pending' as const, // Default status since not in the new schema
          remarks: grade.remarks ?? null,
          year_level: normalizeYearLevel(grade.year_level?.toString()),
          is_released: grade.is_released ?? false,
        }));
        console.log('Fetched grades:', gradesSummary);

        setGrades(gradesSummary);
      } catch (error) {
        console.error('Error fetching grades:', error);
        setErrorMsg('An error occurred while fetching your grades. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGrades();
  }, [user?.id]);

  // Only show grades where is_released is true
  const releasedGrades = useMemo(() => grades.filter(g => g.is_released === true), [grades]);
  
  // Filter grades by search
  const filteredGrades = useMemo(() => releasedGrades.filter(g =>
    g.subject_code.toLowerCase().includes(search.toLowerCase()) ||
    g.subject_name.toLowerCase().includes(search.toLowerCase())
  ), [releasedGrades, search]);

  // Group grades by year, only include years with at least one grade
  const gradesByYear: { [key: string]: GradeSummary[] } = {
    'First Year': [],
    'Second Year': [],
    'Third Year': [],
    'Fourth Year': [],
  };
  filteredGrades.forEach(g => {
    if (g.year_level) {
      gradesByYear[g.year_level].push(g);
    }
  });

  // Always show all years in dropdown
  const yearOptions = YEAR_LABELS;

  // Default openSections: current year open, others closed
  useEffect(() => {
    if (currentYearLevel) {
      const newSections: { [key: string]: boolean } = {};
      YEAR_LABELS.forEach(year => {
        newSections[year] = year === currentYearLevel;
      });
      setOpenSections(newSections);
    }
  }, [currentYearLevel]);

  // Selected year for counts and display
  const selectedYear = selectedYearLevel || currentYearLevel || 'First Year';
  const subjectsCount = gradesByYear[selectedYear]?.length || 0;
  const gradedCount = gradesByYear[selectedYear]?.filter(g => g.final_grade !== null).length || 0;

  const toggleSection = useCallback((year: string) => {
    setOpenSections(prev => ({ ...prev, [year]: !prev[year] }));
  }, []);

  // Calculate GPA for display (based on final grades only) - 4.0 scale
  const calculateGPA = (grades: GradeSummary[]) => {
    const validGrades = grades.filter(g => g.final_grade !== null && g.final_grade !== undefined);
    if (validGrades.length === 0) return null;
    
    // Convert percentage grades to 4.0 scale
    const convertTo4Scale = (percentage: number): number => {
      if (percentage >= 97) return 4.0;
      if (percentage >= 93) return 3.7;
      if (percentage >= 90) return 3.3;
      if (percentage >= 87) return 3.0;
      if (percentage >= 83) return 2.7;
      if (percentage >= 80) return 2.3;
      if (percentage >= 77) return 2.0;
      if (percentage >= 73) return 1.7;
      if (percentage >= 70) return 1.3;
      if (percentage >= 67) return 1.0;
      if (percentage >= 65) return 0.7;
      return 0.0;
    };
    
    const total = validGrades.reduce((sum, grade) => sum + convertTo4Scale(grade.final_grade || 0), 0);
    const gpa = total / validGrades.length;
    
    return {
      value: gpa.toFixed(2),
      numeric: gpa,
      status: gpa >= 3.7 ? 'excellent' : gpa >= 3.3 ? 'very-good' : gpa >= 2.7 ? 'good' : gpa >= 2.0 ? 'passing' : 'needs-improvement'
    };
  };

  // Calculate GPA for the selected year only
  const selectedYearGrades = gradesByYear[selectedYear] || [];
  const overallGPA = calculateGPA(selectedYearGrades);

  if (loading) {
    return (
      <div className="w-full space-y-8 p-4 sm:p-6">
        {/* Header Skeleton */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-inner shadow-inner-strong border border-blue-100">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <div className="w-6 h-6 bg-white/30 rounded animate-pulse"></div>
                </div>
                <div>
                  <div className="h-8 w-48 bg-white/20 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-32 bg-white/20 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="mt-4 flex justify-center sm:justify-start w-full sm:w-auto">
                <div className="w-44 h-10 bg-white/20 rounded-xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Stats Skeleton */}
        <div className="bg-white rounded-2xl shadow-inner shadow-inner-strong border border-blue-100 p-6">
          <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md flex-shrink-0 mb-2 sm:mb-0">
              <div className="w-full h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-end">
              <div className="flex flex-row gap-2 w-auto sm:gap-4">
                <div className="w-24 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="w-24 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
              <div className="w-full sm:w-44 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Year Sections Skeleton */}
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="bg-white rounded-2xl shadow-inner shadow-inner-strong border border-blue-100 overflow-hidden">
            <div className="w-full flex items-center justify-between p-3 sm:p-4">
              <div className="flex items-center min-w-0 flex-1">
                <div className="w-1.5 sm:w-2 h-6 sm:h-8 rounded-full bg-gray-200 mr-2 sm:mr-4 flex-shrink-0 animate-pulse"></div>
                <div className="flex items-center min-w-0 flex-1">
                  <div className="p-1.5 sm:p-2 rounded-full bg-gray-200 mr-2 sm:mr-3 flex-shrink-0 animate-pulse"></div>
                  <div className="min-w-0 flex-1">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
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

  if (currentYearLevel === null) {
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
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 flex justify-center sm:justify-start w-full sm:w-auto"
          >
            {overallGPA ? (
              <div className={`w-auto px-4 h-10 rounded-xl shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.1),inset_0_1px_2px_0_rgba(0,0,0,0.06)] backdrop-blur-sm flex items-center justify-center gap-2 border transition-all duration-300 ${
                overallGPA.status === 'excellent' 
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-emerald-100' 
                  : overallGPA.status === 'very-good'
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-blue-100'
                  : overallGPA.status === 'good'
                  ? 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 shadow-purple-100'
                  : overallGPA.status === 'passing'
                  ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-yellow-100'
                  : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 shadow-red-100'
              }`}>
                <div className={`p-1 rounded-full ${
                  overallGPA.status === 'excellent' ? 'bg-emerald-100' 
                  : overallGPA.status === 'very-good' ? 'bg-blue-100'
                  : overallGPA.status === 'good' ? 'bg-purple-100'
                  : overallGPA.status === 'passing' ? 'bg-yellow-100'
                  : 'bg-red-100'
                }`}>
                  <CheckCircle2 className={`w-4 h-4 ${
                    overallGPA.status === 'excellent' ? 'text-emerald-600' 
                    : overallGPA.status === 'very-good' ? 'text-blue-600'
                    : overallGPA.status === 'good' ? 'text-purple-600'
                    : overallGPA.status === 'passing' ? 'text-yellow-600'
                    : 'text-red-600'
                  }`} />
                </div>
                <span className={`text-base font-bold tracking-wide ${
                  overallGPA.status === 'excellent' ? 'text-emerald-800' 
                  : overallGPA.status === 'very-good' ? 'text-blue-800'
                  : overallGPA.status === 'good' ? 'text-purple-800'
                  : overallGPA.status === 'passing' ? 'text-yellow-800'
                  : 'text-red-800'
                }`}>
                  GPA: {overallGPA.value}
                </span>
              </div>
            ) : (
              <div className="w-auto px-4 h-10 rounded-xl shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.1),inset_0_1px_2px_0_rgba(0,0,0,0.06)] backdrop-blur-sm flex items-center justify-center gap-2 border border-gray-200 bg-gray-50 transition-all duration-300">
                <div className="p-1 rounded-full bg-gray-100">
                  <Clock className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-base font-semibold text-gray-700 tracking-wide">
                  No grades available
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>

      {/* Search and Stats Section */}
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#252728] rounded-2xl shadow-inner shadow-inner-strong border border-gray-700 p-6"
      >
        <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md flex-shrink-0 mb-2 sm:mb-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 w-4 h-4" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 border border-[#444] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#333334] text-sm font-medium text-white placeholder-gray-300 transition-all duration-200"
            />
          </div>
          {/* Stats and Year Level Dropdown in one line on mobile/tablet */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-end">
            <div className="flex flex-row gap-2 w-auto sm:gap-4">
              <div className="w-auto min-w-0 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-200 shadow-sm justify-center hover:bg-blue-100 transition-colors duration-200">
                <div className="p-1 rounded-full bg-blue-100">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-blue-700 truncate whitespace-nowrap">{subjectsCount} Subjects</span>
              </div>
              <div className="w-auto min-w-0 flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200 shadow-sm justify-center hover:bg-green-100 transition-colors duration-200">
                <div className="p-1 rounded-full bg-green-100">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-green-700 truncate whitespace-nowrap">
                  {gradedCount} Graded
                </span>
              </div>
            </div>
            <div className="relative flex items-center justify-center px-3 py-2 bg-[#333334] rounded-xl border border-[#444] w-full sm:w-44 h-10 mt-2 sm:mt-0 shadow-sm">
              <select
                id="year-level-select"
                value={selectedYear || ''}
                onChange={e => setSelectedYearLevel(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setIsDropdownOpen(false)}
                style={{ textAlign: 'center', textAlignLast: 'center' }}
                className="w-full appearance-none pl-4 pr-6 py-2 bg-[#333334] text-white rounded-lg border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none transition font-semibold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-200">
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ease-in-out transform ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Year Section: only show the selected year */}
      <AnimatePresence>
        {[selectedYear].map((year, index) => (
          <motion.div 
            key={year} 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            className={`bg-[#252728] shadow-inner shadow-inner-strong border border-gray-700 overflow-hidden ${
              openSections[year] ? 'rounded-t-2xl' : 'rounded-2xl'
            }`}
          >
            <button
              className="w-full flex items-center justify-between p-3 sm:p-4 bg-[#252728] focus:outline-none"
              onClick={() => toggleSection(year)}
            >
              <div className="flex items-center min-w-0 flex-1">
                <div className={`w-1.5 sm:w-2 h-6 sm:h-8 rounded-full bg-gradient-to-b ${YEAR_COLORS[year]} mr-2 sm:mr-4 flex-shrink-0`} />
                <div className="flex items-center min-w-0 flex-1">
                  <div className="p-1.5 sm:p-2 rounded-full bg-blue-50 mr-2 sm:mr-3 flex-shrink-0">
                    {YEAR_ICONS[year]}
                  </div>
                  <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight truncate">{year} Grades</h2>
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
                  <div className="border-t border-[#444]">
                    {gradesByYear[year].length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-3 rounded-full bg-gray-100">
                            <BookOpen className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500 text-base font-medium">No grades available</p>
                          <p className="text-sm text-gray-400">
                            {releasedGrades.length === 0 && grades.length > 0 
                              ? "Grades are not yet released by your teachers" 
                              : "Grades will appear here once posted and released"
                            }
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card View */}
                        <div className="block sm:hidden p-4 space-y-4">
                          {gradesByYear[year].map((grade) => {
                            const ga = grade.prelim_grade !== undefined && grade.prelim_grade !== null &&
                                      grade.midterm_grade !== undefined && grade.midterm_grade !== null &&
                                      grade.final_grade !== undefined && grade.final_grade !== null
                                      ? ((Number(grade.prelim_grade) + Number(grade.midterm_grade) + Number(grade.final_grade)) / 3)
                                      : null;
                            
                            const isPassed = ga !== null && ga >= 75;
                            
                            return (
                              <motion.div 
                                key={grade.id} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="p-6 rounded-xl border border-[#444] bg-[#252728] shadow-lg transition-all duration-300"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <div className="font-bold text-white text-lg mb-1">{grade.subject_code}</div>
                                    <div className="text-sm text-gray-300">{grade.subject_name}</div>
                                  </div>
                                  <div className="flex items-center">
                                    {grade.teacher_avatar_url ? (
                                      <img
                                        src={grade.teacher_avatar_url}
                                        alt={grade.teacher_name || 'Instructor'}
                                        className="w-8 h-8 rounded-full mr-2 object-cover"
                                      />
                                    ) : (
                                      <div className="p-2 rounded-full bg-[#2b2d2f] mr-2">
                                        <Users className="w-4 h-4 text-blue-600" />
                                      </div>
                                    )}
                                    <span className="text-sm text-gray-200 font-medium">{grade.teacher_name || 'TBA'}</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                  <div className="text-center p-3 rounded-lg bg-[#333334] border border-[#444]">
                                    <div className="text-xs text-gray-300 uppercase tracking-wider mb-1">Prelim</div>
                                    <div className="font-bold text-white text-lg">{grade.prelim_grade ?? 'N/A'}</div>
                                  </div>
                                  <div className="text-center p-3 rounded-lg bg-[#333334] border border-[#444]">
                                    <div className="text-xs text-gray-300 uppercase tracking-wider mb-1">Midterm</div>
                                    <div className="font-bold text-white text-lg">{grade.midterm_grade ?? 'N/A'}</div>
                                  </div>
                                  <div className="text-center p-3 rounded-lg bg-[#333334] border border-[#444]">
                                    <div className="text-xs text-gray-300 uppercase tracking-wider mb-1">Final</div>
                                    <div className="font-bold text-white text-lg">{grade.final_grade ?? 'N/A'}</div>
                                  </div>
                                </div>
                                <div className={`mt-4 p-4 rounded-lg text-center bg-[#333334] border ${isPassed ? 'border-emerald-600' : 'border-red-600'}`}>
                                  <div className="text-xs text-gray-300 uppercase tracking-wider mb-1">Grade Average</div>
                                  <div className={`font-bold text-2xl ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {ga !== null ? ga.toFixed(2) : 'N/A'}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                        {/* Desktop/Tablet Table View */}
                        <div className="hidden sm:block overflow-x-auto rounded-none bg-[#252728] dark-table">
                          <table className="grades-table min-w-full bg-[#252728] text-white" style={{ borderCollapse: 'collapse' }}>
                            <thead className="bg-[#252728]">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-200">SUBJECT</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-200">INSTRUCTOR</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold tracking-wider text-gray-200">PRELIM</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold tracking-wider text-gray-200">MIDTERM</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold tracking-wider text-gray-200">FINAL</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold tracking-wider text-gray-200">GA</th>
                              </tr>
                            </thead>
                            <tbody className="bg-[#252728]">
                              {gradesByYear[year].map((grades, gradesIndex) => {
                                const ga = grades.prelim_grade !== undefined && grades.prelim_grade !== null &&
                                          grades.midterm_grade !== undefined && grades.midterm_grade !== null &&
                                          grades.final_grade !== undefined && grades.final_grade !== null
                                          ? ((Number(grades.prelim_grade) + Number(grades.midterm_grade) + Number(grades.final_grade)) / 3)
                                          : null;
                                
                                const isPassed = ga !== null && ga >= 75;
                                
                                                                return (
                              <motion.tr 
                                    key={grades.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: gradesIndex * 0.05 }}
                                className="group bg-[#252728]"
                                  >
                                    <td className="px-6 py-4">
                                      <span className="text-sm font-semibold text-white">{grades.subject_code}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center">
                                        {grades.teacher_avatar_url ? (
                                          <img
                                            src={grades.teacher_avatar_url}
                                            alt={grades.teacher_name || 'Instructor'}
                                            className="w-7 h-7 rounded-full mr-3 object-cover"
                                          />
                                        ) : (
                                          <div className="p-1.5 rounded-full bg-[#2b2d2f] mr-3">
                                            <Users className="w-3.5 h-3.5 text-blue-600" />
                                          </div>
                                        )}
                                        <span className="text-sm text-gray-200">{grades.teacher_name || 'TBA'}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#333334] text-white border border-[#444]">
                                        {grades.prelim_grade ?? 'N/A'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#333334] text-white border border-[#444]">
                                        {grades.midterm_grade ?? 'N/A'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#333334] text-white border border-[#444]">
                                        {grades.final_grade ?? 'N/A'}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <span className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold shadow-sm border ${isPassed ? 'border-emerald-600 text-emerald-400 bg-[#333334]' : 'border-red-600 text-red-400 bg-[#333334]' }`}>
                                        {ga !== null ? ga.toFixed(2) : 'N/A'}
                                      </span>
                                    </td>
                                  </motion.tr>
                                );
                              })}
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
