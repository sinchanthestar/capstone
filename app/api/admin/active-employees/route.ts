import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'admin' && session.user.role !== 'manager') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Use Indonesian timezone (UTC+8)
        const now = new Date();
        const indonesiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        const today = indonesiaTime.toISOString().slice(0, 10);

        console.log('Active employees query - today:', today);

        // Get all employees who are currently checked-in (no check-out time)
        const result = await query(
            `SELECT 
        e.id as employee_id,
        u.full_name,
        COALESCE(s.name, 'No Shift') as shift_name,
        COALESCE(s.color, '#6B7280') as shift_color,
        al.check_in_time,
        al.attendance_date as scheduled_date,
        al.status
       FROM attendance_logs al
       JOIN employees e ON al.employee_id = e.id
       JOIN users u ON e.user_id = u.id
       LEFT JOIN schedule_assignments sa ON al.schedule_assignment_id = sa.id
       LEFT JOIN shifts s ON sa.shift_id = s.id
       WHERE al.attendance_date = $1
       AND al.check_in_time IS NOT NULL
       AND al.check_out_time IS NULL
       ORDER BY al.check_in_time ASC`,
            [today]
        );

        console.log('Active employees found:', result.rows.length);

        return NextResponse.json({
            employees: result.rows,
            count: result.rows.length,
            date: today,
            debug: {
                serverTime: now.toISOString(),
                indonesiaTime: indonesiaTime.toISOString(),
                queryDate: today
            }
        });
    } catch (error: any) {
        console.error('Error fetching active employees:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
