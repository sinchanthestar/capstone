

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: Admin melihat semua pengajuan izin
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.user || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = session.user;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED

        let queryStr = `
      SELECT 
        lr.id,
        lr.reason,
        lr.status,
        lr.admin_notes,
        lr.created_at,
        lr.updated_at,
        sa.id as assignment_id,
        sa.scheduled_date,
        s.id as shift_id,
        s.name as shift_name,
        s.start_time,
        s.end_time,
        s.color,
        e.id as employee_id,
        u.full_name as employee_name,
        u.email as employee_email,
        approver.full_name as approved_by_name
      FROM leave_requests lr
      JOIN schedule_assignments sa ON lr.assignment_id = sa.id
      JOIN shifts s ON sa.shift_id = s.id
      JOIN employees e ON lr.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN users approver ON lr.approved_by = approver.id
    `;

        const params: string[] = [];
        if (status) {
            queryStr += ` WHERE lr.status = $1`;
            params.push(status);
        }

        queryStr += ` ORDER BY lr.created_at DESC`;

        const result = await query(queryStr, params);

        return NextResponse.json({ leaveRequests: result.rows });
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
