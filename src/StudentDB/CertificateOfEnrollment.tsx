import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { FileText, Download, Printer, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentProfile {
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  year_level: string;
  program: {
    code: string;
    name: string;
    department: string;
  };
  email: string;
}

interface EnrolledCourse {
  id: string;
  course: {
    code: string;
    name: string;
    units: number;
  };
  section: string;
  schedule: string;
}

// Add html2pdf.js CDN if not present
if (typeof window !== 'undefined' && !(window as any).html2pdf) {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  script.async = true;
  document.body.appendChild(script);
}

// TypeScript: declare html2pdf on window
declare global {
  interface Window {
    html2pdf?: any;
  }
}

// Modal component for displaying the COE certificate
const COEModal = ({ coe, open, onClose }: { coe: any, open: boolean, onClose: () => void }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  if (!coe || !open) return null;

  // Download as PDF using jsPDF + autoTable function
  const handleDownload = () => {
    const doc = new jsPDF();
    
    // Add logo to PDF
    const logo = new Image();
    logo.src = '/img/logo.png';
    logo.onload = () => {
      doc.addImage(logo, 'PNG', 85, 15, 25, 25);
      
      // Header
      doc.setFontSize(18);
      doc.text('SMCBI', 105, 50, { align: 'center' });
      doc.setFontSize(14);
      doc.text('Certificate of Enrollment', 105, 60, { align: 'center' });
      doc.setFontSize(11);
      doc.text(`Date: ${new Date(coe.date_issued).toLocaleDateString()}`, 20, 70);
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
        head: [['Course Code', 'Course Name', 'Units']],
        body: Array.isArray(coe.subjects) ? [
          ...coe.subjects.map((subj: any) => [subj.code, subj.name, subj.units]),
          ["", "Total Units", coe.subjects.reduce((sum: number, subj: any) => sum + (Number(subj.units) || 0), 0)]
        ] : [],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 }
      });
      // Footer
      const finalY = (doc as any).lastAutoTable.finalY || y + 30;
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
      doc.addImage(logo, 'PNG', 85, 15, 25, 25);
      
      // Header
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
      doc.text(`Porgram: ${coe.department || 'N/A'}`, 120, y);
      y += 7;
      doc.text(`Email: ${coe.email || 'N/A'}`, 20, y);
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
  };

  // Close modal on outside click
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 w-full max-w-xl relative mx-4 flex flex-col"
          style={{ 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            boxSizing: 'border-box',
            pointerEvents: 'auto'
          }}
          ref={contentRef}
        >
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
                <p className="text-sm text-gray-500">Program</p>
                <p className="font-medium">{coe.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
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
        </motion.div>
      </div>
    </>
  );
};

export const CertificateOfEnrollment: React.FC = () => {
  const { user } = useAuth();
  const [coeList, setCOEList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCOE, setSelectedCOE] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Debug: log state changes
  useEffect(() => {
    console.log('selectedCOE:', selectedCOE, 'modalOpen:', modalOpen);
  }, [selectedCOE, modalOpen]);

  useEffect(() => {
    const fetchCOEs = async () => {
      try {
        if (user?.id) {
          const { data, error } = await supabase
            .from('coe')
            .select('*')
            .eq('student_id', user.id)
            .order('school_year', { ascending: false })
            .order('semester', { ascending: false });
          if (error) throw error;
          setCOEList(data || []);
        }
      } catch (error: any) {
        setErrorMsg(error?.message || JSON.stringify(error));
        console.error('Error fetching COEs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCOEs();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (errorMsg) {
    return <div className="text-red-600 text-center mt-8">Error: {errorMsg}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="p-4 sm:p-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Certificate of Enrollment
        </h2>
        <p className="mt-1 text-sm text-gray-600">View and download your Certificate of Enrollment. Click "View" to see details.</p>
      </div>
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">COE History</h3>
        {coeList.length === 0 ? (
          <div className="text-center text-gray-500">No Certificate of Enrollment records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School Year</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Issued</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coeList.map((coe, idx) => (
                  <tr key={coe.id || idx}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{coe.school_year}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{coe.semester}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{new Date(coe.date_issued).toLocaleDateString()}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        onClick={() => { 
                          console.log('View button clicked', coe);
                          setSelectedCOE(coe); 
                          setModalOpen(true); 
                        }}
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Only render the portal when modalOpen and selectedCOE are true */}
      {modalOpen && selectedCOE &&
        createPortal(
          <COEModal coe={selectedCOE} open={modalOpen} onClose={() => setModalOpen(false)} />, 
          document.body
        )
      }
    </div>
  );
}; 
