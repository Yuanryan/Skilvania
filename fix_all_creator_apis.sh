#!/bin/bash
# 批量修復所有 Creator API 路由
# 將表名改為小寫，使用 admin client，使用 getUserIdFromSession

echo "這個腳本會幫助你批量修復所有 Creator API 路由"
echo "但為了安全，建議手動檢查每個文件"
echo ""
echo "需要修復的文件："
echo "1. src/app/api/courses/[courseId]/edges/route.ts"
echo "2. src/app/api/courses/[courseId]/edges/[edgeId]/route.ts"
echo "3. src/app/api/courses/[courseId]/nodes/batch/route.ts"
echo "4. src/app/api/courses/[courseId]/nodes/[nodeId]/route.ts"
echo "5. src/app/api/courses/[courseId]/nodes/[nodeId]/content/route.ts"
echo ""
echo "主要修改："
echo "- 將 createClient() 改為 createAdminClient()"
echo "- 將表名從大寫改為小寫 (COURSE -> course, NODE -> node, EDGE -> edge)"
echo "- 使用 getUserIdFromSession() 代替 auth_user_bridge 查詢"

