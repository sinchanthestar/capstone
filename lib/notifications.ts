import { query } from './db';

interface NotificationOptions {
  userId: string;
  type: 'shift_assigned' | 'shift_confirmed' | 'shift_cancelled' | 'schedule_updated' | 'attendance_checkin' | 'attendance_late';
  title: string;
  message?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(options: NotificationOptions) {
  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, $2, $3, $4)`,
      [options.userId, options.type, options.title, options.message || null]
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Notify employee of shift assignment
 */
export async function notifyShiftAssigned(
  userId: string,
  shiftName: string,
  date: string
) {
  await createNotification({
    userId,
    type: 'shift_assigned',
    title: 'New Shift Assigned',
    message: `You have been assigned to ${shiftName} on ${date}`,
  });
}

/**
 * Notify employee of shift confirmation
 */
export async function notifyShiftConfirmed(
  userId: string,
  shiftName: string,
  date: string
) {
  await createNotification({
    userId,
    type: 'shift_confirmed',
    title: 'Shift Confirmed',
    message: `Your ${shiftName} shift on ${date} has been confirmed`,
  });
}

/**
 * Notify employee of shift cancellation
 */
export async function notifyShiftCancelled(
  userId: string,
  shiftName: string,
  date: string
) {
  await createNotification({
    userId,
    type: 'shift_cancelled',
    title: 'Shift Cancelled',
    message: `Your ${shiftName} shift on ${date} has been cancelled`,
  });
}

/**
 * Notify managers of schedule updates
 */
export async function notifyScheduleUpdate(adminId: string, message: string) {
  await createNotification({
    userId: adminId,
    type: 'schedule_updated',
    title: 'Schedule Updated',
    message,
  });
}

/**
 * Notify all admins when an employee checks in
 */
export async function notifyAdminsAttendance(
  employeeName: string,
  shiftName: string,
  checkInTime: string,
  isLate: boolean,
  lateMinutes?: number
) {
  try {
    // Get all admin user IDs
    const adminsResult = await query(
      `SELECT id FROM users WHERE role = 'admin' AND is_active = true`
    );

    const type = isLate ? 'attendance_late' : 'attendance_checkin';
    const title = isLate
      ? `⚠️ Karyawan Terlambat: ${employeeName}`
      : `📋 Konfirmasi Kehadiran: ${employeeName}`;

    const message = isLate
      ? `${employeeName} check-in terlambat ${lateMinutes} menit untuk ${shiftName} pada ${checkInTime}. Menunggu konfirmasi.`
      : `${employeeName} telah check-in untuk ${shiftName} pada ${checkInTime}. Menunggu konfirmasi.`;

    // Create notification for each admin
    for (const admin of adminsResult.rows) {
      await createNotification({
        userId: admin.id,
        type,
        title,
        message,
      });
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}
