const express = require("express");
const requireAuth = require("../middleware/auth");
const { renewSubscription } = require("../services/subscription/subscriptionService");
const { MONTHLY_RENEWAL_AMOUNT } = require("../utils/trial");

const router = express.Router();

router.post("/renew", requireAuth, async (req, res) => {
  try {
    const { paymentReference = "" } = req.body || {};
    const { account, trialStatus } = await renewSubscription(req.user, {
      amount: MONTHLY_RENEWAL_AMOUNT,
      method: "upi",
      reference: paymentReference,
    });

    return res.json({
      message: "Subscription renewed successfully",
      user: {
        email: account.email,
        name: account.name,
        picture: account.picture,
        provider: account.provider,
        isOwner: trialStatus.isOwner,
        trialStartedAt: trialStatus.trialStartedAt,
        trialEndsAt: trialStatus.trialEndsAt,
        isTrialExpired: trialStatus.isTrialExpired,
        trialDays: trialStatus.trialDays,
      },
      renewal: {
        amount: MONTHLY_RENEWAL_AMOUNT,
        renewalCount: account.renewalCount || 0,
      },
    });
  } catch (error) {
    console.error("Subscription renewal failed:", error.message);
    return res.status(500).json({
      message: "Unable to renew subscription",
    });
  }
});

module.exports = router;
