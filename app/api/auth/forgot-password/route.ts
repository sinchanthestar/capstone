import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email wajib diisi' },
        { status: 400 }
      );
    }

    // Find user by email
    const userRes = await query(
      `SELECT id, full_name FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (userRes.rows.length === 0) {
      // Don't reveal if email exists (security best practice)
      return NextResponse.json(
        { message: 'Jika email terdaftar, link reset akan dikirim' },
        { status: 200 }
      );
    }

    const user = userRes.rows[0];

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to database
    console.log('[ForgotPassword] Creating reset token for user:', user.id);
    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, resetToken, expiresAt]
    );

    // In production, send email with reset link
    // For now, return token (in real scenario, would be sent via email)
    console.log('[ForgotPassword] Reset token created:', {
      user: user.id,
      token: resetToken,
      expiresAt: expiresAt
    });

    // For development: return token directly
    // In production: send via email and return success message
    return NextResponse.json(
      {
        message: 'Link reset kata sandi telah dikirim ke email Anda',
        // In development only - remove in production
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
        resetUrl: process.env.NODE_ENV === 'development'
          ? `/reset-password?token=${resetToken}`
          : undefined
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[ForgotPassword] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
