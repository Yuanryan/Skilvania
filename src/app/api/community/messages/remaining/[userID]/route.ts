import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/community/messages/remaining/[userID] - Check remaining intro messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userID: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { userID } = await params;
    const otherUserId = parseInt(userID, 10);

    if (isNaN(otherUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if users are connected
    const { data: connection } = await supabase
      .from('buddy_connections')
      .select('ConnectionID')
      .eq('Status', 'accepted')
      .or(`and(RequesterID.eq.${userId},ReceiverID.eq.${otherUserId}),and(RequesterID.eq.${otherUserId},ReceiverID.eq.${userId})`)
      .single();

    const isConnected = !!connection;

    // If connected, no limit
    if (isConnected) {
      return NextResponse.json({
        isConnected: true,
        remainingIntroMessages: null,
        canMessage: true
      });
    }

    // Count messages sent from current user to other user
    const { count: sentCount } = await supabase
      .from('community_messages')
      .select('MessageID', { count: 'exact', head: true })
      .eq('SenderID', userId)
      .eq('ReceiverID', otherUserId);

    const remaining = Math.max(0, 3 - (sentCount || 0));

    return NextResponse.json({
      isConnected: false,
      remainingIntroMessages: remaining,
      canMessage: remaining > 0,
      messagesSent: sentCount || 0
    });
  } catch (error) {
    console.error('Error in GET /api/community/messages/remaining/[userID]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

