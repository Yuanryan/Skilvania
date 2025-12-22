import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/community/messages/[userID] - Get conversation with specific user
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const before = searchParams.get('before'); // For pagination

    const supabase = createAdminClient();

    // Check if users are connected (optional for viewing - intro messages allowed)
    const { data: connection } = await supabase
      .from('buddy_connections')
      .select('ConnectionID, Status')
      .eq('Status', 'accepted')
      .or(`and(RequesterID.eq.${userId},ReceiverID.eq.${otherUserId}),and(RequesterID.eq.${otherUserId},ReceiverID.eq.${userId})`)
      .single();

    const isConnected = !!connection;

    // Get messages between these two users
    let query = supabase
      .from('community_messages')
      .select(`
        MessageID,
        SenderID,
        ReceiverID,
        Content,
        IsRead,
        CreatedAt
      `)
      .or(`and(SenderID.eq.${userId},ReceiverID.eq.${otherUserId}),and(SenderID.eq.${otherUserId},ReceiverID.eq.${userId})`)
      .order('CreatedAt', { ascending: false })
      .limit(limit);

    // Pagination support
    if (before) {
      query = query.lt('CreatedAt', before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Get other user info
    const { data: otherUser } = await supabase
      .from('USER')
      .select('UserID, Username, Level, XP')
      .eq('UserID', otherUserId)
      .single();

    // Mark received messages as read
    const unreadMessageIds = messages
      ?.filter((msg: any) => msg.ReceiverID === userId && !msg.IsRead)
      .map((msg: any) => msg.MessageID) || [];

    if (unreadMessageIds.length > 0) {
      await supabase
        .from('community_messages')
        .update({ IsRead: true })
        .in('MessageID', unreadMessageIds);
    }

    // Format messages
    const formattedMessages = (messages || []).reverse().map((msg: any) => ({
      messageId: msg.MessageID,
      content: msg.Content,
      isFromMe: msg.SenderID === userId,
      isRead: msg.IsRead,
      createdAt: msg.CreatedAt
    }));

    // Calculate remaining intro messages if not connected
    let remainingIntroMessages = null;
    if (!isConnected) {
      const { count: sentCount } = await supabase
        .from('community_messages')
        .select('MessageID', { count: 'exact', head: true })
        .eq('SenderID', userId)
        .eq('ReceiverID', otherUserId);
      
      remainingIntroMessages = Math.max(0, 3 - (sentCount || 0));
    }

    return NextResponse.json({
      messages: formattedMessages,
      otherUser: otherUser ? {
        userID: otherUser.UserID,
        username: otherUser.Username,
        level: otherUser.Level || 1,
        xp: otherUser.XP || 0
      } : null,
      hasMore: messages?.length === limit,
      isConnected,
      remainingIntroMessages
    });
  } catch (error) {
    console.error('Error in GET /api/community/messages/[userID]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

