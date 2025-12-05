-- =============================================
-- Table: tag (標籤表)
-- =============================================
CREATE TABLE IF NOT EXISTS tag (
    "TagID" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) UNIQUE NOT NULL, -- Skill Name
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tag IS '標籤表 - Stores skill tags used by courses';


-- =============================================
-- Table: course_tag (課程 × 標籤 關聯表)
-- Many-to-Many relationship
-- =============================================
CREATE TABLE IF NOT EXISTS course_tag (
    "CourseID" INT NOT NULL REFERENCES course("CourseID") ON DELETE CASCADE,
    "TagID" INT NOT NULL REFERENCES tag("TagID") ON DELETE CASCADE,
    PRIMARY KEY ("CourseID", "TagID")
);

COMMENT ON TABLE course_tag IS '課程標籤關聯表 - Links courses with multiple skill tags';


-- =============================================
-- Indexes (加速查詢)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tag_name ON tag("Name");
CREATE INDEX IF NOT EXISTS idx_course_tag_course ON course_tag("CourseID");
CREATE INDEX IF NOT EXISTS idx_course_tag_tag ON course_tag("TagID");

-- Enable RLS
ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_tag ENABLE ROW LEVEL SECURITY;

-- Everyone can read tags
CREATE POLICY "Tags are viewable by everyone" ON tag
    FOR SELECT USING (true);

-- Only creators can attach tags to their own courses
CREATE POLICY "Creators manage course tags" ON course_tag
    FOR ALL USING (
        "CourseID" IN (
            SELECT "CourseID" FROM course
            WHERE "CreatorID" IN (
                SELECT user_id FROM auth_user_bridge
                WHERE auth_user_id = auth.uid()
            )
        )
    );
