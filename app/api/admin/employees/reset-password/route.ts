import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId, newPassword } = await request.json();

    if (!employeeId || !newPassword) {
      return NextResponse.json(
        { error: 'Employee ID dan password baru wajib diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    // Verify employee exists
    const empRes = await query(
      `SELECT u.id, u.email, u.full_name FROM employees e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.id = $1`,
      [employeeId]
    );

    if (empRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    const emp = empRes.rows[0];

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update user password
    await query(
      `UPDATE users 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newHash, emp.id]
    );

    console.log(`[AdminResetPassword] Admin ${session.user.id} reset password for employee ${emp.email}`);

    return NextResponse.json(
      {
        message: `Kata sandi ${emp.full_name} berhasil direset`,
        email: emp.email,
        temporaryPassword: newPassword
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[AdminResetPassword] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
