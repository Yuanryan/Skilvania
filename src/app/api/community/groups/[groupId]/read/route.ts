import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// POST /api/community/groups/[groupId]/read - Mark messages as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const groupIdNum = parseInt(groupId);
    if (isNaN(groupIdNum)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const body = await request.json();
    const { lastReadMessageId } = body;

    if (!lastReadMessageId || typeof lastReadMessageId !== 'number') {
      return NextResponse.json(
        { error: 'Valid last read message ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if user is a member of the group
    const { data: membership } = await supabase
      .from('group_members')
      .select('MembershipID')
      .eq('GroupID', groupIdNum)
      .eq('UserID', userId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be a member to mark messages as read' },
        { status: 403 }
      );
    }

    // Verify message exists and belongs to this group
    const { data: message } = await supabase
      .from('group_messages')
      .select('MessageID')
      .eq('MessageID', lastReadMessageId)
      .eq('GroupID', groupIdNum)
      .single();

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Update read status
    const { error: upsertError } = await supabase
      .from('group_message_reads')
      .upsert({
        GroupID: groupIdNum,
        UserID: userId,
        LastReadMessageID: lastReadMessageId,
        LastReadAt: new Date().toISOString()
      }, {
        onConflict: 'GroupID,UserID'
      });

    if (upsertError) {
      console.error('Error updating read status:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update read status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/community/groups/[groupId]/read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

