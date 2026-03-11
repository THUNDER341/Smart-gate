const nodemailer = require('nodemailer');

// Email configuration
// Set these in environment variables or update with your credentials
const EMAIL_USER = process.env.EMAIL_USER || 'your-email@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'your-app-password';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Smart Gate System <noreply@smartgate.com>';

// Create transporter using Testmail.app
const transporter = nodemailer.createTransport({
  host: '104.26.4.155', // smtp.testmail.app hardcoded bypass
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'd0fd37fa-cbe3-402e-8814-2bf3c05a17b4',
    pass: 'd0fd37fa-cbe3-402e-8814-2bf3c05a17b4'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Test email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️  Testmail service not configured:', error.message);
  } else {
    console.log('✅ Testmail service ready (Namespace: gp6f5)');
  }
});

/**
 * Send verification email
 */
async function sendVerificationEmail(email, name, verificationToken) {
  const verificationLink = `http://localhost:5500/verify-email.html?token=${verificationToken}`;
  
  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: '🔐 Verify Your Smart Gate Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #001F3F; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 12px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏢 Smart Gate System</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${name}!</h2>
            <p>Thank you for registering with Smart Gate. Please verify your email address to activate your account.</p>
            <p>Click the button below to verify your email:</p>
            <p style="text-align: center;">
              <a href="${verificationLink}" class="button">✓ Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;">${verificationLink}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create this account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 Rashtriya Raksha University - Smart Gate System</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✉️  Verification email sent to:', email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send QR code to visitor
 */
async function sendQRCodeEmail(visitorEmail, visitorName, qrCodeDataURL, visitDetails) {
  const mailOptions = {
    from: EMAIL_FROM,
    to: visitorEmail,
    subject: '✅ Your Smart Gate Entry Pass',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .qr-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border: 2px solid #28a745; border-radius: 5px; }
          .details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #28a745; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Visit Approved!</h1>
          </div>
          <div class="content">
            <h2>Hello ${visitorName},</h2>
            <p>Great news! Your visit has been <strong>approved</strong>.</p>
            
            <div class="qr-box">
              <h3>🔐 Your Entry QR Code</h3>
              <img src="${qrCodeDataURL}" alt="QR Code" style="max-width: 250px; height: auto;">
              <p style="color: #666; font-size: 14px;">Show this QR code at the gate</p>
            </div>
            
            <div class="details">
              <h3>📋 Visit Details</h3>
              <p><strong>Host:</strong> ${visitDetails.host}</p>
              <p><strong>Purpose:</strong> ${visitDetails.purpose}</p>
              <p><strong>Phone:</strong> ${visitDetails.phone}</p>
              <p><strong>Status:</strong> <span style="color: #28a745;">Approved ✓</span></p>
            </div>
            
            <p><strong>⚠️ Important:</strong></p>
            <ul>
              <li>Save this QR code on your phone</li>
              <li>Show it at the security gate for entry</li>
              <li>Valid for your scheduled visit</li>
            </ul>
          </div>
          <div class="footer">
            <p>© 2026 Rashtriya Raksha University - Smart Gate System</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✉️  QR code email sent to:', visitorEmail);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send QR code email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, name, resetToken) {
  const resetLink = `http://localhost:5500/reset-password.html?token=${resetToken}`;
  
  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: '🔑 Reset Your Smart Gate Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔑 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>We received a request to reset your Smart Gate password.</p>
            <p>Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;">${resetLink}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>© 2026 Rashtriya Raksha University - Smart Gate System</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✉️  Password reset email sent to:', email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendVerificationEmail,
  sendQRCodeEmail,
  sendPasswordResetEmail
};
