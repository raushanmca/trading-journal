const express = require("express");
const requireAuth = require("../middleware/auth");
const PaymentRequest = require("../models/PaymentRequest");
const User = require("../models/User");
const { OWNER_EMAIL } = require("../utils/trial");
const { buildAuthenticatedUser } = require("../services/auth/authResponseService");

const router = express.Router();

function isOwnerRequest(req) {
  return req.user.email === OWNER_EMAIL;
}

async function processRequest(req, res, nextStatus) {
  try {
    if (!isOwnerRequest(req)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { requestId } = req.body;
    const paymentRequest =
      await PaymentRequest.findById(requestId).populate("userId");

    if (!paymentRequest || paymentRequest.status !== "pending") {
      return res
        .status(404)
        .json({ message: "Request not found or already processed" });
    }

    const now = new Date();

    if (nextStatus === "approved") {
      const user = paymentRequest.userId;
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
      paymentRequest.rejectedAt = null;
    } else {
      paymentRequest.status = "rejected";
      paymentRequest.rejectedAt = now;
      paymentRequest.approvedAt = null;
    }

    paymentRequest.adminId = req.user._id;
    paymentRequest.adminEmail = req.user.email;
    await paymentRequest.save();

    return res.json({
      message:
        nextStatus === "approved"
          ? "Subscription approved and extended by 30 days"
          : "Payment request denied",
      paymentRequest,
    });
  } catch (error) {
    return res.status(500).json({
      message:
        nextStatus === "approved"
          ? "Failed to approve request"
          : "Failed to deny request",
    });
  }
}

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
    if (!isOwnerRequest(req))
      return res.status(403).json({ message: "Forbidden" });
    const requests = await PaymentRequest.find(
      { status: "pending" },
      "email paymentReference status requestedAt approvedAt adminEmail createdAt",
    )
      .sort({ requestedAt: -1 })
      .lean();
    return res.json({ requests });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch requests" });
  }
});

router.get("/my-status", requireAuth, async (req, res) => {
  try {
    const account = await User.findOne({ authProviderId: req.user.userId });

    if (!account) {
      return res.status(404).json({ message: "User not found" });
    }

    const latestRequest = await PaymentRequest.findOne(
      { userId: account._id },
      "status paymentReference requestedAt approvedAt rejectedAt adminEmail createdAt",
    )
      .sort({ requestedAt: -1, createdAt: -1 })
      .lean();

    const { user } = buildAuthenticatedUser(account);

    return res.json({
      user,
      paymentRequest: latestRequest,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch payment request status" });
  }
});

// Admin: approve a request
router.post("/approve-request", requireAuth, async (req, res) => {
  return processRequest(req, res, "approved");
});

// Admin: deny a request
router.post("/deny-request", requireAuth, async (req, res) => {
  return processRequest(req, res, "rejected");
});

module.exports = router;
