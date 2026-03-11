const { auth } = require('../config/firebase');

/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID token from Authorization header
 */
const firebaseAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase auth error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { firebaseAuth };
