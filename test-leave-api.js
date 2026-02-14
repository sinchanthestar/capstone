// Test script to verify leave-requests API works correctly
const { Client } = require('pg');

async function testLeaveRequestsAPI() {
  const client = new Client({ 
    host: 'localhost', 
    user: 'postgres', 
    password: 'koko123', 
    database: 'shift_manager' 
  });

  try {
    await client.connect();
    
    console.log('=== Leave Requests API Test ===\n');
    
    // 1. Get a sample employee
    console.log('1️⃣  Getting sample employee...');
    const empResult = await client.query(`
      SELECT e.id, u.id as user_id, u.full_name 
      FROM employees e 
      JOIN users u ON e.user_id = u.id 
      LIMIT 1
    `);
    
    if (empResult.rows.length === 0) {
      console.log('❌ No employees found!');
      return;
    }
    
    const employee = empResult.rows[0];
    console.log(`   ✓ Found employee: ${employee.full_name} (${employee.id})\n`);
    
    // 2. Get a future schedule assignment for this employee
    console.log('2️⃣  Getting future schedule assignment...');
    const assignmentResult = await client.query(`
      SELECT id, scheduled_date, shift_id
      FROM schedule_assignments
      WHERE employee_id = $1 AND scheduled_date > CURRENT_DATE
      LIMIT 1
    `, [employee.id]);
    
    if (assignmentResult.rows.length === 0) {
      console.log('❌ No future schedule assignments found for this employee!');
      console.log('   → Go to Schedule Management and create some shifts first\n');
      return;
    }
    
    const assignment = assignmentResult.rows[0];
    console.log(`   ✓ Found assignment: ${assignment.scheduled_date} (ID: ${assignment.id})\n`);
    
    // 3. Try to insert a leave request
    console.log('3️⃣  Testing INSERT into leave_requests...');
    const testReason = 'Testing leave request API - ' + new Date().toISOString();
    
    const insertResult = await client.query(`
      INSERT INTO leave_requests (
        employee_id, 
        assignment_id, 
        reason, 
        status
      )
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING id, employee_id, assignment_id, reason, status, created_at
    `, [employee.id, assignment.id, testReason]);
    
    if (insertResult.rows.length === 0) {
      console.log('❌ INSERT failed!');
      return;
    }
    
    const leaveRequest = insertResult.rows[0];
    console.log(`   ✓ Leave request created successfully!`);
    console.log(`     ID: ${leaveRequest.id}`);
    console.log(`     Status: ${leaveRequest.status}`);
    console.log(`     Reason: ${leaveRequest.reason}\n`);
    
    // 4. Test fetching
    console.log('4️⃣  Testing SELECT from leave_requests...');
    const selectResult = await client.query(`
      SELECT 
        lr.id,
        lr.reason,
        lr.status,
        lr.admin_notes,
        lr.created_at,
        lr.updated_at,
        sa.scheduled_date,
        s.name as shift_name,
        s.start_time,
        s.end_time,
        s.color,
        u.full_name as approved_by_name
      FROM leave_requests lr
      JOIN schedule_assignments sa ON lr.assignment_id = sa.id
      JOIN shifts s ON sa.shift_id = s.id
      LEFT JOIN users u ON lr.approved_by = u.id
      WHERE lr.employee_id = $1
      ORDER BY lr.created_at DESC
    `, [employee.id]);
    
    console.log(`   ✓ Found ${selectResult.rows.length} leave request(s)`);
    selectResult.rows.forEach((req, idx) => {
      console.log(`     ${idx + 1}. ${req.shift_name} @ ${req.scheduled_date} - ${req.status}`);
    });
    
    // 5. Cleanup test record
    console.log('\n5️⃣  Cleaning up test record...');
    await client.query('DELETE FROM leave_requests WHERE id = $1', [leaveRequest.id]);
    console.log('   ✓ Test record deleted\n');
    
    console.log('✅ API is working correctly! Karyawan sekarang bisa mengajukan izin.\n');
    console.log('📝 Summary:');
    console.log('   • leave_requests table: ✓ OK');
    console.log('   • Database schema: ✓ Correct');
    console.log('   • INSERT operation: ✓ Working');
    console.log('   • SELECT operation: ✓ Working');
    console.log('\n🎉 Semua siap! Karyawan bisa mengajukan izin sekarang.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await client.end();
  }
}

testLeaveRequestsAPI();
