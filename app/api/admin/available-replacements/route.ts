

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET: Cari karyawan yang tersedia untuk tanggal tertentu
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.user || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = session.user;

        const { searchParams } = new URL(request.url);
        let date = searchParams.get('date');
        const excludeEmployeeId = searchParams.get('excludeEmployeeId');

        if (!date) {
            return NextResponse.json(
                { error: 'Parameter tanggal wajib diisi' },
                { status: 400 }
            );
        }

        // Convert ISO datetime to DATE format if needed
        if (date.includes('T')) {
            date = date.split('T')[0];
        }

        console.log('[AvailableReplacements] Getting replacements for date:', date);

        // Find employees who:
        // 1. Are available (is_available = true)
        // 2. Do NOT have an ACTIVE schedule on this date
        // 3. Are not the original employee (excludeEmployeeId)
        let queryStr = `
        SELECT 
          e.id,
          u.full_name,
          u.email,
          e.department,
          e.position
        FROM employees e
        JOIN users u ON e.user_id = u.id
        WHERE e.is_available = true
          AND u.is_active = true
          AND e.id NOT IN (
            SELECT employee_id 
            FROM schedule_assignments 
            WHERE scheduled_date::text = $1 AND status = 'ACTIVE'
          )
      `;

        const params: (string | null)[] = [date];

        if (excludeEmployeeId) {
            queryStr += ` AND e.id != $2`;
            params.push(excludeEmployeeId);
        }

        queryStr += ` ORDER BY u.full_name`;

        const result = await query(queryStr, params);

        return NextResponse.json({
            availableEmployees: result.rows,
            date: date
        });
    } catch (error) {
        console.error('Error fetching available replacements:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
