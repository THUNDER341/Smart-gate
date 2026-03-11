# 🚪 Smart Gate - Visitor Management System

A comprehensive digital visitor management system designed for **Rashtriya Raksha University (RRU)**. This system streamlines visitor registration, OTP verification, host approval, and guard check-in/check-out processes.

![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0%2B-green)
![Firebase](https://img.shields.io/badge/Firebase-Auth-orange)
![Twilio](https://img.shields.io/badge/Twilio-SMS-red)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 🌟 Features

### Visitor Portal
- **Self-Registration**: Visitors register with name, phone, host email, and purpose
- **OTP Verification**: Secure 6-digit OTP sent via **Twilio SMS** to real phone numbers
- **QR Code Generation**: Approved visitors receive QR code via email
- **Real-time Status**: Track visitor request status

### Host Portal
- **Firebase Authentication**: Secure login with email/password and email verification
- **Pending Approvals**: View all visitor requests awaiting approval
- **Quick Actions**: Approve/Reject visitors with validity periods (24h or 72h)
- **Live Dashboard**: Auto-refreshing metrics and visitor list

### Guard Portal
- **Firebase Authentication**: Secure login with email/password
- **Check-In/Check-Out**: Manage visitor entry and exit with phone-based lookup
- **Active Visitors**: Real-time view of all checked-in visitors
- **Visitor Logs**: Complete history of all visitor activities

### Security & Authentication
- **Firebase Authentication**: Industry-standard auth for Host/Guard portals
- **Twilio Verify API**: Secure OTP delivery to visitor phones
- **Role-Based Access**: Separate portals for Guard, Host, and Visitor
- **Session Persistence**: localStorage-based login state

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 5.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Firebase Admin SDK
- **SMS Service**: Twilio Verify API
- **Email Service**: Nodemailer (QR code delivery)
- **QR Codes**: qrcode library

### Frontend
- **Pure Web Standards**: HTML5, CSS3, Vanilla JavaScript ES6+
- **Firebase SDK**: Client-side authentication
- **No Frameworks**: Zero dependencies, lightweight and fast
- **Responsive Design**: Mobile-first CSS with flexbox/grid
- **Theme**: RRU Navy Blue (#001F3F) and White (#ffffff)

---

## 📁 Project Structure

```
smart-gate/
├── backend/
│   ├── scr/
│   │   ├── server.js                 # Express app entry point
│   │   ├── config/
│   │   │   └── firebase.js           # Firebase Admin SDK config
│   │   ├── controllers/
│   │   │   ├── visitorController.js  # Visitor workflow logic
│   │   │   ├── authController.js     # Legacy auth (backup)
│   │   │   ├── adminController.js    # Admin functions
│   │   │   └── firebaseAuthController.js  # Firebase auth
│   │   ├── models/
│   │   │   ├── Visitor.js            # Visitor schema
│   │   │   ├── User.js               # Staff user schema
│   │   │   ├── Blacklist.js          # Blacklisted visitors
│   │   │   └── RegistrationLink.js   # Pre-registration links
│   │   ├── routes/
│   │   │   ├── visitorRoutes.js      # Visitor API endpoints
│   │   │   ├── authRoutes.js         # Legacy auth routes
│   │   │   ├── adminRoutes.js        # Admin API endpoints
│   │   │   └── firebaseAuthRoutes.js # Firebase auth routes
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js     # JWT verification
│   │   │   └── firebaseAuthMiddleware.js  # Firebase token verification
│   │   └── services/
│   │       ├── smsService.js         # Twilio SMS/OTP service
│   │       └── emailService.js       # Email with QR code
│   ├── firebase-service-account.json # Firebase credentials (gitignored)
│   ├── .env                          # Environment variables
│   └── package.json
│
├── frontend/
│   ├── landing.html                  # Portal selection page
│   ├── visitor.html                  # Visitor registration/verification
│   ├── guard.html                    # Guard dashboard
│   ├── host.html                     # Host approval dashboard
│   ├── guard-login.html              # Guard Firebase login
│   ├── guard-register.html           # Guard Firebase registration
│   ├── host-login.html               # Host Firebase login
│   ├── host-register.html            # Host Firebase registration
│   ├── forgot-password.html          # Password reset
│   ├── verify-email.html             # Email verification
│   ├── visitor.js                    # Visitor portal logic
│   ├── guard.js                      # Guard portal logic
│   ├── host.js                       # Host portal logic
│   ├── firebase-config.js            # Firebase client config
│   ├── firebase-auth.js              # Firebase auth logic
│   ├── styles.css                    # Unified RRU branding
│   └── assets/
│       └── rru-logo.png              # University logo
│
├── docs/
│   ├── SRS.md                        # Software Requirements Specification
│   ├── SRS.tex                       # LaTeX version
│   └── PROJECT-REPORT.tex            # Project report
│
└── README.md                         # This file
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **MongoDB**: v7.0 or higher (running locally or cloud)
- **Firebase Project**: With Authentication enabled
- **Twilio Account**: For SMS OTP delivery (optional)

### 1. Clone Repository
```bash
git clone https://github.com/Pratibh-kumari/Smart-gate.git
cd smart-gate
```

### 2. Setup Backend
```bash
cd backend
npm install

# Create .env file with your credentials:
# MONGO_URI=mongodb://127.0.0.1:27017/smart-gate
# PORT=5000
# JWT_SECRET=your-secret-key
# TWILIO_ACCOUNT_SID=your_sid
# TWILIO_AUTH_TOKEN=your_token
# TWILIO_VERIFY_SERVICE_SID=your_verify_sid

# Add Firebase service account JSON file
# backend/firebase-service-account.json

npm start
```

Backend runs on `http://localhost:5000`

### 3. Setup Frontend
```bash
cd frontend
python -m http.server 5500
# OR
npx serve -p 5500
```

Frontend runs on `http://localhost:5500`

### 4. Access the System
- **Landing Page**: http://localhost:5500/landing.html
- **Visitor Portal**: http://localhost:5500/visitor.html
- **Host Login**: http://localhost:5500/host-login.html
- **Guard Login**: http://localhost:5500/guard-login.html

---

## 🔑 Authentication

### Host & Guard Login
Authentication is handled via **Firebase Authentication**:
1. Register at `/host-register.html` or `/guard-register.html`
2. Verify email via link sent to your inbox
3. Login at `/host-login.html` or `/guard-login.html`

### Visitor OTP
Visitors receive **real SMS OTP** via Twilio to their registered phone number.

---

## 📖 Documentation

- **[docs/SRS.md](docs/SRS.md)**: Software Requirements Specification (IEEE 830)
- **[docs/SRS.tex](docs/SRS.tex)**: LaTeX version for academic submission
- **[docs/PROJECT-REPORT.tex](docs/PROJECT-REPORT.tex)**: Complete project report

---

## 🔄 Complete Workflow

### 1. Visitor Registration
```
Visitor Portal → Register (name, phone, host email, purpose) → OTP sent via SMS
```

### 2. OTP Verification
```
Enter Phone + OTP from SMS → Verify → Status: Pending Approval
```

### 3. Host Approval
```
Host Firebase Login → View Pending → Approve/Reject → QR Code sent via Email
```

### 4. Guard Check-In
```
Guard Firebase Login → Enter Visitor Phone → Verify QR/Status → Check-In
```

### 5. Guard Check-Out
```
Active Visitors Table → Check-Out Button → Status: Completed
```

---

## 🧪 API Testing

### Manual API Testing
```bash
# Register Visitor
curl -X POST http://localhost:5000/api/visitors/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","phone":"9876543210","hostEmail":"host@example.com","purpose":"Meeting"}'

# Verify OTP (use OTP received via SMS)
curl -X POST http://localhost:5000/api/visitors/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","otp":"123456"}'
```

---

## 🔧 Configuration

### Environment Variables (backend/.env)
```env
# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/smart-gate

# Server
PORT=5000

# JWT (for legacy auth)
JWT_SECRET=your-secret-key

# Twilio Verify API
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid

# Email (for QR code delivery)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Firebase Setup
1. Create project at [Firebase Console](https://console.firebase.google.com)
2. Enable Email/Password authentication
3. Download service account JSON → `backend/firebase-service-account.json`
4. Copy web config to `frontend/firebase-config.js`

---

## 🔐 Security Features

- **Firebase Authentication**: Industry-standard auth with email verification
- **Twilio Verify**: Secure OTP delivery (not stored in database)
- **CORS Protection**: Configured allowed origins
- **Environment Secrets**: .env and service account excluded from git
- **Role Validation**: Firebase custom claims for authorization

---

## 🌐 Production Deployment

### Backend (Node.js)
Recommended platforms:
- **Heroku**: Easy Node.js deployment
- **Railway**: Modern hosting with MongoDB support
- **DigitalOcean**: Droplet with PM2 process manager
- **AWS EC2**: Full control with scalability

### Frontend (Static Files)
Recommended platforms:
- **Netlify**: Free tier with CDN
- **Vercel**: Instant deployment from GitHub
- **GitHub Pages**: Free hosting for static sites
- **Cloudflare Pages**: Fast global CDN

### Database (MongoDB)
- **MongoDB Atlas**: Free tier available, recommended for production
- **Local MongoDB**: For development only

---

## 📱 Twilio SMS Setup

The system uses **Twilio Verify API** for OTP delivery:

1. **Sign up for Twilio**: https://www.twilio.com
2. **Create a Verify Service**: Console → Verify → Services → Create
3. **Get credentials**:
   - Account SID (from dashboard)
   - Auth Token (from dashboard)
   - Verify Service SID (from Verify service)
4. **Update backend/.env**:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxx
   ```
5. **Test**: Register a visitor with real phone number (+91 prefix added automatically)

---

## 🐛 Troubleshooting

### Backend won't start
- **Check MongoDB**: Ensure MongoDB is running (`mongosh` to test)
- **Check .env**: Verify MONGO_URI is correct
- **Check port**: Ensure port 5000 is not in use (`npx kill-port 5000`)

### Frontend can't connect to backend
- **Check CORS**: Backend allows localhost:5500 by default
- **Check backend**: Verify backend is running on port 5000
- **Check API calls**: Open browser DevTools → Network tab

### OTP not received
- **Check Twilio**: Verify credentials in .env are correct
- **Check phone format**: Use 10-digit number (e.g., "9876543210")
- **Check Twilio balance**: Ensure account has credits

### Firebase login not working
- **Check Firebase config**: Verify `firebase-config.js` matches your project
- **Check email verification**: Users must verify email before login
- **Check Firebase Console**: Verify Authentication is enabled

---

## 🤝 Contributing

Contributions welcome! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the MIT License.

---

## 👥 Project Team

**Software Engineering Semester Project - RRU**
- **Pratibha**: Full-Stack Development Lead
- **Riya**: QA & Documentation (Product Owner)

---

## 🎯 Current Status & Roadmap

### ✅ Completed Features
- [x] Visitor registration with Twilio OTP
- [x] Firebase Authentication (Host/Guard)
- [x] Host approval workflow
- [x] Guard check-in/check-out
- [x] QR Code generation
- [x] RRU Navy/White branding

### 🔄 In Progress
- [ ] Email QR code delivery (Gmail configuration pending)

### 📋 Future Enhancements
- [ ] QR Code scanning for check-in
- [ ] Export reports (PDF/CSV)
- [ ] Photo capture for visitors
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)

---

## 🙏 Acknowledgments

- **Rashtriya Raksha University (RRU)**: For the opportunity
- **Firebase**: For authentication platform
- **Twilio**: For SMS OTP capabilities
- **MongoDB**: For database platform

---

**Made with ❤️ for Rashtriya Raksha University**


