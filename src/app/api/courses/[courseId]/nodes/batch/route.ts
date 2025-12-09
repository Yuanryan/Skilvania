import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { mockAPI, shouldUseMock } from '@/lib/mock/creatorData';
import { getUserIdFromSession } from '@/lib/utils/getUserId';

// PUT /api/courses/[courseId]/nodes/batch - 批量更新節點位置
export async function PUT(
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
    const { nodes } = body;

    if (!Array.isArray(nodes)) {
      return NextResponse.json({ error: 'Nodes array is required' }, { status: 400 });
    }

    // 獲取當前使用者的 UserID
    const userId = await getUserIdFromSession(session.user.id);
    
    if (userId === null) {
      // 檢查是否是 Mock 模式
      const adminClient = createAdminClient();
      const { error: testError } = await adminClient.from('auth_user_bridge').select('user_id').limit(1);
      if (testError && shouldUseMock(testError)) {
        console.log('📦 Using mock data (database tables not found)');
        mockAPI.batchUpdateNodes(parseInt(courseId), nodes);
        return NextResponse.json({ success: true, updated: nodes.length, _mock: true });
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

    // 過濾掉臨時節點（temp-xxx）和無效的 nodeId
    const validNodes = nodes.filter((node: { nodeId: string }) => {
      // 過濾掉臨時節點
      if (node.nodeId.startsWith('temp-')) {
        console.warn(`Skipping temporary node: ${node.nodeId}`);
        return false;
      }
      // 驗證 nodeId 是有效的數字字符串
      const numericId = parseInt(node.nodeId);
      if (isNaN(numericId)) {
        console.warn(`Invalid nodeId format: ${node.nodeId}`);
        return false;
      }
      return true;
    });

    if (validNodes.length === 0) {
      return NextResponse.json({ error: 'No valid nodes to update' }, { status: 400 });
    }

    // 先批量獲取所有需要的 TypeID
    const typeNames = [...new Set(validNodes
      .filter((n: any) => n.type && ['theory', 'code', 'project'].includes(n.type))
      .map((n: any) => n.type)
    )];
    
    const typeIdMap = new Map<string, number>();
    for (const typeName of typeNames) {
      const typeID = await getOrCreateTypeID(supabase, typeName);
      if (typeID) {
        typeIdMap.set(typeName, typeID);
      }
    }

    // 批量更新節點（支持位置和其他屬性）
    const updatePromises = validNodes.map((node: { 
      nodeId: string; 
      x?: number; 
      y?: number;
      title?: string;
      type?: string;
      xp?: number;
      iconName?: string;
      description?: string;
    }) => {
      const numericNodeId = parseInt(node.nodeId);
      
      // 驗證座標（如果提供）- 允許浮點數，但會在更新時轉換為整數
      if (node.x !== undefined && (typeof node.x !== 'number' || node.x < 0 || node.x > 800)) {
        return Promise.reject(new Error(`Invalid x coordinate for node ${node.nodeId}: ${node.x}`));
      }
      if (node.y !== undefined && (typeof node.y !== 'number' || node.y < 0 || node.y > 800)) {
        return Promise.reject(new Error(`Invalid y coordinate for node ${node.nodeId}: ${node.y}`));
      }

      // 構建更新對象
      const updates: any = {
        UpdatedAt: new Date().toISOString()
      };
      
      // 將座標轉換為整數（資料庫欄位是 int4）
      if (node.x !== undefined) updates.X = Math.round(node.x);
      if (node.y !== undefined) updates.Y = Math.round(node.y);
      if (node.title !== undefined) updates.Title = node.title.trim();
      if (node.type !== undefined && ['theory', 'code', 'project'].includes(node.type)) {
        const typeID = typeIdMap.get(node.type);
        if (typeID) {
          updates.TypeID = typeID;
        }
      }
      if (node.xp !== undefined && typeof node.xp === 'number' && node.xp >= 0) {
        updates.XP = node.xp;
      }
      // IconName 可以是字符串或 null，需要明確處理
      if (node.iconName !== undefined && node.iconName !== null) {
        updates.IconName = node.iconName; // 保持原始值（包括空字符串）
      } else if (node.iconName === null) {
        updates.IconName = null; // 明確設置為 null
      }
      if (node.description !== undefined) {
        updates.Description = node.description?.trim() || null;
      }

      // 確保至少有一個欄位要更新（除了 UpdatedAt）
      const hasUpdates = Object.keys(updates).length > 1;
      if (!hasUpdates) {
        console.warn(`No updates provided for node ${node.nodeId}, skipping`);
        return Promise.resolve({ data: null, error: null });
      }

      // 調試日誌：顯示實際的更新內容
      if (updates.IconName !== undefined) {
        console.log(`Updating node ${node.nodeId}: IconName = "${updates.IconName}"`);
      }

      return supabase
        .from('node')
        .update(updates)
        .eq('NodeID', numericNodeId)
        .eq('CourseID', parseInt(courseId));
    });

    const results = await Promise.allSettled(updatePromises);
    
    // 檢查每個結果的狀態
    const fulfilledResults = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const rejectedResults = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    
    // 記錄所有結果以便調試
    console.log(`Batch update results: ${fulfilledResults.length} fulfilled, ${rejectedResults.length} rejected`);
    
    // 檢查是否有資料庫錯誤（表不存在）
    const dbErrors = fulfilledResults.filter(r => 
      r.value.error && shouldUseMock(r.value.error)
    );

    if (dbErrors.length > 0) {
      console.log('📦 Using mock data (database tables not found)');
      mockAPI.batchUpdateNodes(parseInt(courseId), validNodes);
      return NextResponse.json({ success: true, updated: validNodes.length, _mock: true });
    }

    // 檢查是否有 Supabase 錯誤（非 Mock 錯誤）
    const supabaseErrors = fulfilledResults
      .filter(r => r.value && r.value.error)
      .map(r => r.value.error);
    
    if (supabaseErrors.length > 0) {
      console.error('Supabase errors:', JSON.stringify(supabaseErrors, null, 2));
      console.error('Failed nodes:', validNodes.map(n => ({ nodeId: n.nodeId, x: n.x, y: n.y })));
      console.error('Update payload:', validNodes.map(n => ({
        nodeId: n.nodeId,
        numericId: parseInt(n.nodeId),
        x: n.x,
        y: n.y,
        title: n.title,
        type: n.type,
        iconName: n.iconName,
        hasX: n.x !== undefined,
        hasY: n.y !== undefined,
        hasIconName: n.iconName !== undefined
      })));
      return NextResponse.json({ 
        error: 'Failed to update nodes',
        details: supabaseErrors.map(e => ({
          message: e.message,
          code: e.code,
          details: e.details,
          hint: e.hint
        }))
      }, { status: 500 });
    }

    // 檢查是否有 Promise 被拒絕（驗證錯誤等）
    const rejectedErrors = results.filter(r => r.status === 'rejected');
    if (rejectedErrors.length > 0) {
      console.error('Some nodes failed validation:', rejectedErrors);
      const errorMessages = rejectedErrors.map(r => {
        const reason = (r as PromiseRejectedResult).reason;
        return reason instanceof Error ? reason.message : String(reason);
      });
      return NextResponse.json({ 
        error: 'Some nodes failed validation',
        details: errorMessages
      }, { status: 400 });
    }

    // 計算成功更新的節點數量
    const successfulUpdates = fulfilledResults.filter(r => 
      r.value && !r.value.error
    ).length;

    if (successfulUpdates === 0 && validNodes.length > 0) {
      console.error('No nodes were updated successfully');
      return NextResponse.json({ 
        error: 'No nodes were updated. Please check if the nodes exist and you have permission.',
        attempted: validNodes.length
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      updated: successfulUpdates,
      attempted: validNodes.length
    });
  } catch (error) {
    console.error('Error in PUT /api/courses/[courseId]/nodes/batch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

