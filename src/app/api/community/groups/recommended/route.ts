import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// GET /api/community/groups/recommended - Get up to 3 recommended study groups (public groups user is not a member of)
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
      .order('CreatedAt', { ascending: false });

    if (publicError) {
      console.error('Error fetching public groups:', publicError);
      return NextResponse.json(
        { error: 'Failed to fetch public groups', details: publicError.message },
        { status: 500 }
      );
    }

    console.log('Public groups found:', publicGroups?.length || 0);

    if (!publicGroups || publicGroups.length === 0) {
      console.log('No public groups available');
      return NextResponse.json({
        recommendedGroups: []
      });
    }

    // Get the group IDs the user is a member of
    const { data: userMemberships, error: membershipError } = await supabase
      .from('group_members')
      .select('GroupID')
      .eq('UserID', userId);

    if (membershipError) {
      console.error('Error fetching user memberships:', membershipError);
    }

    const userGroupIds = new Set(
      (userMemberships || []).map((m: any) => m.GroupID)
    );

    // Filter out groups the user is already a member of
    const nonMemberGroups = (publicGroups || []).filter(
      (group: any) => !userGroupIds.has(group.GroupID)
    );

    console.log('Non-member groups found:', nonMemberGroups.length);
    console.log('User is member of:', userGroupIds.size, 'groups');

    // Get member counts for the recommended groups
    const recommendedGroupIds = nonMemberGroups
      .slice(0, 3)
      .map((g: any) => g.GroupID);

    let memberCountMap = new Map<number, number>();

    if (recommendedGroupIds.length > 0) {
      const { data: memberCounts } = await supabase
        .from('group_members')
        .select('GroupID')
        .in('GroupID', recommendedGroupIds);

      // Count members per group
      memberCounts?.forEach((member: any) => {
        memberCountMap.set(
          member.GroupID,
          (memberCountMap.get(member.GroupID) || 0) + 1
        );
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
      isMember: false,
      userRole: null,
      createdAt: group.CreatedAt,
      updatedAt: group.UpdatedAt
    });

    const formattedGroups = nonMemberGroups.slice(0, 3).map(formatGroup);
    console.log('Returning recommended groups:', formattedGroups.length);

    return NextResponse.json({
      recommendedGroups: formattedGroups
    });
  } catch (error) {
    console.error('Error in GET /api/community/groups/recommended:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

