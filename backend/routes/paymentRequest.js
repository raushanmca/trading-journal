const express = require("express");
const requireAuth = require("../middleware/auth");
const PaymentRequest = require("../models/PaymentRequest");
const User = require("../models/User");
const { OWNER_EMAIL } = require("../utils/trial");

const router = express.Router();

// User submits a payment approval request
router.post("/request-approval", requireAuth, async (req, res) => {
  try {
    const { paymentReference = "" } = req.body || {};
    const user = await User.findOne({ authProviderId: req.user.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const existingPendingRequest = await PaymentRequest.findOne({
      userId: user._id,
      status: "pending",
    });

    if (existingPendingRequest) {
      return res.status(409).json({
        message: "Your payment approval request is already pending",
        paymentRequest: existingPendingRequest,
      });
    }

    const paymentRequest = new PaymentRequest({
      userId: user._id,
      email: user.email,
      paymentReference,
      status: "pending",
    });
    await paymentRequest.save();
    // TODO: Notify admin (OWNER_EMAIL) here (e.g., email, dashboard notification)
    return res.json({
      message: "Payment approval request submitted",
      paymentRequest,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit request" });
  }
});

// Admin: list all pending requests
router.get("/pending-requests", requireAuth, async (req, res) => {
  try {
    if (req.user.email !== OWNER_EMAIL)
      return res.status(403).json({ message: "Forbidden" });
    const requests = await PaymentRequest.find({ status: "pending" }).populate(
      "userId",
    );
    return res.json({ requests });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch requests" });
  }
});

// Admin: approve a request
router.post("/approve-request", requireAuth, async (req, res) => {
  try {
    if (req.user.email !== OWNER_EMAIL)
      return res.status(403).json({ message: "Forbidden" });
    const { requestId } = req.body;
    const paymentRequest =
      await PaymentRequest.findById(requestId).populate("userId");
    if (!paymentRequest || paymentRequest.status !== "pending")
      return res
        .status(404)
        .json({ message: "Request not found or already processed" });
    // Extend subscription for user
    const user = paymentRequest.userId;
    const now = new Date();
    user.trialEndsAt = require("../utils/trial").extendAccessEndDate(
      user.trialEndsAt,
      require("../utils/trial").RENEWAL_PERIOD_DAYS,
      now,
    );
    user.lastRenewedAt = now;
    user.renewalCount = (user.renewalCount || 0) + 1;
    user.lastPaymentMethod = "manual-admin";
    user.lastPaymentAmount = require("../utils/trial").MONTHLY_RENEWAL_AMOUNT;
    user.lastPaymentReference =
      paymentRequest.paymentReference || "manual-admin";
    user.membershipPlan = "premium";
    await user.save();
    paymentRequest.status = "approved";
    paymentRequest.approvedAt = now;
    paymentRequest.adminId = req.user._id;
    paymentRequest.adminEmail = req.user.email;
    await paymentRequest.save();
    // TODO: Notify user of approval (e.g., email, dashboard notification)
    return res.json({
      message: "Subscription approved and extended by 30 days",
      paymentRequest,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to approve request" });
  }
});

module.exports = router;
