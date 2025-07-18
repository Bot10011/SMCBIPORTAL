import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Prospectus.css';
import { motion } from 'framer-motion';

const Prospectus: React.FC = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  const handleCardDoubleClick = () => {
    setIsFlipped(!isFlipped);
  };

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

  const downloadAsPDF = async () => {
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
  };

  const downloadAsImage = async () => {
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-brvia-white to-blue-50">
  
    
      {/* Premium Header Section */}
  
     <motion.div
       initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50  border border-blue-100"
      >
      <div className="mb-8 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50  border border-blue-100 w-full">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 min-h-[110px] flex items-center w-full">
            <div className="flex items-center gap-4 w-full justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0A9 9 0 11 3 12a9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Academic Prospectus</h1>
                  <p className="text-white/80 text-sm font-medium">Bachelor of Science in Information Technology (BSIT)</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={downloadAsPDF}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-inner flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                </button>
                <button 
                  onClick={downloadAsImage}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-inner flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {isDownloading ? 'Generating Image...' : 'Download Image'}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      </div>
      </motion.div>
      
      <div className="flip-card-container">
        <div 
          className={`flip-card ${isFlipped ? 'flipped' : ''}`}
          onDoubleClick={handleCardDoubleClick}
        >
          {/* Front Side */}
          <div className="flip-card-front" ref={frontCardRef}>
            <div className="page-indicator">Page 1</div>
            <div className="prospectus-document">
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

              {/* First Year - First Semester */}
              <div className="semester-section">
                <h4>First Year - FIRST SEMESTER</h4>
                <table className="prospectus-table">
                  <thead>
                    <tr>
                      <th>GRADES</th>
                      <th colSpan={2}>SUBJECT</th>
                      <th colSpan={3}>UNITS</th>
                      <th>PRE-REQUISITE</th>
                      <th>Total Hrs./wk.</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th>CODE</th>
                      <th>DESCRIPTION</th>
                      <th>LEC</th>
                      <th>LAB</th>
                      <th>Total</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td>RS 101</td>
                      <td>Essentials of Catholic Faith and Life</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>GE 100</td>
                      <td>Purposive Communication & Grammar</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>GE 101</td>
                      <td>Understanding the Self</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>GE 102</td>
                      <td>The Contemporary World</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 111</td>
                      <td>Introduction to Computing</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>None</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 112</td>
                      <td>Computer Programming 1</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>None</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 113</td>
                      <td>Introduction to Human Computer Interaction</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>None</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>PE 1</td>
                      <td>Movement Enhancement</td>
                      <td>2</td>
                      <td>0</td>
                      <td>2</td>
                      <td>None</td>
                      <td>2</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>NSTP 1</td>
                      <td>Civic Welfare Training Services</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={5}><strong>TOTAL UNITS</strong></td>
                      <td><strong>26</strong></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* First Year - Second Semester */}
              <div className="semester-section">
                <h4>First Year - SECOND SEMESTER</h4>
                <table className="prospectus-table">
                  <thead>
                    <tr>
                      <th>GRADES</th>
                      <th colSpan={2}>SUBJECT</th>
                      <th colSpan={3}>UNITS</th>
                      <th>PRE-REQUISITE</th>
                      <th>Total Hrs./wk.</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th>CODE</th>
                      <th>DESCRIPTION</th>
                      <th>LEC</th>
                      <th>LAB</th>
                      <th>Total</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td>RS 102</td>
                      <td>Religions, Religious Experiences & Spirituality</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>RS 101</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>ENGL 102</td>
                      <td>Interactive Listening, Speaking & Writing</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>GE 100</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>GE 104</td>
                      <td>Mathematics in the Modern World</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>GE 105</td>
                      <td>Ethics</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 121</td>
                      <td>Discrete Structures</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 122</td>
                      <td>Computer Programming 2</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>IT 112</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT Elective1</td>
                      <td>IT Elective 1</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>IT 113</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>PE 2</td>
                      <td>Fitness Exercise</td>
                      <td>2</td>
                      <td>0</td>
                      <td>2</td>
                      <td>PE 1</td>
                      <td>2</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>NSTP 2</td>
                      <td>Civic Welfare Training Services</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>NSTP 1</td>
                      <td>3</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={5}><strong>TOTAL UNITS</strong></td>
                      <td><strong>26</strong></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summer Required */}
              <div className="semester-section">
                <h4>SUMMER REQUIRED</h4>
                <table className="prospectus-table">
                  <thead>
                    <tr>
                      <th>GRADES</th>
                      <th colSpan={2}>SUBJECT</th>
                      <th colSpan={3}>UNITS</th>
                      <th>PRE-REQUISITE</th>
                      <th>Total Hrs./wk.</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th>CODE</th>
                      <th>DESCRIPTION</th>
                      <th>LEC</th>
                      <th>LAB</th>
                      <th>Total</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td>GE 103</td>
                      <td>Art Appreciation</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>GE 107</td>
                      <td>Life, Works and Writings of Dr. Jose Rizal</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={5}><strong>TOTAL UNITS</strong></td>
                      <td><strong>6</strong></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Second Year - First Semester */}
              <div className="semester-section">
                <h4>Second Year - FIRST SEMESTER</h4>
                <table className="prospectus-table">
                  <thead>
                    <tr>
                      <th>GRADES</th>
                      <th colSpan={2}>SUBJECT</th>
                      <th colSpan={3}>UNITS</th>
                      <th>PRE-REQUISITE</th>
                      <th>Total Hrs./wk.</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th>CODE</th>
                      <th>DESCRIPTION</th>
                      <th>LEC</th>
                      <th>LAB</th>
                      <th>Total</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td>IFP 101</td>
                      <td>Ignacian Spirituality & Christian Life</td>
                      <td>1</td>
                      <td>0</td>
                      <td>1</td>
                      <td>RS 101</td>
                      <td>1</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>GE Elec101</td>
                      <td>People and Earth's Ecosystem</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>GE 106</td>
                      <td>Readings in Philippine History</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>GE 108</td>
                      <td>Science, Technology and Society</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>ACC1G</td>
                      <td>Fundamentals of Accounting</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 211</td>
                      <td>Web Systems and Technologies</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>IT 122</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 212</td>
                      <td>Data Structures and Algorithms</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>IT 121</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 213</td>
                      <td>Information Management 1</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>2nd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>PE 3</td>
                      <td>Physical Activities Towards Health and Fitness (Sports)</td>
                      <td>2</td>
                      <td>0</td>
                      <td>2</td>
                      <td>PE 2</td>
                      <td>3</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={5}><strong>TOTAL UNITS</strong></td>
                      <td><strong>24</strong></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Second Year - Second Semester */}
              <div className="semester-section">
                <h4>Second Year - SECOND SEMESTER</h4>
                <table className="prospectus-table">
                  <thead>
                    <tr>
                      <th>GRADES</th>
                      <th colSpan={2}>SUBJECT</th>
                      <th colSpan={3}>UNITS</th>
                      <th>PRE-REQUISITE</th>
                      <th>Total Hrs./wk.</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th>CODE</th>
                      <th>DESCRIPTION</th>
                      <th>LEC</th>
                      <th>LAB</th>
                      <th>Total</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td>IFP 102</td>
                      <td>Ignacian Formation Program 2</td>
                      <td>1</td>
                      <td>0</td>
                      <td>1</td>
                      <td>IFP 101</td>
                      <td>1</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 221</td>
                      <td>Information Assurance and Security 1</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>2nd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 222</td>
                      <td>Data Communications and Networking 1</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>2nd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 223</td>
                      <td>Advance Database Systems</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>IT 213</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 224</td>
                      <td>Applications Development & Emerging Technologies</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>2nd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 225</td>
                      <td>Technopreneurship</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>2nd yr. Standing</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 226</td>
                      <td>Object Oriented Programming</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>2nd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>PE 4</td>
                      <td>Physical Activities Towards Health and Fitness (Recreational Activities)</td>
                      <td>2</td>
                      <td>0</td>
                      <td>2</td>
                      <td>PE 3</td>
                      <td>3</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={5}><strong>TOTAL UNITS</strong></td>
                      <td><strong>21</strong></td>
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
                <div className="footer-center">
                  <div className="stamp">OFFICE OF THE...</div>
                  <div className="signature">7/13/2020</div>
                </div>
                <div className="footer-right">
                  <p>1</p>
                  <p>Rev. 0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Back Side */}
          <div className="flip-card-back" ref={backCardRef}>
            <div className="page-indicator">Page 2</div>
            <div className="prospectus-document">
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

              {/* Summer Required */}
              <div className="semester-section">
                <h4>SUMMER REQUIRED</h4>
                <table className="prospectus-table">
                  <thead>
                    <tr>
                      <th>GRADES</th>
                      <th colSpan={2}>SUBJECT</th>
                      <th colSpan={3}>UNITS</th>
                      <th>PRE-REQUISITE</th>
                      <th>Total Hrs./wk.</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th>CODE</th>
                      <th>DESCRIPTION</th>
                      <th>LEC</th>
                      <th>LAB</th>
                      <th>Total</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td>GE Elec102</td>
                      <td>Entrepreneurial Mind</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>Per Dev</td>
                      <td>Social Grace and Etiquette</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>None</td>
                      <td>3</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={5}><strong>TOTAL UNITS</strong></td>
                      <td><strong>6</strong></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Third Year - First Semester */}
              <div className="semester-section">
                <h4>Third Year - FIRST SEMESTER</h4>
                <table className="prospectus-table">
                  <thead>
                    <tr>
                      <th>GRADES</th>
                      <th colSpan={2}>SUBJECT</th>
                      <th colSpan={3}>UNITS</th>
                      <th>PRE-REQUISITE</th>
                      <th>Total Hrs./wk.</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th>CODE</th>
                      <th>DESCRIPTION</th>
                      <th>LEC</th>
                      <th>LAB</th>
                      <th>Total</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td>IT 311</td>
                      <td>E-Commerce</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>3rd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 312</td>
                      <td>Networking 2</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>IT 222</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 313</td>
                      <td>Integrative Programming and Technologies 1</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>3rd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 314</td>
                      <td>Information Assurance and Security 2</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>IT 221</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 315</td>
                      <td>System Analysis and Design</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>3rd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 316</td>
                      <td>Quantitative Methods (incl. Modeling & Simulation)</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>3rd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>GE Elec 103</td>
                      <td>Reading Visual Arts</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>3rd yr. Standing</td>
                      <td>3</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={5}><strong>TOTAL UNITS</strong></td>
                      <td><strong>21</strong></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Third Year - Second Semester */}
              <div className="semester-section">
                <h4>Third Year - SECOND SEMESTER</h4>
                <table className="prospectus-table">
                  <thead>
                    <tr>
                      <th>GRADES</th>
                      <th colSpan={2}>SUBJECT</th>
                      <th colSpan={3}>UNITS</th>
                      <th>PRE-REQUISITE</th>
                      <th>Total Hrs./wk.</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th>CODE</th>
                      <th>DESCRIPTION</th>
                      <th>LEC</th>
                      <th>LAB</th>
                      <th>Total</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td>IT 321</td>
                      <td>System Integration and Architecture 1</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>IT 315</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 322</td>
                      <td>Capstone Project and Research 1</td>
                      <td>4</td>
                      <td>2</td>
                      <td>6</td>
                      <td>3rd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT Elective2</td>
                      <td>IT Elective 2</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>3rd yr. Standing</td>
                      <td>3</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 323</td>
                      <td>Social and Professional Issues</td>
                      <td>3</td>
                      <td>0</td>
                      <td>3</td>
                      <td>3rd yr. Standing</td>
                      <td>3</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={5}><strong>TOTAL UNITS</strong></td>
                      <td><strong>15</strong></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summer Required */}
              <div className="semester-section">
                <h4>SUMMER REQUIRED</h4>
                <table className="prospectus-table">
                  <thead>
                    <tr>
                      <th>GRADES</th>
                      <th colSpan={2}>SUBJECT</th>
                      <th colSpan={3}>UNITS</th>
                      <th>PRE-REQUISITE</th>
                      <th>Total Hrs./wk.</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th>CODE</th>
                      <th>DESCRIPTION</th>
                      <th>LEC</th>
                      <th>LAB</th>
                      <th>Total</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td>IT 401</td>
                      <td>Systems Administration and Maintenance</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>3rd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT 402</td>
                      <td>Computer Graphics and Animation</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>3rd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT Elective3</td>
                      <td>IT Elective 3</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>3rd yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={5}><strong>TOTAL UNITS</strong></td>
                      <td><strong>9</strong></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Fourth Year - First Semester */}
              <div className="semester-section">
                <h4>Fourth Year - FIRST SEMESTER</h4>
                <table className="prospectus-table">
                  <thead>
                    <tr>
                      <th>GRADES</th>
                      <th colSpan={2}>SUBJECT</th>
                      <th colSpan={3}>UNITS</th>
                      <th>PRE-REQUISITE</th>
                      <th>Total Hrs./wk.</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th>CODE</th>
                      <th>DESCRIPTION</th>
                      <th>LEC</th>
                      <th>LAB</th>
                      <th>Total</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td>IT 411</td>
                      <td>Capstone Project and Research 2</td>
                      <td>4</td>
                      <td>2</td>
                      <td>6</td>
                      <td>IT 322</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>IT Elective4</td>
                      <td>IT Elective 4</td>
                      <td>2</td>
                      <td>1</td>
                      <td>3</td>
                      <td>4th yr. Standing</td>
                      <td>5</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={5}><strong>TOTAL UNITS</strong></td>
                      <td><strong>9</strong></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Fourth Year - Second Semester */}
              <div className="semester-section">
                <h4>Fourth Year - SECOND SEMESTER</h4>
                <table className="prospectus-table">
                  <thead>
                    <tr>
                      <th>GRADES</th>
                      <th colSpan={2}>SUBJECT</th>
                      <th colSpan={3}>UNITS</th>
                      <th>PRE-REQUISITE</th>
                      <th>Total Hrs./wk.</th>
                    </tr>
                    <tr>
                      <th></th>
                      <th>CODE</th>
                      <th>DESCRIPTION</th>
                      <th>LEC</th>
                      <th>LAB</th>
                      <th>Total</th>
                      <th></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td>
                      <td>PRAC</td>
                      <td>Practicum (486 hours)</td>
                      <td>9</td>
                      <td>0</td>
                      <td>9</td>
                      <td>4th yr. Standing</td>
                      <td></td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan={5}><strong>TOTAL UNITS</strong></td>
                      <td><strong>9</strong></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

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
                  <p>2</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="prospectus-instructions">
        <p>Double-click on the card to flip and view the complete prospectus</p>
      </div>
    </div>
  );
};

export default Prospectus;
