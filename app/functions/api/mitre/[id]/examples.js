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
    // Extract TTP ID from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(part => part !== '');
    
    // Expected path: /api/mitre/{id}/examples
    if (pathParts.length !== 4 || pathParts[0] !== 'api' || pathParts[1] !== 'mitre' || pathParts[3] !== 'examples') {
      return new Response(JSON.stringify({ error: 'Invalid path format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const ttpId = pathParts[2];
    
    if (!ttpId) {
      return new Response(JSON.stringify({ error: 'TTP ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Query database for examples
    const examples = await env.DB.prepare(`
      SELECT id, title, description, code_block, order_index, created_at, updated_at
      FROM mitre_exploitation_examples 
      WHERE ttp_id = ?
      ORDER BY order_index ASC, created_at ASC
    `).bind(ttpId).all();

    return new Response(JSON.stringify(examples.results || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching MITRE examples:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
