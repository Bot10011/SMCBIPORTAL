import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { FileText, Download, Printer, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Add html2pdf.js CDN if not present
if (typeof window !== 'undefined' && !(window as unknown as { html2pdf?: unknown }).html2pdf) {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  script.async = true;
  document.body.appendChild(script);
}

// TypeScript: declare html2pdf on window
declare global {
  interface Window {
    html2pdf?: unknown;
  }
}

// Type for a COE record
type COERecord = {
  id?: string;
  student_number?: string;
  student_id?: string;
  full_name?: string;
  school_year?: string;
  semester?: string;
  year_level?: string;
  department?: string;
  email?: string;
  date_issued?: string;
  subjects?: { code: string; name: string; units: number; instructor?: string; section?: string }[];
};

// Modal component for displaying the COE certificate
const COEModal = ({ coe, open, onClose }: { coe: COERecord, open: boolean, onClose: () => void }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!coe || !open) return null;

  // Download as PDF using jsPDF + autoTable function
  const handleDownload = () => {
    const doc = new jsPDF();
    
    // Add logo to PDF
    const logo = new Image();
    logo.src = '/img/logo.png';
    logo.onload = () => {
      // Center the logo: (page width - logo width) / 2 = (210 - 25) / 2 = 92.5
      doc.addImage(logo, 'PNG', 92.5, 15, 25, 25);
      
      // Header
      doc.setFontSize(18);
      doc.text('SMCBI', 105, 50, { align: 'center' });
      doc.setFontSize(14);
      doc.text('Certificate of Enrollment', 105, 60, { align: 'center' });
      doc.setFontSize(11);
      doc.text(`Date: ${coe.date_issued ? new Date(coe.date_issued).toLocaleDateString() : 'N/A'}`, 20, 70);
      // Student Info
      let y = 80;
      doc.text(`Student ID: ${coe.student_number || coe.student_id}`, 20, y);
      doc.text(`Full Name: ${coe.full_name || 'N/A'}`, 120, y);
      y += 7;
      doc.text(`School Year: ${coe.school_year}`, 20, y);
      doc.text(`Semester: ${coe.semester}`, 120, y);
      y += 7;
      doc.text(`Year Level: ${coe.year_level || 'N/A'}`, 20, y);
      doc.text(`Program: ${coe.department || 'N/A'}`, 120, y);
      y += 7;
      doc.text(`Email: ${coe.email || 'N/A'}`, 20, y);
      // Table of courses
      autoTable(doc, {
        startY: y + 10,
        head: [['Course Code', 'Course Name', 'Section', 'Instructor', 'Units']],
        body: Array.isArray(coe.subjects) ? [
          ...coe.subjects.map((subj) => [subj.code, subj.name, subj.section || 'N/A', subj.instructor || 'N/A', subj.units]),
          ["", "Total Units", "", "", coe.subjects.reduce((sum, subj) => sum + (Number(subj.units) || 0), 0)]
        ] : [],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 }
      });
      // Footer
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 30;
      doc.setFontSize(12);
      doc.text('ENROLLED', 105, finalY + 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text('This is to certify that the above-named student is officially enrolled in the above-mentioned program for the current academic year.', 105, finalY + 22, { align: 'center', maxWidth: 170 });
      // Registrar
      doc.text('Registrar', 20, finalY + 38);
      doc.text('Signature over printed name', 20, finalY + 45);
      // Save
      doc.save(`COE-${coe.school_year}-${coe.semester}.pdf`);
    };
  };

  // Print handler
  const handlePrint = () => {
    const doc = new jsPDF();
    
    // Add logo to PDF
    const logo = new Image();
    logo.src = '/img/logo.png';
    logo.onload = () => {
      // Center the logo: (page width - logo width) / 2 = (210 - 25) / 2 = 92.5
      doc.addImage(logo, 'PNG', 92.5, 15, 25, 25);
      
      // Header
      doc.setFontSize(18);
      doc.text('SMCBI', 105, 50, { align: 'center' });
      doc.setFontSize(14);
      doc.text('Certificate of Enrollment', 105, 60, { align: 'center' });
      doc.setFontSize(11);
      doc.text(`Date: ${coe.date_issued ? new Date(coe.date_issued).toLocaleDateString() : 'N/A'}`, 20, 70);
      let y = 80;
      doc.text(`Student ID: ${coe.student_number || coe.student_id}`, 20, y);
      doc.text(`Full Name: ${coe.full_name || 'N/A'}`, 120, y);
      y += 7;
      doc.text(`School Year: ${coe.school_year}`, 20, y);
      doc.text(`Semester: ${coe.semester}`, 120, y);
      y += 7;
      doc.text(`Year Level: ${coe.year_level || 'N/A'}`, 20, y);
      doc.text(`Program: ${coe.department || 'N/A'}`, 120, y);
      y += 7;
      doc.text(`Email: ${coe.email || 'N/A'}`, 20, y);
      autoTable(doc, {
        startY: y + 10,
        head: [['Course Code', 'Course Name', 'Section', 'Instructor', 'Units']],
        body: Array.isArray(coe.subjects) ? [
          ...coe.subjects.map((subj) => [subj.code, subj.name, subj.section || 'N/A', subj.instructor || 'N/A', subj.units]),
          ["", "Total Units", "", "", coe.subjects.reduce((sum, subj) => sum + (Number(subj.units) || 0), 0)]
        ] : [],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 }
      });
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || y + 30;
      doc.setFontSize(12);
      doc.text('ENROLLED', 105, finalY + 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text('This is to certify that the above-named student is officially enrolled in the above-mentioned program for the current academic year.', 105, finalY + 22, { align: 'center', maxWidth: 170 });
      doc.text('Registrar', 20, finalY + 38);
      doc.text('Signature over printed name', 20, finalY + 45);
      doc.autoPrint();
      doc.output('dataurlnewwindow');
    };
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Full screen overlay with click handler */}
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
        className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        style={{ 
          minHeight: '100vh',
          pointerEvents: 'auto'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="coe-modal bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-4xl relative mx-4 flex flex-col"
          style={{ 
            maxHeight: '90vh', 
            boxSizing: 'border-box',
            pointerEvents: 'auto'
          }}
          ref={contentRef}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Global Close Button pinned to top-right */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-6 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors z-20"
            aria-label="Close"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>
          {/* Sticky Header with Action Buttons */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl z-10">
            {/* Desktop/Tablet layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="/img/logo.png" 
                  alt="SMCBI Logo" 
                  className="w-8 h-8 object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">SMCBI</h1>
                  <p className="text-sm text-gray-600">Certificate of Enrollment</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mr-12">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
              </div>
            </div>

            {/* Mobile layout: logo, titles stacked, then actions below */}
            <div className="sm:hidden">
              <div className="flex flex-col items-center text-center gap-2">
                <img 
                  src="/img/logo.png" 
                  alt="SMCBI Logo" 
                  className="w-12 h-12 object-contain"
                />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">SMCBI</h1>
                  <p className="text-sm text-gray-600 -mt-0.5">Certificate of Enrollment</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm text-sm"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Two-column on mobile for compact info; unchanged on desktop */}
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p className="text-sm text-gray-500">Student ID</p>
                  <p className="font-medium break-all">{coe.student_number || coe.student_id}</p>
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
                  <p className="text-sm text-gray-500">Program</p>
                  <p className="font-medium">{coe.department || 'N/A'}</p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium break-all">{coe.email || 'N/A'}</p>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrolled Courses</h3>
                {/* Mobile: enable horizontal scroll so all columns remain visible */}
                <div className="rounded-xl border border-gray-200 w-full shadow-sm overflow-x-auto sm:overflow-visible">
                  <table className="coe-certificate-table min-w-[700px] sm:min-w-full bg-white/90">
                    <thead>
                      <tr className="bg-blue-600 rounded-t-xl">
                        <th className="px-4 py-2 text-left text-xs font-bold text-white rounded-tl-xl">Course Code</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-white">Course Name</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-white">Section</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-white">Instructor</th>
                        <th className="px-4 py-2 text-left text-xs font-bold text-white rounded-tr-xl">Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(coe.subjects) && coe.subjects.map((subject, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">{subject.code}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{subject.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{subject.section || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{subject.instructor || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{subject.units}</td>
                        </tr>
                      ))}
                      {/* Total Units Row */}
                      <tr>
                        <td></td>
                        <td className="px-4 py-2 text-right text-sm text-gray-900">Total Units</td>
                        <td></td>
                        <td></td>
                        <td className="px-4 py-2 font-bold text-gray-900">{Array.isArray(coe.subjects) ? coe.subjects.reduce((sum, subj) => sum + (Number(subj.units) || 0), 0) : 0}</td>
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
        </motion.div>
      </div>
    </>
  );
};

export const CertificateOfEnrollment: React.FC = () => {
  const { user } = useAuth();
  const [coeList, setCOEList] = useState<COERecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCOE, setSelectedCOE] = useState<COERecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchCOEs = async () => {
      try {
        if (user?.id) {
          // First, get the student's profile to get their section information
          const { data: studentProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('section, year_level, department')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error fetching student profile:', profileError);
          }

          // Fetch COE records
          const { data: coeData, error: coeError } = await supabase
            .from('coe')
            .select('*')
            .eq('student_id', user.id)
            .order('school_year', { ascending: false })
            .order('semester', { ascending: false });
          
          if (coeError) throw coeError;
          
          if (coeData && coeData.length > 0) {
            // Fetch sections data to map UIDs to names
            const { data: sectionsData, error: sectionsError } = await supabase
              .from('sections')
              .select('id, name');
            
            if (sectionsError) {
              console.error('Error fetching sections:', sectionsError);
            }

            // Create a map of section UIDs to section names
            const sectionMap = new Map<string, string>();
            if (sectionsData) {
              sectionsData.forEach(section => {
                sectionMap.set(section.id, section.name);
              });
            }

            // Get the student's section name
            const studentSectionName = studentProfile?.section && sectionMap.has(studentProfile.section) 
              ? sectionMap.get(studentProfile.section) 
              : studentProfile?.section || 'A';

            // Debug: Let's see what teacher assignments exist in the database
            const { data: allTeacherAssignments, error: allAssignmentsError } = await supabase
              .from('teacher_subjects')
              .select(`
                id,
                teacher_id,
                subject_id,
                section,
                academic_year,
                semester,
                year_level,
                is_active,
                teacher:user_profiles!teacher_subjects_teacher_id_fkey(
                  first_name,
                  last_name,
                  middle_name
                ),
                subject:courses!teacher_subjects_subject_id_fkey(
                  code,
                  name
                )
              `)
              .eq('is_active', true)
              .limit(10);

            console.log('Sample teacher assignments in database:', allTeacherAssignments, 'Error:', allAssignmentsError);

            // Fetch instructor assignments for each COE
            const enrichedCOEs = await Promise.all(
              coeData.map(async (coe) => {
                if (coe.subjects && Array.isArray(coe.subjects)) {
                  // For each subject, find the instructor assignment
                  type SubjectRow = { code: string; name: string; units: number; instructor?: string; section?: string };
                  const enrichedSubjects = await Promise.all(
                    (coe.subjects as SubjectRow[]).map(async (subject: SubjectRow) => {
                      try {
                        // Resolve subject code to the actual course UUID used in teacher_subjects.subject_id
                        let courseId: string | null = null;
                        try {
                          const { data: courseRow, error: courseErr } = await supabase
                            .from('courses')
                            .select('id, code, name')
                            .eq('code', subject.code)
                            .single();
                          if (!courseErr && courseRow?.id) {
                            courseId = courseRow.id as string;
                            console.log('Found course for code:', subject.code, 'ID:', courseId, 'Name:', courseRow.name);
                          } else {
                            console.warn('Course not found for code:', subject.code, 'Error:', courseErr);
                          }
                        } catch (err) {
                          console.warn('Could not find course for code:', subject.code, err);
                        }

                        // Debug: Log the query parameters
                        console.log('Querying for instructor assignment:', {
                          subjectCode: subject.code,
                          courseId: courseId,
                          schoolYear: coe.school_year,
                          semester: coe.semester,
                          yearLevel: coe.year_level
                        });

                        // Find the teacher assignment for this subject using proper joins
                        // First try with all filters
                        let { data: assignmentData, error: assignmentError } = await supabase
                          .from('teacher_subjects')
                          .select(`
                            teacher_id,
                            section,
                            academic_year,
                            semester,
                            year_level,
                            teacher:user_profiles!teacher_subjects_teacher_id_fkey(
                              first_name,
                              last_name,
                              middle_name
                            )
                          `)
                          .eq('subject_id', courseId || subject.code)
                          .eq('academic_year', coe.school_year)
                          .eq('semester', coe.semester)
                          .eq('year_level', coe.year_level)
                          .eq('is_active', true)
                          .maybeSingle();

                        // If no exact match, try without year_level filter (in case it's not in the schema)
                        if (!assignmentData && !assignmentError) {
                          console.log('No exact match found, trying without year_level filter');
                          const { data: assignmentData2, error: assignmentError2 } = await supabase
                            .from('teacher_subjects')
                            .select(`
                              teacher_id,
                              section,
                              academic_year,
                              semester,
                              year_level,
                              teacher:user_profiles!teacher_subjects_teacher_id_fkey(
                                first_name,
                                last_name,
                                middle_name
                              )
                            `)
                            .eq('subject_id', courseId || subject.code)
                            .eq('academic_year', coe.school_year)
                            .eq('semester', coe.semester)
                            .eq('is_active', true)
                            .maybeSingle();
                          
                          assignmentData = assignmentData2;
                          assignmentError = assignmentError2;
                        }

                        // If still no match, try with just subject_id and is_active
                        if (!assignmentData && !assignmentError) {
                          console.log('No academic year/semester match, trying with just subject_id');
                          const { data: assignmentData3, error: assignmentError3 } = await supabase
                            .from('teacher_subjects')
                            .select(`
                              teacher_id,
                              section,
                              academic_year,
                              semester,
                              year_level,
                              teacher:user_profiles!teacher_subjects_teacher_id_fkey(
                                first_name,
                                last_name,
                                middle_name
                              )
                            `)
                            .eq('subject_id', courseId || subject.code)
                            .eq('is_active', true)
                            .limit(1)
                            .maybeSingle();
                          
                          assignmentData = assignmentData3;
                          assignmentError = assignmentError3;
                        }

                        console.log('Assignment query for subject:', subject.code, 'result:', assignmentData, 'error:', assignmentError);

                        if (!assignmentError && assignmentData) {
                          const teacher = assignmentData.teacher as { first_name?: string | null; middle_name?: string | null; last_name?: string | null } | null | undefined;
                          const instructorName = teacher 
                            ? `${teacher.first_name || ''} ${teacher.middle_name ? teacher.middle_name + ' ' : ''}${teacher.last_name || ''}`.trim() || 'TBA'
                            : 'TBA';
                          
                          return {
                            ...subject,
                            instructor: instructorName,
                            section: assignmentData.section || studentSectionName
                          };
                        }

                        // If still no assignment found, let's see what assignments exist for this course
                        if (!assignmentData) {
                          const { data: allAssignments, error: allAssignmentsError } = await supabase
                            .from('teacher_subjects')
                            .select(`
                              teacher_id,
                              section,
                              academic_year,
                              semester,
                              year_level,
                              is_active,
                              teacher:user_profiles!teacher_subjects_teacher_id_fkey(
                                first_name,
                                last_name,
                                middle_name
                              )
                            `)
                            .eq('subject_id', courseId || subject.code)
                            .eq('is_active', true);

                          console.log('All assignments for course:', subject.code, 'result:', allAssignments, 'error:', allAssignmentsError);
                        }

                        return {
                          ...subject,
                          instructor: 'TBA',
                          section: studentSectionName
                        };
                      } catch (err) {
                        console.warn('Could not find instructor for subject:', subject.code, err);
                        return {
                          ...subject,
                          instructor: 'TBA',
                          section: studentSectionName
                        };
                      }
                    })
                  );

                  return {
                    ...coe,
                    subjects: enrichedSubjects
                  };
                }
                return coe;
              })
            );

            setCOEList(enrichedCOEs);
          } else {
            setCOEList([]);
          }
        }
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : JSON.stringify(error));
        console.error('Error fetching COEs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCOEs();
  }, [user?.id]);

  // Memoized data processing
  const processedCOEList = useMemo(() => {
    return coeList.map(coe => ({
      ...coe,
      formattedDate: coe.date_issued ? new Date(coe.date_issued).toLocaleDateString() : 'N/A',
      totalUnits: Array.isArray(coe.subjects) ? coe.subjects.reduce((sum, subj) => sum + (Number(subj.units) || 0), 0) : 0,
      // Ensure subjects have instructor and section information
      subjects: Array.isArray(coe.subjects) ? coe.subjects.map(subj => ({
        ...subj,
        instructor: subj.instructor || 'TBA',
        section: subj.section || 'A'
      })) : []
    }));
  }, [coeList]);

  // Memoized handlers
  const handleViewCOE = useCallback((coe: COERecord) => {
    setSelectedCOE(coe);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedCOE(null);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br to-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Header Skeleton */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-inner shadow-inner-strong border border-blue-100 mb-12">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                    <div className="w-6 h-6 bg-white/30 rounded animate-pulse"></div>
                  </div>
                  <div>
                    <div className="h-8 w-48 bg-white/20 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-white/20 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Content Skeleton */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 w-full">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-6"></div>
            <div className="space-y-4">
              {/* Table Header Skeleton */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
              {/* Table Rows Skeleton */}
              {[1, 2, 3].map(i => (
                <div key={i} className="grid grid-cols-4 gap-4 py-3 border-b border-gray-100">
                  <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-8 w-16 bg-blue-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return <div className="text-red-600 text-center mt-8">Error: {errorMsg}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br to-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Premium Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl mb-12"
          style={{
            backgroundColor: '#00171f',
            boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.4), -8px -8px 16px rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease'
          }}
        >
          <div className="px-6 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-2xl"
                  style={{
                    backgroundColor: '#00171f',
                    boxShadow: '4px 4px 8px rgba(0, 0, 0, 0.3), -4px -4px 8px rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Certificate of Enrollment</h1>
                  <p className="text-gray-300 text-sm font-medium">View, download, and print your official Certificate of Enrollment</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        <div 
          className="rounded-2xl p-6 w-full"
          style={{
            backgroundColor: '#FFFFFFE6',
            boxShadow: '8px 8px 16px rgba(0, 0, 0, 0.22), -8px -8px 16px rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">COE History</h3>
          {coeList.length === 0 ? (
            <div className="text-center text-gray-500">No Certificate of Enrollment records found.</div>
          ) : (
            <>
              {/* Mobile list - no horizontal scroll */}
              <div className="sm:hidden space-y-3">
                {processedCOEList.map((coe, idx) => (
                  <div 
                    key={coe.id || idx} 
                    className="rounded-xl p-4"
                    style={{
                      backgroundColor: '#FFFFFFE6',
                      boxShadow: '6px 6px 12px rgba(0, 0, 0, 0.15), -6px -6px 12px rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-gray-900">{coe.school_year}</div>
                      <button
                        className="coe-view-button inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
                        onClick={() => handleViewCOE(coe)}
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </div>
                    <div className="text-xs text-gray-600">Semester: <span className="font-medium text-gray-800">{coe.semester}</span></div>
                    <div className="text-xs text-gray-600">Year Level: <span className="font-medium text-gray-800">{coe.year_level || 'N/A'}</span></div>
                    <div className="text-xs text-gray-600">Issued: <span className="font-medium text-gray-800">{coe.formattedDate}</span></div>
                  </div>
                ))}
              </div>

              {/* Desktop/tablet table */}
              <div className="hidden sm:block">
                <div 
                  className="overflow-x-auto rounded-xl"
                  style={{
                    backgroundColor: '#FFFFFFE6',
                    boxShadow: '6px 6px 12px rgba(0, 0, 0, 0.15), -6px -6px 12px rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School Year</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year Level</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Issued</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white/60 divide-y divide-gray-200">
                      {processedCOEList.map((coe, idx) => (
                        <tr key={coe.id || idx} className="coe-table-row hover:bg-gray-50/80 transition-colors duration-200">
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{coe.school_year}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{coe.semester}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{coe.year_level || 'N/A'}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{coe.formattedDate}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <button
                              className="coe-view-button inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
                              onClick={() => handleViewCOE(coe)}
                            >
                              <Eye className="w-4 h-4" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Only render the portal when modalOpen and selectedCOE are true */}
        {modalOpen && selectedCOE &&
          createPortal(
            <COEModal coe={selectedCOE} open={modalOpen} onClose={handleCloseModal} />, 
            document.body
          )
        }
      </div>
    </div>
  );
}; 
