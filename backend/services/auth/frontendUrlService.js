function getFrontendUrl() {
  const frontendUrl = process.env.FRONTEND_URL?.trim();

  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is not configured");
  }

  return frontendUrl.replace(/\/+$/, "");
}

module.exports = {
  getFrontendUrl,
};
