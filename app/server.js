const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is required');
  process.exit(1);
}

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

let googleJwksCache = { keys: null, expiresAt: 0 };

async function getGoogleJwks() {
  const now = Date.now();
  if (googleJwksCache.keys && googleJwksCache.expiresAt > now) {
    return googleJwksCache.keys;
  }
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!response.ok) {
    throw new Error('Failed to fetch Google JWKS');
  }
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 300;
  const data = await response.json();
  googleJwksCache = {
    keys: data.keys || [],
    expiresAt: now + maxAge * 1000
  };
  return googleJwksCache.keys;
}

function buildPemFromX5c(x5c) {
  if (!x5c || !x5c.length) return null;
  const cert = x5c[0].match(/.{1,64}/g).join('\n');
  return `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----\n`;
}

async function verifyGoogleIdToken(token, clientId) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT');
  }

  const header = JSON.parse(base64UrlDecode(parts[0]));
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  const signature = Buffer.from(
    parts[2].replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  );

  const jwks = await getGoogleJwks();
  const key = jwks.find(k => k.kid === header.kid);
  const pem = buildPemFromX5c(key?.x5c);
  if (!pem) {
    throw new Error('Unable to find matching Google key');
  }

  const data = `${parts[0]}.${parts[1]}`;
  const verified = crypto.verify('RSA-SHA256', Buffer.from(data), pem, signature);
  if (!verified) {
    throw new Error('Invalid Google token signature');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Google token expired');
  }
  if (payload.nbf && payload.nbf > now) {
    throw new Error('Google token not active');
  }

  const issuer = payload.iss;
  if (issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') {
    throw new Error('Invalid Google token issuer');
  }
  if (clientId && payload.aud !== clientId) {
    throw new Error('Invalid Google token audience');
  }

  return payload;
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
  return JWT_SECRET;
}

function generateSlug(tactic, technique) {
  const tacticSlug = String(tactic || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const techniqueSlug = String(technique || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${tacticSlug}/${techniqueSlug}`;
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPassword(value) {
  return typeof value === 'string' && value.length >= 8;
}

function isValidTags(value) {
  return ['aws', 'kubernetes', 'ai'].includes(value);
}

function isValidImpactEffort(value) {
  return ['low', 'medium', 'high'].includes(value);
}

function normalizeOptionalText(value, maxLen) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return maxLen ? text.slice(0, maxLen) : text;
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

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      return res.status(400).json({ error: 'Google authentication is not configured' });
    }
    const payload = await verifyGoogleIdToken(credential, clientId);
    const { email, name, sub: googleId } = payload;
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid Google account email' });
    }

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
    const message = String(error?.message || '');
    if (
      message.includes('matching Google key') ||
      message.includes('audience') ||
      message.includes('issuer')
    ) {
      return res.status(400).json({ error: 'Google authentication is not configured' });
    }
    return res.status(500).json({ error: 'Google authentication failed', message: error.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
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
      [email.trim(), passwordHash, email.split('@')[0]]
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
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Password is required' });
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

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const payload = await getAuthPayload(req, res);
    if (!payload) return;

    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return res.status(400).json({ error: 'Current password is required' });
    }
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const user = await fetchUserById(payload.id);
    if (!user || !user.password_hash) {
      return res.status(400).json({ error: 'Password change is not available for this account' });
    }

    const currentHash = await hashPassword(currentPassword);
    if (currentHash !== user.password_hash) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(newPassword);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2',
      [newHash, user.id]
    );

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to change password', message: error.message });
  }
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
      SELECT m.id, m.tactic, m.technique, m.slug, m.created_at, m.updated_at,
             COUNT(e.id) AS example_count
      FROM mitre_ttps m
      LEFT JOIN mitre_exploitation_examples e ON m.id = e.ttp_id
      GROUP BY m.id
      ORDER BY m.tactic, m.technique
      `
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load mitre', message: error.message });
  }
});

app.post('/api/admin/users', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { email, name, is_admin = false, password } = req.body || {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    const safeName = normalizeOptionalText(name, 120);
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await hashPassword(password);
    const result = await pool.query(
      `
      INSERT INTO users (email, name, password_hash, is_admin, created_at, updated_at)
      VALUES ($1, $2, $3, $4, now(), now())
      RETURNING id
      `,
      [email.trim(), safeName, hashedPassword, Boolean(is_admin)]
    );
    res.json({ success: true, id: result.rows[0].id, message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user', message: error.message });
  }
});

app.put('/api/admin/users/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { email, name, is_admin } = req.body || {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    const safeName = normalizeOptionalText(name, 120);
    const result = await pool.query(
      `
      UPDATE users
      SET email = $1, name = $2, is_admin = $3, updated_at = now()
      WHERE id = $4
      `,
      [email.trim(), safeName, Boolean(is_admin), req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user', message: error.message });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    await pool.query('DELETE FROM scoring WHERE user_id = $1', [req.params.id.toString()]);
    const result = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user', message: error.message });
  }
});

app.post('/api/admin/domains', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { name } = req.body || {};
    const domainName = String(name || '').trim();
    if (!domainName) {
      return res.status(400).json({ error: 'Domain name is required' });
    }
    if (domainName.length > 120) {
      return res.status(400).json({ error: 'Domain name is too long' });
    }
    const result = await pool.query(
      'INSERT INTO security_domains (name) VALUES ($1) RETURNING id',
      [domainName]
    );
    res.json({ success: true, id: result.rows[0].id, message: 'Domain created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create domain', message: error.message });
  }
});

app.put('/api/admin/domains/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { name } = req.body || {};
    const domainName = String(name || '').trim();
    if (!domainName) {
      return res.status(400).json({ error: 'Domain name is required' });
    }
    if (domainName.length > 120) {
      return res.status(400).json({ error: 'Domain name is too long' });
    }
    const result = await pool.query(
      'UPDATE security_domains SET name = $1 WHERE id = $2',
      [domainName, req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    res.json({ success: true, message: 'Domain updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update domain', message: error.message });
  }
});

app.delete('/api/admin/domains/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM security_controls WHERE domain_id = $1',
      [req.params.id]
    );
    if (countResult.rows[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete domain with existing controls. Delete controls first.' });
    }
    const result = await pool.query('DELETE FROM security_domains WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Domain not found' });
    }
    res.json({ success: true, message: 'Domain deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete domain', message: error.message });
  }
});

app.post('/api/admin/controls', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { code, text, domain_id } = req.body || {};
    const controlCode = String(code || '').trim();
    const controlText = String(text || '').trim();
    const domainId = Number(domain_id);
    if (!controlCode || !controlText || !Number.isFinite(domainId)) {
      return res.status(400).json({ error: 'code, text, and domain_id are required' });
    }
    if (controlCode.length > 32) {
      return res.status(400).json({ error: 'Control code is too long' });
    }
    if (controlText.length > 1000) {
      return res.status(400).json({ error: 'Control text is too long' });
    }
    const result = await pool.query(
      `
      INSERT INTO security_controls (code, text, domain_id)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [controlCode, controlText, domainId]
    );
    res.json({ success: true, id: result.rows[0].id, message: 'Control created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create control', message: error.message });
  }
});

app.put('/api/admin/controls/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { code, text, domain_id } = req.body || {};
    const controlCode = String(code || '').trim();
    const controlText = String(text || '').trim();
    const domainId = Number(domain_id);
    if (!controlCode || !controlText || !Number.isFinite(domainId)) {
      return res.status(400).json({ error: 'code, text, and domain_id are required' });
    }
    if (controlCode.length > 32) {
      return res.status(400).json({ error: 'Control code is too long' });
    }
    if (controlText.length > 1000) {
      return res.status(400).json({ error: 'Control text is too long' });
    }
    const result = await pool.query(
      `
      UPDATE security_controls
      SET code = $1, text = $2, domain_id = $3
      WHERE id = $4
      `,
      [controlCode, controlText, domainId, req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Control not found' });
    }
    res.json({ success: true, message: 'Control updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update control', message: error.message });
  }
});

app.delete('/api/admin/controls/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM action_items WHERE control_id = $1',
      [req.params.id]
    );
    if (countResult.rows[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete control with existing measures. Delete measures first.' });
    }
    const result = await pool.query('DELETE FROM security_controls WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Control not found' });
    }
    res.json({ success: true, message: 'Control deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete control', message: error.message });
  }
});

app.get('/api/admin/measures/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const result = await pool.query(
      `
      SELECT a.id, a.measure_id, a.measure, a.comment, a.tags, a.control_id,
             s.impact, s.effort, s.before_score, s.maturity_score, s.goal_score
      FROM action_items a
      LEFT JOIN scoring s ON a.measure_id = s.measure_id AND s.is_default = 1
      WHERE a.id = $1
      `,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Measure not found' });
    }
    const measure = result.rows[0];
    const ttpRows = await pool.query(
      'SELECT ttp_id FROM measure_ttp_relationships WHERE measure_id = $1',
      [measure.measure_id]
    );
    res.json({
      ...measure,
      initial_maturity: measure.before_score ?? -1,
      present_maturity: measure.maturity_score ?? -1,
      desired_maturity: measure.goal_score ?? -1,
      ttp_ids: ttpRows.rows.map(row => row.ttp_id)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get measure', message: error.message });
  }
});

app.post('/api/admin/measures', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { measure_id, measure, comment, tags, control_id, ttp_ids, impact, effort, initial_maturity, present_maturity, desired_maturity } = req.body || {};
    const measureId = String(measure_id || '').trim();
    const measureText = String(measure || '').trim();
    const measureTags = String(tags || '').trim();
    const controlId = Number(control_id);
    if (!measureId || !measureText || !measureTags || !Number.isFinite(controlId)) {
      return res.status(400).json({ error: 'measure_id, measure, tags, and control_id are required' });
    }
    if (measureId.length > 64) {
      return res.status(400).json({ error: 'Measure ID is too long' });
    }
    if (!isValidTags(measureTags)) {
      return res.status(400).json({ error: 'Invalid tags value' });
    }
    if (impact && !isValidImpactEffort(impact)) {
      return res.status(400).json({ error: 'Invalid impact value' });
    }
    if (effort && !isValidImpactEffort(effort)) {
      return res.status(400).json({ error: 'Invalid effort value' });
    }
    const insertResult = await pool.query(
      `
      INSERT INTO action_items (measure_id, measure, comment, tags, control_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [measureId, measureText, comment || '', measureTags, controlId]
    );
    await pool.query(
      `
      INSERT INTO scoring
      (measure_id, user_id, impact, effort, before_score, maturity_score, goal_score, is_default)
      VALUES ($1, NULL, $2, $3, $4, $5, $6, 1)
      `,
      [
        measure_id,
        impact || 'medium',
        effort || 'medium',
        initial_maturity ?? -1,
        present_maturity ?? -1,
        desired_maturity ?? -1
      ]
    );
    if (Array.isArray(ttp_ids) && ttp_ids.length > 0) {
      for (const ttpIdRaw of ttp_ids) {
        const ttpId = Number(ttpIdRaw);
        if (!Number.isFinite(ttpId)) continue;
        await pool.query(
          'INSERT INTO measure_ttp_relationships (measure_id, ttp_id) VALUES ($1, $2)',
          [measureId, ttpId]
        );
      }
    }
    res.json({ success: true, id: insertResult.rows[0].id, message: 'Measure created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create measure', message: error.message });
  }
});

app.put('/api/admin/measures/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { measure_id, measure, comment, tags, control_id, ttp_ids, impact, effort, initial_maturity, present_maturity, desired_maturity } = req.body || {};
    const measureId = String(measure_id || '').trim();
    const measureText = String(measure || '').trim();
    const measureTags = String(tags || '').trim();
    const controlId = Number(control_id);
    if (!measureId || !measureText || !measureTags || !Number.isFinite(controlId)) {
      return res.status(400).json({ error: 'measure_id, measure, tags, and control_id are required' });
    }
    if (measureId.length > 64) {
      return res.status(400).json({ error: 'Measure ID is too long' });
    }
    if (!isValidTags(measureTags)) {
      return res.status(400).json({ error: 'Invalid tags value' });
    }
    if (impact && !isValidImpactEffort(impact)) {
      return res.status(400).json({ error: 'Invalid impact value' });
    }
    if (effort && !isValidImpactEffort(effort)) {
      return res.status(400).json({ error: 'Invalid effort value' });
    }
    const result = await pool.query(
      `
      UPDATE action_items
      SET measure_id = $1, measure = $2, comment = $3, tags = $4, control_id = $5
      WHERE id = $6
      `,
      [measureId, measureText, comment || '', measureTags, controlId, req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Measure not found' });
    }
    const updateScore = await pool.query(
      `
      UPDATE scoring
      SET impact = $1, effort = $2, before_score = $3, maturity_score = $4, goal_score = $5
      WHERE measure_id = $6 AND is_default = 1
      `,
      [
        impact || 'medium',
        effort || 'medium',
        initial_maturity ?? -1,
        present_maturity ?? -1,
        desired_maturity ?? -1,
        measureId
      ]
    );
    if (updateScore.rowCount === 0) {
      await pool.query(
        `
        INSERT INTO scoring
        (measure_id, user_id, impact, effort, before_score, maturity_score, goal_score, is_default)
        VALUES ($1, NULL, $2, $3, $4, $5, $6, 1)
        `,
        [
          measureId,
          impact || 'medium',
          effort || 'medium',
          initial_maturity ?? -1,
          present_maturity ?? -1,
          desired_maturity ?? -1
        ]
      );
    }
    if (ttp_ids !== undefined) {
      await pool.query('DELETE FROM measure_ttp_relationships WHERE measure_id = $1', [measureId]);
      if (Array.isArray(ttp_ids) && ttp_ids.length > 0) {
        for (const ttpIdRaw of ttp_ids) {
          const ttpId = Number(ttpIdRaw);
          if (!Number.isFinite(ttpId)) continue;
          await pool.query(
            'INSERT INTO measure_ttp_relationships (measure_id, ttp_id) VALUES ($1, $2)',
            [measureId, ttpId]
          );
        }
      }
    }
    res.json({ success: true, message: 'Measure updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update measure', message: error.message });
  }
});

app.delete('/api/admin/measures/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const measureRes = await pool.query(
      'SELECT measure_id FROM action_items WHERE id = $1',
      [req.params.id]
    );
    if (measureRes.rows.length === 0) {
      return res.status(404).json({ error: 'Measure not found' });
    }
    const measureId = measureRes.rows[0].measure_id;
    await pool.query('DELETE FROM scoring WHERE measure_id = $1', [measureId]);
    await pool.query('DELETE FROM measure_ttp_relationships WHERE measure_id = $1', [measureId]);
    await pool.query('DELETE FROM action_items WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Measure deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete measure', message: error.message });
  }
});

app.get('/api/admin/mitre/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const result = await pool.query('SELECT * FROM mitre_ttps WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'MITRE TTP not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get MITRE TTP', message: error.message });
  }
});

app.post('/api/admin/mitre', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { tactic, technique } = req.body || {};
    if (!tactic || !technique) {
      return res.status(400).json({ error: 'Tactic and technique are required' });
    }
    const slug = generateSlug(tactic, technique);
    const result = await pool.query(
      'INSERT INTO mitre_ttps (tactic, technique, slug) VALUES ($1, $2, $3) RETURNING id',
      [tactic, technique, slug]
    );
    res.json({ success: true, id: result.rows[0].id, message: 'MITRE TTP created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create MITRE TTP', message: error.message });
  }
});

app.put('/api/admin/mitre/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { tactic, technique } = req.body || {};
    const slug = generateSlug(tactic, technique);
    const result = await pool.query(
      `
      UPDATE mitre_ttps
      SET tactic = $1, technique = $2, slug = $3, updated_at = now()
      WHERE id = $4
      `,
      [tactic, technique, slug, req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'MITRE TTP not found' });
    }
    res.json({ success: true, message: 'MITRE TTP updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update MITRE TTP', message: error.message });
  }
});

app.delete('/api/admin/mitre/:id', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    await pool.query('DELETE FROM mitre_exploitation_examples WHERE ttp_id = $1', [req.params.id]);
    const result = await pool.query('DELETE FROM mitre_ttps WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'MITRE TTP not found' });
    }
    res.json({ success: true, message: 'MITRE TTP deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete MITRE TTP', message: error.message });
  }
});

app.get('/api/admin/mitre/:id/examples', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const result = await pool.query(
      `
      SELECT * FROM mitre_exploitation_examples
      WHERE ttp_id = $1
      ORDER BY order_index, id
      `,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load examples', message: error.message });
  }
});

app.get('/api/admin/mitre/:id/examples/:exampleId', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const result = await pool.query(
      `
      SELECT * FROM mitre_exploitation_examples
      WHERE ttp_id = $1 AND id = $2
      `,
      [req.params.id, req.params.exampleId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Example not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load example', message: error.message });
  }
});

app.post('/api/admin/mitre/:id/examples', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { title, description, code_block, order_index } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const result = await pool.query(
      `
      INSERT INTO mitre_exploitation_examples (ttp_id, title, description, code_block, order_index, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, now(), now())
      RETURNING id
      `,
      [req.params.id, title, description || null, code_block || null, order_index ?? 0]
    );
    res.json({ success: true, id: result.rows[0].id, message: 'Example created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create example', message: error.message });
  }
});

app.put('/api/admin/mitre/:id/examples/:exampleId', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const { title, description, code_block, order_index } = req.body || {};
    const result = await pool.query(
      `
      UPDATE mitre_exploitation_examples
      SET title = $1, description = $2, code_block = $3, order_index = $4, updated_at = now()
      WHERE ttp_id = $5 AND id = $6
      `,
      [title, description || null, code_block || null, order_index ?? 0, req.params.id, req.params.exampleId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Example not found' });
    }
    res.json({ success: true, message: 'Example updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update example', message: error.message });
  }
});

app.delete('/api/admin/mitre/:id/examples/:exampleId', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  try {
    const result = await pool.query(
      'DELETE FROM mitre_exploitation_examples WHERE ttp_id = $1 AND id = $2',
      [req.params.id, req.params.exampleId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Example not found' });
    }
    res.json({ success: true, message: 'Example deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete example', message: error.message });
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
