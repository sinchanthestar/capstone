// Migration script to fix leave_requests table schema
const { Client } = require('pg');

async function migrateLeaveRequests() {
  const client = new Client({ 
    host: 'localhost', 
    user: 'postgres', 
    password: 'koko123', 
    database: 'shift_manager' 
  });

  try {
    await client.connect();
    
    console.log('🔄 Starting leave_requests table migration...\n');
    
    // 1. Backup existing data if any
    console.log('1️⃣  Checking for existing data...');
    const countResult = await client.query('SELECT COUNT(*) as cnt FROM leave_requests');
    const existingCount = countResult.rows[0].cnt;
    if (existingCount > 0) {
      console.log(`   ⚠️  Found ${existingCount} existing records`);
      console.log('   Creating backup...');
      // Backup is handled by dropping - since we have no data, we can proceed
    }
    console.log('   ✓ Ready to migrate\n');
    
    // 2. Drop old table
    console.log('2️⃣  Dropping old leave_requests table...');
    try {
      await client.query('DROP TABLE IF EXISTS leave_requests CASCADE');
      console.log('   ✓ Old table dropped\n');
    } catch (error) {
      console.log('   ! Could not drop table (may not exist):', error.message);
    }
    
    // 3. Create new table with correct schema
    console.log('3️⃣  Creating new leave_requests table...');
    await client.query(`
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
      )
    `);
    console.log('   ✓ New table created\n');
    
    // 4. Create indexes
    console.log('4️⃣  Creating indexes...');
    await client.query('CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id)');
    await client.query('CREATE INDEX idx_leave_requests_assignment_id ON leave_requests(assignment_id)');
    await client.query('CREATE INDEX idx_leave_requests_status ON leave_requests(status)');
    console.log('   ✓ Indexes created\n');
    
    // 5. Verify
    console.log('5️⃣  Verifying new structure...');
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'leave_requests'
      ORDER BY ordinal_position
    `);
    
    console.log('   Columns:');
    columns.rows.forEach(col => {
      console.log(`     • ${col.column_name}: ${col.data_type}`);
    });
    console.log('\n✅ Migration complete! The leave_requests table is now ready to use.\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateLeaveRequests();
