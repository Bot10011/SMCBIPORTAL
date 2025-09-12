import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { BookOpen, Users, GraduationCap, Search, Filter, Grid, List } from 'lucide-react';

interface Course {
  id?: number;
  code: string;
  name: string;
  units: number;
  lec_units?: number;
  lab_units?: number;
  hours_per_week?: number;
  prerequisites?: string[];
  image_url?: string;
  summer?: boolean;
  year_level?: string;
  semester?: string;
}

const SubjectsList: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnits, setFilterUnits] = useState<string>('all');
  const [filterYearLevel, setFilterYearLevel] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');

  const [courseImages, setCourseImages] = useState<{ [id: string]: string }>();
  const [imageLoading, setImageLoading] = useState<{ [id: string]: boolean }>();
  const [imageError, setImageError] = useState<{ [id: string]: boolean }>();

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code', { ascending: true });
      if (error) throw error;
      setCourses(data || []);
    } catch (e) {
      // Silent; read-only viewer
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    const loadImages = async () => {
      const imgs: { [id: string]: string } = {};
      const loadingMap: { [id: string]: boolean } = {};
      const errorMap: { [id: string]: boolean } = {};
      for (const c of courses) {
        const idKey = String(c.id);
        if (c.id != null && c.image_url && c.image_url.trim() !== '') {
          loadingMap[idKey] = true;
          try {
            const { data } = await supabase.storage.from('course').download(c.image_url);
            if (data) imgs[idKey] = URL.createObjectURL(data);
          } catch {
            errorMap[idKey] = true;
          } finally {
            loadingMap[idKey] = false;
          }
        } else {
          loadingMap[idKey] = false;
        }
      }
      setCourseImages(imgs);
      setImageLoading(loadingMap);
      setImageError(errorMap);
    };
    if (courses.length) loadImages();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            course.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUnits = filterUnits === 'all' || course.units.toString() === filterUnits;
      const matchesYear = filterYearLevel === 'all' || course.year_level === filterYearLevel;
      const matchesSemester = filterSemester === 'all' || course.semester === filterSemester;
      return matchesSearch && matchesUnits && matchesYear && matchesSemester;
    });
  }, [courses, searchTerm, filterUnits, filterYearLevel, filterSemester]);

  const stats = useMemo(() => {
    const total = courses.length;
    const averageUnits = total > 0 ? (courses.reduce((s, c) => s + (c.units || 0), 0) / total).toFixed(1) : '0';
    const active = filteredCourses.length;
    const summerCourses = courses.filter(c => c.summer).length;
    const regularCourses = total - summerCourses;
    return { total, averageUnits, active, summerCourses, regularCourses };
  }, [courses, filteredCourses]);

  if (loading) {
    return (
      <div className="min-h-screen from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8 animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-80 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">List of Subjects</h1>
                <p className="text-white/80 text-sm font-medium">View-only catalog of all subjects</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Courses</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Average Units</p>
                <p className="text-3xl font-bold text-gray-900">{stats.averageUnits}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Matching Subjects</p>
                <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search subject by name, code, or year level..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select value={filterUnits} onChange={(e) => setFilterUnits(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200">
                  <option value="all">All Units</option>
                  <option value="1">1 Unit</option>
                  <option value="2">2 Units</option>
                  <option value="3">3 Units</option>
                  <option value="4">4 Units</option>
                  <option value="5">5 Units</option>
                  <option value="6">6 Units</option>
                </select>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
                  <Grid className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
                  <List className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter w-5 h-5 text-gray-500"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                <select className="border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" value={filterYearLevel} onChange={e => setFilterYearLevel(e.target.value)}>
                  <option value="all">All Years</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
                <select className="border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                  <option value="all">All Semesters</option>
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {filteredCourses.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No courses found</h3>
              <p className="text-gray-500">Try adjusting your search or filters.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-8">
              {(() => {
                const grouped: { [yl: string]: { [sem: string]: typeof filteredCourses } } = {};
                filteredCourses.forEach(c => {
                  const yl = c.year_level || 'Unknown Year';
                  const sem = c.semester || (c.summer ? 'Summer' : 'No Semester');
                  if (!grouped[yl]) grouped[yl] = {};
                  if (!grouped[yl][sem]) grouped[yl][sem] = [];
                  grouped[yl][sem].push(c);
                });
                return Object.entries(grouped).map(([yl, semesters], yIdx) => (
                  <motion.div key={yl} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: yIdx * 0.1 }} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        {yl}
                      </h2>
                    </div>
                    <div className="p-6 space-y-6">
                      {Object.entries(semesters).map(([sem, cs]) => (
                        <div key={sem} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              {sem}
                              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{cs.length} subject{cs.length !== 1 ? 's' : ''}</span>
                            </h3>
                            <div className="text-sm text-gray-500">{cs.reduce((t, c) => t + (c.units || 0), 0)} total units</div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Code</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LEC</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LAB</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours/Week</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prerequisites</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {cs.map((course, cIdx) => (
                                  <motion.tr key={course.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (yIdx * 0.1) + (cIdx * 0.02) }} className="hover:bg-gray-50 transition-colors duration-200">
                                    <td className="px-4 py-3">
                                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center relative">
                                        {imageLoading && imageLoading[String(course.id)] && (
                                          <div className="w-full h-full relative">
                                            <div className="absolute inset-0">
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                            </div>
                                          </div>
                                        )}
                                        {!imageLoading && courseImages && courseImages[String(course.id)] && (
                                          <img src={courseImages[String(course.id)]} alt={course.name} className="w-full h-full object-cover" onError={() => setImageError(prev => ({ ...(prev || {}), [String(course.id)]: true }))} />
                                        )}
                                        {!imageLoading && (!courseImages || !courseImages[String(course.id)]) && !(imageError && imageError[String(course.id)]) && (
                                          <div className="flex flex-col items-center justify-center w-full h-full gap-1 bg-gray-50/80">
                                            <BookOpen className="w-4 h-4 text-gray-400" />
                                            <span className="text-[8px] text-gray-500 font-medium">No Image</span>
                                          </div>
                                        )}
                                        {imageError && imageError[String(course.id)] && (
                                          <div className="flex flex-col items-center justify-center w-full h-full gap-1 bg-red-50/80">
                                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                            <span className="text-[8px] text-red-500 font-medium">Error</span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3"><span className="text-sm font-semibold text-blue-600">{course.code}</span></td>
                                    <td className="px-4 py-3"><span className="text-sm font-medium text-gray-900 max-w-xs truncate block" title={course.name}>{course.name}</span></td>
                                    <td className="px-4 py-3"><span className="text-sm text-gray-700">{course.lec_units || 0}</span></td>
                                    <td className="px-4 py-3"><span className="text-sm text-gray-700">{course.lab_units || 0}</span></td>
                                    <td className="px-4 py-3"><span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">{course.units || 0} Unit{(course.units || 0) !== 1 ? 's' : ''}</span></td>
                                    <td className="px-4 py-3"><span className="text-sm text-gray-700">{course.hours_per_week || 0}</span></td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-wrap gap-1">
                                        {course.prerequisites && course.prerequisites.length > 0 ? (
                                          course.prerequisites.map((pr, i) => (
                                            <span key={i} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">{pr}</span>
                                          ))
                                        ) : (
                                          <span className="text-xs text-gray-400">None</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      {course.summer ? (
                                        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">Summer</span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">Regular</span>
                                      )}
                                    </td>
                                  </motion.tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ));
              })()}
            </div>
          ) : (
            <div className="space-y-8">
              {(() => {
                const grouped: { [yl: string]: { [sem: string]: typeof filteredCourses } } = {};
                filteredCourses.forEach(c => {
                  const yl = c.year_level || 'Unknown Year';
                  const sem = c.semester || (c.summer ? 'Summer' : 'No Semester');
                  if (!grouped[yl]) grouped[yl] = {};
                  if (!grouped[yl][sem]) grouped[yl][sem] = [];
                  grouped[yl][sem].push(c);
                });
                return Object.entries(grouped).map(([yl, semesters], yIdx) => (
                  <motion.div key={yl} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: yIdx * 0.1 }} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        {yl}
                      </h2>
                    </div>
                    <div className="space-y-6">
                      {Object.entries(semesters).map(([sem, cs]) => (
                        <div key={sem} className="space-y-4">
                          <div className="px-6 pt-6 pb-2">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              {sem}
                              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{cs.length} subject{cs.length !== 1 ? 's' : ''}</span>
                            </h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Image</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {cs.map(course => (
                                  <tr key={course.id} className="hover:bg-gray-50 transition-colors duration-200">
                                    <td className="px-6 py-4"><span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">{course.units} Unit{course.units !== 1 ? 's' : ''}</span></td>
                                    <td className="px-6 py-4 font-semibold text-gray-900"><span className="text-blue-600">{course.code}</span> - {course.name}</td>
                                    <td className="px-6 py-4">
                                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center relative">
                                        {imageLoading && imageLoading[String(course.id)] && (
                                          <div className="w-full h-full relative">
                                            <div className="absolute inset-0">
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                            </div>
                                          </div>
                                        )}
                                        {!imageLoading && courseImages && courseImages[String(course.id)] && (
                                          <img src={courseImages[String(course.id)]} alt={course.name} className="w-full h-full object-cover" onError={() => setImageError(prev => ({ ...(prev || {}), [String(course.id)]: true }))} />
                                        )}
                                        {!imageLoading && (!courseImages || !courseImages[String(course.id)]) && !(imageError && imageError[String(course.id)]) && (
                                          <div className="flex flex-col items-center justify-center w-full h-full gap-1 bg-gray-50/80">
                                            <BookOpen className="w-4 h-4 text-gray-400" />
                                            <span className="text-[8px] text-gray-500 font-medium">No Image</span>
                                          </div>
                                        )}
                                        {imageError && imageError[String(course.id)] && (
                                          <div className="flex flex-col items-center justify-center w-full h-full gap-1 bg-red-50/80">
                                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                            <span className="text-[8px] text-red-500 font-medium">Error</span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">{course.summer ? (
                                      <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">Summer</span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">Regular</span>
                                    )}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ));
              })()}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SubjectsList;


