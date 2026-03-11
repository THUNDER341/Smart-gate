// Firebase Authentication Helper (Client-side)
// Note: firebaseConfig is available in firebase-config.js if needed

const API_BASE = 'http://localhost:5000/api';

/**
 * Firebase Authentication Helper Functions
 */

/**
 * Register / Create new Firebase user
 */
async function firebaseRegister(name, email, password, phone, role = 'guard') {
  try {
    // Create user via backend which creates Firebase user
    const response = await fetch(`${API_BASE}/auth/firebase/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, role })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Registration failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Verify email (must be done via Firebase before login)
 * Typically the user verifies email via link sent to their inbox
 */
async function checkEmailVerification(uid) {
  try {
    const response = await fetch(`${API_BASE}/auth/firebase/check-email-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Firebase Login with email/password
 * Backend handles Firebase authentication
 */
async function firebaseLogin(email, password) {
  try {
    // Send email/password to backend which handles Firebase auth
    const response = await fetch(`${API_BASE}/auth/firebase/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Login failed');
    }

    const data = await response.json();
    // Store token in localStorage
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userRole', data.user.role);
    localStorage.setItem('userEmail', data.user.email);
    localStorage.setItem('emailVerified', data.user.emailVerified);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Logout user
 */
function firebaseLogout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userEmail');
}

/**
 * Send Password Reset link
 */
async function sendPasswordReset(email) {
  try {
    const response = await fetch(`${API_BASE}/auth/firebase/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to send reset link");
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get current auth token
 */
function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  return !!localStorage.getItem('authToken');
}

/**
 * Get user role
 */
function getUserRole() {
  return localStorage.getItem('userRole');
}

/**
 * Make authenticated API request
 */
async function authenticatedFetch(endpoint, options = {}) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
}

// Expose functions globally (for use in HTML script tags)
if (typeof window !== 'undefined') {
  window.firebaseAuth = {
    register: firebaseRegister,
    login: firebaseLogin,
    logout: firebaseLogout,
    sendPasswordReset: sendPasswordReset,
    checkEmailVerification,
    getAuthToken,
    isAuthenticated,
    getUserRole,
    authenticatedFetch
  };
  console.log('✓ Firebase Auth Helper loaded successfully');
}
