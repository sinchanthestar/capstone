
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function check() {
    const client = await pool.connect();
    try {
        console.log('--- CHECKING EMPLOYEES ---');
        const employees = await client.query('SELECT id, is_available FROM employees');
        console.log(`Total employees: ${employees.rows.length}`);
        console.log(`Available employees: ${employees.rows.filter(e => e.is_available).length}`);

        console.log('\n--- CHECKING SHIFTS ---');
        const shifts = await client.query('SELECT id, name, is_active FROM shifts');
        console.log(`Total shifts: ${shifts.rows.length}`);
        console.log(`Active shifts: ${shifts.rows.filter(s => s.is_active).length}`);

        console.log('\n--- CHECKING ATTENDANCE_LOGS CONSTRAINTS ---');
        const constraints = await client.query(`
      SELECT
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='attendance_logs';
    `);

        if (constraints.rows.length === 0) {
            console.log('No foreign keys found for attendance_logs (or table does not exist).');
            // Check if table exists
            const tableExists = await client.query("SELECT to_regclass('public.attendance_logs')");
            console.log(`Table exists: ${!!tableExists.rows[0].to_regclass}`);
        } else {
            constraints.rows.forEach(row => {
                console.log(`Constraint: ${row.constraint_name} on ${row.column_name} references ${row.foreign_table_name}(${row.foreign_column_name}) ON DELETE ${row.delete_rule}`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

check();
