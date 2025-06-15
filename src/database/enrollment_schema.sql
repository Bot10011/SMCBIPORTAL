-- Create student_enrollments table to track all course enrollments
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, course_id)  -- Prevent duplicate enrollments
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id ON public.student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_course_id ON public.student_enrollments(course_id);

-- Enable Row Level Security
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for student_enrollments table
CREATE POLICY "Enable read access for authenticated users" ON public.student_enrollments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for registrar users" ON public.student_enrollments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.jwt() ->> 'role' = 'registrar');

CREATE POLICY "Enable update for registrar users" ON public.student_enrollments
    FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'registrar')
    WITH CHECK (auth.jwt() ->> 'role' = 'registrar');

-- Create trigger for updated_at
CREATE TRIGGER update_student_enrollments_updated_at
    BEFORE UPDATE ON public.student_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for easy access to student enrollments with course details
CREATE OR REPLACE VIEW public.student_course_enrollments AS
SELECT 
    se.id as enrollment_id,
    up.id as student_id,
    up.student_id as student_number,
    up.first_name,
    up.last_name,
    c.id as course_id,
    c.course_code,
    c.course_name,
    c.department,
    c.units,
    se.enrollment_date,
    se.status as enrollment_status,
    se.created_at,
    se.updated_at
FROM public.student_enrollments se
JOIN public.user_profiles up ON se.student_id = up.id
JOIN public.courses c ON se.course_id = c.id;

-- Example of how to insert an enrollment:
-- INSERT INTO public.student_enrollments (student_id, course_id)
-- VALUES ('student-uuid', 'course-uuid');

-- Example of how to get all enrollments for a student:
-- SELECT * FROM public.student_course_enrollments
-- WHERE student_id = 'student-uuid';

-- Example of how to get all students in a course:
-- SELECT * FROM public.student_course_enrollments
-- WHERE course_id = 'course-uuid'; 