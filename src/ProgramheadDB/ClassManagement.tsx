import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface StudentProfile {
  id: string; // UUID
  student_id?: string; // human-readable id
  first_name?: string;
  last_name?: string; 
  middle_name?: string;
  year_level?: string;
  section?: string | null;
  enrollment_status?: string | null;
  student_type?: string | null;
}

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year'] as const;
type YearLevel = typeof YEAR_LEVELS[number];

const MAX_STUDENTS_PER_SECTION = 40;

const getNextSectionLabel = (existing: string[]): string => {
  // Existing labels like 'A', 'B', 'C' ...
  const used = new Set(existing.map(s => (s || '').toUpperCase()).filter(Boolean));
  // Try A..Z
  for (let i = 0; i < 26; i++) {
    const label = String.fromCharCode('A'.charCodeAt(0) + i);
    if (!used.has(label)) return label;
  }
  // If we ever exceed Z, fall back to AA, AB, AC...
  let prefixIndex = 0;
  while (true) {
    const prefix = String.fromCharCode('A'.charCodeAt(0) + (prefixIndex % 26)) + String.fromCharCode('A'.charCodeAt(0) + Math.floor(prefixIndex / 26));
    if (!used.has(prefix)) return prefix;
    prefixIndex++;
  }
};

const ClassManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentProfile[]>([]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      console.log('Starting to load students...');
      
      // Try multiple approaches to get students
      let studentsArray: StudentProfile[] = [];
      
      // Approach 1: Try to get students from enrollcourse table
      try {
        console.log('Trying to fetch from enrollcourse table...');
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollcourse')
          .select(`
            student_id,
            student:user_profiles!student_id(
              id,
              student_id,
              first_name,
              last_name,
              middle_name,
              year_level,
              section,
              enrollment_status,
              student_type
            )
          `);
        
        if (!enrollError && enrollments && enrollments.length > 0) {
          console.log('Successfully fetched from enrollcourse:', enrollments.length, 'enrollments');
          
          // Extract unique students from enrollments
          const uniqueStudents = new Map<string, StudentProfile>();
          
          enrollments.forEach((enrollment: any) => {
            if (enrollment.student && !uniqueStudents.has(enrollment.student.id)) {
              uniqueStudents.set(enrollment.student.id, enrollment.student);
            }
          });
          
          studentsArray = Array.from(uniqueStudents.values()).filter(s => s.year_level);
          console.log('Extracted students from enrollments:', studentsArray.length);
        } else {
          console.warn('No enrollments found or error:', enrollError);
        }
      } catch (e) {
        console.warn('Enrollment fetch failed:', e);
      }
      
      // Approach 2: If no students from enrollments, try direct user_profiles
      if (studentsArray.length === 0) {
        try {
          console.log('Trying to fetch directly from user_profiles...');
          const { data: directStudents, error: directError } = await supabase
            .from('user_profiles')
            .select('id, student_id, first_name, last_name, middle_name, year_level, section, enrollment_status, student_type')
            .eq('role', 'student');
          
          if (!directError && directStudents) {
            console.log('Successfully fetched from user_profiles:', directStudents.length, 'students');
            studentsArray = directStudents.filter(s => s.year_level);
            console.log('Filtered students with year_level:', studentsArray.length);
          } else {
            console.warn('Direct user_profiles fetch failed:', directError);
          }
        } catch (e) {
          console.warn('Direct user_profiles fetch failed:', e);
        }
      }
      
      // Approach 3: If still no students, try without role filter
      if (studentsArray.length === 0) {
        try {
          console.log('Trying to fetch all user_profiles without role filter...');
          const { data: allUsers, error: allUsersError } = await supabase
            .from('user_profiles')
            .select('id, student_id, first_name, last_name, middle_name, year_level, section, enrollment_status, student_type');
          
          if (!allUsersError && allUsers) {
            console.log('Successfully fetched all users:', allUsers.length, 'users');
            // Filter for users that look like students (have student_id or year_level)
            studentsArray = allUsers.filter(s => 
              s.student_id || s.year_level || 
              (s.first_name && s.last_name && !s.role) // Assume users with names but no role are students
            );
            console.log('Filtered potential students:', studentsArray.length);
          } else {
            console.warn('All users fetch failed:', allUsersError);
          }
        } catch (e) {
          console.warn('All users fetch failed:', e);
        }
      }
      
      // Log final results
      console.log('Final students array:', studentsArray);
      console.log('Students with year_level:', studentsArray.filter(s => s.year_level).length);
      console.log('Students without year_level:', studentsArray.filter(s => !s.year_level).length);
      
      // Set students even if some don't have year_level (we'll handle this in the UI)
      setStudents(studentsArray);
      
      if (studentsArray.length === 0) {
        toast.error('No students found. Please check the database connection and data.');
      } else {
        toast.success(`Loaded ${studentsArray.length} students`);
      }
      
    } catch (e) {
      console.error('Failed to load students:', e);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const studentsByYear = useMemo(() => {
    const map: Record<YearLevel, StudentProfile[]> = {
      '1st Year': [],
      '2nd Year': [],
      '3rd Year': [],
      '4th Year': []
    };
    
    console.log('Processing students for year grouping:', students.length);
    
    for (const s of students) {
      const yl = (s.year_level || '').trim();
      console.log(`Student ${s.first_name} ${s.last_name}: year_level = "${yl}"`);
      
      if (YEAR_LEVELS.includes(yl as YearLevel)) {
        map[yl as YearLevel].push(s);
        console.log(`Added to ${yl}`);
      } else if (yl) {
        console.log(`Unknown year level: "${yl}"`);
      } else {
        console.log(`No year level for student: ${s.first_name} ${s.last_name}`);
      }
    }
    
    console.log('Final year grouping:', {
      '1st Year': map['1st Year'].length,
      '2nd Year': map['2nd Year'].length,
      '3rd Year': map['3rd Year'].length,
      '4th Year': map['4th Year'].length
    });
    
    return map;
  }, [students]);

  useEffect(() => {
    loadStudents();
  }, []);

  const assignSingleStudentForYear = async (studentId: string, year: YearLevel) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, section')
        .eq('role', 'student')
        .eq('year_level', year);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of (data as Array<{ id: string; section: string | null }> | null) || []) {
        const label = (row.section || '').toUpperCase();
        if (!label) continue;
        counts[label] = (counts[label] || 0) + 1;
      }

      const labels = Object.keys(counts).sort();
      let chosen = '';
      for (const l of labels) {
        if (counts[l] < MAX_STUDENTS_PER_SECTION) {
          chosen = l;
          break;
        }
      }
      if (!chosen) {
        chosen = getNextSectionLabel(labels);
      }

      const { error: updErr } = await supabase
        .from('user_profiles')
        .update({ section: chosen })
        .eq('id', studentId);
      if (updErr) throw updErr;
      toast.success(`Assigned student to section ${chosen} (${year})`);
    } catch (e) {
      console.error('Assign single student failed', e);
      toast.error('Failed to assign section for new student');
    }
  };

  useEffect(() => {
    // Listen for newly created students and auto-assign their section
    const channel = supabase
      .channel('user_profiles_new_student_auto_assign')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_profiles' }, async (payload) => {
        try {
          const s = payload.new as any;
          if (!s) return;
          if (String(s.role) !== 'student') return;
          const yl = String(s.year_level || '').trim();
          const year = (YEAR_LEVELS.find(y => y.toLowerCase() === yl.toLowerCase()) as YearLevel | undefined);
          if (!year) return;
          // Only auto-assign if no section yet
          if (s.section && String(s.section).trim() !== '') return;
          await assignSingleStudentForYear(String(s.id), year);
          await loadStudents();
        } catch (err) {
          console.error('Realtime auto-assign error', err);
        }
      })
      .subscribe();

    // Also listen for new enrollments
    const enrollmentChannel = supabase
      .channel('enrollcourse_new_enrollment_auto_assign')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'enrollcourse' }, async (payload) => {
        try {
          const enrollment = payload.new as any;
          if (!enrollment) return;
          
          // Get the student profile for this enrollment
          const { data: studentData, error: studentError } = await supabase
            .from('user_profiles')
            .select('id, year_level, section')
            .eq('id', enrollment.student_id)
            .single();
          
          if (studentError || !studentData) return;
          
          const yl = String(studentData.year_level || '').trim();
          const year = (YEAR_LEVELS.find(y => y.toLowerCase() === yl.toLowerCase()) as YearLevel | undefined);
          if (!year) return;
          
          // Only auto-assign if no section yet
          if (studentData.section && String(studentData.section).trim() !== '') return;
          
          await assignSingleStudentForYear(String(studentData.id), year);
          await loadStudents();
        } catch (err) {
          console.error('Realtime enrollment auto-assign error', err);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(enrollmentChannel);
    };
  }, []);

  const autoAssignForYear = async (year: YearLevel) => {
    try {
      setLoading(true);
      console.log(`Starting auto-assign for ${year}`);
      
      // Fetch current sections distribution for provided year
      const current = studentsByYear[year] || [];
      console.log(`Found ${current.length} students for ${year}`);
      
      // Work on a mutable copy of counts per section
      const counts: Record<string, number> = {};
      for (const s of current) {
        const label = (s.section || '').toUpperCase();
        if (!label) continue;
        counts[label] = (counts[label] || 0) + 1;
      }
      
      // Existing labels
      const existingLabels = Object.keys(counts);
      console.log(`Existing sections for ${year}:`, existingLabels);
      
      // Find students to assign: unassigned students
      const toAssign = current.filter(s => !s.section || String(s.section).trim() === '');
      console.log(`Students to assign for ${year}:`, toAssign.length);

      if (toAssign.length === 0) {
        toast(`No students to assign for ${year}`);
        return;
      }

      // Start with section A if no sections exist
      let currentSection = 'A';
      if (existingLabels.length > 0) {
        currentSection = getNextSectionLabel(existingLabels);
      }

      // Assign students to sections
      const updates: { id: string; section: string }[] = [];
      let sectionCount = 0;

      for (const student of toAssign) {
        // If current section is full, move to next
        if (sectionCount >= MAX_STUDENTS_PER_SECTION) {
          currentSection = getNextSectionLabel([...existingLabels, ...updates.map(u => u.section)]);
          sectionCount = 0;
        }
        
        updates.push({ id: student.id, section: currentSection });
        sectionCount++;
      }

      console.log(`Updating ${updates.length} students with sections:`, updates);

      // Test update with a single student first
      if (updates.length > 0) {
        const testUpdate = updates[0];
        console.log('Testing update with:', testUpdate);
        
        const { data: testResult, error: testError } = await supabase
          .from('user_profiles')
          .update({ section: testUpdate.section })
          .eq('id', testUpdate.id)
          .select();
        
        if (testError) {
          console.error('Test update failed:', testError);
          throw testError;
        }
        
        console.log('Test update successful:', testResult);
      }

      // Perform updates in chunks to avoid payload size issues
      const chunkSize = 50;
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('user_profiles')
          .upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      }

      toast.success(`Assigned ${updates.length} student(s) to sections for ${year}`);
      await loadStudents();
    } catch (e) {
      console.error('Auto-assign failed', e);
      toast.error('Failed to auto-assign sections');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br via-white to-indigo-50 py-6 px-3 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 rounded-2xl shadow">
          {/* Debug Info */}
          <div className="mb-4 p-3 bg-white/10 rounded-lg">
            <div className="text-white/90 text-sm">
              <strong>Debug Info:</strong> Total students loaded: {students.length} | 
              Students with year level: {students.filter(s => s.year_level).length} |
              Students with sections: {students.filter(s => s.section).length}
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Class Management</h1>
              <p className="text-white/80 text-sm">Automatically assign new students to sections with a maximum of {MAX_STUDENTS_PER_SECTION} students per section.</p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={loadStudents}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
              >
                {loading ? 'Loading...' : 'Refresh Students'}
              </button>
              <button
                onClick={() => {
                  YEAR_LEVELS.forEach(year => {
                    const yearStudents = studentsByYear[year] || [];
                    const unassigned = yearStudents.filter(s => !s.section || String(s.section).trim() === '');
                    if (unassigned.length > 0) {
                      autoAssignForYear(year);
                    }
                  });
                }}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-60"
              >
                {loading ? 'Assigning...' : 'Force Auto-Assign All'}
              </button>
            </div>
          </div>
        </div>

                 {YEAR_LEVELS.map((year) => {
           const list = studentsByYear[year] || [];
           const sectionsMap: Record<string, StudentProfile[]> = {};
           
           // Group students by section, including unassigned ones
           for (const s of list) {
             const label = (s.section || '').toUpperCase();
             const key = label || '(none)';
             if (!sectionsMap[key]) sectionsMap[key] = [];
             sectionsMap[key].push(s);
           }
           
           // Always show the year level even if no students
           if (list.length === 0) {
             return (
               <div key={year} className="mb-8">
                 <div className="flex items-center justify-between mb-4">
                   <h2 className="text-lg font-semibold text-gray-800">{year}</h2>
                   <button
                     onClick={() => autoAssignForYear(year)}
                     disabled={loading}
                     className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                   >
                     {loading ? 'Assigning...' : 'Auto-Assign Sections'}
                   </button>
                 </div>
                 <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
                   <div className="text-center py-8 text-gray-500">
                     No students enrolled in {year}
                   </div>
                 </div>
               </div>
             );
           }
           
           return (
             <div key={year} className="mb-8">
               <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-semibold text-gray-800">{year}</h2>
                 <button
                   onClick={() => autoAssignForYear(year)}
                   disabled={loading}
                   className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                 >
                   {loading ? 'Assigning...' : 'Auto-Assign Sections'}
                 </button>
               </div>
               
               {/* Section Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                 {Object.entries(sectionsMap).map(([label, arr]) => (
                   <div key={label} className={`bg-white rounded-2xl shadow p-4 border ${
                     label === '(none)' ? 'border-orange-200 bg-orange-50' : 'border-gray-100'
                   }`}>
                     <div className="flex items-center justify-between mb-2">
                       <div className="font-semibold text-gray-800">
                         {label === '(none)' ? 'Unassigned' : `Section ${label}`}
                       </div>
                       <div className="text-sm text-gray-500">{arr.length}/{MAX_STUDENTS_PER_SECTION}</div>
                     </div>
                     <div className="text-xs text-gray-500">{year}</div>
                     {label === '(none)' && (
                       <div className="mt-2 text-xs text-orange-600 font-medium">
                         Click "Auto-Assign Sections" to assign these students
                       </div>
                     )}
                   </div>
                 ))}
               </div>
               
               {/* Students Table */}
               <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
                 <div className="flex justify-between items-center mb-3">
                   <div className="font-semibold text-gray-800">Students - {year}</div>
                   <div className="text-sm text-gray-500">
                     {list.length} total | {list.filter(s => s.section).length} assigned | {list.filter(s => !s.section).length} unassigned
                   </div>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="min-w-full">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-100">
                       {list.map(s => (
                         <tr key={s.id} className={!s.section ? 'bg-orange-50' : ''}>
                           <td className="px-3 py-2 text-sm text-gray-800">{[s.last_name, s.middle_name, s.first_name].filter(Boolean).join(' ')}</td>
                           <td className="px-3 py-2 text-sm text-gray-700">{s.student_id || s.id}</td>
                           <td className="px-3 py-2 text-sm text-gray-700">{s.enrollment_status || '—'}</td>
                           <td className={`px-3 py-2 text-sm font-semibold ${
                             !s.section ? 'text-orange-600' : 'text-gray-900'
                           }`}>
                             {s.section || 'Unassigned'}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
           );
         })}
         
         {/* Show students without year levels */}
         {(() => {
           const studentsWithoutYear = students.filter(s => !s.year_level || s.year_level.trim() === '');
           if (studentsWithoutYear.length > 0) {
             return (
               <div className="mb-8">
                 <div className="flex items-center justify-between mb-4">
                   <h2 className="text-lg font-semibold text-gray-800 text-orange-600">Students Without Year Level</h2>
                   <span className="text-sm text-gray-500">{studentsWithoutYear.length} students</span>
                 </div>
                 <div className="bg-white rounded-2xl shadow p-4 border border-orange-200">
                   <div className="text-sm text-orange-600 mb-3">
                     These students need to have their year level set before they can be assigned to sections.
                   </div>
                   <div className="overflow-x-auto">
                     <table className="min-w-full">
                       <thead className="bg-orange-50">
                         <tr>
                           <th className="px-3 py-2 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">Name</th>
                           <th className="px-3 py-2 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">Student ID</th>
                           <th className="px-3 py-2 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">Status</th>
                           <th className="px-3 py-2 text-left text-xs font-medium text-orange-700 uppercase tracking-wider">Year Level</th>
                         </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-orange-100">
                         {studentsWithoutYear.map(s => (
                           <tr key={s.id} className="bg-orange-50">
                             <td className="px-3 py-2 text-sm text-gray-800">{[s.last_name, s.middle_name, s.first_name].filter(Boolean).join(' ')}</td>
                             <td className="px-3 py-2 text-sm text-gray-700">{s.student_id || s.id}</td>
                             <td className="px-3 py-2 text-sm text-gray-700">{s.enrollment_status || '—'}</td>
                             <td className="px-3 py-2 text-sm text-orange-600 font-semibold">{s.year_level || 'Not Set'}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               </div>
             );
           }
           return null;
         })()}
      </div>
    </div>
  );
};

export default ClassManagement;

