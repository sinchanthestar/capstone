import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Use Indonesian timezone (UTC+8)
        const now = new Date();
        const indonesiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        const today = indonesiaTime.toISOString().slice(0, 10);

        // Get ALL attendance records for today
        const allToday = await query(
            `SELECT 
        u.full_name,
        al.attendance_date,
        al.check_in_time,
        al.check_out_time,
        al.status,
        CASE 
          WHEN al.check_in_time IS NOT NULL AND al.check_out_time IS NULL THEN 'ACTIVE'
          WHEN al.check_out_time IS NOT NULL THEN 'CHECKED_OUT'
          ELSE 'NO_CHECKIN'
        END as employee_status
       FROM attendance_logs al
       JOIN employees e ON al.employee_id = e.id
       JOIN users u ON e.user_id = u.id
       WHERE al.attendance_date = $1
       ORDER BY al.check_in_time DESC`,
            [today]
        );

        // Count active employees
        const activeCount = allToday.rows.filter(r => r.employee_status === 'ACTIVE').length;

        return NextResponse.json({
            serverTime: now.toISOString(),
            indonesiaTime: indonesiaTime.toISOString(),
            queryDate: today,
            totalRecords: allToday.rows.length,
            activeEmployees: activeCount,
            allRecords: allToday.rows
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
