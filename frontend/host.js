// Host Portal JavaScript
// API_BASE is already defined in firebase-auth.js, don't redeclare
// Check for Firebase auth token first, fallback to old host_token
let authToken = localStorage.getItem('authToken') || localStorage.getItem('host_token');
let hostInfo = localStorage.getItem('userRole') ? {
    name: localStorage.getItem('userEmail'),
    email: localStorage.getItem('userEmail'),
    role: localStorage.getItem('userRole'),
    emailVerified: localStorage.getItem('emailVerified') === 'true'
} : JSON.parse(localStorage.getItem('host_info') || '{}');
let refreshTimer = null;
let visitorsData = [];

console.log('=== HOST.JS INITIALIZATION ===');
console.log('authToken:', authToken ? authToken.substring(0, 20) + '...' : 'null');
console.log('hostInfo:', hostInfo);
console.log('localStorage.authToken:', localStorage.getItem('authToken') ? 'set' : 'not set');
console.log('localStorage.host_token:', localStorage.getItem('host_token') ? 'set' : 'not set');
console.log('localStorage.userRole:', localStorage.getItem('userRole'));

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - authToken:', !!authToken, 'role:', hostInfo.role || localStorage.getItem('userRole'));
    if (authToken && (hostInfo.role === 'host' || localStorage.getItem('userRole') === 'host')) {
        console.log('✓ Authenticated as host - showing dashboard');
        showDashboard();
        loadVisitors();
        setupAutoRefresh();
    } else {
        console.log('✗ Not authenticated - showing login');
        showLogin();
    }
});

// Show/hide sections
function showLogin() {
    console.log('showLogin() called');
    document.getElementById('login-section').classList.add('active');
    document.getElementById('dashboard-section').classList.remove('active');
    document.getElementById('logoutBtn').style.display = 'none';
}

function showDashboard() {
    console.log('showDashboard() called');
    document.getElementById('login-section').classList.remove('active');
    document.getElementById('dashboard-section').classList.add('active');
    document.getElementById('logoutBtn').style.display = 'inline-block';
    // Get name from hostInfo or fallback to email
    const displayName = hostInfo.name || localStorage.getItem('userEmail') || 'Host';
    console.log('Setting hostName to:', displayName);
    document.getElementById('hostName').textContent = displayName;
}

// Status message helper
function showStatus(message, type = 'info') {
    const statusBox = document.getElementById('statusBox');
    statusBox.textContent = message;
    statusBox.className = `status-box status-${type}`;
    statusBox.style.display = 'block';
    
    setTimeout(() => {
        statusBox.style.display = 'none';
    }, 5000);
}

// API request helper
async function apiRequest(endpoint, method = 'GET', body = null, useAuth = false) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (useAuth && authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                logout();
            }
            throw new Error(data.message || 'Request failed');
        }
        
        return data;
    } catch (error) {
        throw error;
    }
}

// Login Form - Firebase Authentication
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    try {
        showStatus('Logging in with Firebase...', 'info');
        
        // Use Firebase auth if available, fallback to old auth
        if (window.firebaseAuth) {
            const result = await window.firebaseAuth.login(email, password);
            
            if (result.user.role !== 'host') {
                showStatus('✗ Access denied: Host role required', 'error');
                return;
            }
            
            if (!result.user.emailVerified) {
                showStatus('✗ Please verify your email before logging in. Check your inbox for verification link.', 'error');
                return;
            }
            
            authToken = result.token;
            hostInfo = result.user;
        } else {
            // Fallback to old JWT login
            const formData = { email, password };
            const result = await apiRequest('/auth/login', 'POST', formData);
            
            if (result.user.role !== 'host') {
                showStatus('✗ Access denied: Host role required', 'error');
                return;
            }
            
            authToken = result.token;
            hostInfo = result.user;
        }
        
        // Store in both old and new format for compatibility
        localStorage.setItem('host_token', authToken);
        localStorage.setItem('host_info', JSON.stringify(hostInfo));
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('userRole', hostInfo.role);
        localStorage.setItem('userEmail', hostInfo.email || email);
        localStorage.setItem('emailVerified', hostInfo.emailVerified || 'true');
        
        showStatus('✓ Login successful!', 'success');
        
        setTimeout(() => {
            showDashboard();
            loadVisitors();
            setupAutoRefresh();
        }, 1000);
        
    } catch (error) {
        showStatus(`✗ Login failed: ${error.message}`, 'error');
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', logout);

function logout() {
    authToken = null;
    hostInfo = {};
    // Clear old tokens
    localStorage.removeItem('host_token');
    localStorage.removeItem('host_info');
    // Clear Firebase tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('emailVerified');
    
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    showStatus('✓ Logged out successfully', 'success');
    setTimeout(showLogin, 1000);
}

// Load Visitors
async function loadVisitors(silent = false) {
    try {
        if (!silent) showStatus('Loading visitors...', 'info');
        
        const result = await apiRequest('/visitors/pending', 'GET', null, true);
        visitorsData = result.visitors || [];
        
        updateMetrics();
        renderVisitors();
        
        if (!silent) showStatus('✓ Visitors loaded', 'success');
        
    } catch (error) {
        if (!silent) showStatus(`✗ Failed to load visitors: ${error.message}`, 'error');
    }
}

// Update Metrics
function updateMetrics() {
    const pendingVisitors = visitorsData.filter(v => v.status === 'pending');
    const approvedToday = visitorsData.filter(v => {
        if (v.status !== 'approved' || !v.approvedAt) return false;
        const approved = new Date(v.approvedAt);
        const today = new Date();
        return approved.toDateString() === today.toDateString();
    });
    
    document.getElementById('pendingCount').textContent = pendingVisitors.length;
    document.getElementById('approvedCount').textContent = approvedToday.length;
    document.getElementById('lastSync').textContent = new Date().toLocaleTimeString();
}

// Render Visitors Table
function renderVisitors() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = visitorsData;
    
    // Apply status filter
    if (statusFilter !== 'all') {
        filtered = filtered.filter(v => v.status === statusFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(v => 
            v.name.toLowerCase().includes(searchTerm) ||
            v.phone.includes(searchTerm) ||
            v.purpose.toLowerCase().includes(searchTerm)
        );
    }
    
    const container = document.getElementById('visitorsTable');
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No visitors found</p>';
        return;
    }
    
    const table = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Purpose</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(visitor => `
                    <tr>
                        <td>${visitor.name}</td>
                        <td>${visitor.phone}${visitor.email ? '<br><small>' + visitor.email + '</small>' : ''}</td>
                        <td>${visitor.purpose}</td>
                        <td>${new Date(visitor.createdAt).toLocaleString()}</td>
                        <td><span class="badge badge-${visitor.status}">${visitor.status}</span></td>
                        <td>
                            ${visitor.status === 'pending' ? `
                                <button class="btn btn-success btn-small" onclick="approveVisitor('${visitor._id}', 24)">24h</button>
                                <button class="btn btn-success btn-small" onclick="approveVisitor('${visitor._id}', 72)">72h</button>
                                <button class="btn btn-danger btn-small" onclick="rejectVisitor('${visitor._id}')">Reject</button>
                            ` : visitor.status === 'approved' ? `
                                <button class="btn btn-primary btn-small" onclick="viewQRCode('${visitor._id}')">📱 View QR</button>
                                <button class="btn btn-secondary btn-small" onclick="shareQRCode('${visitor._id}')">📤 Share</button>
                            ` : `
                                <span class="text-danger">✗ Rejected</span>
                            `}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

// Approve Visitor
async function approveVisitor(visitorId, validityHours) {
    if (!confirm(`Approve this visitor for ${validityHours} hours?`)) {
        return;
    }
    
    try {
        showStatus('Approving visitor...', 'info');
        await apiRequest('/visitors/approve', 'POST', { visitorId, validityHours }, true);
        
        showStatus(`✓ Visitor approved for ${validityHours} hours`, 'success');
        loadVisitors();
        
    } catch (error) {
        showStatus(`✗ Approval failed: ${error.message}`, 'error');
    }
}

// Reject Visitor (not implemented in backend yet, but prepared)
async function rejectVisitor(visitorId) {
    if (!confirm('Are you sure you want to reject this visitor?')) {
        return;
    }
    
    showStatus('Reject functionality coming soon', 'info');
    // TODO: Implement reject endpoint in backend
}

// View QR Code
function viewQRCode(visitorId) {
    const visitor = visitorsData.find(v => v._id === visitorId);
    if (!visitor || !visitor.qrCode) {
        showStatus('QR code not available', 'error');
        return;
    }
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        max-width: 500px;
    `;
    
    modalContent.innerHTML = `
        <h2 style="color: #001F3F; margin-bottom: 20px;">Visitor QR Code</h2>
        <p style="margin-bottom: 15px;"><strong>${visitor.name}</strong></p>
        <p style="margin-bottom: 15px; color: #666;">${visitor.phone}</p>
        <img src="${visitor.qrCode}" alt="QR Code" style="width: 300px; height: 300px; margin: 20px 0;">
        <p style="margin-bottom: 20px; color: #666; font-size: 14px;">
            Valid until: ${visitor.validUntil ? new Date(visitor.validUntil).toLocaleString() : 'N/A'}
        </p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button onclick="downloadQRCode('${visitor._id}')" class="btn btn-primary">💾 Download</button>
            <button onclick="document.body.removeChild(this.closest('div').parentElement)" class="btn btn-secondary">Close</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Download QR Code
function downloadQRCode(visitorId) {
    const visitor = visitorsData.find(v => v._id === visitorId);
    if (!visitor || !visitor.qrCode) {
        showStatus('QR code not available', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.href = visitor.qrCode;
    link.download = `visitor-qr-${visitor.name.replace(/\s+/g, '-')}-${visitor._id}.png`;
    link.click();
    
    showStatus('QR code downloaded', 'success');
}

// Share QR Code
function shareQRCode(visitorId) {
    const visitor = visitorsData.find(v => v._id === visitorId);
    if (!visitor || !visitor.qrCode) {
        showStatus('QR code not available', 'error');
        return;
    }
    
    // Create share modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 500px;
        width: 90%;
    `;
    
    const hasEmail = visitor.email;
    const emailStatus = hasEmail 
        ? `✅ Email: QR code was sent to ${visitor.email}` 
        : '❌ No email provided - QR code not sent automatically';
    
    modalContent.innerHTML = `
        <h2 style="color: #001F3F; margin-bottom: 20px;">Share QR Code</h2>
        <p style="margin-bottom: 20px;"><strong>${visitor.name}</strong> - ${visitor.phone}</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin-bottom: 10px;">${emailStatus}</p>
        </div>
        
        <h3 style="margin-bottom: 15px; font-size: 16px;">Share Options:</h3>
        
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
            <button onclick="downloadQRCode('${visitor._id}')" class="btn btn-primary" style="width: 100%;">
                💾 Download QR Code
            </button>
            
            <button onclick="copyQRLink('${visitor._id}')" class="btn btn-secondary" style="width: 100%;">
                🔗 Copy Image Link
            </button>
            
            <button onclick="sendQRViaSMS('${visitor._id}')" class="btn btn-success" style="width: 100%;">
                📱 Send via SMS (Not configured yet)
            </button>
            
            ${!hasEmail ? `
                <button onclick="sendQRViaEmail('${visitor._id}')" class="btn btn-info" style="width: 100%;">
                    📧 Send to Email Address
                </button>
            ` : ''}
        </div>
        
        <button onclick="document.body.removeChild(this.closest('div').parentElement)" class="btn btn-danger" style="width: 100%;">
            Close
        </button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// Copy QR Code Link
function copyQRLink(visitorId) {
    const visitor = visitorsData.find(v => v._id === visitorId);
    if (!visitor || !visitor.qrCode) {
        showStatus('QR code not available', 'error');
        return;
    }
    
    navigator.clipboard.writeText(visitor.qrCode).then(() => {
        showStatus('QR code link copied to clipboard', 'success');
    }).catch(() => {
        showStatus('Failed to copy link', 'error');
    });
}

// Send QR via SMS (placeholder)
function sendQRViaSMS(visitorId) {
    showStatus('SMS delivery requires SMS service configuration', 'info');
    // TODO: Implement SMS delivery via Twilio
}

// Send QR via Email (manual)
async function sendQRViaEmail(visitorId) {
    const visitor = visitorsData.find(v => v._id === visitorId);
    if (!visitor) {
        showStatus('Visitor not found', 'error');
        return;
    }
    
    const email = prompt(`Enter email address to send QR code to ${visitor.name}:`);
    if (!email) return;
    
    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showStatus('Invalid email address', 'error');
        return;
    }
    
    try {
        showStatus('Sending QR code via email...', 'info');
        
        // Update visitor with email and resend QR
        await apiRequest(`/visitors/${visitorId}/send-qr-email`, 'POST', { email }, true);
        
        showStatus(`✓ QR code sent to ${email}`, 'success');
    } catch (error) {
        showStatus(`✗ Failed to send email: ${error.message}`, 'error');
    }
}

// Search and Filter
document.getElementById('searchInput').addEventListener('input', renderVisitors);
document.getElementById('statusFilter').addEventListener('change', renderVisitors);

// Refresh Button
document.getElementById('refreshBtn').addEventListener('click', () => loadVisitors());

// Auto-refresh
function setupAutoRefresh() {
    const checkbox = document.getElementById('autoRefresh');
    
    if (checkbox.checked) {
        refreshTimer = setInterval(() => loadVisitors(true), 20000);
    }
    
    checkbox.addEventListener('change', () => {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
        
        if (checkbox.checked) {
            refreshTimer = setInterval(() => loadVisitors(true), 20000);
        }
    });
}
