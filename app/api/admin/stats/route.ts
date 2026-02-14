import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const scheduledRes = await query(
      `SELECT COUNT(*)::int as count
       FROM schedule_assignments
       WHERE scheduled_date = $1`,
      [date]
    );

    const presentRes = await query(
      `SELECT COUNT(DISTINCT employee_id)::int as count
       FROM attendance_logs
       WHERE attendance_date = $1 AND status = 'APPROVED'`,
      [date]
    );

    const leaveRes = await query(
      `SELECT COUNT(DISTINCT lr.employee_id)::int as count
       FROM leave_requests lr
       JOIN schedule_assignments sa ON lr.assignment_id = sa.id
       WHERE lr.status = 'APPROVED'
       AND sa.scheduled_date = $1`,
      [date]
    );

    const scheduled = scheduledRes.rows[0].count;
    const present = presentRes.rows[0].count;
    const leave = leaveRes.rows[0].count;

    const alpha = Math.max(0, scheduled - present - leave);

    return NextResponse.json(
      { date, scheduled, present, leave, alpha },
      { status: 200 }
    );
  } catch (e) {
    console.error('stats error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
