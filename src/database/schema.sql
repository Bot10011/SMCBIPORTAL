-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    course UUID REFERENCES public.courses(id),
    year_level VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('enrolled', 'pending', 'dropped')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    units INTEGER NOT NULL CHECK (units > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create RLS (Row Level Security) policies
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create policies for students table
CREATE POLICY "Enable read access for authenticated users" ON public.students
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable update for registrar users" ON public.students
    FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'registrar')
    WITH CHECK (auth.jwt() ->> 'role' = 'registrar');

-- Create policies for courses table
CREATE POLICY "Enable read access for authenticated users" ON public.courses
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable update for registrar users" ON public.courses
    FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'registrar')
    WITH CHECK (auth.jwt() ->> 'role' = 'registrar');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 