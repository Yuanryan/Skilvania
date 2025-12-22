import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// POST /api/community/groups/[groupId]/leave - Leave a group
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

    // Check if user is a member
    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('MembershipID, Role')
      .eq('GroupID', groupIdNum)
      .eq('UserID', userId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 404 }
      );
    }

    // Check if user is the only admin - prevent leaving if so
    if (membership.Role === 'admin') {
      const { count: adminCount } = await supabase
        .from('group_members')
        .select('MembershipID', { count: 'exact', head: true })
        .eq('GroupID', groupIdNum)
        .eq('Role', 'admin');

      if (adminCount === 1) {
        // Check if there are other members
        const { count: memberCount } = await supabase
          .from('group_members')
          .select('MembershipID', { count: 'exact', head: true })
          .eq('GroupID', groupIdNum);

        if (memberCount && memberCount > 1) {
          return NextResponse.json(
            { error: 'You are the only admin. Please assign another admin before leaving or delete the group.' },
            { status: 400 }
          );
        }
      }
    }

    // Remove user from group
    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('GroupID', groupIdNum)
      .eq('UserID', userId);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json(
        { error: 'Failed to leave group' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/community/groups/[groupId]/leave:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

