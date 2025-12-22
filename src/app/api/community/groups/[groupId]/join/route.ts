import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// POST /api/community/groups/[groupId]/join - Join a group
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

    const supabase = createAdminClient();

    // Check if group exists and get its type
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select('GroupID, Type, Name')
      .eq('GroupID', groupIdNum)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Only public groups can be joined directly
    if (group.Type !== 'public') {
      return NextResponse.json(
        { error: 'Cannot join private groups directly. You need an invitation.' },
        { status: 403 }
      );
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('group_members')
      .select('MembershipID')
      .eq('GroupID', groupIdNum)
      .eq('UserID', userId)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this group' },
        { status: 400 }
      );
    }

    // Add user as member
    const { data: newMembership, error: memberError } = await supabase
      .from('group_members')
      .insert({
        GroupID: groupIdNum,
        UserID: userId,
        Role: 'member'
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error adding member:', memberError);
      return NextResponse.json(
        { error: 'Failed to join group' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      membership: {
        membershipId: newMembership.MembershipID,
        groupId: newMembership.GroupID,
        userId: newMembership.UserID,
        role: newMembership.Role,
        joinedAt: newMembership.JoinedAt
      }
    });
  } catch (error) {
    console.error('Error in POST /api/community/groups/[groupId]/join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

