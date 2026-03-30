const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const router = express.Router();
const User = require("../models/User");
const { addDays, getTrialStatus, isOwnerEmail, normalizeEmail } = require("../utils/trial");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

function getFrontendUrl() {
  const frontendUrl = process.env.FRONTEND_URL?.trim();

  if (!frontendUrl) {
    throw new Error("FRONTEND_URL is not configured");
  }

  return frontendUrl.replace(/\/+$/, "");
}

async function findOrCreateUser({
  authProviderId,
  email,
  name,
  picture,
  provider,
}) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  let user = await User.findOne({ authProviderId });

  if (!user && normalizedEmail) {
    user = await User.findOne({ email: normalizedEmail });
  }

  if (!user) {
    user = new User({
      authProviderId,
      email: normalizedEmail,
      name,
      picture,
      provider,
      isOwner: isOwnerEmail(normalizedEmail),
      trialStartedAt: now,
      trialEndsAt: addDays(now, 30),
    });
  } else {
    user.authProviderId = authProviderId;
    user.email = normalizedEmail;
    user.name = name;
    user.picture = picture;
    user.provider = provider;
    user.isOwner = isOwnerEmail(normalizedEmail);
  }

  await user.save();
  return user;
}

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
    const trialStatus = getTrialStatus(account);

    const user = {
      email: account.email,
      name: account.name,
      picture: account.picture,
      provider: account.provider,
      isOwner: trialStatus.isOwner,
      trialStartedAt: trialStatus.trialStartedAt,
      trialEndsAt: trialStatus.trialEndsAt,
      isTrialExpired: trialStatus.isTrialExpired,
      trialDays: trialStatus.trialDays,
    };

    const authToken = jwt.sign(
      { userId: account.authProviderId, email: account.email },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

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
    const trialStatus = getTrialStatus(account);

    const token = jwt.sign(
      { userId: account.authProviderId, email: account.email },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

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
