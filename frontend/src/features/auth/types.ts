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
