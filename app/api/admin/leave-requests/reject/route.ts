

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

// POST: Admin menolak pengajuan izin
export async function POST(request: NextRequest) {
    let step = 'init';
    try {
        step = 'session_check';
        const session = await getSession();
        if (!session || !session.user || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
            return NextResponse.json({ error: 'Unauthorized', step }, { status: 401 });
        }
        const user = session.user;

        step = 'parse_body';
        let body;
        try {
            body = await request.json();
        } catch (e) {
            console.error('[LeaveReject] Failed to parse body:', e);
            return NextResponse.json(
                { error: 'Format body JSON tidak valid', step },
                { status: 400 }
            );
        }
        
        console.log('[LeaveReject] Body received:', body);
        const { leaveRequestId, adminNotes } = body;

        if (!leaveRequestId) {
            return NextResponse.json(
                { error: 'Leave request ID wajib diisi', step },
                { status: 400 }
            );
        }

        step = 'get_leave_request';
        // Get leave request
        const leaveRequest = await queryOne(
            `SELECT * FROM leave_requests WHERE id = $1`,
            [leaveRequestId]
        );

        if (!leaveRequest) {
            console.log('[LeaveReject] Leave request not found:', leaveRequestId);
            return NextResponse.json({ error: 'Leave request not found', step }, { status: 404 });
        }

        if (leaveRequest.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'Pengajuan ini sudah diproses sebelumnya', step },
                { status: 400 }
            );
        }

        step = 'update_status';
        // Update leave request status to REJECTED
        console.log('[LeaveReject] Updating leave request status to REJECTED');
        await query(
            `UPDATE leave_requests 
       SET status = 'REJECTED', admin_notes = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
            [adminNotes || null, user.id, leaveRequestId]
        );

        console.log('[LeaveReject] Rejection successful');
        return NextResponse.json({
            message: 'Pengajuan izin ditolak'
        }, { status: 200 });
    } catch (error: any) {
        console.error(`[LeaveReject] Error at step ${step}:`, error?.message || error);
        if (error?.stack) console.error('[LeaveReject] Stack:', error.stack);
        
        const errorMessage = error?.message || 'Internal server error';
        return NextResponse.json({
            error: errorMessage,
            step: step
        }, { status: 500 });
    }
}
