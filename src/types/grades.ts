import { Database } from './supabase';

export type GradePeriod = Database['public']['Tables']['grade_periods']['Row'];
export type TeacherSubject = Database['public']['Tables']['teacher_subjects']['Row'];
export type StudentGrade = Database['public']['Tables']['student_grades']['Row'];
export type GradeApproval = Database['public']['Tables']['grade_approvals']['Row'];

export type GradeStatus = 'pending' | 'submitted' | 'approved' | 'rejected';
export type ApprovalStatus = 'approved' | 'rejected';

export interface GradeInput {
  enrollment_id: string;
  teacher_subject_id: string;
  grade_period_id: string;
  grade: number;
  remarks?: string;
  comments?: string;
}

export interface GradeApprovalInput {
  student_grade_id: string;
  status: ApprovalStatus;
  comments?: string;
}

export interface GradeFilter {
  academic_year?: string;
  semester?: string;
  subject_id?: string;
  teacher_id?: string;
  student_id?: string;
  status?: GradeStatus;
}

export interface GradeSummary {
  id: string;
  student_id: string;
  student_name: string;
  subject_code: string;
  subject_name: string;
  teacher_name?: string;
  prelim_grade?: number;
  midterm_grade?: number;
  final_grade?: number;
  final_computed_grade?: number;
  status: GradeStatus;
  remarks?: string;
}

export interface TeacherSubjectWithDetails extends TeacherSubject {
  subject: {
    code: string;
    name: string;
    units: number;
  };
  enrolled_students: {
    id: string;
    student: {
      id: string;
      first_name: string;
      last_name: string;
      middle_name?: string;
    };
    grades: StudentGrade[];
  }[];
}

export interface GradePeriodWithGrades extends GradePeriod {
  grades: StudentGrade[];
}

export interface GradeExportOptions {
  format: 'csv' | 'pdf';
  academic_year: string;
  semester: string;
  subject_id?: string;
  teacher_id?: string;
  include_remarks?: boolean;
  include_comments?: boolean;
} 
