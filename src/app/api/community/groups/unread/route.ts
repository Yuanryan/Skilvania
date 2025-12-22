import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/community/groups/unread - Get unread group messages count
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const supabase = createAdminClient();

    // Get all groups user is a member of
    const { data: memberships } = await supabase
      .from('group_members')
      .select('GroupID')
      .eq('UserID', userId);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ unreadCount: 0 });
    }

    const groupIds = memberships.map((m: any) => m.GroupID);

    // Get user's read status for each group
    const { data: readStatuses } = await supabase
      .from('group_message_reads')
      .select('GroupID, LastReadMessageID')
      .eq('UserID', userId)
      .in('GroupID', groupIds);

    const readStatusMap = new Map<number, number>();
    readStatuses?.forEach((status: any) => {
      readStatusMap.set(status.GroupID, status.LastReadMessageID || 0);
    });

    // Count unread messages across all groups
    let totalUnread = 0;

    for (const groupId of groupIds) {
      const lastReadMessageId = readStatusMap.get(groupId) || 0;
      
      const { count } = await supabase
        .from('group_messages')
        .select('MessageID', { count: 'exact', head: true })
        .eq('GroupID', groupId)
        .neq('SenderID', userId) // Don't count own messages
        .gt('MessageID', lastReadMessageId);

      totalUnread += count || 0;
    }

    return NextResponse.json({ unreadCount: totalUnread });
  } catch (error) {
    console.error('Error in GET /api/community/groups/unread:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

