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
