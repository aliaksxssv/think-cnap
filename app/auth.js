class ThinkCNAPAuth {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        // Get Google Client ID from environment variable or meta tag
        this.googleClientId = window.GOOGLE_CLIENT_ID || 
                             document.querySelector('meta[name="google-client-id"]')?.content ||
                             '314381672297-eu9jidtaeil3404mbfv11031jncugv8q.apps.googleusercontent.com';
        this.init();
    }

    async init() {
        console.log('Initializing ThinkCNAP Authentication...');
        
        try {
            // Check for existing session
            await this.checkExistingSession();
            
            // Initialize Google OAuth if available
            await this.initGoogleAuth();
            
            this.isInitialized = true;
            console.log('Authentication initialized');
        } catch (error) {
            console.error('Authentication initialization error:', error);
            this.isInitialized = true; // Set to true anyway to prevent blocking
        }
    }

    async checkExistingSession() {
        try {
            // Check both mobile and desktop storage keys
            const token = localStorage.getItem('think_cnap_token') || localStorage.getItem('access_token');
            const userData = localStorage.getItem('think_cnap_user');
            
            console.log('🔍 Checking existing session:', { hasToken: !!token, hasUserData: !!userData });
            
            if (token && userData) {
                try {
                    const user = JSON.parse(userData);
                    
                    // Verify token with server
                    const response = await fetch('/api/auth/verify', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        this.currentUser = user;
                        console.log('Session restored for user:', user.email);
                        return true;
                    }
                } catch (error) {
                    console.error('Session verification failed:', error);
                }
            }
            
            // Clear invalid session data
            this.clearSession();
            return false;
        } catch (error) {
            console.error('Error in checkExistingSession:', error);
            return false;
        }
    }

    async initGoogleAuth() {
        try {
            // Load Google Identity Services
            if (!window.google) {
                await this.loadGoogleScript();
            }
            
            // Wait for Google to be fully loaded and retry if needed
            let retries = 0;
            const maxRetries = 10;
            
            while ((!window.google || !google.accounts || !google.accounts.id) && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }
            
            if (!window.google || !google.accounts || !google.accounts.id) {
                throw new Error('Google Identity Services failed to load after multiple attempts');
            }
            
            // Initialize Google OAuth
            google.accounts.id.initialize({
                client_id: this.googleClientId,
                callback: this.handleGoogleCallback.bind(this),
                auto_select: false,
                cancel_on_tap_outside: false
            });
            
            // Wait a moment then render the button
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Render the Google Sign-In button
            this.renderGoogleSignInButton('google-signin-button');
        } catch (error) {
            console.error('Google OAuth initialization failed:', error);
            // Show fallback button immediately if initialization fails
            const fallbackButton = document.getElementById('google-signin-fallback');
            if (fallbackButton) {
                fallbackButton.classList.remove('hidden');
            }
        }
    }

    loadGoogleScript() {
        return new Promise((resolve, reject) => {
            // Check if Google is already available
            if (window.google && google.accounts && google.accounts.id) {
                resolve();
                return;
            }
            
            // Check if script is already loaded
            const existingScript = document.getElementById('google-auth-script') || 
                                 document.querySelector('script[src*="accounts.google.com/gsi/client"]');
            
            if (existingScript) {
                // Wait for the script to actually load
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (window.google && google.accounts && google.accounts.id) {
                        clearInterval(checkInterval);
                        resolve();
                    } else if (attempts > 20) { // 10 seconds timeout
                        clearInterval(checkInterval);
                        this.tryAlternativeGoogleLoad().then(resolve).catch(reject);
                    }
                }, 500);
                return;
            }
            
            this.tryLoadGoogleScript().then(resolve).catch((error) => {
                this.tryAlternativeGoogleLoad().then(resolve).catch(reject);
            });
        });
    }

    tryLoadGoogleScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = 'google-auth-script';
            script.src = 'https://accounts.google.com/gsi/client';
            
            const timeout = setTimeout(() => {
                console.error('Google script load timeout');
                reject(new Error('Google script load timeout'));
            }, 10000); // 10 second timeout
            
            script.onload = () => {
                clearTimeout(timeout);
                
                // Wait for Google services to be available
                let attempts = 0;
                const checkInterval = setInterval(() => {
                    attempts++;
                    if (window.google && google.accounts && google.accounts.id) {
                        clearInterval(checkInterval);
                        resolve();
                    } else if (attempts > 20) { // 10 seconds timeout
                        clearInterval(checkInterval);
                        reject(new Error('Google script loaded but services not available'));
                    }
                }, 500);
            };
            
            script.onerror = (error) => {
                clearTimeout(timeout);
                console.error('Failed to load Google script:', error);
                reject(new Error('Network error loading Google script'));
            };
            
            document.head.appendChild(script);
        });
    }

    async tryAlternativeGoogleLoad() {
        // Method 1: Try different script URLs
        const alternativeUrls = [
            'https://accounts.google.com/gsi/client',
            'https://www.google.com/accounts/gsi/client'
        ];
        
        for (const url of alternativeUrls) {
            try {
                await this.loadScriptFromUrl(url);
                if (window.google && google.accounts && google.accounts.id) {
                    return;
                }
            } catch (error) {
                // Continue to next URL
            }
        }
        
        // Method 2: Try fetch and eval (last resort)
        try {
            const response = await fetch('https://accounts.google.com/gsi/client');
            if (response.ok) {
                const scriptContent = await response.text();
                eval(scriptContent);
                
                // Wait for services to be available
                let attempts = 0;
                while ((!window.google || !google.accounts || !google.accounts.id) && attempts < 20) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                }
                
                if (window.google && google.accounts && google.accounts.id) {
                    return;
                }
            }
        } catch (error) {
            // Fetch method failed
        }
        
        throw new Error('All Google loading methods failed - Google services may be blocked');
    }

    loadScriptFromUrl(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            
            const timeout = setTimeout(() => {
                reject(new Error('Script load timeout'));
            }, 5000);
            
            script.onload = () => {
                clearTimeout(timeout);
                resolve();
            };
            
            script.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }

    async handleGoogleCallback(response) {
        try {
            console.log('Google OAuth callback received');
            
            const result = await fetch('/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    credential: response.credential
                })
            });
            
            if (result.ok) {
                const data = await result.json();
                await this.setUserSession(data.user, data.token);
                this.onAuthStateChange('signed-in');
            } else {
                throw new Error('Google authentication failed');
            }
        } catch (error) {
            console.error('Google authentication error:', error);
            this.showError('Google authentication failed. Please try again.');
        }
    }

    async signInWithEmail(email, password) {
        try {
            console.log('Attempting email sign in for:', email);
            
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                await this.setUserSession(data.user, data.token);
                this.onAuthStateChange('signed-in');
                return { success: true };
            } else {
                if (data.verification_required) {
                    return { 
                        success: false, 
                        error: data.error,
                        verification_required: true,
                        email: data.email
                    };
                }
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Email sign in error:', error);
            return { success: false, error: 'Sign in failed. Please try again.' };
        }
    }

    async signUpWithEmail(email, password) {
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                await this.setUserSession(data.user, data.token);
                this.onAuthStateChange('signed-in');
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
            if (response.ok) {
                await this.setUserSession(data.user, data.token);
                this.onAuthStateChange('signed-in');
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Email sign up error:', error);
            return { success: false, error: 'Sign up failed. Please try again.' };
        }
    }


    async setUserSession(user, token) {
        this.currentUser = user;
        localStorage.setItem('think_cnap_token', token);
        localStorage.setItem('think_cnap_user', JSON.stringify(user));
        console.log('User session set for:', user.email);
    }

    async signOut() {
        // Clear session immediately
        this.clearSession();
        
        // Check if we're on admin page and redirect immediately
        const isAdminPage = window.location.hostname.includes('admin') || 
                           window.location.pathname.includes('/admin') || 
                           window.location.pathname.includes('admin.html') ||
                           window.location.href.includes('admin');
        
        if (isAdminPage) {
            // Redirect immediately before making API call
            window.location.href = 'https://think-cnap-test.pages.dev/?signin=true';
            return; // Exit early to prevent any further execution
        }
        
        // For non-admin pages, notify server and update UI
        try {
            const token = localStorage.getItem('think_cnap_token');
            
            if (token) {
                // Notify server about sign out (don't await to avoid delays)
                fetch('/api/auth/signout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }).catch(error => {
                    console.error('Sign out API error:', error);
                });
            }
        } catch (error) {
            console.error('Sign out error:', error);
        }
        
        this.onAuthStateChange('signed-out');
    }

    clearSession() {
        this.currentUser = null;
        localStorage.removeItem('think_cnap_token');
        localStorage.removeItem('think_cnap_user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('anonymous_user');
    }

    onAuthStateChange(state) {
        console.log('Auth state changed:', state);
        
        // Handle signed-out state on admin page (fallback)
        if (state === 'signed-out') {
            if (window.location.pathname.includes('/admin') || window.location.pathname.includes('admin.html')) {
                window.location.href = '/?signin=true';
                return;
            }
        }
        
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('authStateChange', {
            detail: { state, user: this.currentUser }
        }));
        
        // Update UI based on auth state
        this.updateAuthUI(state);
    }

    updateAuthUI(state) {
        const authModal = document.getElementById('auth-modal');
        const mainContent = document.getElementById('main-content');
        const userInfo = document.getElementById('user-info');
        
        if (state === 'signed-in') {
            if (authModal) authModal.classList.add('hidden');
            if (mainContent) mainContent.classList.remove('hidden');
            
            if (userInfo && this.currentUser) {
                const userName = this.currentUser.email ? this.currentUser.email.split('@')[0].toLowerCase() : 'User';
                
                userInfo.innerHTML = `
                    <div class="relative">
                        <button id="user-dropdown-button" 
                                class="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition duration-200"
                                onclick="auth.toggleUserDropdown()">
                            <span>${userName}</span>
                            <svg class="w-4 h-4 transition-transform duration-200" id="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        
                        <div id="user-dropdown-menu" 
                             class="hidden absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg border border-gray-700 z-50">
                            <div class="py-1">
                                ${this.currentUser.is_admin ? `
                                    <button onclick="window.location.href='/admin.html'; auth.hideUserDropdown();" 
                                            class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition duration-200">
                                        <div class="flex items-center space-x-2">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                            </svg>
                                            <span>Admin</span>
                                        </div>
                                    </button>
                                ` : ''}
                                ${!this.currentUser.googleId ? `
                                    <button onclick="auth.showChangePasswordModal(); auth.hideUserDropdown();" 
                                            class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition duration-200">
                                        <div class="flex items-center space-x-2">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.414-6.414a6 6 0 015.743-7.743z"></path>
                                            </svg>
                                            <span>Change Password</span>
                                        </div>
                                    </button>
                                ` : ''}
                                <button onclick="auth.signOut(); auth.hideUserDropdown();" 
                                        class="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition duration-200">
                                    <div class="flex items-center space-x-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                        </svg>
                                        <span>Sign Out</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add click outside listener to close dropdown
                setTimeout(() => {
                    document.addEventListener('click', this.handleClickOutside.bind(this));
                }, 100);
            }
        } else {
            if (authModal) authModal.classList.remove('hidden');
            if (mainContent) mainContent.classList.add('hidden');
            if (userInfo) userInfo.innerHTML = '';
            
            // Remove click outside listener when signed out
            document.removeEventListener('click', this.handleClickOutside.bind(this));
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
            setTimeout(() => errorDiv.classList.add('hidden'), 5000);
        }
    }
    
    showSuccess(message) {
        const errorDiv = document.getElementById('auth-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.className = 'bg-green-600 text-white p-3 rounded mb-4'; // Change to success styling
            errorDiv.classList.remove('hidden');
            setTimeout(() => {
                errorDiv.classList.add('hidden');
                errorDiv.className = 'hidden bg-red-600 text-white p-3 rounded mb-4'; // Reset to error styling
            }, 5000);
        }
    }

    showChangePasswordModal() {
        // Create change password modal if it doesn't exist
        let modal = document.getElementById('change-password-modal');
        if (!modal) {
            modal = this.createChangePasswordModal();
            document.body.appendChild(modal);
        }
        modal.classList.remove('hidden');
    }

    createChangePasswordModal() {
        const modal = document.createElement('div');
        modal.id = 'change-password-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h2 class="text-2xl font-bold text-white mb-6">Change Password</h2>
                
                <form id="change-password-form" class="space-y-4">
                    <div>
                        <label for="current-password" class="block text-sm font-medium text-gray-300 mb-2">
                            Current Password
                        </label>
                        <input type="password" id="current-password" name="currentPassword" required
                               class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div>
                        <label for="new-password" class="block text-sm font-medium text-gray-300 mb-2">
                            New Password
                        </label>
                        <input type="password" id="new-password" name="newPassword" required minlength="8"
                               class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div>
                        <label for="confirm-password" class="block text-sm font-medium text-gray-300 mb-2">
                            Confirm New Password
                        </label>
                        <input type="password" id="confirm-password" name="confirmPassword" required minlength="8"
                               class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div id="change-password-error" class="text-red-400 text-sm hidden"></div>
                    <div id="change-password-success" class="text-green-400 text-sm hidden"></div>
                    
                    <div class="flex space-x-4 pt-4">
                        <button type="submit" 
                                class="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-md transition duration-200">
                            Change Password
                        </button>
                        <button type="button" onclick="auth.hideChangePasswordModal()"
                                class="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-md transition duration-200">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Add form submit handler
        modal.querySelector('#change-password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleChangePassword(e.target);
        });

        return modal;
    }

    hideChangePasswordModal() {
        const modal = document.getElementById('change-password-modal');
        if (modal) {
            modal.classList.add('hidden');
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

        // Validate password strength
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

    renderGoogleSignInButton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            return false;
        }
        
        if (window.google && google.accounts && google.accounts.id) {
            try {
                // Clear any existing content
                container.innerHTML = '';
                
                google.accounts.id.renderButton(container, {
                    theme: 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    width: 250
                });
                return true;
            } catch (error) {
                console.error('Failed to render Google Sign-In button:', error);
                return false;
            }
        } else {
            return false;
        }
    }

    // User scoring data management
    async loadUserScoring() {
        if (!this.currentUser) {
            return { measures: {} };
        }

        // Registered users use database
        try {
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
            console.error('Error loading user scoring:', error);
            return { measures: {} };
        }
    }

    async saveUserScoring(scoringData) {
        console.log('🎯 auth.saveUserScoring called with:', scoringData);
        console.log('🎯 scoringData type:', typeof scoringData);
        console.log('🎯 scoringData.measures exists:', !!scoringData?.measures);
        console.log('🎯 scoringData.measures keys:', Object.keys(scoringData?.measures || {}));
        console.log('🎯 Full scoringData JSON:', JSON.stringify(scoringData, null, 2));
        
        if (!this.currentUser) {
            console.log('❌ No current user found');
            return false;
        }

        // Registered users save to database
            try {
                const token = localStorage.getItem('think_cnap_token');
                
                // Prepare scoring data for save - send all measures with data
                const cleanedData = { measures: {} };
                if (scoringData && scoringData.measures) {
                    console.log('🔍 Processing scoring data for save:', scoringData.measures);
                    for (const [measureId, scoring] of Object.entries(scoringData.measures)) {
                        console.log(`📋 Measure ${measureId}:`, scoring);
                        
                        // Send all measures that have data
                        if (scoring) {
                            cleanedData.measures[measureId] = {
                                impact: scoring.impact || 'medium',
                                effort: scoring.effort || 'medium',
                                initial_maturity: scoring.initial_maturity !== undefined ? scoring.initial_maturity : -1,
                                present_maturity: scoring.present_maturity !== undefined ? scoring.present_maturity : -1,
                                desired_maturity: scoring.desired_maturity !== undefined ? scoring.desired_maturity : -1
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
                    return true;
                } else {
                    const errorText = await response.text();
                    console.error('Failed to save scoring to database:', response.status, errorText);
                    return false;
                }
            } catch (error) {
                console.error('Error saving user scoring:', error);
                return false;
            }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThinkCNAPAuth;
}