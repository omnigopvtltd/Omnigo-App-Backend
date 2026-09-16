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
const Deal = require("../models/Deal");
const Product = require("../models/Product");
const { createAndSendNotification } = require("./adminController");
const Campaign = require("../models/Campaign");

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

const sendVendorResponse = (res, message, payload, statusCode = 200) => {
  // Extract vendor object whether passed directly or nested inside payload
  const vendorObj = payload.vendor || payload;
  const branchObj = payload.branch || null;
  const tempPassword = payload.tempPassword || null;

  // Generate token from the actual vendor object
  const token = generateToken(vendorObj);

  const responseBody = {
    success: true,
    message,
    token,
    vendor: {
      id: vendorObj._id || vendorObj.id,
      businessName: vendorObj.businessName || "",
      businessEmail: vendorObj.businessEmail || "",
      businessPhone: vendorObj.businessPhone || "",
      role: "vendor",
      isPhoneVerified: vendorObj.isPhoneVerified || false,
      isEmailVerified: vendorObj.isEmailVerified || false,
      verificationStatus: vendorObj.verificationStatus || "pending",
      isBlocked: vendorObj.isBlocked || false,
      isProfileCompleted: vendorObj.isProfileCompleted || false,
      lastLogin: vendorObj.lastLogin || null,

      // Owner Details
      ownerName: vendorObj.ownerName || "",
      ownerPhone: vendorObj.ownerPhone || "",
      ownerEmail: vendorObj.ownerEmail || "",
      profilePicture: vendorObj.profilePicture || "",

      // Flat CNIC & Personal Details
      cnicNumber: vendorObj.cnicNumber || "",
      cnicFrontPicture: vendorObj.cnicFrontPicture || "",
      cnicBackPicture: vendorObj.cnicBackPicture || "",

      // Document Files / URLs
      incorporationCertificate: vendorObj.incorporationCertificate || "",
      foodSafetyLicense: vendorObj.foodSafetyLicense || "",
      ntnCertificate: vendorObj.ntnCertificate || "",

      // Profile & Store Details
      businessType: vendorObj.businessType || "restaurant",
      category: vendorObj.category || "",
      logo: vendorObj.logo || "",
      coverImage: vendorObj.coverImage || "",
      description: vendorObj.description || "",
      businessRegistrationNumber: vendorObj.businessRegistrationNumber || "",
      taxNumber: vendorObj.taxNumber || "",
      foodLicenseNumber: vendorObj.foodLicenseNumber || "",

      branches: vendorObj.branches || [],

      // Payout Object
      payout: vendorObj.payout || {},
    },
  };

  // Attach optional details if present
  if (branchObj) {
    responseBody.branch = branchObj;
  }

  if (tempPassword) {
    responseBody.tempPassword = tempPassword;
  }

  return res.status(statusCode).json(responseBody);
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
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }

    // Check OTP Match
    if (String(record.otp).trim() !== String(otp).trim()) {
      // Increment attempt counter
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP code" });
    }

    // Mark OTP as verified & used
    record.verified = true;
    record.isUsed = true;
    await record.save();

    // Fetch Vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
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
  if (
    bodyField &&
    typeof bodyField === "string" &&
    bodyField.startsWith("uploads/")
  ) {
    return `${BACKEND_URL}/${bodyField}`;
  }

  // 3. Agar naya URL string pass kiya hai
  if (bodyField && typeof bodyField === "string" && bodyField.trim() !== "") {
    return bodyField.trim();
  }

  // 4. Agar koi nayi file ya string nahi di, toh existing document/database value retained rahegi
  return existingFieldValue || "";
};

// exports.signup = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ success: false, errors: errors.array() });
//     }

//     const {
//       // Vendor Documents & Verification
//       cnicNumber,
//       cnicFrontPicture,
//       cnicBackPicture,
//       incorporationCertificate,
//       foodSafetyLicense,
//       ntnCertificate,
//       // Vendor Profile Details
//       businessName,
//       businessType,
//       businessPhone,
//       businessEmail,
//       category,
//       logo,
//       coverImage,
//       description,
//       businessRegistrationNumber,
//       taxNumber,
//       foodLicenseNumber,

//       // Owner information
//       ownerName,
//       ownerEmail,
//       ownerPhone,
//       profilePicture,

//       // Payout Configuration
//       payoutBankName,
//       payoutAccountTitle,
//       payoutAccountNumber,
//       payoutPaymentMethod,
//       payoutIban,
//       payoutWalletNumber,
//       // Initial Branch Details
//       branchData,
//     } = req.body;

//     // File Object Extractors (Multer `req.files` support agar files upload ho rahi hain)
//     const files = req.files || {};

//     const normalizedPhone = String(businessPhone).trim();

//     // 1. Check existing vendor
//     const existingVendor = await Vendor.findOne({
//       businessPhone: normalizedPhone,
//     });
//     if (existingVendor) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone number already registered to a vendor",
//       });
//     }

//     // 2. AUTO-GENERATE RANDOM PASSWORD
//     const rawAutoPassword = generateRandomPassword(6); // Generates e.g., "Omnigo@k79f2"
//     const hash = await bcrypt.hash(rawAutoPassword, 12);

//     // 3. Build vendorData Object cleanly matching your Schema EXACTLY
//     const vendorData = {
//       businessName: businessName || `Vendor_${normalizedPhone.slice(-4)}`,
//       businessPhone: normalizedPhone,
//       businessEmail: businessEmail
//         ? String(businessEmail).toLowerCase().trim()
//         : "",
//       password: hash,

//       // Account Status Flags
//       isPhoneVerified: false,
//       isEmailVerified: false,
//       verificationStatus: "pending", // Schema Enum match: ["draft", "pending", "approved", "rejected", "suspended"]
//       isBlocked: false,

//       // Owner Details
//       ownerName: ownerName || "",
//       ownerPhone: ownerPhone || "",
//       ownerEmail: ownerEmail
//         ? String(ownerEmail).toLowerCase().trim()
//         : String(businessEmail).toLowerCase().trim(),
//       profilePicture: processMediaField(
//         profilePicture,
//         files.profilePicture?.[0],
//       ),

//       // Flat CNIC & Personal Details (As defined in Schema)
//       cnicNumber: cnicNumber || "",
//       cnicFrontPicture: processMediaField(
//         cnicFrontPicture,
//         files.cnicFrontPicture?.[0],
//       ),
//       cnicBackPicture: processMediaField(
//         cnicBackPicture,
//         files.cnicBackPicture?.[0],
//       ),

//       // Document Files / URLs
//       incorporationCertificate: processMediaField(
//         incorporationCertificate,
//         files.incorporationCertificate?.[0],
//       ),
//       foodSafetyLicense: processMediaField(
//         foodSafetyLicense,
//         files.foodSafetyLicense?.[0],
//       ),
//       ntnCertificate: processMediaField(
//         ntnCertificate,
//         files.ntnCertificate?.[0],
//       ),

//       // Profile & Store Details
//       businessType: businessType || "restaurant",
//       category: category || "",
//       logo: processMediaField(logo, files.logo?.[0]),
//       coverImage: processMediaField(coverImage, files.coverImage?.[0]),
//       description: description || "",
//       businessRegistrationNumber: businessRegistrationNumber || "",
//       taxNumber: taxNumber || "",
//       foodLicenseNumber: foodLicenseNumber || "",

//       // Payout Object (Schema name matches 'payout')
//       payout: {
//         accountHolderName: payoutAccountTitle || "",
//         paymentMethod: payoutPaymentMethod || "bank",
//         bankName: payoutBankName || "",
//         accountNumber: payoutAccountNumber || "",
//         iban: payoutIban || "",
//         walletNumber: payoutWalletNumber || "",
//         isVerified: false,
//       },
//     };

//     // 4. Save Vendor to MongoDB
//     const vendor = await Vendor.create(vendorData);

//     // 5. Create Initial Operational Branch (If Provided)
//     let defaultBranch = null;
//     if (branchData) {
//       const parsedBranch =
//         typeof branchData === "string" ? JSON.parse(branchData) : branchData;
//       const {
//         branchName,
//         phone: branchPhone,
//         address,
//         area,
//         city,
//         longitude,
//         latitude,
//       } = parsedBranch;

//       defaultBranch = await VendorBranch.create({
//         vendorId: vendor._id,
//         branchName: branchName || `${vendor.businessName} Main Branch`,
//         phone: branchPhone || vendor.businessPhone,
//         address: address || "",
//         area: area || "",
//         city: city || "",
//         location: {
//           type: "Point",
//           coordinates: [Number(longitude) || 0, Number(latitude) || 0],
//         },
//         isActive: true,
//         isRushMode:true,
//         isOpen: true,
//       });
//     }

//     // =========================================================================
//     // 📡 6. REAL-TIME SOCKET EMIT & PUSH NOTIFICATIONS
//     // =========================================================================
//     const io = req.app.get("io");

//     const payloadData = {
//       vendorId: vendor._id,
//       businessName: vendor.businessName,
//       logo: vendor.logo,
//       category: vendor.category,
//       branch: defaultBranch,
//     };

//     if (io) {
//       // 1. Emit to ALL Connected Users (Real-time update on user main screen)
//       io.to("role:user").emit("newVendorAdded", {
//         message: "A new vendor has joined Omnigo!",
//         vendor: payloadData,
//       });

//       // 2. Emit to Admin Panel (For verification review)
//       io.to("role:admin").emit("newVendorRegisteredAdmin", {
//         message: "New vendor registered and pending approval",
//         vendorId: vendor._id,
//       });
//     }

//     // 3. Send Push Notifications via FCM (If FCM Service is configured)
//     try {
//       // Send FCM to Users
//       await sendFCMNotificationToTopic({
//         topic: "users",
//         title: `New ${vendor.businessType} On Omnigo!`,
//         body: `${vendor.businessName} is now available near you. Order now!`,
//         data: { type: "NEW_VENDOR", vendorId: String(vendor._id) },
//       });

//       // Send FCM to Riders
//       await sendFCMNotificationToTopic({
//         topic: "riders",
//         title: "New Partner Onboarded 🚀",
//         body: `${vendor.businessName} joined Omnigo. Get ready for new pickup orders!`,
//         data: { type: "NEW_VENDOR_RIDER", vendorId: String(vendor._id) },
//       });
//     } catch (notifErr) {
//       console.error("FCM Notification Error (Non-blocking):", notifErr.message);
//     }
// // Response Preparation
// const vendorResponse = vendor.toObject();
// delete vendorResponse.password;

// return sendVendorResponse(
//   res,
//   "Vendor signup successful",
//   {
//     vendor: vendorResponse,
//     branch: defaultBranch,
//     tempPassword: rawAutoPassword,
//   },
//   201
//     );
//   } catch (err) {
//     console.error("VENDOR SIGNUP ERROR:", err);
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

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

      // Branch Details (Supports single Object or Array of Objects)
      branchData,
    } = req.body;

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
    const rawAutoPassword = generateRandomPassword(6);
    const hash = await bcrypt.hash(rawAutoPassword, 12);

    // 3. Build vendorData Object
    const vendorData = {
      businessName: businessName || `Vendor_${normalizedPhone.slice(-4)}`,
      businessPhone: normalizedPhone,
      businessEmail: businessEmail
        ? String(businessEmail).toLowerCase().trim()
        : "",
      password: hash,

      isPhoneVerified: false,
      isEmailVerified: false,
      verificationStatus: "pending",
      isBlocked: false,

      ownerName: ownerName || "",
      ownerPhone: ownerPhone || "",
      ownerEmail: ownerEmail
        ? String(ownerEmail).toLowerCase().trim()
        : String(businessEmail).toLowerCase().trim(),
      profilePicture: processMediaField(
        profilePicture,
        files.profilePicture?.[0],
      ),

      cnicNumber: cnicNumber || "",
      cnicFrontPicture: processMediaField(
        cnicFrontPicture,
        files.cnicFrontPicture?.[0],
      ),
      cnicBackPicture: processMediaField(
        cnicBackPicture,
        files.cnicBackPicture?.[0],
      ),

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

      businessType: businessType || "restaurant",
      category: category || "",
      logo: processMediaField(logo, files.logo?.[0]),
      coverImage: processMediaField(coverImage, files.coverImage?.[0]),
      description: description || "",
      businessRegistrationNumber: businessRegistrationNumber || "",
      taxNumber: taxNumber || "",
      foodLicenseNumber: foodLicenseNumber || "",

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

    // 5. CREATE OPERATIONAL BRANCHES (Handles Single & Multiple Branches)
    let createdBranches = [];

    if (branchData) {
      let parsedBranches = [];

      // Parse JSON string if sent via FormData
      if (typeof branchData === "string") {
        try {
          parsedBranches = JSON.parse(branchData);
        } catch (e) {
          parsedBranches = [];
        }
      } else {
        parsedBranches = branchData;
      }

      // Convert Single Branch Object to Array
      if (!Array.isArray(parsedBranches)) {
        parsedBranches = [parsedBranches];
      }

      // Format branches payload for insertMany
      const branchesToInsert = parsedBranches.map((b, index) => ({
        vendorId: vendor._id,
        branchName:
          b.branchName ||
          `${vendor.businessName} ${index === 0 ? "Main Branch" : `Branch ${index + 1}`}`,
        phone: b.phone || vendor.businessPhone,
        address: b.address || "",
        area: b.area || "",
        city: b.city || "",
        location: {
          type: "Point",
          coordinates: [Number(b.longitude) || 0, Number(b.latitude) || 0],
        },
        isActive: true,
        isRushMode: false,
        isOpen: true,
      }));

      // Batch Insert in DB
      if (branchesToInsert.length > 0) {
        createdBranches = await VendorBranch.insertMany(branchesToInsert);
      }
    }

    // 6. REAL-TIME SOCKET EMIT & PUSH NOTIFICATIONS
    const io = req.app.get("io");

    const payloadData = {
      vendorId: vendor._id,
      businessName: vendor.businessName,
      logo: vendor.logo,
      category: vendor.category,
      branches: createdBranches,
    };

    if (io) {
      io.to("role:user").emit("newVendorAdded", {
        message: "A new vendor has joined Omnigo!",
        vendor: payloadData,
      });

      io.to("role:admin").emit("newVendorRegisteredAdmin", {
        message: "New vendor registered and pending approval",
        vendorId: vendor._id,
      });
    }

    try {
      await sendFCMNotificationToTopic({
        topic: "users",
        title: `New ${vendor.businessType} On Omnigo!`,
        body: `${vendor.businessName} is now available near you. Order now!`,
        data: { type: "NEW_VENDOR", vendorId: String(vendor._id) },
      });

      await sendFCMNotificationToTopic({
        topic: "riders",
        title: "New Partner Onboarded 🚀",
        body: `${vendor.businessName} joined Omnigo. Get ready for new pickup orders!`,
        data: { type: "NEW_VENDOR_RIDER", vendorId: String(vendor._id) },
      });
    } catch (notifErr) {
      console.error("FCM Notification Error (Non-blocking):", notifErr.message);
    }

    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    return sendVendorResponse(
      res,
      "Vendor signup successful",
      {
        vendor: vendorResponse,
        branches: createdBranches, // Array of created branches
        tempPassword: rawAutoPassword,
      },
      201,
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
      vendor = await Vendor.findOne({
        businessEmail: businessEmail.toLowerCase().trim(),
      });
    } else if (businessPhone) {
      vendor = await Vendor.findOne({
        businessPhone: String(businessPhone).trim(),
      });
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

    await createAndSendNotification(req.app, {
      recipientId: `${vendor._id}`, // Must be valid ObjectId string
      recipientModel: "Vendor",
      title: "Succesfully Logged In",
      message: "You have successfully logged in.",
      type: "system", // Explicitly handle string
      // data: { orderId: "12345" },
    });
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
      $or: [
        ...(businessEmail ? [{ businessEmail }] : []),
        ...(businessPhone ? [{ businessPhone }] : []),
      ],
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
      // Basic Info & UI Fields
      storeName,
      businessDescription,
      logoImage,
      bannerImage,
      noOfBranches,
      isStoreHoursActive,
      storeHours,

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
    vendor.businessName = storeName || businessName || vendor.businessName;
    vendor.description =
      businessDescription || description || vendor.description;
    vendor.noOfBranches =
      noOfBranches !== undefined ? noOfBranches : vendor.noOfBranches;

    if (businessEmail)
      vendor.businessEmail = String(businessEmail).toLowerCase().trim();
    if (businessPhone) vendor.businessPhone = String(businessPhone).trim();

    if (businessType) vendor.businessType = businessType;
    if (category) vendor.category = category;

    if (businessRegistrationNumber)
      vendor.businessRegistrationNumber = businessRegistrationNumber;
    if (taxNumber) vendor.taxNumber = taxNumber;
    if (foodLicenseNumber) vendor.foodLicenseNumber = foodLicenseNumber;

    // 3. Store Hours Update (Flexible for open/close & timeFrom/timeTo formats)
    let formattedStoreHours = vendor.storeHours || [];

    if (isStoreHoursActive !== undefined) {
      vendor.isStoreHoursActive = Boolean(isStoreHoursActive);
    }

    if (storeHours) {
      const parsedHours =
        typeof storeHours === "string" ? JSON.parse(storeHours) : storeHours;
      if (Array.isArray(parsedHours)) {
        formattedStoreHours = parsedHours.map((schedule) => ({
          day: schedule.day,
          timeFrom: schedule.timeFrom || schedule.open || "",
          timeTo: schedule.timeTo || schedule.close || "",
          isOpen: schedule.isOpen !== undefined ? schedule.isOpen : true,
        }));
        vendor.storeHours = formattedStoreHours;
      }
    }

    // 4. Owner Information Update
    if (ownerName) vendor.ownerName = ownerName;
    if (ownerPhone) vendor.ownerPhone = ownerPhone;
    if (ownerEmail) vendor.ownerEmail = String(ownerEmail).toLowerCase().trim();

    // 5. Documents & Media Processing
    vendor.profilePicture = processMediaField(
      profilePicture,
      files.profilePicture?.[0],
      vendor.profilePicture,
    );
    vendor.logo = processMediaField(
      logoImage || logo,
      files.logoImage?.[0] || files.logo?.[0],
      vendor.logo,
    );
    vendor.coverImage = processMediaField(
      bannerImage || coverImage,
      files.bannerImage?.[0] || files.coverImage?.[0],
      vendor.coverImage,
    );

    vendor.cnicNumber = cnicNumber || vendor.cnicNumber || "";
    vendor.cnicFrontPicture = processMediaField(
      cnicFrontPicture,
      files.cnicFrontPicture?.[0],
      vendor.cnicFrontPicture,
    );
    vendor.cnicBackPicture = processMediaField(
      cnicBackPicture,
      files.cnicBackPicture?.[0],
      vendor.cnicBackPicture,
    );

    vendor.incorporationCertificate = processMediaField(
      incorporationCertificate,
      files.incorporationCertificate?.[0],
      vendor.incorporationCertificate,
    );
    vendor.foodSafetyLicense = processMediaField(
      foodSafetyLicense,
      files.foodSafetyLicense?.[0],
      vendor.foodSafetyLicense,
    );
    vendor.ntnCertificate = processMediaField(
      ntnCertificate,
      files.ntnCertificate?.[0],
      vendor.ntnCertificate,
    );

    // 6. Payout Details Update
    vendor.payout = {
      accountHolderName:
        payoutAccountTitle || vendor.payout?.accountHolderName || "",
      paymentMethod:
        payoutPaymentMethod || vendor.payout?.paymentMethod || "bank",
      bankName: payoutBankName || vendor.payout?.bankName || "",
      accountNumber: payoutAccountNumber || vendor.payout?.accountNumber || "",
      iban: payoutIban || vendor.payout?.iban || "",
      walletNumber: payoutWalletNumber || vendor.payout?.walletNumber || "",
      isVerified: vendor.payout?.isVerified || false,
    };

    vendor.verificationStatus = "pending";
    await vendor.save();

    // 7. ALWAYS Create or Update Branch (Even if branchData is missing)
    let parsedBranch = {};
    if (branchData) {
      parsedBranch =
        typeof branchData === "string" ? JSON.parse(branchData) : branchData;
    }

    const targetBranchName =
      parsedBranch.branchName || `${vendor.businessName} Main Branch`;
    const targetBranchPhone = parsedBranch.phone || vendor.businessPhone;
    const targetIsStoreHoursActive =
      parsedBranch.isStoreHoursActive !== undefined
        ? parsedBranch.isStoreHoursActive
        : vendor.isStoreHoursActive;

    const targetStoreHours =
      parsedBranch.storeHours && parsedBranch.storeHours.length > 0
        ? parsedBranch.storeHours
        : formattedStoreHours;

    const defaultBranch = await VendorBranch.findOneAndUpdate(
      { vendorId: vendor._id }, // Vendor ki primary branch query karein
      {
        $set: {
          vendorId: vendor._id,
          branchName: targetBranchName,
          phone: targetBranchPhone,
          address: parsedBranch.address || "",
          area: parsedBranch.area || "",
          city: parsedBranch.city || "",
          ...(parsedBranch.longitude !== undefined &&
            parsedBranch.latitude !== undefined && {
              location: {
                type: "Point",
                coordinates: [
                  Number(parsedBranch.longitude) || 0,
                  Number(parsedBranch.latitude) || 0,
                ],
              },
            }),
          isActive: true,
          isOpen: true,
          isStoreHoursActive: targetIsStoreHoursActive || false,
          storeHours: targetStoreHours,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // 8. Socket IO Real-Time Broadcast
    const io = req.app.get("io");
    if (io) {
      io.to(`vendor:${vendor._id}`).emit("vendorProfileUpdated", {
        vendorId: vendor._id,
        vendor,
        branch: defaultBranch,
        message: "Vendor profile and store timings updated successfully",
      });
    }

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
    const { status, search, type } = req.query;

    const filter = {};

    // 1. Filter by Status (active/blocked)
    if (status && status !== "all") {
      if (status === "blocked") filter.isBlocked = true;
      if (status === "active") filter.isBlocked = false;
    }

    // 2. Filter by Vendor Type/Category (e.g. restaurant, grocery, etc.)
    if (type && type !== "all") {
      // RegEx se case-insensitive match (e.g. "restaurant" or "restaurants")
      filter.businessType = { $regex: new RegExp(type, "i") };
    }

    // 3. Search by Vendor Name
    if (search && search.trim() !== "") {
      filter.businessName = {
        $regex: search.trim().toLowerCase(),
        $options: "i",
      };
    }

    // Default: Fetches all vendors matching filters (or all vendors if filters are empty)
    const vendors = await Vendor.find(filter)
      .select("businessName logo coverImage businessType rating")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: vendors.length,
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

// =====================================
// Get Vendor Branches By Vendor ID
// =====================================
exports.getVendorBranchById = async (req, res) => {
  try {
    const vendorId = req.params.vendorId || req.user?._id || req.user?.id;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    // Query VendorBranch by foreign key reference 'vendorId'
    const vendorBranches = await VendorBranch.find({ vendorId }).lean();

    if (!vendorBranches || vendorBranches.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No branches found for this vendor",
        vendorBranches: [],
      });
    }

    return res.status(200).json({
      success: true,
      count: vendorBranches.length,
      vendorBranches,
    });
  } catch (err) {
    console.error("GET VENDOR BRANCHES ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =======================
// Get Vendor Profile
// =======================
exports.getVendorProfile = async (req, res) => {
  try {
    const vendorId = req.params.vendorId || req.user?.id;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    const vendor = await Vendor.findById(vendorId).select(
      "businessName businessDescription logo coverImage",
    );

    res.json({
      success: true,
      vendor,
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
    const vendorId = req.user?.id || req.user?._id;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor authentication token missing",
      });
    }

    // Convert string vendorId to Mongoose ObjectId for Aggregation queries
    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    // 1. Calculate Start & End Date based on timeframe filter
    const { timeframe = "weekly" } = req.query;
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

    // 2. Fetch Vendor Profile Info (Correct Schema Fields)
    const vendor = await Vendor.findById(vendorId).select(
      "businessName logo rating",
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor account not found",
      });
    }

    // 3. Fetch Vendor Branch Info (for isRushMode and openingHours)
    let vendorBranch = await VendorBranch.findOne({
      vendorId: vendorId,
    }).select("isRushMode openingHours");

    // Fallback if Branch ID was passed directly
    if (!vendorBranch) {
      vendorBranch = await VendorBranch.findById(vendorId).select(
        "isRushMode openingHours",
      );
    }

    // Extract timings string (e.g., "10:00 - 23:00") from monday or default object
    const openTime = vendorBranch?.openingHours?.monday?.open || "10:00";
    const closeTime = vendorBranch?.openingHours?.monday?.close || "23:00";

    // 4. Aggregate Orders & Revenue Metrics
    const matchStage = {
      vendorId: vendorObjectId,
      createdAt: { $gte: startDate, $lte: now },
    };

    const orderStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, "$totalAmount", 0],
            },
          },
        },
      },
    ]);

    const stats = orderStats[0] || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
    };

    // 5. Aggregate Chart Data (Group by Day / Date)
    const chartData = await Order.aggregate([
      {
        $match: {
          vendorId: vendorObjectId,
          status: "completed",
          createdAt: { $gte: startDate, $lte: now },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" }, // 1 = Sun, 2 = Mon, etc.
          total: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 6. Build Clean & Synchronized Response
    return res.status(200).json({
      success: true,
      message: "Vendor overview retrieved successfully",
      data: {
        vendor: {
          id: vendor._id,
          name: vendor.businessName || "",
          logo: vendor.logo || "",
          timings: {
            openTime,
            closeTime,
          },
          isRushMode: vendorBranch ? Boolean(vendorBranch.isRushMode) : false,
          rating: vendor.rating || 0.0,
        },
        filter: timeframe,
        revenue: {
          totalAmount: stats.totalRevenue,
          currency: "pkr",
          peakDay: {
            day: "Saturday",
            amount: 4086,
            note: "up from 4,086 last week",
          },
          percentageChange: 20,
          chartData: chartData,
        },
        orders: {
          total: stats.totalOrders,
          completed: stats.completedOrders,
          cancelled: stats.cancelledOrders,
          statusNote:
            stats.cancelledOrders === 0
              ? `No order is cancelled this ${timeframe === "weekly" ? "week" : "period"}.`
              : `${stats.cancelledOrders} order(s) cancelled.`,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard Overview Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching vendor overview",
      error: error.message,
    });
  }
};

// ==========================================
// Vendor Performance
// ==========================================
exports.getVendorPerformance = async (req, res) => {
  try {
    const vendorId = req.user?.id || req.user?._id;
    const { timeframe = "weekly" } = req.query; // weekly, monthly, yearly

    if (!vendorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access: Vendor ID missing",
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor account not found",
      });
    }

    // 1. Calculate Date Ranges (Current Period vs Previous Period for growth %)
    const now = new Date();
    let currentPeriodStart = new Date();
    let previousPeriodStart = new Date();
    let previousPeriodEnd = new Date();

    if (timeframe === "weekly") {
      currentPeriodStart.setDate(now.getDate() - 7);
      previousPeriodEnd.setDate(now.getDate() - 7);
      previousPeriodStart.setDate(now.getDate() - 14);
    } else if (timeframe === "monthly") {
      currentPeriodStart.setMonth(now.getMonth() - 1);
      previousPeriodEnd.setMonth(now.getMonth() - 1);
      previousPeriodStart.setMonth(now.getMonth() - 2);
    } else if (timeframe === "yearly") {
      currentPeriodStart.setFullYear(now.getFullYear() - 1);
      previousPeriodEnd.setFullYear(now.getFullYear() - 1);
      previousPeriodStart.setFullYear(now.getFullYear() - 2);
    }

    // Helper pipeline to filter vendor's items in orders
    const getVendorMatchStage = (startDate, endDate) => ({
      status: { $in: ["delivered", "completed"] },
      "stops.vendorId": vendor._id,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // 2. Fetch Current Period Metrics
    const currentMetrics = await Order.aggregate([
      { $match: getVendorMatchStage(currentPeriodStart, now) },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendor._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $addToSet: "$_id" }, // Unique order IDs
          totalRevenue: {
            $sum: {
              $ifNull: [
                "$items.total",
                { $multiply: ["$items.price", "$items.quantity"] },
              ],
            },
          },
        },
      },
      {
        $project: {
          totalOrdersCount: { $size: "$totalOrders" },
          totalRevenue: 1,
        },
      },
    ]);

    // 3. Fetch Previous Period Metrics (For Growth Percentage)
    const previousMetrics = await Order.aggregate([
      { $match: getVendorMatchStage(previousPeriodStart, previousPeriodEnd) },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendor._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $addToSet: "$_id" },
          totalRevenue: {
            $sum: {
              $ifNull: [
                "$items.total",
                { $multiply: ["$items.price", "$items.quantity"] },
              ],
            },
          },
        },
      },
      {
        $project: {
          totalOrdersCount: { $size: "$totalOrders" },
          totalRevenue: 1,
        },
      },
    ]);

    const curr = currentMetrics[0] || { totalOrdersCount: 0, totalRevenue: 0 };
    const prev = previousMetrics[0] || { totalOrdersCount: 0, totalRevenue: 0 };

    // 4. Calculate Percentage Growth Function
    const calculateGrowth = (currentVal, previousVal) => {
      if (previousVal === 0) return currentVal > 0 ? 100 : 0;
      const growth = ((currentVal - previousVal) / previousVal) * 100;
      return parseFloat(growth.toFixed(1));
    };

    const ordersGrowth = calculateGrowth(
      curr.totalOrdersCount,
      prev.totalOrdersCount,
    );
    const revenueGrowth = calculateGrowth(curr.totalRevenue, prev.totalRevenue);

    // 5. Aggregate Sales Chart Points (Day-wise Breakdown)
    const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const rawChartData = await Order.aggregate([
      { $match: getVendorMatchStage(currentPeriodStart, now) },
      { $unwind: "$items" },
      { $match: { "items.vendorId": vendor._id } },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" }, // 1 (Sun) to 7 (Sat)
          totalSales: {
            $sum: {
              $ifNull: [
                "$items.total",
                { $multiply: ["$items.price", "$items.quantity"] },
              ],
            },
          },
        },
      },
    ]);

    // Map database chart results to fixed days structure (Mon-Sun)
    const daysOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const chartDataFormatted = daysOrder.map((dayName) => {
      const dbDayIndex = daysMap.indexOf(dayName) + 1; // MongoDB $dayOfWeek: 1=Sun, 2=Mon...
      const found = rawChartData.find((item) => item._id === dbDayIndex);
      return {
        day: dayName,
        sales: found ? found.totalSales : 0,
      };
    });

    const totalSalesForPeriod = chartDataFormatted.reduce(
      (sum, item) => sum + item.sales,
      0,
    );

    // 6. Return Structured API Response
    return res.status(200).json({
      success: true,
      message: "Performance data fetched successfully",
      data: {
        filter: timeframe,
        totalOrders: {
          count: curr.totalOrdersCount,
          growthPercentage: Math.abs(ordersGrowth),
          isPositive: ordersGrowth >= 0,
          formattedGrowth: `${ordersGrowth >= 0 ? "+" : "-"}${Math.abs(ordersGrowth)}%`,
        },
        totalRevenue: {
          amount: curr.totalRevenue,
          formattedAmount: `$${curr.totalRevenue.toLocaleString()}`,
          currency: "$",
          growthPercentage: Math.abs(revenueGrowth),
          isPositive: revenueGrowth >= 0,
          formattedGrowth: `${revenueGrowth >= 0 ? "+" : "-"}${Math.abs(revenueGrowth)}%`,
        },
        salesPerformance: {
          periodLabel:
            timeframe === "weekly"
              ? "This Week"
              : timeframe === "monthly"
                ? "This Month"
                : "This Year",
          totalPeriodSales: totalSalesForPeriod,
          formattedTotalPeriodSales: `$${totalSalesForPeriod.toLocaleString()}`,
          chartData: chartDataFormatted,
        },
      },
    });
  } catch (error) {
    console.error("GET VENDOR PERFORMANCE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch performance data",
      error: error.message,
    });
  }
};

exports.vendorMenu = async (req, res) => {
  try {
    let vendorId;
    if (!req.params?.vendorId) {
      vendorId = req.user?.id || req.user?._id;
    } else {
      vendorId = req.params?.vendorId;
    }

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Vendor ID format",
      });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    // 1. Fetch Deals, Special Types, Vendor Schema, & Products Grouped by Category
    const [
      campaignsGrouped,
      dealsGrouped,
      productsByType,
      vendorDoc,
      productsByCategory,
    ] = await Promise.all([
      // Group Active Campaigns by campaignType for this Vendor
      Campaign.aggregate([
        { $match: { vendorId: vendorObjectId, isActive: true } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$campaignType",
            items: {
              $push: {
                _id: "$_id",
                name: "$campaignName",
                description: "$description",
                banner: "$campaignBanner",
                campaignType: "$campaignType",
                offerType: "$offerDetails.offerType",
                discountType: "$offerDetails.discountType",
                discountValue: "$offerDetails.discountValue",
                originalPrice: "$offerDetails.originalPrice",
                price: "$offerDetails.dealPrice", // Standardizing field as 'price' for UI
                comboName: "$offerDetails.comboName",
                buyQuantity: "$offerDetails.buyQuantity",
                getQuantity: "$offerDetails.getQuantity",
                applicableProducts: "$applicableProducts",
                applicableCategories: "$applicableCategories",
              },
            },
          },
        },
        { $project: { items: { $slice: ["$items", 10] } } },
      ]),

      // Group Active Deals by dealType for this Vendor
      Deal.aggregate([
        { $match: { vendorId: vendorObjectId, isActive: true } },
        { $sort: { isFeatured: -1, createdAt: -1 } },
        {
          $group: {
            _id: "$dealType",
            items: {
              $push: {
                _id: "$_id",
                name: "$title",
                image: "$image",
                originalPrice: "$originalPrice",
                discountPrice: "$discountPrice",
                dealType: "$dealType",
              },
            },
          },
        },
        { $project: { items: { $slice: ["$items", 10] } } },
      ]),

      // Group Special Product Types
      Product.aggregate([
        {
          $match: {
            vendorId: vendorObjectId,
            type: { $in: ["special", "popular", "featured", "new"] },
          },
        },
        {
          $group: {
            _id: "$type",
            items: {
              $push: {
                _id: "$_id",
                name: "$name",
                description: "$description",
                price: "$price",
                images: "$images",
                isFavourite: "$isFavourite",
                rating: "$rating",
              },
            },
          },
        },
        { $project: { items: { $slice: ["$items", 10] } } },
      ]),

      // Fetch Vendor Document
      Vendor.findById(vendorObjectId).select("categories").lean(),

      // Fetch ALL Regular Products Grouped by Category in Database
      Product.aggregate([
        { $match: { vendorId: vendorObjectId } },
        {
          $group: {
            _id: "$category",
            products: {
              $push: {
                _id: "$_id",
                name: "$name",
                description: "$description",
                price: "$price",
                images: "$images",
                isFavourite: "$isFavourite",
                rating: "$rating",
              },
            },
          },
        },
      ]),
    ]);

    // 2. Maps for quick lookups
    const dealMap = {};
    dealsGrouped.forEach((d) => (dealMap[d._id] = d.items));

    const campaignMap = {};
    campaignsGrouped.forEach((c) => (campaignMap[c._id] = c.items));

    const productTypeMap = {};
    productsByType.forEach((p) => (productTypeMap[p._id] = p.items));

    const categoryProductMap = {};
    productsByCategory.forEach((c) => {
      if (c._id) categoryProductMap[c._id.toString()] = c.products;
    });

    const categoriesResponse = [];

    // 3. Section 1: Deals
    const dealTypes = [
      { key: "Offer Deal", label: "Offer Deals" },
      { key: "Bogo Deal", label: "Bogo Deals" },
      { key: "Combo Deal", label: "Combo Deals" },
      { key: "Flash Deal", label: "Flash Deals" },
      { key: "Seasonal Deal", label: "Seasonal Deals" },
      { key: "Free Delivery Deal", label: "Free Delivery Deals" },
      { key: "Daily Deal", label: "Daily Deals" },
    ];

    dealTypes.forEach(({ key, label }) => {
      if (dealMap[key] && dealMap[key].length > 0) {
        categoriesResponse.push({
          _id: new mongoose.Types.ObjectId(),
          categoryName: label,
          products: dealMap[key],
        });
      }
    });

    // 3. Section 1: Deals
    const campaignType = [
      { key: "flash_deal", label: "Flash Deals" },
      { key: "bogo_deal", label: "Bogo Deals" },
      { key: "combo_deal", label: "Combo Deals" },
      { key: "discount_deal", label: "Discount Deals" },
      { key: "free_delivery_deal", label: "Free Delivery Deals" },
      { key: "payment_card_deal", label: "Payment Card Deals" },
      { key: "custom_deal", label: "Custom Deals" },
    ];

    campaignType.forEach(({ key, label }) => {
      if (campaignMap[key] && campaignMap[key].length > 0) {
        categoriesResponse.push({
          _id: new mongoose.Types.ObjectId(),
          categoryName: label,
          products: campaignMap[key],
        });
      }
    });

    // 4. Section 2: Special Product Types
    const productTypes = [
      { key: "special", label: "Special Items" },
      { key: "popular", label: "Popular Items" },
      { key: "featured", label: "Featured Items" },
      { key: "new", label: "New Items" },
    ];

    productTypes.forEach(({ key, label }) => {
      if (productTypeMap[key] && productTypeMap[key].length > 0) {
        categoriesResponse.push({
          _id: new mongoose.Types.ObjectId(),
          categoryName: label,
          products: productTypeMap[key],
        });
      }
    });

    // 5. Section 3: Vendor Categories (With Dynamic Fallback)
    const storeCategories = vendorDoc?.categories || [];
    const addedCategories = new Set();

    if (storeCategories.length > 0) {
      storeCategories.forEach((cat) => {
        const catName =
          typeof cat === "string" ? cat : cat.categoryName || cat.name;
        if (catName) {
          addedCategories.add(catName.toString());
          categoriesResponse.push({
            _id: cat._id || new mongoose.Types.ObjectId(),
            categoryName: catName,
            products: categoryProductMap[catName.toString()] || [],
          });
        }
      });
    }

    // Auto-Fallback: Push remaining product categories directly from Product collection
    Object.keys(categoryProductMap).forEach((catName) => {
      if (!addedCategories.has(catName)) {
        categoriesResponse.push({
          _id: new mongoose.Types.ObjectId(),
          categoryName: catName,
          products: categoryProductMap[catName],
        });
      }
    });

    return res.status(200).json({
      success: true,
      vendorId: vendorId.toString(),
      categories: categoriesResponse,
    });
  } catch (err) {
    console.error("GET VENDOR MENU ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.vendorMenuProducts = async (req, res) => {
  try {
    let vendorId = req.params?.vendorId || req.user?.id || req.user?._id;
    const { categoryName } = req.query;

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Vendor ID format",
      });
    }

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: "categoryName query parameter is required",
      });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
    const cleanCategory = categoryName.trim().toLowerCase();
    let products = [];

    // Map Special Badges
    const specialTypeMap = {
      "popular items": "popular",
      popular: "popular",
      "featured items": "featured",
      featured: "featured",
      "new items": "new",
      new: "new",
      "special items": "special",
      special: "special",
    };

    // Map Campaign Types
    const campaignTypeMap = {
      "flash deals": "flash_deal",
      flash_deal: "flash_deal",
      "bogo deals": "bogo_deal",
      bogo_deal: "bogo_deal",
      "combo deals": "combo_deal",
      combo_deal: "combo_deal",
      "discount deals": "discount_deal",
      discount_deal: "discount_deal",
      "free delivery deals": "free_delivery_deal",
      free_delivery_deal: "free_delivery_deal",
      "payment card deals": "payment_card_deal",
      payment_card_deal: "payment_card_deal",
      "custom deals": "custom_deal",
      custom_deal: "custom_deal",
    };

    // 1. Check if Category is Special Product Type
    if (specialTypeMap[cleanCategory]) {
      products = await Product.find({
        vendorId: vendorObjectId,
        type: specialTypeMap[cleanCategory],
      })
        .select(
          "name description price images isFavourite rating category type",
        )
        .lean();
    }
    // 2. Check if Category is a Campaign
    // else if (campaignTypeMap[cleanCategory]) {
    //   const campaigns = await Campaign.find({
    //     vendorId: vendorObjectId,
    //     campaignType: campaignTypeMap[cleanCategory],
    //     isActive: true,
    //   }).lean();

    //   products = campaigns.map((c) => ({
    //     _id: c._id,
    //     name: c.campaignName,
    //     description: c.description,
    //     banner: c.campaignBanner,
    //     campaignType: c.campaignType,
    //     discountType: c.offerDetails?.discountType,
    //     discountValue: c.offerDetails?.discountValue,
    //     originalPrice: c.offerDetails?.originalPrice || 0,
    //     price: c.offerDetails?.dealPrice || 0,
    //     applicableProducts: c.applicableProducts || [],
    //     applicableCategories: c.applicableCategories || [],
    //     isCampaign: true,
    //   }));
    // }

    // 2. Check if Category is a Campaign
    else if (campaignTypeMap[cleanCategory]) {
      const campaigns = await Campaign.find({
        vendorId: vendorObjectId,
        campaignType: campaignTypeMap[cleanCategory],
        isActive: true,
      }).lean();

      // Extract all applicable product ObjectIds across campaigns
      const allProductIds = campaigns.flatMap(
        (c) => c.applicableProducts || [],
      );

      // Fetch product details for all applicable IDs in a single DB query
      const productsList = await Product.find({
        _id: { $in: allProductIds },
      })
        .select(
          "name description price images isFavourite rating category type",
        )
        .lean();

      // Create a quick lookup map
      const productMap = {};
      productsList.forEach((p) => {
        productMap[p._id.toString()] = p;
      });

      // Map campaigns with populated applicable products
      products = campaigns.map((c) => ({
        _id: c._id,
        name: c.campaignName,
        description: c.description,
        banner: c.campaignBanner,
        campaignType: c.campaignType,
        discountType: c.offerDetails?.discountType,
        discountValue: c.offerDetails?.discountValue,
        originalPrice: c.offerDetails?.originalPrice || 0,
        price: c.offerDetails?.dealPrice || 0,
        applicableCategories: c.applicableCategories || [],
        applicableProducts: (c.applicableProducts || [])
          .map((id) => productMap[id.toString()])
          .filter(Boolean), // Remove any un-matched or null items
        isCampaign: true,
      }));
    }
    // 3. Check if Category is a Deal
    else if (cleanCategory.includes("deal")) {
      const deals = await Deal.find({
        vendorId: vendorObjectId,
        isActive: true,
        $or: [
          { dealType: { $regex: new RegExp(`^${categoryName}$`, "i") } },
          { title: { $regex: new RegExp(`^${categoryName}$`, "i") } },
        ],
      }).lean();

      products = deals.map((d) => ({
        _id: d._id,
        name: d.title,
        image: d.image,
        originalPrice: d.originalPrice,
        price: d.discountPrice,
        dealType: d.dealType,
        isDeal: true,
      }));
    }
    // 4. Fallback to Regular Product Category (e.g., "fast-food", "chinese", "burgers")
    else {
      const slugified = cleanCategory
        .replace(/&/g, "and")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-");

      products = await Product.find({
        vendorId: vendorObjectId,
        category: { $regex: new RegExp(`^${slugified}$`, "i") },
      })
        .select(
          "name description price images isFavourite rating category type",
        )
        .lean();
    }

    return res.status(200).json({
      success: true,
      vendorId: vendorId.toString(),
      categoryName: categoryName,
      count: products.length,
      products,
    });
  } catch (err) {
    console.error("GET VENDOR MENU PRODUCTS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleRushMode = async (req, res) => {
  try {
    const vendorId = req.user?.id || req.user?._id;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID missing from authentication token",
      });
    }

    // 1. Fetch main Vendor details for metadata
    const vendor = await Vendor.findById(vendorId).select(
      "businessName isActive",
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor account not found",
      });
    }

    // 2. Fetch current VendorBranch state (using vendorId ref or direct ID)
    let branch = await VendorBranch.findOne({ vendorId: vendorId }).select(
      "isRushMode",
    );

    // Fallback: If vendorId is itself the Branch ID
    if (!branch) {
      branch = await VendorBranch.findById(vendorId).select("isRushMode");
    }

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Vendor branch not found",
      });
    }

    // 3. Determine target status
    const currentRushState = Boolean(branch.isRushMode);

    let targetRushState;
    if (req.body && typeof req.body.isRushMode === "boolean") {
      targetRushState = req.body.isRushMode;
    } else if (req.body && typeof req.body.rushMode === "boolean") {
      targetRushState = req.body.rushMode;
    } else {
      targetRushState = !currentRushState;
    }

    // 4. Update VendorBranch atomically
    const updatedBranch = await VendorBranch.findByIdAndUpdate(
      branch._id,
      { $set: { isRushMode: targetRushState } },
      { new: true, runValidators: true },
    ).select("isRushMode");

    // 5. Real-time updates via Socket IO
    const io = req.app.get("io");
    if (io) {
      io.to(`vendor:${vendorId}`).emit("rushModeToggled", {
        vendorId,
        isRushMode: updatedBranch.isRushMode,
        message: `Rush mode is now ${updatedBranch.isRushMode ? "ENABLED" : "DISABLED"}`,
      });

      io.to(`vendorCatalog:${vendorId}`).emit("vendorRushModeUpdated", {
        vendorId,
        isRushMode: updatedBranch.isRushMode,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Rush mode successfully ${
        updatedBranch.isRushMode ? "activated" : "deactivated"
      }`,
      vendor: {
        businessName: vendor.businessName,
        isRushMode: Boolean(updatedBranch.isRushMode),
        isActive: vendor.isActive,
      },
    });
  } catch (err) {
    console.error("TOGGLE RUSH MODE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET ALL RESTAURANT BRANDS (filter, search, paginate)
// =====================================
exports.getAllVendorBrands = async (req, res) => {
  try {
    const vendors = await Vendor.find().select("businessName logo _id");

    return res.status(200).json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (err) {
    console.log("GET VendorS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET ALL HOME CHEFS
// =====================================
exports.getAllHomeChefs = async (req, res) => {
  try {
    const { search, isOpen, status } = req.query;

    // Filter by approved status by default (or query param if provided)
    const query = {
      businessType: "homeChef",
      isBlecked: false,
    };

    // Check availability (isOpen field in schema)
    // if (isActive !== undefined) {
    //   query.isActive = isActive === "true";
    // }

    // Search by name or cuisines
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { cuisines: { $regex: search, $options: "i" } },
      ];
    }

    const vendors = await Vendor.find(query)
      .select(
        "businessName businessDescription logo coverImage deliveryFee deliveryTime rating",
      )
      .sort({
        "rating.average": -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (err) {
    console.log("GET VendorS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ========================================================
// 3. GET SINGLE CHEF DETAILS WITH PRODUCTS & DEALS
// ========================================================
exports.getHomeChefById = async (req, res) => {
  try {
    const { id } = req.params;

    const chef = await Vendor.findById(id);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Home Chef not found",
      });
    }

    // Fetch associated Products and Deals using your existing models
    const products = await Product.find({ vendorId: id, isAvailable: true });
    const deals = await Deal.find({ vendorId: id, isActive: true });

    return res.status(200).json({
      success: true,
      chef,
      deals,
      products,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// // =====================================
// // GET Vendors BY FAST DELIVERY TIME (for "Fast Delivery" section)
// // =====================================
// exports.getVendorByFastDeliveryTime = async (req, res) => {
//   try {
//     // 1. Fetch Restaurants (assumes deliveryTime is a Number or object)
//     const restaurant = await Restaurant.find({
//       $or: [
//         { "deliveryTime.max": { $lte: 20 } },
//         { "deliveryTime.min": { $lte: 20 } },
//       ],
//     }).select("name logo _id coverImage deliveryTime rating");

//     // 2. Fetch HomeChefs querying the nested object field (deliveryTime.max)
//     const homeChef = await HomeChef.find({
//       $or: [
//         { "deliveryTime.max": { $lte: 20 } },
//         { "deliveryTime.min": { $lte: 20 } },
//       ],
//     }).select("name logo _id coverImage deliveryTime rating");

//     const offer = {
//       type: "offer",
//       title: "Fast Delivery",
//       icon: "⚡",
//     };

//     // 3. Merge arrays
//     // const fastDeliveryRestaurants = [...restaurant, ...homeChef, offer ];
//     const fastDeliveryRestaurants = [
//       ...restaurant.map((item) => ({
//         ...item.toObject(),
//         offer: {
//           title: "Fast Delivery",
//           icon: "⚡",
//         },
//       })),

//       ...homeChef.map((item) => ({
//         ...item.toObject(),
//         offer: {
//           title: "Fast Delivery",
//           icon: "⚡",
//         },
//       })),
//     ];

//     // 4. Check if merged array is empty
//     if (fastDeliveryRestaurants.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No fast delivery options found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       count: fastDeliveryRestaurants.length,
//       fastDeliveryRestaurants,
//     });
//   } catch (err) {
//     console.error("FAST DELIVERY ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// =====================================
// GET SINGLE VENDOR
// =====================================
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).select(
      "businessName logo businessDescription coverImage rating isActive deliveryFee deliveryTime isFreeDelivery openingHours",
    );
    // .populate(
    //   "ownerId",
    //   "name email phone",
    // );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      vendor,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// GET VENDOR CATEGORIES
// =====================================
exports.getVendorCategories = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).select("categories");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const categories = vendor.categories.map((category) => ({
      _id: category._id,
      categoryName: category.categoryName,
    }));

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (err) {
    console.log("GET RESTAURANT CATEGORIES ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
