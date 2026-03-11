// Visitor Portal JavaScript

// Helper to switch sections
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.card-section');
    sections.forEach(section => {
        section.classList.remove('active');
        // We use the .active class in CSS to control visibility
    });
    
    // Show target section
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
        console.log(`Switched to section: ${sectionId}`);
        // Ensure status box is reset when switching
        const statusBox = document.getElementById('statusBox');
        if (statusBox) statusBox.style.display = 'none';
    } else {
        console.error(`Section not found: ${sectionId}`);
    }
}

// Status message helper
function showStatus(message, type = 'info') {
    const statusBox = document.getElementById('statusBox');
    if (!statusBox) {
        console.error("Status box not found in DOM");
        alert(message); // Fallback to alert if statusBox missing
        return;
    }
    
    statusBox.textContent = message;
    statusBox.className = `status-box status-${type}`;
    statusBox.style.display = 'block';
    
    // Auto-scroll to status
    statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Only hide if not a success message that needs to be read
    if (type !== 'success') {
        setTimeout(() => {
            if (statusBox.textContent === message) { // Only hide if message hasn't changed
                statusBox.style.display = 'none';
            }
        }, 8000);
    }
}

// API request helper
async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
        const baseUrl = document.getElementById('apiBase') ? document.getElementById('apiBase').value.replace(/\/$/, '') : 'http://localhost:5000/api';
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(`${baseUrl}${endpoint}`, options);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }
        
        return data;
    } catch (error) {
        throw error;
    }
}

// Visitor Registration Form
document.getElementById('visitorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim().replace(/\D/g, ''),
        email: document.getElementById('email').value.trim(), // Optional email for QR code delivery
        host: document.getElementById('host').value.trim(),
        purpose: document.getElementById('purpose').value.trim()
    };
    
    // Validate phone number (must be exactly 10 digits after cleaning)
    if (formData.phone.length !== 10) {
        showStatus('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    try {
        showStatus('Registering visitor...', 'info');
        const result = await apiRequest('/visitors/register', 'POST', formData);
        
        // When using real Twilio API, result.otp will be undefined/null
        if (result.otp) {
            showStatus(`✓ Registration successful! Your OTP is: ${result.otp} (Valid for 2 minutes)`, 'success');
            console.log('='.repeat(50));
            console.log('🔐 YOUR OTP CODE: ' + result.otp);
            console.log('='.repeat(50));
        } else {
            showStatus(`✓ Registration successful! A numeric OTP has been sent via SMS to ${formData.phone}`, 'success');
            console.log('Real Twilio OTP sent to:', formData.phone);
        }
        
        // Pre-fill OTP form with phone number
        document.getElementById('otpPhone').value = formData.phone;
        
        // Clear registration form
        document.getElementById('visitorForm').reset();
        
        // Auto-switch to OTP section after 4 seconds (give time to see OTP)
        setTimeout(() => {
            showSection('otp-section');
        }, 4000);
        
    } catch (error) {
        showStatus(`✗ Registration failed: ${error.message}`, 'error');
    }
});

// OTP Verification Form
document.getElementById('otpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get raw values first
    const rawPhone = document.getElementById('otpPhone').value.trim();
    const rawOtp = document.getElementById('otp').value.trim();

    const formData = {
        phone: rawPhone.replace(/\D/g, ''),
        otp: rawOtp.replace(/\D/g, '')
    };
    
    console.log('--- Verification Attempt ---');
    console.log('Raw Phone:', rawPhone);
    console.log('Cleaned Phone:', formData.phone);
    console.log('OTP Length:', formData.otp.length);
    
    // Validate inputs
    if (formData.phone.length !== 10) {
        showStatus('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    if (formData.otp.length < 4 || formData.otp.length > 8) {
        showStatus('Please enter a valid OTP code', 'error');
        return;
    }
    
    try {
        showStatus('Verifying OTP...', 'info');
        console.log('Calling API: /visitors/verify-otp');
        
        const result = await apiRequest('/visitors/verify-otp', 'POST', formData);
        console.log('API Response Success:', result);
        
        showStatus(`✓ OTP verified successfully! Your request is pending host approval.`, 'success');
        
        // Clear form
        document.getElementById('otpForm').reset();
        
        // Final Success View
        setTimeout(() => {
            const successHtml = `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">✅</div>
                    <h2 style="color: var(--navy);">Verification Complete!</h2>
                    <p style="font-size: 1.1rem; color: #555; margin-bottom: 2rem;">
                        Your request has been sent to <strong>${result.visitor ? result.visitor.host : 'your host'}</strong> for approval.
                    </p>
                    <div style="background: #f8f9ff; padding: 1.5rem; border-radius: 8px; border: 1px solid #e0e6ed; margin-bottom: 2rem;">
                        <p style="margin: 0; font-weight: 600; color: var(--navy-dark);">Next Steps:</p>
                        <p style="margin: 0.5rem 0 0;">Please wait at the gate. You will receive an email/SMS once your visit is approved.</p>
                    </div>
                    <a href="landing.html" class="btn btn-primary">Back to Home</a>
                </div>
            `;
            document.querySelector('.portal-main').innerHTML = successHtml;
        }, 1500);
        
    } catch (error) {
        showStatus(`✗ OTP verification failed: ${error.message}`, 'error');
    }
});

// Section toggle links
document.getElementById('showOtpSection').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('otp-section');
});

document.getElementById('showRegisterSection').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('register-section');
});
