export interface StoredUser {
  name?: string;
  email?: string;
  isOwner?: boolean;
  renewalCount?: number;
  trialStartedAt?: string;
  trialEndsAt?: string;
  isTrialExpired?: boolean;
  trialDays?: number;
  membershipPlan?: "standard" | "premium";
  isPremium?: boolean;
}

export interface PaymentRequestStatus {
  _id?: string;
  status?: "pending" | "approved" | "rejected";
  paymentReference?: string;
  requestedAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  adminEmail?: string;
}
