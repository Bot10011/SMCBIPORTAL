import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Prospectus.css';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Types for data shapes returned by Supabase

type CourseRow = {
  id?: string;
  units?: number;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  summer?: boolean | null;
  code?: string;
  name?: string;
  semester?: string | null;
  image_url?: string | null;
  year_level?: string | null;
};

const Prospectus: React.FC = () => {
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [subjects, setSubjects] = useState<Array<{
    school_year: string;
    semester: string;
    subject: {
      id: string;
      code: string;
      name: string;
      units: number;
      year_level: string;
      prerequisite?: string;
    };
  }>>([]);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);







  const groupedSubjects = useMemo(() => {
    if (!subjects.length) return {};
    
    const grouped: Record<string, Record<string, Array<{
      id: string;
      code: string;
      name: string;
      units: number;
      year_level: string;
      prerequisite?: string;
    }>>> = {};
    for (const enrollment of subjects) {
      const year = enrollment.school_year || 'Unknown Year';
      const sem = enrollment.semester || 'Unknown Semester';
      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][sem]) grouped[year][sem] = [];
      grouped[year][sem].push(enrollment.subject);
    }
    return grouped;
  }, [subjects]);

  const downloadAsPDF = useCallback(async () => {
    setIsDownloading(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Download front side
      if (frontCardRef.current) {
        const docEl = frontCardRef.current.querySelector('.prospectus-document') as HTMLDivElement;
        const prevStyle = setDocumentFullHeight(docEl);
        applyDownloadMode(docEl);
        
        // Wait for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = await html2canvas(docEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#2c3e50',
          logging: false,
          removeContainer: true,
          width: docEl.scrollWidth,
          height: docEl.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          windowWidth: docEl.scrollWidth,
          windowHeight: docEl.scrollHeight
        });
        
        restoreDocumentStyle(docEl, prevStyle);
        removeDownloadMode(docEl);
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Add new page for back side
        if (backCardRef.current) {
          const docEl2 = backCardRef.current.querySelector('.prospectus-document') as HTMLDivElement;
          const prevStyle2 = setDocumentFullHeight(docEl2);
          applyDownloadMode(docEl2);
          
          // Wait for styles to apply
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const canvas2 = await html2canvas(docEl2, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#2c3e50',
            logging: false,
            removeContainer: true,
            width: docEl2.scrollWidth,
            height: docEl2.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: docEl2.scrollWidth,
            windowHeight: docEl2.scrollHeight
          });
          
          restoreDocumentStyle(docEl2, prevStyle2);
          removeDownloadMode(docEl2);
          
          const imgData2 = canvas2.toDataURL('image/png');
          const imgHeight2 = (canvas2.height * imgWidth) / canvas2.width;
          pdf.addPage();
          pdf.addImage(imgData2, 'PNG', 0, 0, imgWidth, imgHeight2);
        }
        
        pdf.save('BSIT-Prospectus-2020-2021.pdf');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [frontCardRef, backCardRef]);

  const downloadAsImage = useCallback(async () => {
    setIsDownloading(true);
    try {
      if (frontCardRef.current) {
        const docEl = frontCardRef.current.querySelector('.prospectus-document') as HTMLDivElement;
        const prevStyle = setDocumentFullHeight(docEl);
        applyDownloadMode(docEl);
        
        // Wait for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = await html2canvas(docEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#2c3e50',
          width: docEl.scrollWidth,
          height: docEl.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          windowWidth: docEl.scrollWidth,
          windowHeight: docEl.scrollHeight
        });
        
        restoreDocumentStyle(docEl, prevStyle);
        removeDownloadMode(docEl);
        
        const link = document.createElement('a');
        link.download = 'BSIT-Prospectus-Page1.png';
        link.href = canvas.toDataURL();
        link.click();
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to download image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [frontCardRef]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!user?.id) return;
      try {
        // Always fetch full course list from `courses` table and map to existing structure
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, units, created_by, created_at, updated_at, summer, code, name, semester, image_url, year_level');

        if (courseError) {
          console.error('Error fetching courses:', courseError);
          return;
        }

        if (Array.isArray(courseData)) {
          const transformedCourses = (courseData as CourseRow[]).map((course) => ({
            school_year: normalizeYear(course.year_level || ''),
            semester: normalizeSemester(course?.summer ? 'SUMMER REQUIRED' : (course?.semester || '')),
            subject: {
              id: course?.id || '',
              code: course?.code || '',
              name: course?.name || '',
              units: course?.units || 0,
              year_level: course?.year_level || '',
              prerequisite: undefined
            }
          }));
          setSubjects(transformedCourses);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };
    
    const timeoutId = setTimeout(fetchSubjects, 100);
    return () => clearTimeout(timeoutId);
  }, [user?.id]);

  const setDocumentFullHeight = (doc: HTMLDivElement | null) => {
    if (!doc) return { height: '', maxHeight: '', overflowY: '' };
    const prev = {
      height: doc.style.height,
      maxHeight: doc.style.maxHeight,
      overflowY: doc.style.overflowY,
    };
    doc.style.height = 'auto';
    doc.style.maxHeight = 'none';
    doc.style.overflowY = 'visible';
    return prev;
  };

  const restoreDocumentStyle = (doc: HTMLDivElement | null, prev: { height: string, maxHeight: string, overflowY: string }) => {
    if (!doc) return;
    doc.style.height = prev.height;
    doc.style.maxHeight = prev.maxHeight;
    doc.style.overflowY = prev.overflowY;
  };

  const applyDownloadMode = (doc: HTMLDivElement | null) => {
    if (!doc) return;
    doc.classList.add('download-mode');
  };

  const removeDownloadMode = (doc: HTMLDivElement | null) => {
    if (!doc) return;
    doc.classList.remove('download-mode');
  };

  const hasData = useMemo(() => Object.keys(groupedSubjects).length > 0, [groupedSubjects]);

  // Helpers to map data into fixed year-header sections
  type SubjectEntry = {
    school_year: string;
    semester: string;
    subject: {
      id: string;
      code: string;
      name: string;
      units: number;
      year_level: string;
      prerequisite?: string;
    };
  };

  const normalizeYear = (value?: string | null): string => {
    const v = (value || '').toString().trim().toUpperCase();
    if (!v) return '';
    if (v.includes('FIRST') || v === '1' || v === '1ST' || v.includes('YEAR 1') || v.includes('1ST YEAR')) return 'FIRST YEAR';
    if (v.includes('SECOND') || v === '2' || v === '2ND' || v.includes('YEAR 2') || v.includes('2ND YEAR')) return 'SECOND YEAR';
    if (v.includes('THIRD') || v === '3' || v === '3RD' || v.includes('YEAR 3') || v.includes('3RD YEAR')) return 'THIRD YEAR';
    if (v.includes('FOURTH') || v === '4' || v === '4TH' || v.includes('YEAR 4') || v.includes('4TH YEAR')) return 'FOURTH YEAR';
    return v;
  };

  const normalizeSemester = (value?: string | null): string => {
    const v = (value || '').toString().trim().toUpperCase();
    if (!v) return '';
    if (v.includes('SUMMER')) return 'SUMMER REQUIRED';
    if (v.includes('FIRST') || v === '1' || v === '1ST') return 'FIRST SEMESTER';
    if (v.includes('SECOND') || v === '2' || v === '2ND') return 'SECOND SEMESTER';
    return v;
  };

  const getSectionItems = useCallback((yearTitle: string, semesterTitle: string) => {
    const desiredYear = (yearTitle || '').toUpperCase();
    const desiredSem = (semesterTitle || '').toUpperCase();
    const isSummerSection = desiredSem === 'SUMMER REQUIRED';
    const isFirstSemSection = desiredSem === 'FIRST SEMESTER';
    const isSecondSemSection = desiredSem === 'SECOND SEMESTER';

    return subjects.filter((item: SubjectEntry) => {
      const itemYear = normalizeYear(item.school_year);
      const itemSem = normalizeSemester(item.semester);

      if (isSummerSection) {
        return itemSem === 'SUMMER REQUIRED';
      }

      if (isFirstSemSection) {
        return itemYear === desiredYear && itemSem === 'FIRST SEMESTER';
      }

      if (isSecondSemSection) {
        return itemYear === desiredYear && itemSem === 'SECOND SEMESTER';
      }

      return itemYear === desiredYear && itemSem === desiredSem;
    });
  }, [subjects]);

  const renderRowsForSection = useCallback((items: SubjectEntry[]) => {
    if (!items.length) {
      return (
        <tr>
          <td colSpan={8} className="text-center text-gray-500 italic">
            No enrolled subjects found for this semester
          </td>
        </tr>
      );
    }
    return items.map((entry) => (
      <tr key={entry.subject.id}>
        <td></td>
        <td>{entry.subject.code}</td>
        <td>{entry.subject.name}</td>
        <td>{Math.floor(entry.subject.units * 0.7)}</td>
        <td>{Math.floor(entry.subject.units * 0.3)}</td>
        <td>{entry.subject.units}</td>
        <td>{entry.subject.prerequisite || 'None'}</td>
        <td>{entry.subject.units}</td>
      </tr>
    ));
  }, []);



  return (
    <div className="min-h-screen bg-gradient-to-br via-white to-blue-50">
      {/* Premium Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white  border border-blue-100"
      >
      <div className="mb-8 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50  border border-blue-100 w-full">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 py-4 min-h-[110px] flex items-center w-full">
            <div className="flex items-center gap-4 w-full justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0A9 9 0 11 3 12a9 9 0 0118 0z" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">Academic Prospectus</h1>
                  <p className="text-white/80 text-xs sm:text-sm font-medium leading-tight">Bachelor of Science in Information Technology (BSIT)</p>
                </div>
              </div>
              {/* Download buttons - hidden on mobile phones, visible on tablet and desktop */}
              <div className="hidden lg:flex gap-2 flex-shrink-0">
                <button 
                  onClick={downloadAsPDF}
                  disabled={isDownloading}
                  className="prospectus-download-button px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-inner flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                </button>
                <button 
                  onClick={downloadAsImage}
                  disabled={isDownloading}
                  className="prospectus-download-button px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-inner flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {isDownloading ? 'Generating Image...' : 'Download Image'}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </div>
      </motion.div>
      
            {/* Mobile Message */}
      <div className="lg:hidden bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 mx-4">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="text-yellow-800 font-semibold">Mobile View Notice</h3>
            <p className="text-yellow-700 text-sm">The prospectus is designed for desktop viewing. Please download the PDF for the best experience on mobile devices.</p>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Front Page (Left) */}
          <div className="prospectus-page" ref={frontCardRef}>
            <div className="prospectus-document">
              <div className="page-indicator">FRONT PAGE</div>
              {/* Header Section */}
              <div className="document-header">
                <div className="header-content">
                  <div className="logo-section">
                    <div className="logo-seal">
                      <img src="/img/logo.png" alt="St. Mary's College Logo" className="logo-image" />
                    </div>
                  </div>
                  <div className="institution-info">
                    <h2>St. Mary's College of Bansalan, Inc.</h2>
                    <p className="former-name">(Formerly: Holy Cross of Bansalan College, Inc.)</p>
                    <p className="address">Dahlia Street, Poblacion Uno, Bansalan, Davao del Sur, 8005 Philippines</p>
                    <h3>Bachelor of Science in Information Technology (BSIT)</h3>
                    <p className="effective-date">Effective SY 2020 - 2021</p>
                  </div>
                </div>
              </div>
              
              {/* Fixed Front Page Sections (populate based on headers) */}
              <div>
                  <h4 className="year-header"><strong>FIRST YEAR - FIRST SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>SUBJECT</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRowsForSection(getSectionItems('FIRST YEAR', 'FIRST SEMESTER'))}
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>{getSectionItems('FIRST YEAR', 'FIRST SEMESTER').reduce((sum, it) => sum + (it.subject.units || 0), 0)}</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>FIRST YEAR - SECOND SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>SUBJECT</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRowsForSection(getSectionItems('FIRST YEAR', 'SECOND SEMESTER'))}
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>{getSectionItems('FIRST YEAR', 'SECOND SEMESTER').reduce((sum, it) => sum + (it.subject.units || 0), 0)}</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>SUMMER REQUIRED</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>SUBJECT</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRowsForSection(getSectionItems('FIRST YEAR', 'SUMMER REQUIRED'))}
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>{getSectionItems('FIRST YEAR', 'SUMMER REQUIRED').reduce((sum, it) => sum + (it.subject.units || 0), 0)}</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>SECOND YEAR - FIRST SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>SUBJECT</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRowsForSection(getSectionItems('SECOND YEAR', 'FIRST SEMESTER'))}
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>{getSectionItems('SECOND YEAR', 'FIRST SEMESTER').reduce((sum, it) => sum + (it.subject.units || 0), 0)}</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>SECOND YEAR - SECOND SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>SUBJECT</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRowsForSection(getSectionItems('SECOND YEAR', 'SECOND SEMESTER'))}
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>{getSectionItems('SECOND YEAR', 'SECOND SEMESTER').reduce((sum, it) => sum + (it.subject.units || 0), 0)}</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              {/* Footer */}
              <div className="document-footer">
                <div className="footer-left">
                  <p>Based on CMO No. 25, Series 2015</p>
                  <p>BSIT-ACAD-P001</p>
                </div>
                <div className="footer-right">
                  <p>Rev. 0</p>
               
                </div>
              </div>
            </div>
          </div>

          {/* Back Page (Right) */}
          <div className="prospectus-page" ref={backCardRef}>
            <div className="prospectus-document">
              <div className="page-indicator">BACK PAGE</div>
              {/* Header Section */}
              <div className="document-header">
                <div className="header-content">
                  <div className="logo-section">
                    <div className="logo-seal">
                      <img src="/img/logo.png" alt="St. Mary's College Logo" className="logo-image" />
                    </div>
                  </div>
                  <div className="institution-info">
                    <h2>St. Mary's College of Bansalan, Inc.</h2>
                    <p className="former-name">(Formerly: Holy Cross of Bansalan College, Inc.)</p>
                    <p className="address">Dahlia Street, Poblacion Uno, Bansalan, Davao del Sur, 8005 Philippines</p>
                    <h3>Bachelor of Science in Information Technology (BSIT)</h3>
                    <p className="effective-date">Effective SY 2020 - 2021</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Back Page Sections */}
              {hasData ? (
                // Show actual data if available for back page sections (keep original headers)
                <div>
                  <h4 className="year-header"><strong>SUMMER REQUIRED</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>Subject</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRowsForSection(getSectionItems('SUMMER REQUIRED', 'SUMMER REQUIRED'))}
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>{getSectionItems('SUMMER REQUIRED', 'SUMMER REQUIRED').reduce((sum, it) => sum + (it.subject.units || 0), 0)}</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>THIRD YEAR - FIRST SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>Subject</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRowsForSection(getSectionItems('THIRD YEAR', 'FIRST SEMESTER'))}
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>{getSectionItems('THIRD YEAR', 'FIRST SEMESTER').reduce((sum, it) => sum + (it.subject.units || 0), 0)}</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>THIRD YEAR - SECOND SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>Subject</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRowsForSection(getSectionItems('THIRD YEAR', 'SECOND SEMESTER'))}
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>{getSectionItems('THIRD YEAR', 'SECOND SEMESTER').reduce((sum, it) => sum + (it.subject.units || 0), 0)}</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>SUMMER REQUIRED</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>Subject</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRowsForSection(getSectionItems('SUMMER REQUIRED', 'SUMMER REQUIRED'))}
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>{getSectionItems('SUMMER REQUIRED', 'SUMMER REQUIRED').reduce((sum, it) => sum + (it.subject.units || 0), 0)}</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>FOURTH YEAR - FIRST SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>Subject</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRowsForSection(getSectionItems('FOURTH YEAR', 'FIRST SEMESTER'))}
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>{getSectionItems('FOURTH YEAR', 'FIRST SEMESTER').reduce((sum, it) => sum + (it.subject.units || 0), 0)}</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>FOURTH YEAR - SECOND SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>Subject</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderRowsForSection(getSectionItems('FOURTH YEAR', 'SECOND SEMESTER'))}
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>{getSectionItems('FOURTH YEAR', 'SECOND SEMESTER').reduce((sum, it) => sum + (it.subject.units || 0), 0)}</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                // Show default table structure when no data
                <div>
                  <h4 className="year-header"><strong>SUMMER REQUIRED</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>SUBJECT</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={8} className="text-center text-gray-500 italic">
                          No enrolled subjects found for this semester
                        </td>
                      </tr>
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>0</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>THIRD YEAR - FIRST SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>SUBJECT</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={8} className="text-center text-gray-500 italic">
                          No enrolled subjects found for this semester
                        </td>
                      </tr>
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>0</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>THIRD YEAR - SECOND SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>SUBJECT</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={8} className="text-center text-gray-500 italic">
                          No enrolled subjects found for this semester
                        </td>
                      </tr>
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>0</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>SUMMER REQUIRED</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>SUBJECT</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={8} className="text-center text-gray-500 italic">
                          No enrolled subjects found for this semester
                        </td>
                      </tr>
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>0</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>FOURTH YEAR - FIRST SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>SUBJECT</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={8} className="text-center text-gray-500 italic">
                          No enrolled subjects found for this semester
                        </td>
                      </tr>
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>0</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  <h4 className="year-header"><strong>FOURTH YEAR - SECOND SEMESTER</strong></h4>
                  <table className="prospectus-table">
                    <thead>
                      <tr>
                        <th>GRADES</th>
                        <th>SUBJECT</th>
                        <th>DESCRIPTION</th>
                        <th colSpan={3}>UNITS</th>
                        <th>PRE-REQUISITE</th>
                        <th>Total</th>
                      </tr>
                      <tr>
                        <th></th>
                        <th>CODE</th>
                        <th></th>
                        <th>LEC</th>
                        <th>LAB</th>
                        <th>Total</th>
                        <th></th>
                        <th>HRS/WK</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={8} className="text-center text-gray-500 italic">
                          No enrolled subjects found for this semester
                        </td>
                      </tr>
                      <tr className="total-row">
                        <td colSpan={5}><strong>TOTAL</strong></td>
                        <td><strong>0</strong></td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* IT Electives List */}
              <div className="electives-section">
                <h4>LIST OF IT ELECTIVES</h4>
                <ul className="electives-list">
                  <li>Human Computer Interaction 2</li>
                  <li>Operating System & Platforms</li>
                  <li>Multimedia Systems</li>
                  <li>Integrative Programming and Technologies 2</li>
                  <li>Mobile Development</li>
                  <li>Applications Development & Emerging Technologies 2</li>
                  <li>Fundamentals of Data Warehousing and Data Mining</li>
                  <li>Information Management 2</li>
                  <li>Systems Integration and Architecture 2</li>
                </ul>
              </div>

              {/* Signatures Section */}
              <div className="signatures-section">
                <div className="signature-row">
                  <div className="signature-item">
                    <p><strong>Prepared by:</strong></p>
                    <p>Mr. Jhon Bryan J. Cantil, LPT</p>
                    <p>BSIT Program Head</p>
                    <div className="signature-line"></div>
                  </div>
                  <div className="signature-item">
                    <p><strong>Checked by:</strong></p>
                    <p>Ms. Sheryl O. Singkala, LPT</p>
                    <p>College Registrar</p>
                    <div className="signature-line"></div>
                  </div>
                </div>
                <div className="signature-row">
                  <div className="signature-item">
                    <p><strong>Approved by:</strong></p>
                    <p>S. Ma. Charita P. Cabunoc, RVM</p>
                    <p>VP Academics / Dean of College</p>
                    <div className="signature-line"></div>
                  </div>
                  <div className="signature-item">
                    <p><strong>Approved by:</strong></p>
                    <p>S. Ma. Fe D. Gerodias, RVM</p>
                    <p>School President</p>
                    <div className="signature-line"></div>
                  </div>
                </div>
                <div className="stamp-section">
                  <div className="stamp">CONFORME NOTED</div>
                  <p>7/15/2020</p>
                </div>
              </div>

              {/* Footer */}
              <div className="document-footer">
                <div className="footer-left">
                  <p>Based on CMO No. 25, Series 2015</p>
                  <p>BSIT-ACAD-P001</p>
                </div>
                <div className="footer-right">
                  <p>Rev. 0</p>
              
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Download Section */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Download Prospectus</h2>
          <p className="text-gray-600 mb-6">For the best viewing experience, download the prospectus as a PDF or image.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={downloadAsPDF}
              disabled={isDownloading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isDownloading ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button 
              onClick={downloadAsImage}
              disabled={isDownloading}
              className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isDownloading ? 'Generating Image...' : 'Download Image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Prospectus;
