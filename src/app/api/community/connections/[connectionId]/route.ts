import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// PUT /api/community/connections/[connectionId] - Update connection status (accept/reject)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
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

    const { connectionId } = await params;
    const connectionIdNum = parseInt(connectionId, 10);

    if (isNaN(connectionIdNum)) {
      return NextResponse.json(
        { error: 'Invalid connection ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !['accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "accepted" or "rejected"' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get the connection
    const { data: connection, error: fetchError } = await supabase
      .from('buddy_connections')
      .select('ConnectionID, RequesterID, ReceiverID, Status')
      .eq('ConnectionID', connectionIdNum)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Only the receiver can accept/reject
    if (connection.ReceiverID !== userId) {
      return NextResponse.json(
        { error: 'Only the receiver can update connection status' },
        { status: 403 }
      );
    }

    // Check if already processed
    if (connection.Status !== 'pending') {
      return NextResponse.json(
        { error: `Connection already ${connection.Status}` },
        { status: 400 }
      );
    }

    // Update the connection status
    const { data: updatedConnection, error: updateError } = await supabase
      .from('buddy_connections')
      .update({
        Status: status,
        UpdatedAt: new Date().toISOString()
      })
      .eq('ConnectionID', connectionIdNum)
      .select(`
        ConnectionID,
        RequesterID,
        ReceiverID,
        Status,
        CreatedAt,
        UpdatedAt
      `)
      .single();

    if (updateError) {
      console.error('Error updating connection:', updateError);
      return NextResponse.json(
        { error: 'Failed to update connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connection: updatedConnection
    });
  } catch (error) {
    console.error('Error in PUT /api/community/connections/[connectionId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/community/connections/[connectionId] - Remove connection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
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

    const { connectionId } = await params;
    const connectionIdNum = parseInt(connectionId, 10);

    if (isNaN(connectionIdNum)) {
      return NextResponse.json(
        { error: 'Invalid connection ID' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get the connection
    const { data: connection, error: fetchError } = await supabase
      .from('buddy_connections')
      .select('ConnectionID, RequesterID, ReceiverID')
      .eq('ConnectionID', connectionIdNum)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Only requester or receiver can delete
    if (connection.RequesterID !== userId && connection.ReceiverID !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this connection' },
        { status: 403 }
      );
    }

    // Delete the connection
    const { error: deleteError } = await supabase
      .from('buddy_connections')
      .delete()
      .eq('ConnectionID', connectionIdNum);

    if (deleteError) {
      console.error('Error deleting connection:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Connection removed'
    });
  } catch (error) {
    console.error('Error in DELETE /api/community/connections/[connectionId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

