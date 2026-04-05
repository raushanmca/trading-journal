const jwt = require("jsonwebtoken");
const { getTrialStatus } = require("../../utils/trial");

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

function buildAuthenticatedUser(account) {
  const trialStatus = getTrialStatus(account);
  const membershipPlan = account.membershipPlan || "standard";
  const isPremium = trialStatus.isOwner || membershipPlan === "premium";

  return {
    trialStatus,
    user: {
      email: account.email,
      name: account.name,
      picture: account.picture,
      provider: account.provider,
      isOwner: trialStatus.isOwner,
      renewalCount: account.renewalCount || 0,
      trialStartedAt: trialStatus.trialStartedAt,
      trialEndsAt: trialStatus.trialEndsAt,
      isTrialExpired: trialStatus.isTrialExpired,
      trialDays: trialStatus.trialDays,
      membershipPlan,
      isPremium,
    },
  };
}

function buildAuthToken(account) {
  return jwt.sign(
    { userId: account.authProviderId, email: account.email },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

module.exports = {
  buildAuthenticatedUser,
  buildAuthToken,
};
