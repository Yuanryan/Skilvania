import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// POST /api/community/connections/request - Send buddy connection request
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
    const { receiverID } = body;

    // Validation
    if (!receiverID || typeof receiverID !== 'number') {
      return NextResponse.json(
        { error: 'Valid receiverID is required' },
        { status: 400 }
      );
    }

    // Prevent self-connection
    if (receiverID === userId) {
      return NextResponse.json(
        { error: 'Cannot send connection request to yourself' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if receiver exists
    const { data: receiver, error: receiverError } = await supabase
      .from('USER')
      .select('UserID')
      .eq('UserID', receiverID)
      .single();

    if (receiverError || !receiver) {
      return NextResponse.json(
        { error: 'Receiver user not found' },
        { status: 404 }
      );
    }

    // Check for existing connection (in either direction)
    const { data: existingConnection } = await supabase
      .from('buddy_connections')
      .select('ConnectionID, Status, RequesterID, ReceiverID')
      .or(`and(RequesterID.eq.${userId},ReceiverID.eq.${receiverID}),and(RequesterID.eq.${receiverID},ReceiverID.eq.${userId})`)
      .single();

    if (existingConnection) {
      if (existingConnection.Status === 'accepted') {
        return NextResponse.json(
          { error: 'Already connected with this user' },
          { status: 400 }
        );
      } else if (existingConnection.Status === 'pending') {
        return NextResponse.json(
          { error: 'Connection request already sent' },
          { status: 400 }
        );
      } else if (existingConnection.Status === 'rejected') {
        // Allow retry after rejection - update the existing record
        const { data: updatedConnection, error: updateError } = await supabase
          .from('buddy_connections')
          .update({
            RequesterID: userId,
            ReceiverID: receiverID,
            Status: 'pending',
            UpdatedAt: new Date().toISOString()
          })
          .eq('ConnectionID', existingConnection.ConnectionID)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating connection:', updateError);
          return NextResponse.json(
            { error: 'Failed to send connection request' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          connection: updatedConnection
        });
      }
    }

    // Create new connection request
    const { data: newConnection, error: createError } = await supabase
      .from('buddy_connections')
      .insert({
        RequesterID: userId,
        ReceiverID: receiverID,
        Status: 'pending'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating connection:', createError);
      return NextResponse.json(
        { error: 'Failed to send connection request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connection: newConnection
    });
  } catch (error) {
    console.error('Error in POST /api/community/connections/request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

