const jwt = require("jsonwebtoken");
const { getTrialStatus } = require("../../utils/trial");

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

function buildAuthenticatedUser(account) {
  const trialStatus = getTrialStatus(account);

  return {
    trialStatus,
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
