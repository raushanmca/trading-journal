export interface StoredUser {
  name?: string;
  email?: string;
  isOwner?: boolean;
  trialStartedAt?: string;
  trialEndsAt?: string;
  isTrialExpired?: boolean;
  trialDays?: number;
}
