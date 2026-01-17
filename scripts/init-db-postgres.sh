#!/bin/bash
# PostgreSQL database initialization script
# This script runs migrations and seeds the database with production data
# Runs automatically on first container startup via /docker-entrypoint-initdb.d/

set -e

MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"
SEED_DATA_DIR="${SEED_DATA_DIR:-/seed-data}"

echo "Initializing PostgreSQL database..."

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 1
done

echo "PostgreSQL is ready. Running migrations..."

# Run all migration files in order
if [ -d "$MIGRATIONS_DIR" ]; then
    for migration in $(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
        echo "Applying migration: $(basename $migration)"
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$migration" || {
            echo "Warning: Migration $(basename $migration) failed or already applied"
        }
    done
    echo "Migrations completed"
else
    echo "Warning: Migrations directory not found at $MIGRATIONS_DIR"
fi

# Seed database with production data (if available)
if [ -d "$SEED_DATA_DIR" ]; then
    echo "Seeding database with production data..."
    
    # Count SQL files
    SQL_COUNT=$(find "$SEED_DATA_DIR" -name "*.sql" -type f | wc -l)
    if [ "$SQL_COUNT" -eq 0 ]; then
        echo "No SQL seed files found in $SEED_DATA_DIR"
        echo "Database will be initialized with empty tables"
    else
        echo "Found $SQL_COUNT SQL file(s) to import"
        
        # Import in order respecting foreign key dependencies:
        # 1. security_domains (no dependencies)
        # 2. security_controls (depends on domains)
        # 3. action_items (depends on controls)
        # 4. admin_user (no dependencies)
        # 5. mitre_ttps (no dependencies)
        # 6. scoring_default (depends on action_items)
        # 7. mitre_exploitation_examples (depends on mitre_ttps)
        # 8. measure_ttp_relationships (depends on action_items and mitre_ttps)
        
        # Import security_domains first (no dependencies)
        if [ -f "$SEED_DATA_DIR/security_domains.sql" ]; then
            echo "Importing security_domains..."
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SEED_DATA_DIR/security_domains.sql" || echo "Warning: security_domains import failed"
        fi
        
        # Import security_controls (depends on domains)
        if [ -f "$SEED_DATA_DIR/security_controls.sql" ]; then
            echo "Importing security_controls..."
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SEED_DATA_DIR/security_controls.sql" || echo "Warning: security_controls import failed"
        fi
        
        # Import action_items (depends on controls)
        if [ -f "$SEED_DATA_DIR/action_items.sql" ]; then
            echo "Importing action_items..."
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SEED_DATA_DIR/action_items.sql" || echo "Warning: action_items import failed"
        fi

        # Import admin_user (no dependencies)
        if [ -f "$SEED_DATA_DIR/admin_user.sql" ]; then
            echo "Importing admin_user..."
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SEED_DATA_DIR/admin_user.sql" || echo "Warning: admin_user import failed"
        fi
        
        # Import mitre_ttps (no dependencies)
        if [ -f "$SEED_DATA_DIR/mitre_ttps.sql" ]; then
            echo "Importing mitre_ttps..."
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SEED_DATA_DIR/mitre_ttps.sql" || echo "Warning: mitre_ttps import failed"
        fi
        
        # Import default scoring (depends on action_items)
        if [ -f "$SEED_DATA_DIR/scoring_default.sql" ]; then
            echo "Importing default scoring..."
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SEED_DATA_DIR/scoring_default.sql" || echo "Warning: scoring_default import failed"
        fi
        
        # Import mitre_exploitation_examples (depends on mitre_ttps)
        if [ -f "$SEED_DATA_DIR/mitre_exploitation_examples.sql" ]; then
            echo "Importing mitre_exploitation_examples..."
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SEED_DATA_DIR/mitre_exploitation_examples.sql" || echo "Warning: mitre_exploitation_examples import failed"
        fi
        
        # Import measure_ttp_relationships (depends on action_items and mitre_ttps)
        if [ -f "$SEED_DATA_DIR/measure_ttp_relationships.sql" ]; then
            echo "Importing measure_ttp_relationships..."
            psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SEED_DATA_DIR/measure_ttp_relationships.sql" || echo "Warning: measure_ttp_relationships import failed"
        fi
        
        echo "Database seeding completed"
    fi
else
    echo "Warning: Seed data directory not found at $SEED_DATA_DIR"
    echo "Database will be initialized with empty tables"
fi

# Verify database was initialized
TABLE_COUNT=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Database initialized successfully"
echo "Tables created: $TABLE_COUNT"
