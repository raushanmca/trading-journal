const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalhost(hostname: string) {
  return LOCAL_HOSTNAMES.has(hostname);
}

function isLocalApiUrl(value: string) {
  try {
    const url = new URL(value);
    return isLocalhost(url.hostname);
  } catch {
    return false;
  }
}

export function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();

  if (typeof window === "undefined") {
    return configuredBaseUrl || "";
  }

  const appHostname = window.location.hostname;
  const appOrigin = window.location.origin;

  if (!configuredBaseUrl) {
    return isLocalhost(appHostname) ? "http://localhost:5000" : appOrigin;
  }

  if (!isLocalhost(appHostname) && isLocalApiUrl(configuredBaseUrl)) {
    return appOrigin;
  }

  return configuredBaseUrl;
}
