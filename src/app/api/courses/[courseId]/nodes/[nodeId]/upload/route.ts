import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserIdFromSession } from '@/lib/utils/getUserId';
import convert from 'heic-convert';

// POST /api/courses/[courseId]/nodes/[nodeId]/upload - 上傳圖片到 Supabase Storage
export async function POST(
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

    if (courseError) {
      console.error('Error fetching course:', courseError);
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!course || course.CreatorID !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 解析 FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 驗證文件類型（支援多種圖片格式和 PDF）
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf'
    ];
    
    // 也檢查文件擴展名（因為某些瀏覽器可能無法正確識別 HEIC 的 MIME type）
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'pdf'];
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt || '')) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed formats: JPEG, PNG, GIF, WebP, HEIC, HEIF, PDF' 
      }, { status: 400 });
    }

    // 驗證文件大小（限制為 5MB，但 PDF 和 HEIC 可以稍大一些）
    const maxSize = 5 * 1024 * 1024; // 5MB
    const isPdfOrHeic = fileExt === 'pdf' || fileExt === 'heic' || fileExt === 'heif' || 
                        file.type === 'application/pdf' || 
                        file.type.includes('heic') || 
                        file.type.includes('heif');
    const maxSizeForPdfHeic = 10 * 1024 * 1024; // PDF 和 HEIC 允許 10MB
    
    if (file.size > (isPdfOrHeic ? maxSizeForPdfHeic : maxSize)) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${isPdfOrHeic ? '10MB' : '5MB'}` 
      }, { status: 400 });
    }

    // 檢查是否為 HEIC/HEIF 文件
    const isHeic = fileExt === 'heic' || fileExt === 'heif' || 
                   file.type.includes('heic') || file.type.includes('heif');
    
    let finalBuffer: Buffer;
    let finalFileName: string;
    let finalContentType: string;
    
    // 轉換 File 為 Buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    
    // 如果是 HEIC，轉換為 JPEG
    if (isHeic) {
      try {
        console.log('檢測到 HEIC 文件，開始轉換為 JPEG...');
        console.log('文件信息:', {
          name: file.name,
          type: file.type,
          size: file.size,
          ext: fileExt
        });
        
        // 使用 heic-convert 轉換為 JPEG
        const jpegBuffer = await convert({
          buffer: inputBuffer,
          format: 'JPEG',
          quality: 0.92 // 高品質轉換 (0-1)
        });
        
        // 生成新的文件名（.jpg）
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        finalFileName = `${timestamp}-${randomString}.jpg`;
        finalBuffer = jpegBuffer;
        finalContentType = 'image/jpeg';
        
        console.log(`HEIC 轉換完成：${file.name} → ${finalFileName}`);
        console.log(`原始大小：${(file.size / 1024 / 1024).toFixed(2)}MB，轉換後：${(jpegBuffer.length / 1024 / 1024).toFixed(2)}MB`);
      } catch (conversionError: any) {
        console.error('HEIC 轉換失敗:', conversionError);
        console.error('轉換錯誤詳情:', {
          message: conversionError?.message,
          code: conversionError?.code,
          errno: conversionError?.errno,
          syscall: conversionError?.syscall,
          error: conversionError
        });
        
        // 檢查是否是 libheif 未安裝的錯誤
        const errorMessage = conversionError?.message || String(conversionError);
        let userMessage = '無法將 HEIC 文件轉換為 JPEG。請嘗試使用其他格式（如 JPEG 或 PNG）。';
        
        if (errorMessage.includes('libheif') || errorMessage.includes('not found') || errorMessage.includes('ENOENT')) {
          userMessage = 'HEIC 轉換功能需要系統依賴。請聯繫管理員安裝 libheif，或使用其他格式（如 JPEG 或 PNG）。';
        }
        
        return NextResponse.json({ 
          error: 'HEIC 文件轉換失敗',
          details: userMessage,
          originalError: errorMessage
        }, { status: 400 });
      }
    } else {
      // 非 HEIC 文件，直接使用
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileNameExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      finalFileName = `${timestamp}-${randomString}.${fileNameExt}`;
      finalBuffer = inputBuffer;
      finalContentType = file.type;
    }
    
    // 構建 Storage 路徑：course-image/course-{courseId}/node-{nodeId}/{fileName}
    const filePath = `course-${courseId}/node-${nodeId}/${finalFileName}`;

    // 檢查 bucket 是否存在
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return NextResponse.json({ 
        error: 'Failed to access storage', 
        details: bucketsError.message 
      }, { status: 500 });
    }

    const bucketExists = buckets?.some(bucket => bucket.name === 'course-image');
    if (!bucketExists) {
      console.error('Bucket "course-image" does not exist');
      return NextResponse.json({ 
        error: 'Storage bucket not found', 
        details: 'Please create the "course-image" bucket in Supabase Storage. See SUPABASE_STORAGE_SETUP.md for instructions.'
      }, { status: 500 });
    }

    // 上傳到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course-image')
      .upload(filePath, finalBuffer, {
        contentType: finalContentType,
        upsert: false // 不覆蓋已存在的文件
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      
      // 提供更詳細的錯誤訊息
      let errorMessage = 'Failed to upload file';
      if (uploadError.message.includes('Bucket not found')) {
        errorMessage = 'Storage bucket "course-image" not found. Please create it in Supabase Dashboard.';
      } else if (uploadError.message.includes('new row violates row-level security')) {
        errorMessage = 'Permission denied. Please check Storage policies.';
      } else if (uploadError.message.includes('duplicate')) {
        errorMessage = 'File already exists. Please try again.';
      }
      
      return NextResponse.json({ 
        error: errorMessage, 
        details: uploadError.message 
      }, { status: 500 });
    }

    // 獲取公開 URL
    const { data: urlData } = supabase.storage
      .from('course-image')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return NextResponse.json({ 
        error: 'Failed to get public URL' 
      }, { status: 500 });
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath,
      size: file.size,
      type: file.type
    });

  } catch (error: any) {
    console.error('Error in upload route:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      errno: error?.errno,
      syscall: error?.syscall,
      error: error
    });
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : (typeof error === 'string' ? error : 'Unknown error');
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: errorMessage,
      originalError: errorMessage
    }, { status: 500 });
  }
}

