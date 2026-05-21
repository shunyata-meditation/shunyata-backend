/**
 * Shunyata Meditation API - Login Page
 * Handles user authentication and redirect logic
 */

const form = document.getElementById('login-form');
const submitBtn = document.getElementById('submit-btn');
const messageContainer = document.getElementById('message-container');

/**
 * Display a message to the user
 */
function showMessage(message, type) {
    messageContainer.innerHTML = `<div class="message ${type}">${message}</div>`;
}

/**
 * Check if a URL is a valid redirect target
 * @param {string} url - The URL to validate
 * @param {string[]} allowedDomains - List of allowed external domains
 * @returns {boolean} - True if URL is safe to redirect to
 */
function isValidRedirectUrl(url, allowedDomains) {
    // Empty or null URL is invalid
    if (!url) return false;
    
    try {
        // Check if it's a relative path (same-origin)
        if (url.startsWith('/') && !url.startsWith('//')) {
            return true;
        }
        
        // Parse as absolute URL
        const urlObj = new URL(url, window.location.origin);
        
        // Check if same origin
        if (urlObj.origin === window.location.origin) {
            return true;
        }
        
        // Check if domain is in allowed list
        if (allowedDomains && allowedDomains.length > 0) {
            const hostname = urlObj.hostname;
            return allowedDomains.some(domain => {
                // Exact match or subdomain match
                return hostname === domain || hostname.endsWith('.' + domain);
            });
        }
        
        // Not same-origin and not in allowed list
        return false;
    } catch (e) {
        // Invalid URL format
        return false;
    }
}

/**
 * Get redirect URL from query parameter or default to /timer
 * Validates the URL to prevent open redirect attacks
 */
function getRedirectUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const next = urlParams.get('next');
    
    // Get allowed domains from Django template
    const allowedDomainsElement = document.getElementById('allowed-redirect-domains');
    const allowedDomains = allowedDomainsElement ? JSON.parse(allowedDomainsElement.textContent) : [];
    
    // Validate the redirect URL
    if (next && isValidRedirectUrl(next, allowedDomains)) {
        return next;
    }
    
    // Default to /timer if no valid redirect URL
    return '/timer';
}

/**
 * Handle login form submission
 */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageContainer.innerHTML = '';

    const formData = {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const response = await fetch('/api/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
            // Store tokens
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = getRedirectUrl();
            }, 1000);
        } else {
            // Show error message
            const errorMessage = data.detail || data.message || 'Invalid username or password. Please try again.';
            showMessage(errorMessage, 'error');
        }
    } catch (error) {
        showMessage('An error occurred. Please try again later.', 'error');
        console.error('Login error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
});

/**
 * Check if already logged in on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('access_token');
    if (token) {
        // Already logged in, redirect to validated URL
        const redirectUrl = getRedirectUrl();
        window.location.href = redirectUrl;
    }
});
