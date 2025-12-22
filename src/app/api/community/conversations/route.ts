import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/community/conversations - Get all conversations (DMs + Groups)
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

    // OPTIMIZATION: Fetch DM conversations and group memberships in parallel
    const [dmResult, groupMembershipsResult] = await Promise.all([
      // Get DM conversations - OPTIMIZED: Fetch recent messages and process in memory
      supabase
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
        .limit(200), // Increased limit to ensure we get last message for all conversations
      
      // Get group memberships
      supabase
        .from('group_members')
        .select(`
          GroupID,
          study_groups!inner (
            GroupID,
            Name,
            Type
          )
        `)
        .eq('UserID', userId)
    ]);

    const { data: dmMessages, error: dmError } = dmResult;
    const { data: groupMemberships } = groupMembershipsResult;

    if (dmError) {
      console.error('Error fetching DM messages:', dmError);
    }

    // Group DMs by conversation - only keep the most recent message per conversation
    const dmConversationsMap = new Map();
    if (dmMessages) {
      for (const msg of dmMessages) {
        const otherUserId = msg.SenderID === userId ? msg.ReceiverID : msg.SenderID;
        
        if (!dmConversationsMap.has(otherUserId)) {
          // Handle both array and object cases for Supabase foreign key relationships
          const receiver = Array.isArray(msg.receiver) ? msg.receiver[0] : msg.receiver;
          const sender = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
          
          dmConversationsMap.set(otherUserId, {
            type: 'dm',
            id: otherUserId,
            name: msg.SenderID === userId ? receiver?.Username : sender?.Username,
            lastMessage: {
              content: msg.Content,
              createdAt: msg.CreatedAt,
              isFromMe: msg.SenderID === userId,
              isRead: msg.IsRead
            },
            unreadCount: 0
          });
        }

        // Count unread messages from this user (only count if we haven't already processed this conversation)
        if (msg.ReceiverID === userId && !msg.IsRead) {
          const conv = dmConversationsMap.get(otherUserId);
          conv.unreadCount += 1;
        }
      }
    }

    // Get group conversations (groups user is a member of) - OPTIMIZED
    const groupConversations = [];
    
    if (groupMemberships && groupMemberships.length > 0) {
      const groupIds = groupMemberships.map((m: any) => m.GroupID);
      const groupMap = new Map(groupMemberships.map((m: any) => [m.GroupID, m]));

      // OPTIMIZATION: Fetch all group data in parallel
      const [readStatusesResult, groupMessagesResult, unreadMessagesResult] = await Promise.all([
        // Batch fetch: Get all read statuses at once
        supabase
          .from('group_message_reads')
          .select('GroupID, LastReadMessageID')
          .eq('UserID', userId)
          .in('GroupID', groupIds),
        
        // Batch fetch: Get all recent messages for all groups at once (last 1 per group)
        // We'll fetch more and process in memory to find the last message per group
        supabase
          .from('group_messages')
          .select(`
            MessageID,
            GroupID,
            Content,
            SenderID,
            CreatedAt,
            sender:USER!group_messages_SenderID_fkey (
              Username
            )
          `)
          .in('GroupID', groupIds)
          .order('CreatedAt', { ascending: false })
          .limit(500), // Get enough messages to cover all groups
        
        // Batch fetch: Get all unread messages at once
        supabase
          .from('group_messages')
          .select('MessageID, GroupID, SenderID')
          .in('GroupID', groupIds)
          .neq('SenderID', userId)
      ]);

      const { data: allReadStatuses } = readStatusesResult;
      const { data: allGroupMessages } = groupMessagesResult;
      const { data: allUnreadMessages } = unreadMessagesResult;

      const readStatusMap = new Map(
        (allReadStatuses || []).map((rs: any) => [rs.GroupID, rs.LastReadMessageID || 0])
      );

      // Process messages in memory to find last message per group
      const lastMessageMap = new Map();
      if (allGroupMessages) {
        for (const msg of allGroupMessages) {
          if (!lastMessageMap.has(msg.GroupID)) {
            lastMessageMap.set(msg.GroupID, msg);
          }
        }
      }

      // Count unread messages per group in memory
      const unreadCountMap = new Map<number, number>();
      if (allUnreadMessages) {
        for (const msg of allUnreadMessages) {
          const lastReadId = readStatusMap.get(msg.GroupID) || 0;
          if (msg.MessageID > lastReadId) {
            unreadCountMap.set(msg.GroupID, (unreadCountMap.get(msg.GroupID) || 0) + 1);
          }
        }
      }

      // Build conversations array
      for (const groupId of groupIds) {
        const groupInfo = groupMap.get(groupId);
        const lastMessage = lastMessageMap.get(groupId);
        const unreadCount = unreadCountMap.get(groupId) || 0;

        // Handle both array and object cases for Supabase foreign key relationships
        const sender = lastMessage?.sender 
          ? (Array.isArray(lastMessage.sender) ? lastMessage.sender[0] : lastMessage.sender)
          : null;

        groupConversations.push({
          type: 'group',
          id: groupId,
          name: groupInfo?.study_groups?.Name || 'Unknown Group',
          groupType: groupInfo?.study_groups?.Type || 'public',
          lastMessage: lastMessage ? {
            content: lastMessage.Content,
            createdAt: lastMessage.CreatedAt,
            isFromMe: lastMessage.SenderID === userId,
            senderName: sender?.Username
          } : null,
          unreadCount: unreadCount
        });
      }
    }

    // Combine and sort by last message time
    const allConversations = [
      ...Array.from(dmConversationsMap.values()),
      ...groupConversations
    ].sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || '';
      const bTime = b.lastMessage?.createdAt || '';
      return bTime.localeCompare(aTime);
    });

    return NextResponse.json({
      conversations: allConversations,
      totalUnread: allConversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
    });
  } catch (error) {
    console.error('Error in GET /api/community/conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

