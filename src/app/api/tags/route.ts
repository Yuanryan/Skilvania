import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/tags - 獲取所有標籤
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = supabase
      .from('tag')
      .select('TagID, Name')
      .order('Name', { ascending: true });

    // 如果提供了搜索參數，進行名稱搜索
    if (search && search.trim()) {
      query = query.ilike('Name', `%${search.trim()}%`);
    }

    const { data: tags, error } = await query;

    if (error) {
      console.error('Error fetching tags:', error);
      return NextResponse.json(
        { error: '獲取標籤失敗' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tags: tags || [] });
  } catch (error) {
    console.error('Error in GET /api/tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tags - 創建新標籤（如果不存在）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 先檢查標籤是否已存在
    const { data: existingTag } = await supabase
      .from('tag')
      .select('TagID, Name')
      .eq('Name', name.trim())
      .single();

    if (existingTag) {
      return NextResponse.json({ tag: existingTag });
    }

    // 創建新標籤
    const { data: tag, error } = await supabase
      .from('tag')
      .insert({
        Name: name.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tag:', error);
      return NextResponse.json(
        { error: '創建標籤失敗' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

