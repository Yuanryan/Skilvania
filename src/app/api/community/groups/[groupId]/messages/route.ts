import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/community/groups/[groupId]/messages - Get group messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // MessageID to fetch messages before (pagination)

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
        { error: 'You must be a member to view messages' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from('group_messages')
      .select(`
        MessageID,
        GroupID,
        SenderID,
        Content,
        CreatedAt,
        sender:SenderID (
          UserID,
          Username,
          Level,
          AvatarURL
        )
      `)
      .eq('GroupID', groupIdNum)
      .order('CreatedAt', { ascending: false })
      .limit(limit);

    // Add pagination if before is provided
    if (before) {
      const beforeId = parseInt(before);
      if (!isNaN(beforeId)) {
        query = query.lt('MessageID', beforeId);
      }
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Get user's last read message
    const { data: readStatus } = await supabase
      .from('group_message_reads')
      .select('LastReadMessageID')
      .eq('GroupID', groupIdNum)
      .eq('UserID', userId)
      .single();

    const lastReadMessageId = readStatus?.LastReadMessageID || 0;

    // Format messages
    const formattedMessages = (messages || []).map((msg: any) => ({
      messageId: msg.MessageID,
      senderId: msg.SenderID,
      senderUsername: msg.sender?.Username,
      senderLevel: msg.sender?.Level,
      senderAvatarUrl: msg.sender?.AvatarURL || null,
      content: msg.Content,
      createdAt: msg.CreatedAt,
      isFromMe: msg.SenderID === userId,
      isUnread: msg.MessageID > lastReadMessageId
    }));

    return NextResponse.json({
      messages: formattedMessages.reverse(), // Reverse to show oldest first
      hasMore: messages?.length === limit
    });
  } catch (error) {
    console.error('Error in GET /api/community/groups/[groupId]/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/community/groups/[groupId]/messages - Send a message
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
    const { content } = body;

    // Validation
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
        { error: 'You must be a member to send messages' },
        { status: 403 }
      );
    }

    // Create message
    const { data: message, error: createError } = await supabase
      .from('group_messages')
      .insert({
        GroupID: groupIdNum,
        SenderID: userId,
        Content: content.trim()
      })
      .select(`
        MessageID,
        GroupID,
        SenderID,
        Content,
        CreatedAt
      `)
      .single();

    if (createError) {
      console.error('Error creating message:', createError);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    // Update sender's read status to include this new message
    await supabase
      .from('group_message_reads')
      .upsert({
        GroupID: groupIdNum,
        UserID: userId,
        LastReadMessageID: message.MessageID,
        LastReadAt: new Date().toISOString()
      }, {
        onConflict: 'GroupID,UserID'
      });

    return NextResponse.json({
      success: true,
      message: {
        messageId: message.MessageID,
        senderId: message.SenderID,
        content: message.Content,
        createdAt: message.CreatedAt
      }
    });
  } catch (error) {
    console.error('Error in POST /api/community/groups/[groupId]/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

