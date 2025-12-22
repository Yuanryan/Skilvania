import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/community/connections - Get user's connections
// Optional query param: ?status=pending|accepted|rejected
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

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status'); // 'pending', 'accepted', 'rejected'

    const supabase = createAdminClient();

    // Build query - get connections where user is either requester or receiver
    let query = supabase
      .from('buddy_connections')
      .select(`
        ConnectionID,
        RequesterID,
        ReceiverID,
        Status,
        CreatedAt,
        UpdatedAt,
        requester:USER!buddy_connections_RequesterID_fkey (
          UserID,
          Username,
          Level,
          XP
        ),
        receiver:USER!buddy_connections_ReceiverID_fkey (
          UserID,
          Username,
          Level,
          XP
        )
      `)
      .or(`RequesterID.eq.${userId},ReceiverID.eq.${userId}`)
      .order('CreatedAt', { ascending: false });

    // Apply status filter if provided
    if (statusFilter && ['pending', 'accepted', 'rejected'].includes(statusFilter)) {
      query = query.eq('Status', statusFilter);
    }

    const { data: connections, error: connectionsError } = await query;

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    // Format connections to include the "other user" and direction
    const formattedConnections = (connections || []).map((conn: any) => {
      const isRequester = conn.RequesterID === userId;
      const otherUser = isRequester ? conn.receiver : conn.requester;
      
      return {
        connectionId: conn.ConnectionID,
        status: conn.Status,
        direction: isRequester ? 'sent' : 'received',
        createdAt: conn.CreatedAt,
        updatedAt: conn.UpdatedAt,
        user: {
          userID: otherUser.UserID,
          username: otherUser.Username,
          level: otherUser.Level || 1,
          xp: otherUser.XP || 0
        }
      };
    });

    // Categorize connections
    const categorized = {
      accepted: formattedConnections.filter(c => c.status === 'accepted'),
      pendingSent: formattedConnections.filter(c => c.status === 'pending' && c.direction === 'sent'),
      pendingReceived: formattedConnections.filter(c => c.status === 'pending' && c.direction === 'received'),
      rejected: formattedConnections.filter(c => c.status === 'rejected')
    };

    return NextResponse.json({
      connections: formattedConnections,
      categorized,
      counts: {
        total: formattedConnections.length,
        accepted: categorized.accepted.length,
        pendingSent: categorized.pendingSent.length,
        pendingReceived: categorized.pendingReceived.length,
        rejected: categorized.rejected.length
      }
    });
  } catch (error) {
    console.error('Error in GET /api/community/connections:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

