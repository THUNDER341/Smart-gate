
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");

const {
  registerVisitor,
  sendOtp,
  verifyOtp,
  getVisitorById,
  getPendingVisitors,
  approveVisitor,
  checkInVisitor,
  getApprovedVisitors,
  getActiveVisitors,
  checkOutVisitor,
  sendQRCodeEmail
} = require("../controllers/visitorController");

// Public routes
router.post("/register", registerVisitor);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Protected routes (require authentication)
router.get("/pending", authenticate, getPendingVisitors);
router.post("/approve", authenticate, approveVisitor);
router.get("/approved", authenticate, getApprovedVisitors);
router.post("/check-in", authenticate, checkInVisitor);
router.get("/active", authenticate, getActiveVisitors);
router.post("/check-out", authenticate, checkOutVisitor);
router.post("/:id/send-qr-email", authenticate, sendQRCodeEmail);

// Get visitor by ID
router.get("/:id", getVisitorById);

module.exports = router;
