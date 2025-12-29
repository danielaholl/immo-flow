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

-- Drop auth schema if exists
DROP SCHEMA IF EXISTS auth CASCADE;

-- Drop roles if they exist (this might fail if roles are in use, which is fine)
DROP ROLE IF EXISTS authenticated;
DROP ROLE IF EXISTS anon;
EOF

echo -e "${GREEN}✅ Database cleaned${NC}\n"

# Array of migration files in order (including new 000 migration)
migrations=(
  "packages/database/migrations/000_auth_setup.sql"
  "packages/database/migrations/001_initial_schema.sql"
  "packages/database/migrations/002_sample_data.sql"
  "packages/database/migrations/003_user_roles.sql"
  "packages/database/migrations/004_add_user_id_to_properties.sql"
  "packages/database/migrations/005_extend_properties.sql"
  "packages/database/migrations/006_search_history_and_preferences.sql"
  "packages/database/migrations/007_add_address_to_user_profiles.sql"
  "packages/database/migrations/008_recommendation_system.sql"
)

# Run each migration
for migration in "${migrations[@]}"; do
  echo -e "${BLUE}📝 Running: $migration${NC}"

  if docker exec -i rendito-postgres-dev psql -U postgres -d rendito < "$migration" 2>&1 | grep -v "NOTICE:" | grep -v "^$"; then
    echo -e "${GREEN}✅ Success: $migration${NC}\n"
  else
    echo -e "${RED}❌ Failed: $migration${NC}\n"
    exit 1
  fi
done

echo -e "${GREEN}✅ All migrations completed successfully!${NC}\n"

# Show tables
echo -e "${BLUE}📊 Database tables:${NC}"
docker exec rendito-postgres-dev psql -U postgres -d rendito -c "\dt"

echo -e "\n${BLUE}📊 Tables in auth schema:${NC}"
docker exec rendito-postgres-dev psql -U postgres -d rendito -c "\dt auth.*"

echo -e "\n${GREEN}✅ Database is ready!${NC}"
