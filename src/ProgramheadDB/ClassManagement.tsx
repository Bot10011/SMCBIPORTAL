import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, RefreshCw, ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react';

type StudentRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  student_id?: string | null;
  year_level?: number | string | null;
  section?: string | null;
  is_active?: boolean;
};

type SectionRow = {
  id: string;
  name: string;
  year_level: number | null;
  academic_year?: string | null;
};

const ClassManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [query, setQuery] = useState('');
  const [studentYearFilter, setStudentYearFilter] = useState<'all' | number>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'unassigned' | 'sections'>('unassigned');

  // Sections tab state
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [sectionYear, setSectionYear] = useState<number>(1);
  const [newSection, setNewSection] = useState<{ name: string; year_level: number; academic_year: string }>({ name: '', year_level: 1, academic_year: '' });
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [viewingSection, setViewingSection] = useState<SectionRow | null>(null);
  const [sectionStudentsLoading, setSectionStudentsLoading] = useState(false);
  const [sectionStudents, setSectionStudents] = useState<StudentRow[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionRow | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState<string | null>(null);
  const [sectionStudentCounts, setSectionStudentCounts] = useState<Record<string, number>>({});

  function getNextSectionName(baseName: string | null | undefined): string {
    const name = (baseName || '').trim();
    if (!name) return 'A';
    const match = name.match(/([A-Za-z])$/);
    if (!match) return 'A';
    const last = match[1].toUpperCase();
    if (last === 'Z') return 'A';
    return String.fromCharCode(last.charCodeAt(0) + 1);
  }

  function getDefaultAcademicYear(): string {
    const now = new Date();
    const year = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1; // academic year often starts mid-year
    const next = year + 1;
    return `${year}-${next}`;
  }

  async function autoAssignSections() {
    setAutoAssignLoading(true);
    setAutoAssignError(null);
    try {
      // Refresh latest sections
      await fetchSections();

      const targetYear = Number(sectionYear);

      // 1) Get all unassigned students with year level for the selected year only
      const { data: unassigned, error: unassignedError } = await supabase
        .from('user_profiles')
        .select('id, year_level')
        .eq('role', 'student')
        .is('section', null);
      if (unassignedError) throw unassignedError;
      const unassignedForYear = (unassigned || []).filter(s => Number((s as { year_level: number | string | null }).year_level || 0) === targetYear);

      // 2) Build current section counts for selected year by reading assigned students
      const { data: assignedRows, error: assignedError } = await supabase
        .from('user_profiles')
        .select('id, section')
        .not('section', 'is', null);
      if (assignedError) throw assignedError;
      const sectionCounts = new Map<string, number>();
      const targetYearSectionIds = new Set(
        sections.filter(s => Number(s.year_level || 0) === targetYear).map(s => s.id)
      );
      (assignedRows || []).forEach(row => {
        const sec = (row as { section: string | null }).section;
        if (sec && targetYearSectionIds.has(sec)) sectionCounts.set(sec, (sectionCounts.get(sec) || 0) + 1);
      });

      // 3) Group sections by year level for quick access
      const sectionsByYear = new Map<number, SectionRow[]>();
      sections.forEach(s => {
        const yl = Number(s.year_level || 0);
        if (!sectionsByYear.has(yl)) sectionsByYear.set(yl, []);
        sectionsByYear.get(yl)!.push(s);
      });
      // Sort sections by name for a stable order
      sectionsByYear.forEach(list => list.sort((a, b) => (a.name || '').localeCompare(b.name || '')));

      // 4) Prepare batch updates per section id
      const updatesBySection = new Map<string, string[]>();

      for (const student of unassignedForYear) {
        const year = targetYear;

        // Ensure we have a section list for this year
        if (!sectionsByYear.has(year)) sectionsByYear.set(year, []);
        let yearSections = sectionsByYear.get(year)!;

        // Find first section with available capacity (< 40)
        let target: SectionRow | null = null;
        for (const sec of yearSections) {
          const count = sectionCounts.get(sec.id) || 0;
          if (count < 40) { target = sec; break; }
        }

        // If none available, create a new section by incrementing the last letter
        if (!target) {
          // Use last existing section as base for naming
          const base = yearSections.length > 0 ? yearSections[yearSections.length - 1] : null;
          const newName = `IT ${year}${getNextSectionName(base?.name || 'A')}`;
          const academicYear = base?.academic_year || getDefaultAcademicYear();
          const { data: created, error: createErr } = await supabase
            .from('sections')
            .insert([{ name: newName, year_level: year, academic_year: academicYear }])
            .select('id, name, year_level, academic_year')
            .single();
          if (createErr) throw createErr;
          const createdSection = created as SectionRow;
          // Push to local structures
          yearSections.push(createdSection);
          sectionsByYear.set(year, yearSections);
          sectionCounts.set(createdSection.id, 0);
          setSections(prev => [...prev, createdSection]);
          target = createdSection;
        }

        if (target) {
          const current = sectionCounts.get(target.id) || 0;
          if (current >= 40) continue; // safety guard
          sectionCounts.set(target.id, current + 1);
          const list = updatesBySection.get(target.id) || [];
          list.push((student as { id: string }).id);
          updatesBySection.set(target.id, list);
        }
      }

      // 5) Perform batch updates per section id
      for (const [sectionId, studentIds] of updatesBySection.entries()) {
        if (studentIds.length === 0) continue;
        const { error: updErr } = await supabase
          .from('user_profiles')
          .update({ section: sectionId })
          .in('id', studentIds);
        if (updErr) throw updErr;
      }

      // Refresh unassigned list
      await fetchStudents();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'Auto-assign failed';
      setAutoAssignError(msg);
      console.error('Auto-assign error:', e);
    } finally {
      setAutoAssignLoading(false);
    }
  }

  useEffect(() => {
    void fetchStudents();
    void fetchSections();
  }, []);

  async function fetchStudents() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, middle_name, student_id, year_level, section, is_active, role')
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
        year_level: row.year_level ?? null,
        section: row.section ?? null,
        is_active: row.is_active,
      })) as StudentRow[];

      setStudents(sanitized);
    } catch (e: any) {
      setError(e?.message || 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSections() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, year_level, academic_year')
        .order('year_level', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      setSections((data || []) as SectionRow[]);
      // Fetch student counts for each section
      await fetchSectionStudentCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sections');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSectionStudentCounts() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('section')
        .eq('role', 'student')
        .not('section', 'is', null);
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      (data || []).forEach(student => {
        if (student.section) {
          counts[student.section] = (counts[student.section] || 0) + 1;
        }
      });
      setSectionStudentCounts(counts);
    } catch (err) {
      console.error('Failed to fetch section student counts:', err);
    }
  }

  async function handleCreateSection() {
    if (!newSection.name.trim()) {
      setCreateError('Section name is required');
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const { data, error } = await supabase
        .from('sections')
        .insert([{ name: newSection.name.trim(), year_level: newSection.year_level, academic_year: newSection.academic_year || null }])
        .select('id, name, year_level, academic_year')
        .single();
      if (error) throw error;
      setSections(prev => [...prev, data as SectionRow].sort((a, b) => (Number(a.year_level) - Number(b.year_level)) || a.name.localeCompare(b.name)));
      setNewSection({ name: '', year_level: newSection.year_level, academic_year: newSection.academic_year });
      // keep the filter aligned to created section year
      setSectionYear(Number(data?.year_level ?? newSection.year_level));
      setShowCreateModal(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create section';
      setCreateError(msg);
      console.error('Failed to create section:', e);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleEditSection() {
    if (!editingSection || !editingSection.name.trim()) {
      setEditError('Section name is required');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      const { data, error } = await supabase
        .from('sections')
        .update({ 
          name: editingSection.name.trim(), 
          year_level: editingSection.year_level, 
          academic_year: editingSection.academic_year || null 
        })
        .eq('id', editingSection.id)
        .select('id, name, year_level, academic_year')
        .single();
      if (error) throw error;
      setSections(prev => prev.map(s => s.id === editingSection.id ? data as SectionRow : s).sort((a, b) => (Number(a.year_level) - Number(b.year_level)) || a.name.localeCompare(b.name)));
      setShowEditModal(false);
      setEditingSection(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update section';
      setEditError(msg);
      console.error('Failed to update section:', e);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeleteSection(sectionId: string) {
    if (!confirm('Are you sure you want to delete this section? This will unassign all students from this section.')) return;
    setDeleteLoading(sectionId);
    try {
      // First unassign all students from this section
      const { error: unassignError } = await supabase
        .from('user_profiles')
        .update({ section: null })
        .eq('section', sectionId);
      if (unassignError) throw unassignError;

      // Then delete the section
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId);
      if (error) throw error;

      setSections(prev => prev.filter(s => s.id !== sectionId));
      if (viewingSection?.id === sectionId) {
        setViewingSection(null);
        setSectionStudents([]);
      }
    } catch (e) {
      console.error('Failed to delete section:', e);
      alert('Failed to delete section. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  }

  function openEditModal(section: SectionRow) {
    setEditingSection({ ...section });
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleAssignSelected() {
    const ids = Object.entries(selectedStudentIds).filter(([, v]) => v).map(([k]) => k);
    if (!selectedSectionId || ids.length === 0) return;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ section: selectedSectionId })
        .in('id', ids);
      if (error) throw error;
      // Refresh students list
      await fetchStudents();
      setSelectedStudentIds({});
    } catch (e) {
      console.error('Failed to assign students:', e);
    }
  }

  async function fetchStudentsBySection(sectionId: string) {
    setSectionStudentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, middle_name, student_id, year_level, section, is_active, role')
        .eq('role', 'student')
        .eq('section', sectionId)
        .order('last_name', { ascending: true });
      if (error) throw error;
      setSectionStudents((data || []) as StudentRow[]);
    } catch (e) {
      console.error('Failed to load section students:', e);
      setSectionStudents([]);
    } finally {
      setSectionStudentsLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = students;
    // Assignment filter
    if (assignmentFilter === 'assigned') base = base.filter(s => !!s.section);
    if (assignmentFilter === 'unassigned') base = base.filter(s => !s.section);
    // Year filter
    if (studentYearFilter !== 'all') base = base.filter(s => String(s.year_level || '') === String(studentYearFilter));
    if (!q) return base;
    return base.filter(s => {
      const name = `${s.last_name}, ${s.first_name} ${s.middle_name || ''}`.toLowerCase();
      return (
        (s.student_id || '').toLowerCase().includes(q) ||
        name.includes(q) ||
        (s.email || '').toLowerCase().includes(q)
      );
    });
  }, [students, query, assignmentFilter, studentYearFilter]);

  const yearLevels = useMemo(() => {
    const levels = new Set<number | string>();
    filtered.forEach(s => {
      if (s.year_level !== null && s.year_level !== undefined && s.year_level !== '') {
        levels.add(s.year_level as any);
      }
    });
    // Default to 1-4 if empty
    if (levels.size === 0) return [1, 2, 3, 4];
    return Array.from(levels).sort((a: any, b: any) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isNaN(na) || Number.isNaN(nb)) return String(a).localeCompare(String(b));
      return na - nb;
    });
  }, [filtered]);

  const groupedByYear = useMemo(() => {
    const groups = new Map<string, StudentRow[]>();
    filtered.forEach(s => {
      const key = s.year_level === null || s.year_level === undefined || s.year_level === '' ? 'Unknown' : String(s.year_level);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    });
    return groups;
  }, [filtered]);

  function toggleYear(key: string) {
    setExpandedYears(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function getSectionName(sectionId: string | null | undefined): string {
    if (!sectionId) return 'Unassigned';
    const s = sections.find(sec => sec.id === sectionId);
    return s ? s.name : 'Unassigned';
  }

  return (
    <div className="p-4 md:p-6">
      <div 
        className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 shadow-lg rounded-xl"
        style={{ marginLeft: '-0.5rem', marginRight: '-0.5rem' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Class Management</h2>
            <div className="flex items-center rounded-md bg-white/15 p-1 text-white">
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded ${activeTab === 'unassigned' ? 'bg-white/90 text-blue-700' : 'text-white/90 hover:bg-white/20'}`}
                onClick={() => setActiveTab('unassigned')}
              >
                Student List
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded ${activeTab === 'sections' ? 'bg-white/90 text-blue-700' : 'text-white/90 hover:bg-white/20'}`}
                onClick={() => setActiveTab('sections')}
              >
                Section List
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
              onClick={() => fetchStudents()}
              className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-60"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded border border-gray-200 bg-white p-6 text-gray-600">Loading…</div>
      )}

      {activeTab === 'unassigned' && !loading && filtered.length === 0 && !error && (
        <div className="rounded border border-green-200 bg-green-50 p-6 text-green-700">
          {query ? 'No matching students found.' : 'No students match the selected filters.'}
        </div>
      )}

      {activeTab === 'unassigned' && !loading && filtered.length > 0 && (
        <div className="space-y-8">
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
          {yearLevels.map((yl) => {
            const key = String(yl);
            const list = groupedByYear.get(key) || [];
            if (list.length === 0) return null;
            return (
              <div key={key}>
                <button
                  onClick={() => toggleYear(key)}
                  className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-left shadow-sm hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedYears[key] ? <ChevronDown className="h-4 w-4 text-gray-600" /> : <ChevronRight className="h-4 w-4 text-gray-600" />}
                      <h3 className="text-base font-semibold text-gray-800">Year Level: {key}</h3>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{list.length} student{list.length > 1 ? 's' : ''}</span>
                  </div>
                </button>
                {expandedYears[key] !== false && (
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
                        {list.map((s, idx) => (
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'sections' && (
        <div className="space-y-6">
          {/* Create Section trigger */}
          <div className="flex justify-end">
            <button
              onClick={() => { setCreateError(null); setShowCreateModal(true); }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Create Section
            </button>
          </div>

          {/* Sections Grid */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Section List</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Year Level</label>
                <select
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={sectionYear}
                  onChange={e => setSectionYear(Number(e.target.value))}
                >
                  {[1,2,3,4].map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
                <button
                  onClick={autoAssignSections}
                  disabled={autoAssignLoading}
                  className="ml-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {autoAssignLoading ? 'Assigning…' : 'Auto-Assign Sections'}
                </button>
              </div>
            </div>
            {autoAssignError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{autoAssignError}</div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sections.filter(s => Number(s.year_level) === Number(sectionYear)).length === 0 && (
                <div className="col-span-full text-sm text-gray-600">No sections for Year {sectionYear}. Create one above.</div>
              )}
              {sections.filter(s => Number(s.year_level) === Number(sectionYear)).map(sec => (
                <button
                  key={sec.id}
                  onClick={() => {
                    setViewingSection(sec);
                    void fetchStudentsBySection(sec.id);
                    setShowViewModal(true);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewingSection(sec); void fetchStudentsBySection(sec.id); setShowViewModal(true); } }}
                  className="flex flex-col items-start gap-2 rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <div className="flex w-full items-start justify-between">
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 text-left">{sec.name}</h3>
                      <p className="text-sm text-gray-600 text-left">Year {sec.year_level}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          {sectionStudentCounts[sec.id] || 0} students
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSection(sec);
                          setShowEditModal(true);
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit section"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteSection(sec.id);
                        }}
                        className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600"
                        title="Delete section"
                        disabled={deleteLoading === sec.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {sec.academic_year && (
                    <div className="text-xs text-gray-600 text-left mt-1">AY: {sec.academic_year}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Assign Students */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <select
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={sectionYear}
                  onChange={e => setSectionYear(Number(e.target.value))}
                >
                  {[1,2,3,4].map(y => (<option key={y} value={y}>Year Level: {y}</option>))}
                </select>
                <select
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedSectionId}
                  onChange={e => setSelectedSectionId(e.target.value)}
                >
                  <option value="">Select Section</option>
                  {sections.filter(s => Number(s.year_level) === Number(sectionYear)).map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.academic_year ? ` (${s.academic_year})` : ''}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAssignSelected}
                disabled={!selectedSectionId || Object.values(selectedStudentIds).every(v => !v)}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Assign Selected Students
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <colgroup>
                  <col className="w-10" />
                  <col className="w-40" />
                  <col className="w-[22rem]" />
                  <col className="w-[26rem]" />
                </colgroup>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2"></th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Student No.</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Name</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students
                    .filter(s => String(s.year_level || '') === String(sectionYear) && !s.section)
                    .map((s, idx) => (
                      <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={!!selectedStudentIds[s.id]}
                            onChange={e => setSelectedStudentIds(prev => ({ ...prev, [s.id]: e.target.checked }))}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900">{s.student_id || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900 truncate">{s.last_name}, {s.first_name}{s.middle_name ? ` ${s.middle_name}` : ''}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700 truncate">{s.email}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* View Assigned Students Modal */}
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
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
                {sectionStudentsLoading ? (
                  <div className="rounded border border-gray-200 bg-white p-6 text-gray-600">Loading…</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full table-fixed divide-y divide-gray-200">
                      <colgroup>
                        <col className="w-40" />
                        <col className="w-[22rem]" />
                        <col className="w-[26rem]" />
                        <col className="w-24" />
                      </colgroup>
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Student No.</th>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Name</th>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Email</th>
                          <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">Year</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sectionStudents.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-600">No students assigned yet.</td>
                          </tr>
                        )}
                        {sectionStudents.map((s, idx) => (
                          <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900">{s.student_id || '—'}</td>
                            <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-900 truncate">{s.last_name}, {s.first_name}{s.middle_name ? ` ${s.middle_name}` : ''}</td>
                            <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700 truncate">{s.email}</td>
                            <td className="whitespace-nowrap px-4 py-2 text-[13px] text-gray-700">{s.year_level ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Section Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Create Section</h3>
              <button className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200" onClick={() => setShowCreateModal(false)}>Close</button>
            </div>
            {createError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Section name"
                value={newSection.name}
                onChange={e => setNewSection(prev => ({ ...prev, name: e.target.value }))}
              />
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={newSection.year_level}
                onChange={e => setNewSection(prev => ({ ...prev, year_level: Number(e.target.value) }))}
              >
                {[1,2,3,4].map(y => (<option key={y} value={y}>{y} Year</option>))}
              </select>
              <input
                className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Academic Year (e.g., 2024-2025)"
                value={newSection.academic_year}
                onChange={e => setNewSection(prev => ({ ...prev, academic_year: e.target.value }))}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                onClick={handleCreateSection}
                disabled={createLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createLoading ? 'Adding…' : 'Add Section'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {showEditModal && editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">Edit Section</h3>
              <button className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200" onClick={() => setShowEditModal(false)}>Close</button>
            </div>
            {editError && (
              <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Section name"
                value={editingSection.name}
                onChange={e => setEditingSection(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
              <select
                className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={editingSection.year_level || 1}
                onChange={e => setEditingSection(prev => prev ? { ...prev, year_level: Number(e.target.value) } : null)}
              >
                {[1,2,3,4].map(y => (<option key={y} value={y}>{y} Year</option>))}
              </select>
              <input
                className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Academic Year (e.g., 2024-2025)"
                value={editingSection.academic_year || ''}
                onChange={e => setEditingSection(prev => prev ? { ...prev, academic_year: e.target.value } : null)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button
                onClick={handleEditSection}
                disabled={editLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading ? 'Updating…' : 'Update Section'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;


