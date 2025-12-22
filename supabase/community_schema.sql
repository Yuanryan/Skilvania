-- =============================================
-- Community & Study Buddy System Schema
-- =============================================
-- This schema adds community features including:
-- - User community profiles
-- - Buddy connection system
-- - Direct messaging

-- =============================================
-- Prerequisites
-- =============================================
-- This schema requires the main tables in schema.sql.
-- It also bootstraps the auth bridge table (auth_user_bridge) if it hasn't been created yet.

-- =============================================
-- Auth Bridge (bootstrap if missing)
-- =============================================
CREATE TABLE IF NOT EXISTS public.auth_user_bridge (
    auth_user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    user_id INTEGER REFERENCES public."USER"("UserID"),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_bridge_auth_user ON public.auth_user_bridge(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_bridge_user ON public.auth_user_bridge(user_id);

ALTER TABLE public.auth_user_bridge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bridge record" ON public.auth_user_bridge;
DROP POLICY IF EXISTS "Users can insert their own bridge record" ON public.auth_user_bridge;

CREATE POLICY "Users can view their own bridge record" ON public.auth_user_bridge
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Users can insert their own bridge record" ON public.auth_user_bridge
    FOR INSERT WITH CHECK (auth_user_id = auth.uid());

COMMENT ON TABLE public.auth_user_bridge IS 'Authentication bridge between Supabase Auth and custom USER table';
COMMENT ON COLUMN public.auth_user_bridge.auth_user_id IS 'Supabase Auth user UUID';
COMMENT ON COLUMN public.auth_user_bridge.user_id IS 'Custom USER table UserID';

-- =============================================
-- Table 1: community_profiles (社群個人檔案)
-- =============================================
CREATE TABLE IF NOT EXISTS community_profiles (
    "ProfileID" SERIAL PRIMARY KEY,
    "UserID" INT NOT NULL UNIQUE,
    "Bio" TEXT,
    "Interests" TEXT[] DEFAULT '{}',
    "LookingForBuddy" BOOLEAN DEFAULT true,
    "LastActiveCourseID" INT,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("UserID") REFERENCES public."USER"("UserID") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Bootstrap missing community profiles for existing users
INSERT INTO community_profiles ("UserID")
SELECT "UserID" FROM public."USER"
ON CONFLICT ("UserID") DO NOTHING;

-- =============================================
-- Table 2: buddy_connections (學習夥伴連接)
-- =============================================
CREATE TABLE IF NOT EXISTS buddy_connections (
    "ConnectionID" SERIAL PRIMARY KEY,
    "RequesterID" INT NOT NULL,
    "ReceiverID" INT NOT NULL,
    "Status" VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ("Status" IN ('pending', 'accepted', 'rejected')),
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("RequesterID") REFERENCES public."USER"("UserID") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("ReceiverID") REFERENCES public."USER"("UserID") ON DELETE CASCADE ON UPDATE CASCADE,
    -- Prevent duplicate connection requests
    UNIQUE ("RequesterID", "ReceiverID"),
    -- Prevent self-connections
    CHECK ("RequesterID" != "ReceiverID")
);

-- =============================================
-- Table 3: community_messages (社群訊息)
-- =============================================
CREATE TABLE IF NOT EXISTS community_messages (
    "MessageID" SERIAL PRIMARY KEY,
    "SenderID" INT NOT NULL,
    "ReceiverID" INT NOT NULL,
    "Content" TEXT NOT NULL,
    "IsRead" BOOLEAN DEFAULT false,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("SenderID") REFERENCES public."USER"("UserID") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("ReceiverID") REFERENCES public."USER"("UserID") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all community profiles" ON community_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON community_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON community_profiles;

DROP POLICY IF EXISTS "Users can view their own connections" ON buddy_connections;
DROP POLICY IF EXISTS "Users can create connection requests" ON buddy_connections;
DROP POLICY IF EXISTS "Users can update their received connections" ON buddy_connections;

DROP POLICY IF EXISTS "Users can view their own messages" ON community_messages;
DROP POLICY IF EXISTS "Users can send messages" ON community_messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON community_messages;

-- community_profiles policies
CREATE POLICY "Users can view all community profiles" ON community_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON community_profiles
    FOR UPDATE USING (
        "UserID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own profile" ON community_profiles
    FOR INSERT WITH CHECK (
        "UserID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

-- buddy_connections policies
CREATE POLICY "Users can view their own connections" ON buddy_connections
    FOR SELECT USING (
        "RequesterID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        ) OR "ReceiverID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create connection requests" ON buddy_connections
    FOR INSERT WITH CHECK (
        "RequesterID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their received connections" ON buddy_connections
    FOR UPDATE USING (
        "ReceiverID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

-- community_messages policies
CREATE POLICY "Users can view their own messages" ON community_messages
    FOR SELECT USING (
        "SenderID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        ) OR "ReceiverID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages" ON community_messages
    FOR INSERT WITH CHECK (
        "SenderID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their received messages" ON community_messages
    FOR UPDATE USING (
        "ReceiverID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_community_profiles_user ON community_profiles("UserID");
CREATE INDEX IF NOT EXISTS idx_community_profiles_looking ON community_profiles("LookingForBuddy");
CREATE INDEX IF NOT EXISTS idx_community_profiles_course ON community_profiles("LastActiveCourseID");

CREATE INDEX IF NOT EXISTS idx_buddy_connections_requester ON buddy_connections("RequesterID");
CREATE INDEX IF NOT EXISTS idx_buddy_connections_receiver ON buddy_connections("ReceiverID");
CREATE INDEX IF NOT EXISTS idx_buddy_connections_status ON buddy_connections("Status");

CREATE INDEX IF NOT EXISTS idx_community_messages_sender ON community_messages("SenderID");
CREATE INDEX IF NOT EXISTS idx_community_messages_receiver ON community_messages("ReceiverID");
CREATE INDEX IF NOT EXISTS idx_community_messages_created ON community_messages("CreatedAt");

-- =============================================
-- Functions for Auto-Update Timestamps
-- =============================================
CREATE OR REPLACE FUNCTION update_community_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_community_profiles_timestamp ON community_profiles;
CREATE TRIGGER update_community_profiles_timestamp
    BEFORE UPDATE ON community_profiles
    FOR EACH ROW EXECUTE FUNCTION update_community_timestamp();

DROP TRIGGER IF EXISTS update_buddy_connections_timestamp ON buddy_connections;
CREATE TRIGGER update_buddy_connections_timestamp
    BEFORE UPDATE ON buddy_connections
    FOR EACH ROW EXECUTE FUNCTION update_community_timestamp();

-- =============================================
-- Comments for Documentation
-- =============================================
COMMENT ON TABLE community_profiles IS '社群個人檔案 - User profiles for community features';
COMMENT ON TABLE buddy_connections IS '學習夥伴連接 - Connection requests between users';
COMMENT ON TABLE community_messages IS '社群訊息 - Direct messages between users';

COMMENT ON COLUMN community_profiles."Bio" IS '個人簡介 - User bio/description';
COMMENT ON COLUMN community_profiles."Interests" IS '興趣標籤 - Array of interest tags';
COMMENT ON COLUMN community_profiles."LookingForBuddy" IS '尋找學習夥伴 - Whether user is looking for buddies';
COMMENT ON COLUMN community_profiles."LastActiveCourseID" IS '最近活躍課程 - Last course user was active in';

COMMENT ON COLUMN buddy_connections."Status" IS '連接狀態 - Connection status (pending/accepted/rejected)';
COMMENT ON COLUMN community_messages."IsRead" IS '已讀標記 - Whether message has been read';

-- =============================================
-- Auto-maintenance helpers
-- =============================================
CREATE OR REPLACE FUNCTION ensure_community_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO community_profiles ("UserID")
    VALUES (NEW."UserID")
    ON CONFLICT ("UserID") DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_community_profile_after_user_insert ON public."USER";
CREATE TRIGGER ensure_community_profile_after_user_insert
    AFTER INSERT ON public."USER"
    FOR EACH ROW EXECUTE FUNCTION ensure_community_profile();

CREATE OR REPLACE FUNCTION set_last_active_course_from_progress()
RETURNS TRIGGER AS $$
DECLARE
    course_id INT;
BEGIN
    SELECT "CourseID" INTO course_id FROM public.node WHERE "NodeID" = NEW."NodeID";
    IF course_id IS NOT NULL THEN
        UPDATE community_profiles
        SET "LastActiveCourseID" = course_id,
            "UpdatedAt" = CURRENT_TIMESTAMP
        WHERE "UserID" = NEW."UserID";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_last_active_course_on_progress_ins ON public.userprogress;
CREATE TRIGGER set_last_active_course_on_progress_ins
    AFTER INSERT ON public.userprogress
    FOR EACH ROW
    WHEN (NEW."Status" <> 'locked')
    EXECUTE FUNCTION set_last_active_course_from_progress();

DROP TRIGGER IF EXISTS set_last_active_course_on_progress_upd ON public.userprogress;
CREATE TRIGGER set_last_active_course_on_progress_upd
    AFTER UPDATE OF "Status", "NodeID" ON public.userprogress
    FOR EACH ROW
    WHEN (NEW."Status" <> 'locked')
    EXECUTE FUNCTION set_last_active_course_from_progress();

-- =============================================
-- Unified profile view (combines USER + community profile fields)
-- =============================================
CREATE OR REPLACE VIEW public.user_profile AS
SELECT
    u."UserID",
    u."Username",
    u."Email",
    u."XP",
    u."Level",
    cp."Bio",
    cp."Interests",
    cp."LookingForBuddy",
    cp."LastActiveCourseID",
    cp."CreatedAt" AS "CommunityCreatedAt",
    cp."UpdatedAt" AS "CommunityUpdatedAt"
FROM public."USER" u
LEFT JOIN community_profiles cp ON cp."UserID" = u."UserID";

COMMENT ON VIEW public.user_profile IS 'Combined view of USER base profile with community profile fields';
