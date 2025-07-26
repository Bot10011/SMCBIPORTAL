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
  subjects?: { code: string; name: string; units: number }[];
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
      doc.addImage(logo, 'PNG', 85, 15, 25, 25);
      
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
        head: [['Course Code', 'Course Name', 'Units']],
        body: Array.isArray(coe.subjects) ? [
          ...coe.subjects.map((subj) => [subj.code, subj.name, subj.units]),
          ["", "Total Units", coe.subjects.reduce((sum, subj) => sum + (Number(subj.units) || 0), 0)]
        ] : [],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 }
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
      doc.addImage(logo, 'PNG', 85, 15, 25, 25);
      
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
      doc.text(`Porgram: ${coe.department || 'N/A'}`, 120, y);
      y += 7;
      doc.text(`Email: ${coe.email || 'N/A'}`, 20, y);
      autoTable(doc, {
        startY: y + 10,
        head: [['Course Code', 'Course Name', 'Units']],
        body: Array.isArray(coe.subjects) ? [
          ...coe.subjects.map((subj) => [subj.code, subj.name, subj.units]),
          ["", "Total Units", coe.subjects.reduce((sum, subj) => sum + (Number(subj.units) || 0), 0)]
        ] : [],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 }
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
          className="coe-modal bg-white rounded-2xl shadow-xl p-8 border border-gray-100 w-full max-w-xl relative mx-4 flex flex-col"
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
            <p className="text-gray-500">Date: {coe.date_issued ? new Date(coe.date_issued).toLocaleDateString() : 'N/A'}</p>
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
              <div className="rounded-xl border border-gray-200 overflow-hidden w-full shadow-sm">
                <table className="coe-certificate-table min-w-full bg-white">
                  <thead>
                    <tr className="bg-blue-600 rounded-t-xl">
                      <th className="px-4 py-2 text-left text-xs font-bold text-white rounded-tl-xl">Course Code</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-white">Course Name</th>
                      <th className="px-4 py-2 text-left text-xs font-bold text-white rounded-tr-xl">Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(coe.subjects) && coe.subjects.map((subject, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{subject.code}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{subject.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{subject.units}</td>
                      </tr>
                    ))}
                    {/* Total Units Row */}
                    <tr>
                      <td></td>
                      <td className="px-4 py-2 text-right text-sm text-gray-900">Total Units</td>
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
          const { data, error } = await supabase
            .from('coe')
            .select('*')
            .eq('student_id', user.id)
            .order('school_year', { ascending: false })
            .order('semester', { ascending: false });
          if (error) throw error;
          setCOEList(data || []);
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
      totalUnits: Array.isArray(coe.subjects) ? coe.subjects.reduce((sum, subj) => sum + (Number(subj.units) || 0), 0) : 0
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
    <div className="min-h-screen bg-gradient-to-br  to-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Premium Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-inner shadow-inner-strong border border-blue-100 mb-12"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Certificate of Enrollment</h1>
                  <p className="text-white/80 text-sm font-medium">View, download, and print your official Certificate of Enrollment</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 w-full">
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
                  {processedCOEList.map((coe, idx) => (
                    <tr key={coe.id || idx} className="coe-table-row hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{coe.school_year}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{coe.semester}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{coe.formattedDate}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <button
                          className="coe-view-button inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
