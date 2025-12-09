-- =====================================================
-- NEW TABLES (Fully aligned with existing schema style)
-- =====================================================

-- 1. COURSERATING
CREATE TABLE IF NOT EXISTS COURSERATING (
    "RatingID" SERIAL PRIMARY KEY,
    "CourseID" INT NOT NULL REFERENCES COURSE("CourseID") ON DELETE CASCADE,
    "UserID" INT NOT NULL REFERENCES "USER"("UserID") ON DELETE CASCADE,
    "RatingScore" INT CHECK ("RatingScore" >= 1 AND "RatingScore" <= 5),
    "Comment" TEXT,
    "ReviewedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. SKILLTREE
CREATE TABLE IF NOT EXISTS SKILLTREE (
    "TreeID" SERIAL PRIMARY KEY,
    "CourseID" INT NOT NULL REFERENCES COURSE("CourseID") ON DELETE CASCADE,
    "TreeName" VARCHAR(200) NOT NULL,
    "Status" VARCHAR(20) DEFAULT 'active'
);

-- 3. NODEPREREQUISITES
CREATE TABLE IF NOT EXISTS NODEPREREQUISITES (
    "NodeID" INT NOT NULL REFERENCES NODE("NodeID") ON DELETE CASCADE,
    "PrerequisiteNodeID" INT NOT NULL REFERENCES NODE("NodeID") ON DELETE CASCADE,
    PRIMARY KEY ("NodeID", "PrerequisiteNodeID")
);

-- 4. TASKTYPE
CREATE TABLE IF NOT EXISTS TASKTYPE (
    "TypeID" SERIAL PRIMARY KEY,
    "NodeID" INT NOT NULL REFERENCES NODE("NodeID") ON DELETE CASCADE,
    "TypeName" TEXT NOT NULL
);

-- 5. TASK
CREATE TABLE IF NOT EXISTS TASK (
    "TaskID" SERIAL PRIMARY KEY,
    "NodeID" INT NOT NULL REFERENCES NODE("NodeID") ON DELETE CASCADE,
    "TypeID" INT NOT NULL REFERENCES TASKTYPE("TypeID") ON DELETE CASCADE,
    "Instruction" TEXT NOT NULL
);

-- 6. ACHIEVEMENT
CREATE TABLE IF NOT EXISTS ACHIEVEMENT (
    "AchievementID" SERIAL PRIMARY KEY,
    "Name" VARCHAR(200) NOT NULL,
    "Description" TEXT,
    "CriteriaType" VARCHAR(100)
);

-- 7. USERACHIEVEMENT
CREATE TABLE IF NOT EXISTS USERACHIEVEMENT (
    "AchievementID" INT NOT NULL REFERENCES ACHIEVEMENT("AchievementID") ON DELETE CASCADE,
    "UserID" INT NOT NULL REFERENCES "USER"("UserID") ON DELETE CASCADE,
    "Date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("AchievementID", "UserID")
);

-- =====================================================
-- COMMENTS FOR NEW TABLES (Fully aligned with existing schema style)
-- =====================================================


-- =====================================================
-- 1. COURSERATING
-- =====================================================

COMMENT ON TABLE COURSERATING IS '課程評分表 - Stores user reviews and rating scores for courses';

COMMENT ON COLUMN COURSERATING."RatingID" IS 'Primary key - Unique ID for each rating entry';
COMMENT ON COLUMN COURSERATING."CourseID" IS 'Foreign key - References COURSE("CourseID")';
COMMENT ON COLUMN COURSERATING."UserID" IS 'Foreign key - References USER("UserID")';
COMMENT ON COLUMN COURSERATING."RatingScore" IS 'Rating score from 1 to 5 given by a user';
COMMENT ON COLUMN COURSERATING."Comment" IS 'Optional text comment from the user';
COMMENT ON COLUMN COURSERATING."ReviewedAt" IS 'Timestamp when the review was created';


-- =====================================================
-- 2. SKILLTREE
-- =====================================================

COMMENT ON TABLE SKILLTREE IS '技能樹表 - Defines hierarchical skill trees belonging to a course';

COMMENT ON COLUMN SKILLTREE."TreeID" IS 'Primary key - Unique skill tree ID';
COMMENT ON COLUMN SKILLTREE."CourseID" IS 'Foreign key - References COURSE("CourseID")';
COMMENT ON COLUMN SKILLTREE."TreeName" IS 'Name of the skill tree';
COMMENT ON COLUMN SKILLTREE."Status" IS 'Status of the skill tree (e.g., active, archived)';


-- =====================================================
-- 3. NODEPREREQUISITES
-- =====================================================

COMMENT ON TABLE NODEPREREQUISITES IS '節點先決條件表 - Defines prerequisite node relationships';

COMMENT ON COLUMN NODEPREREQUISITES."NodeID" IS 'Foreign key - Node requiring prerequisites';
COMMENT ON COLUMN NODEPREREQUISITES."PrerequisiteNodeID" IS 'Foreign key - Node that must be completed first';


-- =====================================================
-- 4. TASKTYPE
-- =====================================================

COMMENT ON TABLE TASKTYPE IS '任務類型表 - Defines categories of tasks (quiz, project, reading, etc.)';

COMMENT ON COLUMN TASKTYPE."TypeID" IS 'Primary key - Unique ID for each task type';
COMMENT ON COLUMN TASKTYPE."TypeName" IS 'Task type name (e.g., "quiz", "assignment", "project")';


-- =====================================================
-- 5. TASK
-- =====================================================

COMMENT ON TABLE TASK IS '任務表 - Defines tasks associated with skill tree nodes';

COMMENT ON COLUMN TASK."TaskID" IS 'Primary key - Unique task ID';
COMMENT ON COLUMN TASK."NodeID" IS 'Foreign key - References NODE("NodeID")';
COMMENT ON COLUMN TASK."TypeID" IS 'Foreign key - References TASKTYPE("TypeID")';
COMMENT ON COLUMN TASK."Instruction" IS 'Instruction or content of the task';


-- =====================================================
-- 6. ACHIEVEMENT
-- =====================================================

COMMENT ON TABLE ACHIEVEMENT IS '成就表 - Defines achievements users can unlock';

COMMENT ON COLUMN ACHIEVEMENT."AchievementID" IS 'Primary key - Unique achievement ID';
COMMENT ON COLUMN ACHIEVEMENT."Name" IS 'Name of the achievement';
COMMENT ON COLUMN ACHIEVEMENT."Description" IS 'Description of the achievement requirements';
COMMENT ON COLUMN ACHIEVEMENT."CriteriaType" IS 'Defines how this achievement is unlocked';


-- =====================================================
-- 7. USERACHIEVEMENT
-- =====================================================

COMMENT ON TABLE USERACHIEVEMENT IS '使用者成就表 - Tracks achievements earned by each user';

COMMENT ON COLUMN USERACHIEVEMENT."AchievementID" IS 'Foreign key - References ACHIEVEMENT("AchievementID")';
COMMENT ON COLUMN USERACHIEVEMENT."UserID" IS 'Foreign key - References USER("UserID")';
COMMENT ON COLUMN USERACHIEVEMENT."Date" IS 'Timestamp when the user earned the achievement';
