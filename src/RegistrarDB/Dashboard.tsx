import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import RegistrarEnrollment from './RegistrarEnrollment';
import RegistrarProspectus from './RegistrarProspectus';
import { motion } from 'framer-motion';
import ClassList from './ClassList';
import Settings from './Settings';
import { 
  CheckSquare, 
  FileText, 
  BookOpen, 
  BarChart4, 
  Clock,
  Users,
  Clock4,
  ShieldAlert,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { RegistrarGradeViewer } from './Allcourse';
import { supabase } from '../lib/supabase';
import StudentGrades from './StudentGrades';

// Import registrar-specific components
const StudentRecords = () => <div>Student Records</div>;

// Dashboard Overview Components
type ActivityLog = {
  id: string;
  action?: string;
  description?: string;
  student?: string;
  course?: string;
  section?: string;
  instructor?: string;
  time?: string;
  created_at?: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type GradeActivity = {
  id: any;
  student_id: any;
  subject_id: any;
  section: any;
  year_level: any;
  is_released: any;
  is_approved: any;
  graded_by: any;
  graded_at: any;
  updated_at: any;
  created_at: any;
  edit_status: any;
  edit_requested: any;
  edit_requested_by: any;
  edit_requested_by_name: any;
  edit_student_name: any;
  edit_reason: any;
  prelim_grade: any;
  midterm_grade: any;
  final_grade: any;
  course: any;
  student: any;
};
/* eslint-enable @typescript-eslint/no-explicit-any */



type EnrollmentData = {
  year: string;
  count: number;
  status: string;
};

type CapacityData = {
  id: string;
  program: string;
  yearLevel: string;
  section: string;
  studentCount: number;
  maxCapacity: number;
};

// Helper function to format school year professionally
const formatSchoolYear = (year: string): string => {
  if (!year || year === 'Unknown') return 'Unknown';
  
  // If it's already formatted (e.g., "2023-2024"), return as is
  if (year.includes('-')) return year;
  
  // If it's a single year, format it as "YYYY-YYYY+1"
  const yearNum = parseInt(year);
  if (!isNaN(yearNum)) {
    return `${yearNum}-${yearNum + 1}`;
  }
  
  return year;
};

// Lightweight, modern SVG area chart for enrollment trend
const EnrollmentAreaChart: React.FC<{ data: EnrollmentData[] }> = ({ data }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(720);
  const height = 240;
  const padding = { top: 16, right: 24, bottom: 40, left: 40 };

  // Resize handling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resize = () => setContainerWidth(Math.max(360, el.clientWidth));
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    window.addEventListener('resize', resize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  const width = containerWidth;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const donutRadius = Math.max(60, Math.min(86, Math.floor(Math.min(innerHeight / 2 - 8, innerWidth / 4 - 8))));
  const [donutOffset, setDonutOffset] = useState<number>(0);
  useEffect(() => {
    if (data.length === 1) {
      const circumference = 2 * Math.PI * donutRadius;
      setDonutOffset(circumference);
      const id = requestAnimationFrame(() => setDonutOffset(0));
      return () => cancelAnimationFrame(id);
    }
    setDonutOffset(0);
    return () => undefined;
  }, [data.length, donutRadius]);

  const maxCount = Math.max(1, ...data.map(d => d.count));
  const xStep = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padding.left + i * xStep;
    const y = padding.top + innerHeight - (d.count / maxCount) * innerHeight;
    return { x, y };
  });

  const areaPath = points.length
    ? `M ${points[0].x},${innerHeight + padding.top} ` +
      points.map(p => `L ${p.x},${p.y}`).join(' ') +
      ` L ${points[points.length - 1].x},${innerHeight + padding.top} Z`
    : '';

  const linePath = points.length
    ? `M ${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')
    : '';

  // Animated line draw
  const lineRef = React.useRef<SVGPathElement | null>(null);
  const [dash, setDash] = useState<{ array: number; offset: number }>({ array: 0, offset: 0 });
  useEffect(() => {
    const path = lineRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    // Set initial dash then animate to 0
    setDash({ array: len, offset: len });
    const id = requestAnimationFrame(() => setDash({ array: len, offset: 0 }));
    return () => cancelAnimationFrame(id);
  }, [linePath, width]);

  // Tooltip state
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const yTicks = 4;
  const yValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxCount / yTicks) * i));

  // Single data point fallback: donut visualization
  if (data.length === 1) {
    const d = data[0];
    const radius = donutRadius;
    const cx = padding.left + (innerWidth) / 2;
    const cy = padding.top + innerHeight / 2;
    const circumference = 2 * Math.PI * radius;
    const percent = 1;
    const dashLen = circumference * percent;
    return (
      <div ref={containerRef} className="w-full">
        <svg width={width} height={height} className="mx-auto" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="donutStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={16} />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="url(#donutStroke)"
            strokeWidth={16}
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeLinecap="round"
            style={{ filter: 'url(#glow)', transition: 'stroke-dashoffset 900ms ease' }}
            strokeDashoffset={donutOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="28" fontWeight={700} fill="#111827">{d.count}</text>
          <text x={cx} y={cy + 20} textAnchor="middle" fontSize="12" fill="#6B7280">{d.year}</text>
        </svg>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* Compact analytics */}
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${((data.length > 1 ? data[data.length - 1].count - data[data.length - 2].count : 0) >= 0) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
          <span className={`inline-flex w-4 h-4 items-center justify-center rounded-full ${((data.length > 1 ? data[data.length - 1].count - data[data.length - 2].count : 0) >= 0) ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d={((data.length > 1 ? data[data.length - 1].count - data[data.length - 2].count : 0) >= 0) ? 'M12 5l7 7M12 5L5 12' : 'M12 19l7-7M12 19L5 12'} /></svg>
          </span>
          {(() => { const latest = data[data.length - 1]?.count ?? 0; const prev = data.length > 1 ? data[data.length - 2].count : 0; const yoy = prev > 0 ? Math.round(((latest - prev) / prev) * 100) : 0; return yoy >= 0 ? `YoY +${yoy}%` : `YoY ${yoy}%`; })()}
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Avg {Math.round(data.reduce((s, d) => s + d.count, 0) / Math.max(1, data.length))}/yr
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          Total {data.reduce((s, d) => s + d.count, 0)}
        </div>
      </div>

      <svg width={width} height={height} className="mx-auto" viewBox={`0 0 ${width} ${height}`}> 
        <defs>
          <linearGradient id="enrollGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Alternating year bands, labels and separators */}
        {data.map((_, i) => {
          if (i === 0) return null;
          const xPrev = padding.left + (i - 1) * xStep;
          const x = padding.left + i * xStep;
          if (i % 2 === 0) {
            return <rect key={`band-${i}`} x={xPrev} y={padding.top} width={x - xPrev} height={height - padding.top - padding.bottom - 8} fill="#F9FAFB" />;
          }
          return null;
        })}

        {/* Grid lines */}
        {yValues.map((v, i) => {
          const y = padding.top + innerHeight - (v / maxCount) * innerHeight;
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#E5E7EB" strokeDasharray="3 6" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#6B7280">{v}</text>
            </g>
          );
        })}

        {/* X axis labels and separators */}
        {data.map((d, i) => {
          const x = padding.left + i * xStep;
          const label = d.year;
          return (
            <g key={label}>
              {/* vertical separator */}
              <line x1={x} x2={x} y1={padding.top} y2={height - padding.bottom - 8} stroke="#E5E7EB" opacity={0.5} />
              <text x={x} y={height - 12} textAnchor="middle" fontSize="10" fill="#374151">{label}</text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#enrollGradient)" opacity={0.9} />
        {/* Trend line with draw animation and glow */}
        <path ref={lineRef} d={linePath} fill="none" stroke="url(#strokeGradient)" strokeWidth={3} strokeLinecap="round" style={{ filter: 'url(#lineGlow)', transition: 'stroke-dashoffset 900ms ease' }} strokeDasharray={dash.array} strokeDashoffset={dash.offset} />

        {/* Points with pulse and hover target */}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}>
            <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke="#2563EB" strokeWidth={2} />
            <circle cx={p.x} cy={p.y} r={8} className="animate-ping" fill="#60A5FA" opacity={0.35} />
          </g>
        ))}

        {/* Tooltip */}
        {hoverIdx !== null && points[hoverIdx] && (
          <g transform={`translate(${points[hoverIdx].x}, ${Math.max(points[hoverIdx].y - 36, padding.top + 8)})`}>
            <rect x={-48} y={-20} width={96} height={28} rx={8} fill="#111827" opacity={0.95} />
            <text x={0} y={-2} textAnchor="middle" fontSize="12" fill="#F9FAFB" fontWeight={700}>{data[hoverIdx].count}</text>
            <text x={0} y={12} textAnchor="middle" fontSize="10" fill="#9CA3AF">{data[hoverIdx].year}</text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: 'linear-gradient(90deg,#2563EB,#6366F1)' } as CSSProperties}></span>
          <span>Enrollment trend</span>
        </div>
        <div className="text-xs text-gray-500">Max: {maxCount}</div>
      </div>
    </div>
  );
};

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingEnrollments: 0,
    totalCourses: 0,
    studentRecords: 0
  });
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [capacityData, setCapacityData] = useState<CapacityData[]>([]);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [hasNewGrades, setHasNewGrades] = useState(false);
  const LAST_SEEN_GRADES_KEY = 'registrar_last_seen_grade_ts';
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [loadingStates, setLoadingStates] = useState({
    activities: true,
    capacity: true,
    enrollment: true
  });
  const [instructorRequests, setInstructorRequests] = useState<Array<{
    id: string;
    student_id: string;
    student_name?: string | null;
    instructor_id?: string | null;
    instructor_name?: string | null;
    subject_id?: string | null;
    section?: string | null;
    academic_year?: string | null;
    edit_reason?: string | null;
    edit_status?: string | null;
    created_at?: string | null;
  }>>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Phase 1: Fetch critical stats in parallel for immediate display
        const [enrollmentsResult, coursesResult, studentCountResult] = await Promise.all([
          supabase
          .from('user_profiles')
            .select('id')
          .eq('role', 'student')
            .eq('enrollment_status', 'pending'),
          supabase
            .from('courses')
            .select('id')
            .order('name', { ascending: true }),
          supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
            .eq('role', 'student')
        ]);

        // Set basic stats immediately
        setStats({
          pendingEnrollments: enrollmentsResult.data?.length || 0,
          totalCourses: coursesResult.data?.length || 0,
          studentRecords: studentCountResult.count || 0
        });

        // Phase 2: Fetch detailed data in parallel (non-blocking)
        const [activities, capacityStats, enrollmentStats, gradeIndicator] = await Promise.allSettled([
          fetchRecentActivities(),
          fetchCapacityData(),
          fetchEnrollmentData(),
          supabase
            .from('grades')
            .select('updated_at, created_at')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single()
        ]);

        // Update UI with detailed data as it becomes available
        if (activities.status === 'fulfilled') {
          setRecentActivities(activities.value);
          setLoadingStates(prev => ({ ...prev, activities: false }));
        }
        if (capacityStats.status === 'fulfilled') {
          setCapacityData(capacityStats.value);
          setLoadingStates(prev => ({ ...prev, capacity: false }));
        }
        if (enrollmentStats.status === 'fulfilled') {
          setEnrollmentData(enrollmentStats.value);
          setLoadingStates(prev => ({ ...prev, enrollment: false }));
        }
        if (gradeIndicator.status === 'fulfilled' && gradeIndicator.value.data) {
          const latestTs = (gradeIndicator.value.data.updated_at || gradeIndicator.value.data.created_at) as string | null;
          if (latestTs) {
            const lastSeenRaw = localStorage.getItem(LAST_SEEN_GRADES_KEY);
            const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0;
            const latestMs = new Date(latestTs).getTime();
            if (Number.isFinite(latestMs) && latestMs > lastSeen) {
              setHasNewGrades(true);
            }
          }
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Fetch instructor grade-edit requests (from grades table)
  useEffect(() => {
    const fetchInstructorRequests = async () => {
      try {
        setRequestsLoading(true);
        const { data, error } = await supabase
          .from('grades')
          .select('id, student_id, subject_id, section, academic_year, edit_reason, edit_status, edit_requested_by, edit_requested_by_name, edit_student_name, created_at')
          .eq('edit_requested', true)
          .eq('edit_status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const base = (data || []).map((g: {
          id: string;
          student_id: string;
          subject_id: string | null;
          section: string | null;
          academic_year: string | null;
          edit_reason: string | null;
          edit_status: string | null;
          edit_requested_by: string | null;
          edit_requested_by_name: string | null;
          edit_student_name: string | null;
          created_at: string | null;
        }) => ({
          id: g.id,
          student_id: g.student_id,
          student_name: g.edit_student_name,
          instructor_id: g.edit_requested_by, // temporary; will override from teacher_subjects if available
          instructor_name: g.edit_requested_by_name, // temporary; will override from user_profiles
          subject_id: g.subject_id,
          section: g.section,
          academic_year: g.academic_year,
          edit_reason: g.edit_reason,
          edit_status: g.edit_status,
          created_at: g.created_at
        }));

        // Enhance with teacher_subjects.teacher_id and user_profiles.display_name
        const subjectIds = Array.from(new Set(base.map(r => r.subject_id).filter(Boolean))) as string[];
        const subjectToTeacherId = new Map<string, string>();
        if (subjectIds.length > 0) {
          const { data: tsRows } = await supabase
            .from('teacher_subjects')
            .select('subject_id, teacher_id')
            .in('subject_id', subjectIds);
          if (tsRows) {
            tsRows.forEach((row: { subject_id: string; teacher_id: string }) => {
              if (row?.subject_id && row?.teacher_id) subjectToTeacherId.set(row.subject_id, row.teacher_id);
            });
          }
        }

        const teacherIds = Array.from(new Set(Array.from(subjectToTeacherId.values())));
        const teacherIdToName = new Map<string, string>();
        if (teacherIds.length > 0) {
          const { data: teachers } = await supabase
            .from('user_profiles')
            .select('id, display_name, first_name, last_name')
            .in('id', teacherIds);
          if (teachers) {
            teachers.forEach((t: { id: string; display_name?: string | null; first_name?: string | null; last_name?: string | null; }) => {
              const full = (t.display_name && t.display_name.trim()) || [t.first_name, t.last_name].filter(Boolean).join(' ').trim();
              if (t.id && full) teacherIdToName.set(t.id, full);
            });
          }
        }

        const mapped = base.map(req => {
          const teacherId = req.subject_id ? subjectToTeacherId.get(req.subject_id) : undefined;
          if (teacherId) {
            return {
              ...req,
              instructor_id: teacherId,
              instructor_name: teacherIdToName.get(teacherId) || req.instructor_name || 'Unknown Instructor',
            };
          }
          return req;
        });

        setInstructorRequests(mapped);
      } catch (e) {
        console.error('Failed to load instructor requests:', e);
        setInstructorRequests([]);
      } finally {
        setRequestsLoading(false);
      }
    };
    fetchInstructorRequests();
  }, []);




  const fetchRecentActivities = async (): Promise<ActivityLog[]> => {
    try {
      const activities: ActivityLog[] = [];

      // Fetch recent enrollment activities and recent grade activities in parallel
      const [enrollmentsResult, gradesResult, sectionsResult] = await Promise.allSettled([
        supabase
        .from('user_profiles')
          .select('id, created_at, enrollment_status, student_id, display_name, first_name, last_name, middle_name, department, year_level, section')
        .eq('role', 'student')
        .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('grades')
          .select('id, student_id, subject_id, section, updated_at, created_at, graded_at, is_released, edit_requested, edit_status, edit_requested_by_name, edit_student_name, prelim_grade, midterm_grade, final_grade, graded_by')
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('sections')
          .select('id, name')
      ]);

      // Build section map for UUID to name conversion
      const sectionMap: Record<string, string> = {};
      if (sectionsResult.status === 'fulfilled' && sectionsResult.value.data) {
        sectionsResult.value.data.forEach(section => {
          sectionMap[section.id] = section.name;
        });
      }

      // Process enrollment activities
      if (enrollmentsResult.status === 'fulfilled' && enrollmentsResult.value.data) {
        enrollmentsResult.value.data.forEach(enrollment => {
        const getStudentName = () => {
          if (enrollment.display_name && enrollment.display_name.trim() !== '') {
            return enrollment.display_name;
          }
          const firstName = enrollment.first_name || '';
          const lastName = enrollment.last_name || '';
          const middleName = enrollment.middle_name || '';
          const nameParts = [firstName, middleName, lastName].filter(part => part.trim() !== '');
          return nameParts.length > 0 ? nameParts.join(' ') : 'Unknown Student';
        };

          const getSectionName = () => {
            if (enrollment.section && sectionMap[enrollment.section]) {
              return sectionMap[enrollment.section];
            }
            // If it's already a simple letter (A, B, C, D), return as is
            if (/^[A-Z]$/.test(enrollment.section)) {
              return enrollment.section;
            }
            // If it's a UUID, convert to a readable format
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(enrollment.section)) {
              const shortId = enrollment.section.substring(0, 8);
              return `Section ${shortId.toUpperCase()}`;
            }
            return enrollment.section || 'N/A';
        };

          activities.push({
            id: `enrollment-${enrollment.id}`,
          action: `Enrollment ${enrollment.enrollment_status}`,
          student: getStudentName(),
            course: enrollment.department || 'Unknown',
            section: `${enrollment.year_level || 'Unknown'} - ${getSectionName()}`,
          time: new Date(enrollment.created_at).toLocaleString(),
          created_at: enrollment.created_at
          });
        });
      }

      // Process grade activities
      if (gradesResult.status === 'fulfilled' && gradesResult.value.data) {
        const grades = gradesResult.value.data as GradeActivity[];
        
        // Get unique student, subject, and instructor IDs for batch fetching
        const studentIds = Array.from(new Set(grades.map(g => g.student_id).filter(Boolean)));
        const subjectIds = Array.from(new Set(grades.map(g => g.subject_id).filter(Boolean)));
        const instructorIds = Array.from(new Set(grades.map(g => g.graded_by).filter(Boolean)));
        
        console.log('🔍 Grade Analysis:', {
          totalGrades: grades.length,
          uniqueStudentIds: studentIds.length,
          uniqueSubjectIds: subjectIds.length,
          uniqueInstructorIds: instructorIds.length,
          instructorIds: instructorIds,
          gradesWithGradedBy: grades.filter(g => g.graded_by).length,
          gradesWithEditRequestedBy: grades.filter(g => g.edit_requested_by_name).length
        });

        // Fetch student names, course info, instructor names, and teacher_subjects in parallel
        const [profilesResult, coursesResult, instructorsResult] = await Promise.allSettled([
          studentIds.length > 0 ? supabase
            .from('user_profiles')
            .select('id, display_name, first_name, last_name, middle_name')
            .in('id', studentIds) : Promise.resolve({ data: [] }),
          subjectIds.length > 0 ? supabase
            .from('courses')
            .select('id, code, name')
            .in('id', subjectIds) : Promise.resolve({ data: [] }),
          instructorIds.length > 0 ? supabase
            .from('user_profiles')
            .select('id, display_name, first_name, last_name')
            .in('id', instructorIds) : Promise.resolve({ data: [] })
        ]);

        // Also fetch teacher_subjects to find instructors for subjects without graded_by
        const teacherSubjectsResult = subjectIds.length > 0 ? await supabase
          .from('teacher_subjects')
          .select('subject_id, teacher_id')
          .in('subject_id', subjectIds) : { data: [] };

        console.log('📡 Fetch Results:', {
          profilesResult: profilesResult.status,
          coursesResult: coursesResult.status,
          instructorsResult: instructorsResult.status,
          instructorIdsRequested: instructorIds
        });

        // Build lookup maps
        const nameMap: Record<string, string> = {};
        if (profilesResult.status === 'fulfilled' && profilesResult.value.data) {
          profilesResult.value.data.forEach(p => {
            const full = (p.display_name && p.display_name.trim()) || 
              [p.first_name, p.middle_name, p.last_name]
                .filter(x => typeof x === 'string' && x.trim() !== '')
                  .join(' ')
                  .trim();
            if (full) nameMap[p.id] = full;
          });
        }

        const courseMap: Record<string, { code?: string | null; name?: string | null }> = {};
        if (coursesResult.status === 'fulfilled' && coursesResult.value.data) {
          coursesResult.value.data.forEach(c => {
            courseMap[c.id] = { code: c.code || null, name: c.name || null };
          });
        }

        // Build instructorMap from user_profiles (graded_by field)
        const instructorMap: Record<string, string> = {};
        if (instructorsResult.status === 'fulfilled' && instructorsResult.value.data) {
          console.log('📊 Building instructorMap from user_profiles:', instructorsResult.value.data.length, 'instructors');
          instructorsResult.value.data.forEach(i => {
            const full = (i.display_name && i.display_name.trim()) || 
              [i.first_name, i.last_name]
                .filter(x => typeof x === 'string' && x.trim() !== '')
                .join(' ')
                .trim();
            if (full) {
              instructorMap[i.id] = full;
              console.log('👤 Added instructor to map:', i.id, '->', full);
            } else {
              console.warn('⚠️ Skipped instructor with no name:', i.id, i);
            }
          });
        } else {
          console.error('❌ Failed to fetch instructors:', instructorsResult.status, instructorsResult.status === 'rejected' ? instructorsResult.reason : 'Unknown error');
        }

        // Build mapping from subject to teacher_id
        const subjectToTeacherId = new Map<string, string>();
        if (teacherSubjectsResult.data) {
          teacherSubjectsResult.data.forEach((row: { subject_id: string; teacher_id: string }) => {
            if (row?.subject_id && row?.teacher_id) {
              subjectToTeacherId.set(row.subject_id, row.teacher_id);
            }
          });
        }

        // Fetch additional instructor names from teacher_subjects for subjects without graded_by
        const teacherIds = Array.from(new Set(Array.from(subjectToTeacherId.values())));
        const additionalInstructors: Record<string, string> = {};
        if (teacherIds.length > 0) {
          const { data: teachers } = await supabase
            .from('user_profiles')
            .select('id, display_name, first_name, last_name')
            .in('id', teacherIds);
          if (teachers) {
            teachers.forEach((t: { id: string; display_name?: string | null; first_name?: string | null; last_name?: string | null; }) => {
              const full = (t.display_name && t.display_name.trim()) || 
                [t.first_name, t.last_name]
                  .filter(x => typeof x === 'string' && x.trim() !== '')
                  .join(' ')
                  .trim();
              if (t.id && full) {
                additionalInstructors[t.id] = full;
                console.log('👤 Added additional instructor:', t.id, '->', full);
              }
            });
          }
        }
        
        console.log('📋 Final instructorMap:', instructorMap);

        // Process grade activities
        grades.forEach(grade => {
          const getStudentName = () => {
            if (grade.student_id && nameMap[grade.student_id]) return nameMap[grade.student_id];
            return grade.edit_student_name || 'Unknown Student';
          };

          const getInstructorName = () => {
            // Debug logging for instructor name resolution
            console.log('🔍 Instructor Name Debug:', {
              gradeId: grade.id,
              graded_by: grade.graded_by,
              edit_requested_by_name: grade.edit_requested_by_name,
              subject_id: grade.subject_id,
              instructorMapKeys: Object.keys(instructorMap),
              instructorMapHasGradedBy: grade.graded_by ? instructorMap[grade.graded_by] : false,
              additionalInstructorsKeys: Object.keys(additionalInstructors)
            });

            // Primary: Check if graded_by exists and instructorMap has the name
            if (grade.graded_by && instructorMap[grade.graded_by]) {
              console.log('✅ Using instructorMap for graded_by:', grade.graded_by, '->', instructorMap[grade.graded_by]);
              return instructorMap[grade.graded_by];
            }
            
            // Secondary: Check if we can find instructor via teacher_subjects for this subject
            if (grade.subject_id) {
              const teacherId = subjectToTeacherId.get(grade.subject_id);
              if (teacherId && additionalInstructors[teacherId]) {
                console.log('✅ Using teacher_subjects lookup for subject:', grade.subject_id, '-> teacher:', teacherId, '-> name:', additionalInstructors[teacherId]);
                return additionalInstructors[teacherId];
              }
            }
            
            // Tertiary: Use edit_requested_by_name from grades table (but not if it's "Unknown Instructor")
            if (grade.edit_requested_by_name && grade.edit_requested_by_name !== 'Unknown Instructor') {
              console.log('✅ Using edit_requested_by_name:', grade.edit_requested_by_name);
              return grade.edit_requested_by_name;
            }

            // Error case: Log why we're showing "Unknown Instructor"
            console.warn('⚠️ Unknown Instructor - Missing data:', {
              gradeId: grade.id,
              graded_by: grade.graded_by,
              edit_requested_by_name: grade.edit_requested_by_name,
              subject_id: grade.subject_id,
              instructorMapSize: Object.keys(instructorMap).length,
              additionalInstructorsSize: Object.keys(additionalInstructors).length,
              availableInstructors: Object.keys(instructorMap),
              availableSubjectTeachers: Array.from(subjectToTeacherId.entries()),
              reason: grade.graded_by ? 'Instructor not found in map' : grade.subject_id ? 'Subject not found in teacher_subjects' : 'No graded_by or subject_id field'
            });
            
            return 'Unknown Instructor';
          };

          const courseInfo = grade.subject_id ? courseMap[grade.subject_id] : undefined;
          const courseName = (courseInfo?.name || courseInfo?.code) || 'Unknown Course';

          // Grade release activities
          if (grade.is_released) {
            activities.push({
              id: `grade-release-${grade.id}`,
              action: 'Grade Released',
              student: getStudentName(),
              course: courseName,
              section: grade.section || 'N/A',
              instructor: getInstructorName(),
              time: new Date(grade.updated_at || grade.graded_at || grade.created_at || '').toLocaleString(),
              created_at: grade.updated_at || grade.graded_at || grade.created_at || ''
            });
          }

          // Grade edit request activities
          if (grade.edit_requested && grade.edit_status === 'pending') {
            activities.push({
              id: `grade-edit-request-${grade.id}`,
              action: 'Grade Edit Request',
              student: getStudentName(),
              course: courseName,
              section: grade.section || 'N/A',
              instructor: getInstructorName(),
              time: new Date(grade.created_at || '').toLocaleString(),
              created_at: grade.created_at || ''
            });
          }

          // Grade edit approval/denial activities
          if (grade.edit_status === 'granted' || grade.edit_status === 'denied') {
            activities.push({
              id: `grade-edit-${grade.edit_status}-${grade.id}`,
              action: `Grade Edit ${grade.edit_status === 'granted' ? 'Approved' : 'Denied'}`,
              student: getStudentName(),
              course: courseName,
              section: grade.section || 'N/A',
              instructor: getInstructorName(),
              time: new Date(grade.updated_at || grade.created_at || '').toLocaleString(),
              created_at: grade.updated_at || grade.created_at || ''
            });
          }

          // Grade input activities
          if (grade.graded_at && (grade.prelim_grade || grade.midterm_grade || grade.final_grade)) {
            activities.push({
              id: `grade-input-${grade.id}`,
              action: 'Grade Input',
              student: getStudentName(),
              course: courseName,
              section: grade.section || 'N/A',
              instructor: getInstructorName(),
              time: new Date(grade.graded_at || '').toLocaleString(),
              created_at: grade.graded_at || ''
            });
          }
        });
      }

      // Sort all activities by creation time (most recent first) and limit to 8
      const sortedActivities = activities
        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
        .slice(0, 8);

      console.log('📋 Final Activities Summary:', {
        totalActivities: activities.length,
        displayedActivities: sortedActivities.length,
        activitiesWithUnknownInstructor: sortedActivities.filter(a => a.instructor === 'Unknown Instructor').length,
        activitiesWithInstructor: sortedActivities.filter(a => a.instructor && a.instructor !== 'Unknown Instructor').length
      });

      return sortedActivities;
    } catch (error) {
      console.error('Error in fetchRecentActivities:', error);
      return [];
    }
  };

  const fetchCapacityData = async (): Promise<CapacityData[]> => {
    try {
      // First, let's try to fetch from sections table directly to see if it exists
      const { error: sectionsError } = await supabase
        .from('sections')
        .select('id')
        .limit(1);
      
      if (sectionsError) {
        console.log('Sections table error:', sectionsError);
        // If sections table doesn't exist, fall back to using section values directly
        const { data: students, error } = await supabase
          .from('user_profiles')
          .select('department, year_level, section')
          .eq('role', 'student')
          .not('department', 'is', null)
          .not('year_level', 'is', null)
          .not('section', 'is', null);
        
        if (error) {
          console.error('Error fetching capacity data:', error);
          return [];
        }
        
        // Group students by program, year level, and section
        const capacityMap = new Map<string, CapacityData>();
        
        students?.forEach(student => {
          const sectionName = student.section || 'Unknown';
          const key = `${student.department}-${student.year_level}-${sectionName}`;
          const existing = capacityMap.get(key);
          
          if (existing) {
            existing.studentCount += 1;
          } else {
            capacityMap.set(key, {
              id: key,
              program: student.department || 'Unknown',
              yearLevel: student.year_level || 'Unknown',
              section: sectionName,
              studentCount: 1,
              maxCapacity: 50 // Default max capacity per section
            });
          }
        });
        
        return Array.from(capacityMap.values()).sort((a, b) => {
          if (a.program !== b.program) return a.program.localeCompare(b.program);
          if (a.yearLevel !== b.yearLevel) return a.yearLevel.localeCompare(b.yearLevel);
          return a.section.localeCompare(b.section);
        });
      } else {
        console.log('Sections table exists');
        
        // Since there's no foreign key relationship, let's try a different approach
        // First get all students with their section UIDs
        const { data: students, error } = await supabase
          .from('user_profiles')
          .select('department, year_level, section')
          .eq('role', 'student')
          .not('department', 'is', null)
          .not('year_level', 'is', null)
          .not('section', 'is', null);
        
        if (error) {
          console.error('Error fetching students:', error);
          return [];
        }
        
        // Create a map of section UIDs to names using only the sections we need
        const sectionIds = Array.from(new Set((students || []).map((s: { section?: string | null }) => s.section).filter(Boolean))) as string[];
        let sectionMap = new Map<string, string>();
        if (sectionIds.length > 0) {
          const { data: sectionsAll, error: sectionsAllError } = await supabase
            .from('sections')
            .select('id, name')
            .in('id', sectionIds);
          if (!sectionsAllError && sectionsAll) {
            sectionMap = sectionsAll.reduce((acc: Map<string, string>, sec: { id: string; name?: string | null }) => {
              if (sec && sec.id) acc.set(sec.id, sec.name || sec.id);
              return acc;
            }, new Map<string, string>());
          }
        }
        
        // Group students by program, year level, and section
        const capacityMap = new Map<string, CapacityData>();
        
        students?.forEach(student => {
          // Convert section UID to name using our map
          const sectionName = sectionMap.get(student.section) || student.section || 'Unknown';
          const key = `${student.department}-${student.year_level}-${sectionName}`;
          const existing = capacityMap.get(key);
          
          if (existing) {
            existing.studentCount += 1;
          } else {
            capacityMap.set(key, {
              id: key,
              program: student.department || 'Unknown',
              yearLevel: student.year_level || 'Unknown',
              section: sectionName,
              studentCount: 1,
              maxCapacity: 50 // Default max capacity per section
            });
          }
        });
        
        return Array.from(capacityMap.values()).sort((a, b) => {
          if (a.program !== b.program) return a.program.localeCompare(b.program);
          if (a.yearLevel !== b.yearLevel) return a.yearLevel.localeCompare(b.yearLevel);
          return a.section.localeCompare(b.section);
        });
      }
    } catch (error) {
      console.error('Error in fetchCapacityData:', error);
      return [];
    }
  };

  const fetchEnrollmentData = async (): Promise<EnrollmentData[]> => {
    try {
      // Fetch ALL students with school_year
      const { data: enrollments, error } = await supabase
        .from('user_profiles')
        .select('school_year, enrollment_status')
        .eq('role', 'student')
        .not('school_year', 'is', null); // Only get students with school_year
      
      if (error) {
        console.error('Error fetching enrollment data:', error);
        return [];
      }
      
      // Group students by formatted school_year to avoid duplicates like "2025" and "2025-2026"
      const yearlyData: { [key: string]: number } = {};
      enrollments?.forEach(enrollment => {
        const raw = enrollment.school_year?.toString() || 'Unknown';
        const formatted = formatSchoolYear(raw);
        yearlyData[formatted] = (yearlyData[formatted] || 0) + 1;
      });
      
      // Convert to array format and sort by year with professional formatting
      const result = Object.entries(yearlyData)
        .map(([year, count]) => ({ year, count, status: 'current' }))
        .sort((a, b) => {
          // Sort by year numerically if possible, otherwise alphabetically
          const yearA = parseInt(a.year.split('-')[0]) || 0;
          const yearB = parseInt(b.year.split('-')[0]) || 0;
          return yearB - yearA; // Most recent first
        });
      
      return result;
    } catch (error) {
      console.error('Error in fetchEnrollmentData:', error);
      return [];
    }
  };






  const handleViewAllActivity = () => {
    // When opening activity modal, mark grades as seen
    try {
      const now = Date.now();
      localStorage.setItem(LAST_SEEN_GRADES_KEY, String(now));
    } catch { /* ignore */ }
    setHasNewGrades(false);
    setActivitySearchTerm(''); // Reset search when opening modal
    setShowActivityModal(true);
  };

  // Filter activities based on search term
  const filteredActivities = recentActivities.filter(activity => {
    if (!activitySearchTerm.trim()) return true;
    
    const searchLower = activitySearchTerm.toLowerCase();
    const action = (activity.action || '').toLowerCase();
    const description = (activity.description || '').toLowerCase();
    const student = (activity.student || '').toLowerCase();
    const course = (activity.course || '').toLowerCase();
    const section = (activity.section || '').toLowerCase();
    const instructor = (activity.instructor || '').toLowerCase();
    
    return action.includes(searchLower) ||
           description.includes(searchLower) ||
           student.includes(searchLower) ||
           course.includes(searchLower) ||
           section.includes(searchLower) ||
           instructor.includes(searchLower);
  });


  const handleViewEnrollmentDetails = () => {
    navigate('/dashboard/enrollment-approvals');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Activity Modal - Using Portal */}
      {showActivityModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowActivityModal(false)}
        >
          <div 
            className="w-[90vw] max-w-4xl max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Activity Log</h3>
              <button 
                onClick={() => setShowActivityModal(false)} 
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              </div>
              
              {/* Search Bar */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-blue-500">
                  <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search activities by action, student, subject..."
                  value={activitySearchTerm}
                  onChange={(e) => setActivitySearchTerm(e.target.value)}
                  className="block w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-sm transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
                />
                {activitySearchTerm && (
                  <button
                    onClick={() => setActivitySearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
              {recentActivities.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <Clock4 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No recent activity</p>
                  <p className="text-sm text-gray-400 mt-2">Activity will appear here as it happens</p>
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-lg font-medium">No activities found</p>
                  <p className="text-sm text-gray-400 mt-2">Try adjusting your search terms</p>
                </div>
              ) : (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {filteredActivities.map((item, index) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ 
                        opacity: 0, 
                        y: 20, 
                        scale: 0.95,
                        rotateX: -10
                      }}
                      animate={{ 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                        rotateX: 0
                      }}
                      exit={{ 
                        opacity: 0, 
                        y: -10, 
                        scale: 0.95,
                        rotateX: 10
                      }}
                      transition={{ 
                        duration: 0.4, 
                        delay: index * 0.08,
                        type: "spring",
                        stiffness: 100,
                        damping: 15
                      }}
                      whileHover={{ 
                        scale: 1.01,
                        y: -1,
                        transition: { 
                          duration: 0.15,
                          ease: "easeOut",
                          type: "tween"
                        }
                      }}
                      className="flex items-start p-4 rounded-xl border border-gray-200 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all duration-150 shadow-sm hover:shadow-lg group cursor-pointer"
                    >
                      <motion.div 
                        className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-4 flex-shrink-0 group-hover:bg-blue-600 transition-colors duration-150"
                        whileHover={{ scale: 1.3 }}
                        transition={{ 
                          duration: 0.15,
                          ease: "easeOut",
                          type: "tween"
                        }}
                      ></motion.div>
                      <div className="flex-1 min-w-0">
                                <motion.p 
                                  className="text-gray-900 font-medium"
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.08 + 0.2, duration: 0.3 }}
                                >
                                  {item.action || item.description}
                                  {item.student && <span className="text-gray-700 ml-2 font-medium">• {item.student}</span>}
                                  {item.course && <span className="ml-2">• <span className="text-white px-2 py-1 rounded-full text-xs font-medium" style={{color: '#FFFFFF', backgroundColor: '#00A7E1'}}>{item.course}</span></span>}
                                  {item.section && <span className="ml-2">• <span className="text-white px-2 py-1 rounded-full text-xs font-medium" style={{color: '#FFFFFF', backgroundColor: '#007EA7'}}>{item.section}</span></span>}
                                  {item.instructor && <span className="ml-2">• <span className="text-white px-2 py-1 rounded-full text-xs font-medium" style={{color: '#FFFFFF', backgroundColor: '#003459'}}>{item.instructor}</span></span>}
                                </motion.p>
                        <motion.p 
                          className="text-gray-500 text-sm mt-1 flex items-center"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.08 + 0.3, duration: 0.3 }}
                        >
                          <motion.svg 
                            className="w-3 h-3 mr-1" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </motion.svg>
                          {item.time || item.created_at}
                        </motion.p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 flex justify-between items-center">
              <div className="text-sm text-gray-600 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Showing <span className="font-semibold text-blue-600 mx-1">{filteredActivities.length}</span> of <span className="font-semibold text-gray-700 mx-1">{recentActivities.length}</span> activities
              </div>
           
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Professional Modal - Using Portal */}
      {showCapacityModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCapacityModal(false)}
        >
          <div 
            className="w-[90vw] max-w-4xl max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">Capacity Details</h3>
              <button 
                onClick={() => setShowCapacityModal(false)} 
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              {capacityData.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No capacity data available</p>
                  <p className="text-sm text-gray-400 mt-2">Capacity information will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {capacityData.map(row => (
                    <div key={row.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-gray-900 font-semibold">{row.program} - {row.yearLevel}</p>
                          <p className="text-gray-600 text-sm">Section: {row.section}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-900 font-semibold mb-2">{row.studentCount}/{row.maxCapacity}</p>
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                (row.studentCount/row.maxCapacity)*100 >= 100 ? 'bg-red-500' : 
                                (row.studentCount/row.maxCapacity)*100 >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
                              }`} 
                              style={{ width: `${Math.min((row.studentCount/row.maxCapacity)*100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowCapacityModal(false)} 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Registrar Dashboard</h1>
                <p className="text-white/80 text-sm font-medium">Welcome back! Here's what's happening today.</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80">
                  <span>Last updated: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6"
      >
        <div className="bg-white/90 rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Enrollments</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingEnrollments}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white/90 rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Subjects</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalCourses}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white/90 rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{stats.studentRecords}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2 bg-white/90 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <div className="relative mr-3">
                <Clock className="w-5 h-5 text-gray-600" />
                {hasNewGrades && (
                  <span className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </div>
              Recent Activity
            </h2>
              <button 
                onClick={handleViewAllActivity}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                View All
              </button>
            </div>
            <span className="text-sm text-gray-500 flex items-center gap-2">
              {hasNewGrades && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">New grades</span>
              )}
              {recentActivities.length} activities
            </span>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {loadingStates.activities ? (
              <div className="text-gray-500 text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Loading activities...</p>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <Clock4 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No recent activity.</p>
              </div>
            ) : (
              recentActivities.map(activity => (
                <motion.div 
                  key={activity.id} 
                      className="flex items-start p-4 rounded-xl transition-colors cursor-pointer border bg-gray-50 border-gray-200"
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0" style={{backgroundColor: '#00A7E1'}}></div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium">
                      {activity.action || activity.description}
                      {activity.student && <span className="text-gray-700"> - {activity.student}</span>}
                      {activity.course && <span> - <span className="text-white px-2 py-1 rounded-full text-xs font-medium" style={{color: '#FFFFFF', backgroundColor: '#00A7E1'}}>{activity.course}</span></span>}
                      {activity.section && <span> - <span className="text-white px-2 py-1 rounded-full text-xs font-medium" style={{color: '#FFFFFF', backgroundColor: '#007EA7'}}>{activity.section}</span></span>}
                      {activity.instructor && <span> - <span className="text-white px-2 py-1 rounded-full text-xs font-medium" style={{color: '#FFFFFF', backgroundColor: '#003459'}}>{activity.instructor}</span></span>}
                    </p>
                    <p className="text-gray-500 text-sm">{activity.time || activity.created_at}</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Capacity Tracking */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/90 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <div className="mr-3">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              Capacity Tracking
            </h2>
          </div>
          <div className="border-t border-gray-200 my-2"></div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {loadingStates.capacity ? (
              <div className="text-gray-500 text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Loading capacity data...</p>
              </div>
            ) : capacityData.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No capacity data available.</p>
              </div>
            ) : (
              capacityData.map(capacity => (
                <CapacityItem 
                  key={capacity.id}
                  program={capacity.program}
                  yearLevel={capacity.yearLevel}
                  section={capacity.section}
                  studentCount={capacity.studentCount}
                  maxCapacity={capacity.maxCapacity}
                />
              ))
            )}
          </div>
        </motion.div>
        
        {/* Grade Change Request moved next to Enrollment Summary below */}
      </div>

      {/* Enrollment Summary and Grade Change Request side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white/90 rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="mr-3">
                <BarChart4 className="w-5 h-5 text-gray-600" />
              </div>
              Enrollment Summary
            </h2>
            <button 
              onClick={handleViewEnrollmentDetails}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center gap-1 shadow-lg hover:shadow-xl"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              View All
            </button>
          </div>
     
        </div>
        <div className="border-t border-gray-200 mb-4"></div>

        {/* Modern Enrollment Area Chart */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
          {loadingStates.enrollment ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold text-lg">Loading enrollment data...</p>
            </div>
          ) : enrollmentData.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600">Total Students</span>
                </div>
                <div className="text-sm text-gray-500">
                  {enrollmentData.reduce((sum, item) => sum + item.count, 0)} total students
                </div>
              </div>
              <EnrollmentAreaChart data={enrollmentData.slice().reverse()} />
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart4 className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-semibold text-lg">No Enrollment Data</p>
              <p className="text-sm text-gray-500 mt-1">Students will appear here once they enroll</p>
            </div>
          )}
        </div>
      </motion.div>
         {/* Instructor Grade Edit Requests */}
         <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="bg-white/90 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <div className="mr-3">
                <ShieldAlert className="w-5 h-5 text-gray-600" />
              </div>
           Grade Request
            </h2>
            <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{instructorRequests.length} request(s)</span>
            </div>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {requestsLoading ? (
              <div className="text-gray-500 text-center py-8">Loading requests…</div>
            ) : instructorRequests.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No pending requests.</div>
            ) : (
              instructorRequests.map(req => {
                const status = (req.edit_status || '').toLowerCase();
                const requestedAt = req.created_at ? new Date(req.created_at).toLocaleString() : 'Unknown';
                return (
                  <div 
                    key={req.id} 
                    className="p-3 rounded-xl border bg-white/80 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all duration-200"
                    onClick={() => navigate(`/dashboard/student-grades?studentId=${req.student_id}&subjectId=${req.subject_id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 truncate">Inst: {req.instructor_name || 'Unknown Instructor'}</div>
                        <div className="text-xs text-gray-900 truncate">Student: {req.student_name || req.student_id}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center px-3 py-1 text-xs rounded-md border ${status === 'pending' ? 'bg-amber-50 text-amber-900 border-amber-200' : status === 'granted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : status === 'denied' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>{status || 'pending'}</span>
                        <span className="pointer-events-none inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-medium shadow-sm hover:bg-blue-700 transition-colors">
                          Click to view →
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 truncate">Section: {req.section || 'N/A'}  • Requested: {requestedAt}</div>
                    {req.edit_reason && (
                      <div className="mt-1 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 whitespace-pre-wrap break-words">
                        {req.edit_reason}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
      </div>
    </>
  );
};

// Helper Components

const CapacityItem: React.FC<{ 
  program: string; 
  yearLevel: string; 
  section: string;
  studentCount: number;
  maxCapacity: number;
}> = ({ program, yearLevel, section, studentCount, maxCapacity }) => {
  const capacityPercentage = (studentCount / maxCapacity) * 100;
  const isNearCapacity = capacityPercentage >= 80;
  const isAtCapacity = capacityPercentage >= 100;

  const getCapacityColor = () => {
    if (isAtCapacity) return "#003459"; // Dark Blue
    if (isNearCapacity) return "#007EA7"; // Teal/Cyan
    return "#00A7E1"; // Bright Blue
  };

  const getCapacityIcon = () => {
    if (isAtCapacity) return "🔴";
    if (isNearCapacity) return "🟡";
    return "🔵";
  };

  // Removed getBackgroundColor function - using consistent gray background

  return (
    <motion.div 
      className={`flex items-center p-4 rounded-xl transition-colors cursor-pointer border bg-gray-50 border-gray-200`}
      whileHover={{ x: 5 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex-1">
        <p className="text-gray-800 font-medium">
          {program} - {yearLevel}
        </p>
        <p className="text-gray-600 text-sm">
           {section}
        </p>
      </div>
      <div className="text-right">
        <p className="text-gray-800 font-medium mb-2">
          {studentCount}/{maxCapacity}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300`}
              style={{ width: `${Math.min(capacityPercentage, 100)}%`, backgroundColor: getCapacityColor() }}
            ></div>
          </div>
          <span className="text-lg">{getCapacityIcon()}</span>
        </div>
      </div>
    </motion.div>
    
  );
};

const RegistrarDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/dashboard" element={<DashboardOverview />} />
        <Route path="/enrollment-approvals" element={<RegistrarEnrollment />} />
        <Route path="/student-records" element={<StudentRecords />} />
        <Route path="/subject-review" element={<RegistrarGradeViewer />} />
        <Route path="/student-grades" element={<StudentGrades />} />
        <Route path="/class-list" element={<ClassList />} />
        <Route path="/prospectus" element={<RegistrarProspectus />} />
        <Route path="/profile" element={<Settings />} />
        <Route path="*" element={<DashboardOverview />} />
      </Routes>
    </DashboardLayout>
  );
};

export default RegistrarDashboard; 
