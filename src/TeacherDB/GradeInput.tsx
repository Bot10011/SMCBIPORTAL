import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Dialog } from '@headlessui/react';
import { Loader2, CheckCircle2, X, Pencil, PlusCircle, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface GradeInputModalProps {
  open: boolean;
  onClose: () => void;
  student: any;
  classId: string;
  onGradeSaved: (grade: number) => void;
}

const GradeInputModal: React.FC<GradeInputModalProps> = ({ open, onClose, student, classId, onGradeSaved }) => {
  const [grade, setGrade] = useState<number | ''>(student?.grade ?? '');
  const [loading, setLoading] = useState(false);

  if (!open || !student) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (grade === '' || isNaN(Number(grade))) {
      toast.error('Please enter a valid grade.');
      return;
    }
    setLoading(true);
    // Update grade in enrollments table (replace with your logic)
    const { error } = await supabase
      .from('enrollments')
      .update({ grade: Number(grade) })
      .eq('student_id', student.id)
      .eq('subject_id', classId);
    setLoading(false);
    if (error) {
      toast.error('Failed to save grade: ' + error.message);
    } else {
      toast.success('Grade saved!');
      onGradeSaved(Number(grade));
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="fixed z-50 inset-0 flex items-center justify-center">
      <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2 }} className="relative bg-white rounded-xl shadow-xl p-8 w-full max-w-md mx-auto z-10">
        <button className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100" onClick={onClose}>
          <X className="w-5 h-5 text-gray-400" />
        </button>
        <Dialog.Title className="text-lg font-bold mb-2 flex items-center gap-2">
          <CheckCircle2 className="text-green-600" /> Grade Input
        </Dialog.Title>
        <div className="mb-4">
          <div className="font-medium text-gray-800">{student.first_name} {student.last_name}</div>
          <div className="text-sm text-gray-500">{student.email}</div>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Grade</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={grade}
              onChange={e => setGrade(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Save Grade'}
          </button>
        </form>
      </motion.div>
    </Dialog>
  );
};

const dummyStudents = [
  { id: 'student1', first_name: 'Test', last_name: 'Student', email: 'john.doe@smcbi.edu.ph', grade: 85 },
  { id: 'student2', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@smcbi.edu.ph', grade: 92 },
];

const GradeInput: React.FC = () => {
  const [students, setStudents] = useState(dummyStudents);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [classId] = useState('demo-class'); // Replace with actual classId if needed

  const handleOpenModal = (student: any) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedStudent(null);
  };

  const handleGradeSaved = (newGrade: number) => {
    if (selectedStudent) {
      setStudents(students => students.map(s => s.id === selectedStudent.id ? { ...s, grade: newGrade } : s));
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <CheckCircle2 className="text-blue-500" /> Grade Input
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {students.map(student => (
          <motion.div
            key={student.id}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
            className="bg-white rounded-xl shadow-md p-5 flex flex-col gap-2 border border-gray-100 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <User className="w-8 h-8 text-blue-400" />
              <div>
                <div className="font-semibold text-lg text-gray-800">{student.first_name} {student.last_name}</div>
                <div className="text-xs text-gray-500">{student.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-600">Grade:</span>
              <span className="font-bold text-blue-700 text-lg">{student.grade}</span>
              <button
                className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 rounded-lg flex items-center gap-1 hover:bg-blue-200 transition"
                onClick={() => handleOpenModal(student)}
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {modalOpen && selectedStudent && (
          <GradeInputModal
            open={modalOpen}
            onClose={handleCloseModal}
            student={selectedStudent}
            classId={classId}
            onGradeSaved={handleGradeSaved}
          />
        )}
      </AnimatePresence>
      <button
        className="fixed bottom-8 right-8 bg-blue-600 text-white rounded-full shadow-lg p-4 flex items-center gap-2 hover:bg-blue-700 transition z-50"
        onClick={() => toast('To add a new student, integrate with your enrollment system!', { icon: <PlusCircle className='text-blue-500' /> })}
        title="Add Student (Demo)"
      >
        <PlusCircle className="w-6 h-6" />
        <span className="hidden sm:inline">Add Student</span>
      </button>
    </div>
  );
};

export default GradeInput; 