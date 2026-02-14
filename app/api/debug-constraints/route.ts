import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Check all foreign key constraints
        const allConstraints = await query(`
      SELECT
        tc.table_name,
        tc.constraint_name, 
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
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'schedule_assignments'
      ORDER BY tc.table_name;
    `);

        // Get sample data
        const sampleAssignments = await query(`
      SELECT 
        sa.id,
        sa.scheduled_date,
        sa.replacement_for_id,
        sa.replaced_by_employee_id,
        COUNT(lr.id) as leave_request_count,
        COUNT(ssr.id) as swap_request_count,
        COUNT(al.id) as attendance_log_count
      FROM schedule_assignments sa
      LEFT JOIN leave_requests lr ON lr.assignment_id = sa.id
      LEFT JOIN shift_swap_requests ssr ON ssr.assignment_id = sa.id
      LEFT JOIN attendance_logs al ON al.schedule_assignment_id = sa.id
      GROUP BY sa.id
      LIMIT 5
    `);

        return NextResponse.json({
            constraintsReferencingScheduleAssignments: allConstraints.rows,
            sampleAssignments: sampleAssignments.rows,
            summary: {
                totalConstraints: allConstraints.rows.length,
                noActionConstraints: allConstraints.rows.filter((c: any) => c.delete_rule === 'NO ACTION').length,
                cascadeConstraints: allConstraints.rows.filter((c: any) => c.delete_rule === 'CASCADE').length,
                setNullConstraints: allConstraints.rows.filter((c: any) => c.delete_rule === 'SET NULL').length,
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
