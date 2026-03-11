const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require(path.join(__dirname, '../../firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'smart-gate-c1923'
});

const auth = admin.auth();
const db = admin.firestore();

module.exports = { admin, auth, db };
