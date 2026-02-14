// Test script to verify leave request approval flow
const { Client } = require('pg');

async function testApprovalFlow() {
  const client = new Client({ 
    host: 'localhost', 
    user: 'postgres', 
    password: 'koko123', 
    database: 'shift_manager' 
  });

  try {
    await client.connect();
    
    console.log('=== Leave Request Approval Testing ===\n');
    
    // 1. Check schedule_assignments table structure
    console.log('1️⃣  Checking schedule_assignments table columns...');
    const saColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'schedule_assignments'
      ORDER BY ordinal_position
    `);
    
    const requiredColumns = ['id', 'employee_id', 'shift_id', 'scheduled_date', 'status', 'replaced_by_employee_id', 'replacement_for_id'];
    let missingColumns = [];
    
    const existingCols = saColumns.rows.map(r => r.column_name);
    requiredColumns.forEach(col => {
      if (!existingCols.includes(col)) {
        missingColumns.push(col);
      }
    });
    
    if (missingColumns.length > 0) {
      console.log('❌ Missing columns:', missingColumns);
      console.log('\n   Required columns:');
      requiredColumns.forEach(col => {
        const found = existingCols.includes(col) ? '✓' : '✗';
        console.log(`     ${found} ${col}`);
      });
    } else {
      console.log('✓ All required columns exist');
      console.log('  Columns:');
      saColumns.rows.forEach(col => {
        console.log(`    • ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // 2. Get a pending leave request
    console.log('\n2️⃣  Getting a pending leave request...');
    const pendingRequest = await client.query(`
      SELECT 
        lr.id,
        lr.employee_id,
        lr.assignment_id,
        lr.reason,
        lr.status,
        sa.scheduled_date,
        sa.shift_id,
        sa.id as assignment_id2
      FROM leave_requests lr
      JOIN schedule_assignments sa ON lr.assignment_id = sa.id
      WHERE lr.status = 'PENDING'
      LIMIT 1
    `);
    
    if (pendingRequest.rows.length === 0) {
      console.log('⚠️  No pending leave requests found');
      console.log('\n   → Submit a leave request from employee portal first');
      await client.end();
      return;
    }
    
    const leaveReq = pendingRequest.rows[0];
    console.log(`✓ Found pending leave request:`);
    console.log(`  ID: ${leaveReq.id}`);
    console.log(`  Employee: ${leaveReq.employee_id}`);
    console.log(`  Assignment: ${leaveReq.assignment_id}`);
    console.log(`  Date: ${leaveReq.scheduled_date}`);
    console.log(`  Shift: ${leaveReq.shift_id}`);
    
    // 3. Find available replacements
    console.log('\n3️⃣  Finding available replacements...');
    const availableReplacements = await client.query(`
      SELECT 
        e.id,
        u.full_name,
        e.is_available
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.is_available = true
        AND u.is_active = true
        AND e.id != $1
        AND e.id NOT IN (
          SELECT employee_id 
          FROM schedule_assignments 
          WHERE scheduled_date = $2 AND status = 'ACTIVE'
        )
      LIMIT 5
    `, [leaveReq.employee_id, leaveReq.scheduled_date]);
    
    if (availableReplacements.rows.length === 0) {
      console.log('❌ No available replacements found!');
      console.log('   This could be why the approval button is not working');
      await client.end();
      return;
    }
    
    console.log(`✓ Found ${availableReplacements.rows.length} available replacement(s):`);
    availableReplacements.rows.forEach((emp, idx) => {
      console.log(`  ${idx + 1}. ${emp.full_name} (${emp.id})`);
    });
    
    // 4. Test the approval logic
    console.log('\n4️⃣  Testing approval logic...');
    
    const replacementId = availableReplacements.rows[0].id;
    const replacementName = availableReplacements.rows[0].full_name;
    
    console.log(`  Attempting to approve with replacement: ${replacementName}`);
    
    // Check if replacement already has schedule on that date
    const conflictCheck = await client.query(`
      SELECT COUNT(*) as cnt FROM schedule_assignments 
      WHERE employee_id = $1 AND scheduled_date = $2 AND status = 'ACTIVE'
    `, [replacementId, leaveReq.scheduled_date]);
    
    if (conflictCheck.rows[0].cnt > 0) {
      console.log('  ❌ Conflict: Replacement already has a shift on that date!');
    } else {
      console.log('  ✓ No conflicts - approval should work');
    }
    
    // 5. Check for any constraint issues
    console.log('\n5️⃣  Checking foreign key constraints...');
    
    const fkCheck = await client.query(`
      SELECT constraint_name, table_name, column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'schedule_assignments' 
      ORDER BY constraint_name
    `);
    
    console.log('  Foreign keys in schedule_assignments:');
    fkCheck.rows.forEach(fk => {
      console.log(`    • ${fk.constraint_name}: ${fk.column_name}`);
    });
    
    console.log('\n✅ Testing complete!');
    console.log('\nIf you see "approval should work" above, the API endpoint should be working.');
    console.log('Check browser console for error messages when clicking "Setujui & Tugaskan".');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    await client.end();
  }
}

testApprovalFlow();
