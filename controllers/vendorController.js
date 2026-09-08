require("dotenv").config();
const mongoose = require("mongoose");
const Vendor = require("../models/Vendor");
const VendorBranch = require("../models/VendorBranch");
const OTP = require("../models/Otp");

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const nodemailer = require("nodemailer");

const { OAuth2Client } = require("google-auth-library");
const { body, validationResult } = require("express-validator");
const Order = require("../models/Order");

// ======================================================
// CONFIGURATIONS & HELPERS
// ======================================================
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateToken = (vendor) => {
  return jwt.sign({ id: vendor._id, role: "vendor" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const sendVendorResponse = (res, message, vendor) => {
  const token = generateToken(vendor);

  return res.status(200).json({
    success: true,
    message,
    token,
    vendor: {
      id: vendor._id,
      businessName: vendor.businessName,
      businessEmail: vendor.businessEmail,
      businessPhone: vendor.businessPhone,
      role: "vendor",
      isPhoneVerified: vendor.isPhoneVerified || false,
      isEmailVerified: vendor.isEmailVerified || false,
      verificationStatus: vendor.verificationStatus || "pending",
      isBlocked: vendor.isBlocked || false,
      isProfileCompleted: vendor.isProfileCompleted || false,
      lastLogin: vendor.lastLogin || null,
      // Owner Details
      ownerName: vendor.ownerName,
      ownerPhone: vendor.ownerPhone,
      ownerEmail: vendor.ownerEmail,
      profilePicture: vendor.profilePicture,

      // Flat CNIC & Personal Details (As defined in Schema)
      cnicNumber: vendor.cnicNumber,
      cnicFrontPicture: vendor.cnicFrontPicture,
      cnicBackPicture: vendor.cnicBackPicture,

      // Document Files / URLs
      incorporationCertificate: vendor.incorporationCertificate,
      foodSafetyLicense: vendor.foodSafetyLicense,
      ntnCertificate: vendor.ntnCertificate,

      // Profile & Store Details
      businessType: vendor.businessType,
      category: vendor.category,
      logo: vendor.logo,
      coverImage: vendor.coverImage,
      description: vendor.description,
      businessRegistrationNumber: vendor.businessRegistrationNumber,
      taxNumber: vendor.taxNumber,
      foodLicenseNumber: vendor.foodLicenseNumber,

      // Payout Object (Schema name matches 'payout')
      payout: vendor.payout || {},
    },
  });
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ======================================================
// SAVE FCM TOKEN
// ======================================================
exports.saveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await Vendor.findByIdAndUpdate(req.user.id, { fcmToken });

    return res.status(200).json({
      success: true,
      message: "FCM token saved successfully",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// OTP CONTROLLERS
// ======================================================
exports.sendOTP = async (req, res) => {
  try {
    const { vendorId, type, value, purpose } = req.body;

    if (!vendorId || !type || !value || !purpose) {
      return res.status(400).json({
        success: false,
        message: "vendorId, type, value, and purpose are required",
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const otp = generateOtp(); // e.g. "123456"
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    const queryFilter = { vendorId, purpose, type };
    const updateData = {
      vendorId,
      otp,
      type,
      purpose,
      verified: false,
      isUsed: false,
      attempts: 0,
      expiresAt,
      phone: type === "phone" ? value : null,
      email: type === "email" ? value : null,
    };

    // Upsert record cleanly into Database
    const savedOtp = await OTP.findOneAndUpdate(queryFilter, updateData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    console.log("OTP Saved in DB Successfully:", savedOtp);

    // Send Email if channel is email
    if (type === "email") {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: value,
        subject: "Vendor Verification OTP",
        html: `<h2>Your Vendor Verification OTP</h2><h1>${otp}</h1><p>Expires in 5 minutes</p>`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      // Production par 'otp' strip kar sakti hain:
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { vendorId, otp, purpose } = req.body;

    if (!vendorId || !otp || !purpose) {
      return res.status(400).json({
        success: false,
        message: "vendorId, otp, and purpose are required",
      });
    }

    // Find active non-used OTP
    const record = await OTP.findOne({
      vendorId,
      purpose,
      isUsed: false,
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or already used. Please request a new OTP.",
      });
    }

    // Check expiration
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }

    // Check OTP Match
    if (String(record.otp).trim() !== String(otp).trim()) {
      // Increment attempt counter
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      return res.status(400).json({ success: false, message: "Invalid OTP code" });
    }

    // Mark OTP as verified & used
    record.verified = true;
    record.isUsed = true;
    await record.save();

    // Fetch Vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    // Update Vendor Verification status according to schema keys
    if (purpose === "phone-verification") {
      if (record.phone) vendor.businessPhone = record.phone;
      vendor.isPhoneVerified = true;
      await vendor.save();
    } else if (purpose === "email-verification") {
      if (record.email) vendor.businessEmail = record.email;
      vendor.isEmailVerified = true;
      await vendor.save();
    }

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      vendor: vendorResponse,
    });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Random Password Generator (e.g. "Omnigo@8a3f9")
const generateRandomPassword = (length = 8) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";
  let password = "Omnigo@"; // Prefix for brand consistency
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// ======================================================
// SIGNUP & LOGIN
// ======================================================
exports.validateSignup = [
  body("businessPhone").notEmpty().withMessage("Phone number is required"),
  // body("businessEmail").isEmail().withMessage("Valid email is required"),
  // body("password")
  //   .isLength({ min: 6 })
  //   .withMessage("Password must be at least 6 characters"),
];

const BACKEND_URL = "https://omnigo-app-backend-production.up.railway.app";

// Helper Function: Local file upload ya URL string dono ko absolute backend URL me convert kar
const processMediaField = (bodyField, fileField, existingFieldValue) => {
  // 1. Agar new file upload hui hai via Multer
  if (fileField && fileField.filename) {
    return `${BACKEND_URL}/uploads/${fileField.filename}`;
  }

  // 2. Agar frontend ne simple filename ya local path pass kiya hai
  if (bodyField && typeof bodyField === "string" && bodyField.startsWith("uploads/")) {
    return `${BACKEND_URL}/${bodyField}`;
  }

  // 3. Agar naya URL string pass kiya hai
  if (bodyField && typeof bodyField === "string" && bodyField.trim() !== "") {
    return bodyField.trim();
  }

  // 4. Agar koi nayi file ya string nahi di, toh existing document/database value retained rahegi
  return existingFieldValue || "";
};

exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      // Vendor Documents & Verification
      cnicNumber,
      cnicFrontPicture,
      cnicBackPicture,
      incorporationCertificate,
      foodSafetyLicense,
      ntnCertificate,
      // Vendor Profile Details
      businessName,
      businessType,
      businessPhone,
      businessEmail,
      category,
      logo,
      coverImage,
      description,
      businessRegistrationNumber,
      taxNumber,
      foodLicenseNumber,

      // Owner information
      ownerName,
      ownerEmail,
      ownerPhone,
      profilePicture,

      // Payout Configuration
      payoutBankName,
      payoutAccountTitle,
      payoutAccountNumber,
      payoutPaymentMethod,
      payoutIban,
      payoutWalletNumber,
      // Initial Branch Details
      branchData,
    } = req.body;

    // File Object Extractors (Multer `req.files` support agar files upload ho rahi hain)
    const files = req.files || {};

    const normalizedPhone = String(businessPhone).trim();

    // 1. Check existing vendor
    const existingVendor = await Vendor.findOne({
      businessPhone: normalizedPhone,
    });
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered to a vendor",
      });
    }

    // 2. AUTO-GENERATE RANDOM PASSWORD
    const rawAutoPassword = generateRandomPassword(6); // Generates e.g., "Omnigo@k79f2"
    const hash = await bcrypt.hash(rawAutoPassword, 12);

    // 3. Build vendorData Object cleanly matching your Schema EXACTLY
    const vendorData = {
      businessName: businessName || `Vendor_${normalizedPhone.slice(-4)}`,
      businessPhone: normalizedPhone,
      businessEmail: businessEmail
        ? String(businessEmail).toLowerCase().trim()
        : "",
      password: hash,

      // Account Status Flags
      isPhoneVerified: false,
      isEmailVerified: false,
      verificationStatus: "pending", // Schema Enum match: ["draft", "pending_review", "approved", "rejected", "suspended"]
      isBlocked: false,

      // Owner Details
      ownerName: ownerName || "",
      ownerPhone: ownerPhone || "",
      ownerEmail: ownerEmail ? String(ownerEmail).toLowerCase().trim() : String(businessEmail).toLowerCase().trim(),
      profilePicture: processMediaField(
        profilePicture,
        files.profilePicture?.[0],
      ),

      // Flat CNIC & Personal Details (As defined in Schema)
      cnicNumber: cnicNumber || "",
      cnicFrontPicture: processMediaField(
        cnicFrontPicture,
        files.cnicFrontPicture?.[0],
      ),
      cnicBackPicture: processMediaField(
        cnicBackPicture,
        files.cnicBackPicture?.[0],
      ),

      // Document Files / URLs
      incorporationCertificate: processMediaField(
        incorporationCertificate,
        files.incorporationCertificate?.[0],
      ),
      foodSafetyLicense: processMediaField(
        foodSafetyLicense,
        files.foodSafetyLicense?.[0],
      ),
      ntnCertificate: processMediaField(
        ntnCertificate,
        files.ntnCertificate?.[0],
      ),

      // Profile & Store Details
      businessType: businessType || "restaurant",
      category: category || "",
      logo: processMediaField(logo, files.logo?.[0]),
      coverImage: processMediaField(coverImage, files.coverImage?.[0]),
      description: description || "",
      businessRegistrationNumber: businessRegistrationNumber || "",
      taxNumber: taxNumber || "",
      foodLicenseNumber: foodLicenseNumber || "",

      // Payout Object (Schema name matches 'payout')
      payout: {
        accountHolderName: payoutAccountTitle || "",
        paymentMethod: payoutPaymentMethod || "bank",
        bankName: payoutBankName || "",
        accountNumber: payoutAccountNumber || "",
        iban: payoutIban || "",
        walletNumber: payoutWalletNumber || "",
        isVerified: false,
      },
    };

    // 4. Save Vendor to MongoDB
    const vendor = await Vendor.create(vendorData);

    // 5. Create Initial Operational Branch (If Provided)
    let defaultBranch = null;
    if (branchData) {
      const parsedBranch =
        typeof branchData === "string" ? JSON.parse(branchData) : branchData;
      const {
        branchName,
        phone: branchPhone,
        address,
        area,
        city,
        longitude,
        latitude,
      } = parsedBranch;

      defaultBranch = await VendorBranch.create({
        vendorId: vendor._id,
        branchName: branchName || `${vendor.businessName} Main Branch`,
        phone: branchPhone || vendor.businessPhone,
        address: address || "",
        area: area || "",
        city: city || "",
        location: {
          type: "Point",
          coordinates: [Number(longitude) || 0, Number(latitude) || 0],
        },
        isActive: true,
        isOpen: true,
      });
    }

    // =========================================================================
    // 📡 6. REAL-TIME SOCKET EMIT & PUSH NOTIFICATIONS
    // =========================================================================
    const io = req.app.get("io");

    const payloadData = {
      vendorId: vendor._id,
      businessName: vendor.businessName,
      logo: vendor.logo,
      category: vendor.category,
      branch: defaultBranch,
    };

    if (io) {
      // 1. Emit to ALL Connected Users (Real-time update on user main screen)
      io.to("role:user").emit("newVendorAdded", {
        message: "A new vendor has joined Omnigo!",
        vendor: payloadData,
      });

      // 2. Emit to Admin Panel (For verification review)
      io.to("role:admin").emit("newVendorRegisteredAdmin", {
        message: "New vendor registered and pending approval",
        vendorId: vendor._id,
      });
    }

    // 3. Send Push Notifications via FCM (If FCM Service is configured)
    try {
      // Send FCM to Users
      await sendFCMNotificationToTopic({
        topic: "users",
        title: `New ${vendor.businessType} On Omnigo!`,
        body: `${vendor.businessName} is now available near you. Order now!`,
        data: { type: "NEW_VENDOR", vendorId: String(vendor._id) },
      });

      // Send FCM to Riders
      await sendFCMNotificationToTopic({
        topic: "riders",
        title: "New Partner Onboarded 🚀",
        body: `${vendor.businessName} joined Omnigo. Get ready for new pickup orders!`,
        data: { type: "NEW_VENDOR_RIDER", vendorId: String(vendor._id) },
      });
    } catch (notifErr) {
      console.error("FCM Notification Error (Non-blocking):", notifErr.message);
    }

    // Response Preparation
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

   return sendVendorResponse(
      res,
      "Vendor signup successful",
      { vendor: vendorResponse, branch: defaultBranch, tempPassword: rawAutoPassword },
      201
    );
  } catch (err) {
    console.error("VENDOR SIGNUP ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { businessPhone, businessEmail, password } = req.body;
    let vendor = null;

    if (businessEmail) {
      vendor = await Vendor.findOne({ businessEmail: businessEmail.toLowerCase().trim() });
    } else if (businessPhone) {
      vendor = await Vendor.findOne({ businessPhone: String(businessPhone).trim() });
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide phone or email to log in",
      });
    }

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (vendor.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your vendor account has been suspended.",
      });
    }

    // const match = await bcrypt.compare(password, vendor.password);
    // if (!match) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid credentials",
    //   });
    // }

    vendor.lastLogin = new Date();
    await vendor.save();

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    return sendVendorResponse(res, "Vendor login successful", vendorResponse);
  } catch (err) {
    console.error("VENDOR LOGIN ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// OAUTH LOGINS
// ======================================================
exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email, sub } = ticket.getPayload();
    let vendor = await Vendor.findOne({ email });

    if (!vendor) {
      vendor = await Vendor.create({
        name,
        email,
        googleId: sub,
        isEmailVerified: true,
      });
    }

    return sendVendorResponse(res, "Google login successful", vendor);
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid Google Token" });
  }
};

exports.facebookLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;
    const response = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`,
    );

    const { id, name, email } = response.data;
    let vendor = await Vendor.findOne({ email });

    if (!vendor) {
      vendor = await Vendor.create({
        name,
        email,
        facebookId: id,
        isEmailVerified: true,
      });
    }

    return sendVendorResponse(res, "Facebook login successful", vendor);
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid Facebook Token" });
  }
};

// ======================================================
// FORGOT & RESET PASSWORD
// ======================================================
exports.forgotPassword = async (req, res) => {
  try {
    const { businessEmail, businessPhone } = req.body;

    if (!businessEmail && !businessPhone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone is required",
      });
    }

    const vendor = await Vendor.findOne({
      $or: [...(businessEmail ? [{ businessEmail }] : []), ...(businessPhone ? [{ businessPhone }] : [])],
    });

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    const otp = generateOtp();

    if (businessEmail) {
      await OTP.findOneAndUpdate(
        { userId: vendor._id, purpose: "forgot-password" },
        {
          userId: vendor._id,
          businessEmail: vendor.businessEmail,
          otp,
          type: "email",
          purpose: "forgot-password",
          verified: false,
          isUsed: false,
          expiresAt: Date.now() + 5 * 60 * 1000,
        },
        { upsert: true, new: true },
      );

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: businessEmail,
        subject: "Vendor Password Reset OTP",
        html: `<h2>Password Reset OTP</h2><h1>${otp}</h1><p>Expires in 5 minutes</p>`,
      });

      return res.status(200).json({
        success: true,
        vendorId: vendor._id,
        type: "email",
        message: "OTP sent to email",
      });
    }

    if (businessPhone) {
      await OTP.findOneAndUpdate(
        { userId: vendor._id, purpose: "forgot-password" },
        {
          userId: vendor._id,
          businessPhone: vendor.businessPhone,
          otp,
          type: "phone",
          purpose: "forgot-password",
          verified: false,
          isUsed: false,
          expiresAt: Date.now() + 5 * 60 * 1000,
        },
        { upsert: true, new: true },
      );

      return res.status(200).json({
        success: true,
        vendorId: vendor._id,
        type: "phone",
        message: "OTP sent to phone",
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { vendorId, newPassword } = req.body;

    if (!vendorId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "vendorId and newPassword required",
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    const record = await OTP.findOne({
      userId: vendorId,
      purpose: "forgot-password",
      verified: true,
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP verification required prior to password reset",
      });
    }

    vendor.password = await bcrypt.hash(newPassword, 12);
    vendor.lastPasswordChanged = new Date();
    await vendor.save();

    await OTP.deleteOne({ _id: record._id });

    return res.status(200).json({
      success: true,
      vendorId: vendor._id,
      message: "Password reset successful",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// COMPLETE VENDOR PROFILE & INITIAL BRANCH CREATION
// ======================================================
exports.updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.user.id || req.user._id;

    const {
      // Vendor Documents & Verification
      cnicNumber,
      cnicFrontPicture,
      cnicBackPicture,
      incorporationCertificate,
      foodSafetyLicense,
      ntnCertificate,
      // Vendor Profile Details
      businessName,
      businessType,
      businessPhone,
      businessEmail,
      category,
      logo,
      coverImage,
      description,
      businessRegistrationNumber,
      taxNumber,
      foodLicenseNumber,

      // Owner Information
      ownerName,
      ownerEmail,
      ownerPhone,
      profilePicture,

      // Payout Configuration
      payoutBankName,
      payoutAccountTitle,
      payoutAccountNumber,
      payoutPaymentMethod,
      payoutIban,
      payoutWalletNumber,

      // Initial Branch Details
      branchData,
    } = req.body;

    // Files Object from Multer Middleware
    const files = req.files || {};

    // 1. Fetch Vendor
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor account not found",
      });
    }

    // 2. Core & Business Profile Details Update
    if (businessName) vendor.businessName = businessName;
    if (businessEmail) vendor.businessEmail = String(businessEmail).toLowerCase().trim();
    if (businessPhone) vendor.businessPhone = String(businessPhone).trim();

    if (businessType) vendor.businessType = businessType;
    if (category) vendor.category = category;
    if (description) vendor.description = description;

    if (businessRegistrationNumber) vendor.businessRegistrationNumber = businessRegistrationNumber;
    if (taxNumber) vendor.taxNumber = taxNumber;
    if (foodLicenseNumber) vendor.foodLicenseNumber = foodLicenseNumber;

    // 3. Owner Information Update
    if (ownerName) vendor.ownerName = ownerName;
    if (ownerPhone) vendor.ownerPhone = ownerPhone;
    if (ownerEmail) vendor.ownerEmail = String(ownerEmail).toLowerCase().trim();

    // 4. Process Images and Document Uploads (Supports File Objects & Direct URLs)
    vendor.profilePicture = processMediaField(profilePicture, files.profilePicture?.[0], vendor.profilePicture);
    vendor.logo = processMediaField(logo, files.logo?.[0], vendor.logo);
    vendor.coverImage = processMediaField(coverImage, files.coverImage?.[0], vendor.coverImage);

    vendor.cnicNumber = cnicNumber || vendor.cnicNumber || "";
    vendor.cnicFrontPicture = processMediaField(cnicFrontPicture, files.cnicFrontPicture?.[0], vendor.cnicFrontPicture);
    vendor.cnicBackPicture = processMediaField(cnicBackPicture, files.cnicBackPicture?.[0], vendor.cnicBackPicture);

    vendor.incorporationCertificate = processMediaField(incorporationCertificate, files.incorporationCertificate?.[0], vendor.incorporationCertificate);
    vendor.foodSafetyLicense = processMediaField(foodSafetyLicense, files.foodSafetyLicense?.[0], vendor.foodSafetyLicense);
    vendor.ntnCertificate = processMediaField(ntnCertificate, files.ntnCertificate?.[0], vendor.ntnCertificate);

    // 5. Payout Details Update (Matching your Mongoose Schema)
    vendor.payout = {
      accountHolderName: payoutAccountTitle || vendor.payout?.accountHolderName || "",
      paymentMethod: payoutPaymentMethod || vendor.payout?.paymentMethod || "bank",
      bankName: payoutBankName || vendor.payout?.bankName || "",
      accountNumber: payoutAccountNumber || vendor.payout?.accountNumber || "",
      iban: payoutIban || vendor.payout?.iban || "",
      walletNumber: payoutWalletNumber || vendor.payout?.walletNumber || "",
      isVerified: vendor.payout?.isVerified || false,
    };

    // Status Update
    vendor.verificationStatus = "pending_review"; // Matches enum: ["draft", "pending_review", "approved", "rejected", "suspended"]
    
    await vendor.save();

    // 6. Create or Update Branch (If Provided)
    let defaultBranch = null;
    if (branchData) {
      const parsedBranch = typeof branchData === "string" ? JSON.parse(branchData) : branchData;
      const {
        branchName,
        phone: branchPhone,
        address,
        area,
        city,
        longitude,
        latitude,
      } = parsedBranch;

      defaultBranch = await VendorBranch.create({
        vendorId: vendor._id,
        branchName: branchName || `${vendor.businessName} Main Branch`,
        phone: branchPhone || vendor.businessPhone,
        address: address || "",
        area: area || "",
        city: city || "",
        location: {
          type: "Point",
          coordinates: [Number(longitude) || 0, Number(latitude) || 0],
        },
        isActive: true,
        isOpen: true,
      });
    }

    // Prepare Clean Response
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    return res.status(200).json({
      success: true,
      message: "Vendor profile updated successfully and submitted for review",
      vendor: vendorResponse,
      branch: defaultBranch,
    });
  } catch (err) {
    console.error("UPDATE VENDOR PROFILE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =======================
// Get All Vendors
// =======================
exports.getAllVendors = async (req, res) => {
  try {
    const { status, search } = req.query;

    const filter = {};

    if (status && status !== "all") {
      if (status === "blocked") filter.isBlocked = true;
      if (status === "active") filter.isBlocked = false;
    }

    const vendors = await Vendor.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      vendors,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =======================
// Get All Vendor By Id
// =======================
exports.getVendorById = async (req, res) => {
  try {
    const vendorId = req.params.vendorId || req.user?.id;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    const vendor = await Vendor.findById(vendorId);
    const vendorBranch = await VendorBranch.findById(vendorId);

    res.json({
      success: true,
      vendor,
      vendorBranch,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ====================================
// Get All Vendor Home Screen Details
// =====================================
// exports.getVendorHomeScreenDetails = async (req, res) => {
//   try {
//     // Determine vendorId from query, params, or decoded JWT auth token
//     const vendorId = req.params.vendorId || req.user?.id;

//     if (!vendorId) {
//       return res.status(400).json({
//         success: false,
//         message: "Vendor ID is required",
//       });
//     }

//     // 1. Fetch Vendor Profile details
//     const vendor = await Vendor.findById(vendorId).select(
//       "name email phone vendorProfile.businessName vendorProfile.logo vendorProfile.coverImage verificationStatus isProfileCompleted",
//     );

//     if (!vendor) {
//       return res.status(404).json({
//         success: false,
//         message: "Vendor not found",
//       });
//     }

//     // 2. Fetch all Operational Branches associated with this Vendor
//     const branches = await VendorBranch.find({ vendorId }).select(
//       "branchName phone address city area isOpen isActive location openingHours",
//     );

//     return res.status(200).json({
//       success: true,
//       vendor: {
//         id: vendor._id,
//         name: vendor.name,
//         businessName: vendor.vendorProfile?.businessName || vendor.name,
//         logo: vendor.vendorProfile?.logo || null,
//         coverImage: vendor.vendorProfile?.coverImage || null,
//         verificationStatus: vendor.verificationStatus,
//         isProfileCompleted: vendor.isProfileCompleted,
//       },
//       branches,
//       activeBranchCount: branches.filter((b) => b.isActive).length,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };


exports.getVendorDashboardOverview = async (req, res) => {
  try {
    const vendorId = req.user.vendorId; // Extract from Auth middleware
    const { timeframe = "weekly" } = req.query;

    // 1. Calculate Start & End Date based on timeframe filter
    const now = new Date();
    let startDate = new Date();
    
    if (timeframe === "daily") {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "weekly") {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === "monthly") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === "yearly") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    // 2. Fetch Vendor Profile Info
    const vendor = await Vendor.findById(vendorId).select(
      "name logo openTime closeTime rushMode rating"
    );

    // 3. Aggregate Orders & Revenue Metrics
    const matchStage = {
      vendorId: vendor._id,
      createdAt: { $gte: startDate, $lte: now }
    };

    // Orders Breakdown (Total, Completed, Cancelled)
    const orderStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
          },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, "$totalAmount", 0]
            }
          }
        }
      }
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0
    };

    // 4. Aggregate Chart Data (Group by Day / Date)
    const chartData = await Order.aggregate([
      { 
        $match: { 
          vendorId: vendor._id, 
          status: "completed", 
          createdAt: { $gte: startDate, $lte: now } 
        } 
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" }, // 1 = Sun, 2 = Mon, etc.
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 5. Build Response
    return res.status(200).json({
      success: true,
      message: "Vendor overview retrieved successfully",
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          logo: vendor.logo,
          timings: {
            openTime: vendor.openTime,
            closeTime: vendor.closeTime
          },
          rushMode: vendor.rushMode,
          rating: vendor.rating || 0.0
        },
        filter: timeframe,
        revenue: {
          totalAmount: stats.totalRevenue,
          currency: "pkr",
          peakDay: {
            day: "Saturday", // Dynamic calculate from peak day array
            amount: 4086,
            note: "up from 4,086 last week"
          },
          percentageChange: 20,
          chartData: chartData // Format array according to chart library
        },
        orders: {
          total: stats.totalOrders,
          completed: stats.completedOrders,
          cancelled: stats.cancelledOrders,
          statusNote: stats.cancelledOrders === 0 
            ? `No order is cancelled this ${timeframe === 'weekly' ? 'week' : 'period'}.` 
            : `${stats.cancelledOrders} order(s) cancelled.`
        }
      }
    });

  } catch (error) {
    console.error("Dashboard Overview Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching vendor overview",
      error: error.message
    });
  }
};