import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// POST /api/community/messages - Send a message
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromSession(session.user.id);
    if (userId === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { receiverID, content } = body;

    // Validation
    if (!receiverID || typeof receiverID !== 'number') {
      return NextResponse.json(
        { error: 'Valid receiverID is required' },
        { status: 400 }
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    if (content.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    // Prevent self-messaging
    if (receiverID === userId) {
      return NextResponse.json(
        { error: 'Cannot send message to yourself' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if users are connected (accepted buddies)
    const { data: connection } = await supabase
      .from('buddy_connections')
      .select('ConnectionID')
      .eq('Status', 'accepted')
      .or(`and(RequesterID.eq.${userId},ReceiverID.eq.${receiverID}),and(RequesterID.eq.${receiverID},ReceiverID.eq.${userId})`)
      .single();

    // If not connected, check intro message limit (3 messages max before connection)
    if (!connection) {
      const { count: sentCount } = await supabase
        .from('community_messages')
        .select('MessageID', { count: 'exact', head: true })
        .eq('SenderID', userId)
        .eq('ReceiverID', receiverID);

      if ((sentCount || 0) >= 3) {
        return NextResponse.json(
          { error: 'You can only send 3 intro messages before connecting. Send a connection request to continue messaging!' },
          { status: 403 }
        );
      }
    }

    // Create message
    const { data: message, error: createError } = await supabase
      .from('community_messages')
      .insert({
        SenderID: userId,
        ReceiverID: receiverID,
        Content: content.trim(),
        IsRead: false
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating message:', createError);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error in POST /api/community/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/community/messages - Get unread count and recent conversations
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

    // Get unread message count
    const { count: unreadCount, error: countError } = await supabase
      .from('community_messages')
      .select('MessageID', { count: 'exact', head: true })
      .eq('ReceiverID', userId)
      .eq('IsRead', false);

    if (countError) {
      console.error('Error counting unread messages:', countError);
    }

    // Get recent conversations (last message with each user)
    const { data: messages, error: messagesError } = await supabase
      .from('community_messages')
      .select(`
        MessageID,
        SenderID,
        ReceiverID,
        Content,
        IsRead,
        CreatedAt,
        sender:USER!community_messages_SenderID_fkey (
          UserID,
          Username
        ),
        receiver:USER!community_messages_ReceiverID_fkey (
          UserID,
          Username
        )
      `)
      .or(`SenderID.eq.${userId},ReceiverID.eq.${userId}`)
      .order('CreatedAt', { ascending: false })
      .limit(100);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Group by conversation and get last message
    const conversationsMap = new Map();
    
    messages?.forEach((msg: any) => {
      const otherUserId = msg.SenderID === userId ? msg.ReceiverID : msg.SenderID;
      
      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          userID: otherUserId,
          username: msg.SenderID === userId ? msg.receiver.Username : msg.sender.Username,
          lastMessage: {
            content: msg.Content,
            createdAt: msg.CreatedAt,
            isFromMe: msg.SenderID === userId,
            isRead: msg.IsRead
          },
          unreadCount: 0
        });
      }

      // Count unread messages from this user
      if (msg.ReceiverID === userId && !msg.IsRead) {
        const conv = conversationsMap.get(otherUserId);
        conv.unreadCount += 1;
      }
    });

    const conversations = Array.from(conversationsMap.values());

    return NextResponse.json({
      unreadCount: unreadCount || 0,
      conversations
    });
  } catch (error) {
    console.error('Error in GET /api/community/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

