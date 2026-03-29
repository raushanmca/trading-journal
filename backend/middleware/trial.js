const User = require("../models/User");
const {
  addDays,
  getTrialStatus,
  isOwnerEmail,
  normalizeEmail,
} = require("../utils/trial");

async function requireActiveTrial(req, res, next) {
  try {
    let user = await User.findOne({ authProviderId: req.user.userId });

    if (!user) {
      const normalizedEmail = normalizeEmail(req.user.email || "");
      const now = new Date();

      user = new User({
        authProviderId: req.user.userId,
        email: normalizedEmail,
        name: "",
        picture: "",
        provider: "google",
        isOwner: isOwnerEmail(normalizedEmail),
        trialStartedAt: now,
        trialEndsAt: addDays(now, 30),
      });

      await user.save();
    }

    const trialStatus = getTrialStatus(user);

    if (trialStatus.isTrialExpired) {
      return res.status(403).json({
        message: "Your 30-day trial has expired",
        trial: trialStatus,
      });
    }

    req.account = user;
    req.trial = trialStatus;
    next();
  } catch (error) {
    console.error("Trial check failed:", error.message);
    return res.status(500).json({ message: "Unable to verify trial status" });
  }
}

module.exports = requireActiveTrial;
