import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockAPI, shouldUseMock } from '@/lib/mock/creatorData';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import { logActivity } from '@/lib/mongodb/activity';

// POST /api/courses/[courseId]/nodes - 創建新節點
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, type, x, y, xp, iconName, description } = body;

    // 驗證必填欄位
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!type || !['theory', 'code', 'project'].includes(type)) {
      return NextResponse.json({ error: 'Valid type is required' }, { status: 400 });
    }

    if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x > 800 || y < 0 || y > 800) {
      return NextResponse.json({ error: 'Valid coordinates (0-800) are required' }, { status: 400 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      // 檢查是否是 Mock 模式
      const adminClient = createAdminClient();
      const { error: testError } = await adminClient.from('auth_user_bridge').select('user_id').limit(1);
      if (testError && shouldUseMock(testError)) {
        console.log('📦 Using mock data (database tables not found)');
        const { node } = mockAPI.createNode(parseInt(courseId), {
          title: title.trim(),
          type,
          x,
          y,
          xp: xp || 100,
          iconName: iconName || 'Code',
          description: description?.trim()
        });

        return NextResponse.json({
          node: {
            id: node.NodeID.toString(),
            title: node.Title,
            xp: node.XP,
            type: node.Type,
            x: node.X,
            y: node.Y,
            iconName: node.IconName,
            description: node.Description
          },
          _mock: true
        }, { status: 201 });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 使用 admin client 繞過 RLS
    const supabase = createAdminClient();

    // 檢查是否為課程創建者
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('CreatorID')
      .eq('CourseID', parseInt(courseId))
      .single();

    if (courseError && shouldUseMock(courseError)) {
      console.log('📦 Using mock data (database tables not found)');
      const { node } = mockAPI.createNode(parseInt(courseId), {
        title: title.trim(),
        type,
        x,
        y,
        xp: xp || 100,
        iconName: iconName || 'Code',
        description: description?.trim()
      });

      return NextResponse.json({
        node: {
          id: node.NodeID.toString(),
          title: node.Title,
          xp: node.XP,
          type: node.Type,
          x: node.X,
          y: node.Y,
          iconName: node.IconName,
          description: node.Description
        },
        _mock: true
      }, { status: 201 });
    }

    if (!course || course.CreatorID !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 創建節點
    const { data: node, error } = await supabase
      .from('node')
      .insert({
        CourseID: parseInt(courseId),
        Title: title.trim(),
        Type: type,
        X: x,
        Y: y,
        XP: xp || 100,
        IconName: iconName || 'Code',
        Description: description?.trim() || null
      })
      .select()
      .single();

    if (error && shouldUseMock(error)) {
      console.log('📦 Using mock data (database tables not found)');
      const { node: mockNode } = mockAPI.createNode(parseInt(courseId), {
        title: title.trim(),
        type,
        x,
        y,
        xp: xp || 100,
        iconName: iconName || 'Code',
        description: description?.trim()
      });

      return NextResponse.json({
        node: {
          id: mockNode.NodeID.toString(),
          title: mockNode.Title,
          xp: mockNode.XP,
          type: mockNode.Type,
          x: mockNode.X,
          y: mockNode.Y,
          iconName: mockNode.IconName,
          description: mockNode.Description
        },
        _mock: true
      }, { status: 201 });
    }

    if (error) {
      console.error('Error creating node:', error);
      return NextResponse.json({ error: 'Failed to create node' }, { status: 500 });
    }

    // 自動記錄節點創建活動
    logActivity(userId, 'node_create', {
      nodeId: node.NodeID,
      courseId: parseInt(courseId),
    }).catch((err) => {
      console.error('❌ Failed to log node_create activity:', err);
    });

    return NextResponse.json({
      node: {
        id: node.NodeID.toString(),
        title: node.Title,
        xp: node.XP,
        type: node.Type,
        x: node.X,
        y: node.Y,
        iconName: node.IconName,
        description: node.Description
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/courses/[courseId]/nodes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

