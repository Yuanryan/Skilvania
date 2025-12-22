import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/community/groups/[groupId]/members - Get group members
export async function GET(
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

    // Check if group exists
    const { data: group } = await supabase
      .from('study_groups')
      .select('Type')
      .eq('GroupID', groupIdNum)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // For private groups, check if user is a member
    if (group.Type === 'private') {
      const { data: membership } = await supabase
        .from('group_members')
        .select('MembershipID')
        .eq('GroupID', groupIdNum)
        .eq('UserID', userId)
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get all members
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select(`
        MembershipID,
        UserID,
        Role,
        JoinedAt,
        user:UserID (
          UserID,
          Username,
          Level,
          XP
        )
      `)
      .eq('GroupID', groupIdNum)
      .order('Role', { ascending: false }) // Admins first
      .order('JoinedAt', { ascending: true });

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      members: (members || []).map((member: any) => ({
        membershipId: member.MembershipID,
        userId: member.UserID,
        username: member.user?.Username,
        level: member.user?.Level,
        xp: member.user?.XP,
        role: member.Role,
        joinedAt: member.JoinedAt
      }))
    });
  } catch (error) {
    console.error('Error in GET /api/community/groups/[groupId]/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/community/groups/[groupId]/members - Invite/add a member (any member can add)
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
    const { inviteUserId } = body;

    if (!inviteUserId || typeof inviteUserId !== 'number') {
      return NextResponse.json(
        { error: 'Valid user ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if requester is a member of the group
    const { data: membership } = await supabase
      .from('group_members')
      .select('MembershipID')
      .eq('GroupID', groupIdNum)
      .eq('UserID', userId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be a member of the group to add others' },
        { status: 403 }
      );
    }

    // Check if invitee exists
    const { data: inviteeUser } = await supabase
      .from('USER')
      .select('UserID')
      .eq('UserID', inviteUserId)
      .single();

    if (!inviteeUser) {
      return NextResponse.json(
        { error: 'User to invite not found' },
        { status: 404 }
      );
    }

    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('group_members')
      .select('MembershipID')
      .eq('GroupID', groupIdNum)
      .eq('UserID', inviteUserId)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this group' },
        { status: 400 }
      );
    }

    // Add member
    const { data: newMembership, error: addError } = await supabase
      .from('group_members')
      .insert({
        GroupID: groupIdNum,
        UserID: inviteUserId,
        Role: 'member'
      })
      .select()
      .single();

    if (addError) {
      console.error('Error adding member:', addError);
      return NextResponse.json(
        { error: 'Failed to add member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      membership: {
        membershipId: newMembership.MembershipID,
        userId: newMembership.UserID,
        role: newMembership.Role,
        joinedAt: newMembership.JoinedAt
      }
    });
  } catch (error) {
    console.error('Error in POST /api/community/groups/[groupId]/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/community/groups/[groupId]/members?userId=X - Remove a member (any member can remove others)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const removeUserIdStr = searchParams.get('userId');

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

    if (!removeUserIdStr) {
      return NextResponse.json(
        { error: 'User ID to remove is required' },
        { status: 400 }
      );
    }

    const removeUserId = parseInt(removeUserIdStr);
    if (isNaN(removeUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if requester is a member of the group
    const { data: membership } = await supabase
      .from('group_members')
      .select('MembershipID')
      .eq('GroupID', groupIdNum)
      .eq('UserID', userId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be a member of the group to remove others' },
        { status: 403 }
      );
    }

    // Cannot remove yourself this way (use leave endpoint)
    if (removeUserId === userId) {
      return NextResponse.json(
        { error: 'Use the leave endpoint to remove yourself' },
        { status: 400 }
      );
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('GroupID', groupIdNum)
      .eq('UserID', removeUserId);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/community/groups/[groupId]/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

