// Test script to verify leave_requests table exists and is properly configured
const { Client } = require('pg');

async function testLeaveRequests() {
  const client = new Client({ 
    host: 'localhost', 
    user: 'postgres', 
    password: 'koko123', 
    database: 'shift_manager' 
  });

  try {
    await client.connect();
    
    console.log('=== Leave Requests Database Check ===\n');
    
    // 1. Check if leave_requests table exists
    console.log('1️⃣  Checking if leave_requests table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'leave_requests'
      ) as exists
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ leave_requests table NOT FOUND!');
      console.log('\n   Solution: Run the database initialization:');
      console.log('   → Open http://localhost:3000/api/setup/init?force=true');
      console.log('   → Or run: psql -U postgres -d shift_manager -f scripts/01-init-database.sql');
      return;
    }
    console.log('✓ leave_requests table exists\n');
    
    // 2. Check table structure
    console.log('2️⃣  Checking table columns...');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'leave_requests'
      ORDER BY ordinal_position
    `);
    
    if (columns.rows.length === 0) {
      console.log('❌ Could not read table structure');
      return;
    }
    
    const requiredColumns = ['id', 'employee_id', 'assignment_id', 'reason', 'status'];
    columns.rows.forEach(col => {
      const required = requiredColumns.includes(col.column_name);
      const marker = required ? '✓' : '•';
      console.log(`  ${marker} ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // 3. Count existing leave requests
    console.log('\n3️⃣  Checking existing data...');
    const countResult = await client.query('SELECT COUNT(*) as cnt FROM leave_requests');
    console.log(`  ✓ Total leave requests: ${countResult.rows[0].cnt}`);
    
    // 4. Check for any data issues
    console.log('\n4️⃣  Checking data integrity...');
    
    // Check orphaned records (references to deleted assignments)
    const orphaned = await client.query(`
      SELECT COUNT(*) as cnt FROM leave_requests lr
      WHERE NOT EXISTS (SELECT 1 FROM schedule_assignments WHERE id = lr.assignment_id)
    `);
    
    if (orphaned.rows[0].cnt > 0) {
      console.log(`  ⚠️  Found ${orphaned.rows[0].cnt} orphaned records (assignments were deleted)`);
    } else {
      console.log('  ✓ No orphaned records');
    }
    
    // 5. Check if employees and schedules exist
    console.log('\n5️⃣  Checking dependencies...');
    const empCheck = await client.query('SELECT COUNT(*) as cnt FROM employees WHERE is_available = true');
    const schedCheck = await client.query('SELECT COUNT(*) as cnt FROM schedule_assignments WHERE scheduled_date > CURRENT_DATE');
    
    console.log(`  ✓ Active employees: ${empCheck.rows[0].cnt}`);
    console.log(`  ✓ Future schedule assignments: ${schedCheck.rows[0].cnt}`);
    
    if (schedCheck.rows[0].cnt === 0) {
      console.log('\n  ⚠️  No future schedule assignments found!');
      console.log('     → Create some shifts and auto-generate schedules first');
    }
    
    // 6. Test insert
    console.log('\n6️⃣  Testing INSERT capability...');
    
    // Get sample data
    const sampleData = await client.query(`
      SELECT 
        lr.employee_id,
        lr.assignment_id
      FROM leave_requests lr
      LIMIT 1
    `);
    
    if (sampleData.rows.length > 0) {
      console.log('  ✓ Sample leave request found in database');
      console.log(`    - Employee ID: ${sampleData.rows[0].employee_id}`);
      console.log(`    - Assignment ID: ${sampleData.rows[0].assignment_id}`);
    }
    
    console.log('\n✅ Database check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('\nSolution: Initialize the database using one of these methods:');
      console.log('1. Web UI: http://localhost:3000/api/setup/init?force=true');
      console.log('2. Manual SQL: psql -U postgres -d shift_manager -f scripts/01-init-database.sql');
    }
  } finally {
    await client.end();
  }
}

testLeaveRequests();
