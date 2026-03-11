const Visitor = require("../models/Visitor");
const QRCode = require("qrcode");
const { sendQRCodeEmail } = require("../services/emailService");
const {
  formatPhone,
  sendOtpViaVerify,
  verifyOtpViaVerify,
  useVerifyAPI,
} = require("../services/smsService");

// Register visitor
exports.registerVisitor = async (req, res) => {
  try {
    const { name, phone, email, host, purpose } = req.body;

    const formattedPhone = formatPhone(phone);

    // Keep local OTP fields for mock/testing compatibility.
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const visitor = new Visitor({
      name,
      phone,
      email, // Optional email for sending QR code later
      host,
      purpose,
      otp,
      otpExpires: Date.now() + 2 * 60 * 1000, // 2 minutes
    });

    await visitor.save();

    const otpResponse = await sendOtpViaVerify(formattedPhone);

    const response = {
      message: "Visitor registered successfully. OTP sent to phone.",
      visitorId: visitor._id,
    };

    // If using real Twilio API, we don't return the OTP in the JSON response
    if (otpResponse.mock && otpResponse.otp) {
      visitor.otp = otpResponse.otp;
      visitor.otpExpires = Date.now() + 10 * 60 * 1000;
      await visitor.save();
      response.otp = otpResponse.otp;
      response.mock = true;
    } else {
      // For real Twilio Verify, we clear any local dummy OTP to ensure 
      // the only way to verify is through the Twilio check.
      visitor.otp = null;
      visitor.otpExpires = null;
      await visitor.save();
    }

    res.status(201).json(response);
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

    const formattedPhone = formatPhone(visitor.phone);
    const otpResponse = await sendOtpViaVerify(formattedPhone);

    // Keep OTP persisted only when mock mode is enabled.
    if (otpResponse.mock && otpResponse.otp) {
      visitor.otp = otpResponse.otp;
      visitor.otpExpires = Date.now() + 10 * 60 * 1000;
    }
    await visitor.save();

    const response = { message: "OTP sent" };
    if (otpResponse.mock && otpResponse.otp) {
      response.otp = otpResponse.otp;
      response.mock = true;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify OTP and generate QR
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    console.log('--- OTP Verification Request ---');
    console.log('Original Phone:', phone);
    console.log('OTP Received:', otp);

    const formattedPhone = formatPhone(phone);
    console.log('Formatted Phone (E.164):', formattedPhone);

    // Find visitor by phone number
    // Try both exact phone and formatted if needed, but usually storage is raw
    const visitor = await Visitor.findOne({ phone }).sort({ createdAt: -1 });

    if (!visitor) {
      console.log('❌ Visitor not found in DB for phone:', phone);
      return res.status(404).json({ message: "Visitor not found with this phone number" });
    }
    
    console.log('✅ Visitor found:', visitor.name, '| Stored OTP:', visitor.otp);

    let isValidOtp = false;

    if (useVerifyAPI) {
      console.log('Using Twilio Verify API for formatted phone:', formattedPhone);
      const verifyResponse = await verifyOtpViaVerify(formattedPhone, otp);
      isValidOtp = !!verifyResponse.success;
      console.log('Twilio Verify Result:', isValidOtp);
    } else {
      // Local fallback validation
      isValidOtp =
        visitor.otp === otp &&
        !!visitor.otpExpires &&
        visitor.otpExpires >= Date.now();
      console.log('Local Mode Result:', isValidOtp);
    }

    if (!isValidOtp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Move to pending status
    visitor.isVerified = true;
    visitor.status = "pending";
    visitor.otp = null;
    visitor.otpExpires = null;

    await visitor.save();

    res.json({
      message: "OTP verified successfully. Waiting for host approval.",
      visitor: {
        id: visitor._id,
        name: visitor.name,
        phone: visitor.phone,
        host: visitor.host,
        status: visitor.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get pending visitors (for host)
exports.getPendingVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json({ visitors });
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

    // Send QR code via email if visitor provided email
    if (visitor.email) {
      try {
        await sendQRCodeEmail(
          visitor.email,
          visitor.name,
          qrCode,
          {
            host: visitor.host,
            purpose: visitor.purpose,
            phone: visitor.phone,
            validUntil: visitor.validUntil.toLocaleString(),
          }
        );
        console.log(`✓ QR code email sent to ${visitor.email}`);
      } catch (emailError) {
        console.error('Failed to send QR code email:', emailError.message);
        // Don't fail the approval if email fails
      }
    }

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
    const { visitorId, phone } = req.body;

    // Support both visitorId and phone number
    let visitor;
    if (visitorId) {
      visitor = await Visitor.findById(visitorId);
    } else if (phone) {
      visitor = await Visitor.findOne({ phone, status: "approved" }).sort({ approvedAt: -1 });
    }

    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found or not approved" });
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

// Get approved visitors waiting for check-in (guard)
exports.getApprovedVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find({ status: "approved" }).sort({ approvedAt: -1 });
    res.json({ visitors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get active visitors (guard)
exports.getActiveVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find({ status: "checked-in" }).sort({ checkInTime: -1 });
    res.json({ visitors });
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
      visitor,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send QR code via email (manual send by host)
exports.sendQRCodeEmail = async (req, res) => {
  try {
    const { visitorId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email address required" });
    }

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    if (visitor.status !== "approved") {
      return res.status(400).json({ message: "Visitor must be approved first" });
    }

    if (!visitor.qrCode) {
      return res.status(400).json({ message: "QR code not generated yet" });
    }

    // Send QR code via email
    await sendQRCodeEmail(
      email,
      visitor.name,
      visitor.qrCode,
      {
        host: visitor.host,
        purpose: visitor.purpose,
        phone: visitor.phone,
        validUntil: visitor.validUntil ? visitor.validUntil.toLocaleString() : 'N/A',
      }
    );

    // Optionally update visitor's email if not set
    if (!visitor.email) {
      visitor.email = email;
      await visitor.save();
    }

    res.json({
      message: `QR code sent successfully to ${email}`,
    });
  } catch (error) {
    console.error('Failed to send QR code email:', error);
    res.status(500).json({ error: error.message });
  }
};
