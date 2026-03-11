// Guard Portal JavaScript
// API_BASE is already defined in firebase-auth.js, don't redeclare
// Check for Firebase auth token first, fallback to old guard_token
let authToken = localStorage.getItem('authToken') || localStorage.getItem('guard_token');
let guardInfo = localStorage.getItem('userRole') ? {
    name: localStorage.getItem('userEmail'),
    email: localStorage.getItem('userEmail'),
    role: localStorage.getItem('userRole'),
    emailVerified: localStorage.getItem('emailVerified') === 'true'
} : JSON.parse(localStorage.getItem('guard_info') || '{}');
let refreshTimer = null;
let visitorsData = [];
let approvedVisitorsData = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (authToken && (guardInfo.role === 'guard' || localStorage.getItem('userRole') === 'guard')) {
        showDashboard();
        loadVisitors();
        setupAutoRefresh();
    } else {
        showLogin();
    }
});

// Show/hide sections
function showLogin() {
    document.getElementById('login-section').classList.add('active');
    document.getElementById('dashboard-section').classList.remove('active');
    document.getElementById('logoutBtn').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-section').classList.remove('active');
    document.getElementById('dashboard-section').classList.add('active');
    document.getElementById('logoutBtn').style.display = 'inline-block';
    // Get name from guardInfo or fallback to email
    const displayName = guardInfo.name || localStorage.getItem('userEmail') || 'Guard';
    document.getElementById('guardName').textContent = displayName;
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
            
            if (result.user.role !== 'guard') {
                showStatus('✗ Access denied: Guard role required', 'error');
                return;
            }
            
            if (!result.user.emailVerified) {
                showStatus('✗ Please verify your email before logging in. Check your inbox for verification link.', 'error');
                return;
            }
            
            authToken = result.token;
            guardInfo = result.user;
        } else {
            // Fallback to old JWT login
            const formData = { email, password };
            const result = await apiRequest('/auth/login', 'POST', formData);
            
            if (result.user.role !== 'guard') {
                showStatus('✗ Access denied: Guard role required', 'error');
                return;
            }
            
            authToken = result.token;
            guardInfo = result.user;
        }
        
        // Store in both old and new format for compatibility
        localStorage.setItem('guard_token', authToken);
        localStorage.setItem('guard_info', JSON.stringify(guardInfo));
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('userRole', guardInfo.role);
        localStorage.setItem('userEmail', guardInfo.email || email);
        localStorage.setItem('emailVerified', guardInfo.emailVerified || 'true');
        
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
    guardInfo = {};
    // Clear old tokens
    localStorage.removeItem('guard_token');
    localStorage.removeItem('guard_info');
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

// Check-In Form
document.getElementById('checkInForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('checkInPhone').value.trim();
    
    if (!/^\d{10}$/.test(phone)) {
        showStatus('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    try {
        showStatus('Checking in visitor...', 'info');
        const result = await apiRequest('/visitors/check-in', 'POST', { phone }, true);
        
        showStatus(`✓ Check-in successful: ${result.visitor.name}`, 'success');
        document.getElementById('checkInPhone').value = '';
        
        loadVisitors();
        
    } catch (error) {
        showStatus(`✗ Check-in failed: ${error.message}`, 'error');
    }
});

// Load Visitors
async function loadVisitors(silent = false) {
    try {
        if (!silent) showStatus('Loading visitors...', 'info');
        
        // Load both approved and active visitors
        const [approvedResult, activeResult] = await Promise.all([
            apiRequest('/visitors/approved', 'GET', null, true),
            apiRequest('/visitors/active', 'GET', null, true)
        ]);
        
        approvedVisitorsData = approvedResult.visitors || [];
        visitorsData = activeResult.visitors || [];
        
        updateMetrics();
        renderApprovedVisitors();
        renderVisitors();
        
        if (!silent) showStatus('✓ Visitors loaded', 'success');
        
    } catch (error) {
        if (!silent) showStatus(`✗ Failed to load visitors: ${error.message}`, 'error');
    }
}

// Update Metrics
function updateMetrics() {
    const approvedVisitors = approvedVisitorsData.length;
    const activeVisitors = visitorsData.filter(v => v.status === 'checked-in');
    const todayVisitors = visitorsData.filter(v => {
        const checkIn = new Date(v.checkInTime);
        const today = new Date();
        return checkIn.toDateString() === today.toDateString();
    });

    document.getElementById('approvedCount').textContent = approvedVisitors;
    document.getElementById('activeCount').textContent = activeVisitors.length;
    document.getElementById('todayCount').textContent = todayVisitors.length;
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
            v.host.toLowerCase().includes(searchTerm)
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
                    <th>Host</th>
                    <th>Check-In Time</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(visitor => `
                    <tr>
                        <td>${visitor.name}</td>
                        <td>${visitor.phone}</td>
                        <td>${visitor.host}</td>
                        <td>${visitor.checkInTime ? new Date(visitor.checkInTime).toLocaleString() : '-'}</td>
                        <td><span class="badge badge-${visitor.status}">${visitor.status}</span></td>
                        <td>
                            ${visitor.status === 'checked-in' ? 
                                `<button class="btn btn-danger btn-small" onclick="checkOutVisitor('${visitor._id}')">Check Out</button>` :
                                '-'
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

// Render Approved Visitors Table (NEW)
function renderApprovedVisitors() {
    const searchTerm = document.getElementById('searchApprovedInput').value.toLowerCase();
    
    let filtered = approvedVisitorsData;
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(v => 
            v.name.toLowerCase().includes(searchTerm) ||
            v.phone.includes(searchTerm) ||
            v.host.toLowerCase().includes(searchTerm) ||
            v.purpose.toLowerCase().includes(searchTerm)
        );
    }
    
    const container = document.getElementById('approvedVisitorsTable');
    
    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No approved visitors waiting for check-in</p>';
        return;
    }
    
    const table = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Host</th>
                    <th>Purpose</th>
                    <th>Approved At</th>
                    <th>Valid Until</th>
                    <th>Quick Action</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(visitor => `
                    <tr>
                        <td><strong>${visitor.name}</strong></td>
                        <td>${visitor.phone}</td>
                        <td>${visitor.host}</td>
                        <td>${visitor.purpose}</td>
                        <td>${visitor.approvedAt ? new Date(visitor.approvedAt).toLocaleString() : '-'}</td>
                        <td>${visitor.validUntil ? new Date(visitor.validUntil).toLocaleString() : '-'}</td>
                        <td>
                            <button class="btn btn-success btn-small" onclick="quickCheckIn('${visitor.phone}')">✓ Check In</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

// Quick Check-In from approved visitors table
async function quickCheckIn(phone) {
    try {
        showStatus('Checking in visitor...', 'info');
        const result = await apiRequest('/visitors/check-in', 'POST', { phone }, true);
        
        showStatus(`✓ Check-in successful: ${result.visitor.name}`, 'success');
        loadVisitors();
        
    } catch (error) {
        showStatus(`✗ Check-in failed: ${error.message}`, 'error');
    }
}

// Check-Out Visitor
async function checkOutVisitor(visitorId) {
    if (!confirm('Are you sure you want to check out this visitor?')) {
        return;
    }
    
    try {
        showStatus('Checking out visitor...', 'info');
        await apiRequest('/visitors/check-out', 'POST', { visitorId }, true);
        
        showStatus('✓ Check-out successful', 'success');
        loadVisitors();
        
    } catch (error) {
        showStatus(`✗ Check-out failed: ${error.message}`, 'error');
    }
}

// Search and Filter
document.getElementById('searchInput').addEventListener('input', renderVisitors);
document.getElementById('searchApprovedInput').addEventListener('input', renderApprovedVisitors);
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
