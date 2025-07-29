import React, { useState } from 'react';

// Mock data for demonstration
const mockSubjects = [
  { id: 'subj1', name: 'Mathematics 101' },
  { id: 'subj2', name: 'English Literature' },
  { id: 'subj3', name: 'Physics' },
];

const mockSubjectDetails = {
  subj1: {
    teacher: 'Mr. John Doe',
    sections: [
      {
        name: 'Section A',
        students: [
          { id: 'stu1', name: 'Alice Smith' },
          { id: 'stu2', name: 'Bob Johnson' },
        ],
      },
      {
        name: 'Section B',
        students: [
          { id: 'stu3', name: 'Charlie Brown' },
        ],
      },
    ],
  },
  subj2: {
    teacher: 'Ms. Jane Smith',
    sections: [
      {
        name: 'Section A',
        students: [
          { id: 'stu4', name: 'David Lee' },
        ],
      },
    ],
  },
  subj3: {
    teacher: 'Dr. Maria Santos',
    sections: [
      {
        name: 'Section C',
        students: [
          { id: 'stu5', name: 'Eva Green' },
          { id: 'stu6', name: 'Frank White' },
        ],
      },
    ],
  },
};

const SubjectReview: React.FC = () => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const subjectDetails = selectedSubjectId ? mockSubjectDetails[selectedSubjectId] : null;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Subject Review</h1>
      <div className="mb-6">
        <label className="block text-lg font-semibold mb-2">Select Subject:</label>
        <select
          className="w-full border border-gray-300 rounded-lg px-4 py-2"
          value={selectedSubjectId || ''}
          onChange={e => setSelectedSubjectId(e.target.value || null)}
        >
          <option value="">-- Choose a subject --</option>
          {mockSubjects.map(subj => (
            <option key={subj.id} value={subj.id}>{subj.name}</option>
          ))}
        </select>
      </div>
      {subjectDetails && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="mb-4">
            <span className="font-semibold text-gray-700">Teacher:</span> {subjectDetails.teacher}
          </div>
          {subjectDetails.sections.map(section => (
            <div key={section.name} className="mb-6">
              <div className="font-semibold text-blue-600 mb-2">Section: {section.name}</div>
              <ul className="list-disc ml-6">
                {section.students.map(student => (
                  <li key={student.id} className="text-gray-700">{student.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectReview; 