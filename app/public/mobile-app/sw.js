/**
 * ThinkCNAP Mobile App Service Worker
 * Provides offline capabilities and caching
 */

const CACHE_NAME = 'thinkcnap-mobile-v1.2.3';
const STATIC_CACHE = 'thinkcnap-static-v1.2.3';
const DYNAMIC_CACHE = 'thinkcnap-dynamic-v1.2.3';

// Resources to cache immediately (only internal resources)
const STATIC_ASSETS = [
  '/mobile-app/',
  '/mobile-app/index.html',
  '/mobile-app/css/mobile.css',
  '/mobile-app/js/mobile.js',
  '/mobile-app/manifest.json',
  '/auth.js'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/config',
  '/api/scoring',
  '/api/auth/verify'
];

// Maximum cache size for dynamic content
const MAX_DYNAMIC_CACHE_SIZE = 50;

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('📱 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📱 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('📱 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete ALL old caches to force fresh load
            if (!cacheName.includes('v1.2.3')) {
              console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated - All old caches cleared');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content or fetch from network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => {
    if (asset.startsWith('https://')) {
      return url.href.startsWith(asset);
    }
    return url.pathname === asset || url.pathname.startsWith(asset);
  });
}

// Check if request is for an API endpoint
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// Handle static asset requests (cache first)
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, fetch from network and cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Service Worker: Failed to handle static asset:', error);
    
    // Return offline fallback if available
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/mobile-app/index.html');
    }
    
    return new Response('Offline', { 
      status: 408,
      statusText: 'Request Timeout' 
    });
  }
}

// Handle API requests (network first with cache fallback)
async function handleAPIRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      
      // Limit cache size
      limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('⚠️ Service Worker: Network failed for API request, trying cache');
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response if no cache available
    return new Response(
      JSON.stringify({ 
        error: 'Offline - No cached data available',
        offline: true 
      }), 
      { 
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle dynamic requests (network first)
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      
      // Limit cache size
      limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
    }
    
    return networkResponse;
  } catch (error) {
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for document requests
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE);
      const offlinePage = await cache.match('/mobile-app/index.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    return new Response('Offline', { 
      status: 408,
      statusText: 'Request Timeout' 
    });
  }
}

// Limit cache size by removing oldest entries
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    console.log(`🗑️ Service Worker: Cleaned ${keysToDelete.length} entries from ${cacheName}`);
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  console.log('🔄 Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'scoring-sync') {
    event.waitUntil(syncScoringData());
  }
});

// Sync scoring data when back online
async function syncScoringData() {
  try {
    // Get pending scoring updates from IndexedDB or localStorage
    const pendingUpdates = await getPendingScoringUpdates();
    
    if (pendingUpdates.length > 0) {
      console.log(`🔄 Service Worker: Syncing ${pendingUpdates.length} scoring updates`);
      
      for (const update of pendingUpdates) {
        try {
          const response = await fetch('/api/scoring', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${update.token}`
            },
            body: JSON.stringify(update.data)
          });
          
          if (response.ok) {
            await removePendingScoringUpdate(update.id);
            console.log('✅ Service Worker: Scoring update synced:', update.id);
          }
        } catch (error) {
          console.error('❌ Service Worker: Failed to sync scoring update:', error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Service Worker: Background sync failed:', error);
  }
}

// Get pending scoring updates (placeholder - would use IndexedDB in production)
async function getPendingScoringUpdates() {
  // In a real implementation, this would read from IndexedDB
  return [];
}

// Remove synced scoring update (placeholder - would use IndexedDB in production)
async function removePendingScoringUpdate(id) {
  // In a real implementation, this would remove from IndexedDB
  console.log('Removed pending update:', id);
}

// Handle push notifications
self.addEventListener('push', event => {
  console.log('📱 Service Worker: Push notification received');
  
  let notificationData = {
    title: 'ThinkCNAP',
    body: 'You have updates in your security dashboard',
    icon: '/mobile-app/manifest.json',
    badge: '/mobile-app/manifest.json',
    tag: 'thinkcnap-update',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
        icon: '/mobile-app/manifest.json'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('❌ Service Worker: Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('📱 Service Worker: Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/mobile-app/')
    );
  }
});

// Handle messages from the main app
self.addEventListener('message', event => {
  console.log('📱 Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Log service worker lifecycle
console.log('📱 Service Worker: Script loaded');

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
  console.error('❌ Service Worker: Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// Handle errors
self.addEventListener('error', event => {
  console.error('❌ Service Worker: Error:', event.error);
});
