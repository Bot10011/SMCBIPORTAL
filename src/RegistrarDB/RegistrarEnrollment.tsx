import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Download, Printer, Eye, Users, BookOpen, CheckCircle2, Loader2, UserCheck, UserPlus } from 'lucide-react';

interface Student {
  id: string;
  student_id: string;
  display_name: string;        // Changed from first_name + last_name
  email: string;
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

interface COEData {
  date_issued: string;
  student_number?: string;
  student_id?: string;
  full_name?: string;
  school_year: string;
  semester: string;
  year_level?: string;
  department?: string;
  email?: string;
  subjects?: { code: string; name: string; units: number }[];
}

// COEModal for viewing Certificate of Enrollment
const COEModal = ({ coe, open, onClose }: { coe: COEData, open: boolean, onClose: () => void }) => {
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
              ...coe.subjects.map((subj: { code: string; name: string; units: number }) => [subj.code, subj.name, subj.units]),
              ["", "Total Units", coe.subjects.reduce((sum: number, subj: { units: number }) => sum + (Number(subj.units) || 0), 0)]
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
              ...coe.subjects.map((subj: { code: string; name: string; units: number }) => [subj.code, subj.name, subj.units]),
              ["", "Total Units", coe.subjects.reduce((sum: number, subj: { units: number }) => sum + (Number(subj.units) || 0), 0)]
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
        className="fixed inset-0 z-[99999] bg-black bg-opacity-60 backdrop-blur-sm"
        onClick={handleBackdropClick}
        style={{ 
          pointerEvents: 'auto',
          userSelect: 'none',
          touchAction: 'none'
        }}
      />
      
      {/* Modal container */}
      <div
        className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
        style={{ 
          minHeight: '100vh',
          pointerEvents: 'none'
        }}
      >
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl relative mx-4 flex flex-col overflow-y-auto"
          style={{ 
            maxHeight: '98vh', 
            boxSizing: 'border-box',
            pointerEvents: 'auto'
          }}>
          
          {/* Enhanced Close Button */}
          <button
            onClick={onClose}
            className="absolute w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-lg sm:text-xl font-bold text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 animate-pop-in hover:scale-110 hover:rotate-90 -top-2 -right-2 sm:-top-3 sm:-right-3 z-50"
            aria-label="Close"
            style={{backgroundColor: 'rgb(239, 68, 68)', boxShadow: 'rgba(239, 68, 68, 0.3) 0px 2px 8px'}}
          >
            ×
          </button>
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 p-4">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>

          {/* Header Section */}
          <div className="text-center py-4 px-6 border-b border-gray-100">
            <div className="flex flex-col items-center gap-2 mb-3">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center shadow-lg">
                <img 
                  src="/img/logo.png" 
                  alt="SMCBI Logo" 
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">SMCBI</h1>
                <p className="text-lg text-gray-600 font-medium">Certificate of Enrollment</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Date: {new Date(coe.date_issued).toLocaleDateString()}
            </div>
          </div>

          {/* Student Information Section */}
          <div className="p-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-white" />
                </div>
                Student Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Student ID</p>
                  <p className="text-sm font-bold text-gray-900 bg-white px-3 py-1.5 rounded-lg shadow-sm">{coe.student_number || coe.student_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full Name</p>
                  <p className="text-sm font-bold text-gray-900 bg-white px-3 py-1.5 rounded-lg shadow-sm">{coe.full_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">School Year</p>
                  <p className="text-sm font-bold text-gray-900 bg-white px-3 py-1.5 rounded-lg shadow-sm">{coe.school_year}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Semester</p>
                  <p className="text-sm font-bold text-gray-900 bg-white px-3 py-1.5 rounded-lg shadow-sm">{coe.semester}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Year Level</p>
                  <p className="text-sm font-bold text-gray-900 bg-white px-3 py-1.5 rounded-lg shadow-sm">{coe.year_level || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Department</p>
                  <p className="text-sm font-bold text-gray-900 bg-white px-3 py-1.5 rounded-lg shadow-sm">{coe.department || 'N/A'}</p>
                </div>
                <div className="space-y-1 md:col-span-2 lg:col-span-3">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">School Portal Email</p>
                  <p className="text-sm font-bold text-gray-900 bg-white px-3 py-1.5 rounded-lg shadow-sm">{coe.email || 'N/A'}</p>
                </div>
              </div>
            </div>
            {/* Enrolled Courses Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-600 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  Enrolled Courses
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course Code</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course Name</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Units</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {Array.isArray(coe.subjects) && coe.subjects.map((subject: { code: string; name: string; units: number }, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-blue-600">{subject.code}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{subject.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">{subject.units}</td>
                      </tr>
                    ))}
                    {/* Total Units Row */}
                    <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right font-bold text-base text-gray-900">Total Units</td>
                      <td className="px-4 py-2 font-bold text-base text-blue-600">{Array.isArray(coe.subjects) ? coe.subjects.reduce((sum: number, subj: { units: number }) => sum + (Number(subj.units) || 0), 0) : 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Status and Certification Section */}
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg mb-3">
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-lg font-bold">ENROLLED</span>
              </div>
              <p className="text-gray-600 text-sm max-w-2xl mx-auto leading-relaxed">
                This is to certify that the above-named student is officially enrolled in the above-mentioned program for the current academic year.
              </p>
            </div>

            {/* Registrar Signature Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-end">
                <div className="text-center">
                  <div className="w-24 h-12 border-b-2 border-gray-400 mb-1"></div>
                  <p className="font-semibold text-gray-900 text-base">Registrar</p>
                  <p className="text-xs text-gray-600">Signature over printed name</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>Date: {new Date(coe.date_issued).toLocaleDateString()}</p>
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
  const [coeData, setCOEData] = useState<COEData | null>(null);
  const [coeMap, setCOEMap] = useState<Record<string, COEData>>({});

  // Stats
  const totalStudents = students.length;
  const pendingStudents = students.filter(s => s.enrollment_status === 'pending').length;
  const enrolledStudents = students.filter(s => s.enrollment_status === 'enrolled').length;

  // Fetch students and courses on component mount
  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  // Fetch latest COE for all students after students are loaded
  useEffect(() => {
    const fetchAllCOEs = async () => {
      if (students.length === 0) return;
      const coeMapTemp: Record<string, COEData> = {};
      for (const student of students) {
        const { data, error } = await supabase
          .from('coe')
          .select('*')
          .eq('student_id', student.id)
          .order('date_issued', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) {
          coeMapTemp[student.id] = data[0] as COEData;
        }
      }
      setCOEMap(coeMapTemp);
    };
    fetchAllCOEs();
  }, [students]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          student_id,
          display_name,
          email,
          year_level,
          enrollment_status,
          department,
          semester,
          role
        `)
        .eq('role', 'student')
        .order('display_name', { ascending: true });

      if (error) throw error;
      
      // Log how many students were fetched
      console.log(`Fetched ${data?.length || 0} students from database`);
      
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
    } catch (err: unknown) {
      console.error('Error fetching courses:', err);
      toast.error('Failed to load courses');
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
    } catch (err: unknown) {
      console.error('Error fetching enrollments:', err);
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
      // Update the student's status to 'enrolled' and set course_id and year_level
      const mainCourseId = selectedCourses.length > 0 ? selectedCourses[0] : null;
      // Debug log to check payload values
      console.log({
        enrollment_status: 'enrolled',
        course_id: mainCourseId,
        year_level: selectedStudent.year_level,
        id: selectedStudent.id
      });
      // Build update payload with only existing fields
      const updatePayload: any = { enrollment_status: 'enrolled' };
      // Do NOT include course_id or year_level since they do not exist
      const { error } = await supabase
        .from('user_profiles')
        .update(updatePayload)
        .eq('id', selectedStudent.id);
      if (error) {
        console.error('Supabase update error:', error);
        toast.error(`Failed to update student: ${error.message || 'Unknown error'}`);
        return;
      }

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
        department: studentProfile.department || '',
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
    } catch (err: unknown) {
      setCOEError(err instanceof Error ? err.message : 'Failed to fetch COE.');
    } finally {
      setCOELoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    // Handle cases where display_name might be null/undefined
    const studentName = student.display_name || student.student_id || '';
    const studentId = student.student_id || '';
    
    const matchesSearch = 
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || student.enrollment_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen  from-blue-50 via-white to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-2xl mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Enrollment Approvals</h1>
                <p className="text-white/80 text-sm font-medium">Approve, enroll, and manage student registrations</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/80"></div>
              </div>
            </div>
            <button
              onClick={fetchStudents}
              className="bg-white/20 backdrop-blur-sm text-white px-6 py-2 rounded-lg shadow-sm hover:bg-white/30 transition-all duration-300 font-semibold flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4" />
              Refresh List
            </button>
          </div>
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
          <div className={`overflow-x-auto transition-all duration-300 ${showConfirmModal && selectedStudent ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
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
                      {student.display_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.year_level || ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.department || 'Not Enrolled'}</td>
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
              className="bg-white rounded-xl shadow-xl p-8 max-w-4xl w-full"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Confirm Enrollment
              </h2>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Student Information</h3>
                <div className="overflow-x-auto mb-2">
                  <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{selectedStudent.student_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{selectedStudent.last_name}, {selectedStudent.first_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{selectedStudent.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${selectedStudent.enrollment_status === 'enrolled' ? 'bg-green-100 text-green-800' : 
                              selectedStudent.enrollment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {selectedStudent.enrollment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="text-blue-600 font-semibold">Pending Approval</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
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
              </div>
            </motion.div>
          </div>
            
          )}

        {/* COE Modal */}
        {coeModalOpen && coeData && createPortal(
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
