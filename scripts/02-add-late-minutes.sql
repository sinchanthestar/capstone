-- Migration: Add late_minutes column to attendance_logs
-- Run this SQL to add support for tracking late check-ins

-- Add late_minutes column if not exists
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;

-- Add index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_attendance_logs_status ON attendance_logs(status);

-- Optional: Add comment for documentation
COMMENT ON COLUMN attendance_logs.late_minutes IS 'Minutes late from shift start time. 0 = on time.';
