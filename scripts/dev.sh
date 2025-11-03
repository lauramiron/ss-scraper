#!/bin/bash

export ENV="debug"
export TMPDIR=/tmp

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking PostgreSQL status...${NC}"

# Check if PostgreSQL is running
if ! pg_isready -q; then
  echo -e "${YELLOW}PostgreSQL is not running. Starting it now...${NC}"
  brew services start postgresql@15

  # Wait for PostgreSQL to be ready
  echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
  for i in {1..30}; do
    if pg_isready -q; then
      echo -e "${GREEN}PostgreSQL is ready!${NC}"
      break
    fi
    sleep 1
  done

  if ! pg_isready -q; then
    echo "Error: PostgreSQL failed to start"
    exit 1
  fi
else
  echo -e "${GREEN}PostgreSQL is already running${NC}"
fi

# Create database if it doesn't exist
DB_NAME="ss_scraper_db"
if ! psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
  createdb "$DB_NAME"
  echo -e "${GREEN}Database created${NC}"
else
  echo -e "${GREEN}Database '$DB_NAME' already exists${NC}"
fi

# Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
npm run build

# Run migrations
echo -e "${YELLOW}Running migrations...${NC}"
node scripts/migrate.mjs

# Start the app with auto-rebuild on .ts changes
echo -e "${GREEN}Starting the app...${NC}"
nodemon --watch '**/*.ts' --exec 'npm run build && node' --inspect-brk server.js
