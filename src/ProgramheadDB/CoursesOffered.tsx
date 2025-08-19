import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Users, GraduationCap, Search, Filter, Grid, List, Trash2 } from 'lucide-react';
import CourseActions from '../components/CourseActions';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop';
import './dashboard.css'; 

// Utility function to crop image
function getCroppedImg(
  imageSrc: string,
  crop: { x: number; y: number },
  zoom: number,
  aspect: number,
  croppedAreaPixels: { width: number; height: number; x: number; y: number }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context is null'));
        return;
      }
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.95);
    };
    image.onerror = (e) => reject(e);
  });
}

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
  const [filterSemester, setFilterSemester] = useState('all');

  // Form states
  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    hours_per_week: 3,
    prerequisites: [] as string[],
    image_url: '',
    summer: false,
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

  // Crop state variables
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | undefined>(undefined);
  const [isCropping, setIsCropping] = useState(false);

  const [courseImages, setCourseImages] = useState<{ [id: string]: string }>({});
  const [imageLoading, setImageLoading] = useState<{ [id: string]: boolean }>({});
  const [imageError, setImageError] = useState<{ [id: string]: boolean }>({});
  
  // Prerequisite selection state
  const [availablePrerequisites, setAvailablePrerequisites] = useState<Course[]>([]);

  const handlePrerequisiteChange = (courseCode: string, checked: boolean) => {
    if (checked) {
      // When selecting a specific prerequisite, ensure "None" is not selected
      setCourseForm(prev => ({
        ...prev,
        prerequisites: [...prev.prerequisites, courseCode]
      }));
    } else {
      setCourseForm(prev => ({
        ...prev,
        prerequisites: prev.prerequisites.filter(code => code !== courseCode)
      }));
    }
  };

  const handleNonePrerequisiteChange = (checked: boolean) => {
    if (checked) {
      // Clear all prerequisites when "None" is selected
      setCourseForm(prev => ({
        ...prev,
        prerequisites: []
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      // Show crop modal instead of directly setting the file
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
    // Reset the input value so the same file can be selected again if needed
    e.target.value = '';
  };

  useEffect(() => {
    fetchCourses();
  }, []);



  // Crop completion handler
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Handle crop and save
  const handleCropSave = async () => {
    if (!selectedImage || !croppedAreaPixels) return;
    try {
      setIsCropping(true);
      const croppedBlob = await getCroppedImg(selectedImage, crop, zoom, 0, croppedAreaPixels);
      setImageFile(new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' }));
      setShowCropModal(false);
      setSelectedImage(null);
    } catch (error) {
      console.error('Error cropping image:', error);
      toast.error('Failed to crop image');
    } finally {
      setIsCropping(false);
    }
  };

  useEffect(() => {
    const fetchImages = async () => {
      const newImages: { [id: string]: string } = {};
      const newLoading: { [id: string]: boolean } = {};
      const newError: { [id: string]: boolean } = {};
      
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
              } else {
                newError[String(course.id)] = true;
              }
            } else {
              // File doesn't exist, mark as error
              newError[String(course.id)] = true;
              console.warn('Image not found for course:', course.id, imagePath);
              await supabase
                .from('courses')
                .update({ image_url: null })
                .eq('id', course.id);
            }
          } catch (error) {
            console.error('Error fetching image for course:', course.id, error);
            newError[String(course.id)] = true;
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
        } else {
          // No image path, mark as loaded but with no image
          newLoading[String(course.id)] = false;
        }
      }
      setCourseImages(newImages);
      setImageLoading(newLoading);
      setImageError(newError);
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

  // Memoized database operations
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('code', { ascending: true });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
      setAvailablePrerequisites(coursesData || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteCourse = useCallback(async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone and will affect all enrolled students.')) return;

    try {
      // First, check if the course has any enrollments
      console.log('Checking enrollments for course ID:', courseId);
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollcourse')
        .select('id')
        .eq('subject_id', courseId);

      if (enrollmentError) {
        console.error('Error checking enrollments:', enrollmentError);
        // Try alternative column names if subject_id doesn't exist
        if (enrollmentError.code === '42703') {
          console.log('Trying alternative column names for enrollments...');
          const { data: enrollmentsAlt, error: enrollmentErrorAlt } = await supabase
            .from('enrollcourse')
            .select('id')
            .eq('course_id', courseId);
          
          if (enrollmentErrorAlt) {
            console.error('Alternative column check failed:', enrollmentErrorAlt);
            toast.error('Failed to check course dependencies');
            return;
          }
          
          if (enrollmentsAlt && enrollmentsAlt.length > 0) {
            const shouldForceDelete = confirm(
              `This course has ${enrollmentsAlt.length} student enrollment(s). Do you want to force delete and remove all enrollments? This will affect student records.`
            );
            
            if (shouldForceDelete) {
              // Delete all enrollments first
              const { error: deleteEnrollmentsError } = await supabase
                .from('enrollcourse')
                .delete()
                .eq('course_id', courseId);
              
              if (deleteEnrollmentsError) {
                console.error('Error deleting enrollments:', deleteEnrollmentsError);
                toast.error('Failed to remove enrollments');
                return;
              }
              
              toast.success(`${enrollmentsAlt.length} enrollment(s) removed`);
            } else {
              return;
            }
          }
        } else {
          toast.error('Failed to check course dependencies');
          return;
        }
      }

      if (enrollments && enrollments.length > 0) {
        const shouldForceDelete = confirm(
          `This course has ${enrollments.length} student enrollment(s). Do you want to force delete and remove all enrollments? This will affect student records.`
        );
        
        if (shouldForceDelete) {
          // Delete all enrollments first
          const { error: deleteEnrollmentsError } = await supabase
            .from('enrollcourse')
            .delete()
            .eq('subject_id', courseId);
          
          if (deleteEnrollmentsError) {
            console.error('Error deleting enrollments:', deleteEnrollmentsError);
            toast.error('Failed to remove enrollments');
            return;
          }
          
          toast.success(`${enrollments.length} enrollment(s) removed`);
        } else {
          return;
        }
      }

      // Check if the course has any grades
      console.log('Checking grades for course ID:', courseId);
      const { data: grades, error: gradeError } = await supabase
        .from('grades')
        .select('id')
        .eq('subject_id', courseId);

      if (gradeError) {
        console.error('Error checking grades:', gradeError);
        // Try alternative column names if subject_id doesn't exist
        if (gradeError.code === '42703') {
          console.log('Trying alternative column names for grades...');
          const { data: gradesAlt, error: gradeErrorAlt } = await supabase
            .from('grades')
            .select('id')
            .eq('course_id', courseId);
          
          if (gradeErrorAlt) {
            console.error('Alternative column check failed:', gradeErrorAlt);
            toast.error('Failed to check course dependencies');
            return;
          }
          
          if (gradesAlt && gradesAlt.length > 0) {
            const shouldForceDelete = confirm(
              `This course has ${gradesAlt.length} grade record(s). Do you want to force delete and remove all grades? This will affect student academic records.`
            );
            
            if (shouldForceDelete) {
              // Delete all grades first
              const { error: deleteGradesError } = await supabase
                .from('grades')
                .delete()
                .eq('course_id', courseId);
              
              if (deleteGradesError) {
                console.error('Error deleting grades:', deleteGradesError);
                toast.error('Failed to remove grades');
                return;
              }
              
              toast.success(`${gradesAlt.length} grade record(s) removed`);
            } else {
              return;
            }
          }
        } else {
          toast.error('Failed to check course dependencies');
          return;
        }
      }

      if (grades && grades.length > 0) {
        const shouldForceDelete = confirm(
          `This course has ${grades.length} grade record(s). Do you want to force delete and remove all grades? This will affect student academic records.`
        );
        
        if (shouldForceDelete) {
          // Delete all grades first
          const { error: deleteGradesError } = await supabase
            .from('grades')
            .delete()
            .eq('subject_id', courseId);
          
          if (deleteGradesError) {
            console.error('Error deleting grades:', deleteGradesError);
            toast.error('Failed to remove grades');
            return;
          }
          
          toast.success(`${grades.length} grade record(s) removed`);
        } else {
          return;
        }
      }

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
      console.log('Attempting to delete course with ID:', courseId);
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        console.error('Delete error:', error);
        if (error.code === '23503') {
          toast.error('Cannot delete course. It is still referenced by other records. Please remove all dependencies first.');
        } else {
          toast.error(`Failed to delete course: ${error.message}`);
        }
        return;
      }

      console.log('Course deleted successfully from database');

      // Clean up the associated image if it exists
      if (courseData?.image_url) {
        try {
          console.log('Cleaning up course image:', courseData.image_url);
          await supabase.storage
            .from('course')
            .remove([courseData.image_url]);
          console.log('Course image cleaned up successfully');
        } catch (cleanupError) {
          console.error('Error cleaning up course image:', cleanupError);
          // Don't fail the entire operation if image cleanup fails
          toast.warning('Course deleted but image cleanup failed');
        }
      }

      toast.success('Course deleted successfully');
      console.log('Refreshing courses list...');
      await fetchCourses();
      console.log('Courses list refreshed');
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  }, [fetchCourses]);



  const cleanupUnusedImages = useCallback(async () => {
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
  }, []);

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSelectedCourse(null);
    setImageFile(null);
    setShowCropModal(false);
    setSelectedImage(null);
    
    // Reset form to default values
    setCourseForm({ 
      code: '', 
      name: '', 
      units: 3, 
      lec_units: 2, 
      lab_units: 1, 
      hours_per_week: 3, 
      prerequisites: [], 
      image_url: '', 
      summer: false, 
      year_level: '',
      semester: ''
    });
  };

  const validateForm = () => {
    // Don't validate if form is still loading
    if (!courseForm.code) {
      return false;
    }
    
    if (!courseForm.code.trim()) {
      toast.error('Subject code is required');
      return false;
    }
    if (!courseForm.name.trim()) {
      toast.error('Subject name is required');
      return false;
    }
    if (courseForm.units <= 0) {
      toast.error('Units must be greater than 0');
      return false;
    }
    if (courseForm.lec_units < 0 || courseForm.lab_units < 0) {
      toast.error('LEC and LAB units cannot be negative');
      return false;
    }
    
    // For new subjects, ensure total units equals LEC + LAB
    // For existing subjects, allow flexibility but warn if there's a mismatch
    if (!selectedCourse && courseForm.units !== (courseForm.lec_units + courseForm.lab_units)) {
      toast.error('Total units must equal LEC + LAB units');
      return false;
    }
    
    // For updates, auto-correct the total units if there's a mismatch
    if (selectedCourse && courseForm.units !== (courseForm.lec_units + courseForm.lab_units)) {
      console.log('Auto-correcting units mismatch for existing subject');
      console.log(`Current: units=${courseForm.units}, lec_units=${courseForm.lec_units}, lab_units=${courseForm.lab_units}`);
      const correctedUnits = courseForm.lec_units + courseForm.lab_units;
      console.log(`Corrected total units: ${correctedUnits}`);
      
      setCourseForm(prev => ({
        ...prev,
        units: correctedUnits
      }));
      
      toast.info(`Total units automatically adjusted from ${courseForm.units} to ${correctedUnits} to match LEC + LAB units`);
    }
    
    return true;
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
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
        console.log('Updating course with ID:', selectedCourse.id);
        console.log('Update data:', {
          code: courseForm.code,
          name: courseForm.name,
          units: courseForm.units,
          lec_units: courseForm.lec_units,
          lab_units: courseForm.lab_units,
          hours_per_week: courseForm.hours_per_week,
          prerequisites: courseForm.prerequisites,
          image_url: imagePath,
          summer: courseForm.summer,
          year_level: courseForm.year_level,
          semester: courseForm.semester
        });
        
        ({ error } = await supabase
          .from('courses')
          .update({
            code: courseForm.code,
            name: courseForm.name,
            units: courseForm.units,
            lec_units: courseForm.lec_units,
            lab_units: courseForm.lab_units,
            hours_per_week: courseForm.hours_per_week,
            prerequisites: courseForm.prerequisites,
            image_url: imagePath,
            summer: courseForm.summer,
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
        console.log('Inserting new course with data:', {
          code: courseForm.code,
          name: courseForm.name,
          units: courseForm.units,
          lec_units: courseForm.lec_units,
          lab_units: courseForm.lab_units,
          hours_per_week: courseForm.hours_per_week,
          prerequisites: courseForm.prerequisites,
          image_url: imagePath, 
          summer: courseForm.summer, 
          year_level: courseForm.year_level,
          semester: courseForm.semester
        });
        
        ({ error } = await supabase
          .from('courses')
          .insert([{ 
            code: courseForm.code,
            name: courseForm.name,
            units: courseForm.units,
            lec_units: courseForm.lec_units,
            lab_units: courseForm.lab_units,
            hours_per_week: courseForm.hours_per_week,
            prerequisites: courseForm.prerequisites,
            image_url: imagePath, 
            summer: courseForm.summer, 
            year_level: courseForm.year_level,
            semester: courseForm.semester
          }])
          .select()
          .single());
      }
      
      if (error) {
        console.error('Error saving course:', error);
        toast.error('Failed to save course');
        return;
      }
      
      toast.success(selectedCourse ? 'Course updated successfully' : 'Course added successfully');
      
      // Close modal and reset form
      handleCloseModal();
      
      // Refresh the courses list
      await fetchCourses();
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



  // Memoized filtered courses
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

  // Memoized course statistics
  const courseStats = useMemo(() => {
    const total = courses.length;
    const averageUnits = total > 0 ? (courses.reduce((sum, course) => sum + course.units, 0) / total).toFixed(1) : '0';
    const active = filteredCourses.length;
    const summerCourses = courses.filter(c => c.summer).length;
    const regularCourses = total - summerCourses;
    
    return {
      total,
      averageUnits,
      active,
      summerCourses,
      regularCourses
    };
  }, [courses, filteredCourses]);

  if (loading) {
    return (
      <div className="coursemanagement-skeleton min-h-screen from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header Skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="h-10 bg-gray-200 rounded w-80 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-96"></div>
              </div>
              <div className="flex gap-3">
                <div className="h-12 w-40 bg-gray-200 rounded-xl"></div>
                <div className="h-12 w-48 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Search and Filter Skeleton */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8 animate-pulse">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="h-12 bg-gray-200 rounded-xl"></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-12 w-32 bg-gray-200 rounded-xl"></div>
                <div className="h-10 w-20 bg-gray-200 rounded-xl"></div>
                <div className="h-12 w-32 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          </div>

          {/* Courses Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  </div>
                  <div className="h-5 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen from-blue-50 via-white to-indigo-50">
      {/* Crop Modal */}
      {showCropModal && selectedImage && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
          >
            <div className="relative mb-6">
              {/* Modern Header Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-t-2xl -m-6 mb-0"></div>
              
              {/* Header Content */}
              <div className="relative flex items-center justify-between py-2 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4a2 2 0 012-2h2a2 2 0 012 2v4m-6 0h8m-8 0l-2 8h12l-2-8m-6 4v4m0 0h.01" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white leading-tight">
                      Crop Subject Image
                    </h2>
                    <p className="text-white/80 text-xs font-medium leading-tight">
                      Adjust and crop your image to the desired size
                    </p>
                  </div>
                </div>
                
                {/* Modern Close Button */}
                <button
                  onClick={() => {
                    setShowCropModal(false);
                    setSelectedImage(null);
                  }}
                  className="absolute w-8 h-8 flex items-center justify-center text-lg font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 hover:scale-110 hover:rotate-90 top-2 right-3 z-50 animate-pop-in"
                  style={{ boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px' }}
                  aria-label="Close dialog"
                >
                  ×
                </button>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -translate-y-8 translate-x-8"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-full translate-y-6 -translate-x-6"></div>
            </div>
            
            <div className="w-full aspect-video relative bg-gray-100 rounded-xl overflow-hidden mb-6">
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="rect"
                showGrid={true}
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#f3f4f6'
                  }
                }}
              />
            </div>
            
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Zoom:</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-32 accent-blue-500"
                />
                <span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setSelectedImage(null);
                }}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                disabled={isCropping || !croppedAreaPixels}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50"
              >
                {isCropping ? 'Cropping...' : 'Crop & Save'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {showAddModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
          >
            <div className="relative mb-6">
              {/* Modern Header Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-t-2xl -m-8 mb-0"></div>
              
              {/* Header Content */}
              <div className="relative flex items-center justify-between py-2 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white leading-tight">
                      {selectedCourse ? 'Edit Subject' : 'Add New Subject'}
                    </h2>
                    <p className="text-white/80 text-xs font-medium leading-tight">
                      {selectedCourse ? 'Update subject information and settings' : 'Create a new subject with details and image'}
                    </p>
                  </div>
                </div>
                
                {/* Modern Close Button */}
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setImageFile(null);
                    setSelectedCourse(null);
                    setShowCropModal(false);
                    setSelectedImage(null);
                  }}
                  className="absolute w-8 h-8 flex items-center justify-center text-lg font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 hover:scale-110 hover:rotate-90 top-2 right-3 z-50 animate-pop-in"
                  style={{ boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px' }}
                  aria-label="Close dialog"
                >
                  ×
                </button>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -translate-y-8 translate-x-8"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-full translate-y-6 -translate-x-6"></div>
            </div>
            
            <form onSubmit={handleAddCourse} className="space-y-6">
              {/* First row: Subject Code, Units, Year Level */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Subject Code</label>
                  <input
                    type="text"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="e.g., CS101"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Units</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">LEC</label>
                      <input
                        type="number"
                        value={courseForm.lec_units}
                        onChange={(e) => {
                          const lec = parseInt(e.target.value) || 0;
                          const lab = courseForm.lab_units || 0;
                          const newUnits = lec + lab;
                          console.log(`LEC changed: ${lec}, LAB: ${lab}, Total: ${newUnits}`);
                          setCourseForm({ 
                            ...courseForm, 
                            lec_units: lec,
                            units: newUnits
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                        min="0"
                        max="6"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">LAB</label>
                      <input
                        type="number"
                        value={courseForm.lab_units}
                        onChange={(e) => {
                          const lab = parseInt(e.target.value) || 0;
                          const lec = courseForm.lec_units || 0;
                          const newUnits = lec + lab;
                          console.log(`LAB changed: ${lab}, LEC: ${lec}, Total: ${newUnits}`);
                          setCourseForm({ 
                            ...courseForm, 
                            lab_units: lab,
                            units: newUnits
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                        min="0"
                        max="6"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
                      <input
                        type="number"
                        value={courseForm.units}
                        className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-lg shadow-sm text-sm font-medium"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Year Level</label>
                  <select
                    value={courseForm.year_level}
                    onChange={e => setCourseForm({ ...courseForm, year_level: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  >
                    <option value="">Select year level</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Semester</label>
                  <select
                    value={courseForm.semester}
                    onChange={e => setCourseForm({ ...courseForm, semester: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  >
                    <option value="">Select semester</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                  </select>
                </div>
              </div>

              {/* Second row: Subject Name, Hours/Week, Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Subject Name</label>
                  <input
                    type="text"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="e.g., Introduction to Computer Science"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Hours/Week</label>
                  <input
                    type="number"
                    value={courseForm.hours_per_week}
                    onChange={(e) => setCourseForm({ ...courseForm, hours_per_week: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="e.g., 3"
                    min="1"
                    max="20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                  <select
                    value={courseForm.summer ? 'Summer' : 'Regular'}
                    onChange={e => setCourseForm({ ...courseForm, summer: e.target.value === 'Summer' })}
                    className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  >
                    <option value="Regular">Regular</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
              </div>

              {/* Prerequisites Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Prerequisites</label>
                  {courseForm.prerequisites.length > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {courseForm.prerequisites.length} selected
                    </span>
                  )}
                </div>
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 max-h-48 overflow-y-auto">
                  {/* None Option */}
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <label className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-white transition-colors duration-200 cursor-pointer ${
                      courseForm.prerequisites.length === 0 ? 'bg-blue-50 border border-blue-200' : ''
                    }`}>
                      <input
                        type="checkbox"
                        checked={courseForm.prerequisites.length === 0}
                        onChange={(e) => handleNonePrerequisiteChange(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          None (No prerequisites required)
                        </div>
                        <div className="text-xs text-gray-500">
                          This course has no prerequisites
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  {availablePrerequisites.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availablePrerequisites
                        .filter(course => course.code !== courseForm.code) // Exclude current course
                        .map((course) => (
                          <label key={course.id} className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-white transition-colors duration-200 cursor-pointer ${
                            courseForm.prerequisites.includes(course.code) ? 'bg-blue-50 border border-blue-200' : ''
                          }`}>
                            <input
                              type="checkbox"
                              checked={courseForm.prerequisites.includes(course.code)}
                              onChange={(e) => handlePrerequisiteChange(course.code, e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {course.code}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {course.name}
                              </div>
                            </div>
                          </label>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-gray-400 text-sm">
                        No other courses available as prerequisites
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Select "None" for no prerequisites, or choose specific subjects that must be completed before enrolling in this course
                </div>
              </div>

              {/* Subject Image */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject Image</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-gray-50 to-white">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="course-image"
                  />
                  {imageFile ? (
                    <div className="relative w-full group">
                      {/* Show cropped image preview */}
                      <div className="relative w-full overflow-hidden rounded-xl">
                        <img 
                          src={URL.createObjectURL(imageFile)} 
                          alt="Cropped preview" 
                          className="w-full h-48 object-cover rounded-xl border-2 border-blue-200 shadow-lg transition-transform duration-300 group-hover:scale-105" 
                        />
                        {/* Success indicator */}
                        <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Ready
                        </div>
                      </div>
                      {/* Modern centered buttons overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl backdrop-blur-sm">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              // Only trigger file input, don't clear current image yet
                              document.getElementById('course-image')?.click();
                            }}
                            className="px-4 py-2 text-sm bg-white/90 backdrop-blur-sm text-blue-700 rounded-lg hover:bg-white transition-all duration-200 font-medium shadow-lg border border-white/20 hover:shadow-xl transform hover:scale-105"
                          >
                            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Change Image
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedImage(URL.createObjectURL(imageFile));
                              setShowCropModal(true);
                            }}
                            className="px-4 py-2 text-sm bg-white/90 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white transition-all duration-200 font-medium shadow-lg border border-white/20 hover:shadow-xl transform hover:scale-105"
                          >
                            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4a2 2 0 012-2h2a2 2 0 012 2v4m-6 0h8m-8 0l-2 8h12l-2-8m-6 4v4m0 0h.01" />
                            </svg>
                            Re-crop
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="course-image" className="cursor-pointer group w-full h-48 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-base font-semibold text-gray-700 mb-1">Upload Subject Image</p>
                          <p className="text-xs text-gray-500 mb-2">Drag and drop or click to browse</p>
                          <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                              PNG, JPG, GIF
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                              </svg>
                              Max 10MB
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
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
                  {selectedCourse ? 'Update Course' : 'Add Subject'}
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
            <div className="relative mb-6">
              {/* Modern Header Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-t-2xl -m-8 mb-0"></div>
              
              {/* Header Content */}
              <div className="relative flex items-center justify-between py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg">
                    <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white leading-tight">
                      Add Section
                    </h2>
                    <p className="text-white/80 text-xs font-medium leading-tight">
                      Add a new section to {selectedCourse.name}
                    </p>
                  </div>
                </div>
                
                {/* Modern Close Button */}
                <button
                  onClick={() => setShowSectionModal(false)}
                  className="absolute w-8 h-8 flex items-center justify-center text-lg font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 hover:scale-110 hover:rotate-90 top-2 right-3 z-50 animate-pop-in"
                  style={{ boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px' }}
                  aria-label="Close dialog"
                >
                  ×
                </button>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -translate-y-8 translate-x-8"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-full translate-y-6 -translate-x-6"></div>
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
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open w-6 h-6 text-white">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Subject Management</h1>
                  <p className="text-white/80 text-sm font-medium">Manage and organize your academic subjects efficiently</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/80"></div>
                </div>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={cleanupUnusedImages}
                  className="coursemanagement-cleanup-button bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all duration-300 font-semibold flex items-center gap-2 border border-white/30"
                >
                  <Trash2 className="w-4 h-4" />
                  Cleanup
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddModal(true)}
                  className="coursemanagement-add-button bg-white/20 backdrop-blur-sm text-white px-6 py-2 rounded-lg hover:bg-white/30 transition-all duration-300 font-semibold flex items-center gap-2 border border-white/30"
                >
                  <Plus className="w-4 h-4" />
                  Add New Subject
                </motion.button>
              </div>
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
          <div className="coursemanagement-stats-card bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Courses</p>
                <p className="text-3xl font-bold text-gray-900">{courseStats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="coursemanagement-stats-card bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Average Units</p>
                <p className="text-3xl font-bold text-gray-900">{courseStats.averageUnits}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="coursemanagement-stats-card bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Courses</p>
                <p className="text-3xl font-bold text-gray-900">{courseStats.active}</p>
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
          className="coursemanagement-controls bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8"
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
                <select
                  className="border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={filterSemester}
                  onChange={e => setFilterSemester(e.target.value)}
                >
                  <option value="all">All Semesters</option>
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
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
            <div className="space-y-8">
              {(() => {
                // Group courses by year level and semester
                const groupedCourses: { [yearLevel: string]: { [semester: string]: typeof filteredCourses } } = {};
                
                filteredCourses.forEach(course => {
                  const yearLevel = course.year_level || 'Unknown Year';
                  const semester = course.semester || 'No Semester';
                  
                  if (!groupedCourses[yearLevel]) {
                    groupedCourses[yearLevel] = {};
                  }
                  if (!groupedCourses[yearLevel][semester]) {
                    groupedCourses[yearLevel][semester] = [];
                  }
                  
                  groupedCourses[yearLevel][semester].push(course);
                });
                
                return Object.entries(groupedCourses).map(([yearLevel, semesters], yearIdx) => (
                  <motion.div
                    key={yearLevel}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: yearIdx * 0.1 }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
                  >
                    {/* Year Level Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {yearLevel}
                      </h2>
                    </div>
                    
                    {/* Semesters */}
                    <div className="p-6 space-y-6">
                      {Object.entries(semesters).map(([semester, courses], semesterIdx) => (
                        <div key={semester} className="space-y-4">
                          {/* Semester Header */}
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              {semester}
                              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {courses.length} subject{courses.length !== 1 ? 's' : ''}
                              </span>
                            </h3>
                            <div className="text-sm text-gray-500">
                              {courses.reduce((total, course) => total + (course.units || 0), 0)} total units
                            </div>
                          </div>
                          
                          {/* Courses List */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Code</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LEC</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LAB</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours/Week</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prerequisites</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {courses.map((course, courseIdx) => (
                                  <motion.tr
                                    key={course.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (yearIdx * 0.1) + (semesterIdx * 0.05) + (courseIdx * 0.02) }}
                                    className="hover:bg-gray-50 transition-colors duration-200 group"
                                  >
                                    {/* Subject Image */}
                                    <td className="px-4 py-3">
                                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center relative">
                                        {/* Loading Skeleton */}
                                        {imageLoading[String(course.id)] && (
                                          <div className="w-full h-full relative">
                                            <div className="absolute inset-0 enhanced-shimmer">
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Actual Image */}
                                        {!imageLoading[String(course.id)] && courseImages[String(course.id)] && (
                                          <img
                                            src={courseImages[String(course.id)]}
                                            alt={course.name}
                                            className="w-full h-full object-cover transition-opacity duration-300"
                                            onError={() => setImageError(prev => ({ ...prev, [String(course.id)]: true }))}
                                          />
                                        )}
                                        
                                        {/* No Image Placeholder */}
                                        {!imageLoading[String(course.id)] && !courseImages[String(course.id)] && !imageError[String(course.id)] && (
                                          <div className="flex flex-col items-center justify-center w-full h-full gap-1 bg-gray-50/80">
                                            <BookOpen className="w-4 h-4 text-gray-400" />
                                            <span className="text-[8px] text-gray-500 font-medium">No Image</span>
                                          </div>
                                        )}
                                        
                                        {/* Error State */}
                                        {!imageLoading[String(course.id)] && imageError[String(course.id)] && (
                                          <div className="flex flex-col items-center justify-center w-full h-full gap-1 bg-red-50/80">
                                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                            <span className="text-[8px] text-red-500 font-medium">Error</span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    
                                    {/* Subject Code */}
                                    <td className="px-4 py-3">
                                      <span className="text-sm font-semibold text-blue-600">{course.code}</span>
                                    </td>
                                    
                                    {/* Subject Name */}
                                    <td className="px-4 py-3">
                                      <span className="text-sm font-medium text-gray-900 max-w-xs truncate block" title={course.name}>
                                        {course.name}
                                      </span>
                                    </td>
                                    
                                    {/* Total Units */}
                                    <td className="px-4 py-3">
                                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                                        {course.units || 0} Unit{(course.units || 0) !== 1 ? 's' : ''}
                                      </span>
                                    </td>
                                    
                                    {/* LEC Units */}
                                    <td className="px-4 py-3">
                                      <span className="text-sm text-gray-700">
                                        {course.lec_units || 0}
                                      </span>
                                    </td>
                                    
                                    {/* LAB Units */}
                                    <td className="px-4 py-3">
                                      <span className="text-sm text-gray-700">
                                        {course.lab_units || 0}
                                      </span>
                                    </td>
                                    
                                    {/* Hours per Week */}
                                    <td className="px-4 py-3">
                                      <span className="text-sm text-gray-700">
                                        {course.hours_per_week || 0}
                                      </span>
                                    </td>
                                    
                                    {/* Prerequisites */}
                                    <td className="px-4 py-3">
                                      <div className="flex flex-wrap gap-1">
                                        {course.prerequisites && course.prerequisites.length > 0 ? (
                                          course.prerequisites.map((prereq, idx) => (
                                            <span key={idx} className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                                              {prereq}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-xs text-gray-400">None</span>
                                        )}
                                      </div>
                                    </td>
                                    
                                    {/* Type */}
                                    <td className="px-4 py-3">
                                      {course.summer ? (
                                        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="inline-block w-2 h-2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                          Summer
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                                          Regular
                                        </span>
                                      )}
                                    </td>
                                    
                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                      <div className="bg-white/80 backdrop-blur-sm border border-white/30 rounded-lg p-1 shadow-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <CourseActions
                                          onEdit={() => {
                                            setSelectedCourse(course);
                                            setShowSectionModal(false);
                                            setShowAddModal(true);
                                            console.log('Loading course data for editing:', course);
                                            setCourseForm({
                                              code: course.code,
                                              name: course.name,
                                              units: course.units || 3,
                                              lec_units: course.lec_units || course.units || 3,
                                              lab_units: course.lab_units || 0,
                                              hours_per_week: course.hours_per_week || 3,
                                              prerequisites: course.prerequisites || [],
                                              image_url: course.image_url || '',
                                              summer: course.summer || false,
                                              year_level: course.year_level || '',
                                              semester: course.semester || ''
                                            });
                                            setImageFile(null);
                                            setShowCropModal(false);
                                            setSelectedImage(null);
                                          }}
                                          onDelete={() => handleDeleteCourse(String(course.id))}
                                        />
                                      </div>
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
                // Group courses by year level and semester for list view
                const groupedCourses: { [yearLevel: string]: { [semester: string]: typeof filteredCourses } } = {};
                
                filteredCourses.forEach(course => {
                  const yearLevel = course.year_level || 'Unknown Year';
                  const semester = course.semester || 'No Semester';
                  
                  if (!groupedCourses[yearLevel]) {
                    groupedCourses[yearLevel] = {};
                  }
                  if (!groupedCourses[yearLevel][semester]) {
                    groupedCourses[yearLevel][semester] = [];
                  }
                  
                  groupedCourses[yearLevel][semester].push(course);
                });
                
                return Object.entries(groupedCourses).map(([yearLevel, semesters], yearIdx) => (
                  <motion.div
                    key={yearLevel}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: yearIdx * 0.1 }}
                    className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
                  >
                    {/* Year Level Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        {yearLevel}
                      </h2>
                    </div>
                    
                    {/* Semesters */}
                    <div className="space-y-6">
                      {Object.entries(semesters).map(([semester, courses], semesterIdx) => (
                        <div key={semester} className="space-y-4">
                          {/* Semester Header */}
                          <div className="px-6 pt-6 pb-2">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              {semester}
                              <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {courses.length} subject{courses.length !== 1 ? 's' : ''}
                              </span>
                            </h3>
                          </div>
                          
                          {/* Courses Table */}
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Image</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {courses.map((course) => (
                                  <tr key={course.id} className="hover:bg-gray-50 transition-colors duration-200">
                                    {/* Units */}
                                    <td className="px-6 py-4">
                                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                                        {course.units} Unit{course.units !== 1 ? 's' : ''}
                                      </span>
                                    </td>
                                    {/* Subject Name with Code */}
                                    <td className="px-6 py-4 font-semibold text-gray-900">
                                      <span className="text-blue-600">{course.code}</span> - {course.name}
                                    </td>
                                    {/* Subject Image */}
                                    <td className="px-6 py-4">
                                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center relative">
                                        {/* Loading Skeleton */}
                                        {imageLoading[String(course.id)] && (
                                          <div className="w-full h-full relative">
                                            <div className="absolute inset-0 enhanced-shimmer">
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Actual Image */}
                                        {!imageLoading[String(course.id)] && courseImages[String(course.id)] && (
                                          <img 
                                            src={courseImages[String(course.id)]} 
                                            alt={course.name} 
                                            className="w-full h-full object-cover transition-opacity duration-300"
                                            onError={() => setImageError(prev => ({ ...prev, [String(course.id)]: true }))}
                                          />
                                        )}
                                        
                                        {/* No Image Placeholder */}
                                        {!imageLoading[String(course.id)] && !courseImages[String(course.id)] && !imageError[String(course.id)] && (
                                          <div className="flex flex-col items-center justify-center w-full h-full gap-1 bg-gray-50/80">
                                            <BookOpen className="w-4 h-4 text-gray-400" />
                                            <span className="text-[8px] text-gray-500 font-medium">No Image</span>
                                          </div>
                                        )}
                                        
                                        {/* Error State */}
                                        {!imageLoading[String(course.id)] && imageError[String(course.id)] && (
                                          <div className="flex flex-col items-center justify-center w-full h-full gap-1 bg-red-50/80">
                                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                            <span className="text-[8px] text-red-500 font-medium">Error</span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    {/* Type */}
                                    <td className="px-6 py-4">
                                      {course.summer ? (
                                        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="inline-block w-2 h-2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                                          Summer
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                                          Regular
                                        </span>
                                      )}
                                    </td>
                                    {/* Actions */}
                                    <td className="px-6 py-4">
                                       <div className="bg-white/40 backdrop-blur-md border border-white/30 rounded-lg p-1 shadow-md flex items-center gap-1">
                                         <CourseActions
                                           onEdit={() => {
                                             setSelectedCourse(course);
                                             setShowSectionModal(false);
                                             setShowAddModal(true);
                                             console.log('Loading course data for editing:', course);
                                             setCourseForm({
                                               code: course.code,
                                               name: course.name,
                                               units: course.units || 3,
                                               lec_units: course.lec_units || course.units || 3,
                                               lab_units: course.lab_units || 0,
                                               hours_per_week: course.hours_per_week || 3,
                                               prerequisites: course.prerequisites || [],
                                               image_url: course.image_url || '',
                                               summer: course.summer || false,
                                               year_level: course.year_level || '',
                                               semester: course.semester || ''
                                             });
                                             setImageFile(null);
                                             setShowCropModal(false);
                                             setSelectedImage(null);
                                           }}
                                           onDelete={() => handleDeleteCourse(String(course.id))}
                                         />
                                       </div>
                                     </td>
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
}
