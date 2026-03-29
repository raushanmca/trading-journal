const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key";

// Google Login
router.post("/google", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(400).json({ message: "Invalid token" });

    const user = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      provider: "google",
    };

    // TODO: Save or find user in your database (MongoDB / PostgreSQL)

    const token = jwt.sign(
      { userId: payload.sub, email: payload.email },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Google authentication failed" });
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

    const user = {
      email: githubUser.email || `${githubUser.login}@github.com`,
      name: githubUser.name || githubUser.login,
      picture: githubUser.avatar_url,
      provider: "github",
    };

    // TODO: Save/find user in DB

    const token = jwt.sign(
      { userId: githubUser.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Redirect back to frontend with token (or set cookie)
    res.redirect(`http://localhost:5173/dashboard?token=${token}`);
  } catch (err) {
    console.error(err);
    res.redirect("http://localhost:5173/login?error= github_failed");
  }
});

module.exports = router;
