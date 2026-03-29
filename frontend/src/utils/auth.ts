export function getAuthToken() {
  return localStorage.getItem("token");
}

export function getStoredUser() {
  const rawUser = localStorage.getItem("user");

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    console.error("Failed to parse stored user", error);
    return null;
  }
}

export function isTrialExpired(user = getStoredUser()) {
  return Boolean(user?.isTrialExpired);
}

export function getTrialDaysRemaining(user = getStoredUser()) {
  if (!user?.trialEndsAt || user?.isOwner) {
    return null;
  }

  const now = new Date();
  const trialEndsAt = new Date(user.trialEndsAt);
  const millisecondsRemaining = trialEndsAt.getTime() - now.getTime();

  if (millisecondsRemaining <= 0) {
    return 0;
  }

  return Math.ceil(millisecondsRemaining / (1000 * 60 * 60 * 24));
}

export function getUserStorageKey(prefix: string) {
  const user = getStoredUser();
  const identity = user?.email || user?.name;

  return identity ? `${prefix}:${identity}` : null;
}

export function getAuthHeaders() {
  const token = getAuthToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}
