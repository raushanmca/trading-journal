const User = require("../../models/User");
const {
  addDays,
  isOwnerEmail,
  normalizeEmail,
} = require("../../utils/trial");

async function findOrCreateUser({
  authProviderId,
  email,
  name,
  picture,
  provider,
}) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  let user = await User.findOne({ authProviderId });

  if (!user && normalizedEmail) {
    user = await User.findOne({ email: normalizedEmail });
  }

  if (!user) {
    user = new User({
      authProviderId,
      email: normalizedEmail,
      name,
      picture,
      provider,
      isOwner: isOwnerEmail(normalizedEmail),
      trialStartedAt: now,
      trialEndsAt: addDays(now, 30),
    });
  } else {
    user.authProviderId = authProviderId;
    user.email = normalizedEmail;
    user.name = name;
    user.picture = picture;
    user.provider = provider;
    user.isOwner = isOwnerEmail(normalizedEmail);
  }

  await user.save();
  return user;
}

async function recordSuccessfulLogin(user) {
  user.loginCount = (user.loginCount || 0) + 1;
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

module.exports = {
  findOrCreateUser,
  recordSuccessfulLogin,
};
