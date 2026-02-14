import { query, queryOne } from './db';

export interface SetupStatus {
  isInitialized: boolean;
  tablesCreated: boolean;
  adminExists: boolean;
  setupStep: 'check' | 'create-tables' | 'create-admin' | 'complete';
}

/**
 * Check if database is initialized
 */
export async function checkSetupStatus(): Promise<SetupStatus> {
  try {
    // Check if users table exists
    const result = await queryOne<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists`
    );

    const tablesCreated = result?.exists || false;

    // Check if admin user exists
    const adminResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM users WHERE role = 'admin' LIMIT 1`,
      []
    );

    const adminExists = (adminResult?.count || 0) > 0;

    return {
      isInitialized: tablesCreated && adminExists,
      tablesCreated,
      adminExists,
      setupStep: tablesCreated && adminExists ? 'complete' : tablesCreated ? 'create-admin' : 'create-tables',
    };
  } catch (error) {
    console.error('[Setup] Error checking status:', error);
    return {
      isInitialized: false,
      tablesCreated: false,
      adminExists: false,
      setupStep: 'check',
    };
  }
}

/**
 * Initialize database schema
 */
export async function initializeDatabase(): Promise<boolean> {
  try {
    const schema = `
      -- Users table for authentication
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'employee',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Employees table
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        department VARCHAR(100),
        position VARCHAR(100),
        phone VARCHAR(20),
        hire_date DATE,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Shift types table
      CREATE TABLE IF NOT EXISTS shifts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3b82f6',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Schedule assignments
      CREATE TABLE IF NOT EXISTS schedule_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
        scheduled_date DATE NOT NULL,
        is_confirmed BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, shift_id, scheduled_date)
      );

      -- Shift swap requests
      CREATE TABLE IF NOT EXISTS shift_swap_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        assignment_id UUID NOT NULL REFERENCES schedule_assignments(id) ON DELETE CASCADE,
        requested_swap_date DATE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Notifications
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT false,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Sessions for authentication
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
      CREATE INDEX IF NOT EXISTS idx_schedule_assignments_employee_id ON schedule_assignments(employee_id);
      CREATE INDEX IF NOT EXISTS idx_schedule_assignments_scheduled_date ON schedule_assignments(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

      -- Leave requests table
      CREATE TABLE IF NOT EXISTS leave_requests (
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

      -- Add columns to schedule_assignments for replacement tracking
      ALTER TABLE schedule_assignments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
      ALTER TABLE schedule_assignments ADD COLUMN IF NOT EXISTS replaced_by_employee_id UUID REFERENCES employees(id);
      ALTER TABLE schedule_assignments ADD COLUMN IF NOT EXISTS replacement_for_id UUID REFERENCES schedule_assignments(id);

      -- Create indexes for leave_requests
      CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
    `;

    // Split and execute each statement
    const statements = schema.split(';').filter((stmt) => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await query(statement);
      }
    }

    console.log('[Setup] Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('[Setup] Error initializing database:', error);
    throw error;
  }
}

/**
 * Validate database connection
 */
export async function validateDatabaseConnection(): Promise<boolean> {
  try {
    const result = await queryOne('SELECT NOW()');
    return result !== null;
  } catch (error) {
    console.error('[Setup] Database connection failed:', error);
    return false;
  }
}

/**
 * Get database connection info
 */
export function getDatabaseStatus(): {
  configured: boolean;
  hasUrl: boolean;
} {
  const hasUrl = !!process.env.DATABASE_URL;
  return {
    configured: hasUrl,
    hasUrl,
  };
}
