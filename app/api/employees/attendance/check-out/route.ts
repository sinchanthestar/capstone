import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Toleransi checkout lebih awal dalam menit (0 = harus tepat waktu atau lewat)
const EARLY_CHECKOUT_TOLERANCE_MINUTES = 0;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (session.user.role !== 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const empRes = await query(`SELECT id FROM employees WHERE user_id = $1`, [session.user.id]);
    if (empRes.rows.length === 0) return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    const employeeId = empRes.rows[0].id;

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    // Cari log hari ini terbaru yang sudah check-in, termasuk info shift
    const logRes = await query(
      `SELECT al.id, al.check_in_at, al.check_out_at, al.schedule_assignment_id,
              s.start_time, s.end_time, s.name as shift_name
       FROM attendance_logs al
       LEFT JOIN schedule_assignments sa ON al.schedule_assignment_id = sa.id
       LEFT JOIN shifts s ON sa.shift_id = s.id
       WHERE al.employee_id=$1 AND al.attendance_date=$2
       ORDER BY al.created_at DESC
       LIMIT 1`,
      [employeeId, today]
    );

    if (logRes.rows.length === 0 || !logRes.rows[0].check_in_at) {
      return NextResponse.json({ error: 'Belum ada check-in untuk hari ini' }, { status: 400 });
    }
    if (logRes.rows[0].check_out_at) {
      return NextResponse.json({ error: 'Anda sudah check-out hari ini' }, { status: 400 });
    }

    // Validasi waktu check-out terhadap jam pulang shift
    const shiftEndTime = logRes.rows[0].end_time;
    const shiftStartTime = logRes.rows[0].start_time;
    const shiftName = logRes.rows[0].shift_name || 'shift';

    if (shiftEndTime) {
      // Parse shift end time (format HH:MM:SS)
      const [endHour, endMinute] = shiftEndTime.split(':').map(Number);
      const shiftEndDate = new Date(now);
      shiftEndDate.setHours(endHour, endMinute, 0, 0);

      // Handle overnight shift (shift yang berakhir di hari berikutnya)
      // Jika end_time <= start_time, berarti shift melewati tengah malam
      if (shiftStartTime) {
        const [startHour] = shiftStartTime.split(':').map(Number);
        // Jika jam selesai lebih kecil dari jam mulai, shift overnight
        // Contoh: 16:00 - 00:00 atau 22:00 - 06:00
        if (endHour <= startHour && endHour < 12) {
          // Jika sekarang masih sebelum tengah malam, end time adalah besok
          if (now.getHours() >= startHour) {
            shiftEndDate.setDate(shiftEndDate.getDate() + 1);
          }
          // Jika sekarang sudah lewat tengah malam (pagi), end time adalah hari ini
          // (tidak perlu modifikasi)
        }
      }

      // Kurangi toleransi (jika ada)
      shiftEndDate.setMinutes(shiftEndDate.getMinutes() - EARLY_CHECKOUT_TOLERANCE_MINUTES);

      if (now < shiftEndDate) {
        // Hitung berapa menit lagi bisa checkout
        const minutesRemaining = Math.ceil((shiftEndDate.getTime() - now.getTime()) / 60000);
        const hoursRemaining = Math.floor(minutesRemaining / 60);
        const minsRemaining = minutesRemaining % 60;

        const timeMessage = hoursRemaining > 0
          ? `${hoursRemaining} jam ${minsRemaining} menit`
          : `${minsRemaining} menit`;

        return NextResponse.json({
          error: `Belum waktunya pulang. Shift ${shiftName} berakhir pukul ${shiftEndTime.slice(0, 5)}. Tunggu ${timeMessage} lagi.`,
          shiftEndTime: shiftEndTime.slice(0, 5),
          minutesRemaining
        }, { status: 400 });
      }
    }

    await query(
      `UPDATE attendance_logs
       SET check_out_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, status='PENDING'
       WHERE id=$1`,
      [logRes.rows[0].id]
    );

    return NextResponse.json({
      ok: true,
      status: 'PENDING',
      message: `Check-out berhasil untuk ${shiftName}`,
      checkOutTime: now.toTimeString().slice(0, 5)
    }, { status: 200 });
  } catch (e) {
    console.error('check-out error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

