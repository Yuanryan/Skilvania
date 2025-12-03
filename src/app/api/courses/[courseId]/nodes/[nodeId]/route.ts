import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockAPI, shouldUseMock } from '@/lib/mock/creatorData';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// PUT /api/courses/[courseId]/nodes/[nodeId] - 更新節點
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; nodeId: string }> }
) {
  try {
    const { courseId, nodeId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, type, x, y, xp, iconName, description } = body;

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      // 檢查是否是 Mock 模式
      const adminClient = createAdminClient();
      const { error: testError } = await adminClient.from('auth_user_bridge').select('user_id').limit(1);
      if (testError && shouldUseMock(testError)) {
        console.log('📦 Using mock data (database tables not found)');
        const updates: any = {};
        if (title !== undefined) updates.Title = title.trim();
        if (type !== undefined && ['theory', 'code', 'project'].includes(type)) {
          updates.Type = type;
        }
        if (x !== undefined && typeof x === 'number' && x >= 0 && x <= 800) {
          updates.X = x;
        }
        if (y !== undefined && typeof y === 'number' && y >= 0 && y <= 800) {
          updates.Y = y;
        }
        if (xp !== undefined && typeof xp === 'number' && xp >= 0) {
          updates.XP = xp;
        }
        if (iconName !== undefined) updates.IconName = iconName;
        if (description !== undefined) updates.Description = description?.trim() || null;
        const { node: mockNode } = mockAPI.updateNode(parseInt(courseId), parseInt(nodeId), updates);
        if (!mockNode) {
          return NextResponse.json({ error: 'Node not found' }, { status: 404 });
        }
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
        });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 使用 admin client 繞過 RLS
    const supabase = createAdminClient();

    // 檢查是否為課程創建者
    const { data: course } = await supabase
      .from('course')
      .select('CreatorID')
      .eq('CourseID', parseInt(courseId))
      .single();

    if (!course || course.CreatorID !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 構建更新對象
    const updates: any = {};
    if (title !== undefined) updates.Title = title.trim();
    if (type !== undefined && ['theory', 'code', 'project'].includes(type)) {
      updates.Type = type;
    }
    if (x !== undefined && typeof x === 'number' && x >= 0 && x <= 800) {
      updates.X = x;
    }
    if (y !== undefined && typeof y === 'number' && y >= 0 && y <= 800) {
      updates.Y = y;
    }
    if (xp !== undefined && typeof xp === 'number' && xp >= 0) {
      updates.XP = xp;
    }
    if (iconName !== undefined) updates.IconName = iconName;
    if (description !== undefined) updates.Description = description?.trim() || null;
    updates.UpdatedAt = new Date().toISOString();

    // 更新節點
    const { data: node, error } = await supabase
      .from('node')
      .update(updates)
      .eq('NodeID', parseInt(nodeId))
      .eq('CourseID', parseInt(courseId))
      .select()
      .single();

    if (error && shouldUseMock(error)) {
      console.log('📦 Using mock data (database tables not found)');
      const { node: mockNode } = mockAPI.updateNode(parseInt(courseId), parseInt(nodeId), updates);
      if (!mockNode) {
        return NextResponse.json({ error: 'Node not found' }, { status: 404 });
      }
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
      });
    }

    if (error) {
      console.error('Error updating node:', error);
      return NextResponse.json({ error: 'Failed to update node' }, { status: 500 });
    }

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
    });
  } catch (error) {
    console.error('Error in PUT /api/courses/[courseId]/nodes/[nodeId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/courses/[courseId]/nodes/[nodeId] - 刪除節點
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; nodeId: string }> }
) {
  try {
    const { courseId, nodeId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      // 檢查是否是 Mock 模式
      const adminClient = createAdminClient();
      const { error: testError } = await adminClient.from('auth_user_bridge').select('user_id').limit(1);
      if (testError && shouldUseMock(testError)) {
        console.log('📦 Using mock data (database tables not found)');
        mockAPI.deleteNode(parseInt(courseId), parseInt(nodeId));
        return NextResponse.json({ success: true, _mock: true });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 使用 admin client 繞過 RLS
    const supabase = createAdminClient();

    // 檢查是否為課程創建者
    const { data: course } = await supabase
      .from('course')
      .select('CreatorID')
      .eq('CourseID', parseInt(courseId))
      .single();

    if (!course || course.CreatorID !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 刪除節點（級聯刪除相關連接）
    const { error } = await supabase
      .from('node')
      .delete()
      .eq('NodeID', parseInt(nodeId))
      .eq('CourseID', parseInt(courseId));

    if (error && shouldUseMock(error)) {
      console.log('📦 Using mock data (database tables not found)');
      mockAPI.deleteNode(parseInt(courseId), parseInt(nodeId));
      return NextResponse.json({ success: true, _mock: true });
    }

    if (error) {
      console.error('Error deleting node:', error);
      return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/courses/[courseId]/nodes/[nodeId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

