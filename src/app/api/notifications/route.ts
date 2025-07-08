import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { NotificationService } from '@/lib/services/notification.service';
import { z } from 'zod';

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const result = await NotificationService.getNotifications({
      userId,
      teamId,
      limit,
      offset,
      unreadOnly,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return NextResponse.json(
      { error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Send notification (admin/system use)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    const schema = z.object({
      targetUserId: z.string(),
      teamId: z.string().optional(),
      title: z.string(),
      body: z.string(),
      type: z.enum([
        'POST_SCHEDULED',
        'POST_PUBLISHED',
        'POST_FAILED',
        'COMMENT_RECEIVED',
        'APPROVAL_NEEDED',
        'APPROVAL_APPROVED',
        'APPROVAL_REJECTED',
        'TOKEN_EXPIRED',
        'ACCOUNT_DISCONNECTED',
        'TEAM_MEMBER_JOINED',
        'TEAM_MEMBER_LEFT',
        'TEAM_INVITATION',
        'WORKFLOW_ASSIGNED',
        'ANALYTICS_READY',
        'SYSTEM_MAINTENANCE',
      ]),
      link: z.string().optional(),
      metadata: z.record(z.any()).optional(),
      expiresAt: z.string().datetime().optional(),
    });

    const validatedData = schema.parse(body);

    await NotificationService.send({
      userId: validatedData.targetUserId,
      teamId: validatedData.teamId,
      title: validatedData.title,
      body: validatedData.body,
      type: validatedData.type,
      link: validatedData.link,
      metadata: validatedData.metadata,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}