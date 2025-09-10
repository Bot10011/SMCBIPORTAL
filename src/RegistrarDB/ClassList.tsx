// src/RegistrarDB/ClassList.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, RefreshCw, Download, ChevronDown, ChevronUp } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClassGroup {
  year_level: string;
  section: string;
  program: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  student_id?: string | null;
  year_level: string;
  section: string;
  program: string;
  email?: string;
  gender?: string | null;
}

interface SectionRow {
  id: string;
  name: string;
  year_level: number | null;
  academic_year?: string | null;
}

const ClassList: React.FC = () => {
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ClassGroup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [programOptions, setProgramOptions] = useState<string[]>([]);
  const [yearLevelOptions, setYearLevelOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [newClass, setNewClass] = useState<{ program: string; year_level: string; section: string }>({ program: '', year_level: '', section: '' });
  const [loading, setLoading] = useState(false);

  // Enhanced state for better functionality
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [query, setQuery] = useState('');
  const [studentYearFilter, setStudentYearFilter] = useState<'all' | number>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [viewingSection, setViewingSection] = useState<SectionRow | null>(null);
  const [sectionStudents, setSectionStudents] = useState<Student[]>([]);
  const [sectionStudentsLoading, setSectionStudentsLoading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'sections' | 'students'>('sections');

  // State for collapsible sections
  const [expandedYears, setExpandedYears] = useState<number | null>(null);

  // Fetch sections and students
  useEffect(() => {
    fetchSections();
    fetchAllStudents();
  }, []);

  async function fetchSections() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, year_level, academic_year')
        .order('year_level', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      setSections((data || []) as SectionRow[]);
    } catch (err) {
      console.error('Failed to fetch sections:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllStudents() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, middle_name, student_id, year_level, section, is_active, role, gender, department')
        .eq('role', 'student')
        .order('year_level', { ascending: true })
        .order('last_name', { ascending: true });

      if (error) throw error;

      const sanitized = (data || []).map((row: any) => ({
        id: row.id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        middle_name: row.middle_name ?? null,
        student_id: row.student_id ?? null,
        year_level: String(row.year_level ?? ''),
        section: row.section ?? null,
        program: row.department ?? '',
        gender: row.gender ?? null,
      })) as Student[];

      setStudents(sanitized);
    } catch (e: any) {
      console.error('Failed to load students:', e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  // Legacy function for backward compatibility
  const fetchClassGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('enrollcourse')
      .select('section, user_profiles(year_level, department)')
      .neq('section', null);
    if (!error && data) {
      // Flatten and filter
      const unique: Record<string, ClassGroup> = {};
      data.forEach((row: any) => {
        if (row.section && row.user_profiles?.year_level && row.user_profiles?.department) {
          const key = `${row.user_profiles.department}|${row.user_profiles.year_level}|${row.section}`;
          unique[key] = { program: row.user_profiles.department, year_level: row.user_profiles.year_level, section: row.section };
        }
      });
      setClassGroups(Object.values(unique));
      setProgramOptions([...new Set(data.map((row: any) => row.user_profiles?.department).filter(Boolean))]);
      setYearLevelOptions([...new Set(data.map((row: any) => row.user_profiles?.year_level).filter(Boolean))]);
      setSectionOptions([...new Set(data.map((row: any) => row.section).filter(Boolean))]);
    }
    setLoading(false);
  };

  // Fetch students for selected group from enrollcourse (join user_profiles)
  useEffect(() => {
    if (!selectedGroup) return;
    const fetchStudents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('enrollcourse')
        .select('user_profiles(id, first_name, last_name, year_level, department), section')
        .eq('section', selectedGroup.section)
        .neq('section', null);
      if (!error && data) {
        setStudents(
          data
            .filter((row: { user_profiles: any }) => row.user_profiles)
            .map((row: { user_profiles: any; section: string }) => ({
              id: row.user_profiles.id,
              first_name: row.user_profiles.first_name,
              last_name: row.user_profiles.last_name,
              year_level: row.user_profiles.year_level,
              section: row.section,
              program: row.user_profiles.department,
            }))
        );
      } else {
        setStudents([]);
      }
      setLoading(false);
    };
    fetchStudents();
  }, [selectedGroup]);

  async function fetchStudentsBySection(sectionId: string) {
    setSectionStudentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, middle_name, student_id, year_level, section, is_active, role, gender, department')
        .eq('role', 'student')
        .eq('section', sectionId)
        .order('last_name', { ascending: true });
      if (error) throw error;
      setSectionStudents((data || []).map((row: any) => ({
        id: row.id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        middle_name: row.middle_name ?? null,
        student_id: row.student_id ?? null,
        year_level: String(row.year_level ?? ''),
        section: row.section ?? null,
        program: row.department ?? '',
        gender: row.gender ?? null,
      })) as Student[]);
    } catch (e) {
      console.error('Failed to load section students:', e);
      setSectionStudents([]);
    } finally {
      setSectionStudentsLoading(false);
    }
  }

  function getSectionName(sectionId: string | null | undefined): string {
    if (!sectionId) return 'Unassigned';
    const s = sections.find(sec => sec.id === sectionId);
    return s ? s.name : 'Unassigned';
  }

  // PDF Generation function
  function generateClassListPDF() {
    if (!viewingSection || sectionStudents.length === 0) {
      alert('No students to export');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // School Header (compact version)
    doc.setFontSize(11);
    doc.setTextColor(30, 64, 175); // #1e40af
    doc.setFont('helvetica', 'bold');
    doc.text('St. Mary\'s College of Bansalan, Inc.', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(6);
    doc.setTextColor(107, 114, 128); // #6b7280
    doc.setFont('helvetica', 'normal');
    doc.text('(Formerly: Holy Cross of Bansalan College, Inc.)', pageWidth / 2, 20, { align: 'center' });
    
    doc.setTextColor(55, 65, 81); // #374151
    doc.text('Dahlia Street, Poblacion Uno, Bansalan, Davao del Sur, 8005 Philippines', pageWidth / 2, 24, { align: 'center' });
    
    // Title
    doc.setFontSize(9);
    doc.setTextColor(30, 64, 175); // #1e40af
    doc.setFont('helvetica', 'bold');
    doc.text('CLASS LIST', pageWidth / 2, 40, { align: 'center' });
    
    // Section Information
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55); // #1f2937
    doc.setFont('helvetica', 'normal');
    doc.text(`Section: ${viewingSection.name}`, 20, 48);
    doc.text(`Year Level: ${viewingSection.year_level}`, 20, 53);
    if (viewingSection.academic_year) {
      doc.text(`Academic Year: ${viewingSection.academic_year}`, 20, 58);
    }
    
    // Generate date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Generated on: ${currentDate}`, pageWidth - 20, 48, { align: 'right' });
    
    // Separate students by gender
    const maleStudents = sectionStudents.filter(s => s.gender === 'Male');
    const femaleStudents = sectionStudents.filter(s => s.gender === 'Female');
    const otherStudents = sectionStudents.filter(s => s.gender && s.gender !== 'Male' && s.gender !== 'Female');
    
    let currentY = 65;
    
    // Helper function to generate table for a gender group
    const generateGenderTable = (students: Student[], genderLabel: string, color: [number, number, number], startY: number) => {
      if (students.length === 0) return startY;
      
      // Gender section header
      doc.setFontSize(10);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${genderLabel} Students (${students.length})`, 20, startY);
      currentY = startY + 6;
      
      // Prepare table data
      const tableData = students.map((student, index) => [
        index + 1,
        student.student_id || 'N/A',
        `${student.last_name}, ${student.first_name}${student.middle_name ? ` ${student.middle_name}` : ''}`
      ]);
      
      // Table headers
      const headers = ['No.', 'Student ID', 'Name'];
      
      // Generate table
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: currentY,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: color,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252], // Light gray
        },
        columnStyles: {
          0: { cellWidth: 15 }, // No. column
          1: { cellWidth: 35 }, // Student ID column
          2: { cellWidth: 120 }, // Name column
        },
        margin: { left: 20, right: 20 },
        tableLineWidth: 0.1,
        tableLineColor: [200, 200, 200],
      });
      
      // Get the final Y position after the table
      const finalY = (doc as any).lastAutoTable?.finalY || currentY + 20;
      return finalY + 10; // Add some spacing
    };
    
    // Generate tables for each gender
    currentY = generateGenderTable(maleStudents, 'Male', [59, 130, 246], currentY); // Blue
    currentY = generateGenderTable(femaleStudents, 'Female', [236, 72, 153], currentY); // Pink
    currentY = generateGenderTable(otherStudents, 'Other', [107, 114, 128], currentY); // Gray
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0); // Black color
    doc.setFont('helvetica', 'italic');
    doc.text(`Total Students: ${sectionStudents.length}`, pageWidth / 2, currentY + 10, { align: 'center' });
    
    // Save the PDF
    const fileName = `ClassList_${viewingSection.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassGroups(prev => [
      ...prev,
      { program: newClass.program, year_level: newClass.year_level, section: newClass.section }
    ]);
    setShowAddModal(false);
    setNewClass({ program: '', year_level: '', section: '' });
  };

  // Group sections by year level (respecting the Year Level filter)
  const groupedSections = React.useMemo(() => {
    const map = new Map<number, SectionRow[]>();
    sections.forEach(s => {
      const year = Number(s.year_level || 0);
      if (studentYearFilter !== 'all' && Number(studentYearFilter) !== year) return;
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(s);
    });
    const entries = Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    entries.forEach(([, list]) => list.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    return entries;
  }, [sections, studentYearFilter]);

  return (
    <div className="p-4 md:p-6">
      <div 
        className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 shadow-lg rounded-xl"
        style={{ marginLeft: '-0.5rem', marginRight: '-0.5rem' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Class List Viewer</h2>
            <div className="flex items-center rounded-md bg-white/15 p-1 text-white">
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded ${activeTab === 'sections' ? 'bg-white/90 text-blue-700' : 'text-white/90 hover:bg-white/20'}`}
                onClick={() => setActiveTab('sections')}
              >
                Section List
              </button>
        <button
                className={`px-3 py-1.5 text-sm font-medium rounded ${activeTab === 'students' ? 'bg-white/90 text-blue-700' : 'text-white/90 hover:bg-white/20'}`}
                onClick={() => setActiveTab('students')}
        >
                Student List
        </button>
      </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/80" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search ID, name, email"
                className="w-64 rounded-md border border-white/20 bg-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder-white/80 outline-none focus:ring-2 focus:ring-white/50"
              />
        </div>
            <button
              onClick={() => fetchAllStudents()}
              className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-60"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
                </div>
                </div>
      {loading && (
        <div className="rounded border border-gray-200 bg-white p-6 text-gray-600">Loading…</div>
      )}

      {activeTab === 'sections' && !loading && (
        <div className="space-y-6">
          {/* Sections grouped by Year Level */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Section List by Year Level</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Year Level</label>
                <select
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={studentYearFilter}
                  onChange={e => setStudentYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">All</option>
                  {[1,2,3,4].map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>
            </div>

            {groupedSections.length === 0 && (
              <div className="text-sm text-gray-600">No sections found for the selected year level.</div>
            )}

            <div className="space-y-3">
              {groupedSections.map(([year, list]) => (
                <div key={year} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedYears(prev => (prev === year ? null : year))}
                    className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      {expandedYears === year ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      )}
                      <h4 className="text-sm font-semibold text-gray-800">Year {year}</h4>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{list.length} section{list.length !== 1 ? 's' : ''}</span>
                    </div>
                  </button>

                  {expandedYears === year && (
                    <div className="p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {list.map(sec => (
                          <button
                            key={sec.id}
                            onClick={() => { setViewingSection(sec); void fetchStudentsBySection(sec.id); setShowViewModal(true); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewingSection(sec); void fetchStudentsBySection(sec.id); setShowViewModal(true); } }}
                            className="flex flex-col items-start gap-2 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                            <div className="flex w-full items-start justify-between">
                              <div className="flex-1 text-left">
                                <h3 className="font-semibold text-gray-900 text-left">{sec.name}</h3>
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                    {students.filter(s => s.section === sec.id).length} students
                                  </div>
                                </div>
                              </div>
                            </div>
                            {sec.academic_year && (
                              <div className="text-xs text-gray-600 text-left mt-1">AY: {sec.academic_year}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && !loading && (
        <div className="space-y-6">
          {/* Filters for student list */}
          <div className="mb-2 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Year</span>
              <select
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={studentYearFilter}
                onChange={e => setStudentYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">All</option>
                {[1,2,3,4].map(y => (<option key={y} value={y}>{y}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Assignment</span>
              <select
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={assignmentFilter}
                onChange={e => setAssignmentFilter(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>

          {/* Student List */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <colgroup>
                <col className="w-40" />
                <col className="w-[22rem]" />
                <col className="w-[26rem]" />
                <col className="w-24" />
                <col className="w-28" />
              </colgroup>
              <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Student No.</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Name</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Email</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Year Level</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Section</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-gray-100">
                {students
                  .filter(s => {
                    const q = query.trim().toLowerCase();
                    if (q) {
                      const name = `${s.last_name}, ${s.first_name} ${s.middle_name || ''}`.toLowerCase();
                      if (!(
                        (s.student_id || '').toLowerCase().includes(q) ||
                        name.includes(q) ||
                        (s.email || '').toLowerCase().includes(q)
                      )) return false;
                    }
                    if (assignmentFilter === 'assigned') return !!s.section;
                    if (assignmentFilter === 'unassigned') return !s.section;
                    if (studentYearFilter !== 'all') return String(s.year_level || '') === String(studentYearFilter);
                    return true;
                  })
                  .map((s, idx) => (
                    <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900">{s.student_id || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900 truncate">
                        {s.last_name}, {s.first_name}{s.middle_name ? ` ${s.middle_name}` : ''}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700 truncate">{s.email}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700">{s.year_level ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700">{getSectionName(s.section as any)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      )}
      {/* View Section Modal */}
      {showViewModal && viewingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowViewModal(false)} />
          <div className="relative z-10 w-full max-w-4xl rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-800">Section: {viewingSection.name}</h3>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">Year {viewingSection.year_level ?? '—'}</span>
                {viewingSection.academic_year && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">AY {viewingSection.academic_year}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateClassListPDF}
                  className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
            {sectionStudentsLoading ? (
              <div className="rounded border border-gray-200 bg-white p-6 text-gray-600">Loading…</div>
            ) : (
              <div className="space-y-6">
                {/* Male Students Table */}
                {(() => {
                  const maleStudents = sectionStudents.filter(s => s.gender === 'Male');
                  return maleStudents.length > 0 && (
                    <div className="mb-6">
                      <div className="mb-3 flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-blue-700">Male Students ({maleStudents.length})</h4>
                        <div className="h-px flex-1 bg-blue-200"></div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-blue-200 bg-blue-50/30">
                        <table className="min-w-full table-fixed divide-y divide-blue-200">
                          <colgroup>
                            <col className="w-40" />
                            <col className="w-[22rem]" />
                            <col className="w-[26rem]" />
                            <col className="w-24" />
                          </colgroup>
                          <thead className="bg-blue-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-blue-800">Student No.</th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-blue-800">Name</th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-blue-800">Email</th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-blue-800">Year</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-200 bg-white">
                            {maleStudents.map((s, idx) => (
                              <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'}>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900">{s.student_id || '—'}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900 truncate">{s.last_name}, {s.first_name}{s.middle_name ? ` ${s.middle_name}` : ''}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700 truncate">{s.email}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700">{s.year_level ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Female Students Table */}
                {(() => {
                  const femaleStudents = sectionStudents.filter(s => s.gender === 'Female');
                  return femaleStudents.length > 0 && (
                    <div className="mb-6">
                      <div className="mb-3 flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-pink-700">Female Students ({femaleStudents.length})</h4>
                        <div className="h-px flex-1 bg-pink-200"></div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-pink-200 bg-pink-50/30">
                        <table className="min-w-full table-fixed divide-y divide-pink-200">
                          <colgroup>
                            <col className="w-40" />
                            <col className="w-[22rem]" />
                            <col className="w-[26rem]" />
                            <col className="w-24" />
                          </colgroup>
                          <thead className="bg-pink-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-pink-800">Student No.</th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-pink-800">Name</th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-pink-800">Email</th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-pink-800">Year</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-pink-200 bg-white">
                            {femaleStudents.map((s, idx) => (
                              <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-pink-50/50'}>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900">{s.student_id || '—'}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900 truncate">{s.last_name}, {s.first_name}{s.middle_name ? ` ${s.middle_name}` : ''}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700 truncate">{s.email}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700">{s.year_level ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Other/Unknown Gender Students Table */}
                {(() => {
                  const otherStudents = sectionStudents.filter(s => s.gender && s.gender !== 'Male' && s.gender !== 'Female');
                  return otherStudents.length > 0 && (
                    <div className="mb-6">
                      <div className="mb-3 flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-700">Other ({otherStudents.length})</h4>
                        <div className="h-px flex-1 bg-gray-200"></div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50/30">
                        <table className="min-w-full table-fixed divide-y divide-gray-200">
                          <colgroup>
                            <col className="w-40" />
                            <col className="w-[22rem]" />
                            <col className="w-[26rem]" />
                            <col className="w-24" />
                          </colgroup>
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-800">Student No.</th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-800">Name</th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-800">Email</th>
                              <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-800">Year</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {otherStudents.map((s, idx) => (
                              <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900">{s.student_id || '—'}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900 truncate">{s.last_name}, {s.first_name}{s.middle_name ? ` ${s.middle_name}` : ''}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700 truncate">{s.email}</td>
                                <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700">{s.year_level ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* No Students Message */}
                {sectionStudents.length === 0 && (
                  <div className="rounded border border-gray-200 bg-white p-6 text-center text-gray-600">
                    No students assigned yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassList;
