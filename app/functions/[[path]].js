/**
 * Cloudflare Pages Function for Mobile Device Detection and Routing
 * Automatically serves mobile app for mobile devices
 */

// Mobile device detection patterns (ordered by specificity)
const MOBILE_PATTERNS = [
  /iPhone/i,        // Most specific mobile patterns first
  /iPad/i,
  /iPod/i,
  /Android/i,
  /CriOS/i,         // Chrome on iOS
  /FxiOS/i,         // Firefox on iOS
  /EdgiOS/i,        // Edge on iOS
  /webOS/i,
  /BlackBerry/i,
  /IEMobile/i,
  /Opera Mini/i,
  /Windows Phone/i,
  /WPDesktop/i,
  /Tablet/i,
  /Mobile/i,
  /mobile/i,
  /Mobi/i,
  /Touch/i
];

// Paths that should always serve desktop version
const DESKTOP_ONLY_PATHS = [
  '/api/',
  '/functions/',
  '/_headers',
  '/_redirects',
  '/mitre.html',
  '/admin.html',
  '/reset-password.html',
  '/verify-email.html',
  '/mobile-app/', // Don't redirect mobile app path itself
];

// Static file extensions
const STATIC_EXTENSIONS = [
  '.css',
  '.js',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.pdf',
  '.txt',
  '.xml',
  '.map'
];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const userAgent = request.headers.get('User-Agent') || '';
  
  console.log(`📱 Mobile Router: ${request.method} ${pathname}`);
  console.log(`📱 User-Agent: ${userAgent.substring(0, 100)}...`);
  
  // Skip mobile detection for certain paths
  if (shouldSkipMobileDetection(pathname)) {
    console.log(`📱 Skipping mobile detection for: ${pathname}`);
    return env.ASSETS.fetch(request);
  }
  
  // Check if this is a mobile device
  const isMobile = detectMobileDevice(userAgent);
  console.log(`📱 Mobile device detected: ${isMobile}`);
  
  // Check for desktop override parameter
  const forceDesktop = url.searchParams.has('desktop') || 
                       url.searchParams.get('view') === 'desktop';
  
  console.log(`📱 Force desktop: ${forceDesktop}`);
  
  if (isMobile && !forceDesktop) {
    console.log(`📱 Routing to mobile app`);
    return handleMobileRequest(request, env, pathname);
  } else {
    console.log(`📱 Routing to desktop app`);
    return handleDesktopRequest(request, env, pathname);
  }
}

function shouldSkipMobileDetection(pathname) {
  // Skip for API endpoints
  if (pathname.startsWith('/api/')) {
    return true;
  }
  
  // Skip for functions
  if (pathname.startsWith('/functions/')) {
    return true;
  }
  
  // Skip for mobile app itself
  if (pathname.startsWith('/mobile-app/')) {
    return true;
  }
  
  // Skip for desktop-only paths
  if (DESKTOP_ONLY_PATHS.some(path => pathname.startsWith(path))) {
    return true;
  }
  
  // Skip for static files
  if (STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    return true;
  }
  
  // Skip for special Cloudflare files
  if (pathname.startsWith('/_') || pathname.startsWith('/.well-known/')) {
    return true;
  }
  
  return false;
}

function detectMobileDevice(userAgent) {
  if (!userAgent) {
    console.log('📱 No User-Agent provided, defaulting to desktop');
    return false;
  }
  
  // Normalize user agent for consistent detection
  const normalizedUA = userAgent.toLowerCase().trim();
  
  // Check against mobile patterns
  let isMobile = false;
  let matchedPattern = null;
  
  for (const pattern of MOBILE_PATTERNS) {
    if (pattern.test(normalizedUA)) {
      isMobile = true;
      matchedPattern = pattern.toString();
      break; // Stop at first match for consistency
    }
  }
  
  // Log the detection result for debugging
  console.log(`📱 Mobile detection result: ${isMobile} (matched: ${matchedPattern}) for UA: ${userAgent.substring(0, 50)}...`);
  
  return isMobile;
}

async function handleMobileRequest(request, env, pathname) {
  console.log(`📱 Serving mobile app for: ${pathname}`);
  
  try {
    // For root path, serve mobile app
    if (pathname === '/' || pathname === '/index.html') {
      const mobileAppRequest = new Request(
        new URL('/mobile-app/index.html', request.url),
        {
          method: request.method,
          headers: request.headers,
          body: request.body
        }
      );
      
      const response = await env.ASSETS.fetch(mobileAppRequest);
      
      if (response.ok) {
        // Add mobile-specific headers
        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(response.headers),
            'X-Mobile-App': 'true',
            'X-Device-Type': 'mobile',
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', // Prevent caching
            'Pragma': 'no-cache',
            'Expires': '0',
            'Last-Modified': new Date().toUTCString(),
            'ETag': `"${Date.now()}"`,
            'Vary': 'User-Agent'
          }
        });
        
        return newResponse;
      }
    }
    
    // For other paths, try to serve from mobile app or fallback to desktop
    const mobileAppRequest = new Request(
      new URL(`/mobile-app${pathname}`, request.url),
      {
        method: request.method,
        headers: request.headers,
        body: request.body
      }
    );
    
    const mobileResponse = await env.ASSETS.fetch(mobileAppRequest);
    
    if (mobileResponse.ok) {
      return new Response(mobileResponse.body, {
        status: mobileResponse.status,
        statusText: mobileResponse.statusText,
        headers: {
          ...Object.fromEntries(mobileResponse.headers),
          'X-Mobile-App': 'true',
          'X-Device-Type': 'mobile',
          'Vary': 'User-Agent'
        }
      });
    }
    
    // Fallback to desktop version
    console.log(`📱 Mobile resource not found, falling back to desktop: ${pathname}`);
    return handleDesktopRequest(request, env, pathname);
    
  } catch (error) {
    console.error('❌ Error serving mobile app:', error);
    return handleDesktopRequest(request, env, pathname);
  }
}

async function handleDesktopRequest(request, env, pathname) {
  console.log(`🖥️ Serving desktop app for: ${pathname}`);
  
  try {
    const response = await env.ASSETS.fetch(request);
    
    // Add desktop-specific headers
    if (response.ok) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers),
          'X-Device-Type': 'desktop',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', // Prevent caching
          'Pragma': 'no-cache',
          'Expires': '0',
          'Last-Modified': new Date().toUTCString(),
          'ETag': `"${Date.now()}"`,
          'Vary': 'User-Agent'
        }
      });
    }
    
    return response;
    
  } catch (error) {
    console.error('❌ Error serving desktop app:', error);
    
    // Return a basic error response
    return new Response('Service temporarily unavailable', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain',
        'X-Error': 'true'
      }
    });
  }
}

// Handle OPTIONS requests for CORS
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
