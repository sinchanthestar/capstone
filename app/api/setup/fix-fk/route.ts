
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        await query(`
      ALTER TABLE schedule_assignments DROP CONSTRAINT IF EXISTS schedule_assignments_replacement_for_id_fkey;
      
      ALTER TABLE schedule_assignments 
      ADD CONSTRAINT schedule_assignments_replacement_for_id_fkey 
      FOREIGN KEY (replacement_for_id) 
      REFERENCES schedule_assignments(id) 
      ON DELETE SET NULL;
    `);

        return NextResponse.json({ success: true, message: 'Fixed replacement_for_id foreign key constraint' });
    } catch (error: any) {
        console.error('Error fixing FK:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
