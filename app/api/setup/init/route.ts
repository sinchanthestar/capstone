import { NextResponse } from 'next/server';
import { initializeDatabase, checkSetupStatus } from '@/lib/setup';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Check current status if not forced
    if (!force) {
      const currentStatus = await checkSetupStatus();

      // If already initialized, return success
      if (currentStatus.isInitialized) {
        return NextResponse.json(
          { success: true, message: 'Database already initialized' },
          { status: 200 }
        );
      }
    }

    // Initialize database
    const result = await initializeDatabase();

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to initialize database' },
        { status: 500 }
      );
    }

    // Verify initialization
    const newStatus = await checkSetupStatus();

    if (!newStatus.tablesCreated) {
      return NextResponse.json(
        { success: false, error: 'Tables were not created successfully' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema created successfully',
      status: newStatus,
    });
  } catch (error) {
    console.error('[Setup API] Init error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize database',
      },
      { status: 500 }
    );
  }
}
