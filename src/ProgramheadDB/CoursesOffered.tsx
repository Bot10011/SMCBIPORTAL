import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Users, Clock, GraduationCap, Search, Filter, Grid, List, Trash2 } from 'lucide-react';
import CourseActions from '../components/CourseActions';
import { createPortal } from 'react-dom';

interface Course {
  id?: number;
  code: string;
  name: string;
  units: number;
  image_url?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  summer?: boolean;
  year_level?: string;
  semester?: string;
}

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnits, setFilterUnits] = useState<string>('all');
  const [filterYearLevel, setFilterYearLevel] = useState('all');

  // Form states
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    units: 3,
    image_url: '',
    year_level: '',
    semester: ''
  });

  const [sectionForm, setSectionForm] = useState({
    section_name: '',
    capacity: 30,
    schedule: '',
    room: '',
    instructor: ''
  });

  const [imageFile, setImageFile] = useState<File | null>(null);

  const [courseImages, setCourseImages] = useState<{ [id: string]: string }>({});
  const [imageLoading, setImageLoading] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchImages = async () => {
      const newImages: { [id: string]: string } = {};
      const newLoading: { [id: string]: boolean } = {};
      
      for (const course of courses) {
        const imagePath = course.image_url;
        if (imagePath && imagePath.trim() !== '' && course.id !== undefined && course.id !== null) {
          newLoading[String(course.id)] = true;
          try {
            // First check if the file exists
            const { data: fileList, error: listError } = await supabase.storage
              .from('course')
              .list('', {
                search: imagePath
              });
            
            if (!listError && fileList && fileList.length > 0) {
              // File exists, try to download it
              const { data: fileData, error: fileError } = await supabase.storage
                .from('course')
                .download(imagePath);
              if (!fileError && fileData) {
                const blobUrl = URL.createObjectURL(fileData);
                newImages[String(course.id)] = blobUrl;
              }
            } else {
              // File doesn't exist, clear the image_url from database
              console.warn('Image not found for course:', course.id, imagePath);
              await supabase
                .from('courses')
                .update({ image_url: null })
                .eq('id', course.id);
            }
          } catch (error) {
            console.error('Error fetching image for course:', course.id, error);
            // Clear the invalid image_url from database
            try {
              await supabase
                .from('courses')
                .update({ image_url: null })
                .eq('id', course.id);
            } catch (updateError) {
              console.error('Error clearing invalid image_url:', updateError);
            }
          } finally {
            newLoading[String(course.id)] = false;
          }
        }
      }
      setCourseImages(newImages);
      setImageLoading(newLoading);
    };
    
    if (courses.length > 0) fetchImages();
  }, [courses]);

  useEffect(() => {
    if (showAddModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [showAddModal]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('code', { ascending: true });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imagePath = courseForm.image_url || '';
      let oldImagePath = '';
      
      if (imageFile) {
        const fileExt = imageFile.type.split('/').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `course-images/${courseForm.code}/${fileName}`;
        
        // Store the old image path for cleanup
        if (selectedCourse && selectedCourse.image_url) {
          oldImagePath = selectedCourse.image_url;
        }
        
        const { error: uploadError } = await supabase.storage
          .from('course')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: true
          });
        if (uploadError) {
          toast.error('Image upload failed');
          return;
        }
        imagePath = filePath;
      }
      
      let error;
      if (selectedCourse && selectedCourse.id) {
        // Update existing course
        ({ error } = await supabase
          .from('courses')
          .update({
            code: courseForm.code,
            name: courseForm.name,
            units: courseForm.units,
            image_url: imagePath,
            year_level: courseForm.year_level,
            semester: courseForm.semester
          })
          .eq('id', selectedCourse.id)
          .select()
          .single());
        
        // Clean up old image if it exists and is different from the new one
        if (oldImagePath && oldImagePath !== imagePath) {
          try {
            await supabase.storage
              .from('course')
              .remove([oldImagePath]);
            console.log('Old image cleaned up:', oldImagePath);
          } catch (cleanupError) {
            console.error('Error cleaning up old image:', cleanupError);
          }
        }
      } else {
        // Insert new course
        ({ error } = await supabase
          .from('courses')
          .insert([{ ...courseForm, image_url: imagePath, year_level: courseForm.year_level, semester: courseForm.semester }])
          .select()
          .single());
      }
      
      if (error) throw error;
      toast.success(selectedCourse ? 'Course updated successfully' : 'Course added successfully');
      setShowAddModal(false);
      setCourseForm({ code: '', name: '', units: 3, image_url: '', year_level: '', semester: '' });
      setImageFile(null);
      setSelectedCourse(null);
      fetchCourses();
    } catch (error) {
      console.error('Error adding course:', error);
      toast.error('Failed to add course');
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    try {
      const { error } = await supabase
        .from('sections')
        .insert([{
          ...sectionForm,
          course_id: selectedCourse.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Section added successfully');
      setShowSectionModal(false);
      setSectionForm({
        section_name: '',
        capacity: 30,
        schedule: '',
        room: '',
        instructor: ''
      });
      fetchCourses();
    } catch (error) {
      console.error('Error adding section:', error);
      toast.error('Failed to add section');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This will also delete all associated sections.')) return;

    try {
      // Get the course to find its image path before deletion
      const { data: courseData, error: fetchError } = await supabase
        .from('courses')
        .select('image_url')
        .eq('id', courseId)
        .single();

      if (fetchError) {
        console.error('Error fetching course for cleanup:', fetchError);
      }

      // Delete the course
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      // Clean up the associated image if it exists
      if (courseData?.image_url) {
        try {
          await supabase.storage
            .from('course')
            .remove([courseData.image_url]);
          console.log('Course image cleaned up:', courseData.image_url);
        } catch (cleanupError) {
          console.error('Error cleaning up course image:', cleanupError);
        }
      }

      toast.success('Course deleted successfully');
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  // Utility function to clean up unused images
  const cleanupUnusedImages = async () => {
    try {
      // Get all course image paths from the database
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('image_url')
        .not('image_url', 'is', null);

      if (coursesError) {
        console.error('Error fetching course images:', coursesError);
        return;
      }

      const usedImagePaths = coursesData
        .map(course => course.image_url)
        .filter(path => path && path.trim() !== '');

      // List all files in the course-images directory
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('course')
        .list('course-images', { limit: 1000 });

      if (storageError) {
        console.error('Error listing storage files:', storageError);
        return;
      }

      // Find unused files
      const unusedFiles = storageFiles
        ?.filter(file => !usedImagePaths.includes(`course-images/${file.name}`))
        .map(file => `course-images/${file.name}`) || [];

      // Remove unused files
      if (unusedFiles.length > 0) {
        const { error: removeError } = await supabase.storage
          .from('course')
          .remove(unusedFiles);

        if (removeError) {
          console.error('Error removing unused files:', removeError);
        } else {
          console.log(`Cleaned up ${unusedFiles.length} unused images`);
          toast.success(`Cleaned up ${unusedFiles.length} unused images`);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  // Filter and search courses
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnits = filterUnits === 'all' || course.units.toString() === filterUnits;
    const matchesYear = filterYearLevel === 'all' || course.year_level === filterYearLevel;
    return matchesSearch && matchesUnits && matchesYear;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen from-blue-50 via-white to-indigo-50">
      {/* Render modal at the root, before the main container */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setImageFile(null);
                  setSelectedCourse(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddCourse} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Course Code</label>
                  <input
                    type="text"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., CS101"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Units</label>
                  <input
                    type="number"
                    value={courseForm.units}
                    onChange={(e) => setCourseForm({ ...courseForm, units: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    min="1"
                    max="6"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Year Level</label>
                <select
                  value={courseForm.year_level}
                  onChange={e => setCourseForm({ ...courseForm, year_level: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select year level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
                {/* Semester Dropdown */}
                <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">Semester</label>
                <select
                  value={courseForm.semester}
                  onChange={e => setCourseForm({ ...courseForm, semester: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select semester</option>
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Name</label>
                <input
                  type="text"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="e.g., Introduction to Computer Science"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Image</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors duration-200">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async e => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        const img = new window.Image();
                        img.onload = () => {
                          if (img.width > img.height) {
                            setImageFile(file);
                          } else {
                            setImageFile(null);
                            toast.error('Please select a landscape image (width must be greater than height).');
                          }
                        };
                        img.src = URL.createObjectURL(file);
                      } else {
                        setImageFile(null);
                      }
                    }}
                    className="hidden"
                    id="course-image"
                  />
                  <label htmlFor="course-image" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {imageFile ? 'Image selected' : 'Click to upload image'}
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    </div>
                  </label>
                  {imageFile && (
                    <div className="mt-4 flex justify-center">
                      <img src={URL.createObjectURL(imageFile)} alt="Preview" className="rounded-xl max-h-40 object-cover border" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setImageFile(null);
                    setSelectedCourse(null);
                  }}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium"
                >
                  {selectedCourse ? 'Update Course' : 'Add Course'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Enhanced Add Section Modal */}
      {showSectionModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add Section</h2>
                <p className="text-gray-600">Add a new section to {selectedCourse.name}</p>
              </div>
              <button
                onClick={() => setShowSectionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleAddSection} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Section Name</label>
                  <input
                    type="text"
                    value={sectionForm.section_name}
                    onChange={(e) => setSectionForm({ ...sectionForm, section_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., Section A"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity</label>
                  <input
                    type="number"
                    value={sectionForm.capacity}
                    onChange={(e) => setSectionForm({ ...sectionForm, capacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Schedule</label>
                  <input
                    type="text"
                    value={sectionForm.schedule}
                    onChange={(e) => setSectionForm({ ...sectionForm, schedule: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., MWF 8:00-9:30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Room</label>
                  <input
                    type="text"
                    value={sectionForm.room}
                    onChange={(e) => setSectionForm({ ...sectionForm, room: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., Room 101"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Instructor</label>
                <input
                  type="text"
                  value={sectionForm.instructor}
                  onChange={(e) => setSectionForm({ ...sectionForm, instructor: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="e.g., Dr. John Smith"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium"
                >
                  Add Section
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-blue-600" />
                Subject Management
              </h1>
              <p className="text-gray-600 text-lg">Manage and organize your academic subjects efficiently</p>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={cleanupUnusedImages}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl shadow-lg hover:from-orange-600 hover:to-red-600 transition-all duration-300 font-semibold flex items-center gap-3"
              >
                <Trash2 className="w-5 h-5" />
                Cleanup Storage
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold flex items-center gap-3"
              >
                <Plus className="w-5 h-5" />
                Add New Course
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Courses</p>
                <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
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
                <p className="text-3xl font-bold text-gray-900">
                  {courses.length > 0 ? (courses.reduce((sum, course) => sum + course.units, 0) / courses.length).toFixed(1) : '0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Courses</p>
                <p className="text-3xl font-bold text-gray-900">{filteredCourses.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8"
        >
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
                <select
                  value={filterUnits}
                  onChange={(e) => setFilterUnits(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
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
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter w-5 h-5 text-gray-500"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                <select
                  className="border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={filterYearLevel}
                  onChange={e => setFilterYearLevel(e.target.value)}
                >
                  <option value="all">All Years</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Courses Display */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {filteredCourses.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No courses found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterUnits !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first course.'
                }
              </p>
              {!searchTerm && filterUnits === 'all' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Course
                </motion.button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course, idx) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group"
                >
                  <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-50">
                    {imageLoading[String(course.id)] ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : courseImages[String(course.id)] ? (
                      <img 
                        src={courseImages[String(course.id)]} 
                        alt={course.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Image failed to load:', courseImages[String(course.id)]);
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center ${courseImages[String(course.id)] && !imageLoading[String(course.id)] ? 'hidden' : ''}`}>
                      <BookOpen className="w-16 h-16 text-gray-300" />
                    </div>
                    <div className="absolute top-4 right-4">
                      <CourseActions
                        onEdit={() => {
                          setSelectedCourse(course);
                          setShowSectionModal(false);
                          setShowAddModal(true);
                          setCourseForm({
                            code: course.code,
                            name: course.name,
                            units: course.units,
                            image_url: course.image_url || '',
                            year_level: course.year_level || '',
                            semester: course.semester || ''
                          });
                        }}
                        onDelete={() => handleDeleteCourse(String(course.id))}
                      />
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-lg text-gray-900">{course.name}</span>
                      {course.summer ? (
                        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="inline-block w-3 h-3"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                          Summer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                          Regular
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                        {course.code}
                      </span>
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                        {course.units} Unit{course.units !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{course.name}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Created {new Date(course.created_at || '').toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Course</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Year</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Units</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCourses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                              {imageLoading[String(course.id)] ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                              ) : courseImages[String(course.id)] ? (
                                <img 
                                  src={courseImages[String(course.id)]} 
                                  alt={course.name} 
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error('Image failed to load:', courseImages[String(course.id)]);
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center ${courseImages[String(course.id)] && !imageLoading[String(course.id)] ? 'hidden' : ''}`}>
                                <BookOpen className="w-6 h-6 text-gray-400" />
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{course.name}</div>
                              <div className="text-sm text-gray-500">
                                Created {new Date(course.created_at || '').toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                            {course.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{course.year_level}</td>
                        <td className="px-6 py-4">
                          <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                            {course.units} Unit{course.units !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {course.summer ? (
                            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="inline-block w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                              Summer
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                              Regular
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <CourseActions
                            onEdit={() => {
                              setSelectedCourse(course);
                              setShowSectionModal(false);
                              setShowAddModal(true);
                              setCourseForm({
                                code: course.code,
                                name: course.name,
                                units: course.units,
                                image_url: course.image_url || '',
                                year_level: course.year_level || '',
                                semester: course.semester || ''
                              });
                            }}
                            onDelete={() => handleDeleteCourse(String(course.id))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
