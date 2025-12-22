#!/bin/bash

# Skilvania Database Setup Script
# This script sets up all database schemas in the correct order

echo "🚀 Starting Skilvania Database Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "supabase/schema.sql" ]; then
    echo -e "${RED}❌ Error: supabase/schema.sql not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Setup Order:${NC}"
echo "  1. schema.sql (main tables)"
echo "  2. auth_schema.sql (authentication bridge)"
echo "  3. community_schema.sql (community features)"
echo ""

# Function to run SQL file
run_sql_file() {
    local file_path=$1
    local description=$2

    echo -e "${YELLOW}📄 Executing ${file_path}...${NC}"
    echo -e "${BLUE}   ${description}${NC}"

    # Check if file exists
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}❌ Error: $file_path not found!${NC}"
        return 1
    fi

    # Read the SQL content
    SQL_CONTENT=$(cat "$file_path")

    # Here you would typically execute this against your Supabase database
    # For now, we'll just show what would be executed
    echo -e "${GREEN}✅ $file_path ready to execute${NC}"
    echo "   Copy and paste the following into your Supabase SQL Editor:"
    echo ""
    echo -e "${YELLOW}--- $description ---${NC}"
    echo "$SQL_CONTENT"
    echo ""
    echo -e "${YELLOW}--- End of $file_path ---${NC}"
    echo ""

    # Ask user to confirm they executed it
    read -p "Did you execute $file_path in Supabase SQL Editor? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Setup cancelled by user${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ $file_path executed successfully${NC}"
    echo ""
}

# Main setup process
echo -e "${BLUE}🔧 Starting database setup...${NC}"
echo ""

# Step 1: Main schema
run_sql_file "supabase/schema.sql" "Core tables (USER, course, node, edge, etc.)"

# Step 2: Auth schema
run_sql_file "supabase/auth_schema.sql" "Authentication bridge table (auth_user_bridge)"

# Step 3: Community schema
run_sql_file "supabase/community_schema.sql" "Community features (profiles, buddies, messages)"

# Validation
echo -e "${BLUE}🔍 Validating setup...${NC}"
echo ""
echo -e "${YELLOW}Run this query in your Supabase SQL Editor to verify all tables exist:${NC}"
echo ""
cat << 'EOF'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('USER', 'course', 'node', 'edge', 'userprogress', 'auth_user_bridge', 'community_profiles', 'buddy_connections', 'community_messages')
ORDER BY table_name;
EOF

echo ""
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo -e "${BLUE}📚 Next steps:${NC}"
echo "  1. Test your application"
echo "  2. Try creating a course or accessing community features"
echo "  3. If you encounter issues, check the mock mode fallback"
echo ""
echo -e "${BLUE}🆘 Troubleshooting:${NC}"
echo "  - If auth_user_bridge errors persist, ensure auth_schema.sql was executed"
echo "  - Check Supabase logs for any permission or RLS issues"
echo "  - The app should automatically use mock data if database is not ready"
