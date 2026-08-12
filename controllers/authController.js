require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const OTP = require("../models/Otp");
const Zone = require("../models/Zone");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const nodemailer = require("nodemailer");

const { OAuth2Client } = require("google-auth-library");
const { body, validationResult } = require("express-validator");

// ======================================================
// GOOGLE CLIENT
// ======================================================
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ======================================================
// NODEMAILER
// ======================================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ======================================================
// GENERATE TOKEN
// ======================================================
const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// ======================================================
// SEND RESPONSE
// ======================================================
const sendResponse = (res, message, user) => {
  const token = generateToken(user);

  return res.status(200).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isPhoneVerified: user.isPhoneVerified || false,
      isEmailVerified: user.isEmailVerified || false,
      lastLogin: user.lastLogin || null,

      location: {
        id: user.location?._id || null,
        type: user.location?.type || user.location?.mode || null,
        coordinates: user.location?.coordinates || { lat: null, lng: null },
        zone: user.location?.zone || "",
        area: user.location?.area || "",
        address: user.location?.address || "",
        isEnabled: user.location?.isEnabled || false,
      },
      hasLocation: user?.location?.isEnabled || false,
    },
  });
};

// ======================================================
// OTP GENERATOR
// ======================================================
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ======================================================
// PHONE OTP
// ======================================================
// exports.sendOTP = async (req, res) => {
//   try {
//     const { userId, phone } = req.body;

//     if (!userId || !phone) {
//       return res.status(400).json({
//         success: false,
//         message: "userId and phone are required",
//       });
//     }

//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const otp = generateOtp();

//     await OTP.findOneAndUpdate(
//       {
//         userId,
//         phone,
//         purpose: "phone-verification",
//       },
//       {
//         userId,
//         phone,
//         otp,
//         type: "phone",
//         purpose: "phone-verification",
//         expiresAt: Date.now() + 5 * 60 * 1000,
//         verified: false,
//         isUsed: false,
//       },
//       { upsert: true, new: true }
//     );

//     console.log("PHONE OTP:", otp);

//     return res.status(200).json({
//       success: true,
//       message: "OTP sent successfully",
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };
//---------------------------- Save token ----------------------------------------

exports.saveToken = async (req, res) => {
  const { fcmToken } = req.body;

  await User.findByIdAndUpdate(
    req.user.id,
    { fcmToken }
  );

  res.status(200).json({
    success: true,
    message: "Token saved",
  });
};
exports.sendOTP = async (req, res) => {
  try {
    const { userId, type, value, purpose } = req.body;

    if (!userId || !type || !value || !purpose) {
      return res.status(400).json({
        success: false,
        message: "userId, type, value and purpose required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = generateOtp();

    const otpData = {
      userId,
      otp,
      type,
      purpose,
      verified: false,
      isUsed: false,
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    if (type === "phone") {
      otpData.phone = value;
    }

    if (type === "email") {
      otpData.email = value;
    }

    await OTP.findOneAndUpdate(
      {
        userId,
        purpose,
      },
      otpData,
      {
        upsert: true,
        new: true,
      },
    );

    if (type === "email") {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: value,
        subject: "OTP Verification",
        html: `
          <h2>Your OTP</h2>
          <h1>${otp}</h1>
          <p>Expires in 5 minutes</p>
        `,
      });

      console.log(`${purpose} EMAIL OTP:`, otp);
    }

    if (type === "phone") {
      console.log(`${purpose} PHONE OTP:`, otp);
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================================
// VERIFY PHONE OTP
// ======================================================
// exports.verifyOTP = async (req, res) => {
//   try {
//     const { userId, phone, otp } = req.body;

//     if (!userId || !phone || !otp) {
//       return res.status(400).json({
//         success: false,
//         message: "userId, phone, otp required",
//       });
//     }

//     const record = await OTP.findOne({ userId, phone });

//     if (!record) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP not found",
//       });
//     }

//     if (record.expiresAt < Date.now()) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP expired",
//       });
//     }

//     if (record.otp !== otp) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid OTP",
//       });
//     }

//     // mark OTP verified
//     record.verified = true;
//     await record.save();

//     // update USER permanently
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     user.phone = phone;
//     user.isPhoneVerified = true;
//     await user.save();

//     return res.json({
//       success: true,
//       message: "Phone verified successfully",
//       user,
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp, purpose } = req.body;

    if (!userId || !otp || !purpose) {
      return res.status(400).json({
        success: false,
        message: "userId, otp, purpose required",
      });
    }

    const record = await OTP.findOne({
      userId,
      purpose,
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    }

    if (record.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    record.verified = true;

    await record.save();

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (purpose === "phone-verification") {
      user.phone = record.phone;

      user.isPhoneVerified = true;

      await user.save();

      return res.json({
        success: true,
        message: "Phone verified successfully",
        user,
      });
    }

    if (purpose === "forgot-password") {
      return res.json({
        success: true,
        userId,
        message: "OTP verified successfully",
      });
    }

    return res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// ======================================================
// EMAIL OTP
// ======================================================
// exports.sendEmailOTP = async (req, res) => {
//   try {
//     const { userId, email } = req.body;

//     if (!userId || !email) {
//       return res.status(400).json({
//         success: false,
//         message: "userId and email required",
//       });
//     }

//     const otp = generateOtp();

//     await OTP.findOneAndUpdate(
//       {
//         userId,
//         email,
//         purpose: "email-verification",
//       },
//       {
//         userId,
//         email,
//         otp,
//         type: "email",
//         purpose: "email-verification",
//         expiresAt: Date.now() + 5 * 60 * 1000,
//         verified: false,
//         isUsed: false,
//       },
//       { upsert: true, new: true }
//     );

//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: "Email Verification OTP",
//       html: `<h2>Your OTP: ${otp}</h2>`,
//     });

//     console.log("EMAIL OTP:", otp);

//     return res.status(200).json({
//       success: true,
//       message: "OTP sent to email",
//     });

//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// ======================================================
// VERIFY EMAIL OTP (FIXED BUG BRACE)
// ======================================================
// exports.verifyEmailOTP = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     const record = await OTP.findOne({ email });

//     if (!record) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP not found",
//       });
//     }

//     if (record.expiresAt < Date.now()) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP expired",
//       });
//     }

//     if (record.otp !== otp) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid OTP",
//       });
//     }

//     record.verified = true;
//     await record.save();

//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     user.isEmailVerified = true;
//     await user.save();

//     return res.status(200).json({
//       success: true,
//       message: "Email verified successfully",
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// ======================================================
// SIGNUP
// ======================================================
exports.signup = [
  body("name").notEmpty(),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),

  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { name, email, password, role } = req.body;

      // CHECK EXISTING USER
      const exists = await User.findOne({ email });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      // HASH PASSWORD
      const hash = await bcrypt.hash(password, 12);

      // CREATE USER
      const user = await User.create({
        name,
        email,
        password: hash,
        role: role || "user",

        // ✅ AUTO VERIFIED
        isEmailVerified: true,
      });

      return sendResponse(res, "Signup successful", user);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
];

// ======================================================
// LOGIN
// ======================================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // FIND USER
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // CHECK PASSWORD
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // UPDATE LOGIN TIME
    user.lastLogin = new Date();

    // ✅ AUTO EMAIL VERIFIED
    user.isEmailVerified = true;

    await user.save();

    return sendResponse(res, "Login successful", user);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================================
// GOOGLE LOGIN
// ======================================================
exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email, sub } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId: sub,
        isEmailVerified: true,
      });
    }

    return sendResponse(res, "Google login success", user);
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid Google Token",
    });
  }
};

// ======================================================
// FACEBOOK LOGIN
// ======================================================
exports.facebookLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;

    const response = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`,
    );

    const { id, name, email } = response.data;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        facebookId: id,
        isEmailVerified: true,
      });
    }

    return sendResponse(res, "Facebook login success", user);
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid Facebook Token",
    });
  }
};

// ======================================================
// LOCATION (FIXED)
// ======================================================
exports.enableCurrentLocation = async (req, res) => {
  try {
    const { lat, lng, zone, area, address } = req.body;

    const user = await User.findById(req.user.id);

    user.location = {
      _id: new mongoose.Types.ObjectId(),
      type: "auto",
      coordinates: { lat: Number(lat), lng: Number(lng) },
      zone,
      area,
      address,
      isEnabled: true,
    };

    await user.save();

    return res.json({
      success: true,
      location: user.location,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ======================================================
// MANUAL LOCATION
// ======================================================
exports.selectManualLocation = async (req, res) => {
  try {
    const { zone, area, address } = req.body;

    const user = await User.findById(req.user.id);

    user.location = {
      _id: new mongoose.Types.ObjectId(),
      type: "manual",
      zone,
      area,
      address,
      coordinates: { lat: null, lng: null },
      isEnabled: true,
    };

    await user.save();

    return res.json({
      success: true,
      location: user.location,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ======================================================
// ADMIN
// ======================================================
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hash = await bcrypt.hash(password, 12);

    const admin = await User.create({
      name,
      email,
      password: hash,
      role: "admin",
      isEmailVerified: true,
    });

    return res.json({ success: true, admin });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ======================================================
// RIDER
// ======================================================
// exports.createRider = async (req, res) => {
//    console.log("NEW CREATE RIDER RUNNING");
//   try {
//     const { name, email, password, phone } = req.body;

//     // Check existing rider
//     const existingUser = await User.findOne({
//       $or: [{ email }, { phone }],
//     });

//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: "Email or phone already exists",
//       });
//     }

//     // Hash Password
//     const hash = await bcrypt.hash(password, 12);

//     // Create Rider
//     const rider = await User.create({
//       name,
//       email,
//       phone,
//       password: hash,
//       role: "rider",
//     });

//     // ================= TOKEN YAHAN LAGAO =================
//     const token = jwt.sign(
//       {
//         id: rider._id,
//         role: rider.role,
//       },
//       process.env.JWT_SECRET,
//       {
//         expiresIn: "30d",
//       }
//     );

//     // ================= RESPONSE =================
//     return res.status(201).json({
//       success: true,
//       message: "Rider created successfully",
//       token,
//       rider: {
//         _id: rider._id,
//         name: rider.name,
//         email: rider.email,
//         phone: rider.phone,
//         role: rider.role,
//       },
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// ==========================================
// 1. GET ALL RIDERS (With Search & Status)
// ==========================================
exports.getRiders = async (req, res) => {
  try {
    const { search, status } = req.query;

    // Sirf riders ko fetch karna hai
    const filter = { role: "rider" };

    // Status filtering
    if (status && status !== "all") {
      if (status === "blocked") filter.isBlocked = true;
      if (status === "active") filter.isBlocked = false;
    }

    // Search query (Name, Email, or Phone)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const riders = await User.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      riders,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 2. UPDATE RIDER (Basic Info & Service Zones)
// ==========================================
exports.updateRider = async (req, res) => {
  try {
    const { name, email, phone, serviceZones, location } = req.body;
    const { id } = req.params;

    // Email or Phone conflict check (excluing current rider)
    const conflict = await User.findOne({
      _id: { $ne: id },
      $or: [{ email }, { phone }],
    });

    if (conflict) {
      return res.status(400).json({
        success: false,
        message:
          "Email or phone number is already registered to another account",
      });
    }

    const updatedRider = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          name,
          email,
          phone,
          serviceZones,
          location,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedRider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    res.status(200).json({
      success: true,
      message: "Rider details updated successfully",
      rider: updatedRider,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// UPDATE Rider STATUS (unblock / block)
// =====================================
exports.updateRiderStatus = async (req, res) => {
  try {
    const { isBlocked } = req.body;
    console.log(isBlocked);

    // Check if isBlocked is explicitly a boolean
    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Invalid payload. 'isBlocked' must be a boolean value (true/false).",
      });
    }

    const updatedRider = await User.findOneAndUpdate(
      { _id: req.params.id, role: "rider" },
      { $set: { isBlocked } },
      { new: true, runValidators: true }
    );

    if (!updatedRider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found or user is not a rider.",
      });
    }

    const statusText = isBlocked ? "blocked" : "unblocked";

    return res.status(200).json({
      success: true,
      message: `Rider account has been successfully ${statusText}.`,
      user: updatedRider,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// 3. DELETE RIDER
// ==========================================
exports.deleteRider = async (req, res) => {
  try {
    const rider = await User.findOneAndDelete({
      _id: req.params.id,
      role: "rider",
    });

    if (!rider) {
      return res
        .status(404)
        .json({ success: false, message: "Rider not found" });
    }

    res.status(200).json({
      success: true,
      message: "Rider account deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// FORGOT PASSWORD - SEND OTP
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

    const user = await User.findOne({
      $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = generateOtp();

    // EMAIL OTP
    if (email) {
      await OTP.findOneAndUpdate(
        {
          userId: user._id,
          purpose: "forgot-password",
        },
        {
          userId: user._id,
          email: user.email,
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
        subject: "Reset Password OTP",
        html: `
          <h2>Password Reset OTP</h2>
          <h1>${otp}</h1>
          <p>OTP expires in 5 minutes.</p>
        `,
      });

      console.log("EMAIL RESET OTP:", otp);

      return res.status(200).json({
        success: true,
        userId: user._id,
        type: "email",
        message: "OTP sent to email",
      });
    }

    // PHONE OTP
    if (phone) {
      await OTP.findOneAndUpdate(
        {
          userId: user._id,
          purpose: "forgot-password",
        },
        {
          userId: user._id,
          phone: user.phone,
          otp,
          type: "phone",
          purpose: "forgot-password",
          verified: false,
          isUsed: false,
          expiresAt: Date.now() + 5 * 60 * 1000,
        },
        { upsert: true, new: true },
      );

      console.log("PHONE RESET OTP:", otp);

      return res.status(200).json({
        success: true,
        userId: user._id,
        type: "phone",
        message: "OTP sent to phone",
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================================
// VERIFY FORGOT PASSWORD OTP
// ======================================================
exports.verifyForgotPasswordOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "userId and otp required",
      });
    }

    // FIND USER
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // FIND OTP
    const record = await OTP.findOne({
      userId,
      purpose: "forgot-password",
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    }

    // CHECK EXPIRE
    if (record.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // CHECK OTP
    if (record.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // VERIFIED
    record.verified = true;
    await record.save();

    return res.status(200).json({
      success: true,
      userId: user._id, // ✅ USER ID
      message: "OTP verified successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================================
// RESET PASSWORD
// ======================================================
exports.resetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "userId and newPassword required",
      });
    }

    // FIND USER
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // FIND VERIFIED OTP
    const record = await OTP.findOne({
      userId,
      purpose: "forgot-password",
      verified: true,
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP verification required",
      });
    }

    // HASH PASSWORD
    const hash = await bcrypt.hash(newPassword, 12);

    // UPDATE PASSWORD
    user.password = hash;

    // OPTIONAL
    user.lastPasswordChanged = new Date();

    await user.save();

    // DELETE OTP
    await OTP.deleteOne({ _id: record._id });

    return res.status(200).json({
      success: true,
      userId: user._id, // ✅ USER ID
      message: "Password reset successful",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.addZone = async (req, res) => {
  try {
    const { zone, areas } = req.body;

    if (!zone) {
      return res.status(400).json({
        success: false,
        message: "Zone is required",
      });
    }

    let existingZone = await Zone.findOne({
      zone: zone.trim(),
    });

    // =========================
    // UPDATE EXISTING ZONE
    // =========================
    if (existingZone) {
      if (areas && areas.length > 0) {
        existingZone.areas = [
          ...new Set([...existingZone.areas, ...areas.map((a) => a.trim())]),
        ];
      }

      await existingZone.save();

      return res.status(200).json({
        success: true,
        message: "Zone updated successfully",
        zone: existingZone,
      });
    }

    // =========================
    // CREATE NEW ZONE
    // =========================
    const newZone = await Zone.create({
      zone: zone.trim(),
      areas: (areas || []).map((a) => a.trim()),
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Zone added successfully",
      zone: newZone,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getZones = async (req, res) => {
  try {
    const zones = await Zone.find().sort({ createdAt: -1 });

    return res.json({
      success: true,
      zones,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
exports.checkServiceability = async (req, res) => {
  try {
    const { zone, area } = req.body;

    const zoneData = await Zone.findOne({ zone });

    if (!zoneData) {
      return res.status(404).json({
        success: false,
        serviceable: false,
        message: "Zone not found",
      });
    }

    const ok = zoneData.areas.includes(area);

    if (!ok) {
      return res.status(404).json({
        success: false,
        serviceable: false,
        message: "Area not serviceable",
      });
    }

    return res.json({
      success: true,
      serviceable: true,
      zone,
      area,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
exports.saveManualLocation = async (req, res) => {
  try {
    const { userId, zone, area, address } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const zoneData = await Zone.findOne({ zone });

    if (!zoneData || !zoneData.areas.includes(area)) {
      return res.status(400).json({
        success: false,
        message: "Not serviceable",
      });
    }

    user.location = {
      _id: new mongoose.Types.ObjectId(),
      mode: "manual",
      zone,
      area,
      address,
      coordinates: { lat: null, lng: null },
      isEnabled: true,
    };

    await user.save();

    return res.json({
      success: true,
      message: "Location saved",
      location: user.location,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveAutoLocation = async (req, res) => {
  try {
    const { userId, zone, area, lat, lng, address } = req.body;

    const user = await User.findById(userId);

    const zoneData = await Zone.findOne({ zone });

    if (!zoneData || !zoneData.areas.includes(area)) {
      return res.status(400).json({
        success: false,
        message: "Not serviceable",
      });
    }

    user.location = {
      _id: new mongoose.Types.ObjectId(),
      mode: "auto",
      zone,
      area,
      address,
      coordinates: { lat: Number(lat), lng: Number(lng) },
      isEnabled: true,
    };

    await user.save();

    return res.json({
      success: true,
      message: "Auto location saved",
      location: user.location,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserLocation = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      location: user.location,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteUserLocation = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.location = {
      mode: null,
      zone: null,
      area: null,
      address: null,
      coordinates: { lat: null, lng: null },
      isEnabled: false,
    };

    await user.save();

    return res.json({
      success: true,
      message: "Location deleted",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const { phone, address, city, zipCode, country, isSave } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.addresses.push({
      phone,
      address,
      city,
      zipCode,
      country,
      isSave: typeof isSave === "boolean" ? isSave : false,
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      addresses: user.addresses,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// exports.getAddresses = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);

//     return res.json({
//       success: true,
//       addresses: user.addresses,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const savedAddresses = user.addresses.filter(
      (addr) => addr.isSave === true,
    );

    return res.json({
      success: true,
      addresses: savedAddresses,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    address.phone = req.body.phone || address.phone;
    address.address = req.body.address || address.address;
    address.city = req.body.city || address.city;
    address.zipCode = req.body.zipCode || address.zipCode;
    address.country = req.body.country || address.country;

    await user.save();

    return res.json({
      success: true,
      message: "Address updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      addresses: user.addresses,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    user.addresses.pull(addressId);

    await user.save();

    return res.json({
      success: true,
      message: "Address deleted successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      addresses: user.addresses,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const selectedAddress = user.addresses.id(addressId);

    if (!selectedAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    user.addresses.forEach((addr) => {
      addr.isDefault = false;
    });

    selectedAddress.isDefault = true;

    await user.save();

    return res.json({
      success: true,
      message: "Default address updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      addresses: user.addresses,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =======================
// Get All Users
// =======================
exports.getUsers = async (req, res) => {
  try {
    const { status, search } = req.query;

    // 👇 Direct role 'user' filter add kar dein taake admins/riders na aein
    const filter = { role: "user" };

    if (status && status !== "all") {
      // isBlocked status handle karne ke liye (agar dynamic state query ho)
      if (status === "blocked") filter.isBlocked = true;
      if (status === "active") filter.isBlocked = false;
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}


//------------------------------------  Rider Otps -------------------------------------

exports.sendRiderOTP = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "phone and password required",
      });
    }

    const rider = await User.findOne({
      phone,
      role: "rider",
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    const match = await bcrypt.compare(
      password,
      rider.password
    );

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const otp = generateOtp();

    await OTP.findOneAndUpdate(
      {
        phone,
        purpose: "rider-login",
      },
      {
        userId: rider._id,
        phone,
        otp,
        type: "phone",
        purpose: "rider-login",
        verified: false,
        isUsed: false,
        expiresAt: Date.now() + 5 * 60 * 1000,
      },
      {
        upsert: true,
        new: true,
      }
    );

    console.log("RIDER OTP:", otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// UPDATE USER STATUS (unblock / block)
// =====================================
exports.updateUserStatus = async (req, res) => {
  try {
    const { isBlocked } = req.body;
    console.log("Status", isBlocked);
    // const allowedStatuses = ["blocked", "unblock", "blocked"];

    // if (!allowedStatuses.includes(status)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid status",
    //   });
    // }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `User marked as ${isBlocked}`,
      user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



exports.verifyRiderOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: "phone and otp required",
      });
    }

    const record = await OTP.findOne({
      phone,
      purpose: "rider-login",
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP not found",
      });
    }

    if (record.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    record.verified = true;
    record.isUsed = true;

    await record.save();

    const rider = await User.findOne({
      _id: record.userId,
      role: "rider",
    });

    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    rider.lastLogin = new Date();
    await rider.save();

    const token = generateToken(rider);

    return res.status(200).json({
      success: true,
      message: "Rider login successful",
      token,
      rider: {
        id: rider._id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        role: rider.role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.completeRiderProfile = async (req, res) => {
  try {
    const riderId = req.user.id; // Token se rider id

    const {
      name,
      email,
      phone,
      cnicNumber,
      cnicPicture,
      paymentMethod,
      category,
      vehicleNumber,
      drivingLicenseNumber,
      drivingLicensePicture,
      vehicleModel,
      vehicleEngineSize,
      profilePicture,
      vehiclePicture,
    } = req.body;

    const rider = await User.findById(riderId);

    if (!rider || rider.role !== "rider") {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    // Personal Information
    rider.name = name;
    rider.email = email;
    rider.phone = phone;

    // CNIC
    rider.cnicNumber = cnicNumber;
    rider.cnicPicture = cnicPicture;

    // Payment
    rider.paymentMethod = paymentMethod;

    // Vehicle
    rider.vehicleNumber = vehicleNumber;
    rider.vehicleModel = vehicleModel;
    rider.vehicleEngineSize = vehicleEngineSize;
    rider.riderProfile.category = category;

    // License
    rider.drivingLicenseNumber = drivingLicenseNumber;
    rider.drivingLicensePicture = drivingLicensePicture;
    rider.category = category;
    // Images
    rider.profilePicture = profilePicture;
    rider.vehiclePicture = vehiclePicture;

    rider.isProfileCompleted = true;

    await rider.save();

    return res.status(200).json({
      success: true,
      message: "Rider profile completed successfully",
      rider,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.uploadVerificationSelfie = async (req, res) => {
  try {
    const riderId = req.user.id;

    const rider = await User.findById(riderId);

    if (!rider || rider.role !== "rider") {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    const { selfieUrl } = req.body;

    if (!selfieUrl) {
      return res.status(400).json({
        success: false,
        message: "Selfie image required",
      });
    }

rider.riderProfile.verificationSelfie = selfieUrl;
rider.riderProfile.verificationStatus = "pending";

    await rider.save();

    return res.status(200).json({
      success: true,
      message: "Selfie uploaded successfully",
      verificationStatus: rider.verificationStatus,
      selfieUrl,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.submitVerification = async (req, res) => {
  try {
    const riderId = req.user.id;

    const rider = await User.findById(riderId);

    if (!rider || rider.role !== "rider") {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

  if (!rider.riderProfile.verificationSelfie)  {
      return res.status(400).json({
        success: false,
        message: "Please upload selfie first",
      });
    }

    rider.riderProfile.verificationStatus = "pending";

    await rider.save();

    return res.status(200).json({
      success: true,
      message: "Verification submitted successfully",
      status: rider.verificationStatus,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


exports.getVerificationStatus = async (req, res) => {
  try {
    const riderId = req.user.id;

    const rider = await User.findById(riderId);

    if (!rider || rider.role !== "rider") {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    return res.status(200).json({
      success: true,
verificationStatus: rider.riderProfile.verificationStatus,
verificationReason: rider.riderProfile.verificationReason,
verifiedAt: rider.riderProfile.verifiedAt,
verificationSelfie: rider.riderProfile.verificationSelfie,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


exports.approveRiderVerification = async (req, res) => {
  try {
    const { riderId } = req.params;

    const rider = await User.findById(riderId);

    if (!rider || rider.role !== "rider") {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }
rider.riderProfile.verificationStatus = "approved";
rider.riderProfile.verificationReason = null;
rider.riderProfile.verifiedAt = new Date();

    await rider.save();

    return res.status(200).json({
      success: true,
      message: "Verification approved successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.rejectRiderVerification = async (req, res) => {
  try {
    const { riderId } = req.params;
    const { reason } = req.body;

    const rider = await User.findById(riderId);

    if (!rider || rider.role !== "rider") {
      return res.status(404).json({
        success: false,
        message: "Rider not found",
      });
    }

    rider.verificationStatus = "rejected";
    rider.verificationReason = reason;

    await rider.save();

    return res.status(200).json({
      success: true,
      message: "Verification rejected",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
