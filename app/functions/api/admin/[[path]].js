export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/admin', '');
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authentication for all requests
    const authResult = await verifyAdminAuth(request, env);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route admin requests
    switch (request.method) {
      case 'GET':
        return await handleAdminGet(path, env, corsHeaders);
      case 'POST':
        return await handleAdminPost(path, request, env, corsHeaders);
      case 'PUT':
        return await handleAdminPut(path, request, env, corsHeaders);
      case 'DELETE':
        return await handleAdminDelete(path, request, env, corsHeaders);
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function verifyAdminAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify JWT token
    const payload = await verifyJWT(token, env.JWT_SECRET || 'default-secret');
    
    // Check if user exists and is admin
    const user = await env.DB.prepare('SELECT id, email, is_admin FROM users WHERE id = ?')
      .bind(payload.id).first();
    
    if (!user) {
      return { success: false, error: 'User not found', status: 401 };
    }
    
    if (!user.is_admin) {
      return { success: false, error: 'Admin access required', status: 403 };
    }
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: 'Invalid token', status: 401 };
  }
}

async function handleAdminGet(path, env, corsHeaders) {
  switch (path) {
    case '/check':
      return new Response(JSON.stringify({ success: true, message: 'Admin access verified' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    case '/users':
      return await getUsers(env, corsHeaders);
      
    case '/domains':
      return await getDomains(env, corsHeaders);
      
    case '/controls':
      return await getControls(env, corsHeaders);
      
    case '/measures':
      return await getMeasures(env, corsHeaders);
      
    case '/mitre':
      return await getMitre(env, corsHeaders);
      
    default:
      // Check for nested MITRE routes like /mitre/1/examples
      if (path.startsWith('/mitre/') && path.includes('/examples')) {
        const pathParts = path.split('/').filter(part => part !== '');
        if (pathParts.length >= 3 && pathParts[0] === 'mitre' && pathParts[2] === 'examples') {
          const ttpId = pathParts[1];
          if (pathParts.length === 3) {
            // GET /mitre/{id}/examples
            return await getMitreExamples(ttpId, env, corsHeaders);
          } else if (pathParts.length === 4) {
            // GET /mitre/{id}/examples/{exampleId}
            return await getMitreExample(ttpId, pathParts[3], env, corsHeaders);
          }
        }
      }
      // Check for single MITRE TTP route like /mitre/1
      if (path.startsWith('/mitre/')) {
        const pathParts = path.split('/').filter(part => part !== '');
        if (pathParts.length === 2 && pathParts[0] === 'mitre') {
          return await getSingleMitre(pathParts[1], env, corsHeaders);
        }
      }
      // Check for single measure route like /measures/1
      if (path.startsWith('/measures/')) {
        const pathParts = path.split('/').filter(part => part !== '');
        if (pathParts.length === 2 && pathParts[0] === 'measures') {
          return await getSingleMeasure(pathParts[1], env, corsHeaders);
        }
      }
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  }
}

async function handleAdminPost(path, request, env, corsHeaders) {
  const body = await request.json();
  
  switch (path) {
    case '/users':
      return await createUser(body, env, corsHeaders);
      
    case '/domains':
      return await createDomain(body, env, corsHeaders);
      
    case '/controls':
      return await createControl(body, env, corsHeaders);
      
    case '/measures':
      return await createMeasure(body, env, corsHeaders);
      
    case '/mitre':
      return await createMitre(body, env, corsHeaders);
      
    default:
      // Check for nested MITRE routes like /mitre/1/examples
      if (path.startsWith('/mitre/') && path.includes('/examples')) {
        const pathParts = path.split('/').filter(part => part !== '');
        if (pathParts.length === 3 && pathParts[0] === 'mitre' && pathParts[2] === 'examples') {
          const ttpId = pathParts[1];
          return await createMitreExample(ttpId, body, env, corsHeaders);
        }
      }
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  }
}

async function handleAdminPut(path, request, env, corsHeaders) {
  const body = await request.json();
  const pathParts = path.split('/').filter(part => part !== '');
  
  // Handle nested routes first (like /mitre/1/examples/4)
  if (pathParts.length === 4 && pathParts[0] === 'mitre' && pathParts[2] === 'examples') {
    const ttpId = pathParts[1];
    const exampleId = pathParts[3];
    return await updateMitreExample(ttpId, exampleId, body, env, corsHeaders);
  }
  
  if (pathParts.length !== 2) {
    return new Response(JSON.stringify({ error: 'Invalid path format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const resource = pathParts[0];
  const id = pathParts[1];
  
  switch (resource) {
    case 'users':
      return await updateUser(id, body, env, corsHeaders);
      
    case 'domains':
      return await updateDomain(id, body, env, corsHeaders);
      
    case 'controls':
      return await updateControl(id, body, env, corsHeaders);
      
    case 'measures':
      return await updateMeasure(id, body, env, corsHeaders);
      
    case 'mitre':
      return await updateMitre(id, body, env, corsHeaders);
      
    default:
      return new Response(JSON.stringify({ error: 'Resource not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  }
}

async function handleAdminDelete(path, request, env, corsHeaders) {
  const pathParts = path.split('/').filter(part => part !== '');
  
  // Handle nested routes first (like /mitre/1/examples/4)
  if (pathParts.length === 4 && pathParts[0] === 'mitre' && pathParts[2] === 'examples') {
    const ttpId = pathParts[1];
    const exampleId = pathParts[3];
    return await deleteMitreExample(ttpId, exampleId, env, corsHeaders);
  }
  
  if (pathParts.length !== 2) {
    return new Response(JSON.stringify({ error: 'Invalid path format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const resource = pathParts[0];
  const id = pathParts[1];
  
  switch (resource) {
    case 'users':
      return await deleteUser(id, env, corsHeaders);
      
    case 'domains':
      return await deleteDomain(id, env, corsHeaders);
      
    case 'controls':
      return await deleteControl(id, env, corsHeaders);
      
    case 'measures':
      return await deleteMeasure(id, env, corsHeaders);
      
    case 'mitre':
      return await deleteMitre(id, env, corsHeaders);
      
    default:
      return new Response(JSON.stringify({ error: 'Resource not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  }
}

// User management functions
async function getUsers(env, corsHeaders) {
  const users = await env.DB.prepare(`
    SELECT id, email, name, is_admin, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `).all();
  
  return new Response(JSON.stringify(users.results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function createUser(body, env, corsHeaders) {
  const { email, name, is_admin = false, password } = body;
  
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Check if user already exists
  const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email).first();
  
  if (existingUser) {
    return new Response(JSON.stringify({ error: 'User already exists' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Hash password
  const hashedPassword = await hashPassword(password);
  
  // Create user
  const result = await env.DB.prepare(`
    INSERT INTO users (email, name, password_hash, is_admin, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(email, name, hashedPassword, is_admin ? 1 : 0).run();
  
  return new Response(JSON.stringify({ 
    success: true, 
    id: result.meta.last_row_id,
    message: 'User created successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function updateUser(id, body, env, corsHeaders) {
  const { email, name, is_admin } = body;
  
  const result = await env.DB.prepare(`
    UPDATE users 
    SET email = ?, name = ?, is_admin = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(email, name, is_admin ? 1 : 0, id).run();
  
  if (result.changes === 0) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ 
    success: true, 
    message: 'User updated successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function deleteUser(id, env, corsHeaders) {
  try {
    // Delete related records first to avoid foreign key constraints
    await env.DB.prepare('DELETE FROM scoring WHERE user_id = ?').bind(id).run();
    // Now delete the user
    const result = await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete user',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Domain management functions
async function getDomains(env, corsHeaders) {
  const domains = await env.DB.prepare(`
    SELECT id, name
    FROM security_domains
    ORDER BY id
  `).all();
  
  return new Response(JSON.stringify(domains.results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function createDomain(body, env, corsHeaders) {
  const { name } = body;
  
  if (!name) {
    return new Response(JSON.stringify({ error: 'Domain name is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const result = await env.DB.prepare(`
    INSERT INTO security_domains (name)
    VALUES (?)
  `).bind(name).run();
  
  return new Response(JSON.stringify({ 
    success: true, 
    id: result.meta.last_row_id,
    message: 'Domain created successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function updateDomain(id, body, env, corsHeaders) {
  const { name } = body;
  
  const result = await env.DB.prepare(`
    UPDATE security_domains 
    SET name = ?
    WHERE id = ?
  `).bind(name, id).run();
  
  if (result.changes === 0) {
    return new Response(JSON.stringify({ error: 'Domain not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Domain updated successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function deleteDomain(id, env, corsHeaders) {
  try {
    // Check if domain has controls
    const controlsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM security_controls WHERE domain_id = ?').bind(id).first();
    
    if (controlsCount.count > 0) {
      return new Response(JSON.stringify({ 
        error: 'Cannot delete domain with existing controls. Delete controls first.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const result = await env.DB.prepare('DELETE FROM security_domains WHERE id = ?').bind(id).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'Domain not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Domain deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting domain:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete domain',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Control management functions
async function getControls(env, corsHeaders) {
  const controls = await env.DB.prepare(`
    SELECT c.id, c.code, c.text, c.domain_id, d.name as domain_name
    FROM security_controls c
    JOIN security_domains d ON c.domain_id = d.id
    ORDER BY c.id
  `).all();
  
  return new Response(JSON.stringify(controls.results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function createControl(body, env, corsHeaders) {
  const { code, text, domain_id } = body;
  
  if (!code || !text || !domain_id) {
    return new Response(JSON.stringify({ error: 'Code, text, and domain_id are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const result = await env.DB.prepare(`
    INSERT INTO security_controls (code, text, domain_id)
    VALUES (?, ?, ?)
  `).bind(code, text, domain_id).run();
  
  return new Response(JSON.stringify({ 
    success: true, 
    id: result.meta.last_row_id,
    message: 'Control created successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function updateControl(id, body, env, corsHeaders) {
  const { code, text, domain_id } = body;
  
  const result = await env.DB.prepare(`
    UPDATE security_controls 
    SET code = ?, text = ?, domain_id = ?
    WHERE id = ?
  `).bind(code, text, domain_id, id).run();
  
  if (result.changes === 0) {
    return new Response(JSON.stringify({ error: 'Control not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ 
    success: true, 
    message: 'Control updated successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function deleteControl(id, env, corsHeaders) {
  try {
    // Check if control has action items
    const measuresCount = await env.DB.prepare('SELECT COUNT(*) as count FROM action_items WHERE control_id = ?').bind(id).first();
    
    if (measuresCount.count > 0) {
      return new Response(JSON.stringify({ 
        error: 'Cannot delete control with existing measures. Delete measures first.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const result = await env.DB.prepare('DELETE FROM security_controls WHERE id = ?').bind(id).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'Control not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Control deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting control:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete control',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Measure management functions
async function getMeasures(env, corsHeaders) {
  const measures = await env.DB.prepare(`
    SELECT a.id, a.measure_id, a.measure, a.comment, a.tags, a.control_id, c.code as control_code,
           s.impact, s.effort, s.initial_maturity, s.present_maturity, s.desired_maturity
    FROM action_items a
    JOIN security_controls c ON a.control_id = c.id
    INNER JOIN scoring s ON a.measure_id = s.measure_id AND s.is_default = 1
    ORDER BY a.id
  `).all();
  
  // For each measure, get linked TTPs
  const measuresWithTtps = await Promise.all(measures.results.map(async (measure) => {
    const ttps = await env.DB.prepare(`
      SELECT mt.id, mt.tactic, mt.technique, mt.slug
      FROM measure_ttp_relationships mtr
      JOIN mitre_ttps mt ON mtr.ttp_id = mt.id
      WHERE mtr.measure_id = ?
      ORDER BY mt.tactic, mt.technique
    `).bind(measure.measure_id).all();
    
    return {
      ...measure,
      linked_ttps: ttps.results || []
    };
  }));
  
  return new Response(JSON.stringify(measuresWithTtps), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function createMeasure(body, env, corsHeaders) {
  const { measure_id, measure, comment, mitre, tags, control_id, ttp_ids, impact, effort, initial_maturity, present_maturity, desired_maturity } = body;
  
  if (!measure_id || !measure || !tags || !control_id) {
    return new Response(JSON.stringify({ error: 'measure_id, measure, tags, and control_id are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const result = await env.DB.prepare(`
      INSERT INTO action_items (measure_id, measure, comment, tags, control_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      measure_id, 
      measure, 
      comment || '', 
      tags, 
      control_id
    ).run();

    // Create the default scoring record (single source of truth)
    await env.DB.prepare(`
      INSERT OR REPLACE INTO scoring 
      (measure_id, user_id, impact, effort, initial_maturity, present_maturity, desired_maturity, is_default)
      VALUES (?, NULL, ?, ?, ?, ?, ?, 1)
    `).bind(
      measure_id,
      impact || 'medium',
      effort || 'medium',
      initial_maturity !== undefined ? initial_maturity : -1,
      present_maturity !== undefined ? present_maturity : -1,
      desired_maturity !== undefined ? desired_maturity : -1
    ).run();
    
    // Create TTP relationships if provided
    if (ttp_ids && Array.isArray(ttp_ids) && ttp_ids.length > 0) {
      for (const ttpId of ttp_ids) {
        await env.DB.prepare(`
          INSERT INTO measure_ttp_relationships (measure_id, ttp_id)
          VALUES (?, ?)
        `).bind(measure_id, ttpId).run();
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'Measure created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating measure:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create measure',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function updateMeasure(id, body, env, corsHeaders) {
  const { measure_id, measure, comment, mitre, tags, control_id, ttp_ids, impact, effort, initial_maturity, present_maturity, desired_maturity } = body;
  
  try {
    const result = await env.DB.prepare(`
      UPDATE action_items 
      SET measure_id = ?, measure = ?, comment = ?, tags = ?, control_id = ?
      WHERE id = ?
    `).bind(
      measure_id, 
      measure, 
      comment || '', 
      tags, 
      control_id,
      id
    ).run();

    // Update the default scoring record (single source of truth)
    const updateResult = await env.DB.prepare(`
      UPDATE scoring 
      SET impact = ?, effort = ?, initial_maturity = ?, present_maturity = ?, desired_maturity = ?
      WHERE measure_id = ? AND is_default = 1
    `).bind(
      impact || 'medium',
      effort || 'medium',
      initial_maturity !== undefined ? initial_maturity : -1,
      present_maturity !== undefined ? present_maturity : -1,
      desired_maturity !== undefined ? desired_maturity : -1,
      measure_id
    ).run();
    
    // If no default record exists, create one (fallback)
    if (updateResult.changes === 0) {
      await env.DB.prepare(`
        INSERT INTO scoring 
        (measure_id, user_id, impact, effort, initial_maturity, present_maturity, desired_maturity, is_default)
        VALUES (?, NULL, ?, ?, ?, ?, ?, 1)
      `).bind(
        measure_id,
        impact || 'medium',
        effort || 'medium',
        initial_maturity !== undefined ? initial_maturity : -1,
        present_maturity !== undefined ? present_maturity : -1,
        desired_maturity !== undefined ? desired_maturity : -1
      ).run();
    }
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'Measure not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Update TTP relationships
    if (ttp_ids !== undefined) {
      // First, delete existing relationships
      await env.DB.prepare(`
        DELETE FROM measure_ttp_relationships WHERE measure_id = ?
      `).bind(measure_id).run();
      
      // Then, create new relationships if provided
      if (Array.isArray(ttp_ids) && ttp_ids.length > 0) {
        for (const ttpId of ttp_ids) {
          await env.DB.prepare(`
            INSERT INTO measure_ttp_relationships (measure_id, ttp_id)
            VALUES (?, ?)
          `).bind(measure_id, ttpId).run();
        }
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Measure updated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating measure:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update measure',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function deleteMeasure(id, env, corsHeaders) {
  try {
    // Get the measure_id first
    const measure = await env.DB.prepare('SELECT measure_id FROM action_items WHERE id = ?').bind(id).first();
    
    if (!measure) {
      return new Response(JSON.stringify({ error: 'Measure not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Delete related scoring records first
    await env.DB.prepare('DELETE FROM scoring WHERE measure_id = ?').bind(measure.measure_id).run();
    
    // Delete TTP relationships
    await env.DB.prepare('DELETE FROM measure_ttp_relationships WHERE measure_id = ?').bind(measure.measure_id).run();
    
    // Now delete the measure
    const result = await env.DB.prepare('DELETE FROM action_items WHERE id = ?').bind(id).run();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Measure deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting measure:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete measure',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Utility functions
async function verifyJWT(token, secret) {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    
    const data = encodedHeader + '.' + encodedPayload;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Convert URL-safe base64 to regular base64 and add proper padding
    let base64Signature = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64Signature.length % 4) {
      base64Signature += '=';
    }
    const signature = Uint8Array.from(atob(base64Signature), c => c.charCodeAt(0));
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data));
    
    if (!isValid) {
      throw new Error('Invalid signature');
    }
    
    const payload = JSON.parse(atob(encodedPayload));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

async function getSingleMeasure(id, env, corsHeaders) {
  try {
    const measure = await env.DB.prepare(`
      SELECT a.id, a.measure_id, a.measure, a.comment, a.tags, a.control_id, c.code as control_code,
             s.impact, s.effort, s.initial_maturity, s.present_maturity, s.desired_maturity
      FROM action_items a
      JOIN security_controls c ON a.control_id = c.id
      INNER JOIN scoring s ON a.measure_id = s.measure_id AND s.is_default = 1
      WHERE a.id = ?
    `).bind(id).first();
    
    if (!measure) {
      return new Response(JSON.stringify({ error: 'Measure not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get linked TTPs
    const ttps = await env.DB.prepare(`
      SELECT mt.id, mt.tactic, mt.technique, mt.slug
      FROM measure_ttp_relationships mtr
      JOIN mitre_ttps mt ON mtr.ttp_id = mt.id
      WHERE mtr.measure_id = ?
      ORDER BY mt.tactic, mt.technique
    `).bind(measure.measure_id).all();
    
    return new Response(JSON.stringify({
      ...measure,
      linked_ttps: ttps.results || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting measure:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get measure',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// MITRE TTP management functions
async function getMitre(env, corsHeaders) {
  const mitreList = await env.DB.prepare(`
    SELECT m.*, 
           COUNT(e.id) as example_count
    FROM mitre_ttps m
    LEFT JOIN mitre_exploitation_examples e ON m.id = e.ttp_id
    GROUP BY m.id
    ORDER BY m.tactic, m.technique
  `).all();
  
  return new Response(JSON.stringify(mitreList.results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function createMitre(body, env, corsHeaders) {
  try {
    const { tactic, technique } = body;
    const slug = generateSlug(tactic, technique);
    
    const result = await env.DB.prepare(`
      INSERT INTO mitre_ttps (tactic, technique, slug)
      VALUES (?, ?, ?)
    `).bind(tactic, technique, slug).run();
    
    return new Response(JSON.stringify({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'MITRE TTP created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating MITRE TTP:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create MITRE TTP',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function updateMitre(id, body, env, corsHeaders) {
  try {
    const { tactic, technique } = body;
    const slug = generateSlug(tactic, technique);
    
    const result = await env.DB.prepare(`
      UPDATE mitre_ttps 
      SET tactic = ?, technique = ?, slug = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(tactic, technique, slug, id).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'MITRE TTP not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'MITRE TTP updated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating MITRE TTP:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update MITRE TTP',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function deleteMitre(id, env, corsHeaders) {
  try {
    // Delete related examples first (CASCADE should handle this, but let's be explicit)
    await env.DB.prepare('DELETE FROM mitre_exploitation_examples WHERE ttp_id = ?').bind(id).run();
    
    // Now delete the MITRE TTP
    const result = await env.DB.prepare('DELETE FROM mitre_ttps WHERE id = ?').bind(id).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'MITRE TTP not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'MITRE TTP deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting MITRE TTP:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete MITRE TTP',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// MITRE TTP Examples management functions
async function getSingleMitre(id, env, corsHeaders) {
  const mitre = await env.DB.prepare('SELECT * FROM mitre_ttps WHERE id = ?').bind(id).first();
  
  if (!mitre) {
    return new Response(JSON.stringify({ error: 'MITRE TTP not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(mitre), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getMitreExamples(ttpId, env, corsHeaders) {
  const examples = await env.DB.prepare(`
    SELECT * FROM mitre_exploitation_examples 
    WHERE ttp_id = ? 
    ORDER BY order_index, id
  `).bind(ttpId).all();
  
  return new Response(JSON.stringify(examples.results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getMitreExample(ttpId, exampleId, env, corsHeaders) {
  const example = await env.DB.prepare(`
    SELECT * FROM mitre_exploitation_examples 
    WHERE ttp_id = ? AND id = ?
  `).bind(ttpId, exampleId).first();
  
  if (!example) {
    return new Response(JSON.stringify({ error: 'Example not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(example), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function createMitreExample(ttpId, body, env, corsHeaders) {
  try {
    const { title, description, code_block } = body;
    
    // Get the next order index
    const maxOrder = await env.DB.prepare(`
      SELECT COALESCE(MAX(order_index), 0) as max_order 
      FROM mitre_exploitation_examples 
      WHERE ttp_id = ?
    `).bind(ttpId).first();
    
    const result = await env.DB.prepare(`
      INSERT INTO mitre_exploitation_examples (ttp_id, title, description, code_block, order_index)
      VALUES (?, ?, ?, ?, ?)
    `).bind(ttpId, title, description, code_block, maxOrder.max_order + 1).run();
    
    return new Response(JSON.stringify({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'Example created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating MITRE example:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create example',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function updateMitreExample(ttpId, exampleId, body, env, corsHeaders) {
  try {
    const { title, description, code_block } = body;
    
    const result = await env.DB.prepare(`
      UPDATE mitre_exploitation_examples 
      SET title = ?, description = ?, code_block = ?, updated_at = CURRENT_TIMESTAMP
      WHERE ttp_id = ? AND id = ?
    `).bind(title, description, code_block, ttpId, exampleId).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'Example not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Example updated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating MITRE example:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update example',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function deleteMitreExample(ttpId, exampleId, env, corsHeaders) {
  try {
    const result = await env.DB.prepare(`
      DELETE FROM mitre_exploitation_examples 
      WHERE ttp_id = ? AND id = ?
    `).bind(ttpId, exampleId).run();
    
    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'Example not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Example deleted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting MITRE example:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete example',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

function generateSlug(tactic, technique) {
  // Convert to lowercase and replace spaces/special chars with dashes
  const tacticSlug = tactic.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  
  const techniqueSlug = technique.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  
  return `${tacticSlug}/${techniqueSlug}`;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
