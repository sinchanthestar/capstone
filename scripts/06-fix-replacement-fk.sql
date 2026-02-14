-- Fix replacement_for_id foreign key constraint
-- It was created with NO ACTION (default) but needs to be SET NULL to allow deletion of referenced assignments
DO $$ BEGIN -- Drop the existing constraint if it exists
IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'schedule_assignments_replacement_for_id_fkey'
        AND table_name = 'schedule_assignments'
) THEN
ALTER TABLE schedule_assignments DROP CONSTRAINT schedule_assignments_replacement_for_id_fkey;
END IF;
-- Add the correct constraint
ALTER TABLE schedule_assignments
ADD CONSTRAINT schedule_assignments_replacement_for_id_fkey FOREIGN KEY (replacement_for_id) REFERENCES schedule_assignments(id) ON DELETE
SET NULL;
END $$;