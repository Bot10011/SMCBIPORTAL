import { supabase } from '../supabase';
import { Database } from '../../types/supabase';
import {
  GradeInput,
  GradeApprovalInput,
  GradeFilter,
  GradeSummary,
  TeacherSubjectWithDetails,
  GradeExportOptions
} from '../../types/grades';

export const gradeService = {
  // Grade Period Management
  async getGradePeriods(academicYear?: string, semester?: string) {
    let query = supabase
      .from('grade_periods')
      .select('*')
      .order('start_date', { ascending: true });

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    if (semester) {
      query = query.eq('semester', semester);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createGradePeriod(period: Database['public']['Tables']['grade_periods']['Insert']) {
    const { data, error } = await supabase
      .from('grade_periods')
      .insert(period)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Teacher Subject Management
  async getTeacherSubjects(teacherId: string, academicYear?: string, semester?: string) {
    let query = supabase
      .from('teacher_subjects')
      .select(`
        *,
        subject:subjects(*),
        enrolled_students:enrollments(
          id,
          student:user_profiles(id, first_name, last_name, middle_name),
          grades:student_grades(*)
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('is_active', true);

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }
    if (semester) {
      query = query.eq('semester', semester);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as TeacherSubjectWithDetails[];
  },

  // Grade Management
  async submitGrades(grades: GradeInput[]) {
    const { data, error } = await supabase
      .from('grades')
      .upsert(
        grades.map(grade => ({
          ...grade,
          status: 'submitted'
        }))
      )
      .select();

    if (error) throw error;
    return data;
  },

  async getStudentGrades(filter: GradeFilter): Promise<GradeSummary[]> {
    let query = supabase
      .from('grades')
      .select(`
        *,
        enrollment:enrollcourse(
          student:user_profiles(id, first_name, last_name, middle_name)
        )
      `);

    if (filter.academic_year) {
      query = query.eq('teacher_subject.academic_year', filter.academic_year);
    }
    if (filter.semester) {
      query = query.eq('teacher_subject.semester', filter.semester);
    }
    if (filter.subject_id) {
      query = query.eq('teacher_subject.subject_id', filter.subject_id);
    }
    if (filter.teacher_id) {
      query = query.eq('teacher_subject.teacher_id', filter.teacher_id);
    }
    if (filter.student_id) {
      query = query.eq('enrollment.student_id', filter.student_id);
    }
    if (filter.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transform the data into GradeSummary format
    const gradeMap = new Map<string, GradeSummary>();
    
    data.forEach(grade => {
      const key = `${grade.enrollment.student.id}`;
      if (!gradeMap.has(key)) {
        gradeMap.set(key, {
          id: grade.id,  // Add the id property
          student_id: grade.enrollment.student.id,
          student_name: `${grade.enrollment.student.last_name}, ${grade.enrollment.student.first_name}`,
          subject_code: grade.enrollment.subject_code || '',
          subject_name: grade.enrollment.subject_name || '',
          prelim_grade: grade.prelim_grade,
          midterm_grade: grade.midterm_grade,
          final_grade: grade.final_grade,
          status: grade.status || '',
          remarks: grade.remarks || undefined
        });
      }
    });

    return Array.from(gradeMap.values());
  },

  // Grade Approval Management
  async approveGrades(approvals: GradeApprovalInput[]) {
    const { data, error } = await supabase
      .from('grade_approvals')
      .insert(approvals)
      .select();

    if (error) throw error;

    // Update the status of the approved grades
    const gradeUpdates = approvals.map(approval => ({
      id: approval.student_grade_id,
      status: approval.status,
      approved_at: new Date().toISOString()
    }));

    const { error: updateError } = await supabase
      .from('student_grades')
      .upsert(gradeUpdates);

    if (updateError) throw updateError;
    return data;
  },

  // Export Grades
  async exportGrades(options: GradeExportOptions): Promise<Blob> {
    const grades = await this.getStudentGrades({
      academic_year: options.academic_year,
      semester: options.semester,
      subject_id: options.subject_id,
      teacher_id: options.teacher_id
    });

    if (options.format === 'csv') {
      const headers = [
        'Student ID',
        'Student Name',
        'Subject Code',
        'Subject Name',
        'Prelim Grade',
        'Midterm Grade',
        'Final Grade',
        'Final Computed Grade',
        'Status'
      ];

      if (options.include_remarks) {
        headers.push('Remarks');
      }

      const csvContent = [
        headers.join(','),
        ...grades.map(grade => [
          grade.student_id,
          `"${grade.student_name}"`,
          grade.subject_code,
          `"${grade.subject_name}"`,
          grade.prelim_grade || '',
          grade.midterm_grade || '',
          grade.final_grade || '',
          grade.final_computed_grade || '',
          grade.status,
          options.include_remarks ? `"${grade.remarks || ''}"` : ''
        ].join(','))
      ].join('\n');

      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    } else {
      // PDF export implementation would go here
      // This would require a PDF generation library like pdfkit or jsPDF
      throw new Error('PDF export not implemented yet');
    }
  }
}; 
