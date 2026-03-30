const OWNER_EMAIL = "rshan45@gmail.com";
const TRIAL_PERIOD_DAYS = 30;
const RENEWAL_PERIOD_DAYS = 30;
const MONTHLY_RENEWAL_AMOUNT = 10;

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function extendAccessEndDate(currentEndDate, days, now = new Date()) {
  const activeEndDate =
    currentEndDate && new Date(currentEndDate).getTime() > now.getTime()
      ? new Date(currentEndDate)
      : now;

  return addDays(activeEndDate, days);
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
  MONTHLY_RENEWAL_AMOUNT,
  RENEWAL_PERIOD_DAYS,
  TRIAL_PERIOD_DAYS,
  addDays,
  extendAccessEndDate,
  getTrialStatus,
  isOwnerEmail,
  normalizeEmail,
};
