require("dotenv").config();
const mongoose = require("mongoose");
const Vendor = require("../models/Vendor");
const VendorBranch = require("../models/VendorBranch");
const OTP = require("../models/Otp");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const nodemailer = require("nodemailer");

const { OAuth2Client } = require("google-auth-library");
const { body, validationResult } = require("express-validator");

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
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      role: "vendor",
      isPhoneVerified: vendor.isPhoneVerified || false,
      isEmailVerified: vendor.isEmailVerified || false,
      verificationStatus: vendor.verificationStatus || "pending",
      isBlocked: vendor.isBlocked || false,
      isProfileCompleted: vendor.isProfileCompleted || false,
      lastLogin: vendor.lastLogin || null,
      vendorProfile: vendor.vendorProfile || {},
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

    const otp = generateOtp();
    const otpData = {
      userId: vendorId, // Using core OTP schema target
      otp,
      type,
      purpose,
      verified: false,
      isUsed: false,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    if (type === "phone") otpData.phone = value;
    if (type === "email") otpData.email = value;

    await OTP.findOneAndUpdate({ userId: vendorId, purpose }, otpData, {
      upsert: true,
      new: true,
    });

    console.log("OTP", otp, otpData)

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
    });
  } catch (err) {
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

    const record = await OTP.findOne({ userId: vendorId, purpose });

    if (!record) {
      return res.status(400).json({ success: false, message: "OTP not found" });
    }

    if (record.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    record.verified = true;
    await record.save();

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    if (purpose === "phone-verification") {
      vendor.phone = record.phone;
      vendor.isPhoneVerified = true;
      await vendor.save();

      return res.json({
        success: true,
        message: "Vendor phone verified successfully",
        vendor,
      });
    }

    return res.json({
      success: true,
      vendorId,
      message: "OTP verified successfully",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// SIGNUP & LOGIN
// ======================================================
exports.validateSignup = [
  body("phone").notEmpty().withMessage("Phone number is required"),
  // body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

exports.signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, password, name } = req.body;

    const normalizedPhone = String(phone).trim();
    // const normalizedEmail = email.toLowerCase().trim();

    const existingVendor = await Vendor.findOne({
      // $or: [{ phone: normalizedPhone }, { email: normalizedEmail }],
      $or: [{ phone: normalizedPhone }],
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message:
          existingVendor.phone === normalizedPhone
            && "Phone number already registered to a vendor"
            // : "Email already registered to a vendor",
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const vendorData = {
      phone: normalizedPhone,
      // email: normalizedEmail,
      password: hash,
      name: name || `Vendor_${normalizedPhone.slice(-4)}`,
      isPhoneVerified: false,
      isEmailVerified: false,
      verificationStatus: "pending",
      // vendorProfile: {
      //   businessName: businessName || "",
      // },
    };

    const vendor = await Vendor.create(vendorData);
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    return sendVendorResponse(res, "Vendor signup successful", vendorResponse);
  } catch (err) {
    console.error("VENDOR SIGNUP ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, email, password } = req.body;
    let vendor = null;

    if (email) {
      vendor = await Vendor.findOne({ email: email.toLowerCase().trim() });
    } else if (phone) {
      vendor = await Vendor.findOne({ phone: String(phone).trim() });
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

    const match = await bcrypt.compare(password, vendor.password);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

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
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Email or phone is required",
      });
    }

    const vendor = await Vendor.findOne({
      $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    });

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    const otp = generateOtp();

    if (email) {
      await OTP.findOneAndUpdate(
        { userId: vendor._id, purpose: "forgot-password" },
        {
          userId: vendor._id,
          email: vendor.email,
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
        to: email,
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

    if (phone) {
      await OTP.findOneAndUpdate(
        { userId: vendor._id, purpose: "forgot-password" },
        {
          userId: vendor._id,
          phone: vendor.phone,
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
exports.completeVendorProfile = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const {
      // Core Contact Information
      name,
      email,
      phone,
      // Vendor Documents & Verification
      cnicNumber,
      cnicFrontPicture,
      cnicBackPicture,
      businessRegistrationDocument,
      foodLicenseDocument,
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
      
      // Payout Configuration
      payoutBankName,
      payoutAccountTitle,
      payoutAccountNumber,
      // payoutIban,
      // Initial Branch Details (Optional payload fields)
      branchData,
    } = req.body;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor account not found",
      });
    }

    // 1. Core Profile Details
    if (name) vendor.name = name;
    if (email) vendor.email = email;
    if (phone) vendor.phone = phone;


    // 2. KYC Verification Payload
    vendor.cnic = {
      number: cnicNumber || vendor.cnic?.number || "",
      frontPicture: cnicFrontPicture || vendor.cnic?.frontPicture || null,
      backPicture: cnicBackPicture || vendor.cnic?.backPicture || null,
    };
    if (businessRegistrationDocument)
      vendor.businessRegistrationDocument = businessRegistrationDocument;
    if (foodLicenseDocument) vendor.foodLicenseDocument = foodLicenseDocument;

    // 3. Storefront Metadata
    vendor.vendorProfile = {
      ...vendor.vendorProfile,
      businessName: businessName || vendor.vendorProfile?.businessName || name,
      businessPhone: businessPhone || vendor.vendorProfile?.businessPhone || phone,
      businessEmail: businessEmail || vendor.vendorProfile?.businessEmail || "",
      businessType:
        businessType || vendor.vendorProfile?.businessType || "restaurant",
      category:
        category || vendor.vendorProfile?.category || "fast-food",
      logo: logo || vendor.vendorProfile?.logo || null,
      coverImage: coverImage || vendor.vendorProfile?.coverImage || null,
      description: description || vendor.vendorProfile?.description || "",
      businessRegistrationNumber: businessRegistrationNumber || vendor.vendorProfile?.businessRegistrationNumber || "",
      taxNumber: taxNumber || vendor.vendorProfile?.taxNumber || "",
      foodLicenseNumber: foodLicenseNumber || vendor.vendorProfile?.foodLicenseNumber || "",
    };

    // 4. Financial Details
    vendor.payoutInformation = {
      bankName: payoutBankName || vendor.payoutInformation?.bankName || "",
      accountTitle:
        payoutAccountTitle || vendor.payoutInformation?.accountTitle || "",
      accountNumber:
        payoutAccountNumber || vendor.payoutInformation?.accountNumber || "",
      // iban: payoutIban || vendor.payoutInformation?.iban || "",
    };

    vendor.isProfileCompleted = true;
    vendor.verificationStatus = "pending"; // Trigger admin review
    await vendor.save();

    // 5. Create Initial Operational Branch (If Provided)
    let defaultBranch = null;
    if (branchData) {
      const {
        branchName,
        phone: branchPhone,
        address,
        area,
        city,
        longitude,
        latitude,
      } = branchData;

      defaultBranch = await VendorBranch.create({
        vendorId: vendor._id,
        branchName: branchName || `${businessName || vendor.name} Main Branch`,
        phone: branchPhone || vendor.phone,
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

    return res.status(200).json({
      success: true,
      message: "Vendor profile completed and submitted for verification",
      vendor,
      branch: defaultBranch,
    });
  } catch (err) {
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
exports.getVendorHomeScreenDetails = async (req, res) => {
  try {
    // Determine vendorId from query, params, or decoded JWT auth token
    const vendorId = req.params.vendorId || req.user?.id;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    // 1. Fetch Vendor Profile details
    const vendor = await Vendor.findById(vendorId).select(
      "name email phone vendorProfile.businessName vendorProfile.logo vendorProfile.coverImage verificationStatus isProfileCompleted"
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // 2. Fetch all Operational Branches associated with this Vendor
    const branches = await VendorBranch.find({ vendorId }).select(
      "branchName phone address city area isOpen isActive location openingHours"
    );

    return res.status(200).json({
      success: true,
      vendor: {
        id: vendor._id,
        name: vendor.name,
        businessName: vendor.vendorProfile?.businessName || vendor.name,
        logo: vendor.vendorProfile?.logo || null,
        coverImage: vendor.vendorProfile?.coverImage || null,
        verificationStatus: vendor.verificationStatus,
        isProfileCompleted: vendor.isProfileCompleted,
      },
      branches,
      activeBranchCount: branches.filter((b) => b.isActive).length,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
