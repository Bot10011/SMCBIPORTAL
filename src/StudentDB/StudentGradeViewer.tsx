import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { gradeService } from '../lib/services/gradeService';
import { GradeSummary } from '../types/grades';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, AlertCircle } from 'lucide-react';

export const StudentGradeViewer: React.FC = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState<GradeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        if (user?.id) {
          const data = await gradeService.getStudentGrades({ student_id: user.id });
          setGrades(data);
        }
      } catch (error) {
        console.error('Error fetching grades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [user?.id]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 via-transparent to-blue-50/50 rounded-2xl -z-10"></div>
        <div className="p-6 sm:p-8 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-green-100/80 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]">
            <GraduationCap className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">My Grades</h2>
        </div>
      </motion.div>
      {/* Grades Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="animate-pulse h-48 bg-gray-200 rounded-xl" />
          ))}
        </div>
      ) : (
        <AnimatePresence>
          {grades.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] border border-gray-100">
              <div className="p-4 rounded-full bg-gray-50 mb-4">
                <AlertCircle className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Grades Available</h3>
              <p className="text-gray-500 text-center max-w-md">
                You do not have any grades yet. Please check back later or contact your teacher for updates.
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grades.map((grade) => (
                <motion.div
                  key={`${grade.student_id}-${grade.subject_code}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="group relative bg-white rounded-xl p-6 transition-all duration-300 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.12),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] border border-gray-100"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  {/* Subject Code and Name */}
                  <div className="relative space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-700 bg-clip-text text-transparent">
                        {grade.subject_code}
                      </h3>
                    </div>
                    <p className="text-gray-700 font-medium line-clamp-2">{grade.subject_name}</p>
                  </div>
                  {/* Grade Details */}
                  <div className="relative mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-semibold">Prelim:</span>
                      <span>{grade.prelim_grade !== undefined ? grade.prelim_grade : '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-semibold">Midterm:</span>
                      <span>{grade.midterm_grade !== undefined ? grade.midterm_grade : '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-semibold">Final:</span>
                      <span>{grade.final_grade !== undefined ? grade.final_grade : '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-semibold">Remarks:</span>
                      <span>{grade.remarks || '-'}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}; 
