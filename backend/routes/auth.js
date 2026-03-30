const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const router = express.Router();
const { getFrontendUrl } = require("../services/auth/frontendUrlService");
const { findOrCreateUser } = require("../services/auth/userAccountService");
const {
  buildAuthenticatedUser,
  buildAuthToken,
} = require("../services/auth/authResponseService");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Google Login
router.post("/google", async (req, res) => {
  const { token } = req.body;

  if (!GOOGLE_CLIENT_ID) {
    return res
      .status(500)
      .json({ message: "GOOGLE_CLIENT_ID is not configured" });
  }

  if (!token) {
    return res.status(400).json({ message: "Google token is missing" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(400).json({ message: "Invalid token" });

    const account = await findOrCreateUser({
      authProviderId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      provider: "google",
    });
    const { user } = buildAuthenticatedUser(account);
    const authToken = buildAuthToken(account);

    res.json({ token: authToken, user });
  } catch (err) {
    console.error("Google authentication failed:", err.message);
    res.status(401).json({
      message: err.message || "Google authentication failed",
    });
  }
});

// GitHub Login - Redirect
router.get("/github", (req, res) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user`;
  res.redirect(githubAuthUrl);
});

// GitHub Callback
router.get("/github/callback", async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } },
    );

    const accessToken = tokenRes.data.access_token;

    // Get user info
    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUser = userRes.data;

    const account = await findOrCreateUser({
      authProviderId: String(githubUser.id),
      email: githubUser.email || `${githubUser.login}@github.com`,
      name: githubUser.name || githubUser.login,
      picture: githubUser.avatar_url,
      provider: "github",
    });
    const { trialStatus } = buildAuthenticatedUser(account);
    const token = buildAuthToken(account);

    const frontendUrl = getFrontendUrl();
    const userPayload = encodeURIComponent(
      JSON.stringify({
        email: account.email,
        name: account.name,
        picture: account.picture,
        provider: account.provider,
        isOwner: trialStatus.isOwner,
        trialStartedAt: trialStatus.trialStartedAt,
        trialEndsAt: trialStatus.trialEndsAt,
        isTrialExpired: trialStatus.isTrialExpired,
        trialDays: trialStatus.trialDays,
      }),
    );

    res.redirect(
      `${frontendUrl}/dashboard?token=${token}&user=${userPayload}`,
    );
  } catch (err) {
    console.error(err);
    try {
      const frontendUrl = getFrontendUrl();
      res.redirect(`${frontendUrl}/login?error=github_failed`);
    } catch (frontendUrlError) {
      res.status(500).json({
        message: frontendUrlError.message || "FRONTEND_URL is not configured",
      });
    }
  }
});

module.exports = router;
