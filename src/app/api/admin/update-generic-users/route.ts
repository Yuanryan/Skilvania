import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// Realistic first names
const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Sam', 'Jamie', 'Cameron', 'Dakota', 'Blake', 'Sage', 'River', 'Phoenix',
  'Skyler', 'Rowan', 'Finley', 'Hayden', 'Reese', 'Parker', 'Drew', 'Logan',
  'Noah', 'Emma', 'Liam', 'Olivia', 'Ethan', 'Sophia', 'Mason', 'Isabella',
  'Lucas', 'Mia', 'Aiden', 'Charlotte', 'Carter', 'Amelia', 'Jackson', 'Harper',
  'Sebastian', 'Evelyn', 'Henry', 'Abigail', 'Owen', 'Emily', 'Wyatt', 'Elizabeth',
  'Caleb', 'Sofia', 'Nathan', 'Avery', 'Ryan', 'Ella', 'Jack', 'Madison',
  'Luke', 'Scarlett', 'Daniel', 'Victoria', 'Matthew', 'Aria', 'David', 'Grace'
];

// Realistic last names
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
  'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards'
];

// Generate a random realistic name
function generateRealisticName(): string {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

// Generate avatar URL using UI Avatars
function generateAvatarUrl(name: string): string {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // Use UI Avatars API - simple and free
  const colors = ['3B82F6', '10B981', '8B5CF6', 'F59E0B', 'EF4444', 'EC4899', '14B8A6', '6366F1'];
  const bgColor = colors[Math.floor(Math.random() * colors.length)];
  const textColor = 'FFFFFF';
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bgColor}&color=${textColor}&size=256&bold=true&format=png`;
}

// POST /api/admin/update-generic-users - Update generic usernames and add avatars
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

    // Check if user is admin
    const supabase = createAdminClient();
    const { data: userRole } = await supabase
      .from('USERROLE')
      .select('ROLES(RoleName)')
      .eq('UserID', userId)
      .single();

    const roles = userRole?.ROLES as any;
    const isAdmin = roles?.RoleName === 'admin' || 
                   roles?.RoleName === 'Admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find users with generic usernames
    // Match patterns like: user155, user_123, user123, User155, etc.
    const { data: genericUsers, error: fetchError } = await supabase
      .from('USER')
      .select('UserID, Username, Email')
      .or('Username.ilike.user%,Username.ilike.User%')
      .not('Username', 'not.ilike', '% %'); // Exclude names with spaces (already realistic)

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: fetchError.message },
        { status: 500 }
      );
    }

    // Filter to only match exact patterns like user155, user_123, User155, etc.
    // Matches: user followed by digits, or user followed by underscore and digits
    const genericPattern = /^user[\d_]*\d+$/i;
    const usersToUpdate = (genericUsers || []).filter(user => 
      genericPattern.test(user.Username) && user.Username.length < 20 // Exclude very long usernames
    );

    if (usersToUpdate.length === 0) {
      return NextResponse.json({
        message: 'No users with generic usernames found',
        updated: 0
      });
    }

    const results = {
      updated: 0,
      errors: [] as string[],
      updates: [] as Array<{ userId: number; oldUsername: string; newUsername: string }>
    };

    // Update each user
    for (const user of usersToUpdate) {
      try {
        const newName = generateRealisticName();
        const avatarUrl = generateAvatarUrl(newName);

        // Check if the new username already exists
        const { data: existingUser } = await supabase
          .from('USER')
          .select('UserID')
          .eq('Username', newName)
          .single();

        if (existingUser) {
          // If name exists, add a number
          let counter = 1;
          let finalName = `${newName}${counter}`;
          while (true) {
            const { data: checkUser } = await supabase
              .from('USER')
              .select('UserID')
              .eq('Username', finalName)
              .single();
            
            if (!checkUser) break;
            counter++;
            finalName = `${newName}${counter}`;
          }
          
          const { error: updateError } = await supabase
            .from('USER')
            .update({
              Username: finalName,
              AvatarURL: avatarUrl
            })
            .eq('UserID', user.UserID);

          if (updateError) {
            results.errors.push(`Failed to update ${user.Username}: ${updateError.message}`);
          } else {
            results.updated++;
            results.updates.push({
              userId: user.UserID,
              oldUsername: user.Username,
              newUsername: finalName
            });
          }
        } else {
          const { error: updateError } = await supabase
            .from('USER')
            .update({
              Username: newName,
              AvatarURL: avatarUrl
            })
            .eq('UserID', user.UserID);

          if (updateError) {
            results.errors.push(`Failed to update ${user.Username}: ${updateError.message}`);
          } else {
            results.updated++;
            results.updates.push({
              userId: user.UserID,
              oldUsername: user.Username,
              newUsername: newName
            });
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Error updating user ${user.UserID}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      message: `Updated ${results.updated} users`,
      total: usersToUpdate.length,
      updated: results.updated,
      errors: results.errors,
      updates: results.updates
    });
  } catch (error) {
    console.error('Error in update-generic-users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/update-generic-users - Preview users that would be updated
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

    // Check if user is admin
    const supabase = createAdminClient();
    const { data: userRole } = await supabase
      .from('USERROLE')
      .select('ROLES(RoleName)')
      .eq('UserID', userId)
      .single();

    const roles = userRole?.ROLES as any;
    const isAdmin = roles?.RoleName === 'admin' || 
                   roles?.RoleName === 'Admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find users with generic usernames
    const { data: genericUsers, error: fetchError } = await supabase
      .from('USER')
      .select('UserID, Username, Email, AvatarURL')
      .or('Username.ilike.user%,Username.ilike.User%')
      .not('Username', 'not.ilike', '% %');

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: fetchError.message },
        { status: 500 }
      );
    }

    // Filter to only match exact patterns like user155, user_123, User155, etc.
    // Matches: user followed by digits, or user followed by underscore and digits
    const genericPattern = /^user[\d_]*\d+$/i;
    const usersToUpdate = (genericUsers || []).filter(user => 
      genericPattern.test(user.Username) && user.Username.length < 20 // Exclude very long usernames
    );

    return NextResponse.json({
      count: usersToUpdate.length,
      users: usersToUpdate.map(u => ({
        userId: u.UserID,
        username: u.Username,
        email: u.Email,
        hasAvatar: !!u.AvatarURL
      }))
    });
  } catch (error) {
    console.error('Error in GET update-generic-users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

