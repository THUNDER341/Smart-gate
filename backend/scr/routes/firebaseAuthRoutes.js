const express = require('express');
const {
  firebaseRegister,
  firebaseSendEmailVerification,
  firebaseLogin,
  firebaseForgotPassword,
  verifyEmail,
  checkEmailVerification
} = require('../controllers/firebaseAuthController');

const router = express.Router();

/**
 * Firebase Authentication Routes
 */

// Register/Create new Firebase user
router.post('/firebase/register', firebaseRegister);

// Send email verification link
router.post('/firebase/send-verification-email', firebaseSendEmailVerification);

// Verify email with token
router.get('/firebase/verify-email/:token', verifyEmail);

// Login with Firebase ID token
router.post('/firebase/login', firebaseLogin);

// Send password reset link
router.post('/firebase/forgot-password', firebaseForgotPassword);

// Check if email is verified
router.post('/firebase/check-email-verification', checkEmailVerification);

module.exports = router;
