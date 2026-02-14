import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * API endpoint to run database migrations
 * This is safe to run multiple times (idempotent)
 */
export async function POST() {
    try {
        // Add late_minutes column if not exists
        await query(`
      ALTER TABLE attendance_logs 
      ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0
    `);

        // Add index for faster status queries
        await query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_logs_status ON attendance_logs(status)
    `);

        return NextResponse.json({
            success: true,
            message: 'Migration completed: late_minutes column added to attendance_logs'
        });
    } catch (error: any) {
        console.error('Migration error:', error);

        // Check if column already exists (not an error)
        if (error.message?.includes('already exists')) {
            return NextResponse.json({
                success: true,
                message: 'Column already exists'
            });
        }

        return NextResponse.json({
            error: 'Migration failed',
            details: error.message
        }, { status: 500 });
    }
}
