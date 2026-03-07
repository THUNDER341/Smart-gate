const Visitor = require("../models/Visitor");
const QRCode = require("qrcode");

// Register visitor
exports.registerVisitor = async (req, res) => {
  try {
    const { name, phone, host, purpose } = req.body;

    const visitor = new Visitor({
      name,
      phone,
      host,
      purpose,
    });

    await visitor.save();

    res.status(201).json({
      message: "Visitor registered successfully",
      visitorId: visitor._id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get visitor by ID
exports.getVisitorById = async (req, res) => {
  try {
    const { id } = req.params;

    const visitor = await Visitor.findById(id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    res.json(visitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send OTP
exports.sendOtp = async (req, res) => {
  try {
    const { visitorId } = req.body;

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    visitor.otp = otp;
    visitor.otpExpires = Date.now() + 2 * 60 * 1000; // 2 minutes
    await visitor.save();

    res.json({
      message: "OTP sent",
      otp, // for testing only
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify OTP and generate QR
exports.verifyOtp = async (req, res) => {
  try {
    const { visitorId, otp } = req.body;

    const visitor = await Visitor.findById(visitorId);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    // OTP validation
    if (
      visitor.otp !== otp ||
      !visitor.otpExpires ||
      visitor.otpExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Move to pending status
    visitor.isVerified = true;
    visitor.status = "pending";
    visitor.otp = null;
    visitor.otpExpires = null;

    await visitor.save();

    res.json({
      message: "OTP verified successfully",
      visitor,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get pending visitors (for host)
exports.getPendingVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Approve visitor (host)
exports.approveVisitor = async (req, res) => {
  try {
    const { visitorId, validityHours = 24 } = req.body;

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    visitor.status = "approved";
    visitor.approvedAt = new Date();
    visitor.validUntil = new Date(Date.now() + validityHours * 60 * 60 * 1000);

    // Generate QR code
    const qrData = `VISITOR:${visitor._id}`;
    const qrCode = await QRCode.toDataURL(qrData);
    visitor.qrCode = qrCode;

    await visitor.save();

    res.json({
      message: "Visitor approved successfully",
      visitor,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check-in visitor (guard)
exports.checkInVisitor = async (req, res) => {
  try {
    const { visitorId } = req.body;

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    if (visitor.status !== "approved") {
      return res.status(400).json({ message: "Visitor not approved" });
    }

    visitor.status = "checked-in";
    visitor.checkInTime = new Date();
    await visitor.save();

    res.json({
      message: "Visitor checked in successfully",
      visitor,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get active visitors (guard)
exports.getActiveVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find({ status: "checked-in" }).sort({ checkInTime: -1 });
    res.json(visitors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check-out visitor (guard)
exports.checkOutVisitor = async (req, res) => {
  try {
    const { visitorId } = req.body;

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    if (visitor.status !== "checked-in") {
      return res.status(400).json({ message: "Visitor not checked in" });
    }

    visitor.status = "checked-out";
    visitor.checkOutTime = new Date();
    await visitor.save();

    res.json({
      message: "Visitor checked out successfully",
