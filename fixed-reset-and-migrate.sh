#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  This will DROP all tables and re-run migrations!${NC}"
echo -e "${BLUE}🗄️  Resetting database and running migrations...${NC}\n"

# Drop all tables and schemas
echo -e "${BLUE}🧹 Dropping all tables and schemas...${NC}"
docker exec -i rendito-postgres-dev psql -U postgres -d rendito <<EOF
-- Drop all tables in public schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
EOF

echo -e "${GREEN}✅ Database cleaned${NC}\n"

# Run 000_auth_setup.sql first
echo -e "${BLUE}📝 Running: 000_auth_setup.sql${NC}"
docker exec -i rendito-postgres-dev psql -U postgres -d rendito < "packages/database/migrations/000_auth_setup.sql"
echo -e "${GREEN}✅ Success${NC}\n"

# Now run the other migrations, but replace auth.users with public.users on the fly
migrations=(
  "001_initial_schema.sql"
  "002_sample_data.sql"
  "003_user_roles.sql"
  "004_add_user_id_to_properties.sql"
  "005_extend_properties.sql"
  "006_search_history_and_preferences.sql"
  "007_add_address_to_user_profiles.sql"
  "008_recommendation_system.sql"
)

for migration in "${migrations[@]}"; do
  echo -e "${BLUE}📝 Running: $migration${NC}"

  # Run migration directly
  docker exec -i rendito-postgres-dev psql -U postgres -d rendito < "packages/database/migrations/$migration" 2>&1 | \
    grep -v "^NOTICE:" || true

  echo -e "${GREEN}✅ Success: $migration${NC}\n"
done

echo -e "${GREEN}✅ All migrations completed!${NC}\n"

# Show tables
echo -e "${BLUE}📊 Database tables:${NC}"
docker exec rendito-postgres-dev psql -U postgres -d rendito -c "\dt" 2>&1 | grep -v "^NOTICE:" || true

echo -e "\n${GREEN}✅ Database is ready!${NC}"
