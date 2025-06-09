-- Creates the programs table
CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,  -- e.g., BSED, BSBA, BSCS
  name VARCHAR(100) NOT NULL,       -- e.g., Bachelor of Science in Education
  description TEXT,
  major VARCHAR(100),              -- Added major field for BSED programs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_programs_code ON programs(code);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_set_programs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_programs_timestamp
BEFORE UPDATE ON programs
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_programs_timestamp();

-- Add program_id column to user_profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'program_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN program_id INT REFERENCES programs(id);
  END IF;
END $$;

-- Create index for program_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_program_id ON user_profiles(program_id);

-- Insert MCBI programs
INSERT INTO programs (code, name, description, major)
VALUES 
  ('BSED', 'Bachelor of Science in Education', 'Teacher Education Program', 'English'),
  ('BSED-SCI', 'Bachelor of Science in Education', 'Teacher Education Program', 'General Science'),
  ('BSBA', 'Bachelor of Science in Business Administration', 'Business and Management Program', NULL),
  ('BSIT', 'Bachelor of Science in Information Technology', 'Information Technology Program', NULL),
  ('BSHM', 'Bachelor of Science in Hospitality Management', 'Hospitality Management Program', NULL),
  ('BSHRM', 'Bachelor of Science in Hotel and Restaurant Management', 'Hotel and Restaurant Management Program', NULL)
ON CONFLICT (code) DO NOTHING;

-- Create RLS policies for programs table
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read programs
CREATE POLICY "Programs are viewable by all authenticated users"
    ON programs FOR SELECT
    TO authenticated
    USING (true);

-- Only allow admins and superadmins to manage programs
CREATE POLICY "Only admins and superadmins can manage programs"
    ON programs FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.role IN ('admin', 'superadmin')
        )
    ); 