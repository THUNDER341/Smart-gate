const { auth } = require('../config/firebase');
const User = require('../models/User');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../services/emailService');

// Temporarily skip email verification for development/testing
// Set to false in production after configuring email service
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true' || true;

/**
 * Firebase Auth - Register/Create new user
 * Accepts email and password, creates Firebase user and local DB user
 * Falls back to local DB if Firebase fails
 */
exports.firebaseRegister = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Validate inputs
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Try Firebase first, but fall back to local if it fails
    let firebaseUid = null;
    try {
      const firebaseUser = await auth.createUser({
        email,
        password,
        displayName: name
      });
      firebaseUid = firebaseUser.uid;
    } catch (firebaseError) {
      console.warn('Firebase create user failed, using local auth:', firebaseError.message);
      // Continue with local auth - don't fail
    }

    // Create user in local database
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      role: role || 'guard',
      firebaseUid: firebaseUid || null,
      isActive: true,
      emailVerified: false,
      verificationToken,
      verificationTokenExpires
    });

    await user.save();

    // Send verification email (non-blocking)
    sendVerificationEmail(email, name, verificationToken)
      .then(result => {
        if (result.success) {
          console.log('✅ Verification email sent to:', email);
        } else {
          console.warn('⚠️  Verification email failed:', result.error);
        }
      })
      .catch(err => console.error('Email send error:', err));

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user._id,
        firebaseUid: firebaseUid,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Firebase register error:', error.message);
    
    // Handle MongoDB duplicate key error (E11000)
    if (error.code === 11000 || error.message.includes('E11000')) {
      const field = error.message.includes('email') ? 'email' : 'phone';
      return res.status(409).json({ 
        message: `This ${field} is already registered. Please login or use a different ${field}.`,
        error: 'DUPLICATE_ENTRY'
      });
    }
    
    res.status(500).json({ error: error.message });
  }
};

/**
 * Firebase Auth - Verify user and send email verification
 * Called after registration to send verification email
 */
exports.firebaseSendEmailVerification = async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: 'Firebase UID is required' });
    }

    // Generate email verification link
    const verificationLink = await auth.generateEmailVerificationLink(uid);

    res.status(200).json({
      message: 'Email verification link generated',
      verificationLink
    });
  } catch (error) {
    console.error('Firebase email verification error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Firebase Auth - Login user with email/password
 * Backend handles Firebase authentication and creates custom token
 */
exports.firebaseLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user in local database by email
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials - user not found' });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Check if email is verified (local check first)
    // Skip verification in development mode
    if (!SKIP_EMAIL_VERIFICATION && !user.emailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        emailVerified: false
      });
    }

    // For Firebase users, check if they have firebaseUid
    if (user.firebaseUid) {
      try {
        // Get Firebase user to check email verification
        const firebaseUser = await auth.getUser(user.firebaseUid);
        
        // Check if email is verified
        if (!firebaseUser.emailVerified) {
          return res.status(403).json({
            message: 'Please verify your email before logging in',
            firebaseUid: user.firebaseUid,
            emailVerified: false
          });
        }

        // Create custom Firebase token for this user
        const customToken = await auth.createCustomToken(user.firebaseUid);

        res.status(200).json({
          message: 'Login successful',
          token: customToken,
          user: {
            id: user._id,
            firebaseUid: user.firebaseUid,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerified: firebaseUser.emailVerified
          }
        });
      } catch (firebaseError) {
        console.error('Firebase auth error:', firebaseError.message);
        return res.status(401).json({ message: 'Firebase authentication failed: ' + firebaseError.message });
      }
    } else {
      // Fallback to old JWT authentication for non-Firebase users
      const bcrypt = require('bcryptjs');
      const jwt = require('jsonwebtoken');
      
      if (!user.password) {
        return res.status(401).json({ message: 'Invalid credentials - password not set' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials - wrong password' });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || 'smart-gate-secret-key',
        { expiresIn: '7d' }
      );

      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: true
        }
      });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify email with token
 * When user clicks the link in email
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    // Find user with this token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({
      message: 'Email verified successfully! You can now login.',
      success: true
    });
  } catch (error) {
    console.error('Email verification error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Firebase Auth - Send password reset email
 */
exports.firebaseForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Generate password reset link from Firebase Admin SDK
    const resetLink = await auth.generatePasswordResetLink(email);

    res.status(200).json({
      message: 'Password reset link generated',
      resetLink
    });
  } catch (error) {
    console.error('Password reset generation error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Check if user email is verified
 */
exports.checkEmailVerification = async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: 'Firebase UID is required' });
    }

    const firebaseUser = await auth.getUser(uid);

    res.status(200).json({
      emailVerified: firebaseUser.emailVerified,
      email: firebaseUser.email
    });
  } catch (error) {
    console.error('Check email verification error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
