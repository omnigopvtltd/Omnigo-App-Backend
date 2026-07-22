const User = require("../models/User");

// =====================================
// RIDER: SUBMIT CNIC VERIFICATION
// =====================================
exports.submitCnicVerification = async (req, res) => {
  try {
    const { cnicNumber, frontImage, backImage } = req.body;

    if (!cnicNumber || !frontImage || !backImage) {
      return res.status(400).json({
        success: false,
        message: "cnicNumber, frontImage, and backImage are required",
      });
    }

    const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicPattern.test(cnicNumber)) {
      return res.status(400).json({
        success: false,
        message: "cnicNumber must be in the format 12345-1234567-1",
      });
    }

    const rider = await User.findOne({ _id: req.user.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    rider.riderProfile.cnicVerification = {
      cnicNumber,
      frontImage,
      backImage,
      status: "pending",
      submittedAt: new Date(),
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: "",
    };

    await rider.save();

    return res.status(200).json({
      success: true,
      message: "CNIC submitted for review",
      cnicVerification: rider.riderProfile.cnicVerification,
    });
  } catch (err) {
    console.log("SUBMIT CNIC ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// RIDER: SUBMIT FACE VERIFICATION
// =====================================
exports.submitFaceVerification = async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: "image is required" });
    }

    const rider = await User.findOne({ _id: req.user.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    rider.riderProfile.faceVerification = {
      image,
      status: "pending",
      submittedAt: new Date(),
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: "",
    };

    await rider.save();

    return res.status(200).json({
      success: true,
      message: "Face photo submitted for review",
      faceVerification: rider.riderProfile.faceVerification,
    });
  } catch (err) {
    console.log("SUBMIT FACE VERIFICATION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// RIDER: GET MY VERIFICATION STATUS
// =====================================
exports.getMyVerificationStatus = async (req, res) => {
  try {
    const rider = await User.findOne({ _id: req.user.id, role: "rider" }).select(
      "riderProfile.cnicVerification riderProfile.faceVerification"
    );
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    return res.status(200).json({
      success: true,
      cnicVerification: rider.riderProfile.cnicVerification,
      faceVerification: rider.riderProfile.faceVerification,
      isFullyVerified:
        rider.riderProfile.cnicVerification?.status === "verified" &&
        rider.riderProfile.faceVerification?.status === "verified",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: REVIEW CNIC VERIFICATION
// =====================================
exports.reviewCnicVerification = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const allowed = ["verified", "rejected"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'verified' or 'rejected'" });
    }
    if (status === "rejected" && !rejectionReason) {
      return res.status(400).json({ success: false, message: "rejectionReason is required when rejecting" });
    }

    const rider = await User.findOne({ _id: req.params.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    if (!rider.riderProfile?.cnicVerification || rider.riderProfile.cnicVerification.status !== "pending") {
      return res.status(400).json({ success: false, message: "No pending CNIC submission for this rider" });
    }

    rider.riderProfile.cnicVerification.status = status;
    rider.riderProfile.cnicVerification.verifiedAt = new Date();
    rider.riderProfile.cnicVerification.verifiedBy = req.user.id;
    rider.riderProfile.cnicVerification.rejectionReason = status === "rejected" ? rejectionReason : "";

    await rider.save();

    return res.status(200).json({
      success: true,
      message: `CNIC ${status}`,
      cnicVerification: rider.riderProfile.cnicVerification,
    });
  } catch (err) {
    console.log("REVIEW CNIC ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: REVIEW FACE VERIFICATION
// =====================================
exports.reviewFaceVerification = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const allowed = ["verified", "rejected"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'verified' or 'rejected'" });
    }
    if (status === "rejected" && !rejectionReason) {
      return res.status(400).json({ success: false, message: "rejectionReason is required when rejecting" });
    }

    const rider = await User.findOne({ _id: req.params.id, role: "rider" });
    if (!rider) return res.status(404).json({ success: false, message: "Rider not found" });

    if (!rider.riderProfile?.faceVerification || rider.riderProfile.faceVerification.status !== "pending") {
      return res.status(400).json({ success: false, message: "No pending face submission for this rider" });
    }

    rider.riderProfile.faceVerification.status = status;
    rider.riderProfile.faceVerification.verifiedAt = new Date();
    rider.riderProfile.faceVerification.verifiedBy = req.user.id;
    rider.riderProfile.faceVerification.rejectionReason = status === "rejected" ? rejectionReason : "";

    await rider.save();

    return res.status(200).json({
      success: true,
      message: `Face verification ${status}`,
      faceVerification: rider.riderProfile.faceVerification,
    });
  } catch (err) {
    console.log("REVIEW FACE VERIFICATION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// =====================================
// ADMIN: GET ALL PENDING VERIFICATIONS (queue)
// =====================================
exports.getPendingVerifications = async (req, res) => {
  try {
    const riders = await User.find({
      role: "rider",
      $or: [
        { "riderProfile.cnicVerification.status": "pending" },
        { "riderProfile.faceVerification.status": "pending" },
      ],
    }).select("name email phone riderProfile.cnicVerification riderProfile.faceVerification");

    return res.status(200).json({ success: true, count: riders.length, riders });
  } catch (err) {
    console.log("GET PENDING VERIFICATIONS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};