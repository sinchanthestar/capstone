import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token dan password baru wajib diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password baru minimal 8 karakter' },
        { status: 400 }
      );
    }

    // Find valid reset token
    console.log('[ResetPassword] Looking for token');
    const tokenRes = await query(
      `SELECT user_id FROM password_reset_tokens 
       WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
      [token]
    );

    if (tokenRes.rows.length === 0) {
      console.log('[ResetPassword] Token not found or expired');
      return NextResponse.json(
        { error: 'Token reset tidak valid atau sudah expired' },
        { status: 400 }
      );
    }

    const userId = tokenRes.rows[0].user_id;
    console.log('[ResetPassword] Token valid for user:', userId);

    // Hash new password
    const newHash = await hashPassword(newPassword);

    // Update user password
    await query(
      `UPDATE users 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newHash, userId]
    );

    // Delete used token
    await query(
      `DELETE FROM password_reset_tokens WHERE token = $1`,
      [token]
    );

    console.log('[ResetPassword] Password reset successful for user:', userId);

    return NextResponse.json(
      { message: 'Kata sandi berhasil direset. Silakan login dengan password baru.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
