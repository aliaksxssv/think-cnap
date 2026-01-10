#!/bin/bash
# Export production database data using Wrangler (Cloudflare D1) for PostgreSQL
# Excludes users, credentials, and custom assessments
# Outputs PostgreSQL-compatible SQL

set -e

OUTPUT_DIR="${1:-./sql/seed-data}"

# Hardcoded database name (from wrangler.prod.toml)
DB_NAME="think-cnap-prod-db"

mkdir -p "$OUTPUT_DIR"

echo "Exporting production data from Cloudflare D1: $DB_NAME"
echo "Converting to PostgreSQL format"
echo "Output: $OUTPUT_DIR"
echo ""

# Verify wrangler is authenticated
if ! wrangler whoami &>/dev/null; then
    echo "⚠️  Warning: Wrangler authentication not verified"
    echo "   Run 'wrangler login' if you encounter authentication errors"
    echo ""
fi

# Export security_domains (PostgreSQL format)
echo "📦 Exporting security_domains..."
TMP_JSON=$(mktemp)
if wrangler d1 execute "$DB_NAME" \
    --command "SELECT id, name FROM security_domains ORDER BY id;" \
    --remote \
    --json > "$TMP_JSON" 2>/dev/null; then
    # Parse JSON structure: [{results: [...], success: true, meta: {...}}]
    if jq -r '[.[] | .results[]?] | .[] | "INSERT INTO security_domains (id, name) VALUES (\(.id), '\''\(.name | gsub("'\''"; "''"))'\'') ON CONFLICT (id) DO NOTHING;"' "$TMP_JSON" > "$OUTPUT_DIR/security_domains.sql" 2>/dev/null; then
        echo "  ✅ Exported $(wc -l < "$OUTPUT_DIR/security_domains.sql") rows"
    else
        echo "  ⚠️  JSON parsing failed, saving raw output to security_domains.json"
        mv "$TMP_JSON" "$OUTPUT_DIR/security_domains.json"
    fi
else
    echo "  ❌ Failed to export security_domains"
    rm -f "$TMP_JSON"
    exit 1
fi
rm -f "$TMP_JSON"

# Export security_controls (PostgreSQL format)
echo "📦 Exporting security_controls..."
TMP_JSON=$(mktemp)
if wrangler d1 execute "$DB_NAME" \
    --command "SELECT id, domain_id, code, text FROM security_controls ORDER BY id;" \
    --remote \
    --json > "$TMP_JSON" 2>/dev/null; then
    if jq -r '[.[] | .results[]?] | .[] | "INSERT INTO security_controls (id, domain_id, code, text) VALUES (\(.id), \(.domain_id), '\''\(.code | gsub("'\''"; "''"))'\'', '\''\(.text | gsub("'\''"; "''"))'\'') ON CONFLICT (id) DO NOTHING;"' "$TMP_JSON" > "$OUTPUT_DIR/security_controls.sql" 2>/dev/null; then
        echo "  ✅ Exported $(wc -l < "$OUTPUT_DIR/security_controls.sql") rows"
    else
        echo "  ⚠️  JSON parsing failed, saving raw output to security_controls.json"
        mv "$TMP_JSON" "$OUTPUT_DIR/security_controls.json"
    fi
else
    echo "  ❌ Failed to export security_controls"
    rm -f "$TMP_JSON"
    exit 1
fi
rm -f "$TMP_JSON"

# Export action_items (PostgreSQL format)
echo "📦 Exporting action_items..."
TMP_JSON=$(mktemp)
if wrangler d1 execute "$DB_NAME" \
    --command "SELECT id, control_id, measure_id, measure, comment, mitre, tags FROM action_items ORDER BY id;" \
    --remote \
    --json > "$TMP_JSON" 2>/dev/null; then
    if jq -r '[.[] | .results[]?] | .[] | "INSERT INTO action_items (id, control_id, measure_id, measure, comment, mitre, tags) VALUES (\(.id), \(.control_id), '\''\(.measure_id | gsub("'\''"; "''"))'\'', '\''\(.measure | gsub("'\''"; "''"))'\'', \(if .comment then "'\''" + (.comment | gsub("'\''"; "''")) + "'\''" else "NULL" end), \(if .mitre then "'\''" + (.mitre | gsub("'\''"; "''")) + "'\''" else "NULL" end), \(if .tags then "'\''" + (.tags | gsub("'\''"; "''")) + "'\''" else "NULL" end)) ON CONFLICT (measure_id) DO NOTHING;"' "$TMP_JSON" > "$OUTPUT_DIR/action_items.sql" 2>/dev/null; then
        echo "  ✅ Exported $(wc -l < "$OUTPUT_DIR/action_items.sql") rows"
    else
        echo "  ⚠️  JSON parsing failed, saving raw output to action_items.json"
        mv "$TMP_JSON" "$OUTPUT_DIR/action_items.json"
    fi
else
    echo "  ❌ Failed to export action_items"
    rm -f "$TMP_JSON"
    exit 1
fi
rm -f "$TMP_JSON"

# Export default scoring for ALL measures (PostgreSQL format)
# All default scores are set to -1, -1, -1, 1 (before_score, maturity_score, goal_score, is_default)
# Impact and effort are preserved from existing scoring if available, otherwise default to 'medium'
echo "📦 Exporting default scoring for all measures (all set to -1, -1, -1, 1)..."
TMP_JSON=$(mktemp)
# Get all measures with their impact/effort from existing scoring, or use defaults
if wrangler d1 execute "$DB_NAME" \
    --command "SELECT DISTINCT ai.measure_id, COALESCE(s.impact, 'medium') as impact, COALESCE(s.effort, 'medium') as effort FROM action_items ai LEFT JOIN scoring s ON ai.measure_id = s.measure_id AND s.is_default = 1 ORDER BY ai.measure_id;" \
    --remote \
    --json > "$TMP_JSON" 2>/dev/null; then
    if jq -r '[.[] | .results[]?] | .[] | "INSERT INTO scoring (measure_id, user_id, impact, effort, before_score, maturity_score, goal_score, is_default) VALUES ('\''\(.measure_id | gsub("'\''"; "''"))'\'', NULL, '\''\(.impact // "medium" | gsub("'\''"; "''"))'\'', '\''\(.effort // "medium" | gsub("'\''"; "''"))'\'', -1, -1, -1, 1) ON CONFLICT (measure_id, user_id, is_default) DO UPDATE SET before_score = -1, maturity_score = -1, goal_score = -1;"' "$TMP_JSON" > "$OUTPUT_DIR/scoring_default.sql" 2>/dev/null; then
        echo "  ✅ Exported $(wc -l < "$OUTPUT_DIR/scoring_default.sql") rows (all with -1, -1, -1, 1)"
    else
        echo "  ⚠️  JSON parsing failed, saving raw output to scoring_default.json"
        mv "$TMP_JSON" "$OUTPUT_DIR/scoring_default.json"
    fi
else
    echo "  ❌ Failed to export scoring_default"
    rm -f "$TMP_JSON"
    exit 1
fi
rm -f "$TMP_JSON"

# Export MITRE TTPs
echo "📦 Exporting mitre_ttps..."
TMP_JSON=$(mktemp)
if wrangler d1 execute "$DB_NAME" \
    --command "SELECT id, tactic, technique, slug, created_at, updated_at FROM mitre_ttps ORDER BY id;" \
    --remote \
    --json > "$TMP_JSON" 2>/dev/null; then
    if jq -r '[.[] | .results[]?] | .[] | "INSERT INTO mitre_ttps (id, tactic, technique, slug, created_at, updated_at) VALUES (\(.id), '\''\(.tactic | gsub("'\''"; "''"))'\'', '\''\(.technique | gsub("'\''"; "''"))'\'', '\''\(.slug | gsub("'\''"; "''"))'\'', '\''\(.created_at // "CURRENT_TIMESTAMP")'\'', '\''\(.updated_at // "CURRENT_TIMESTAMP")'\'') ON CONFLICT (id) DO NOTHING;"' "$TMP_JSON" > "$OUTPUT_DIR/mitre_ttps.sql" 2>/dev/null; then
        echo "  ✅ Exported $(wc -l < "$OUTPUT_DIR/mitre_ttps.sql") rows"
    else
        echo "  ⚠️  JSON parsing failed, saving raw output to mitre_ttps.json"
        mv "$TMP_JSON" "$OUTPUT_DIR/mitre_ttps.json"
    fi
else
    echo "  ❌ Failed to export mitre_ttps"
    rm -f "$TMP_JSON"
    exit 1
fi
rm -f "$TMP_JSON"

# Export MITRE exploitation examples
echo "📦 Exporting mitre_exploitation_examples..."
TMP_JSON=$(mktemp)
if wrangler d1 execute "$DB_NAME" \
    --command "SELECT id, ttp_id, title, description, code_block, order_index, created_at, updated_at FROM mitre_exploitation_examples ORDER BY id;" \
    --remote \
    --json > "$TMP_JSON" 2>/dev/null; then
    if jq -r '[.[] | .results[]?] | .[] | "INSERT INTO mitre_exploitation_examples (id, ttp_id, title, description, code_block, order_index, created_at, updated_at) VALUES (\(.id), \(.ttp_id), '\''\(.title | gsub("'\''"; "''"))'\'', \(if .description then "'\''" + (.description | gsub("'\''"; "''")) + "'\''" else "NULL" end), \(if .code_block then "'\''" + (.code_block | gsub("'\''"; "''")) + "'\''" else "NULL" end), \(.order_index // 0), '\''\(.created_at // "CURRENT_TIMESTAMP")'\'', '\''\(.updated_at // "CURRENT_TIMESTAMP")'\'') ON CONFLICT (id) DO NOTHING;"' "$TMP_JSON" > "$OUTPUT_DIR/mitre_exploitation_examples.sql" 2>/dev/null; then
        echo "  ✅ Exported $(wc -l < "$OUTPUT_DIR/mitre_exploitation_examples.sql") rows"
    else
        echo "  ⚠️  JSON parsing failed, saving raw output to mitre_exploitation_examples.json"
        mv "$TMP_JSON" "$OUTPUT_DIR/mitre_exploitation_examples.json"
    fi
else
    echo "  ❌ Failed to export mitre_exploitation_examples"
    rm -f "$TMP_JSON"
    exit 1
fi
rm -f "$TMP_JSON"

# Export measure-TTP relationships
echo "📦 Exporting measure_ttp_relationships..."
TMP_JSON=$(mktemp)
if wrangler d1 execute "$DB_NAME" \
    --command "SELECT id, measure_id, ttp_id FROM measure_ttp_relationships ORDER BY id;" \
    --remote \
    --json > "$TMP_JSON" 2>/dev/null; then
    if jq -r '[.[] | .results[]?] | .[] | "INSERT INTO measure_ttp_relationships (id, measure_id, ttp_id) VALUES (\(.id), '\''\(.measure_id | gsub("'\''"; "''"))'\'', \(.ttp_id)) ON CONFLICT (measure_id, ttp_id) DO NOTHING;"' "$TMP_JSON" > "$OUTPUT_DIR/measure_ttp_relationships.sql" 2>/dev/null; then
        echo "  ✅ Exported $(wc -l < "$OUTPUT_DIR/measure_ttp_relationships.sql") rows"
    else
        echo "  ⚠️  JSON parsing failed, saving raw output to measure_ttp_relationships.json"
        mv "$TMP_JSON" "$OUTPUT_DIR/measure_ttp_relationships.json"
    fi
else
    echo "  ❌ Failed to export measure_ttp_relationships"
    rm -f "$TMP_JSON"
    exit 1
fi
rm -f "$TMP_JSON"

echo ""
echo "✅ Export completed!"
echo ""
echo "Files created in $OUTPUT_DIR:"
ls -lh "$OUTPUT_DIR"/*.sql 2>/dev/null || ls -lh "$OUTPUT_DIR"/*.json 2>/dev/null
echo ""
echo "📊 Summary:"
echo "  - security_domains: $(wc -l < "$OUTPUT_DIR/security_domains.sql" 2>/dev/null || echo '0') rows"
echo "  - security_controls: $(wc -l < "$OUTPUT_DIR/security_controls.sql" 2>/dev/null || echo '0') rows"
echo "  - action_items: $(wc -l < "$OUTPUT_DIR/action_items.sql" 2>/dev/null || echo '0') rows"
echo "  - scoring_default: $(wc -l < "$OUTPUT_DIR/scoring_default.sql" 2>/dev/null || echo '0') rows"
echo "  - mitre_ttps: $(wc -l < "$OUTPUT_DIR/mitre_ttps.sql" 2>/dev/null || echo '0') rows"
echo "  - mitre_exploitation_examples: $(wc -l < "$OUTPUT_DIR/mitre_exploitation_examples.sql" 2>/dev/null || echo '0') rows"
echo "  - measure_ttp_relationships: $(wc -l < "$OUTPUT_DIR/measure_ttp_relationships.sql" 2>/dev/null || echo '0') rows"
echo ""
echo "🔒 Excluded: Users, credentials, and custom assessments"
echo "📝 Format: PostgreSQL-compatible SQL with ON CONFLICT handling"
