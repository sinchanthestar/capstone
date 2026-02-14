import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { notifyAdminsAttendance } from '@/lib/notifications';

// Toleransi keterlambatan dalam menit (bisa diubah sesuai kebijakan)
const LATE_TOLERANCE_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Pastikan role employee
    if (session.user.role !== 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ambil employee_id dari user_id
    const empRes = await query(
      `SELECT id FROM employees WHERE user_id = $1`,
      [session.user.id]
    );
    if (empRes.rows.length === 0) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }
    const employeeId = empRes.rows[0].id;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const now = new Date();

    // VALIDASI: Cek apakah ada jadwal untuk hari ini dan ambil info shift
    const scheduleCheck = await query(
      `SELECT sa.id, s.start_time, s.name as shift_name
       FROM schedule_assignments sa
       JOIN shifts s ON sa.shift_id = s.id
       WHERE sa.employee_id = $1 AND sa.scheduled_date = $2
       LIMIT 1`,
      [employeeId, today]
    );

    if (scheduleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki jadwal kerja untuk hari ini. Hubungi manajer Anda.' },
        { status: 403 }
      );
    }

    const assignmentId = scheduleCheck.rows[0].id;
    const shiftStartTime = scheduleCheck.rows[0].start_time; // Format: HH:MM:SS
    const shiftName = scheduleCheck.rows[0].shift_name;

    // Cek sudah check-in hari ini belum
    const exist = await query(
      `SELECT id, status, check_in_at FROM attendance_logs
       WHERE employee_id=$1 AND attendance_date=$2
       ORDER BY created_at DESC
       LIMIT 1`,
      [employeeId, today]
    );

    if (exist.rows.length > 0 && exist.rows[0].check_in_at) {
      return NextResponse.json({ error: 'Already checked in today' }, { status: 400 });
    }

    // Hitung apakah terlambat
    // Parse shift start time (format HH:MM:SS)
    const [shiftHour, shiftMinute] = shiftStartTime.split(':').map(Number);
    const shiftStartDate = new Date(now);
    shiftStartDate.setHours(shiftHour, shiftMinute, 0, 0);

    // Tambahkan toleransi
    const lateThreshold = new Date(shiftStartDate);
    lateThreshold.setMinutes(lateThreshold.getMinutes() + LATE_TOLERANCE_MINUTES);

    // Tentukan status berdasarkan waktu check-in
    let status = 'PENDING'; // Default: tepat waktu, masih pending approval
    let lateMinutes = 0;

    if (now > lateThreshold) {
      status = 'LATE';
      lateMinutes = Math.floor((now.getTime() - shiftStartDate.getTime()) / 60000);
    }

    const insert = await query(
      `INSERT INTO attendance_logs (employee_id, schedule_assignment_id, attendance_date, check_in_at, status, late_minutes)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
       RETURNING id`,
      [employeeId, assignmentId, today, status, lateMinutes]
    );

    // Kirim notifikasi ke semua admin
    const checkInTimeStr = now.toTimeString().slice(0, 5);
    notifyAdminsAttendance(
      session.user.fullName,
      shiftName,
      checkInTimeStr,
      status === 'LATE',
      lateMinutes > 0 ? lateMinutes : undefined
    ).catch(err => console.error('Failed to notify admins:', err));

    // Response dengan info keterlambatan
    const response: any = {
      id: insert.rows[0].id,
      status,
      shift: shiftName,
      shiftStartTime: shiftStartTime.slice(0, 5), // HH:MM
      checkInTime: checkInTimeStr
    };

    if (status === 'LATE') {
      response.lateMinutes = lateMinutes;
      response.message = `Anda terlambat ${lateMinutes} menit dari jadwal shift ${shiftName} (${shiftStartTime.slice(0, 5)})`;
    } else {
      response.message = `Check-in berhasil untuk shift ${shiftName}`;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (e) {
    console.error('check-in error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
