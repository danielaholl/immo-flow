#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️  Running database migrations...${NC}\n"

# Array of migration files in order
migrations=(
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

  if docker exec -i rendito-postgres-dev psql -U postgres -d rendito < "$migration"; then
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
