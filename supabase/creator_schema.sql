-- =============================================
-- Creator 功能資料庫 Schema 擴展
-- 執行此文件以創建 COURSE, NODE, EDGE, USERPROGRESS, SUBMISSION 表
-- =============================================

-- =============================================
-- Table: COURSE (課程表)
-- =============================================
CREATE TABLE IF NOT EXISTS COURSE (
    "CourseID" SERIAL PRIMARY KEY,
    "Title" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "CreatorID" INT NOT NULL REFERENCES "USER"("UserID") ON DELETE CASCADE,
    "Status" VARCHAR(20) DEFAULT 'draft' CHECK ("Status" IN ('draft', 'published', 'archived')),
    "TotalNodes" INT DEFAULT 0 CHECK ("TotalNodes" >= 0),
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: NODE (節點表)
-- =============================================
CREATE TABLE IF NOT EXISTS NODE (
    "NodeID" SERIAL PRIMARY KEY,
    "CourseID" INT NOT NULL REFERENCES COURSE("CourseID") ON DELETE CASCADE,
    "Title" VARCHAR(200) NOT NULL,
    "Type" VARCHAR(20) NOT NULL CHECK ("Type" IN ('theory', 'code', 'project')),
    "XP" INT DEFAULT 100 CHECK ("XP" >= 0),
    "X" INT NOT NULL CHECK ("X" >= 0 AND "X" <= 800),
    "Y" INT NOT NULL CHECK ("Y" >= 0 AND "Y" <= 800),
    "IconName" VARCHAR(50),
    "Description" TEXT,
    "Content" TEXT, -- HTML/Markdown 內容
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: EDGE (連接線表)
-- =============================================
CREATE TABLE IF NOT EXISTS EDGE (
    "EdgeID" SERIAL PRIMARY KEY,
    "CourseID" INT NOT NULL REFERENCES COURSE("CourseID") ON DELETE CASCADE,
    "FromNodeID" INT NOT NULL REFERENCES NODE("NodeID") ON DELETE CASCADE,
    "ToNodeID" INT NOT NULL REFERENCES NODE("NodeID") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("FromNodeID", "ToNodeID"), -- 防止重複連接
    CHECK ("FromNodeID" != "ToNodeID") -- 防止節點連接到自己
);

-- =============================================
-- Table: USERPROGRESS (學習進度表)
-- =============================================
CREATE TABLE IF NOT EXISTS USERPROGRESS (
    "ProgressID" SERIAL PRIMARY KEY,
    "UserID" INT NOT NULL REFERENCES "USER"("UserID") ON DELETE CASCADE,
    "NodeID" INT NOT NULL REFERENCES NODE("NodeID") ON DELETE CASCADE,
    "Status" VARCHAR(20) DEFAULT 'locked' CHECK ("Status" IN ('locked', 'unlocked', 'completed')),
    "CompletedAt" TIMESTAMP WITH TIME ZONE,
    "SubmissionURL" TEXT, -- 學生提交的 URL
    "SubmissionText" TEXT, -- 學生提交的文字
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("UserID", "NodeID")
);

-- =============================================
-- Table: SUBMISSION (提交審核表)
-- =============================================
CREATE TABLE IF NOT EXISTS SUBMISSION (
    "SubmissionID" SERIAL PRIMARY KEY,
    "ProgressID" INT NOT NULL REFERENCES USERPROGRESS("ProgressID") ON DELETE CASCADE,
    "Status" VARCHAR(20) DEFAULT 'pending' CHECK ("Status" IN ('pending', 'approved', 'rejected')),
    "Feedback" TEXT, -- Creator 的評語
    "ReviewedAt" TIMESTAMP WITH TIME ZONE,
    "ReviewedBy" INT REFERENCES "USER"("UserID"),
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_course_creator ON COURSE("CreatorID");
CREATE INDEX IF NOT EXISTS idx_course_status ON COURSE("Status");
CREATE INDEX IF NOT EXISTS idx_node_course ON NODE("CourseID");
CREATE INDEX IF NOT EXISTS idx_edge_course ON EDGE("CourseID");
CREATE INDEX IF NOT EXISTS idx_edge_from ON EDGE("FromNodeID");
CREATE INDEX IF NOT EXISTS idx_edge_to ON EDGE("ToNodeID");
CREATE INDEX IF NOT EXISTS idx_progress_user ON USERPROGRESS("UserID");
CREATE INDEX IF NOT EXISTS idx_progress_node ON USERPROGRESS("NodeID");
CREATE INDEX IF NOT EXISTS idx_submission_progress ON SUBMISSION("ProgressID");
CREATE INDEX IF NOT EXISTS idx_submission_status ON SUBMISSION("Status");

-- =============================================
-- Trigger: Update COURSE.UpdatedAt
-- =============================================
CREATE OR REPLACE FUNCTION update_course_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE COURSE SET "UpdatedAt" = CURRENT_TIMESTAMP WHERE "CourseID" = NEW."CourseID";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_course_updated_at ON NODE;
CREATE TRIGGER trigger_update_course_updated_at
    AFTER INSERT OR UPDATE OR DELETE ON NODE
    FOR EACH ROW EXECUTE FUNCTION update_course_updated_at();

DROP TRIGGER IF EXISTS trigger_update_course_updated_at_edge ON EDGE;
CREATE TRIGGER trigger_update_course_updated_at_edge
    AFTER INSERT OR UPDATE OR DELETE ON EDGE
    FOR EACH ROW EXECUTE FUNCTION update_course_updated_at();

-- =============================================
-- Trigger: Update COURSE.TotalNodes
-- =============================================
CREATE OR REPLACE FUNCTION update_course_total_nodes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE COURSE SET "TotalNodes" = "TotalNodes" + 1 WHERE "CourseID" = NEW."CourseID";
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE COURSE SET "TotalNodes" = "TotalNodes" - 1 WHERE "CourseID" = OLD."CourseID";
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_total_nodes ON NODE;
CREATE TRIGGER trigger_update_total_nodes
    AFTER INSERT OR DELETE ON NODE
    FOR EACH ROW EXECUTE FUNCTION update_course_total_nodes();

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE COURSE ENABLE ROW LEVEL SECURITY;
ALTER TABLE NODE ENABLE ROW LEVEL SECURITY;
ALTER TABLE EDGE ENABLE ROW LEVEL SECURITY;
ALTER TABLE USERPROGRESS ENABLE ROW LEVEL SECURITY;
ALTER TABLE SUBMISSION ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON COURSE;
DROP POLICY IF EXISTS "Creators can manage their own courses" ON COURSE;
DROP POLICY IF EXISTS "Nodes are viewable by everyone" ON NODE;
DROP POLICY IF EXISTS "Creators can manage nodes in their courses" ON NODE;
DROP POLICY IF EXISTS "Edges are viewable by everyone" ON EDGE;
DROP POLICY IF EXISTS "Creators can manage edges in their courses" ON EDGE;
DROP POLICY IF EXISTS "Users can view their own progress" ON USERPROGRESS;
DROP POLICY IF EXISTS "Users can update their own progress" ON USERPROGRESS;
DROP POLICY IF EXISTS "Submissions are viewable by course creators" ON SUBMISSION;
DROP POLICY IF EXISTS "Creators can review submissions" ON SUBMISSION;

-- COURSE policies
CREATE POLICY "Courses are viewable by everyone" ON COURSE
    FOR SELECT USING (true);

CREATE POLICY "Creators can manage their own courses" ON COURSE
    FOR ALL USING (
        "CreatorID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

-- NODE policies
CREATE POLICY "Nodes are viewable by everyone" ON NODE
    FOR SELECT USING (true);

CREATE POLICY "Creators can manage nodes in their courses" ON NODE
    FOR ALL USING (
        "CourseID" IN (
            SELECT "CourseID" FROM COURSE
            WHERE "CreatorID" IN (
                SELECT user_id FROM auth_user_bridge
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- EDGE policies
CREATE POLICY "Edges are viewable by everyone" ON EDGE
    FOR SELECT USING (true);

CREATE POLICY "Creators can manage edges in their courses" ON EDGE
    FOR ALL USING (
        "CourseID" IN (
            SELECT "CourseID" FROM COURSE
            WHERE "CreatorID" IN (
                SELECT user_id FROM auth_user_bridge
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- USERPROGRESS policies
CREATE POLICY "Users can view their own progress" ON USERPROGRESS
    FOR SELECT USING (
        "UserID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own progress" ON USERPROGRESS
    FOR ALL USING (
        "UserID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

-- SUBMISSION policies
CREATE POLICY "Submissions are viewable by course creators" ON SUBMISSION
    FOR SELECT USING (
        "ProgressID" IN (
            SELECT up."ProgressID" FROM USERPROGRESS up
            JOIN NODE n ON up."NodeID" = n."NodeID"
            JOIN COURSE c ON n."CourseID" = c."CourseID"
            WHERE c."CreatorID" IN (
                SELECT user_id FROM auth_user_bridge
                WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Creators can review submissions" ON SUBMISSION
    FOR UPDATE USING (
        "ProgressID" IN (
            SELECT up."ProgressID" FROM USERPROGRESS up
            JOIN NODE n ON up."NodeID" = n."NodeID"
            JOIN COURSE c ON n."CourseID" = c."CourseID"
            WHERE c."CreatorID" IN (
                SELECT user_id FROM auth_user_bridge
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- =============================================
-- Comments for Documentation
-- =============================================
COMMENT ON TABLE COURSE IS '課程表 - Stores course information created by creators';
COMMENT ON TABLE NODE IS '節點表 - Stores skill tree nodes with positions and content';
COMMENT ON TABLE EDGE IS '連接線表 - Stores dependencies between nodes';
COMMENT ON TABLE USERPROGRESS IS '學習進度表 - Tracks user progress through nodes';
COMMENT ON TABLE SUBMISSION IS '提交審核表 - Stores student submissions for review';

