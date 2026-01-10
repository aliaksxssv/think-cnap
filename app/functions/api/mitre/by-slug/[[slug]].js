export async function onRequest(context) {
  const { request, env } = context;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Extract slug from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(part => part !== '');
    
    // Expected path: /api/mitre/by-slug/tactic/technique
    if (pathParts.length < 4 || pathParts[0] !== 'api' || pathParts[1] !== 'mitre' || pathParts[2] !== 'by-slug') {
      return new Response(JSON.stringify({ error: 'Invalid path format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Reconstruct slug from remaining path parts
    const slug = pathParts.slice(3).join('/');
    
    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Query database for TTP by slug
    const ttp = await env.DB.prepare(`
      SELECT id, tactic, technique, slug, created_at, updated_at
      FROM mitre_ttps 
      WHERE slug = ?
    `).bind(slug).first();

    if (!ttp) {
      return new Response(JSON.stringify({ error: 'TTP not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(ttp), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching TTP by slug:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
