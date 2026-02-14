// Test API response directly
const { Client } = require('pg');
const http = require('http');

async function testAPIResponse() {
  const client = new Client({ 
    host: 'localhost', 
    user: 'postgres', 
    password: 'koko123', 
    database: 'shift_manager' 
  });

  try {
    await client.connect();
    console.log('=== Testing API Response ===\n');
    
    // Get pending request and replacement
    console.log('1️⃣  Getting test data...');
    const testData = await client.query(`
      SELECT 
        lr.id as leaveRequestId,
        lr.employee_id,
        lr.assignment_id,
        sa.scheduled_date,
        e.id,
        u.full_name
      FROM leave_requests lr
      JOIN schedule_assignments sa ON lr.assignment_id = sa.id
      JOIN employees e ON lr.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE lr.status = 'PENDING'
      LIMIT 1
    `);
    
    if (testData.rows.length === 0) {
      console.log('❌ No pending requests');
      return;
    }
    
    const req = testData.rows[0];
    console.log(`✓ Leave request: ${req.leaveRequestId}`);
    console.log(`  Original employee: ${req.full_name}`);
    
    // Find replacement
    const replData = await client.query(`
      SELECT e.id
      FROM employees e
      WHERE e.is_available = true
        AND e.id != $1
        AND e.id NOT IN (
          SELECT employee_id 
          FROM schedule_assignments 
          WHERE scheduled_date = $2 AND status = 'ACTIVE'
        )
      LIMIT 1
    `, [req.id, req.scheduled_date]);
    
    if (replData.rows.length === 0) {
      console.log('❌ No available replacement');
      return;
    }
    
    const replacementId = replData.rows[0].id;
    console.log(`✓ Replacement found: ${replacementId}\n`);
    
    // Now test the API directly
    console.log('2️⃣  Testing API endpoint (localhost:3000)...');
    console.log(`  Note: Make sure the app is running (pnpm dev)\n`);
    
    const payload = {
      leaveRequestId: req.leaveRequestId,
      replacementEmployeeId: replacementId,
      adminNotes: 'Test approval'
    };
    
    console.log('  Payload to send:');
    console.log('  ', JSON.stringify(payload, null, 2));
    console.log();
    
    // This is just showing what to test, actual HTTP request would need proper auth
    console.log('3️⃣  How to test manually:\n');
    console.log('  Open browser console (F12) and run:');
    console.log('  ```');
    console.log('  fetch("/api/admin/leave-requests/approve", {');
    console.log('    method: "POST",');
    console.log('    headers: { "Content-Type": "application/json" },');
    console.log(`    body: JSON.stringify({`);
    console.log(`      leaveRequestId: "${payload.leaveRequestId}",`);
    console.log(`      replacementEmployeeId: "${payload.replacementEmployeeId}",`);
    console.log(`      adminNotes: "test"`);
    console.log(`    })`);
    console.log('  })');
    console.log('  .then(r => r.text().then(t => ({status: r.status, body: t})))');
    console.log('  .then(d => console.log("Status:", d.status, "Body:", d.body))');
    console.log('  ```\n');
    
    console.log('4️⃣  Check for these issues:\n');
    console.log('  ✓ Server running on http://localhost:3000?');
    console.log('  ✓ No errors in server terminal?');
    console.log('  ✓ Response is valid JSON (not HTML error)?');
    console.log('  ✓ Response status is 200 or 500?');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testAPIResponse();
