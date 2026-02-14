import bcrypt from 'bcrypt';
import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

// Cost factor for bcrypt (12 rounds is recommended for security/performance balance)
const BCRYPT_ROUNDS = 12;

/**
 * Hash password using bcrypt
 * More secure than PBKDF2 with automatic salt handling
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Support legacy PBKDF2 hashes (format: salt:hash)
  if (hash.includes(':')) {
    // Legacy PBKDF2 format - for backward compatibility
    const crypto = await import('crypto');
    const [salt, storedHash] = hash.split(':');
    const hashBuffer = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');
    return hashBuffer === storedHash;
  }

  // New bcrypt format
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export async function generateToken(user: User, expiresIn: number = 24 * 60 * 60): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(SECRET);
  return token;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<{ user: User } | null> {
  try {
    const verified = await jwtVerify(token, SECRET);
    return verified.payload as { user: User };
  } catch (error) {
    return null;
  }
}

/**
 * Get current session from cookies
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }

    return {
      user: payload.user,
      token,
      expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  });
}

/**
 * Clear authentication cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('authToken');
}
