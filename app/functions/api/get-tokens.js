export async function onRequest(context) {
  const { env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database not available' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Get verification tokens for testing
    const tokens = await env.DB.prepare(`
      SELECT vt.token, vt.expires_at, vt.used_at, u.email 
      FROM email_verification_tokens vt
      JOIN users u ON vt.user_id = u.id
      ORDER BY vt.created_at DESC
      LIMIT 5
    `).all();
    
    return new Response(JSON.stringify({
      success: true,
      tokens: tokens.results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get tokens',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
