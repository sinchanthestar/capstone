import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { assignmentId } = await request.json();

        if (!assignmentId) {
            return NextResponse.json({ error: 'assignmentId required' }, { status: 400 });
        }

        // Try to delete
        const result = await query(
            'DELETE FROM schedule_assignments WHERE id = $1 RETURNING id',
            [assignmentId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Assignment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Assignment deleted successfully',
            deletedId: result.rows[0].id
        });
    } catch (error: any) {
        console.error('Test delete error:', error);
        return NextResponse.json({
            error: error.message,
            code: error.code,
            detail: error.detail,
            constraint: error.constraint
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        // Get a sample assignment to test with
        const assignments = await query(
            'SELECT id, employee_id, shift_id, scheduled_date FROM schedule_assignments LIMIT 5'
        );

        return NextResponse.json({
            assignments: assignments.rows,
            message: 'Use POST with assignmentId to test deletion'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
