// src/RegistrarDB/ClassList.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ClassGroup {
  year_level: string;
  section: string;
  program: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  year_level: string;
  section: string;
  program: string;
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

  // Fetch unique class groups from enrollcourse (join user_profiles)
  useEffect(() => {
    const fetchClassGroups = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('enrollcourse')
        .select('section, user_profiles(year_level, department)')
        .neq('section', null);
      if (!error && data) {
        // Flatten and filter
        const unique: Record<string, ClassGroup> = {};
        data.forEach((row: { section: string; user_profiles: { year_level: string; department: string } }) => {
          if (row.section && row.user_profiles?.year_level && row.user_profiles?.department) {
            const key = `${row.user_profiles.department}|${row.user_profiles.year_level}|${row.section}`;
            unique[key] = { program: row.user_profiles.department, year_level: row.user_profiles.year_level, section: row.section };
          }
        });
        setClassGroups(Object.values(unique));
        setProgramOptions([...new Set(data.map((row: { user_profiles: { department: string } }) => row.user_profiles?.department).filter(Boolean))]);
        setYearLevelOptions([...new Set(data.map((row: { user_profiles: { year_level: string } }) => row.user_profiles?.year_level).filter(Boolean))]);
        setSectionOptions([...new Set(data.map((row: { section: string }) => row.section).filter(Boolean))]);
      }
      setLoading(false);
    };
    fetchClassGroups();
  }, []);

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

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassGroups(prev => [
      ...prev,
      { program: newClass.program, year_level: newClass.year_level, section: newClass.section }
    ]);
    setShowAddModal(false);
    setNewClass({ program: '', year_level: '', section: '' });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto font-sans">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-800">Class List Viewer</h1>
        <button
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all"
          onClick={() => setShowAddModal(true)}
        >
          + Add New Class
        </button>
      </div>
      {/* Class group containers */}
      {classGroups.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <svg width="64" height="64" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="12" fill="#f3f4f6"/><path d="M7 10v4a2 2 0 002 2h6a2 2 0 002-2v-4" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 14v-4" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 10h6" stroke="#a1a1aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div className="mt-4 text-lg font-medium">No classes found</div>
          <div className="text-sm">Click "+ Add New Class" to create your first class group.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
          {classGroups.map((group, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-lg p-6 cursor-pointer transition-all group ${selectedGroup && group.program === selectedGroup.program && group.year_level === selectedGroup.year_level && group.section === selectedGroup.section ? 'border-blue-600 ring-2 ring-blue-200 bg-blue-50' : 'hover:border-blue-400'}`}
              onClick={() => setSelectedGroup(group)}
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') setSelectedGroup(group); }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg group-hover:bg-blue-200 transition-all">
                  {group.program[0]}
                </div>
                <div>
                  <div className="font-semibold text-lg text-blue-700 group-hover:text-blue-800 transition-all">{group.program}</div>
                  <div className="text-gray-500 text-sm">Year {group.year_level} • Section {group.section}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">Click to view class list</div>
            </div>
          ))}
        </div>
      )}
      {/* Class list display */}
      {selectedGroup && (
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-10 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Class List: <span className="text-blue-700">{selectedGroup.program}</span> - Year {selectedGroup.year_level} - Section {selectedGroup.section}</h2>
            <button
              className="text-gray-400 hover:text-red-500 text-2xl font-bold focus:outline-none"
              onClick={() => setSelectedGroup(null)}
              title="Close class list"
            >
              ×
            </button>
          </div>
          <hr className="mb-6 border-gray-200" />
          {loading ? (
            <div className="py-10 text-center text-blue-500 font-medium">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="py-10 text-center text-gray-400">No students found for this class.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border rounded-xl overflow-hidden text-sm">
                <thead>
                  <tr className="bg-blue-100 text-blue-800">
                    <th className="px-4 py-2 border-b font-semibold">#</th>
                    <th className="px-4 py-2 border-b font-semibold text-left">Name</th>
                    <th className="px-4 py-2 border-b font-semibold">Year Level</th>
                    <th className="px-4 py-2 border-b font-semibold">Section</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-blue-50 transition-all">
                      <td className="px-4 py-2 border-b text-center">{idx + 1}</td>
                      <td className="px-4 py-2 border-b">{student.last_name}, {student.first_name}</td>
                      <td className="px-4 py-2 border-b text-center">{student.year_level}</td>
                      <td className="px-4 py-2 border-b text-center">{student.section}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Add New Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative border border-gray-100">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl font-bold focus:outline-none"
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-6 text-gray-800">Add New Class</h2>
            <form onSubmit={handleAddClass} className="space-y-5">
              <div>
                <label className="block font-medium mb-1 text-gray-700">Program</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  value={newClass.program}
                  onChange={e => setNewClass(c => ({ ...c, program: e.target.value }))}
                  required
                >
                  <option value="">Select Program</option>
                  {programOptions.map((p, i) => (
                    <option key={i} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-700">Year Level</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  value={newClass.year_level}
                  onChange={e => setNewClass(c => ({ ...c, year_level: e.target.value }))}
                  required
                >
                  <option value="">Select Year Level</option>
                  {yearLevelOptions.map((y, i) => (
                    <option key={i} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-700">Section</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  value={newClass.section}
                  onChange={e => setNewClass(c => ({ ...c, section: e.target.value }))}
                  required
                >
                  <option value="">Select Section</option>
                  {sectionOptions.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all"
                >
                  Add Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassList;