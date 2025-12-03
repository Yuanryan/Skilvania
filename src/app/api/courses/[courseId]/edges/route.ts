import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockAPI, shouldUseMock } from '@/lib/mock/creatorData';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// POST /api/courses/[courseId]/edges - 創建連接
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
    const { fromNodeId, toNodeId } = body;

    if (!fromNodeId || !toNodeId) {
      return NextResponse.json({ error: 'fromNodeId and toNodeId are required' }, { status: 400 });
    }

    if (fromNodeId === toNodeId) {
      return NextResponse.json({ error: 'Cannot connect node to itself' }, { status: 400 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      // 檢查是否是 Mock 模式
      const adminClient = createAdminClient();
      const { error: testError } = await adminClient.from('auth_user_bridge').select('user_id').limit(1);
      if (testError && shouldUseMock(testError)) {
        console.log('📦 Using mock data (database tables not found)');
        const { edge: mockEdge, error: mockError } = mockAPI.createEdge(parseInt(courseId), parseInt(fromNodeId), parseInt(toNodeId));
        if (mockError || !mockEdge) {
          return NextResponse.json({ error: mockError?.message || 'Failed to create edge' }, { status: 400 });
        }
        return NextResponse.json({
          edge: {
            id: `e-${mockEdge.EdgeID}`,
            from: mockEdge.FromNodeID.toString(),
            to: mockEdge.ToNodeID.toString()
          },
          _mock: true
        }, { status: 201 });
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

    // 檢查節點是否存在且屬於該課程
    const { data: nodes, error: nodesError } = await supabase
      .from('node')
      .select('NodeID')
      .eq('CourseID', parseInt(courseId))
      .in('NodeID', [parseInt(fromNodeId), parseInt(toNodeId)]);

    // 如果資料庫表不存在，跳過檢查（Mock 模式會處理）
    if (nodesError && shouldUseMock(nodesError)) {
      // 在 Mock 模式中，直接嘗試創建連接
      // Mock API 會處理節點檢查
    } else {
      if (!nodes || nodes.length !== 2) {
        return NextResponse.json({ error: 'One or both nodes not found' }, { status: 404 });
      }

      // 檢查連接是否已存在
      const { data: existing, error: existingError } = await supabase
        .from('edge')
        .select('EdgeID')
        .eq('CourseID', parseInt(courseId))
        .eq('FromNodeID', parseInt(fromNodeId))
        .eq('ToNodeID', parseInt(toNodeId))
        .single();

      if (existingError && shouldUseMock(existingError)) {
        // 在 Mock 模式中，直接嘗試創建連接
      } else if (existing) {
        return NextResponse.json({ error: 'Edge already exists' }, { status: 400 });
      }
    }

    // 創建連接
    const { data: edge, error } = await supabase
      .from('edge')
      .insert({
        CourseID: parseInt(courseId),
        FromNodeID: parseInt(fromNodeId),
        ToNodeID: parseInt(toNodeId)
      })
      .select()
      .single();

    if (error && shouldUseMock(error)) {
      console.log('📦 Using mock data (database tables not found)');
      const { edge: mockEdge, error: mockError } = mockAPI.createEdge(parseInt(courseId), parseInt(fromNodeId), parseInt(toNodeId));
      if (mockError || !mockEdge) {
        return NextResponse.json({ error: mockError?.message || 'Failed to create edge' }, { status: 400 });
      }
      return NextResponse.json({
        edge: {
          id: `e-${mockEdge.EdgeID}`,
          from: mockEdge.FromNodeID.toString(),
          to: mockEdge.ToNodeID.toString()
        },
        _mock: true
      }, { status: 201 });
    }

    if (error) {
      console.error('Error creating edge:', error);
      return NextResponse.json({ error: 'Failed to create edge' }, { status: 500 });
    }

    return NextResponse.json({
      edge: {
        id: `e-${edge.EdgeID}`,
        from: edge.FromNodeID.toString(),
        to: edge.ToNodeID.toString()
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/courses/[courseId]/edges:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

