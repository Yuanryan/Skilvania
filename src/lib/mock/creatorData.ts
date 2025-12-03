// Mock 資料生成器 - 用於測試 Creator 功能（當資料庫尚未建立時）

let mockCourseIdCounter = 1;
let mockNodeIdCounter = 1;
let mockEdgeIdCounter = 1;

// 儲存 mock 資料（在記憶體中）
const mockCourses: Map<number, any> = new Map();
const mockNodes: Map<number, any[]> = new Map(); // courseId -> nodes[]
const mockEdges: Map<number, any[]> = new Map(); // courseId -> edges[]
const mockContent: Map<number, string> = new Map(); // nodeId -> content

// 初始化一些範例資料
export function initializeMockData() {
  // 創建一個範例課程
  const exampleCourse = {
    CourseID: 1,
    Title: "範例課程 - Full Stack Web Developer",
    Description: "這是一個範例課程，用於測試",
    CreatorID: 1,
    Status: 'draft',
    TotalNodes: 3,
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString()
  };
  mockCourses.set(1, exampleCourse);

  // 創建範例節點
  mockNodes.set(1, [
    {
      NodeID: 1,
      CourseID: 1,
      Title: "HTML Roots",
      Type: "theory",
      XP: 100,
      X: 400,
      Y: 700,
      IconName: "Globe",
      Description: "學習 HTML 基礎",
      Content: "<h2>HTML 基礎</h2><p>HTML 是網頁的骨架...</p>",
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    },
    {
      NodeID: 2,
      CourseID: 1,
      Title: "CSS Trunk",
      Type: "theory",
      XP: 150,
      X: 400,
      Y: 550,
      IconName: "Layout",
      Description: "學習 CSS 樣式",
      Content: "<h2>CSS 樣式</h2><p>CSS 讓網頁變漂亮...</p>",
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    },
    {
      NodeID: 3,
      CourseID: 1,
      Title: "JS Logic",
      Type: "code",
      XP: 300,
      X: 250,
      Y: 450,
      IconName: "Code",
      Description: "學習 JavaScript",
      Content: "<h2>JavaScript</h2><p>JavaScript 讓網頁動起來...</p>",
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    }
  ]);

  // 創建範例連接
  mockEdges.set(1, [
    {
      EdgeID: 1,
      CourseID: 1,
      FromNodeID: 1,
      ToNodeID: 2,
      CreatedAt: new Date().toISOString()
    },
    {
      EdgeID: 2,
      CourseID: 1,
      FromNodeID: 2,
      ToNodeID: 3,
      CreatedAt: new Date().toISOString()
    }
  ]);

  // 儲存內容
  mockContent.set(1, "<h2>HTML 基礎</h2><p>HTML 是網頁的骨架...</p>");
  mockContent.set(2, "<h2>CSS 樣式</h2><p>CSS 讓網頁變漂亮...</p>");
  mockContent.set(3, "<h2>JavaScript</h2><p>JavaScript 讓網頁動起來...</p>");
}

// 檢查是否應該使用 mock 模式
export function shouldUseMock(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';
  
  // 檢查常見的資料庫錯誤
  return (
    errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
    errorMessage.includes('table') && errorMessage.includes('does not exist') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('fetch failed') ||
    errorCode === '42P01' || // PostgreSQL: relation does not exist
    errorCode === 'PGRST116' || // PostgREST: relation not found
    errorCode === 'ETIMEDOUT' ||
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ENOTFOUND'
  );
}

// Mock API 函數
export const mockAPI = {
  // 獲取所有課程
  getCourses(userId: number) {
    const courses = Array.from(mockCourses.values())
      .filter(c => c.CreatorID === userId)
      .map(c => ({
        CourseID: c.CourseID,
        Title: c.Title,
        Description: c.Description,
        CreatorID: c.CreatorID,
        Status: c.Status,
        TotalNodes: c.TotalNodes,
        CreatedAt: c.CreatedAt,
        UpdatedAt: c.UpdatedAt
      }));
    return { courses, error: null };
  },

  // 創建課程
  createCourse(userId: number, title: string, description?: string) {
    const courseId = mockCourseIdCounter++;
    const course = {
      CourseID: courseId,
      Title: title,
      Description: description || null,
      CreatorID: userId,
      Status: 'draft',
      TotalNodes: 0,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };
    mockCourses.set(courseId, course);
    mockNodes.set(courseId, []);
    mockEdges.set(courseId, []);
    return { course, error: null };
  },

  // 獲取課程詳情
  getCourse(courseId: number) {
    const course = mockCourses.get(courseId);
    if (!course) {
      return { course: null, error: { message: 'Course not found' } };
    }
    const nodes = mockNodes.get(courseId) || [];
    const edges = mockEdges.get(courseId) || [];
    return { course, nodes, edges, error: null };
  },

  // 創建節點
  createNode(courseId: number, nodeData: any) {
    const nodeId = mockNodeIdCounter++;
    const node = {
      NodeID: nodeId,
      CourseID: courseId,
      Title: nodeData.title,
      Type: nodeData.type,
      XP: nodeData.xp || 100,
      X: nodeData.x,
      Y: nodeData.y,
      IconName: nodeData.iconName || 'Code',
      Description: nodeData.description || null,
      Content: null,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };
    
    const nodes = mockNodes.get(courseId) || [];
    nodes.push(node);
    mockNodes.set(courseId, nodes);
    
    // 更新課程的 TotalNodes
    const course = mockCourses.get(courseId);
    if (course) {
      course.TotalNodes = nodes.length;
      course.UpdatedAt = new Date().toISOString();
    }
    
    return { node, error: null };
  },

  // 更新節點
  updateNode(courseId: number, nodeId: number, updates: any) {
    const nodes = mockNodes.get(courseId) || [];
    const nodeIndex = nodes.findIndex(n => n.NodeID === nodeId);
    
    if (nodeIndex === -1) {
      return { node: null, error: { message: 'Node not found' } };
    }
    
    nodes[nodeIndex] = { ...nodes[nodeIndex], ...updates, UpdatedAt: new Date().toISOString() };
    mockNodes.set(courseId, nodes);
    
    // 更新課程的 UpdatedAt
    const course = mockCourses.get(courseId);
    if (course) {
      course.UpdatedAt = new Date().toISOString();
    }
    
    return { node: nodes[nodeIndex], error: null };
  },

  // 刪除節點
  deleteNode(courseId: number, nodeId: number) {
    const nodes = mockNodes.get(courseId) || [];
    const filteredNodes = nodes.filter(n => n.NodeID !== nodeId);
    mockNodes.set(courseId, filteredNodes);
    
    // 刪除相關連接
    const edges = mockEdges.get(courseId) || [];
    const filteredEdges = edges.filter(e => e.FromNodeID !== nodeId && e.ToNodeID !== nodeId);
    mockEdges.set(courseId, filteredEdges);
    
    // 更新課程的 TotalNodes
    const course = mockCourses.get(courseId);
    if (course) {
      course.TotalNodes = filteredNodes.length;
      course.UpdatedAt = new Date().toISOString();
    }
    
    return { error: null };
  },

  // 批量更新節點位置
  batchUpdateNodes(courseId: number, nodeUpdates: Array<{ nodeId: string; x: number; y: number }>) {
    const nodes = mockNodes.get(courseId) || [];
    
    nodeUpdates.forEach(update => {
      const node = nodes.find(n => n.NodeID.toString() === update.nodeId);
      if (node) {
        node.X = update.x;
        node.Y = update.y;
        node.UpdatedAt = new Date().toISOString();
      }
    });
    
    mockNodes.set(courseId, nodes);
    return { error: null };
  },

  // 創建連接
  createEdge(courseId: number, fromNodeId: number, toNodeId: number) {
    const nodes = mockNodes.get(courseId) || [];
    const edges = mockEdges.get(courseId) || [];
    
    // 檢查節點是否存在
    const fromNode = nodes.find(n => n.NodeID === parseInt(fromNodeId.toString()));
    const toNode = nodes.find(n => n.NodeID === parseInt(toNodeId.toString()));
    
    if (!fromNode || !toNode) {
      return { edge: null, error: { message: 'One or both nodes not found' } };
    }
    
    // 檢查是否已存在
    const exists = edges.some(e => e.FromNodeID === parseInt(fromNodeId.toString()) && e.ToNodeID === parseInt(toNodeId.toString()));
    if (exists) {
      return { edge: null, error: { message: 'Edge already exists' } };
    }
    
    const edgeId = mockEdgeIdCounter++;
    const edge = {
      EdgeID: edgeId,
      CourseID: courseId,
      FromNodeID: parseInt(fromNodeId.toString()),
      ToNodeID: parseInt(toNodeId.toString()),
      CreatedAt: new Date().toISOString()
    };
    
    edges.push(edge);
    mockEdges.set(courseId, edges);
    
    return { edge, error: null };
  },

  // 刪除連接
  deleteEdge(courseId: number, edgeId: number) {
    const edges = mockEdges.get(courseId) || [];
    const filteredEdges = edges.filter(e => e.EdgeID !== edgeId);
    mockEdges.set(courseId, filteredEdges);
    return { error: null };
  },

  // 獲取節點內容
  getNodeContent(courseId: number, nodeId: number) {
    const nodes = mockNodes.get(courseId) || [];
    const node = nodes.find(n => n.NodeID === nodeId);
    
    if (!node) {
      return { content: null, title: null, error: { message: 'Node not found' } };
    }
    
    const content = mockContent.get(nodeId) || node.Content || '';
    return { content, title: node.Title, error: null };
  },

  // 保存節點內容
  saveNodeContent(courseId: number, nodeId: number, content: string) {
    const nodes = mockNodes.get(courseId) || [];
    const node = nodes.find(n => n.NodeID === nodeId);
    
    if (!node) {
      return { content: null, error: { message: 'Node not found' } };
    }
    
    mockContent.set(nodeId, content);
    node.Content = content;
    node.UpdatedAt = new Date().toISOString();
    
    return { content, error: null };
  }
};

// 初始化 mock 資料
initializeMockData();

