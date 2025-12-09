-- Database schema for 興趣技能樹 (Interest Skill Tree) based on data dictionary

-- =============================================
-- Table 1: ROLES (角色表)
-- =============================================
CREATE TABLE IF NOT EXISTS ROLES (
    "RoleID" INT PRIMARY KEY,
    "RoleName" VARCHAR(50) NOT NULL
);

-- Insert default roles (only if they don't exist)
-- Insert default roles (only if they don't exist)
INSERT INTO ROLES ("RoleID", "RoleName") VALUES
  (1, 'admin'),
  (2, 'user');

-- =============================================
-- Table 2: USER (使用者表)
-- =============================================
CREATE TABLE IF NOT EXISTS "USER" (
    "UserID" SERIAL PRIMARY KEY,
    "Username" VARCHAR(100) NOT NULL UNIQUE,
    "Email" VARCHAR(150) NOT NULL UNIQUE,
    "Password" VARCHAR(255),
    "XP" INT DEFAULT 0 CHECK ("XP" >= 0),
    "Level" INT DEFAULT 1 CHECK ("Level" >= 1),
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table 3: USERROLE (使用者角色關聯表)
-- =============================================
CREATE TABLE IF NOT EXISTS USERROLE (
    "UserID" INT NOT NULL,
    "RoleID" INT NOT NULL,
    PRIMARY KEY ("UserID", "RoleID"),
    FOREIGN KEY ("UserID") REFERENCES "USER"("UserID") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("RoleID") REFERENCES ROLES("RoleID") ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================
-- Supabase Auth Integration
-- =============================================
-- Create a bridge table for Supabase Auth users
CREATE TABLE IF NOT EXISTS auth_user_bridge (
    auth_user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
    user_id INT REFERENCES "USER"("UserID"),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to automatically create USER record when auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id INT;
    user_username TEXT;
BEGIN
    -- Get username from metadata, fallback to generated username
    user_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8));

    -- Check if username already exists (shouldn't happen due to client-side check, but safety measure)
    IF EXISTS (SELECT 1 FROM "USER" WHERE "Username" = user_username) THEN
        -- Generate a unique username if conflict exists
        user_username := user_username || '_' || substr(NEW.id::text, 1, 4);
    END IF;

    -- Create USER record
    INSERT INTO "USER" ("Username", "Email")
    VALUES (user_username, NEW.email)
    RETURNING "UserID" INTO new_user_id;

    -- Create bridge record
    INSERT INTO auth_user_bridge (auth_user_id, user_id)
    VALUES (NEW.id, new_user_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger for new auth users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE "USER" ENABLE ROW LEVEL SECURITY;
ALTER TABLE USERROLE ENABLE ROW LEVEL SECURITY;
ALTER TABLE ROLES ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON ROLES;
DROP POLICY IF EXISTS "Users can view all users" ON "USER";
DROP POLICY IF EXISTS "Users can update their own data" ON "USER";
DROP POLICY IF EXISTS "Users can view all user roles" ON USERROLE;
DROP POLICY IF EXISTS "Users can manage their own roles" ON USERROLE;

-- ROLES table policies (read-only for everyone)
CREATE POLICY "Roles are viewable by everyone" ON ROLES
    FOR SELECT USING (true);

-- USER table policies
CREATE POLICY "Users can view all users" ON "USER"
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own data" ON "USER"
    FOR UPDATE USING (
        "UserID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

-- USERROLE table policies
CREATE POLICY "Users can view all user roles" ON USERROLE
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own roles" ON USERROLE
    FOR ALL USING (
        "UserID" IN (
            SELECT user_id FROM auth_user_bridge
            WHERE auth_user_id = auth.uid()
        )
    );

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_username ON "USER"("Username");
CREATE INDEX IF NOT EXISTS idx_user_email ON "USER"("Email");
CREATE INDEX IF NOT EXISTS idx_userrole_userid ON USERROLE("UserID");
CREATE INDEX IF NOT EXISTS idx_userrole_roleid ON USERROLE("RoleID");
CREATE INDEX IF NOT EXISTS idx_auth_bridge_auth_user ON auth_user_bridge(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_auth_bridge_user ON auth_user_bridge(user_id);

-- =============================================
-- Comments for Documentation
-- =============================================
COMMENT ON TABLE ROLES IS '角色表 - Stores user roles like enthusiast, designer, etc.';
COMMENT ON TABLE "USER" IS '使用者表 - Main user table with XP and level information';
COMMENT ON TABLE USERROLE IS '使用者角色關聯表 - Junction table for user-role many-to-many relationship';
COMMENT ON TABLE auth_user_bridge IS '橋接表 - Bridges Supabase auth.users with custom USER table';

COMMENT ON COLUMN ROLES."RoleID" IS '角色代號 - Primary key for roles';
COMMENT ON COLUMN ROLES."RoleName" IS '角色名稱 - Role name (enthusiast, designer, etc.)';

COMMENT ON COLUMN "USER"."UserID" IS '使用者代號 - Primary key for users';
COMMENT ON COLUMN "USER"."Username" IS '使用者名稱 - Unique username';
COMMENT ON COLUMN "USER"."Email" IS '電子郵件 - Unique email address';
COMMENT ON COLUMN "USER"."XP" IS '經驗值 - Experience points (≥0)';
COMMENT ON COLUMN "USER"."Level" IS '等級 - User level (≥1)';
