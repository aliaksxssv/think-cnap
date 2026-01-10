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
    const { email } = await request.json();
    
    // Validate input
    if (!email) {
      return new Response(JSON.stringify({ 
        error: 'Email address is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user exists
    const user = await env.DB.prepare(
      'SELECT id, email, google_id FROM users WHERE email = ? AND email_verified = 1'
    ).bind(email).first();
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return new Response(JSON.stringify({ 
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user has a password (not Google OAuth user)
    if (user.google_id) {
      return new Response(JSON.stringify({ 
        error: 'This account uses Google sign-in. Please sign in with Google instead.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Generate reset token
    const resetToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Store reset token in database
    await env.DB.prepare(`
      INSERT OR REPLACE INTO password_reset_tokens (user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(user.id, resetToken, expiresAt.toISOString()).run();
    
    // Send reset email
    const resetUrl = `${getBaseUrl(request)}/reset-password?token=${resetToken}`;
    
    try {
      await sendPasswordResetEmail(env, email, resetUrl);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      return new Response(JSON.stringify({ 
        error: 'Failed to send reset email. Please try again later.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Password reset link sent to your email. Please check your inbox.' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
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

// Generate secure random token
function generateSecureToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Get base URL from request
function getBaseUrl(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

// Send password reset email using Resend
async function sendPasswordResetEmail(env, email, resetUrl) {
  const emailData = {
    from: 'ThinkCNAP <noreply@thinkcnap.org>',
    to: email,
    subject: 'Reset Your ThinkCNAP Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">ThinkCNAP</h1>
          <p style="color: #e0f7fa; margin: 10px 0 0 0; font-size: 16px;">Cloud Native Application Protection</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; border-left: 4px solid #0891b2;">
          <h2 style="color: #1e293b; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #475569; line-height: 1.6; margin-bottom: 25px;">
            We received a request to reset your password for your ThinkCNAP account. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #0891b2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Reset My Password
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
            <strong>Security Notice:</strong><br>
            • This link will expire in 24 hours<br>
            • If you didn't request this reset, please ignore this email<br>
            • For security, this link can only be used once
          </p>
          
          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="word-break: break-all;">${resetUrl}</span>
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
          <p>This email was sent by ThinkCNAP. If you have questions, please contact support.</p>
        </div>
      </div>
    `
  };

  const resendApiKey = env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}
