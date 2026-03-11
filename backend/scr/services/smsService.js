const twilio = require('twilio');

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const isPlaceholderValue = (value) => {
  if (!value) return true;

  const normalized = String(value).trim().toLowerCase();
  return (
    normalized.includes("your_") ||
    normalized.includes("changeme") ||
    normalized.includes("replace") ||
    normalized === "test" ||
    normalized === "dummy"
  );
};

let client = null;
let useVerifyAPI = false;

// Check if Twilio credentials are configured
if (accountSid && authToken && !isPlaceholderValue(authToken)) {
  client = twilio(accountSid, authToken);
  
  // Check if Verify Service is configured
  if (verifyServiceSid) {
    useVerifyAPI = true;
    console.log('✅ Twilio Verify API initialized for OTP');
  } else if (fromPhone) {
    console.log('✅ Twilio SMS service initialized');
  } else {
    console.log('⚠️  Twilio configured but missing VERIFY_SERVICE_SID or PHONE_NUMBER');
  }
} else {
  console.log('⚠️  Twilio credentials missing/placeholder. SMS features will use mock mode.');
}

/**
 * Send SMS using Twilio
 * @param {string} to - Phone number to send to (E.164 format: +1234567890)
 * @param {string} message - Message content
 * @returns {Promise<object>} - Twilio response or mock response
 */
const sendSMS = async (to, message) => {
  try {
    // If Twilio is not configured, return mock success
    if (!client) {
      console.log(`📱 [MOCK SMS] To: ${to}`);
      console.log(`📱 [MOCK SMS] Message: ${message}`);
      return {
        success: true,
        mock: true,
        message: 'SMS sent (mock mode)',
        to,
        body: message
      };
    }

    // Send real SMS via Twilio
    const response = await client.messages.create({
      body: message,
      from: fromPhone,
      to: to
    });

    console.log(`✅ SMS sent successfully to ${to} (SID: ${response.sid})`);
    
    return {
      success: true,
      mock: false,
      sid: response.sid,
      status: response.status,
      to: response.to,
      body: response.body
    };
  } catch (error) {
    console.error('❌ SMS send failed:', error.message);
    throw error;
  }
};

/**
 * Send OTP using Twilio Verify API
 * @param {string} phone - Phone number (E.164 format)
 * @returns {Promise<object>} - Verification response
 */
const sendOtpViaVerify = async (phone) => {
  try {
    if (!client || !useVerifyAPI) {
      // Mock mode
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`📱 [MOCK OTP] To: ${phone} | Code: ${mockOtp}`);
      return {
        success: true,
        mock: true,
        otp: mockOtp,
        message: 'OTP sent (mock mode)'
      };
    }

    // Send real OTP via Twilio Verify
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications
      .create({ to: phone, channel: 'sms' });

    console.log(`✅ Twilio Verify OTP sent to ${phone} (Status: ${verification.status})`);
    
    return {
      success: true,
      mock: false,
      status: verification.status,
      to: verification.to,
      channel: verification.channel,
      sid: verification.sid
    };
  } catch (error) {
    console.error('❌ Twilio Verify send failed:', error.message);
    throw error;
  }
};

/**
 * Verify OTP using Twilio Verify API
 * @param {string} phone - Phone number (E.164 format)
 * @param {string} code - OTP code entered by user
 * @returns {Promise<object>} - Verification check response
 */
const verifyOtpViaVerify = async (phone, code) => {
  try {
    if (!client || !useVerifyAPI) {
      // Mock mode - always return success for testing
      console.log(`📱 [MOCK VERIFY] Phone: ${phone} | Code: ${code}`);
      return {
        success: true,
        mock: true,
        status: 'approved',
        message: 'OTP verified (mock mode)'
      };
    }

    // Verify OTP via Twilio Verify
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks
      .create({ to: phone, code: code });

    console.log(`✅ Twilio Verify check for ${phone}: ${verificationCheck.status}`);
    
    return {
      success: verificationCheck.status === 'approved',
      mock: false,
      status: verificationCheck.status,
      to: verificationCheck.to,
      channel: verificationCheck.channel,
      valid: verificationCheck.valid
    };
  } catch (error) {
    console.error('❌ Twilio Verify check failed:', error.message);
    throw error;
  }
};

/**
 * Send OTP via SMS
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @param {string} name - Visitor name
 */
const sendOtpSms = async (phone, otp, name) => {
  const message = `Hello ${name},\n\nYour Smart-Gate OTP is: ${otp}\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.`;
  return await sendSMS(phone, message);
};

/**
 * Send visitor approval notification
 * @param {string} phone - Phone number
 * @param {string} name - Visitor name
 * @param {string} host - Host name
 */
const sendApprovalSms = async (phone, name, host) => {
  const message = `Hello ${name},\n\nYour visit request has been approved by ${host}!\n\nYou can now use your digital pass to check-in at the gate.\n\nSmart-Gate Team`;
  return await sendSMS(phone, message);
};

/**
 * Send visitor rejection notification
 * @param {string} phone - Phone number
 * @param {string} name - Visitor name
 * @param {string} reason - Rejection reason
 */
const sendRejectionSms = async (phone, name, reason) => {
  const message = `Hello ${name},\n\nYour visit request has been rejected.\n\nReason: ${reason}\n\nPlease contact your host for more information.\n\nSmart-Gate Team`;
  return await sendSMS(phone, message);
};

/**
 * Send check-in confirmation
 * @param {string} phone - Phone number
 * @param {string} name - Visitor name
 */
const sendCheckInSms = async (phone, name) => {
  const message = `Hello ${name},\n\nYou have been successfully checked in.\n\nEnjoy your visit!\n\nSmart-Gate Team`;
  return await sendSMS(phone, message);
};

/**
 * Send check-out confirmation
 * @param {string} phone - Phone number
 * @param {string} name - Visitor name
 * @param {string} duration - Visit duration
 */
const sendCheckOutSms = async (phone, name, duration) => {
  const message = `Hello ${name},\n\nYou have been checked out successfully.\n\nVisit duration: ${duration}\n\nThank you for visiting!\n\nSmart-Gate Team`;
  return await sendSMS(phone, message);
};

/**
 * Format phone number to E.164 format (+country code)
 * Assumes Indian numbers if no country code provided
 * @param {string} phone - Phone number
 * @returns {string} - Formatted phone number
 */
const formatPhone = (phone) => {
  // Remove all non-numeric characters for processing
  let cleaned = phone.replace(/\D/g, '');
  
  // If it's a 10 digit number, add +91 (India)
  if (cleaned.length === 10) {
    return '+91' + cleaned;
  }
  
  // If it's a 12 digit number starting with 91, add +
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return '+' + cleaned;
  }
  
  // If it already starts with a + in the original string, preserve it
  if (phone.trim().startsWith('+')) {
    return '+' + cleaned;
  }

  // Fallback: just return with + as required by Twilio E.164
  return '+' + cleaned;
};

module.exports = {
  sendSMS,
  sendOtpViaVerify,
  verifyOtpViaVerify,
  sendOtpSms,
  sendApprovalSms,
  sendRejectionSms,
  sendCheckInSms,
  sendCheckOutSms,
  formatPhone,
  isConfigured: !!client,
  useVerifyAPI
};
