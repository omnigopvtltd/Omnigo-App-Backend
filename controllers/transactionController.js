const Transaction = require("../models/Transaction");

// ========================================================
// 1. CREATE TRANSACTION WITH IMAGE SLIP (POST)
// ========================================================
exports.createTransaction = async (req, res) => {
  try {
    const {
      userId,
      vendorId,
      type,
      paymentMethod,
      amount,
      accountDetails,
      transactionRef,
      adminNote,
      source,
    } = req.body;

    // Extract image path if uploaded via req.file (Multer)
    let transactionSlip = req.file ? `https://api.omnigoapp.com/uploads/transactions/${req.file.filename}` : req.body.transactionSlip;

    if (!type || !paymentMethod || !amount) {
      return res.status(400).json({
        success: false,
        message: "Type, paymentMethod, and amount are required.",
      });
    }

    if (!userId && !vendorId) {
      return res.status(400).json({
        success: false,
        message: "Either userId or vendorId must be provided.",
      });
    }

    // Parse accountDetails if sent as stringified JSON in form-data
    let parsedAccountDetails = accountDetails;
    if (typeof accountDetails === "string") {
      try {
        parsedAccountDetails = JSON.parse(accountDetails);
      } catch (e) {
        parsedAccountDetails = {};
      }
    }

    const transaction = await Transaction.create({
      userId,
      vendorId,
      type: type.toUpperCase(),
      paymentMethod: paymentMethod.toUpperCase(),
      amount: Number(amount),
      accountDetails: parsedAccountDetails,
      transactionSlip,
      transactionRef,
      adminNote,
      source,
    });

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: transaction,
    });
  } catch (err) {
    console.error("CREATE TRANSACTION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 2. GET ALL TRANSACTIONS WITH FILTERS & PAGINATION (GET)
// ========================================================
exports.getTransactions = async (req, res) => {
  try {
    const { userId, vendorId, type, status, source, page = 1, limit = 30 } = req.query;
    const query = {};

    if (userId) query.userId = userId;
    if (vendorId) query.vendorId = vendorId;
    if (type && type !== "all") query.type = type;
    if (status && status !== "all") query.status = status;
    if (source && source !== "all") query.source = source;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 30, 1);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate("userId", "name email phone")
        .populate("vendorId", "businessName logo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: transactions,
    });
  } catch (err) {
    console.error("GET TRANSACTIONS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 3. GET TRANSACTION BY ID (GET)
// ========================================================
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id)
      .populate("userId", "name email phone")
      .populate("vendorId", "businessName logo");

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (err) {
    console.error("GET TRANSACTION BY ID ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 2. UPDATE TRANSACTION & SLIP (PUT)
// ========================================================
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // If new image uploaded, replace existing slip path
    if (req.file) {
      updateData.transactionSlip = `https://api.omnigoapp.com/uploads/transactions/${req.file.filename}`;
    }

    if (updateData.accountDetails && typeof updateData.accountDetails === "string") {
      try {
        updateData.accountDetails = JSON.parse(updateData.accountDetails);
      } catch (e) {}
    }

    const transaction = await Transaction.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: transaction,
    });
  } catch (err) {
    console.error("UPDATE TRANSACTION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 5. UPDATE TRANSACTION STATUS (PATCH / PUT)
// ========================================================
exports.updateTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote, transactionRef } = req.body;

    const validStatuses = ["PENDING", "COMPLETED", "FAILED", "REJECTED"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values are: ${validStatuses.join(", ")}`,
      });
    }

    const updateFields = { status };
    if (adminNote) updateFields.adminNote = adminNote;
    if (transactionRef) updateFields.transactionRef = transactionRef;

    const transaction = await Transaction.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Transaction status updated to ${status}`,
      data: transaction,
    });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================
// 6. DELETE TRANSACTION (DELETE)
// ========================================================
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findByIdAndDelete(id);

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (err) {
    console.error("DELETE TRANSACTION ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};