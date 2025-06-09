-- Remove department column from programs table
ALTER TABLE programs DROP COLUMN IF EXISTS department;

-- Update existing programs to remove department references
UPDATE programs SET description = description WHERE department IS NOT NULL;

-- Remove department from any existing policies or views that might reference it
DO $$ 
BEGIN
    -- Drop any views that might reference the department column
    DROP VIEW IF EXISTS program_department_view;
    
    -- Revoke any policies that might reference the department column
    DROP POLICY IF EXISTS "Program department policy" ON programs;
END $$; 