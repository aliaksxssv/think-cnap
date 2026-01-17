/**
 * ThinkCNAP Mobile App
 * Swipeable chart interface for mobile devices
 */

class MobileApp {
  constructor() {
    this.currentSlide = 0;
    this.charts = {};
    this.config = null;
    this.scoring = null;
    this.selectedTags = ['aws']; // Only AWS selected by default (radio button behavior)
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isDragging = false;
    this.authInstance = null;
    this.initTimeout = null;
    this.currentUser = null; // Add currentUser property like desktop
    this.currentDomainId = null; // Track current domain for back navigation
    this.currentControlId = null; // Track current control for back navigation
    
    // Force cache invalidation for iOS Safari
    this.forceCacheInvalidation();
    
    // Try to restore control ID from localStorage
    const savedControlId = localStorage.getItem('think_cnap_current_control_id');
    if (savedControlId) {
      this.currentControlId = savedControlId;
      console.log('📱 Restored control ID from localStorage:', savedControlId);
    }
    
    console.log('📱 Initializing ThinkCNAP Mobile App...');
    this.init();
  }
  
  forceCacheInvalidation() {
    // Add timestamp to prevent caching issues
    const timestamp = Date.now();
    console.log('🔄 Mobile App: Force cache invalidation at', new Date(timestamp).toISOString());
    
    // Clear any existing service worker caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (!cacheName.includes('v1.1.156')) {
            console.log('🗑️ Clearing old cache:', cacheName);
            caches.delete(cacheName);
          }
        });
      });
    }
    
    // Force reload manifest and favicon
    this.forceIconUpdate();
  }
  
  forceIconUpdate() {
    console.log('🕸️ Forcing icon update to spider web...');
    
    // Force reload manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      const newHref = manifestLink.href.split('?')[0] + '?v=' + Date.now();
      manifestLink.href = newHref;
      console.log('🔄 Manifest reloaded with timestamp:', newHref);
    }
    
    // Force reload favicon
    const faviconLink = document.querySelector('link[rel="icon"]');
    if (faviconLink) {
      const newHref = faviconLink.href.split('?')[0] + '?v=' + Date.now();
      faviconLink.href = newHref;
      console.log('🔄 Favicon reloaded with timestamp:', newHref);
    }
    
    // Clear any cached icons
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister().then(() => {
            console.log('🗑️ Service worker unregistered, will re-register with new manifest');
            location.reload();
          });
        });
      });
    }
  }
  
  init() {
    // Set a timeout to prevent infinite loading
    this.initTimeout = setTimeout(() => {
      console.warn('⚠️ Mobile app initialization timeout, showing auth modal');
      this.hideLoading();
      this.showAuthModal();
    }, 10000); // 10 seconds timeout
    
    // Additional fallback to hide loading after shorter timeout
    this.loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Force hiding loading screen after 5 seconds');
      this.hideLoading();
      // Force show main app if it's still hidden
      const mainApp = document.getElementById('main-app');
      if (mainApp && mainApp.classList.contains('hidden')) {
        console.warn('⚠️ Force showing main app after timeout');
        mainApp.classList.remove('hidden');
        document.getElementById('auth-modal').classList.add('hidden');
      }
    }, 5000); // 5 seconds timeout for loading screen
  }

  async init() {
    try {
      console.log('📱 Starting mobile app initialization...');
      
      // Show loading screen
      this.showLoading();
      
      // Initialize authentication
      console.log('📱 Step 1: Initializing authentication...');
      await this.initAuth();
      
      // Check if user is already authenticated
      console.log('📱 Step 2: Checking authentication status...');
      const isAuthenticated = await this.checkAuthStatus();
      console.log('📱 Authentication status:', isAuthenticated);
      
      if (isAuthenticated) {
        console.log('📱 Step 3: User authenticated, loading app...');
        await this.loadApp();
      } else {
        console.log('📱 Step 3: User not authenticated, showing auth modal...');
        this.showAuthModal();
      }
      
      // Setup event listeners
      console.log('📱 Step 4: Setting up event listeners...');
      this.setupEventListeners();
      
      console.log('✅ Mobile app initialization complete');
      
      // Clear timeouts since initialization completed
      if (this.initTimeout) {
        clearTimeout(this.initTimeout);
        this.initTimeout = null;
      }
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
        this.loadingTimeout = null;
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize mobile app:', error);
      this.hideLoading();
      this.showError('Failed to initialize app. Please refresh and try again.');
      
      // Clear timeouts
      if (this.initTimeout) {
        clearTimeout(this.initTimeout);
        this.initTimeout = null;
      }
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
        this.loadingTimeout = null;
      }
    }
  }

  showLoading() {
    document.getElementById('loading-screen').classList.remove('hidden');
  }

  hideLoading() {
    console.log('📱 Hiding loading screen...');
    document.getElementById('loading-screen').classList.add('hidden');
    console.log('📱 Loading screen hidden, main app should be visible now');
  }

  async initAuth() {
    console.log('🔐 Initializing authentication...');
    
    // Wait a bit for Google Sign-In script to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Initialize Google Auth if available
    if (window.google && google.accounts && google.accounts.id) {
      try {
        // Get Google Client ID from environment variable or meta tag
        const clientId = window.GOOGLE_CLIENT_ID || 
                        document.querySelector('meta[name="google-client-id"]')?.content ||
                        '314381672297-eu9jidtaeil3404mbfv11031jncugv8q.apps.googleusercontent.com';
        
        google.accounts.id.initialize({
          client_id: clientId,
          callback: this.handleGoogleCallback.bind(this),
          auto_select: false,
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: true
        });
        
        // Render Google Sign-In button
        const googleButton = document.getElementById('google-signin-button');
        if (googleButton) {
          google.accounts.id.renderButton(googleButton, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: 280,
            locale: 'en'
          });
          
          // Ensure button is centered
          const buttonElement = googleButton.querySelector('div[role="button"]');
          if (buttonElement) {
            buttonElement.style.margin = '0 auto';
          }
          console.log('✅ Google Sign-In button rendered');
        }
        
        console.log('✅ Google Auth initialized');
      } catch (error) {
        console.error('❌ Google Auth initialization failed:', error);
        this.showGoogleFallback();
      }
    } else {
      console.warn('⚠️ Google Sign-In script not loaded, hiding Google Sign-In');
      this.showGoogleFallback();
    }
  }

  showGoogleFallback() {
    console.log('⚠️ Google Sign-In not available, hiding button');
    const fallbackDiv = document.getElementById('google-signin-fallback');
    const mainButton = document.getElementById('google-signin-button');
    
    if (mainButton) {
      mainButton.style.display = 'none';
    }
    
    // Don't show the fallback message, just hide the button
    if (fallbackDiv) {
      fallbackDiv.classList.add('hidden');
    }
  }

  async handleGoogleCallback(response) {
    console.log('🔐 Handling Google auth callback...');
    
    try {
      const result = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: response.credential
        })
      });

      const data = await result.json();
      console.log('📱 Google auth response:', data);

      if (result.ok && data.user && data.token) {
        // Store user session exactly like desktop version
        await this.setUserSession(data.user, data.token);
        
        console.log('✅ Google authentication successful');
        await this.loadApp();
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('❌ Google authentication failed:', error);
      this.showAuthError(error.message || 'Google authentication failed');
    }
  }

  async setUserSession(user, token) {
    // Set currentUser property (same as desktop)
    this.currentUser = user;
    
    // Store session exactly like desktop version
    localStorage.setItem('think_cnap_token', token);
    localStorage.setItem('think_cnap_user', JSON.stringify(user));
    
    // Also store in mobile-compatible keys for backwards compatibility
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
    
    console.log('✅ User session set for:', user.email);
    console.log('📱 User ID:', user.id);
  }

  async checkAuthStatus() {
    // Check both token keys for compatibility
    const token = localStorage.getItem('think_cnap_token') || localStorage.getItem('access_token');
    if (!token) {
      console.log('📱 No access token found');
      return false;
    }
    
    try {
      // For authenticated users, verify we have user data and restore currentUser
      const userData = localStorage.getItem('think_cnap_user') || localStorage.getItem('user_data');
      if (!userData) {
        console.log('📱 Token found but no user data - clearing session');
        this.clearAuthSession();
        return false;
      }
      
      // Restore currentUser from localStorage (same as desktop)
      this.currentUser = JSON.parse(userData);
      console.log('📱 Restored currentUser:', this.currentUser.email);
      
      // Optionally verify token with server (but don't fail if offline)
      try {
        console.log('📱 Verifying access token...');
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.log('📱 Token verification failed, clearing session');
          this.clearAuthSession();
          return false;
        }
      } catch (verifyError) {
        console.warn('📱 Token verification failed (offline?), continuing with cached session');
      }
      
      console.log('📱 Authenticated user session found');
      return true;
    } catch (error) {
      console.error('❌ Auth status check failed:', error);
      this.clearAuthSession();
      return false;
    }
  }

  clearAuthSession() {
    // Clear currentUser property (same as desktop)
    this.currentUser = null;
    
    // Destroy all charts before clearing session
    this.destroyAllCharts();
    
    // Clear all authentication-related data
    localStorage.removeItem('think_cnap_token');
    localStorage.removeItem('think_cnap_user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
  }

  async loadApp() {
    console.log('📱 Loading mobile app...');
    
    try {
      console.log('📱 Step 1: Destroying existing charts and hiding auth modal');
      // Destroy any existing charts before loading new ones
      this.destroyAllCharts();
      
      // Hide auth modal and show main app
      document.getElementById('auth-modal').classList.add('hidden');
      document.getElementById('main-app').classList.remove('hidden');
      console.log('📱 Main app should now be visible with header');
      
      console.log('📱 Step 2: Loading configuration and scoring data');
      // Load configuration and scoring data
      await this.loadConfigAndScoring();
      
      console.log('📱 Step 3: Setting up chart carousel');
      // Setup chart carousel
      this.setupChartCarousel();
      
      console.log('📱 Step 4: Initializing charts');
      // Initialize charts
      this.initializeCharts();
      
      console.log('📱 Step 5: Updating UI components');
      // Update UI
      this.updateUserInfo();
      this.updateTagSelection();
      
      console.log('📱 Step 6: Hiding loading screen');
      // Hide loading screen
      this.hideLoading();
      
      console.log('✅ Mobile app loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to load app:', error);
      console.error('❌ Error details:', error.stack);
      
      // Hide loading screen on error
      this.hideLoading();
      
      // Don't automatically logout - show error while keeping user logged in
      // Only show auth modal if it's actually an auth issue
      if (error.message && (error.message.includes('Unauthorized') || error.message.includes('401'))) {
        console.log('📱 Authentication error, clearing session and showing auth modal');
        this.clearAuthSession();
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('auth-modal').classList.remove('hidden');
        this.showAuthError('Session expired. Please sign in again.');
      } else {
        console.log('📱 Data loading error, keeping user logged in and showing error');
        // Show main app but with an error message
        document.getElementById('auth-modal').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        
        // Show error in the main app instead of auth modal
        this.showMainAppError('Failed to load some data. Some features may not work properly.');
      }
    }
  }

  async loadConfigAndScoring() {
    console.log('📊 Loading configuration and scoring data...');
    
    try {
      // Load controls from database API (same as desktop)
      console.log('📱 Loading controls from /api/controls...');
      
      const controlsResponse = await fetch('/api/controls');
      if (!controlsResponse.ok) {
        throw new Error(`Failed to fetch controls: ${controlsResponse.status}`);
      }
      
      this.config = await controlsResponse.json();
      console.log('📱 Controls loaded:', this.config);
      
      // Load user-specific scoring data using the same logic as desktop
      console.log('📱 Loading user scoring data...');
      this.scoring = await this.loadUserScoring();
      
      // Merge scoring data with controls (same as desktop)
      console.log('📱 About to merge scoring data with controls...');
      this.mergeControlsWithScoring(this.scoring);
      
      console.log('✅ Configuration and scoring loaded');
      
    } catch (error) {
      console.error('❌ Failed to load config/scoring:', error);
      throw error;
    }
  }


  async loadUserScoring() {
    // Use this.currentUser exactly like desktop version
    if (!this.currentUser) {
      console.log('📱 No currentUser found, returning empty measures');
      return { measures: {} };
    }

    console.log('📱 Loading scoring for user:', this.currentUser.email);

    // Registered users use database (same as desktop)
    try {
      console.log('📱 Loading user-specific scoring for authenticated user...');
      const token = localStorage.getItem('think_cnap_token');
      const response = await fetch(`/api/user/${this.currentUser.id}/scoring`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        return { measures: {} };
      }
    } catch (error) {
      console.error('❌ Error loading user scoring:', error);
      return { measures: {} };
    }
  }

  getCurrentUserId() {
    // Try to extract user ID from stored user data (same as desktop)
    try {
      // First try the desktop-compatible key
      const userData = localStorage.getItem('think_cnap_user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id;
      }
      
      // Fallback to mobile key
      const mobileUserData = localStorage.getItem('user_data');
      if (mobileUserData) {
        const user = JSON.parse(mobileUserData);
        return user.id;
      }
      
      console.log('📱 No user data found for ID extraction');
      return null;
    } catch (error) {
      console.error('❌ Error getting user ID:', error);
      return null;
    }
  }

  mergeControlsWithScoring(scoringData) {
    console.log('📱 Merging controls with scoring data...');
    console.log('📊 Scoring data structure sample:', Object.keys(scoringData.measures || {}).slice(0, 2).map(key => ({
      [key]: scoringData.measures[key]
    })));
    
    if (!this.config?.security_domains) {
      console.error('❌ No security domains found');
      return;
    }
    
    if (!scoringData?.measures) {
      console.log('📱 No scoring data to merge - will set all measures to undefined');
      scoringData = { measures: {} };
    }
    
    console.log('📱 Merging scoring for', Object.keys(scoringData.measures).length, 'measures');
    
    // Apply scoring to action items (same as desktop)
    this.config.security_domains.forEach(domain => {
      domain.security_controls?.forEach(control => {
        control.action_items?.forEach(actionItem => {
          const measureId = actionItem.measure_id;
          const scoring = scoringData.measures?.[measureId];
          
          if (scoring) {
            // Apply scoring data
            actionItem.impact = scoring.impact || actionItem.impact || 'undefined';
            actionItem.effort = scoring.effort || actionItem.effort || 'undefined';
            
            // Authenticated users: use scoring data or 'undefined' string
            actionItem.initial_maturity = scoring.initial_maturity !== undefined ? scoring.initial_maturity : 'undefined';
            actionItem.present_maturity = scoring.present_maturity !== undefined ? scoring.present_maturity : 'undefined';
            actionItem.desired_maturity = scoring.desired_maturity !== undefined ? scoring.desired_maturity : 'undefined';
            
            console.log(`📱 Applied scoring for ${measureId}:`, {
              impact: actionItem.impact,
              effort: actionItem.effort,
              initial_maturity: actionItem.initial_maturity,
              present_maturity: actionItem.present_maturity,
              desired_maturity: actionItem.desired_maturity,
              scoringData: scoring
            });
          } else {
            // Default values if no scoring found
            actionItem.impact = actionItem.impact || 'undefined';
            actionItem.effort = actionItem.effort || 'undefined';
            
            // Authenticated users: set to 'undefined' string
            actionItem.initial_maturity = 'undefined';
            actionItem.present_maturity = 'undefined';
            actionItem.desired_maturity = 'undefined';
          }
        });
      });
    });
    
    console.log('✅ Scoring data merged with controls');
  }

  setupChartCarousel() {
    console.log('📱 Setting up chart carousel...');
    
    const carousel = document.getElementById('chart-carousel');
    
    // Touch event handlers
    carousel.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    carousel.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    carousel.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    
    // Update initial slide
    this.updateCarouselPosition();
    
    console.log('✅ Chart carousel setup complete');
  }

  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.isDragging = true;
    
    // Remove transition during drag
    const carousel = document.getElementById('chart-carousel');
    carousel.style.transition = 'none';
    
    // Show swipe indicators
    this.showSwipeIndicators();
  }

  handleTouchMove(e) {
    if (!this.isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - this.touchStartX;
    const deltaY = Math.abs(currentY - this.touchStartY);
    
    // Only handle horizontal swipes (prevent vertical scroll interference)
    // Be more conservative about preventing default to allow scrolling
    if (deltaY < 30 && Math.abs(deltaX) > 20) {
      e.preventDefault();
      
      const carousel = document.getElementById('chart-carousel');
      const slideWidth = carousel.offsetWidth;
      const dragPercentage = (deltaX / slideWidth) * 100;
      const translateX = -this.currentSlide * 100 + dragPercentage;
      
      // Apply drag transform with bounds
      const maxSlide = this.getActiveSlideCount() - 1;
      const boundedTranslateX = Math.max(Math.min(translateX, 0), -maxSlide * 100);
      
      carousel.style.transform = `translateX(${boundedTranslateX}%)`;
      
      // Update swipe indicators
      this.updateSwipeIndicators(deltaX);
    }
  }

  handleTouchEnd(e) {
    if (!this.isDragging) return;
    
    const carousel = document.getElementById('chart-carousel');
    const deltaX = e.changedTouches[0].clientX - this.touchStartX;
    const threshold = carousel.offsetWidth * 0.25; // 25% threshold
    
    // Restore transition
    carousel.style.transition = 'transform 0.3s ease-out';
    
    // Determine slide change
    const maxSlide = this.getActiveSlideCount() - 1;
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && this.currentSlide > 0) {
        // Swipe right - previous slide
        this.currentSlide--;
      } else if (deltaX < 0 && this.currentSlide < maxSlide) {
        // Swipe left - next slide
        this.currentSlide++;
      }
    }
    
    // Update position and cleanup
    this.updateCarouselPosition();
    this.hideSwipeIndicators();
    this.isDragging = false;
  }

  showSwipeIndicators() {
    const leftIndicator = document.getElementById('swipe-left');
    const rightIndicator = document.getElementById('swipe-right');
    
    if (this.currentSlide > 0) {
      leftIndicator.style.opacity = '0.7';
    }
    
    if (this.currentSlide < this.getActiveSlideCount() - 1) {
      rightIndicator.style.opacity = '0.7';
    }
  }

  updateSwipeIndicators(deltaX) {
    const leftIndicator = document.getElementById('swipe-left');
    const rightIndicator = document.getElementById('swipe-right');
    
    // Highlight direction of swipe
    if (deltaX > 50) {
      leftIndicator.style.opacity = '1';
      rightIndicator.style.opacity = '0.3';
    } else if (deltaX < -50) {
      rightIndicator.style.opacity = '1';
      leftIndicator.style.opacity = '0.3';
    }
  }

  hideSwipeIndicators() {
    document.getElementById('swipe-left').style.opacity = '0';
    document.getElementById('swipe-right').style.opacity = '0';
  }

  goToSlide(slideIndex) {
    const maxSlide = this.getActiveSlideCount() - 1;
    this.currentSlide = Math.max(0, Math.min(slideIndex, maxSlide));
    this.updateCarouselPosition();
  }

  updateCarouselPosition() {
    const carousel = document.getElementById('chart-carousel');
    
    // Update carousel transform
    const translateX = -this.currentSlide * 100;
    carousel.style.transform = `translateX(${translateX}%)`;
    
    // Update slide visibility for performance
    this.updateSlideVisibility();
  }

  updateSlideVisibility() {
    const awsSlide = document.getElementById('aws-slide');
    const kubernetesSlide = document.getElementById('kubernetes-slide');
    const aiSlide = document.getElementById('ai-slide');
    
    // Show only the selected platform slide (radio button behavior)
    const selectedPlatform = this.selectedTags[0];
    
    if (selectedPlatform === 'aws') {
      awsSlide.style.display = 'flex';
      kubernetesSlide.style.display = 'none';
      aiSlide.style.display = 'none';
    } else if (selectedPlatform === 'kubernetes') {
      awsSlide.style.display = 'none';
      kubernetesSlide.style.display = 'flex';
      aiSlide.style.display = 'none';
    } else if (selectedPlatform === 'ai') {
      awsSlide.style.display = 'none';
      kubernetesSlide.style.display = 'none';
      aiSlide.style.display = 'flex';
    }
  }

  getActiveSlideCount() {
    // With radio buttons, only one platform is selected at a time
    return 1;
  }

  checkAndShowUndefinedScores() {
    console.log('🔍 Checking for undefined measures...');
    
    if (!this.scoring || !this.scoring.measures) {
      console.log('📊 No scoring data available');
      this.hideUndefinedScoresWarning();
      return;
    }

    let hasUndefinedScores = false;
    const undefinedMeasures = [];

    // Check all measures for undefined maturity values (-1)
    for (const [measureId, measureData] of Object.entries(this.scoring.measures)) {
      if (measureData) {
        const hasUndefinedMaturity = 
          measureData.initial_maturity === -1 || 
          measureData.present_maturity === -1 || 
          measureData.desired_maturity === -1;
        
        if (hasUndefinedMaturity) {
          hasUndefinedScores = true;
          undefinedMeasures.push(measureId);
        }
      }
    }

    console.log('🔍 Undefined scores check:', {
      hasUndefinedScores,
      undefinedMeasuresCount: undefinedMeasures.length,
      undefinedMeasures: undefinedMeasures.slice(0, 5) // Show first 5 for debugging
    });

    if (hasUndefinedScores) {
      this.showUndefinedScoresWarning(undefinedMeasures.length);
    } else {
      this.hideUndefinedScoresWarning();
    }
  }

  showUndefinedScoresWarning(count) {
    console.log(`⚠️ Showing undefined measures warning for ${count} measures`);
    
    // Remove existing warning if any
    this.hideUndefinedScoresWarning();
    
    // Create warning element
    const warningElement = document.createElement('div');
    warningElement.id = 'undefined-scores-warning';
    warningElement.className = 'bg-yellow-900 border border-yellow-600 text-yellow-200 px-4 py-3 mx-4 mb-4 rounded-lg flex items-center space-x-2';
    warningElement.innerHTML = `
      <svg class="w-5 h-5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>
      <span class="text-sm font-medium">⚠️ Not Applicable scores</span>
      <span class="text-xs text-yellow-300">(${count} measure${count !== 1 ? 's' : ''} excluded from assessment)</span>
    `;
    
    // Insert warning after tag selection section
    const tagSelection = document.querySelector('.tag-selection-section');
    if (tagSelection) {
      tagSelection.insertAdjacentElement('afterend', warningElement);
    }
  }

  hideUndefinedScoresWarning() {
    const existingWarning = document.getElementById('undefined-scores-warning');
    if (existingWarning) {
      existingWarning.remove();
    }
  }

  isMeasureForSelectedPlatform(measure) {
    // Use the tags field from the database (same as desktop app)
    const measureTag = measure.tags;
    
    if (!measureTag) {
      console.log(`📱 Measure ${measure.measure_id} has no tags, excluding it`);
      return false;
    }
    
    // Check if the measure belongs to any of the selected platforms
    const isForSelectedPlatform = this.selectedTags.includes(measureTag);
    console.log(`📱 Platform filtering: ${measure.measure_id} -> ${measureTag}, selectedTags: [${this.selectedTags.join(', ')}], included: ${isForSelectedPlatform}`);
    return isForSelectedPlatform;
  }

  // Helper function to check if a measure has undefined values
  hasUndefinedValues(measureId) {
    // For authenticated users, check the scoring data structure
    const scoring = this.scoring?.measures?.[measureId];
    
    // If no scoring data exists for this measure, consider it undefined
    if (!scoring) {
      return true;
    }
    
    return scoring.initial_maturity === undefined || 
           scoring.present_maturity === undefined || 
           scoring.desired_maturity === undefined ||
           scoring.initial_maturity === 'undefined' ||
           scoring.present_maturity === 'undefined' ||
           scoring.desired_maturity === 'undefined' ||
           scoring.initial_maturity === -1 ||
           scoring.present_maturity === -1 ||
           scoring.desired_maturity === -1;
  }

  // Helper function to convert impact/effort to numeric values
  getImpactEffortValue(value) {
    if (value === 'low' || value === 1) return 1;
    if (value === 'medium' || value === 2) return 2;
    if (value === 'high' || value === 3) return 3;
    return 0; // undefined or invalid
  }

  getUndefinedMeasuresCountForDomain(domainId) {
    let undefinedCount = 0;
    
    // Get all measures for this domain
    const domain = this.config?.security_domains?.find(d => (d.id || this.config.security_domains.indexOf(d)) === domainId);
    if (!domain || !domain.security_controls) {
      return 0;
    }

    // Check all measures in all controls of this domain
    for (const control of domain.security_controls) {
      if (control.action_items) {
        for (const measure of control.action_items) {
          // Only count measures that belong to selected platform(s)
          if (!this.isMeasureForSelectedPlatform(measure)) {
            continue;
          }
          
          // Check if this measure has at least one undefined maturity field
          // For authenticated users, check the scoring data structure
          let hasUndefinedMaturity = false;
          const measureId = measure.measure_id;
          const measureData = this.scoring?.measures?.[measureId];
          
          if (measureData) {
            hasUndefinedMaturity = 
              measureData.initial_maturity === -1 || 
              measureData.present_maturity === -1 || 
              measureData.desired_maturity === -1 ||
              measureData.initial_maturity === 'undefined' || 
              measureData.present_maturity === 'undefined' || 
              measureData.desired_maturity === 'undefined';
          } else {
            // If no scoring data exists for this measure, consider it undefined
            hasUndefinedMaturity = true;
          }
          
          if (hasUndefinedMaturity) {
            undefinedCount++;
          }
        }
      }
    }

    return undefinedCount;
  }

  getUndefinedMeasuresCountForControl(controlId) {
    let undefinedCount = 0;
    
    // Find the control in all domains
    for (const domain of this.config?.security_domains || []) {
      if (domain.security_controls) {
        const control = domain.security_controls.find(c => 
          c.id === controlId || 
          c.control_id === controlId || 
          c.code === controlId
        );
        
        if (control && control.action_items) {
          // Check all measures in this control
          for (const measure of control.action_items) {
            // Only count measures that belong to selected platform(s)
            if (!this.isMeasureForSelectedPlatform(measure)) {
              continue;
            }
            
            // Check if this measure has at least one undefined maturity field
            // For authenticated users, check the scoring data structure
            let hasUndefinedMaturity = false;
            const measureId = measure.measure_id;
            const measureData = this.scoring?.measures?.[measureId];
            
            if (measureData) {
              hasUndefinedMaturity = 
                measureData.initial_maturity === -1 || 
                measureData.present_maturity === -1 || 
                measureData.desired_maturity === -1 ||
                measureData.initial_maturity === 'undefined' || 
                measureData.present_maturity === 'undefined' || 
                measureData.desired_maturity === 'undefined';
            } else {
              // If no scoring data exists for this measure, consider it undefined
              hasUndefinedMaturity = true;
            }
            
            if (hasUndefinedMaturity) {
              undefinedCount++;
            }
          }
          break; // Found the control, no need to continue searching
        }
      }
    }

    return undefinedCount;
  }

  updateChartData() {
    console.log('📊 Updating chart data...');
    
    // Only one platform can be selected at a time (radio button behavior)
    const selectedPlatform = this.selectedTags[0]; // Get the single selected platform
    
    if (selectedPlatform && this.charts[selectedPlatform]) {
      const chartData = this.getChartData(selectedPlatform);
      if (chartData) {
        this.charts[selectedPlatform].data = chartData;
        this.charts[selectedPlatform].update();
        console.log(`📊 Updated chart data for ${selectedPlatform}`);
      }
    }
  }

  initializeCharts() {
    console.log('📊 Initializing mobile charts...');
    
    // Debug chart carousel container
    const chartCarouselContainer = document.getElementById('chart-carousel-container');
    const chartCarousel = document.getElementById('chart-carousel');
    console.log('📊 Chart carousel container debug:', {
      container: {
        element: chartCarouselContainer,
        className: chartCarouselContainer?.className,
        style: chartCarouselContainer?.style.cssText,
        clientWidth: chartCarouselContainer?.clientWidth,
        clientHeight: chartCarouselContainer?.clientHeight,
        offsetWidth: chartCarouselContainer?.offsetWidth,
        offsetHeight: chartCarouselContainer?.offsetHeight,
        boundingRect: chartCarouselContainer?.getBoundingClientRect()
      },
      carousel: {
        element: chartCarousel,
        className: chartCarousel?.className,
        style: chartCarousel?.style.cssText,
        clientWidth: chartCarousel?.clientWidth,
        clientHeight: chartCarousel?.clientHeight,
        offsetWidth: chartCarousel?.offsetWidth,
        offsetHeight: chartCarousel?.offsetHeight,
        boundingRect: chartCarousel?.getBoundingClientRect()
      }
    });
    
    // Destroy all existing charts first
    this.destroyAllCharts();
    
    // Only one platform can be selected at a time (radio button behavior)
    const selectedPlatform = this.selectedTags[0]; // Get the single selected platform
    
    if (selectedPlatform === 'aws') {
      this.updateChartTitles('AWS', 'AWS', 'AI');
      this.initializeChart('aws');
    } else if (selectedPlatform === 'kubernetes') {
      this.updateChartTitles('Kubernetes', 'Kubernetes', 'AI');
      this.initializeChart('kubernetes');
    } else if (selectedPlatform === 'ai') {
      this.updateChartTitles('AI', 'AI', 'AI');
      this.initializeChart('ai');
    }
    
    console.log('✅ Mobile charts initialized');
  }

  updateChartTitles(awsTitle, kubernetesTitle, aiTitle) {
    // Update AWS chart title
    const awsTitleElement = document.querySelector('#aws-slide h3');
    if (awsTitleElement) {
      awsTitleElement.textContent = awsTitle;
    }
    
    // Update Kubernetes chart title
    const kubernetesTitleElement = document.querySelector('#kubernetes-slide h3');
    if (kubernetesTitleElement) {
      kubernetesTitleElement.textContent = kubernetesTitle;
    }
    
    // Update AI chart title
    const aiTitleElement = document.querySelector('#ai-slide h3');
    if (aiTitleElement) {
      aiTitleElement.textContent = aiTitle;
    }
  }

  destroyAllCharts() {
    console.log('📊 Destroying all existing charts...');
    Object.keys(this.charts).forEach(platform => {
      if (this.charts[platform]) {
        this.charts[platform].destroy();
        this.charts[platform] = null;
      }
      
      // Clean up custom labels
      const chartContainer = document.querySelector(`#${platform}-slide .relative`);
      if (chartContainer) {
        const customLabels = chartContainer.querySelectorAll('.custom-axis-label, .custom-labels-container');
        customLabels.forEach(label => label.remove());
      }
    });
    this.charts = {};
  }

  initializeChart(platform) {
    // For combined chart, use the AWS canvas as the primary canvas
    const canvasId = platform === 'combined' ? 'radar-aws' : `radar-${platform}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`❌ Canvas not found for ${platform} (using ${canvasId})`);
      return;
    }
    
    console.log(`📊 Canvas found for ${platform}:`, {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
      offsetWidth: canvas.offsetWidth,
      offsetHeight: canvas.offsetHeight,
      style: canvas.style.cssText,
      computedStyle: window.getComputedStyle(canvas),
      boundingRect: canvas.getBoundingClientRect()
    });
    
    // Validate canvas dimensions before proceeding
    if (canvas.width === 0 || canvas.height === 0) {
      console.warn(`⚠️ Canvas has zero dimensions for ${platform}, waiting for proper sizing...`);
      
      // Wait for the next frame and retry
      requestAnimationFrame(() => {
        if (canvas.width > 0 && canvas.height > 0) {
          console.log(`📊 Canvas properly sized on retry for ${platform}, proceeding...`);
          this.initializeChart(platform);
        } else {
          console.error(`❌ Canvas still has zero dimensions for ${platform}, skipping chart creation`);
        }
      });
      return;
    }
    
    // Check if canvas is visible and properly sized
    const computedStyle = window.getComputedStyle(canvas);
    const isVisible = computedStyle.display !== 'none' && 
                     computedStyle.visibility !== 'hidden' && 
                     canvas.offsetWidth > 0 && 
                     canvas.offsetHeight > 0;
    
    if (!isVisible) {
      console.warn(`⚠️ Canvas is not visible for ${platform}, skipping chart creation`);
      return;
    }
    
    // Check parent container dimensions
    const parentDiv = canvas.parentElement;
    console.log(`📊 Parent container for ${platform}:`, {
      tagName: parentDiv.tagName,
      className: parentDiv.className,
      style: parentDiv.style.cssText,
      clientWidth: parentDiv.clientWidth,
      clientHeight: parentDiv.clientHeight,
      offsetWidth: parentDiv.offsetWidth,
      offsetHeight: parentDiv.offsetHeight,
      boundingRect: parentDiv.getBoundingClientRect()
    });
    
    // Check chart slide container
    const chartSlide = canvas.closest('.chart-slide');
    if (chartSlide) {
      console.log(`📊 Chart slide container for ${platform}:`, {
        className: chartSlide.className,
        style: chartSlide.style.cssText,
        clientWidth: chartSlide.clientWidth,
        clientHeight: chartSlide.clientHeight,
        offsetWidth: chartSlide.offsetWidth,
        offsetHeight: chartSlide.offsetHeight,
        boundingRect: chartSlide.getBoundingClientRect()
      });
    }
    
    // Destroy existing chart if it exists
    if (this.charts[platform]) {
      console.log(`📊 Destroying existing ${platform} chart`);
      this.charts[platform].destroy();
      this.charts[platform] = null;
    }
    
    const ctx = canvas.getContext('2d');
    console.log(`📊 Canvas context for ${platform}:`, ctx);
    
    // Ensure canvas has proper dimensions
    const containerWidth = parentDiv.clientWidth;
    const containerHeight = parentDiv.clientHeight;
    console.log(`📊 Container dimensions for ${platform}:`, { containerWidth, containerHeight });
    
    // Set canvas internal dimensions to match container
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    console.log(`📊 Canvas dimensions set for ${platform}:`, { width: canvas.width, height: canvas.height });
    
    // Get filtered data for this platform
    const chartData = this.getChartData(platform);
    
    console.log(`📊 Chart data for ${platform}:`, chartData);
    
    if (!chartData || chartData.labels.length === 0) {
      console.warn(`⚠️ No data available for ${platform} chart`);
      return;
    }

    // Calculate responsive scaling based on screen size
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isSmallScreen = screenWidth < 400;
    const isVerySmallScreen = screenWidth < 350;
    
    // 90vw chart with 2.5vw font size
    const baseFontSize = Math.max(4, Math.floor(window.innerWidth * 0.025)); // 2.5vw equivalent
    const titleFontSize = 1;
    const labelMaxWidth = Math.max(45, Math.floor(window.innerWidth * 0.22)); // 22vw equivalent
    
    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
      console.error('❌ Chart.js is not loaded!');
      return;
    }
    
    console.log(`📊 Chart.js version:`, Chart.version);
    console.log(`📊 Creating Chart.js instance for ${platform} with data:`, chartData);
    
    try {
      this.charts[platform] = new Chart(ctx, {
      type: 'radar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 5,
            bottom: 5,
            left: 5,
            right: 5
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 3,
            min: 0,
            ticks: {
              display: true, // Show only 1, 2, 3
              stepSize: 0.5,
              callback: function(value) {
                // Only show whole numbers 1, 2, 3
                return value === 1 || value === 2 || value === 3 ? value : '';
              },
              font: {
                size: 12,
                weight: 'bold'
              },
              color: function(context) {
                // Set text color based on whether tick is empty
                const value = context.tick.value;
                return value === 1 || value === 2 || value === 3 ? '#9CA3AF' : 'transparent';
              },
              backdropColor: function(context) {
                // Make empty ticks transparent, gray background for values
                const value = context.tick.value;
                return value === 1 || value === 2 || value === 3 ? '#374151' : 'transparent';
              },
              backdropPadding: 2,            // Add padding around background
              z: 1                           // Controls layering
            },
            grid: {
              color: '#374151',  // Same color for all grid lines
              lineWidth: 1       // Same width for all grid lines
            },
            angleLines: {
              color: '#374151'
            },
            pointLabels: {
              display: false // Hide default labels
            }
          }
        },
        plugins: {
          legend: {
            display: false // We'll create custom legend
          },
          tooltip: {
            backgroundColor: '#1F2937',
            titleColor: '#22D3EE',
            bodyColor: '#E5E7EB',
            borderColor: '#374151',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true
          }
        },
        elements: {
          line: {
            borderWidth: 2
          },
          point: {
            radius: 4,
            hoverRadius: 6
          }
        }
      }
    });
    
    console.log(`📊 Chart.js instance created for ${platform}:`, this.charts[platform]);
    } catch (error) {
      console.error(`❌ Error creating chart for ${platform}:`, error);
      return;
    }
    console.log(`📊 Chart.js options:`, this.charts[platform].options);
    console.log(`📊 Chart.js data:`, this.charts[platform].data);
    
    // Check if chart is actually rendered
    setTimeout(() => {
      console.log(`📊 Chart.js render check for ${platform}:`, {
        chartExists: !!this.charts[platform],
        chartDestroyed: this.charts[platform]?.destroyed,
        chartData: this.charts[platform]?.data,
        chartOptions: this.charts[platform]?.options
      });
    }, 50);
    
    // Create custom legend
    this.createCustomLegend(platform, chartData);
    
    // Create custom axis labels with a small delay to ensure chart is fully rendered
    setTimeout(() => {
      this.createCustomAxisLabels(platform, chartData, baseFontSize, labelMaxWidth);
    }, 100);
    
    console.log(`✅ ${platform.toUpperCase()} chart initialized`);
    console.log(`📊 Chart instance:`, this.charts[platform]);
    console.log(`📊 Chart canvas after creation:`, {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
      offsetWidth: canvas.offsetWidth,
      offsetHeight: canvas.offsetHeight,
      boundingRect: canvas.getBoundingClientRect()
    });
    
    // Check if chart is actually visible
    setTimeout(() => {
      console.log(`📊 Chart visibility check for ${platform} after 500ms:`, {
        canvasVisible: canvas.offsetWidth > 0 && canvas.offsetHeight > 0,
        canvasBoundingRect: canvas.getBoundingClientRect(),
        parentBoundingRect: parentDiv.getBoundingClientRect(),
        chartSlideBoundingRect: chartSlide?.getBoundingClientRect(),
        chartCarouselContainer: document.getElementById('chart-carousel-container')?.getBoundingClientRect()
      });
      
      // Check CSS computed styles that might affect visibility
      const computedStyle = window.getComputedStyle(canvas);
      console.log(`📊 Canvas computed styles for ${platform}:`, {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        position: computedStyle.position,
        zIndex: computedStyle.zIndex,
        overflow: computedStyle.overflow,
        width: computedStyle.width,
        height: computedStyle.height,
        maxWidth: computedStyle.maxWidth,
        maxHeight: computedStyle.maxHeight,
        transform: computedStyle.transform
      });
      
      // Check if canvas is actually painted (only if canvas has valid dimensions)
      const ctx = canvas.getContext('2d');
      let hasContent = false;
      
      if (canvas.width > 0 && canvas.height > 0) {
        try {
          const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 10), Math.min(canvas.height, 10));
          hasContent = Array.from(imageData.data).some(pixel => pixel !== 0);
        } catch (error) {
          console.warn(`⚠️ Canvas paint check failed for ${platform}:`, error.message);
          hasContent = false;
        }
      } else {
        console.warn(`⚠️ Canvas has invalid dimensions for ${platform}:`, {
          width: canvas.width,
          height: canvas.height
        });
      }
      
      console.log(`📊 Canvas paint check for ${platform}:`, {
        hasContent: hasContent,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });
      
      // Check if chart has any data points
      if (this.charts[platform] && this.charts[platform].data) {
        console.log(`📊 Chart data points for ${platform}:`, {
          datasets: this.charts[platform].data.datasets.map(d => ({
            label: d.label,
            dataLength: d.data.length,
            data: d.data
          })),
          labels: this.charts[platform].data.labels
        });
      }
    }, 500);
  }

  getChartData(platform) {
    console.log(`📊 Getting chart data for ${platform}, config:`, this.config);
    if (!this.config || !this.config.security_domains) {
      console.warn(`⚠️ No config or security_domains for ${platform}`);
      return null;
    }
    
    const domains = this.config.security_domains;
    const labels = [];
    const datasets = [];
    
    // Filter domains that have measures for the selected platform(s)
    const filteredDomains = domains.filter(domain => {
      return domain.security_controls?.some(control =>
        control.action_items?.some(item => 
          this.isMeasureForSelectedPlatform(item)
        )
      );
    });
    
    if (filteredDomains.length === 0) {
      return null;
    }
    
    // Build labels from domain names
    filteredDomains.forEach(domain => {
      labels.push(domain.name);
    });
    
    // Build datasets (use same field names as desktop)
    const maturityTypes = [
      { key: 'initial_maturity', label: 'Initial', color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
      { key: 'present_maturity', label: 'Present', color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)' },
      { key: 'desired_maturity', label: 'Desired', color: '#22D3EE', backgroundColor: 'rgba(34, 211, 238, 0.1)' }
    ];
    
    maturityTypes.forEach(type => {
      const data = filteredDomains.map(domain => {
        // Calculate maturity for the domain using the selected platform
        return this.calculateDomainMaturity(domain, platform, type.key);
      });
      
      datasets.push({
        label: type.label,
        data: data,
        borderColor: type.color,
        backgroundColor: type.backgroundColor,
        pointBackgroundColor: type.color,
        pointBorderColor: type.color,
        pointHoverBackgroundColor: type.color,
        pointHoverBorderColor: '#FFFFFF'
      });
    });
    
    return { labels, datasets };
  }

  calculateDomainMaturity(domain, platform, maturityType) {
    if (!domain.security_controls) return 0;
    
    let weightedScore = 0;
    let totalWeight = 0;
    let definedMeasuresCount = 0;
    
    // Collect only measures where ALL maturity scores are applicable (not -1)
    const applicableMeasures = [];
    domain.security_controls.forEach(control => {
      if (!control.action_items) return;
      
      control.action_items.forEach(item => {
        if (!this.isMeasureForSelectedPlatform(item)) return;
        
        // Get impact and effort values
        const impact = this.getImpactEffortValue(item.impact);
        const effort = this.getImpactEffortValue(item.effort);
        
        // Calculate weight (impact/effort) - avoid division by zero
        const weight = effort > 0 ? impact / effort : 0;
        
        // Check if this measure has ALL scores defined AND none are "Not Applicable" (-1)
        // If ANY maturity value is -1, the entire measure is excluded from assessment
        const hasAllScoresDefined = 
          item.initial_maturity !== undefined && item.initial_maturity !== -1 && item.initial_maturity !== 'undefined' &&
          item.present_maturity !== undefined && item.present_maturity !== -1 && item.present_maturity !== 'undefined' &&
          item.desired_maturity !== undefined && item.desired_maturity !== -1 && item.desired_maturity !== 'undefined';
        
        // Only include measures that are fully applicable
        if (hasAllScoresDefined) {
          applicableMeasures.push({
          item,
          weight,
          impact,
          effort
        });
        }
      });
    });
    
    // Calculate total weight ONLY from applicable measures
    applicableMeasures.forEach(measure => {
      totalWeight += measure.weight;
    });
    
    // Calculate weighted maturity from applicable measures
    applicableMeasures.forEach(measure => {
        const score = typeof measure.item[maturityType] === 'string' ? 
          parseInt(measure.item[maturityType]) : measure.item[maturityType];
        
        if (score > 0) {
          weightedScore += score * measure.weight;
          definedMeasuresCount++;
      }
    });
    
    // Return weighted average, normalized by total weight of applicable measures only
    return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 10) / 10 : 0;
  }

  calculateDomainMaturityForAllPlatforms(domain, maturityType) {
    if (!domain.security_controls) return 0;
    
    let weightedScore = 0;
    let totalWeight = 0;
    let definedMeasuresCount = 0;
    
    // Collect only measures where ALL maturity scores are applicable (not -1)
    const applicableMeasures = [];
    domain.security_controls.forEach(control => {
      if (!control.action_items) return;
      
      control.action_items.forEach(item => {
        // Only include measures for selected platforms
        if (!this.isMeasureForSelectedPlatform(item)) return;
        
        // Get impact and effort values
        const impact = this.getImpactEffortValue(item.impact);
        const effort = this.getImpactEffortValue(item.effort);
        
        // Calculate weight (impact/effort) - avoid division by zero
        const weight = effort > 0 ? impact / effort : 0;
        
        // Check if this measure has ALL scores defined AND none are "Not Applicable" (-1)
        // If ANY maturity value is -1, the entire measure is excluded from assessment
        const hasAllScoresDefined = 
          item.initial_maturity !== undefined && item.initial_maturity !== -1 && item.initial_maturity !== 'undefined' &&
          item.present_maturity !== undefined && item.present_maturity !== -1 && item.present_maturity !== 'undefined' &&
          item.desired_maturity !== undefined && item.desired_maturity !== -1 && item.desired_maturity !== 'undefined';
        
        // Only include measures that are fully applicable
        if (hasAllScoresDefined) {
          applicableMeasures.push({
          item,
          weight,
          impact,
          effort
        });
        }
      });
    });
    
    // Calculate total weight ONLY from applicable measures
    applicableMeasures.forEach(measure => {
      totalWeight += measure.weight;
    });
    
    // Calculate weighted maturity from applicable measures
    applicableMeasures.forEach(measure => {
        const score = typeof measure.item[maturityType] === 'string' ? 
          parseInt(measure.item[maturityType]) : measure.item[maturityType];
        
        if (score > 0) {
          weightedScore += score * measure.weight;
          definedMeasuresCount++;
      }
    });
    
    // Return weighted average, normalized by total weight of applicable measures only
    return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 10) / 10 : 0;
  }

  createCustomLegend(platform, chartData) {
    const legendContainer = document.getElementById(`legend-${platform}`);
    if (!legendContainer || !chartData.datasets) return;
    
    let legendHTML = '<div class="flex justify-center space-x-4">';
    
    chartData.datasets.forEach(dataset => {
      legendHTML += `
        <div class="chart-legend-item flex items-center text-gray-300">
          <div class="chart-legend-color" style="background-color: ${dataset.borderColor}"></div>
          <span class="text-xs">${dataset.label}</span>
        </div>
      `;
    });
    
    legendHTML += '</div>';
    legendContainer.innerHTML = legendHTML;
  }

  wrapTextForAxis(text, maxWidth, fontSize) {
    // Common security domain abbreviations and word breaks - max 2 lines
    const domainMappings = {
      'Identity & Access Management': 'Identity &<br>Access Management',
      'Infrastructure Protection': 'Infrastructure Protection',
      'Data Protection': 'Data<br>Protection',
      'Application Security': 'Application<br>Security',
      'Incident Response': 'Incident<br>Response',
      'Security Foundations': 'Security<br>Foundations',
      'Detection & Monitoring': 'Detection &<br>Monitoring',
      'Compliance & Governance': 'Compliance &<br>Governance'
    };
    
    // Check if we have a predefined mapping
    if (domainMappings[text]) {
      return domainMappings[text];
    }
    
    // For other text, try to break at logical points
    const words = text.split(' ');
    if (words.length <= 2) {
      return text; // Short text, no wrapping needed
    }
    
    // Try to break at logical points (after "&", "and", "of", etc.)
    const breakPoints = ['&', 'and', 'of', 'for', 'with'];
    for (const breakPoint of breakPoints) {
      const breakIndex = text.indexOf(breakPoint);
      if (breakIndex > 0 && breakIndex < text.length - 3) {
        const beforeBreak = text.substring(0, breakIndex + breakPoint.length);
        const afterBreak = text.substring(breakIndex + breakPoint.length).trim();
        return `${beforeBreak}<br>${afterBreak}`;
      }
    }
    
    // If no logical break point, break at the middle
    const midPoint = Math.floor(text.length / 2);
    const spaceIndex = text.lastIndexOf(' ', midPoint);
    if (spaceIndex > 0) {
      return `${text.substring(0, spaceIndex)}<br>${text.substring(spaceIndex + 1)}`;
    }
    
    // Fallback: break at character limit
    if (text.length > 12) {
      const breakAt = Math.floor(text.length / 2);
      return `${text.substring(0, breakAt)}<br>${text.substring(breakAt)}`;
    }
    
    return text;
  }

  createCustomAxisLabels(platform, chartData, baseFontSize = 8, labelMaxWidth = 80) {
    // Find the chart container - the div with class 'relative' that contains the canvas
    const chartContainer = document.querySelector(`#${platform}-slide .relative`);
    
    if (!chartContainer) {
      console.log(`⚠️ Chart container not found for ${platform}`);
      return;
    }
    
    if (!chartContainer || !chartData.labels) {
      console.log(`⚠️ No chart container or labels found for ${platform}`);
      console.log(`Chart container:`, chartContainer);
      console.log(`Chart data labels:`, chartData.labels);
      return;
    }
    
    console.log(`📝 Creating custom axis labels for ${platform}:`, chartData.labels);
    console.log(`Chart container found:`, chartContainer);

    // Remove existing custom labels
    const existingLabels = chartContainer.querySelectorAll('.custom-axis-label');
    existingLabels.forEach(label => label.remove());

    // Create a wrapper for custom labels
    let labelsContainer = chartContainer.querySelector('.custom-labels-container');
    if (!labelsContainer) {
      labelsContainer = document.createElement('div');
      labelsContainer.className = 'custom-labels-container absolute inset-0 pointer-events-none';
      labelsContainer.style.zIndex = '1'; // Lower z-index than chart
      chartContainer.appendChild(labelsContainer);
    }

    const labels = chartData.labels;
    const centerX = 50; // 50% from left
    const centerY = 50; // 50% from top
    const radius = 35; // Increased radius to move labels further from center

    labels.forEach((label, index) => {
      const angle = (index * 2 * Math.PI) / labels.length - Math.PI / 2; // Start from top
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const labelElement = document.createElement('div');
      labelElement.className = 'custom-axis-label absolute text-gray-300 font-medium text-center';
      labelElement.style.left = `${x}%`;
      labelElement.style.top = `${y}%`;
      labelElement.style.transform = 'translate(-50%, -50%)';
      labelElement.style.maxWidth = `${labelMaxWidth}px`;
      labelElement.style.lineHeight = '1.2';
      labelElement.style.fontSize = `${baseFontSize}px`;
      labelElement.style.zIndex = '2'; // Above container but not covering chart
      
      // Create multiline text with automatic word wrapping
      const wrappedText = this.wrapTextForAxis(label, labelMaxWidth, baseFontSize);
      console.log(`📝 Label: "${label}" -> Wrapped: "${wrappedText}"`);
      labelElement.innerHTML = wrappedText;

      labelsContainer.appendChild(labelElement);
    });
  }

  updateUserInfo() {
    console.log('📱 Updating user info display...');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    const userStatus = document.getElementById('user-status');
    const changePasswordBtn = document.getElementById('change-password-btn');
    console.log('📱 User elements found:', { userName, userEmail, userStatus, changePasswordBtn });
    
    if (userName) {
      // Show authenticated user
      const user = JSON.parse(localStorage.getItem('think_cnap_user') || '{}');
      console.log('📱 User data from localStorage:', user);
      const displayName = user.email ? user.email.split('@')[0] : 'User';
      
      console.log('📱 Setting authenticated user display:', { displayName, email: user.email });
      userName.textContent = displayName;
      if (userEmail) userEmail.textContent = user.email || 'User';
      if (userStatus) userStatus.textContent = 'Authenticated';
      
      // Show change password button for authenticated users
      if (changePasswordBtn) {
        changePasswordBtn.style.display = 'block';
        console.log('📱 Shown change password button for authenticated user');
      }
    } else {
      console.error('📱 User name element not found!');
    }
  }

  toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown-menu');
    const arrow = document.getElementById('dropdown-arrow');
    
    if (dropdown) {
      const isHidden = dropdown.classList.contains('hidden');
      
      if (isHidden) {
        dropdown.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
      } else {
        dropdown.classList.add('hidden');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
      }
    }
  }

  hideUserDropdown() {
    const dropdown = document.getElementById('user-dropdown-menu');
    const arrow = document.getElementById('dropdown-arrow');
    
    if (dropdown) {
      dropdown.classList.add('hidden');
      if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
  }

  handleClickOutside(event) {
    const dropdown = document.getElementById('user-dropdown-menu');
    const button = document.getElementById('user-dropdown-button');
    
    if (dropdown && button && 
        !dropdown.contains(event.target) && 
        !button.contains(event.target)) {
      this.hideUserDropdown();
    }
  }

  updateTagSelection() {
    const awsRadio = document.getElementById('tag-aws');
    const kubernetesRadio = document.getElementById('tag-kubernetes');
    const aiRadio = document.getElementById('tag-ai');
    
    // Temporarily disable event listeners to prevent double chart initialization
    this.isInitializing = true;
    
    // Update radio button states based on selected platform
    const selectedPlatform = this.selectedTags[0];
    if (awsRadio) awsRadio.checked = selectedPlatform === 'aws';
    if (kubernetesRadio) kubernetesRadio.checked = selectedPlatform === 'kubernetes';
    if (aiRadio) aiRadio.checked = selectedPlatform === 'ai';
    
    this.updateSlideVisibility();
    
    // Reset to first slide since we only have one active slide
    this.currentSlide = 0;
    this.updateCarouselPosition();
    
    // Re-enable event listeners
    this.isInitializing = false;
  }

  updateOverallProgress() {
    // Overall progress functionality removed
  }

  setupEventListeners() {
    console.log('📱 Setting up event listeners...');
    
    // Auth tab switching
    const signinTab = document.getElementById('signin-tab');
    const signupTab = document.getElementById('signup-tab');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    
    signinTab?.addEventListener('click', () => {
      signinTab.classList.add('bg-cyan-600', 'text-white');
      signinTab.classList.remove('text-gray-300');
      signupTab.classList.remove('bg-cyan-600', 'text-white');
      signupTab.classList.add('text-gray-300');
      signinForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
    });
    
    signupTab?.addEventListener('click', () => {
      signupTab.classList.add('bg-cyan-600', 'text-white');
      signupTab.classList.remove('text-gray-300');
      signinTab.classList.remove('bg-cyan-600', 'text-white');
      signinTab.classList.add('text-gray-300');
      signupForm.classList.remove('hidden');
      signinForm.classList.add('hidden');
    });
    
    // Auth forms
    document.getElementById('email-signin-form')?.addEventListener('submit', this.handleEmailSignin.bind(this));
    document.getElementById('email-signup-form')?.addEventListener('submit', this.handleEmailSignup.bind(this));
    
    // Tag selection
    document.getElementById('tag-aws')?.addEventListener('change', this.handleTagChange.bind(this));
    document.getElementById('tag-kubernetes')?.addEventListener('change', this.handleTagChange.bind(this));
    document.getElementById('tag-ai')?.addEventListener('change', this.handleTagChange.bind(this));
    
    // Navigation
    document.getElementById('nav-dashboard')?.addEventListener('click', () => this.showView('dashboard'));
    document.getElementById('nav-domains')?.addEventListener('click', () => this.showView('domains'));
    
    // Back navigation
    document.getElementById('back-to-domains')?.addEventListener('click', () => this.showDomainsList());
    
    // User dropdown
    document.getElementById('user-dropdown-button')?.addEventListener('click', this.toggleUserDropdown.bind(this));
    document.getElementById('change-password-btn')?.addEventListener('click', () => {
      this.hideUserDropdown();
      this.showChangePasswordModal();
    });
    
    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      this.hideUserDropdown();
      this.handleLogout();
    });
    
    // Click outside to close dropdown
    document.addEventListener('click', this.handleClickOutside.bind(this));
    
    // Window resize handler for responsive scaling
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Change password modal
    document.getElementById('change-password-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleChangePassword(e.target);
    });
    
    document.getElementById('cancel-change-password')?.addEventListener('click', () => {
      this.hideChangePasswordModal();
    });
    
    console.log('✅ Event listeners setup complete');
  }

  async handleEmailSignin(e) {
    e.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    
    if (!email || !password) {
      this.showAuthError('Please enter both email and password');
      return;
    }
    
    try {
      console.log('📧 Attempting email sign in for:', email);
      
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      console.log('📧 Email signin response:', data);
      
      if (response.ok) {
        // Handle successful signin (same as desktop)
        await this.setUserSession(data.user, data.token);
        console.log('✅ Email authentication successful');
        await this.loadApp();
      } else {
        this.showAuthError(data.error || 'Sign in failed');
      }
    } catch (error) {
      console.error('❌ Email signin failed:', error);
      this.showAuthError('Sign in failed. Please try again.');
    }
  }

  async handleEmailSignup(e) {
    e.preventDefault();
    
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    if (!email || !password) {
      this.showAuthError('Please fill in all fields');
      return;
    }
    
    if (password.length < 8) {
      this.showAuthError('Password must be at least 8 characters long');
      return;
    }
    
    try {
      console.log('📧 Attempting email sign up for:', email);
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      console.log('📧 Email signup response:', data);
      
      if (response.ok) {
        await this.setUserSession(data.user, data.token);
        console.log('✅ Email signup successful');
        this.showAuthSuccess('Registration successful! Welcome to ThinkCNAP!');
        await this.loadApp();
      } else {
        this.showAuthError(data.error || 'Sign up failed');
      }
    } catch (error) {
      console.error('❌ Email signup failed:', error);
      this.showAuthError('Sign up failed. Please try again.');
    }
  }

  handleTagChange(e) {
    const tag = e.target.value;
    const isChecked = e.target.checked;
    
    console.log('📱 Platform change event:', { tag, isChecked, currentSelectedTags: [...this.selectedTags] });
    
    // Skip if we're in the middle of initialization to prevent double chart loading
    if (this.isInitializing) {
      console.log('📱 Skipping tag change during initialization');
      return;
    }
    
    if (isChecked) {
      // Radio button selected - set only this platform
      this.selectedTags = [tag];
    } else {
      // This shouldn't happen with radio buttons, but handle gracefully
      console.log('📱 Radio button unchecked - this should not happen');
      return;
    }
    
    console.log('📱 After update - selectedTags:', [...this.selectedTags]);
    
    console.log('📱 Proceeding with UI updates...');
    
    // Update UI
    this.updateSlideVisibility();
    this.initializeCharts();
    
    // Update undefined measures warnings for domains and controls
    if (!document.getElementById('domains-view')?.classList.contains('hidden')) {
      console.log('📱 Updating domains view...');
      this.loadDomains();
    }
    if (!document.getElementById('controls-list')?.classList.contains('hidden')) {
      console.log('📱 Updating controls view...');
      this.loadControls(this.currentDomainId);
    }
    
    // Reset slide position if needed
    if (this.currentSlide >= this.getActiveSlideCount()) {
      this.currentSlide = 0;
      this.updateCarouselPosition();
    }
  }

  showView(viewName) {
    // Update navigation
    const navButtons = document.querySelectorAll('[id^="nav-"]');
    navButtons.forEach(btn => {
      btn.classList.remove('text-cyan-400');
      btn.classList.add('text-gray-400');
    });
    
    document.getElementById(`nav-${viewName}`)?.classList.remove('text-gray-400');
    document.getElementById(`nav-${viewName}`)?.classList.add('text-cyan-400');
    
    // Show/hide views - simple and clean approach
    const dashboardView = document.getElementById('dashboard-view');
    const domainsView = document.getElementById('domains-view');
    
    console.log('📱 View switching to:', viewName);
    
    // Hide all views first
    if (dashboardView) dashboardView.classList.add('hidden');
    if (domainsView) domainsView.classList.add('hidden');
    
    // Show the requested view
    if (viewName === 'dashboard' && dashboardView) {
      console.log('📱 Showing dashboard view');
      dashboardView.classList.remove('hidden');
    } else if (viewName === 'domains' && domainsView) {
      console.log('📱 Showing domains view');
      domainsView.classList.remove('hidden');
      this.showDomainsList();
      this.loadDomains();
    }
    
    console.log('📱 View switching complete');
  }

  showDomainsList() {
    document.getElementById('domains-header')?.classList.remove('hidden');
    document.getElementById('domains-list')?.classList.remove('hidden');
    document.getElementById('controls-header')?.classList.add('hidden');
    document.getElementById('controls-list')?.classList.add('hidden');
    document.getElementById('measures-header')?.classList.add('hidden');
    document.getElementById('measures-list')?.classList.add('hidden');
    document.getElementById('measure-details-header')?.classList.add('hidden');
    document.getElementById('measure-details')?.classList.add('hidden');
    
    // Debug scrolling - compare domains vs controls
    setTimeout(() => {
      const domainsList = document.getElementById('domains-list');
      const controlsList = document.getElementById('controls-list');
      const main = document.querySelector('main');
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');
      
      console.log('🔍 SCROLLING DEBUG - Comparing Domains vs Controls:');
      
      if (domainsList) {
        console.log('📱 DOMAINS LIST:', {
          offsetHeight: domainsList.offsetHeight,
          scrollHeight: domainsList.scrollHeight,
          clientHeight: domainsList.clientHeight,
          shouldScroll: domainsList.scrollHeight > domainsList.clientHeight,
          computedStyle: window.getComputedStyle(domainsList).overflowY,
          className: domainsList.className,
          style: domainsList.style.cssText
        });
      }
      
      if (controlsList) {
        console.log('📱 CONTROLS LIST:', {
          offsetHeight: controlsList.offsetHeight,
          scrollHeight: controlsList.scrollHeight,
          clientHeight: controlsList.clientHeight,
          shouldScroll: controlsList.scrollHeight > controlsList.clientHeight,
          computedStyle: window.getComputedStyle(controlsList).overflowY,
          className: controlsList.className,
          style: controlsList.style.cssText
        });
      }
      
      console.log('📱 LAYOUT INFO:', {
        mainHeight: main?.offsetHeight,
        headerHeight: header?.offsetHeight,
        footerHeight: footer?.offsetHeight,
        viewportHeight: window.innerHeight,
        calculatedHeight: `calc(100vh - 232px) = ${window.innerHeight - 232}px`
      });
    }, 100);
  }

  showControlsList(domainId) {
    console.log('📱 Showing controls list for domain:', domainId);
    this.currentDomainId = domainId; // Track current domain
    this.currentControlId = null; // Clear control ID when going back to controls
    localStorage.removeItem('think_cnap_current_control_id'); // Clear from localStorage
    document.getElementById('domains-header')?.classList.add('hidden');
    document.getElementById('domains-list')?.classList.add('hidden');
    document.getElementById('controls-header')?.classList.remove('hidden');
    document.getElementById('controls-list')?.classList.remove('hidden');
    document.getElementById('measures-header')?.classList.add('hidden');
    document.getElementById('measures-list')?.classList.add('hidden');
    document.getElementById('measure-details-header')?.classList.add('hidden');
    document.getElementById('measure-details')?.classList.add('hidden');
    
    // Update the controls header with the selected domain name
    this.updateControlsHeader(domainId);
    
    // Debug container dimensions
    const controlsList = document.getElementById('controls-list');
    if (controlsList) {
      console.log('📱 Controls list container dimensions:', {
        clientHeight: controlsList.clientHeight,
        offsetHeight: controlsList.offsetHeight,
        scrollHeight: controlsList.scrollHeight,
        className: controlsList.className,
        style: controlsList.style.cssText,
        boundingRect: controlsList.getBoundingClientRect()
      });
    }
    
    this.loadControls(domainId);
  }

  updateControlsHeader(domainId) {
    console.log('📱 Updating controls header for domain:', domainId);
    
    // Find the domain name using the same logic as loadControls
    let domainName = 'Domain Name';
    if (this.config && this.config.security_domains) {
      let domain = this.config.security_domains.find(d => d.id === domainId);
      if (!domain && !isNaN(domainId)) {
        // If domainId is a number (index), use it to get the domain
        const index = parseInt(domainId);
        domain = this.config.security_domains[index];
        console.log(`📱 Using index ${index} to find domain:`, domain?.name);
      }
      if (domain) {
        domainName = domain.name;
      }
    }
    
    // Update the controls header domain name
    const domainNameElement = document.getElementById('controls-domain-name');
    if (domainNameElement) {
      domainNameElement.textContent = domainName;
    }
    
    console.log('📱 Updated controls header with domain:', domainName);
  }

  showMeasuresList(controlId) {
    console.log('📱 Showing measures list for control:', controlId);
    console.log('📱 Control ID type:', typeof controlId, 'Value:', controlId);
    
    // If no controlId provided, use the stored one
    if (!controlId) {
      controlId = this.currentControlId || localStorage.getItem('think_cnap_current_control_id');
      console.log('📱 Using stored control ID:', controlId);
    }
    
    // Set current control ID for back navigation
    this.currentControlId = controlId;
    console.log('📱 Set currentControlId to:', this.currentControlId);
    
    // Store in localStorage as backup
    localStorage.setItem('think_cnap_current_control_id', controlId);
    console.log('📱 Stored control ID in localStorage:', controlId);
    
    document.getElementById('domains-header')?.classList.add('hidden');
    document.getElementById('domains-list')?.classList.add('hidden');
    document.getElementById('controls-header')?.classList.add('hidden');
    document.getElementById('controls-list')?.classList.add('hidden');
    document.getElementById('measures-header')?.classList.remove('hidden');
    document.getElementById('measures-list')?.classList.remove('hidden');
    document.getElementById('measure-details-header')?.classList.add('hidden');
    document.getElementById('measure-details')?.classList.add('hidden');
    
    // Show the "Back to Controls" button when showing measures list
    const measuresList = document.getElementById('measures-list');
    if (measuresList) {
      const backButton = measuresList.querySelector('button[onclick*="showControlsList"]');
      if (backButton) {
        backButton.style.display = 'flex';
      }
      
      // Hide the "Back to Measures" button when showing measures list
      const backToMeasuresButton = measuresList.querySelector('button[onclick*="showMeasuresList"]');
      if (backToMeasuresButton) {
        backToMeasuresButton.parentElement.style.display = 'none';
      }
    }
    
    // Update the measures header with the control name
    this.updateMeasuresHeader(controlId);
    
    this.loadMeasures(controlId);
  }

  updateMeasuresHeader(controlId) {
    console.log('📱 Updating measures header for control:', controlId);
    
    // Find the control name using the same logic as loadMeasures
    let controlName = 'Control Name';
    if (this.config && this.config.security_domains) {
      for (const domain of this.config.security_domains) {
        if (domain.security_controls) {
          const control = domain.security_controls.find(c => {
            const cId = c.id || c.control_id || c.code;
            return cId === controlId;
          });
          if (control) {
            controlName = control.name || control.text || controlId;
            break;
          }
        }
      }
    }
    
    // Update the measures header control name with ID
    const controlNameElement = document.getElementById('measures-control-name');
    if (controlNameElement) {
      controlNameElement.textContent = `${controlId}: ${controlName}`;
    }
    
    console.log('📱 Updated measures header with control:', controlName);
  }

  updateMeasureDetailsHeader(measureId, measureName) {
    console.log('📱 Updating measure details header for measure:', measureId, measureName);
    
    // Update the measure details header measure name
    const measureNameElement = document.getElementById('measure-details-name');
    if (measureNameElement) {
      measureNameElement.textContent = measureName;
    }
    
    console.log('📱 Updated measure details header with measure:', measureName);
  }

  loadDomains() {
    console.log('📱 Loading domains...');
    const domainsList = document.getElementById('domains-list');
    if (!domainsList) {
      console.log('⚠️ No domains list element found');
      return;
    }
    
    if (!this.config) {
      console.log('⚠️ No config available, showing placeholder');
      domainsList.querySelector('.grid').innerHTML = `
        <div class="bg-gray-800 rounded-lg p-4 text-center">
          <p class="text-gray-400">Loading security domains...</p>
        </div>
      `;
      return;
    }

    const domains = this.config.security_domains || [];
    
    // Filter domains that have measures for the selected platform(s)
    const filteredDomains = domains.filter(domain => {
      const hasRelevantMeasures = domain.security_controls?.some(control =>
        control.action_items?.some(measure => 
          this.isMeasureForSelectedPlatform(measure)
        )
      );
      console.log(`📱 Domain "${domain.name}" has relevant measures:`, hasRelevantMeasures);
      return hasRelevantMeasures;
    });
    
    console.log(`📱 Filtered domains (${filteredDomains.length}):`, filteredDomains.map(d => d.name));
    
    if (filteredDomains.length === 0) {
      domainsList.querySelector('.grid').innerHTML = `
        <div class="bg-gray-800 rounded-lg p-4 text-center">
          <p class="text-gray-400">No domains available for selected platform(s)</p>
        </div>
      `;
      return;
    }
    
    // Add invisible spacer at the end to force scrolling detection
    const invisibleSpacer = {
      id: 'invisible-spacer',
      name: '',
      description: '',
      isInvisible: true
    };
    
    const allDomains = [...filteredDomains, invisibleSpacer];
    
    const domainsHTML = allDomains.map((domain, index) => {
      // Use domain.id if available, otherwise use index as fallback
      const domainId = domain.id || domains.indexOf(domain);
      console.log(`📱 Domain ${domain.name}: id=${domain.id}, using=${domainId}`);
      
      // Handle invisible spacer
      if (domain.isInvisible) {
        return `
          <div class="h-28 bg-transparent pointer-events-none">
            <!-- Invisible spacer to force scrolling detection -->
          </div>
        `;
      }
      
      // Get undefined measures count for this domain (skip for test domains)
      const undefinedCount = domain.id && domain.id.startsWith('test-') ? 0 : this.getUndefinedMeasuresCountForDomain(domainId);
      console.log(`📱 Domain ${domain.name}: ${undefinedCount} undefined measures`);
      
      // Create Not Applicable measures warning if there are any
      const undefinedWarning = undefinedCount > 0 ? `
        <div class="mt-2 flex items-center space-x-2 text-yellow-400 text-xs">
          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
          <span>${undefinedCount} Not applicable measure${undefinedCount !== 1 ? 's' : ''}</span>
        </div>
      ` : '';
      
      return `
        <div class="bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition-colors" 
             onclick="mobileApp.showControlsList('${domainId}')">
          <h3 class="text-base font-semibold text-cyan-300 mb-1">${domain.name}</h3>
          <p class="text-xs text-gray-400">${domain.description || ''}</p>
          ${undefinedWarning}
        </div>
      `;
    }).join('');
    
    domainsList.querySelector('.grid').innerHTML = domainsHTML;
    
    // Enhanced debugging for scrolling detection
    setTimeout(() => {
      const domainsList = document.getElementById('domains-list');
      const grid = domainsList?.querySelector('.grid');
      
      if (domainsList && grid) {
        console.log('🔍 ENHANCED SCROLLING DEBUG:');
        console.log('📱 Domains List:', {
          offsetHeight: domainsList.offsetHeight,
          scrollHeight: domainsList.scrollHeight,
          clientHeight: domainsList.clientHeight,
          shouldScroll: domainsList.scrollHeight > domainsList.clientHeight,
          computedStyle: window.getComputedStyle(domainsList).overflowY
        });
        
        console.log('📱 Grid Container:', {
          offsetHeight: grid.offsetHeight,
          scrollHeight: grid.scrollHeight,
          clientHeight: grid.clientHeight,
          shouldScroll: grid.scrollHeight > grid.clientHeight
        });
        
        console.log('📱 Viewport Info:', {
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
          documentHeight: document.documentElement.scrollHeight,
          bodyHeight: document.body.scrollHeight
        });
        
        // Check if content is actually overflowing
        const isContentOverflowing = grid.scrollHeight > domainsList.clientHeight;
        console.log('🔍 Content Overflow Check:', {
          isContentOverflowing,
          contentHeight: grid.scrollHeight,
          containerHeight: domainsList.clientHeight,
          difference: grid.scrollHeight - domainsList.clientHeight
        });
      }
    }, 500);
  }

  loadControls(domainId) {
    console.log('📱 Loading controls for domain:', domainId);
    const controlsList = document.getElementById('controls-list');
    if (!controlsList) {
      console.log('⚠️ Controls list element not found');
      return;
    }
    if (!this.config) {
      console.log('⚠️ No config available for loading controls');
      return;
    }

    console.log('📱 Available domains:', this.config.security_domains?.map(d => ({id: d.id, name: d.name})));
    
    // Try to find domain by ID first, then by index
    let domain = this.config.security_domains?.find(d => d.id === domainId);
    if (!domain && !isNaN(domainId)) {
      // If domainId is a number (index), use it to get the domain
      const index = parseInt(domainId);
      domain = this.config.security_domains?.[index];
      console.log(`📱 Using index ${index} to find domain:`, domain?.name);
    }
    
    if (!domain) {
      console.log('⚠️ Domain not found:', domainId);
      console.log('📱 Available domain IDs:', this.config.security_domains?.map((d, i) => ({ id: d.id, index: i, name: d.name })));
      return;
    }

    
    // Update the domain name in the breadcrumb navigation
    const domainNameElement = document.getElementById('controls-domain-name');
    if (domainNameElement) {
      domainNameElement.textContent = domain.name;
    }
    
    const controls = domain.security_controls || [];
    
    // Filter controls that have measures for the selected platform(s)
    const filteredControls = controls.filter(control => {
      return control.action_items?.some(measure => 
        this.isMeasureForSelectedPlatform(measure)
      );
    });
    
    console.log(`📱 Filtered controls (${filteredControls.length}):`, filteredControls.map(c => c.name || c.title || c.text));
    
    if (filteredControls.length === 0) {
      controlsList.querySelector('.grid').innerHTML = `
        <div class="bg-gray-800 rounded-lg p-4 text-center">
          <p class="text-gray-400">No controls available for selected platform(s)</p>
        </div>
      `;
      return;
    }

    // Add invisible spacer at the end to force scrolling detection
    const invisibleSpacer = {
      id: 'invisible-spacer-controls',
      isInvisible: true
    };
    
    const allControls = [...filteredControls, invisibleSpacer];
    
    controlsList.querySelector('.grid').innerHTML = allControls.map((control, index) => {
      // Handle invisible spacer
      if (control.isInvisible) {
        return `
          <div class="h-28 bg-transparent pointer-events-none">
            <!-- Invisible spacer to force scrolling detection -->
          </div>
        `;
      }
      
      // Use different field names as fallbacks - check text field first
      const controlId = control.id || control.control_id || control.code || index;
      const controlName = control.name || control.title || control.control_name || control.text || `Control ${index + 1}`;
      const controlDescription = control.description || control.desc || '';
      // Count only measures for the selected platform(s)
      const measuresCount = control.action_items?.filter(measure => 
        this.isMeasureForSelectedPlatform(measure)
      ).length || 0;
      
      console.log(`📱 Control ${index}: id=${controlId}, name=${controlName}`);
      
      // Get undefined measures count for this control
      const undefinedCount = this.getUndefinedMeasuresCountForControl(controlId);
      console.log(`📱 Control ${controlName}: ${undefinedCount} undefined measures`);
      
      // Create Not Applicable measures warning if there are any
      const undefinedWarning = undefinedCount > 0 ? `
        <div class="mt-2 flex items-center space-x-2 text-yellow-400 text-xs">
          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
          <span>${undefinedCount} Not applicable measure${undefinedCount !== 1 ? 's' : ''}</span>
        </div>
      ` : '';
      
      return `
        <div class="bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition-colors" 
             onclick="mobileApp.showMeasuresList('${controlId}')">
          <h3 class="text-base font-semibold text-cyan-300 mb-1">${controlName}</h3>
          <p class="text-xs text-gray-500 mb-2">${controlId}</p>
          <p class="text-xs text-gray-400">${controlDescription}</p>
          ${undefinedWarning}
        </div>
      `;
    }).join('');
    
    console.log('📱 Controls loaded successfully');
    
    // Debug scrolling after controls are loaded
    setTimeout(() => {
      const controlsList = document.getElementById('controls-list');
      const grid = controlsList?.querySelector('.grid');
      if (controlsList && grid) {
      }
    }, 100);
  }

  loadMeasures(controlId) {
    console.log('📱 Loading measures for control:', controlId);
    console.log('📱 Current control ID in loadMeasures:', this.currentControlId);
    const measuresList = document.getElementById('measures-list');
    if (!measuresList) {
      console.log('⚠️ Measures list element not found');
      return;
    }
    if (!this.config) {
      console.log('⚠️ No config available');
      return;
    }

    // Find the control using the same fallback logic as when generating the ID
    let control = null;
    for (const domain of this.config.security_domains || []) {
      console.log(`📱 Searching in domain: ${domain.name}`);
      const availableControlIds = domain.security_controls?.map((c, index) => {
        const cId = c.id || c.control_id || c.code || index;
        return { id: cId, name: c.name || c.title || c.control_name || c.text };
      }) || [];
      console.log('📱 Available control IDs in this domain:', availableControlIds);
      
      control = domain.security_controls?.find((c, index) => {
        const cId = c.id || c.control_id || c.code || index;
        return cId === controlId;
      });
      if (control) {
        break;
      }
    }

    if (!control) {
      console.log('⚠️ Control not found for ID:', controlId);
      return;
    }

    const measures = control.action_items || [];
    
    // Filter measures that belong to the selected platform(s)
    const filteredMeasures = measures.filter(measure => 
      this.isMeasureForSelectedPlatform(measure)
    );
    
    console.log(`📱 Filtered measures (${filteredMeasures.length}):`, filteredMeasures.map(m => ({
      measure_id: m.measure_id,
      measure: m.measure,
      tags: m.tags
    })));
    
    if (filteredMeasures.length === 0) {
      measuresList.querySelector('.grid').innerHTML = `
        <div class="bg-gray-800 rounded-lg p-4 text-center">
          <p class="text-gray-400">No measures available for selected platform(s)</p>
        </div>
      `;
      return;
    }
    
    // Add invisible spacer at the end to force scrolling detection
    const invisibleSpacer = {
      measure_id: 'invisible-spacer-measures',
      isInvisible: true
    };
    
    const allMeasures = [...filteredMeasures, invisibleSpacer];
    
    measuresList.querySelector('.grid').innerHTML = allMeasures.map((measure, index) => {
      // Handle invisible spacer
      if (measure.isInvisible) {
        return `
          <div class="h-28 bg-transparent pointer-events-none">
            <!-- Invisible spacer to force scrolling detection -->
          </div>
        `;
      }
      
      const measureName = measure.measure || measure.name || measure.title || measure.measure_name || measure.text || `Measure ${index + 1}`;
      const measureId = measure.measure_id;
      
      console.log(`📱 Measure ${index}: name=${measureName}, id=${measureId}`);
      
      // Check for undefined values using helper function
      const hasUndefinedValues = this.hasUndefinedValues(measureId);
      
      return `
        <div class="bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition-colors" 
             onclick="mobileApp.showMeasureDetail('${measureId}')">
          <div class="flex justify-between items-start mb-1">
            <h3 class="text-base font-semibold text-cyan-300 flex-1">${measureName}</h3>
          </div>
          <div class="text-xs text-gray-400 mb-1">
            ${measureId}
          </div>
          ${hasUndefinedValues ? `
            <div class="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-400/30 rounded px-2 py-1">
              ⚠️ Not applicable. Excluded from assessment.
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  showMeasureDetail(measureId) {
    console.log('📱 Showing measure detail for:', measureId);
    console.log('📱 Current control ID when showing detail:', this.currentControlId);
    console.log('📱 localStorage control ID:', localStorage.getItem('think_cnap_current_control_id'));
    
    // Find the measure in the current control's measures
    let measure = null;
    for (const domain of this.config.security_domains || []) {
      for (const control of domain.security_controls || []) {
        if (control.action_items) {
          measure = control.action_items.find(m => m.measure_id === measureId);
          if (measure) break;
        }
      }
      if (measure) break;
    }
    
    if (!measure) {
      console.error('📱 Measure not found:', measureId);
      return;
    }
    
    const scoring = this.scoring?.measures?.[measure.measure_id] || {};
    const measureName = measure.measure || measure.name || measure.title || measure.measure_name || measure.text || 'Unknown Measure';
    const measureDescription = measure.comment || measure.description || measure.desc || '';
    
    // Create the back button HTML (outside grid)
    const backButtonHTML = `
      <div class="mb-4" style="margin-top: -1rem;">
        <button onclick="mobileApp.showMeasuresList()" 
                class="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          <span>Back to Measures</span>
        </button>
      </div>
    `;

    // Check if this measure has undefined values
    const hasUndefinedValues = this.hasUndefinedValues(measure.measure_id);
    
    // Create the detailed view HTML (inside grid)
    const detailHTML = `
      <div class="bg-gray-800 rounded-lg p-3">
        <div class="mb-3 pb-3 border-b border-gray-600">
          <label class="block text-sm font-bold text-gray-300 mb-1">Tips and Tricks</label>
          <p class="text-sm text-gray-400 whitespace-pre-wrap">${measureDescription || 'TBD'}</p>
          ${hasUndefinedValues ? `
            <div class="mt-2 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-400/30 rounded px-2 py-1">
              ⚠️ Not applicable. Excluded from assessment.
            </div>
          ` : ''}
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-bold text-gray-300 mb-1">Impact</label>
            <select class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white" 
                    onchange="mobileApp.updateMeasure('${measure.measure_id}', 'impact', this.value)">
              <option value="low" ${scoring.impact === 'low' ? 'selected' : ''}>Low</option>
              <option value="medium" ${scoring.impact === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="high" ${scoring.impact === 'high' ? 'selected' : ''}>High</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-bold text-gray-300 mb-1">Effort</label>
            <select class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white" 
                    onchange="mobileApp.updateMeasure('${measure.measure_id}', 'effort', this.value)">
              <option value="low" ${scoring.effort === 'low' ? 'selected' : ''}>Low</option>
              <option value="medium" ${scoring.effort === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="high" ${scoring.effort === 'high' ? 'selected' : ''}>High</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-bold text-gray-300 mb-1">Initial Maturity</label>
            <select class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white" 
                    onchange="mobileApp.updateMeasure('${measure.measure_id}', 'initial_maturity', this.value)">
              <option value="undefined" ${scoring.initial_maturity === -1 || scoring.initial_maturity === undefined ? 'selected' : ''}>Not Applicable</option>
              <option value="no_adoption" ${scoring.initial_maturity === 0 ? 'selected' : ''}>No Adoption</option>
              <option value="low_adoption" ${scoring.initial_maturity === 1 ? 'selected' : ''}>Low Adoption</option>
              <option value="medium_adoption" ${scoring.initial_maturity === 2 ? 'selected' : ''}>Medium Adoption</option>
              <option value="high_adoption" ${scoring.initial_maturity === 3 ? 'selected' : ''}>High Adoption</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-bold text-gray-300 mb-1">Present Maturity</label>
            <select class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white" 
                    onchange="mobileApp.updateMeasure('${measure.measure_id}', 'present_maturity', this.value)">
              <option value="undefined" ${scoring.present_maturity === -1 || scoring.present_maturity === undefined ? 'selected' : ''}>Not Applicable</option>
              <option value="no_adoption" ${scoring.present_maturity === 0 ? 'selected' : ''}>No Adoption</option>
              <option value="low_adoption" ${scoring.present_maturity === 1 ? 'selected' : ''}>Low Adoption</option>
              <option value="medium_adoption" ${scoring.present_maturity === 2 ? 'selected' : ''}>Medium Adoption</option>
              <option value="high_adoption" ${scoring.present_maturity === 3 ? 'selected' : ''}>High Adoption</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-bold text-gray-300 mb-1">Desired Maturity</label>
            <select class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white" 
                    onchange="mobileApp.updateMeasure('${measure.measure_id}', 'desired_maturity', this.value)">
              <option value="undefined" ${scoring.desired_maturity === -1 || scoring.desired_maturity === undefined ? 'selected' : ''}>Not Applicable</option>
              <option value="no_adoption" ${scoring.desired_maturity === 0 ? 'selected' : ''}>No Adoption</option>
              <option value="low_adoption" ${scoring.desired_maturity === 1 ? 'selected' : ''}>Low Adoption</option>
              <option value="medium_adoption" ${scoring.desired_maturity === 2 ? 'selected' : ''}>Medium Adoption</option>
              <option value="high_adoption" ${scoring.desired_maturity === 3 ? 'selected' : ''}>High Adoption</option>
            </select>
          </div>
        </div>
      </div>
    `;
    
    // Show the measure details view and hide others
    document.getElementById('domains-header')?.classList.add('hidden');
    document.getElementById('domains-list')?.classList.add('hidden');
    document.getElementById('controls-header')?.classList.add('hidden');
    document.getElementById('controls-list')?.classList.add('hidden');
    document.getElementById('measures-header')?.classList.add('hidden');
    document.getElementById('measures-list')?.classList.add('hidden');
    document.getElementById('measure-details-header')?.classList.remove('hidden');
    document.getElementById('measure-details')?.classList.remove('hidden');
    
    // Update the measure details header with the measure name
    this.updateMeasureDetailsHeader(measureId, measureName);
    
    // Add invisible spacer to the detail content
    const detailHTMLWithSpacer = detailHTML + `
      <div class="h-52 bg-transparent pointer-events-none">
        <!-- Invisible spacer to force scrolling detection -->
      </div>
    `;
    
    // Insert detail content inside the measure-details grid
    const measureDetails = document.getElementById('measure-details');
    if (measureDetails) {
      const grid = measureDetails.querySelector('.grid');
      if (grid) {
        grid.innerHTML = detailHTMLWithSpacer;
      }
    }
  }


  updateMeasure(measureId, field, value) {
    if (!this.scoring.measures) {
      this.scoring.measures = {};
    }
    
    if (!this.scoring.measures[measureId]) {
      this.scoring.measures[measureId] = {};
    }
    
    // Convert string values to numbers for maturity fields
    if (field.includes('maturity')) {
      // Map string values to numeric values
      const maturityMap = {
        'undefined': -1,
        'no_adoption': 0,
        'low_adoption': 1,
        'medium_adoption': 2,
        'high_adoption': 3
      };
      
      this.scoring.measures[measureId][field] = maturityMap[value] !== undefined ? maturityMap[value] : -1;
    } else {
      this.scoring.measures[measureId][field] = value;
    }
    
    // Save the updated scoring
    this.saveUserScoring();
    
    // Merge updated scoring data with controls for chart calculations
    this.mergeControlsWithScoring(this.scoring);
    
    // Always update charts data when user makes changes
    // This ensures charts are updated when user changes maturity values
    this.updateChartData();
    
    // Update domains list if on domains view to refresh undefined measures warnings
    if (!document.getElementById('domains-view')?.classList.contains('hidden')) {
      this.loadDomains();
    }
    
    // Update controls list if on controls view to refresh undefined measures warnings
    if (!document.getElementById('controls-list')?.classList.contains('hidden')) {
      this.loadControls(this.currentDomainId);
    }
    
    // Update measures list if on measures view to refresh undefined measures warnings
    if (!document.getElementById('measures-list')?.classList.contains('hidden')) {
      this.loadMeasures(this.currentControlId);
    }
    
    // If we're showing a measure detail, refresh it to update the warning
    if (!document.getElementById('measure-details')?.classList.contains('hidden')) {
      // We're on measure detail view, refresh it
      this.showMeasureDetail(measureId);
    }
  }

  handleResize() {
    // Debounce resize events
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      console.log('📱 Screen resized, updating charts...');
      // Only update if on dashboard view
      if (!document.getElementById('dashboard-view')?.classList.contains('hidden')) {
        this.initializeCharts();
      }
    }, 250);
  }


  getCurrentMeasureId() {
    // Helper function to get current measure ID from the measure details view
    const measureDetails = document.getElementById('measure-details');
    if (measureDetails && !measureDetails.classList.contains('hidden')) {
      const measureTitle = measureDetails.querySelector('h3');
      if (measureTitle) {
        // Extract measure ID from the measure detail view
        // This is a simple implementation - you might need to adjust based on your HTML structure
        return localStorage.getItem('think_cnap_current_measure_id');
      }
    }
    return null;
  }


  async saveUserScoring(skipChartUpdate = false) {
    console.log('📱 Saving scoring data:', this.scoring);
    
    if (!this.currentUser) {
      return false;
    }

    // Registered users: save to database (same as desktop)
    try {
      const token = localStorage.getItem('think_cnap_token');
      
      // Prepare scoring data for save - send all measures with data (same as desktop)
      const cleanedData = { measures: {} };
        if (this.scoring && this.scoring.measures) {
          console.log('🔍 Processing scoring data for save:', this.scoring.measures);
          for (const [measureId, scoring] of Object.entries(this.scoring.measures)) {
            console.log(`📋 Measure ${measureId}:`, scoring);
            
            // Send all measures that have data
            if (scoring) {
              cleanedData.measures[measureId] = {
                impact: scoring.impact || 'medium',
                effort: scoring.effort || 'medium',
                initial_maturity: (scoring.initial_maturity !== undefined && scoring.initial_maturity !== null) ? scoring.initial_maturity : -1,
                present_maturity: (scoring.present_maturity !== undefined && scoring.present_maturity !== null) ? scoring.present_maturity : -1,
                desired_maturity: (scoring.desired_maturity !== undefined && scoring.desired_maturity !== null) ? scoring.desired_maturity : -1
              };
              console.log(`✅ Added ${measureId} to save data:`, cleanedData.measures[measureId]);
            }
          }
        }
        
        console.log('📤 Final cleaned data to send:', cleanedData);
        
        const response = await fetch(`/api/user/${this.currentUser.id}/scoring`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(cleanedData)
        });
        
        if (response.ok) {
          console.log('✅ Scoring saved to database');
          return true;
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to save scoring to database:', response.status, errorText);
          return false;
        }
    } catch (error) {
      console.error('❌ Error saving scoring to database:', error);
      return false;
    }
  }

  handleLogout() {
    // Clear currentUser property (same as desktop)
    this.currentUser = null;
    
    // Clear all auth-related localStorage keys (mobile and desktop compatibility)
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('anonymous_user');
    localStorage.removeItem('think_cnap_token');
    localStorage.removeItem('think_cnap_user');
    localStorage.removeItem('user_data');
    
    // Reset app state
    this.config = null;
    this.scoring = null;
    
    // Destroy all charts before clearing the charts object
    this.destroyAllCharts();
    
    // Show auth modal
    document.getElementById('main-app').classList.add('hidden');
    this.showAuthModal();
  }

  showAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
    // Ensure loading screen is hidden when showing auth modal
    this.hideLoading();
  }

  showAuthError(message) {
    const errorDiv = document.getElementById('auth-error');
    const successDiv = document.getElementById('auth-success');
    if (errorDiv) {
      // Hide success message if showing error
      if (successDiv) successDiv.classList.add('hidden');
      
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
      
      // Hide error after 5 seconds
      setTimeout(() => {
        errorDiv.classList.add('hidden');
      }, 5000);
    }
  }

  showAuthSuccess(message) {
    const successDiv = document.getElementById('auth-success');
    const errorDiv = document.getElementById('auth-error');
    if (successDiv) {
      // Hide error message if showing success
      if (errorDiv) errorDiv.classList.add('hidden');
      
      successDiv.textContent = message;
      successDiv.classList.remove('hidden');
      
      // Hide success after 5 seconds
      setTimeout(() => {
        successDiv.classList.add('hidden');
      }, 5000);
    }
  }

  showMainAppError(message) {
    // Create or update error message in main app
    let errorDiv = document.getElementById('main-app-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'main-app-error';
      errorDiv.className = 'fixed top-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg text-sm z-50';
      document.getElementById('main-app').appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (errorDiv) {
        errorDiv.classList.add('hidden');
      }
    }, 10000);
  }

  showError(message) {
    console.error('❌ Error:', message);
    // Could implement toast notifications here
    alert(message);
  }

  // Change password functionality
  showChangePasswordModal() {
    console.log('📱 Opening change password modal...');
    const modal = document.getElementById('change-password-modal');
    console.log('📱 Modal element:', modal);
    if (modal) {
      modal.classList.remove('hidden');
      // Force visibility in case of CSS conflicts
      modal.style.display = 'flex';
      modal.style.visibility = 'visible';
      console.log('📱 Modal should be visible now');
      console.log('📱 Modal classes:', modal.className);
      console.log('📱 Modal style display:', modal.style.display);
    } else {
      console.error('📱 Change password modal not found!');
    }
  }

  hideChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
      modal.classList.add('hidden');
      // Reset inline styles
      modal.style.display = '';
      modal.style.visibility = '';
      // Clear form
      const form = modal.querySelector('#change-password-form');
      if (form) form.reset();
      // Clear messages
      const errorDiv = modal.querySelector('#change-password-error');
      const successDiv = modal.querySelector('#change-password-success');
      if (errorDiv) errorDiv.classList.add('hidden');
      if (successDiv) successDiv.classList.add('hidden');
    }
  }

  async handleChangePassword(form) {
    const formData = new FormData(form);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    const errorDiv = document.getElementById('change-password-error');
    const successDiv = document.getElementById('change-password-success');

    // Clear previous messages
    if (errorDiv) errorDiv.classList.add('hidden');
    if (successDiv) successDiv.classList.add('hidden');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      this.showChangePasswordError('New passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      this.showChangePasswordError('New password must be at least 8 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('think_cnap_token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const result = await response.json();
      if (response.ok) {
        this.showChangePasswordSuccess('Password changed successfully');
        // Refresh user info display after successful password change
        this.updateUserInfo();
        setTimeout(() => {
          this.hideChangePasswordModal();
        }, 2000);
      } else {
        this.showChangePasswordError(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      this.showChangePasswordError('Network error. Please try again.');
    }
  }

  showChangePasswordError(message) {
    const errorDiv = document.getElementById('change-password-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }

  showChangePasswordSuccess(message) {
    const successDiv = document.getElementById('change-password-success');
    if (successDiv) {
      successDiv.textContent = message;
      successDiv.classList.remove('hidden');
    }
  }
}

// Initialize mobile app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.mobileApp = new MobileApp();
});

// Handle orientation changes
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    if (window.mobileApp) {
      window.mobileApp.updateCarouselPosition();
    }
  }, 100);
});

// Handle visibility changes (for performance)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // App is hidden, pause animations
    const carousel = document.getElementById('chart-carousel');
    if (carousel) {
      carousel.style.transition = 'none';
    }
  } else {
    // App is visible, restore animations
    const carousel = document.getElementById('chart-carousel');
    if (carousel) {
      carousel.style.transition = 'transform 0.3s ease-out';
    }
  }
});
