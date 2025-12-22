import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// POST /api/admin/seed-groups - Create public study groups from course tags and add random users
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

    const supabase = createAdminClient();

    // Check if user is admin
    const { data: userRoles } = await supabase
      .from('userroles')
      .select('RoleID')
      .eq('UserID', userId);

    const isAdmin = userRoles?.some((ur: any) => ur.RoleID === 1); // Assuming RoleID 1 is admin

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get request body for optional parameters
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body might be empty, use defaults
    }
    const usersPerGroup = (body as any).usersPerGroup || 5; // Default: add 5 random users per group

    // Get all tags
    const { data: tags, error: tagsError } = await supabase
      .from('tag')
      .select('TagID, Name')
      .order('Name');

    if (tagsError) {
      console.error('Error fetching tags:', tagsError);
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      );
    }

    if (!tags || tags.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tags found to create groups from',
        created: 0,
        existing: 0
      });
    }

    // Get all users (for random selection)
    const { data: allUsers, error: usersError } = await supabase
      .from('USER')
      .select('UserID')
      .neq('UserID', userId); // Exclude admin

    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    const availableUserIds = (allUsers || []).map((u: any) => u.UserID);

    const results = {
      created: 0,
      existing: 0,
      usersAdded: 0,
      errors: [] as string[]
    };

    // Create a public group for each tag if it doesn't exist
    for (const tag of tags) {
      try {
        // Check if public group already exists for this tag
        const { data: existingGroup } = await supabase
          .from('study_groups')
          .select('GroupID')
          .eq('Type', 'public')
          .eq('TagID', tag.TagID)
          .single();

        let groupId: number;

        if (existingGroup) {
          results.existing++;
          groupId = existingGroup.GroupID;
        } else {
          // Create public group for this tag
          const { data: newGroup, error: createError } = await supabase
            .from('study_groups')
            .insert({
              Name: `${tag.Name} Study Group`,
              Description: `Public study group for all ${tag.Name} courses. Join to connect with fellow learners!`,
              Type: 'public',
              TagID: tag.TagID,
              CreatorID: userId // Admin is the creator
            })
            .select('GroupID')
            .single();

          if (createError) {
            console.error(`Error creating group for tag ${tag.Name}:`, createError);
            results.errors.push(`Failed to create group for ${tag.Name}: ${createError.message}`);
            continue;
          }

          groupId = newGroup.GroupID;
          results.created++;
        }

        // Add random users to the group
        if (availableUserIds.length > 0) {
          // Check existing members
          const { data: existingMembers } = await supabase
            .from('group_members')
            .select('UserID')
            .eq('GroupID', groupId);

          const existingMemberIds = new Set((existingMembers || []).map((m: any) => m.UserID));
          
          // Get users not already in the group
          const availableForGroup = availableUserIds.filter(id => !existingMemberIds.has(id));
          
          // Randomly select users
          const shuffled = [...availableForGroup].sort(() => 0.5 - Math.random());
          const usersToAdd = shuffled.slice(0, Math.min(usersPerGroup, availableForGroup.length));

          if (usersToAdd.length > 0) {
            // Add users as members
            const membersToInsert = usersToAdd.map((userIdToAdd: number) => ({
              GroupID: groupId,
              UserID: userIdToAdd,
              Role: 'member'
            }));

            const { error: membersError } = await supabase
              .from('group_members')
              .insert(membersToInsert);

            if (membersError) {
              console.error(`Error adding members to group ${groupId}:`, membersError);
              results.errors.push(`Failed to add members to ${tag.Name} group`);
            } else {
              results.usersAdded += usersToAdd.length;
            }
          }
        }
      } catch (error) {
        console.error(`Error processing tag ${tag.Name}:`, error);
        results.errors.push(`Error processing tag ${tag.Name}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeding completed. Created ${results.created} new groups, ${results.existing} already existed. Added ${results.usersAdded} users to groups.`,
      created: results.created,
      existing: results.existing,
      usersAdded: results.usersAdded,
      total: tags.length,
      errors: results.errors.length > 0 ? results.errors : undefined
    });
  } catch (error) {
    console.error('Error in POST /api/admin/seed-groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/seed-groups - Check seeding status
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

    // Check if user is admin
    const { data: userRoles } = await supabase
      .from('userroles')
      .select('RoleID')
      .eq('UserID', userId);

    const isAdmin = userRoles?.some((ur: any) => ur.RoleID === 1);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get counts
    const { count: tagCount } = await supabase
      .from('tag')
      .select('TagID', { count: 'exact', head: true });

    const { count: publicGroupCount } = await supabase
      .from('study_groups')
      .select('GroupID', { count: 'exact', head: true })
      .eq('Type', 'public');

    const { data: publicGroups } = await supabase
      .from('study_groups')
      .select(`
        GroupID,
        Name,
        TagID,
        CreatedAt,
        tag:TagID (
          Name
        )
      `)
      .eq('Type', 'public')
      .order('Name');

    return NextResponse.json({
      totalTags: tagCount || 0,
      publicGroups: publicGroupCount || 0,
      needsSeeding: (tagCount || 0) > (publicGroupCount || 0),
      groups: publicGroups || []
    });
  } catch (error) {
    console.error('Error in GET /api/admin/seed-groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

