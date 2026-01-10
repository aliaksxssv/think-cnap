export async function onRequestPost(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Create password reset tokens table if it doesn't exist
    await createPasswordResetTable(env.DB);
    
    // Parse request body
    const { token, newPassword } = await request.json();
    
    // Validate input
    if (!token || !newPassword) {
      return new Response(JSON.stringify({ 
        error: 'Reset token and new password are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ 
        error: 'New password must be at least 8 characters long' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if token exists and is not expired
    const resetRecord = await env.DB.prepare(`
      SELECT rt.id, rt.user_id, rt.expires_at, rt.used_at, u.email, u.google_id
      FROM password_reset_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token = ?
    `).bind(token).first();
    
    if (!resetRecord) {
      return new Response(JSON.stringify({ 
        error: 'Invalid reset token' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if token has been used
    if (resetRecord.used_at) {
      return new Response(JSON.stringify({ 
        error: 'This reset link has already been used' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if token has expired
    const expiresAt = new Date(resetRecord.expires_at);
    const now = new Date();
    
    if (now > expiresAt) {
      return new Response(JSON.stringify({ 
        error: 'Reset token has expired. Please request a new password reset.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user has a password (not Google OAuth user)
    if (resetRecord.google_id) {
      return new Response(JSON.stringify({ 
        error: 'Cannot reset password for Google OAuth users' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Start transaction to update password and mark token as used
    try {
      // Update password
      await env.DB.prepare(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(newPasswordHash, resetRecord.user_id).run();
      
      // Mark token as used
      await env.DB.prepare(
        'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(resetRecord.id).run();
      
      // Clean up expired tokens for this user (optional cleanup)
      await env.DB.prepare(
        'DELETE FROM password_reset_tokens WHERE user_id = ? AND expires_at < CURRENT_TIMESTAMP'
      ).bind(resetRecord.user_id).run();
      
    } catch (dbError) {
      console.error('Database error during password reset:', dbError);
      return new Response(JSON.stringify({ 
        error: 'Failed to reset password. Please try again.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Create password reset tokens table
async function createPasswordResetTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();
  
  // Create indexes for better performance
  try {
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)`).run();
  } catch (error) {
    // Indexes might already exist, ignore errors
    console.log('Index creation note:', error.message);
  }
}

// Password hashing function
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
