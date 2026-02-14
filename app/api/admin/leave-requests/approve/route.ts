

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

// POST: Admin menyetujui izin dan memilih pengganti
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
            console.error('[LeaveApprove] Failed to parse body:', e);
            return NextResponse.json(
                { error: 'Format body JSON tidak valid', step },
                { status: 400 }
            );
        }
        
        console.log('[LeaveApprove] Body received:', body);
        const { leaveRequestId, replacementEmployeeId, adminNotes } = body;

        if (!leaveRequestId || !replacementEmployeeId) {
            return NextResponse.json(
                { error: 'Leave request ID dan replacement employee ID wajib diisi', step },
                { status: 400 }
            );
        }

        step = 'get_leave_request';
        // Get leave request details
        const leaveRequest = await queryOne(
            `SELECT lr.*, sa.shift_id, sa.scheduled_date, e.id as original_employee_id
       FROM leave_requests lr
       JOIN schedule_assignments sa ON lr.assignment_id = sa.id
       JOIN employees e ON lr.employee_id = e.id
       WHERE lr.id = $1`,
            [leaveRequestId]
        );

        if (!leaveRequest) {
            console.log('[LeaveApprove] Leave request not found:', leaveRequestId);
            return NextResponse.json({ error: 'Leave request not found', step }, { status: 404 });
        }

        console.log('[LeaveApprove] Leave request found:', leaveRequest);

        if (leaveRequest.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'Pengajuan ini sudah diproses sebelumnya', step },
                { status: 400 }
            );
        }

        // Extract and normalize scheduled date for consistent comparison
        const scheduledDate = leaveRequest.scheduled_date instanceof Date 
            ? leaveRequest.scheduled_date.toISOString().split('T')[0]
            : new Date(leaveRequest.scheduled_date).toISOString().split('T')[0];
        console.log('[LeaveApprove] Normalized scheduled date:', scheduledDate);

        step = 'verify_replacement';
        // Verify replacement employee exists and is available
        const replacementEmployee = await queryOne(
            `SELECT e.id, u.id as user_id, u.full_name 
       FROM employees e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.id = $1 AND e.is_available = true`,
            [replacementEmployeeId]
        );

        if (!replacementEmployee) {
            console.log('[LeaveApprove] Replacement employee not found:', replacementEmployeeId);
            return NextResponse.json(
                { error: 'Karyawan pengganti tidak ditemukan atau tidak tersedia', step },
                { status: 404 }
            );
        }

        step = 'update_leave_request';
        // Update leave request status
        console.log('[LeaveApprove] Updating leave request status to APPROVED');
        await query(
            `UPDATE leave_requests 
       SET status = 'APPROVED', admin_notes = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
            [adminNotes || null, user.id, leaveRequestId]
        );

        step = 'update_original_assignment';
        // Update original schedule assignment to REPLACED
        console.log('[LeaveApprove] Updating original assignment to REPLACED');
        await query(
            `UPDATE schedule_assignments 
       SET status = 'REPLACED', replaced_by_employee_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
            [replacementEmployeeId, leaveRequest.assignment_id]
        );

        step = 'create_replacement_assignment';
        // Create new schedule assignment for replacement employee
        // Use UPSERT to handle case where replacement might already have assignment on same date with same shift
        console.log('[LeaveApprove] Creating replacement assignment for:', {
            employee: replacementEmployeeId,
            shift: leaveRequest.shift_id,
            date: scheduledDate
        });
        
        const newAssignment = await queryOne(
            `INSERT INTO schedule_assignments (employee_id, shift_id, scheduled_date, is_confirmed, replacement_for_id, status)
             VALUES ($1, $2, $3::date, false, $4, 'ACTIVE')
             ON CONFLICT (employee_id, shift_id, scheduled_date) 
             DO UPDATE SET replacement_for_id = EXCLUDED.replacement_for_id, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
             RETURNING id`,
            [replacementEmployeeId, leaveRequest.shift_id, scheduledDate, leaveRequest.assignment_id]
        );

        if (!newAssignment || !newAssignment.id) {
            throw new Error('Failed to create replacement assignment');
        }

        step = 'send_notifications';
        // Get original employee name for notification
        const originalEmployee = await queryOne(
            `SELECT u.full_name FROM employees e JOIN users u ON e.user_id = u.id WHERE e.id = $1`,
            [leaveRequest.original_employee_id]
        );

        // Get shift info for notification
        const shift = await queryOne(
            `SELECT name, start_time, end_time FROM shifts WHERE id = $1`,
            [leaveRequest.shift_id]
        );

        // Send notification to replacement employee
        console.log('[LeaveApprove] Sending notification to replacement employee');
        await createNotification({
            userId: replacementEmployee.user_id,
            type: 'shift_assigned',
            title: 'Anda Ditunjuk Sebagai Pengganti',
            message: `Anda ditunjuk menggantikan ${originalEmployee?.full_name || 'karyawan'} pada shift ${shift?.name || ''} tanggal ${new Date(scheduledDate).toLocaleDateString('id-ID')} (${shift?.start_time || ''} - ${shift?.end_time || ''})`
        });

        console.log('[LeaveApprove] Approval successful');
        return NextResponse.json({
            message: 'Pengajuan izin disetujui dan pengganti telah ditugaskan',
            newAssignmentId: newAssignment.id
        }, { status: 200 });
    } catch (error: any) {
        console.error(`[LeaveApprove] Error at step ${step}:`, error?.message || error);
        if (error?.stack) console.error('[LeaveApprove] Stack:', error.stack);
        
        const errorMessage = error?.message || 'Internal server error';
        return NextResponse.json({
            error: errorMessage,
            step: step
        }, { status: 500 });
    }
}
