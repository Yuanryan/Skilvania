import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Node, Edge } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const courseIdInt = parseInt(courseId, 10);
    
    if (isNaN(courseIdInt)) {
      return NextResponse.json(
        { error: '無效的課程 ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 驗證課程是否存在（公開訪問，不需要登錄）
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('CourseID, Title')
      .eq('CourseID', courseIdInt)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: '找不到課程' },
        { status: 404 }
      );
    }

    // 獲取節點
    const { data: nodesData, error: nodesError } = await supabase
      .from('node')
      .select('NodeID, Title, Type, XP, X, Y, IconName, Description')
      .eq('CourseID', courseIdInt)
      .order('NodeID');

    if (nodesError) {
      console.error('獲取節點錯誤:', nodesError);
      return NextResponse.json(
        { error: '獲取節點失敗' },
        { status: 500 }
      );
    }

    // 獲取邊
    const { data: edgesData, error: edgesError } = await supabase
      .from('edge')
      .select('EdgeID, FromNodeID, ToNodeID')
      .eq('CourseID', courseIdInt);

    if (edgesError) {
      console.error('獲取邊錯誤:', edgesError);
      return NextResponse.json(
        { error: '獲取邊失敗' },
        { status: 500 }
      );
    }

    // 嘗試獲取當前認證用戶（可選）
    let completedNodeIds = new Set<string>();
    
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    // 如果用戶已登錄，獲取用戶進度
    if (authUser) {
      try {
        // 通過 auth_user_bridge 獲取 user_id
        const { data: bridgeData } = await supabase
          .from('auth_user_bridge')
          .select('user_id')
          .eq('auth_user_id', authUser.id)
          .single();

        if (bridgeData?.user_id) {
          const userId = bridgeData.user_id;
          
          // 獲取用戶進度
          const { data: progressData, error: progressError } = await supabase
            .from('userprogress')
            .select('NodeID, Status')
            .eq('UserID', userId)
            .in('NodeID', nodesData?.map(n => n.NodeID) || []);

          if (!progressError && progressData) {
            completedNodeIds = new Set<string>(
              progressData
                .filter(p => p.Status === 'completed')
                .map(p => p.NodeID.toString())
            );
          }
        }
      } catch (error) {
        // 如果獲取進度失敗，繼續返回課程數據，只是沒有進度信息
        console.error('獲取用戶進度錯誤:', error);
      }
    }

    // 轉換節點格式
    const nodes: Node[] = (nodesData || []).map(node => ({
      id: node.NodeID.toString(),
      title: node.Title,
      type: node.Type as 'theory' | 'code' | 'project',
      xp: node.XP || 100,
      x: node.X,
      y: node.Y,
      iconName: node.IconName || undefined,
      description: node.Description || undefined,
    }));

    // 轉換邊格式
    const edges: Edge[] = (edgesData || []).map(edge => ({
      id: edge.EdgeID.toString(),
      from: edge.FromNodeID.toString(),
      to: edge.ToNodeID.toString(),
    }));

    return NextResponse.json({
      nodes,
      edges,
      completedNodes: Array.from(completedNodeIds),
    });
  } catch (error) {
    console.error('API 錯誤:', error);
    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    );
  }
}

