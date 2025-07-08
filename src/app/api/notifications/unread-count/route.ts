import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { NotificationService } from '@/lib/services/notification.service';

// GET /api/notifications/unread-count - Get unread notifications count
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId') || undefined;

    const count = await NotificationService.getUnreadCount(userId, teamId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return NextResponse.json(
      { error: 'Failed to get unread count' },
      { status: 500 }
    );
  }
}