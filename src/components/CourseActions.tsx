import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

interface CourseActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

const CourseActions: React.FC<CourseActionsProps> = ({ onEdit, onDelete }) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={onEdit}
        className="p-2 rounded hover:bg-blue-100 text-blue-600 focus:outline-none"
        title="Edit Course"
        aria-label="Edit Course"
      >
        <Edit2 className="w-5 h-5" />
      </button>
      <button
        onClick={onDelete}
        className="p-2 rounded hover:bg-red-100 text-red-600 focus:outline-none"
        title="Delete Course"
        aria-label="Delete Course"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
};

export default CourseActions; 