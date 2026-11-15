// Applies pending SQL migrations on app start, so `helm upgrade` on an existing
// database volume picks up new schema and catalog changes. Fresh databases are
// initialized by the db container (scripts/init-db-postgres.sh), which records
// the migrations it ran in the same schema_migrations table.
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || path.join(__dirname, 'sql', 'migrations');
const BASELINE_MIGRATION = '0001_initial_schema.sql';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForDatabase(pool, { retries = 30, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      console.log(`Waiting for database (${attempt}/${retries}): ${error.message}`);
      await sleep(delayMs);
    }
  }
}

async function tableExists(client, table) {
  const { rows } = await client.query('SELECT to_regclass($1) AS name', [`public.${table}`]);
  return Boolean(rows[0].name);
}

async function runMigrations(pool) {
  await waitForDatabase(pool);

  const files = fs.existsSync(MIGRATIONS_DIR)
    ? fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()
    : [];
  if (files.length === 0) {
    console.log(`No migrations found in ${MIGRATIONS_DIR}`);
    return;
  }

  const client = await pool.connect();
  try {
    // Serialize concurrent app replicas
    await client.query('SELECT pg_advisory_lock(727274)');

    // The postgres image runs first-time init with TCP disabled, so once we are
    // connected the init script has finished.
    if (!(await tableExists(client, 'schema_migrations'))) {
      if (!(await tableExists(client, 'security_domains'))) {
        throw new Error('Database is not initialized (no schema_migrations or security_domains table)');
      }
      // Install created before migration tracking existed: its schema is 0001
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          filename TEXT PRIMARY KEY,
          applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [BASELINE_MIGRATION]
      );
      console.log('Legacy database detected; recorded baseline migration');
    }

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map(r => r.filename));
    const pending = files.filter(f => !applied.has(f));

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`Applying migration ${file}`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
    }

    console.log(pending.length ? `Applied ${pending.length} migration(s)` : 'Database schema is up to date');
  } finally {
    await client.query('SELECT pg_advisory_unlock(727274)').catch(() => {});
    client.release();
  }
}

module.exports = { runMigrations };
