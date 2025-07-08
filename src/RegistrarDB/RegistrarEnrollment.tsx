import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Download, Printer, Eye, Users, BookOpen, CheckCircle2, X, Loader2, UserCheck, UserPlus, UserX } from 'lucide-react';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  course_id: string | null;
  year_level: string;
  enrollment_status: string;
  role: string;
  enrolled_courses?: string[];
  department?: string;
  semester?: string;
}
interface Course {
  id: string;
  code: string;
  name: string;
  department: string;
  units: number;
  created_at: string;
  updated_at: string;
}

// COEModal for viewing Certificate of Enrollment
const COEModal = ({ coe, open, onClose }: { coe: any, open: boolean, onClose: () => void }) => {
  if (!coe || !open) return null;
  // Download as PDF using jsPDF + autoTable function
  const handleDownload = () => {
    // Dynamically import jsPDF and autoTable
    import('jspdf').then(jsPDFModule => {
      import('jspdf-autotable').then(autoTableModule => {
        const jsPDF = jsPDFModule.default;
        const autoTable = autoTableModule.default;
        const doc = new jsPDF();
        
        // Add logo to PDF
        const logo = new Image();
        logo.src = '/img/logo.png';
        logo.onload = () => {
          doc.addImage(logo, 'PNG', 85, 15, 25, 25);
          
          doc.setFontSize(18);
          doc.text('SMCBI', 105, 50, { align: 'center' });
          doc.setFontSize(14);
          doc.text('Certificate of Enrollment', 105, 60, { align: 'center' });
          doc.setFontSize(11);
          doc.text(`Date: ${new Date(coe.date_issued).toLocaleDateString()}`, 20, 70);
          let y = 80;
          doc.text(`Student ID: ${coe.student_number || coe.student_id}`, 20, y);
          doc.text(`Full Name: ${coe.full_name || 'N/A'}`, 120, y);
          y += 7;
          doc.text(`School Year: ${coe.school_year}`, 20, y);
          doc.text(`Semester: ${coe.semester}`, 120, y);
          y += 7;
          doc.text(`Year Level: ${coe.year_level || 'N/A'}`, 20, y);
          doc.text(`Department: ${coe.department || 'N/A'}`, 120, y);
          y += 7;
          doc.text(`School Portal Email: ${coe.email || 'N/A'}`, 20, y);
          autoTable(doc, {
            startY: y + 10,
            head: [['Course Code', 'Course Name', 'Units']],
            body: Array.isArray(coe.subjects) ? [
              ...coe.subjects.map((subj: any) => [subj.code, subj.name, subj.units]),
              ["", "Total Units", coe.subjects.reduce((sum: number, subj: any) => sum + (Number(subj.units) || 0), 0)]
            ] : [],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 10 }
          });
          const finalY = (doc as any).lastAutoTable.finalY || y + 30;
          doc.setFontSize(12);
          doc.text('ENROLLED', 105, finalY + 15, { align: 'center' });
          doc.setFontSize(10);
          doc.text('This is to certify that the above-named student is officially enrolled in the above-mentioned program for the current academic year.', 105, finalY + 22, { align: 'center', maxWidth: 170 });
          doc.text('Registrar', 20, finalY + 38);
          doc.text('Signature over printed name', 20, finalY + 45);
          doc.save(`COE-${coe.school_year}-${coe.semester}.pdf`);
        };
      });
    });
  };
  const handlePrint = () => {
    import('jspdf').then(jsPDFModule => {
      import('jspdf-autotable').then(autoTableModule => {
        const jsPDF = jsPDFModule.default;
        const autoTable = autoTableModule.default;
        const doc = new jsPDF();
        
        // Add logo to PDF
        const logo = new Image();
        logo.src = '/img/logo.png';
        logo.onload = () => {
          doc.addImage(logo, 'PNG', 85, 15, 25, 25);
          
          doc.setFontSize(18);
          doc.text('SMCBI', 105, 50, { align: 'center' });
          doc.setFontSize(14);
          doc.text('Certificate of Enrollment', 105, 60, { align: 'center' });
          doc.setFontSize(11);
          doc.text(`Date: ${new Date(coe.date_issued).toLocaleDateString()}`, 20, 70);
          let y = 80;
          doc.text(`Student ID: ${coe.student_number || coe.student_id}`, 20, y);
          doc.text(`Full Name: ${coe.full_name || 'N/A'}`, 120, y);
          y += 7;
          doc.text(`School Year: ${coe.school_year}`, 20, y);
          doc.text(`Semester: ${coe.semester}`, 120, y);
          y += 7;
          doc.text(`Year Level: ${coe.year_level || 'N/A'}`, 20, y);
          doc.text(`Department: ${coe.department || 'N/A'}`, 120, y);
          y += 7;
          doc.text(`School Portal Email: ${coe.email || 'N/A'}`, 20, y);
          autoTable(doc, {
            startY: y + 10,
            head: [['Course Code', 'Course Name', 'Units']],
            body: Array.isArray(coe.subjects) ? [
              ...coe.subjects.map((subj: any) => [subj.code, subj.name, subj.units]),
              ["", "Total Units", coe.subjects.reduce((sum: number, subj: any) => sum + (Number(subj.units) || 0), 0)]
            ] : [],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 10 }
          });
          const finalY = (doc as any).lastAutoTable.finalY || y + 30;
          doc.setFontSize(12);
          doc.text('ENROLLED', 105, finalY + 15, { align: 'center' });
          doc.setFontSize(10);
          doc.text('This is to certify that the above-named student is officially enrolled in the above-mentioned program for the current academic year.', 105, finalY + 22, { align: 'center', maxWidth: 170 });
          doc.text('Registrar', 20, finalY + 38);
          doc.text('Signature over printed name', 20, finalY + 45);
          doc.autoPrint();
          doc.output('dataurlnewwindow');
        };
      });
    });
  };
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  return (
    <>
      {/* Full screen overlay to completely block all interactions */}
      <div 
        className="fixed inset-0 z-[99999] bg-black bg-opacity-50"
        onClick={handleBackdropClick}
        style={{ 
          pointerEvents: 'auto',
          userSelect: 'none',
          touchAction: 'none'
        }}
      />
      
      {/* Modal container */}
      <div
        className="fixed inset-0 z-[100000] flex items-center justify-center"
        style={{ 
          minHeight: '100vh',
          pointerEvents: 'none'
        }}
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 w-full max-w-xl relative mx-4 flex flex-col"
          style={{ 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            boxSizing: 'border-box',
            pointerEvents: 'auto'
          }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
            aria-label="Close"
          >
            &times;
          </button>
          <div className="flex justify-end gap-2 mb-4">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" /> Download
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-3 mb-4">
              <img 
                src="/img/logo.png" 
                alt="SMCBI Logo" 
                className="w-20 h-20 object-contain"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">SMCBI</h1>
                <p className="text-gray-600 mt-1">Certificate of Enrollment</p>
              </div>
            </div>
            <p className="text-gray-500">Date: {new Date(coe.date_issued).toLocaleDateString()}</p>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Student ID</p>
                <p className="font-medium">{coe.student_number || coe.student_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="font-medium">{coe.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">School Year</p>
                <p className="font-medium">{coe.school_year}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Semester</p>
                <p className="font-medium">{coe.semester}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Year Level</p>
                <p className="font-medium">{coe.year_level || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{coe.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">School Portal Email</p>
                <p className="font-medium">{coe.email || 'N/A'}</p>
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrolled Courses</h3>
              <div className="border rounded-lg overflow-hidden w-full">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(coe.subjects) && coe.subjects.map((subject: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subject.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subject.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{subject.units}</td>
                      </tr>
                    ))}
                    {/* Total Units Row */}
                    <tr>
                      <td></td>
                      <td className="px-6 py-4 font-bold text-right">Total Units</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{Array.isArray(coe.subjects) ? coe.subjects.reduce((sum: number, subj: any) => sum + (Number(subj.units) || 0), 0) : 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-8 text-center">
              <p className="text-2xl font-bold text-green-600">ENROLLED</p>
              <p className="text-sm text-gray-500 mt-2">This is to certify that the above-named student is officially enrolled in the above-mentioned program for the current academic year.</p>
            </div>
            <div className="mt-12 flex justify-between">
              <div className="text-center">
                <p className="font-medium">Registrar</p>
                <div className="mt-8 border-t border-gray-300 pt-2">
                  <p className="text-sm text-gray-600">Signature over printed name</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const RegistrarEnrollment: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [coeModalOpen, setCOEModalOpen] = useState(false);
  const [coeLoading, setCOELoading] = useState(false);
  const [coeError, setCOEError] = useState<string | null>(null);
  const [coeData, setCOEData] = useState<any | null>(null);

  // Stats
  const totalStudents = students.length;
  const pendingStudents = students.filter(s => s.enrollment_status === 'pending').length;
  const enrolledStudents = students.filter(s => s.enrollment_status === 'enrolled').length;

  // Fetch students and courses on component mount
  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'student')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      // First, let's see what columns actually exist
      const { data: tableInfo, error: tableError } = await supabase
        .from('courses')
        .select('*')
        .limit(1);

      if (tableError) {
        console.error('Error checking table structure:', tableError);
        throw tableError;
      }

      // Log the column names to see what we're working with
      console.log('Available columns:', Object.keys(tableInfo?.[0] || {}));

      // Now fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')  // Select all columns first to see what we get
        .order('name', { ascending: true });

      if (coursesError) throw coursesError;
      console.log('First course data:', coursesData?.[0]);  // Log first course to see structure
      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const handleEnrollStudent = async (studentId: string, subjectIds: string[]) => {
    try {
      // First, get current enrollments
      const { data: currentEnrollments, error: fetchError } = await supabase
        .from('enrollcourse')
        .select('subject_id')
        .eq('student_id', studentId);

      if (fetchError) throw fetchError;

      const currentSubjectIds = currentEnrollments?.map(e => e.subject_id) || [];

      // Prepare arrays for new enrollments and removals
      const subjectsToAdd = subjectIds.filter(id => !currentSubjectIds.includes(id));
      const subjectsToRemove = currentSubjectIds.filter(id => !subjectIds.includes(id));

      // Handle new enrollments
      if (subjectsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('enrollcourse')
          .insert(
            subjectsToAdd.map(subjectId => ({
              student_id: studentId,
              subject_id: subjectId,
              status: 'active',
              enrollment_date: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
          );

        if (insertError) throw insertError;
      }

      // Handle course removals
      if (subjectsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('enrollcourse')
          .delete()
          .eq('student_id', studentId)
          .in('subject_id', subjectsToRemove);

        if (deleteError) throw deleteError;
      }

      // Update local state
      setStudents(students.map(student => 
        student.id === studentId 
          ? { ...student, enrolled_courses: subjectIds }
          : student
      ));

      toast.success('Student enrollment updated successfully');
      setSelectedStudent(null);
      setSelectedCourses([]);
    } catch (error) {
      console.error('Error updating enrollments:', error);
      toast.error('Failed to update enrollments');
    }
  };

  // Function to fetch student's current enrollments
  const fetchStudentEnrollments = async (studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('enrollcourse')
        .select('subject_id')
        .eq('student_id', studentId)
        .eq('status', 'active');

      if (error) throw error;
      return data?.map(e => e.subject_id) || [];
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      return [];
    }
  };

  // Update the click handler for the Enroll button
  const handleEnrollClick = async (student: Student) => {
    const currentEnrollments = await fetchStudentEnrollments(student.id);
    setSelectedStudent(student);
    setSelectedCourses(currentEnrollments);
    setShowConfirmModal(true);
  };

  // New function to confirm enrollment
  const handleConfirmEnroll = async () => {
    if (!selectedStudent) return;
    try {
      // Update the student's status to 'enrolled'
      const { error } = await supabase
        .from('user_profiles')
        .update({ enrollment_status: 'enrolled' })
        .eq('id', selectedStudent.id);
      if (error) throw error;

      // Prepare COE data
      const studentProfile = selectedStudent;
      // Try to get school_year and semester from the student profile or set as current
      const schoolYear = new Date().getMonth() >= 5
        ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
        : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
      const semester = studentProfile.semester || '1st Semester';
      const dateIssued = new Date().toISOString();
      // Build subjects array from selectedCourses and courses
      const enrolledSubjects = selectedCourses.map(subjectId => {
        const course = courses.find(c => c.id === subjectId);
        return course ? {
          code: course.code,
          name: course.name,
          department: course.department,
          units: course.units
        } : null;
      }).filter(Boolean);
      // Registrar name (issuer) - replace with actual registrar name if available
      const registrar = 'Registrar';
      // Insert into COE table
      const coePayload = {
        student_id: studentProfile.id, // UUID
        student_number: studentProfile.student_id, // Official student number
        school_year: schoolYear,
        semester: semester,
        year_level: studentProfile.year_level,
        date_issued: dateIssued,
        subjects: enrolledSubjects,
        status: 'active',
        registrar: registrar,
        full_name: `${studentProfile.first_name} ${studentProfile.last_name}`,
        department: courses.find(c => c.id === studentProfile.course_id)?.department || studentProfile.department || '',
        email: studentProfile.email
      };
      console.log('COE Payload:', coePayload); // Debug log
      const { error: coeError, data: coeData } = await supabase
        .from('coe')
        .insert(coePayload);
      if (coeError) {
        console.error('COE Insert Error:', coeError, 'Payload:', coePayload);
        throw coeError;
      }

      toast.success('Student successfully enrolled and COE issued!');
      setShowConfirmModal(false);
      setSelectedStudent(null);
      setSelectedCourses([]);
      fetchStudents();
    } catch (error) {
      toast.error('Failed to enroll student or issue COE');
    }
  };

  // Handler to view COE for a student
  const handleViewCOE = async (studentId: string) => {
    setCOELoading(true);
    setCOEError(null);
    setCOEData(null);
    setCOEModalOpen(true);
    try {
      const { data, error } = await supabase
        .from('coe')
        .select('*')
        .eq('student_id', studentId)
        .order('date_issued', { ascending: false })
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        setCOEData(data[0]);
      } else {
        setCOEError('No Certificate of Enrollment found for this student.');
      }
    } catch (err: any) {
      setCOEError(err.message || 'Failed to fetch COE.');
    } finally {
      setCOELoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || student.enrollment_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen  from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-blue-600" />
              Enrollment Approvals
            </h1>
            <p className="text-gray-600 text-lg">Approve, enroll, and manage student registrations</p>
          </div>
          <button
            onClick={fetchStudents}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold flex items-center gap-3"
          >
            <Loader2 className="w-5 h-5 animate-spin mr-2 hidden" />
            Refresh List
          </button>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Approvals</p>
              <p className="text-3xl font-bold text-gray-900">{pendingStudents}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Enrolled Students</p>
              <p className="text-3xl font-bold text-gray-900">{enrolledStudents}</p>
            </div>
          </div>
        </div>
        {/* Search/Filter Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search students by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Status</option>
              <option value="enrolled">Enrolled</option>
              <option value="pending">Pending</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-500 font-medium">Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No students found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No students available for enrollment.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.student_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.last_name}, {student.first_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.year_level}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {courses.find(c => c.id === student.course_id)?.name || 'Not Enrolled'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${student.enrollment_status === 'enrolled' ? 'bg-green-100 text-green-800' : 
                          student.enrollment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {student.enrollment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2 items-center">
                        {student.enrollment_status === 'pending' ? (
                          <button
                            onClick={() => handleEnrollClick(student)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors font-semibold flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            style={{ minWidth: 80 }}
                          >
                            <UserCheck className="w-4 h-4 mr-1" /> Enroll
                          </button>
                        ) : (
                          <button
                            className="px-3 py-1 bg-gray-200 text-gray-400 rounded-lg font-semibold cursor-not-allowed flex items-center gap-1"
                            style={{ minWidth: 80 }}
                            disabled
                          >
                            <UserCheck className="w-4 h-4 mr-1" /> Enroll
                          </button>
                        )}
                        <button
                          onClick={() => handleViewCOE(student.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors font-semibold flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-green-400"
                          title="View Certificate of Enrollment"
                          style={{ minWidth: 110 }}
                        >
                          <Eye className="w-4 h-4 mr-1" /> View COE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Enrollment Modal */}
        {showConfirmModal && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Confirm Enrollment
              </h2>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <div><span className="font-medium">Student ID:</span> {selectedStudent.student_id}</div>
                  <div><span className="font-medium">Name:</span> {selectedStudent.last_name}, {selectedStudent.first_name}</div>
                  <div><span className="font-medium">Email:</span> {selectedStudent.email}</div>
                  <div><span className="font-medium">Year Level:</span> {selectedStudent.year_level}</div>
                  <div><span className="font-medium">Current Course:</span> {courses.find(c => c.id === selectedStudent.course_id)?.name || 'Not Enrolled'}</div>
                  <div><span className="font-medium">Status:</span> {selectedStudent.enrollment_status}</div>
                </div>
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Courses for Enrollment</h3>
                  <div className="space-y-2">
                  {selectedCourses.length === 0 ? (
                    <div className="text-sm text-gray-500">No courses selected.</div>
                  ) : (
                    selectedCourses.map(courseId => {
                      const course = courses.find(c => c.id === courseId);
                      return course ? (
                        <div key={courseId} className="text-sm text-gray-600">
                          <span className="font-medium">{course.name}</span> ({course.code})
                        </div>
                      ) : null;
                    })
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedStudent(null);
                    setSelectedCourses([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmEnroll}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Confirm Enrollment
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* COE Modal */}
        {coeModalOpen && createPortal(
          <COEModal
            coe={coeData}
            open={coeModalOpen}
            onClose={() => setCOEModalOpen(false)}
          />,
          document.body
        )}
        {coeModalOpen && coeLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-xl p-8">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="text-gray-700">Loading COE...</span>
              </div>
            </div>
          </div>
        )}
        {coeModalOpen && coeError && !coeLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-xl p-8">
              <div className="text-red-600 font-medium">{coeError}</div>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg" onClick={() => setCOEModalOpen(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrarEnrollment; 
