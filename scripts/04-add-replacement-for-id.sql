-- Migration: Add replacement_for_id column to schedule_assignments
-- This column tracks which assignment is being replaced when an employee takes leave

ALTER TABLE schedule_assignments 
ADD COLUMN IF NOT EXISTS replacement_for_id UUID REFERENCES schedule_assignments(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_replacement_for_id 
ON schedule_assignments(replacement_for_id);

-- Add comment for documentation
COMMENT ON COLUMN schedule_assignments.replacement_for_id IS 'References the original assignment ID when this is a replacement assignment due to leave request approval';
