import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import CourseActions from '../components/CourseActions';

interface Course {
  id?: number;
  code: string;
  name: string;
  description: string;
  units: number;
  image_url?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface Section {
  id: number;
  course_id: number;
  section_name: string;
  capacity: number;
  schedule: string;
  room: string;
  instructor: string;
  created_at: string;
}

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);

  // Form states
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    description: '',
    units: 3,
    image_url: ''
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
  const blobUrlsRef = useRef<{ [id: string]: string }>({});

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchImages = async () => {
      const newImages: { [id: string]: string } = {};
      for (const course of courses) {
        const imagePath = course.image_url;
        if (imagePath && course.id !== undefined && course.id !== null) {
          try {
            const { data: fileData, error: fileError } = await supabase.storage
              .from('course')
              .download(imagePath);
            if (!fileError && fileData) {
              const blobUrl = URL.createObjectURL(fileData);
              newImages[String(course.id)] = blobUrl;
              blobUrlsRef.current[String(course.id)] = blobUrl;
            }
          } catch {}
        }
      }
      setCourseImages(newImages);
    };
    if (courses.length > 0) fetchImages();
    return () => {
      // Clean up blob URLs
      Object.values(blobUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
      blobUrlsRef.current = {};
    };
  }, [courses]);

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
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `course-images/${courseForm.code}/${fileName}`;
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
      let data, error;
      if (selectedCourse && selectedCourse.id) {
        // Update existing course
        ({ data, error } = await supabase
          .from('courses')
          .update({
            code: courseForm.code,
            name: courseForm.name,
            description: courseForm.description,
            units: courseForm.units,
            image_url: imagePath
          })
          .eq('id', selectedCourse.id)
          .select()
          .single());
      } else {
        // Insert new course
        ({ data, error } = await supabase
          .from('courses')
          .insert([{ ...courseForm, image_url: imagePath }])
          .select()
          .single());
      }
      if (error) throw error;
      toast.success(selectedCourse ? 'Course updated successfully' : 'Course added successfully');
      setShowAddModal(false);
      setCourseForm({ code: '', name: '', description: '', units: 3, image_url: '' });
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
      const { data, error } = await supabase
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
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast.success('Course deleted successfully');
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      toast.success('Section deleted successfully');
      fetchCourses();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('Failed to delete section');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen  from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Course Management</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-6 py-2 rounded-xl shadow-lg hover:from-blue-600 hover:to-indigo-600 transition-all font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Course
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-blue-100 to-indigo-100">
              <tr>
                <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Image</th>
                <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Code</th>
                <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Description</th>
                <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Units</th>
                <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 text-lg">
                    No courses available. Click <span className="font-semibold text-indigo-500">Add Course</span> to get started.
                  </td>
                </tr>
              ) : (
                courses.map((course, idx) => (
                  <tr
                    key={course.id}
                    className={`transition-all duration-200 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-indigo-50'
                    } hover:bg-indigo-100`}
                  >
                    <td className="px-8 py-4">
                      {courseImages[String(course.id)] ? (
                        <img src={courseImages[String(course.id)]} alt={course.name} className="w-16 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400">No Image</div>
                      )}
                    </td>
                    <td className="px-8 py-4 text-lg font-medium text-gray-900">{course.code}</td>
                    <td className="px-8 py-4 text-gray-700">{course.name}</td>
                    <td className="px-8 py-4 text-gray-700">{course.description}</td>
                    <td className="px-8 py-4 text-gray-700">{course.units}</td>
                    <td className="px-8 py-4">
                      <CourseActions
                        onEdit={() => {
                          setSelectedCourse(course);
                          setShowSectionModal(false);
                          setShowAddModal(true);
                          setCourseForm({
                            code: course.code,
                            name: course.name,
                            description: course.description,
                            units: course.units,
                            image_url: course.image_url || ''
                          });
                        }}
                        onDelete={() => handleDeleteCourse(String(course.id))}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Course</h2>
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Course Code</label>
                <input
                  type="text"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Course Name</label>
                <input
                  type="text"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Units</label>
                <input
                  type="number"
                  value={courseForm.units}
                  onChange={(e) => setCourseForm({ ...courseForm, units: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="1"
                  max="6"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setImageFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setImageFile(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showSectionModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Section to {selectedCourse.name}</h2>
            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Section Name</label>
                <input
                  type="text"
                  value={sectionForm.section_name}
                  onChange={(e) => setSectionForm({ ...sectionForm, section_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Capacity</label>
                <input
                  type="number"
                  value={sectionForm.capacity}
                  onChange={(e) => setSectionForm({ ...sectionForm, capacity: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Schedule</label>
                <input
                  type="text"
                  value={sectionForm.schedule}
                  onChange={(e) => setSectionForm({ ...sectionForm, schedule: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., MWF 8:00-9:30"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Room</label>
                <input
                  type="text"
                  value={sectionForm.room}
                  onChange={(e) => setSectionForm({ ...sectionForm, room: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Instructor</label>
                <input
                  type="text"
                  value={sectionForm.instructor}
                  onChange={(e) => setSectionForm({ ...sectionForm, instructor: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
