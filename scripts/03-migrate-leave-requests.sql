-- Migration: Update leave_requests table to support assignment_id based approach
-- Drop existing leave_requests table and recreate with correct schema
DROP TABLE IF EXISTS leave_requests CASCADE;

-- Create new leave_requests table with correct schema
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES schedule_assignments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  admin_notes TEXT,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_assignment_id ON leave_requests(assignment_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

COMMIT;
