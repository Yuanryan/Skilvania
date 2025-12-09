import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@/lib/auth/config';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import { Node, Edge } from '@/types';
import { typeNameToNodeType, getTypeNames } from '@/lib/supabase/taskType';

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

    // 使用 admin client 繞過 RLS（因為這是公開的課程數據）
    const supabase = createAdminClient();

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
      .select('NodeID, Title, TypeID, XP, X, Y, IconName, Description')
      .eq('CourseID', courseIdInt)
      .order('NodeID');

    if (nodesError) {
      console.error('獲取節點錯誤:', nodesError);
      return NextResponse.json(
        { error: '獲取節點失敗' },
        { status: 500 }
      );
    }

    // 獲取所有唯一的 TypeID
    const typeIDs = [...new Set((nodesData || []).map((n: any) => n.TypeID).filter((id: any) => id !== null))];
    
    // 批量獲取類型名稱
    const typeNameMap = await getTypeNames(supabase, typeIDs);

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

    // 嘗試獲取當前認證用戶（使用 NextAuth）
    let completedNodeIds = new Set<string>();
    
    const session = await auth();
    
    // 如果用戶已登錄，獲取用戶進度
    if (session?.user?.id) {
      try {
        // 通過 NextAuth session 獲取 user_id
        const userId = await getUserIdFromSession(session.user.id);

        if (userId !== null && nodesData && nodesData.length > 0) {
          const nodeIds = nodesData.map(n => n.NodeID);
          
          // 獲取用戶進度（使用 admin client 繞過 RLS）
          const { data: progressData, error: progressError } = await supabase
            .from('userprogress')
            .select('NodeID, Status')
            .eq('UserID', userId)
            .in('NodeID', nodeIds);

          if (!progressError && progressData) {
            completedNodeIds = new Set<string>(
              progressData
                .filter(p => p.Status === 'completed')
                .map(p => p.NodeID.toString())
            );
          } else if (progressError) {
            console.error('❌ 獲取用戶進度錯誤:', progressError);
          } else {
            console.log(`ℹ️ No progress data found for user ${userId}`);
          }
        }
      } catch (error) {
        // 如果獲取進度失敗，繼續返回課程數據，只是沒有進度信息
        console.error('獲取用戶進度錯誤:', error);
      }
    }

    // 轉換節點格式
    const nodes: Node[] = (nodesData || []).map((node: any) => {
      // 獲取類型名稱
      const typeName = node.TypeID ? typeNameMap.get(node.TypeID) : null;
      const nodeType = typeNameToNodeType(typeName);
      
      return {
        id: node.NodeID.toString(),
        title: node.Title,
        type: nodeType,
        xp: node.XP || 100,
        x: node.X,
        y: node.Y,
        iconName: node.IconName || undefined,
        description: node.Description || undefined,
      };
    });

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
      courseTitle: course.Title, // 添加課程標題
    });
  } catch (error) {
    console.error('API 錯誤:', error);
    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    );
  }
}

