import { UserRole, StudentStatus } from './auth';

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          username: string;
          role: UserRole;
          student_status?: StudentStatus;
          first_name: string;
          last_name: string;
          middle_name?: string;
          profile_picture_url?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          status: 'active' | 'completed' | 'dropped';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['enrollments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['enrollments']['Insert']>;
      };
      subjects: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          units: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>;
      };
      grade_periods: {
        Row: {
          id: string;
          name: string;
          academic_year: string;
          semester: string;
          start_date: string;
          end_date: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['grade_periods']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['grade_periods']['Insert']>;
      };
      teacher_subjects: {
        Row: {
          id: string;
          teacher_id: string;
          subject_id: string;
          section: string;
          academic_year: string;
          semester: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['teacher_subjects']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['teacher_subjects']['Insert']>;
      };
      student_grades: {
        Row: {
          id: string;
          enrollment_id: string;
          teacher_subject_id: string;
          grade_period_id: string;
          grade: number;
          remarks: string | null;
          status: 'pending' | 'submitted' | 'approved' | 'rejected';
          approved_by: string | null;
          approved_at: string | null;
          comments: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['student_grades']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['student_grades']['Insert']>;
      };
      grade_approvals: {
        Row: {
          id: string;
          student_grade_id: string;
          approver_id: string;
          status: 'approved' | 'rejected';
          comments: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['grade_approvals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['grade_approvals']['Insert']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
} 
