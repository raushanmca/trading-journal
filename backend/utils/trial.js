const OWNER_EMAIL = "rshan45@gmail.com";
const TRIAL_PERIOD_DAYS = 30;

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function isOwnerEmail(email = "") {
  return normalizeEmail(email) === OWNER_EMAIL;
}

function getTrialStatus(user) {
  const now = new Date();
  const trialEndsAt = user?.trialEndsAt ? new Date(user.trialEndsAt) : now;
  const isOwner = Boolean(user?.isOwner || isOwnerEmail(user?.email));
  const isTrialExpired = !isOwner && trialEndsAt.getTime() < now.getTime();

  return {
    isOwner,
    isTrialExpired,
    trialStartedAt: user?.trialStartedAt || now,
    trialEndsAt,
    trialDays: TRIAL_PERIOD_DAYS,
  };
}

module.exports = {
  OWNER_EMAIL,
  TRIAL_PERIOD_DAYS,
  addDays,
  getTrialStatus,
  isOwnerEmail,
  normalizeEmail,
};
