import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/community/groups - List all groups (public + user's private groups)
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

    // Get all public groups
    const { data: publicGroups, error: publicError } = await supabase
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
      .eq('Type', 'public')
      .order('Name');

    if (publicError) {
      console.error('Error fetching public groups:', publicError);
      return NextResponse.json(
        { error: 'Failed to fetch public groups' },
        { status: 500 }
      );
    }

    // First, get the group IDs the user is a member of
    const { data: userMemberships, error: membershipError } = await supabase
      .from('group_members')
      .select('GroupID')
      .eq('UserID', userId);

    if (membershipError) {
      console.error('Error fetching user memberships:', membershipError);
    }

    // Get user's private groups (groups they are members of)
    let privateGroups: any[] = [];
    if (userMemberships && userMemberships.length > 0) {
      const userGroupIds = userMemberships.map((m: any) => m.GroupID);
      
      const { data: privateGroupsData, error: privateError } = await supabase
        .from('study_groups')
        .select(`
          GroupID,
          Name,
          Description,
          Type,
          TagID,
          CreatorID,
          CreatedAt,
          UpdatedAt
        `)
        .eq('Type', 'private')
        .in('GroupID', userGroupIds);

      if (privateError) {
        console.error('Error fetching private groups:', privateError);
        // Don't fail completely if private groups fail
      } else {
        privateGroups = privateGroupsData || [];
      }
    }

    // Get member counts for all groups
    const allGroupIds = [
      ...(publicGroups || []).map((g: any) => g.GroupID),
      ...privateGroups.map((g: any) => g.GroupID)
    ];

    let memberCountMap = new Map<number, number>();
    let membershipMap = new Map<number, { isMember: boolean; role: string | null }>();

    if (allGroupIds.length > 0) {
      const { data: memberCounts } = await supabase
        .from('group_members')
        .select('GroupID')
        .in('GroupID', allGroupIds);

      // Count members per group
      memberCounts?.forEach((member: any) => {
        memberCountMap.set(
          member.GroupID, 
          (memberCountMap.get(member.GroupID) || 0) + 1
        );
      });

      // Get user's membership status for all groups (with roles)
      const { data: userMembershipsWithRoles } = await supabase
        .from('group_members')
        .select('GroupID, Role')
        .eq('UserID', userId)
        .in('GroupID', allGroupIds);

      userMembershipsWithRoles?.forEach((membership: any) => {
        membershipMap.set(membership.GroupID, {
          isMember: true,
          role: membership.Role
        });
      });
    }

    // Format groups with additional data
    const formatGroup = (group: any) => ({
      groupId: group.GroupID,
      name: group.Name,
      description: group.Description,
      type: group.Type,
      tagId: group.TagID,
      tagName: group.tag?.Name || null,
      creatorId: group.CreatorID,
      memberCount: memberCountMap.get(group.GroupID) || 0,
      isMember: membershipMap.get(group.GroupID)?.isMember || false,
      userRole: membershipMap.get(group.GroupID)?.role || null,
      createdAt: group.CreatedAt,
      updatedAt: group.UpdatedAt
    });

    return NextResponse.json({
      publicGroups: (publicGroups || []).map(formatGroup),
      privateGroups: (privateGroups || []).map(formatGroup)
    });
  } catch (error) {
    console.error('Error in GET /api/community/groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/community/groups - Create a private group
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
    const { name, description } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Group name too long (max 100 characters)' },
        { status: 400 }
      );
    }

    if (description && typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Invalid description format' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create the group
    const { data: newGroup, error: createError } = await supabase
      .from('study_groups')
      .insert({
        Name: name.trim(),
        Description: description?.trim() || null,
        Type: 'private',
        CreatorID: userId,
        TagID: null
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating group:', createError);
      return NextResponse.json(
        { error: 'Failed to create group' },
        { status: 500 }
      );
    }

    // Note: Creator is automatically added as admin via database trigger

    return NextResponse.json({
      success: true,
      group: {
        groupId: newGroup.GroupID,
        name: newGroup.Name,
        description: newGroup.Description,
        type: newGroup.Type,
        creatorId: newGroup.CreatorID,
        createdAt: newGroup.CreatedAt
      }
    });
  } catch (error) {
    console.error('Error in POST /api/community/groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

