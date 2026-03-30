const User = require("../../models/User");
const {
  MONTHLY_RENEWAL_AMOUNT,
  RENEWAL_PERIOD_DAYS,
  addDays,
  extendAccessEndDate,
  getTrialStatus,
  isOwnerEmail,
  normalizeEmail,
} = require("../../utils/trial");

async function findOrCreateSubscriptionAccount(authUser) {
  let account = await User.findOne({ authProviderId: authUser.userId });

  if (account) {
    return account;
  }

  const normalizedEmail = normalizeEmail(authUser.email || "");
  const now = new Date();

  account = new User({
    authProviderId: authUser.userId,
    email: normalizedEmail,
    name: "",
    picture: "",
    provider: "google",
    isOwner: isOwnerEmail(normalizedEmail),
    trialStartedAt: now,
    trialEndsAt: addDays(now, 30),
  });

  await account.save();
  return account;
}

async function renewSubscription(authUser, payment = {}) {
  const account = await findOrCreateSubscriptionAccount(authUser);

  if (account.isOwner) {
    return {
      account,
      trialStatus: getTrialStatus(account),
    };
  }

  const now = new Date();

  account.trialEndsAt = extendAccessEndDate(
    account.trialEndsAt,
    RENEWAL_PERIOD_DAYS,
    now,
  );
  account.lastRenewedAt = now;
  account.renewalCount = (account.renewalCount || 0) + 1;
  account.lastPaymentMethod = payment.method || "upi";
  account.lastPaymentAmount =
    typeof payment.amount === "number" ? payment.amount : MONTHLY_RENEWAL_AMOUNT;
  account.lastPaymentReference = payment.reference || "";

  await account.save();

  return {
    account,
    trialStatus: getTrialStatus(account),
  };
}

module.exports = {
  renewSubscription,
};
