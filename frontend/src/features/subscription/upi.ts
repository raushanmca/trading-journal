const MONTHLY_RENEWAL_AMOUNT = 10;
const DEFAULT_PAYEE_NAME = "Trading Journal";
const DEFAULT_UPI_ID = "9902127815@upi";

function getConfiguredUpiId() {
  return import.meta.env.VITE_UPI_ID?.trim() || DEFAULT_UPI_ID;
}

function getConfiguredPayeeName() {
  return import.meta.env.VITE_UPI_NAME?.trim() || DEFAULT_PAYEE_NAME;
}

export function getMonthlyRenewalAmount() {
  return MONTHLY_RENEWAL_AMOUNT;
}

export function hasUpiConfiguration() {
  return Boolean(getConfiguredUpiId());
}

export function buildRenewalUpiUrl(email = "") {
  const upiId = getConfiguredUpiId();

  if (!upiId) {
    return null;
  }

  const params = new URLSearchParams({
    pa: upiId,
    pn: getConfiguredPayeeName(),
    am: MONTHLY_RENEWAL_AMOUNT.toFixed(2),
    cu: "INR",
    tn: email
      ? `Trading Journal renewal for ${email}`
      : "Trading Journal renewal",
  });

  return `upi://pay?${params.toString()}`;
}

export function getRenewalUpiId() {
  return getConfiguredUpiId();
}
