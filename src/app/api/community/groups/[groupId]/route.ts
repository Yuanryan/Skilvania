import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/community/groups/[groupId] - Get group details
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

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .select(`
        GroupID,
        Name,
        Description,
        Type,
        TagID,
        CreatorID,
        CreatedAt,
        UpdatedAt,
        tag:TagID (
          TagID,
          Name
        )
      `)
      .eq('GroupID', groupIdNum)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user has access (public groups or member of private group)
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

    // Get member count
    const { count: memberCount } = await supabase
      .from('group_members')
      .select('MembershipID', { count: 'exact', head: true })
      .eq('GroupID', groupIdNum);

    // Get user's membership status
    const { data: userMembership } = await supabase
      .from('group_members')
      .select('Role, JoinedAt')
      .eq('GroupID', groupIdNum)
      .eq('UserID', userId)
      .single();

    return NextResponse.json({
      group: {
        groupId: group.GroupID,
        name: group.Name,
        description: group.Description,
        type: group.Type,
        tagId: group.TagID,
        tagName: group.tag?.Name || null,
        creatorId: group.CreatorID,
        memberCount: memberCount || 0,
        isMember: !!userMembership,
        userRole: userMembership?.Role || null,
        joinedAt: userMembership?.JoinedAt || null,
        createdAt: group.CreatedAt,
        updatedAt: group.UpdatedAt
      }
    });
  } catch (error) {
    console.error('Error in GET /api/community/groups/[groupId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/community/groups/[groupId] - Update group (admin only)
export async function PUT(
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
    const { name, description, type } = body;

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Group name cannot be empty' },
          { status: 400 }
        );
      }
      if (name.trim().length > 100) {
        return NextResponse.json(
          { error: 'Group name too long (max 100 characters)' },
          { status: 400 }
        );
      }
    }

    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Invalid description format' },
        { status: 400 }
      );
    }

    if (type !== undefined) {
      if (type !== 'public' && type !== 'private') {
        return NextResponse.json(
          { error: 'Invalid group type. Must be "public" or "private"' },
          { status: 400 }
        );
      }
      
      // Check if group has a TagID (tag-based groups cannot change type)
      const { data: currentGroup } = await supabase
        .from('study_groups')
        .select('TagID')
        .eq('GroupID', groupIdNum)
        .single();

      if (currentGroup?.TagID) {
        return NextResponse.json(
          { error: 'Cannot change type of tag-based public groups' },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();

    // Check if user is admin of the group
    const { data: membership } = await supabase
      .from('group_members')
      .select('Role')
      .eq('GroupID', groupIdNum)
      .eq('UserID', userId)
      .single();

    if (!membership || membership.Role !== 'admin') {
      return NextResponse.json(
        { error: 'Only group admins can update the group' },
        { status: 403 }
      );
    }

    // Update the group
    const updateData: any = {};
    if (name !== undefined) updateData.Name = name.trim();
    if (description !== undefined) updateData.Description = description.trim() || null;
    if (type !== undefined) updateData.Type = type;

    const { data: updatedGroup, error: updateError } = await supabase
      .from('study_groups')
      .update(updateData)
      .eq('GroupID', groupIdNum)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating group:', updateError);
      return NextResponse.json(
        { error: 'Failed to update group' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      group: {
        groupId: updatedGroup.GroupID,
        name: updatedGroup.Name,
        description: updatedGroup.Description,
        type: updatedGroup.Type,
        updatedAt: updatedGroup.UpdatedAt
      }
    });
  } catch (error) {
    console.error('Error in PUT /api/community/groups/[groupId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/community/groups/[groupId] - Delete group (admin only)
export async function DELETE(
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

    // Check if user is admin of the group
    const { data: membership } = await supabase
      .from('group_members')
      .select('Role')
      .eq('GroupID', groupIdNum)
      .eq('UserID', userId)
      .single();

    if (!membership || membership.Role !== 'admin') {
      return NextResponse.json(
        { error: 'Only group admins can delete the group' },
        { status: 403 }
      );
    }

    // Check if it's a public group (cannot be deleted)
    const { data: group } = await supabase
      .from('study_groups')
      .select('Type')
      .eq('GroupID', groupIdNum)
      .single();

    if (group?.Type === 'public') {
      return NextResponse.json(
        { error: 'Public groups cannot be deleted' },
        { status: 403 }
      );
    }

    // Delete the group (cascade will handle members and messages)
    const { error: deleteError } = await supabase
      .from('study_groups')
      .delete()
      .eq('GroupID', groupIdNum);

    if (deleteError) {
      console.error('Error deleting group:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete group' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/community/groups/[groupId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

