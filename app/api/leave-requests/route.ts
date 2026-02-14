

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: Karyawan melihat pengajuan izin sendiri
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = session.user;

        // Get employee ID from user
        const employee = await queryOne(
            'SELECT id FROM employees WHERE user_id = $1',
            [user.id]
        );

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Fetch leave requests for this employee
        const result = await query(
            `SELECT 
        lr.id,
        lr.reason,
        lr.status,
        lr.admin_notes,
        lr.created_at,
        lr.updated_at,
        sa.scheduled_date,
        s.name as shift_name,
        s.start_time,
        s.end_time,
        s.color,
        u.full_name as approved_by_name
      FROM leave_requests lr
      JOIN schedule_assignments sa ON lr.assignment_id = sa.id
      JOIN shifts s ON sa.shift_id = s.id
      LEFT JOIN users u ON lr.approved_by = u.id
      WHERE lr.employee_id = $1
      ORDER BY lr.created_at DESC`,
            [employee.id]
        );

        return NextResponse.json({ leaveRequests: result.rows });
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Karyawan mengajukan izin
export async function POST(request: NextRequest) {
    let step = 'init';
    try {
        step = 'session_check';
        const session = await getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized', step }, { status: 401 });
        }
        const user = session.user;

        step = 'parse_body';
        let body;
        try {
            body = await request.json();
        } catch (e) {
            console.error('[LeaveRequest] Failed to parse body:', e);
            return NextResponse.json(
                { error: 'Format body JSON tidak valid', step },
                { status: 400 }
            );
        }
        console.log('[LeaveRequest] Body:', body);

        const { assignmentId, reason } = body;

        if (!assignmentId || !reason) {
            return NextResponse.json(
                { error: 'Assignment ID dan alasan wajib diisi', step },
                { status: 400 }
            );
        }

        step = 'get_employee';
        // Get employee ID from user
        const employee = await queryOne(
            'SELECT id FROM employees WHERE user_id = $1',
            [user.id]
        );

        if (!employee) {
            return NextResponse.json({ error: 'Data karyawan tidak ditemukan. Hubungi HR.', step }, { status: 404 });
        }

        step = 'check_assignment';
        // Verify the assignment belongs to this employee
        const assignment = await queryOne(
            'SELECT id, scheduled_date FROM schedule_assignments WHERE id = $1 AND employee_id = $2',
            [assignmentId, employee.id]
        );

        if (!assignment) {
            return NextResponse.json(
                { error: 'Jadwal tidak valid atau bukan milik Anda', step },
                { status: 404 }
            );
        }

        step = 'check_existing';
        // Check if there's already a pending leave request for this assignment
        const existingRequest = await queryOne(
            `SELECT id, status FROM leave_requests WHERE assignment_id = $1 AND status IN ('PENDING', 'APPROVED')`,
            [assignmentId]
        );

        if (existingRequest) {
            return NextResponse.json(
                { error: `Sudah ada pengajuan izin dengan status ${existingRequest.status} untuk jadwal ini`, step },
                { status: 400 }
            );
        }

        step = 'insert_request';
        // Create leave request
        console.log('[LeaveRequest] Creating request with params:', { emp: employee.id, assign: assignmentId, reason });

        const result = await queryOne(
            `INSERT INTO leave_requests (employee_id, assignment_id, reason, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id`,
            [employee.id, assignmentId, reason]
        );

        if (!result || !result.id) {
            throw new Error("Insert returned null or invalid ID");
        }

        step = 'success';
        console.log('[LeaveRequest] Successfully created request:', result.id);
        return NextResponse.json({
            message: 'Pengajuan izin berhasil dikirim',
            leaveRequestId: result.id
        }, { status: 201 });
    } catch (error: any) {
        console.error(`Error creating leave request at step ${step}:`, error?.message || error);
        const errorMessage = error?.message || 'Internal server error';
        const response = {
            error: errorMessage,
            step: step
        };
        if (error?.stack) {
            console.error('Stack:', error.stack);
        }
        return NextResponse.json(response, { status: 500 });
    }
}
