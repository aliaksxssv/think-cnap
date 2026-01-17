const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 8080);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'thinkcnap',
  user: process.env.DB_USER || 'thinkcnap',
  password: process.env.DB_PASSWORD || ''
});

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return next();
});

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function decodeGoogleCredential(credential) {
  const parts = credential.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid credential');
  }
  return JSON.parse(base64UrlDecode(parts[1]));
}

async function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function generateJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = { ...payload, iat: now, exp: now + 24 * 60 * 60 };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64');
  const encodedSignature = signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${encodedSignature}`;
}

async function verifyJWT(token, secret) {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return null;
    }
    const data = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    if (expectedSignature !== encodedSignature) {
      return null;
    }
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

function getJwtSecret() {
  return process.env.JWT_SECRET || 'default-secret';
}

async function fetchUserByEmail(email) {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, password_hash, google_id, is_admin FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  } catch (error) {
    if (String(error.message || '').includes('is_admin')) {
      const { rows } = await pool.query(
        'SELECT id, email, name, password_hash, google_id FROM users WHERE email = $1',
        [email]
      );
      return rows[0] ? { ...rows[0], is_admin: false } : null;
    }
    throw error;
  }
}

async function fetchUserById(id) {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, password_hash, google_id, is_admin FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    if (String(error.message || '').includes('is_admin')) {
      const { rows } = await pool.query(
        'SELECT id, email, name, password_hash, google_id FROM users WHERE id = $1',
        [id]
      );
      return rows[0] ? { ...rows[0], is_admin: false } : null;
    }
    throw error;
  }
}

async function getAuthPayload(req, res) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return null;
  }
  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, getJwtSecret());
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
  return payload;
}

async function requireAdmin(req, res) {
  const payload = await getAuthPayload(req, res);
  if (!payload) return null;
  const user = await fetchUserById(payload.id);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return null;
  }
  if (!user.is_admin) {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return user;
}

async function requireAuth(req, res, userId) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, getJwtSecret());
  if (!payload || payload.id?.toString() !== userId.toString()) {
    res.status(403).json({ error: 'Unauthorized' });
    return null;
  }
  return payload;
}

app.get('/api/controls', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        d.id as domain_id,
        d.name as domain_name,
        c.id as control_id,
        c.code as control_code,
        c.text as control_text,
        a.id as action_id,
        a.measure_id,
        a.measure,
        a.comment,
        a.tags
      FROM security_domains d
      LEFT JOIN security_controls c ON d.id = c.domain_id
      LEFT JOIN action_items a ON c.id = a.control_id
      ORDER BY d.id, c.id, 
        CASE WHEN a.tags = 'aws' THEN 1 WHEN a.tags = 'kubernetes' THEN 2 ELSE 3 END,
        a.measure_id
      `
    );

    const domainsMap = new Map();
    for (const row of rows) {
      if (!domainsMap.has(row.domain_id)) {
        domainsMap.set(row.domain_id, {
          name: row.domain_name,
          security_controls: new Map()
        });
      }
      const domain = domainsMap.get(row.domain_id);
      if (row.control_id && !domain.security_controls.has(row.control_id)) {
        domain.security_controls.set(row.control_id, {
          code: row.control_code,
          text: row.control_text,
          action_items: []
        });
      }
      if (row.action_id && row.control_id) {
        const control = domain.security_controls.get(row.control_id);
        control.action_items.push({
          measure_id: row.measure_id,
          measure: row.measure,
          comment: row.comment || '',
          tags: row.tags,
          action_id: row.action_id
        });
      }
    }

    const ttpRows = await pool.query(
      `
      SELECT mtr.measure_id, mt.id, mt.tactic, mt.technique, mt.slug
      FROM measure_ttp_relationships mtr
      JOIN mitre_ttps mt ON mtr.ttp_id = mt.id
      ORDER BY mt.tactic, mt.technique
      `
    );
    const ttpMap = new Map();
    for (const row of ttpRows.rows) {
      if (!ttpMap.has(row.measure_id)) {
        ttpMap.set(row.measure_id, []);
      }
      ttpMap.get(row.measure_id).push({
        id: row.id,
        tactic: row.tactic,
        technique: row.technique,
        slug: row.slug
      });
    }

    for (const domain of domainsMap.values()) {
      for (const control of domain.security_controls.values()) {
        for (const actionItem of control.action_items) {
          actionItem.linked_ttps = ttpMap.get(actionItem.measure_id) || [];
        }
      }
    }

    res.json({
      security_domains: Array.from(domainsMap.values()).map(domain => ({
        name: domain.name,
        security_controls: Array.from(domain.security_controls.values())
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch controls', message: error.message });
  }
});

app.get('/api/scoring/default', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT measure_id, impact, effort, before_score, maturity_score, goal_score
      FROM scoring
      WHERE is_default = 1
      ORDER BY measure_id
      `
    );
    const measures = {};
    for (const row of rows) {
      measures[row.measure_id] = {
        impact: row.impact,
        effort: row.effort,
        initial_maturity: row.before_score,
        present_maturity: row.maturity_score,
        desired_maturity: row.goal_score
      };
    }
    res.json({ measures });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch default scoring', message: error.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const payload = decodeGoogleCredential(credential);
    const { email, name, sub: googleId } = payload;

    let user = await fetchUserByEmail(email);
    if (!user) {
      const insert = await pool.query(
        `
        INSERT INTO users (email, name, google_id, created_at, updated_at)
        VALUES ($1, $2, $3, now(), now())
        RETURNING id, email, name, google_id, is_admin
        `,
        [email, name || email.split('@')[0], googleId]
      );
      user = insert.rows[0];
    } else if (!user.google_id) {
      const update = await pool.query(
        `
        UPDATE users
        SET google_id = $1, updated_at = now()
        WHERE id = $2
        RETURNING id, email, name, google_id, is_admin
        `,
        [googleId, user.id]
      );
      user = { ...update.rows[0], is_admin: Boolean(user.is_admin) };
    }

    const userObj = {
      id: user.id,
      email: user.email,
      name: user.name,
      googleId: user.google_id,
      isAnonymous: false,
      is_admin: Boolean(user.is_admin)
    };

    const token = await generateJWT(userObj, getJwtSecret());
    return res.json({ success: true, token, user: userObj });
  } catch (error) {
    return res.status(500).json({ error: 'Google authentication failed', message: error.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await hashPassword(password);
    const insert = await pool.query(
      `
      INSERT INTO users (email, password_hash, name, created_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      RETURNING id, email, name, is_admin
      `,
      [email, passwordHash, email.split('@')[0]]
    );

    const userObj = {
      id: insert.rows[0].id,
      email: insert.rows[0].email,
      name: insert.rows[0].name,
      isAnonymous: false,
      is_admin: Boolean(insert.rows[0].is_admin)
    };

    const token = await generateJWT(userObj, getJwtSecret());
    return res.json({ success: true, user: userObj, token });
  } catch (error) {
    return res.status(500).json({ error: 'Sign up failed', message: error.message });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await fetchUserByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userObj = {
      id: user.id,
      email: user.email,
      name: user.name,
      isAnonymous: false,
      is_admin: Boolean(user.is_admin)
    };

    const token = await generateJWT(userObj, getJwtSecret());
    return res.json({ success: true, user: userObj, token });
  } catch (error) {
    return res.status(500).json({ error: 'Sign in failed', message: error.message });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const token = authHeader.substring(7);
    const payload = await verifyJWT(token, getJwtSecret());
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.json({ success: true, user: payload });
  } catch (error) {
    return res.status(500).json({ error: 'Token verification failed', message: error.message });
  }
});

app.post('/api/auth/signout', (req, res) => {
  res.json({ success: true, message: 'Signed out successfully' });
});

app.get('/api/admin/check', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  res.json({ success: true, message: 'Admin access verified' });
});

app.get('/api/admin/users', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, is_admin, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load users', message: error.message });
  }
});

app.get('/api/admin/domains', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { rows } = await pool.query(
      'SELECT id, name FROM security_domains ORDER BY id'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load domains', message: error.message });
  }
});

app.get('/api/admin/controls', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { rows } = await pool.query(
      `
      SELECT c.id, c.code, c.text, c.domain_id, d.name AS domain_name
      FROM security_controls c
      LEFT JOIN security_domains d ON c.domain_id = d.id
      ORDER BY c.id
      `
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load controls', message: error.message });
  }
});

app.get('/api/admin/measures', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { rows } = await pool.query(
      `
      SELECT id, control_id, measure_id, measure, comment, mitre, tags
      FROM action_items
      ORDER BY id
      `
    );
    const ttpRows = await pool.query(
      `
      SELECT mtr.measure_id, mt.id, mt.tactic, mt.technique, mt.slug
      FROM measure_ttp_relationships mtr
      JOIN mitre_ttps mt ON mtr.ttp_id = mt.id
      ORDER BY mt.tactic, mt.technique
      `
    );
    const ttpMap = new Map();
    for (const row of ttpRows.rows) {
      if (!ttpMap.has(row.measure_id)) {
        ttpMap.set(row.measure_id, []);
      }
      ttpMap.get(row.measure_id).push({
        id: row.id,
        tactic: row.tactic,
        technique: row.technique,
        slug: row.slug
      });
    }
    const measures = rows.map(measure => ({
      ...measure,
      linked_ttps: ttpMap.get(measure.measure_id) || []
    }));
    res.json(measures);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load measures', message: error.message });
  }
});

app.get('/api/admin/mitre', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { rows } = await pool.query(
      `
      SELECT id, tactic, technique, slug, created_at, updated_at
      FROM mitre_ttps
      ORDER BY tactic, technique
      `
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load mitre', message: error.message });
  }
});

app.get('/api/user/:userId/scoring', async (req, res) => {
  const userId = req.params.userId;
  const auth = await requireAuth(req, res, userId);
  if (!auth) return;

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        d.measure_id,
        COALESCE(u.impact, d.impact) as impact,
        COALESCE(u.effort, d.effort) as effort,
        COALESCE(u.before_score, d.before_score) as before_score,
        COALESCE(u.maturity_score, d.maturity_score) as maturity_score,
        COALESCE(u.goal_score, d.goal_score) as goal_score
      FROM scoring d
      LEFT JOIN scoring u ON d.measure_id = u.measure_id AND u.user_id = $1 AND u.is_default = 0
      WHERE d.is_default = 1
      ORDER BY d.measure_id
      `,
      [userId.toString()]
    );

    const measures = {};
    for (const row of rows) {
      measures[row.measure_id] = {
        impact: row.impact,
        effort: row.effort,
        initial_maturity: row.before_score,
        present_maturity: row.maturity_score,
        desired_maturity: row.goal_score
      };
    }
    res.json({ measures });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user scoring', message: error.message });
  }
});

app.post('/api/user/:userId/scoring', async (req, res) => {
  const userId = req.params.userId;
  const auth = await requireAuth(req, res, userId);
  if (!auth) return;

  const measures = req.body?.measures || {};
  if (Object.keys(measures).length === 0) {
    return res.json({ success: true, message: 'No measures to save', updated: 0 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let successCount = 0;
    const results = [];

    for (const [measureId, scoring] of Object.entries(measures)) {
      try {
        await client.query(
          `
          INSERT INTO scoring
            (measure_id, user_id, impact, effort, before_score, maturity_score, goal_score, is_default)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
          ON CONFLICT (measure_id, user_id, is_default)
          DO UPDATE SET
            impact = EXCLUDED.impact,
            effort = EXCLUDED.effort,
            before_score = EXCLUDED.before_score,
            maturity_score = EXCLUDED.maturity_score,
            goal_score = EXCLUDED.goal_score
          `,
          [
            measureId,
            userId.toString(),
            scoring.impact || 'medium',
            scoring.effort || 'medium',
            scoring.initial_maturity ?? -1,
            scoring.present_maturity ?? -1,
            scoring.desired_maturity ?? -1
          ]
        );
        results.push({ measureId, operation: 'upserted' });
        successCount += 1;
      } catch (error) {
        results.push({ measureId, operation: 'failed', error: error.message });
      }
    }

    await client.query('COMMIT');
    return res.json({
      success: true,
      updated: successCount,
      message: `Processed ${successCount} measures successfully`,
      results
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to save user scoring', message: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/mitre/by-slug/*', async (req, res) => {
  try {
    const slug = req.params[0];
    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }
    const result = await pool.query(
      `
      SELECT id, tactic, technique, slug, created_at, updated_at
      FROM mitre_ttps
      WHERE slug = $1
      `,
      [slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'TTP not found' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/api/mitre/:id/examples', async (req, res) => {
  try {
    const ttpId = req.params.id;
    const result = await pool.query(
      `
      SELECT id, title, description, code_block, order_index, created_at, updated_at
      FROM mitre_exploitation_examples
      WHERE ttp_id = $1
      ORDER BY order_index ASC, created_at ASC
      `,
      [ttpId]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ThinkCNAP app listening on port ${PORT}`);
});
