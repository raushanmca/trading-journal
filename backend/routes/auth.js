const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");
const {
  OWNER_EMAIL,
  addDays,
  isOwnerEmail,
  normalizeEmail,
} = require("../utils/trial");
const { getFrontendUrl } = require("../services/auth/frontendUrlService");
const {
  findOrCreateUser,
  recordSuccessfulLogin,
} = require("../services/auth/userAccountService");
const {
  buildAuthenticatedUser,
  buildAuthToken,
} = require("../services/auth/authResponseService");
const requireAuth = require("../middleware/auth");

// Admin: Get all users and their subscription status
router.get("/all-users", requireAuth, async (req, res) => {
  try {
    if (normalizeEmail(req.user.email || "") !== OWNER_EMAIL)
      return res.status(403).json({ message: "Forbidden" });
    const users = await User.find(
      {},
      "email name trialEndsAt renewalCount isOwner loginCount lastLoginAt membershipPlan",
    )
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ users });
  } catch (error) {
    console.error("Failed to fetch users:", {
      message: error.message,
      email: req.user?.email,
    });
    return res.status(500).json({
      message: error.message || "Failed to fetch users",
    });
  }
});

router.get("/admin-overview", requireAuth, async (req, res) => {
  try {
    if (normalizeEmail(req.user.email || "") !== OWNER_EMAIL) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const PaymentRequest = require("../models/PaymentRequest");
    const [users, pendingRequests] = await Promise.all([
      User.find(
        {},
        "email name trialEndsAt renewalCount isOwner loginCount lastLoginAt membershipPlan",
      )
        .sort({ updatedAt: -1 })
        .lean(),
      PaymentRequest.find(
        { status: "pending" },
        "email paymentReference status requestedAt approvedAt adminEmail createdAt",
      )
        .sort({ requestedAt: -1 })
        .lean(),
    ]);

    return res.json({ users, pendingRequests });
  } catch (error) {
    console.error("Failed to fetch admin overview:", {
      message: error.message,
      email: req.user?.email,
    });
    return res.status(500).json({
      message: error.message || "Failed to fetch admin overview",
    });
  }
});

router.delete("/user/:userId", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");
    let email = "";

    if (token) {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString(),
        );
        email = payload.email || "";
      } catch {}
    }

    if (email !== OWNER_EMAIL) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { userId } = req.params;
    const account = await User.findById(userId);

    if (!account) {
      return res.status(404).json({ message: "User not found" });
    }

    if (account.email === OWNER_EMAIL || account.isOwner) {
      return res
        .status(400)
        .json({ message: "Owner account cannot be deleted" });
    }

    const Journal = require("../models/Journal");
    const PaymentRequest = require("../models/PaymentRequest");

    await Promise.all([
      Journal.deleteMany({
        $or: [{ userId: account.authProviderId }, { userEmail: account.email }],
      }),
      PaymentRequest.deleteMany({
        $or: [{ userId: account._id }, { email: account.email }],
      }),
      User.deleteOne({ _id: account._id }),
    ]);

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Failed to delete user:", error.message);
    return res.status(500).json({ message: "Failed to delete user" });
  }
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Email/Password Register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email || "");

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Account already exists" });
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(password, 10);
    const name = normalizedEmail.split("@")[0] || "Trader";

    const account = new User({
      authProviderId: `local:${normalizedEmail}`,
      email: normalizedEmail,
      name,
      picture: "",
      provider: "local",
      passwordHash,
      isOwner: isOwnerEmail(normalizedEmail),
      trialStartedAt: now,
      trialEndsAt: addDays(now, 30),
    });

    await account.save();
    const loggedInAccount = await recordSuccessfulLogin(account);
    const { user } = buildAuthenticatedUser(loggedInAccount);
    const token = buildAuthToken(loggedInAccount);
    return res.json({ token, user });
  } catch (err) {
    console.error("Registration failed:", err.message);
    return res.status(500).json({ message: "Registration failed" });
  }
});

// Email/Password Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email || "");

    if (!normalizedEmail || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const account = await User.findOne({ email: normalizedEmail });
    if (!account || !account.passwordHash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, account.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const loggedInAccount = await recordSuccessfulLogin(account);
    const { user } = buildAuthenticatedUser(loggedInAccount);
    const token = buildAuthToken(loggedInAccount);
    return res.json({ token, user });
  } catch (err) {
    console.error("Login failed:", err.message);
    return res.status(500).json({ message: "Login failed" });
  }
});

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
    const loggedInAccount = await recordSuccessfulLogin(account);
    const { user } = buildAuthenticatedUser(loggedInAccount);
    const authToken = buildAuthToken(loggedInAccount);

    res.json({ token: authToken, user });
  } catch (err) {
    console.error("Google authentication failed:", err.message);
    res.status(401).json({
      message: err.message || "Google authentication failed",
    });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const account = await User.findOne({
      $or: [
        { authProviderId: req.user.userId },
        { email: normalizeEmail(req.user.email || "") },
      ],
    });

    if (!account) {
      return res.status(404).json({ message: "User not found" });
    }

    const { user } = buildAuthenticatedUser(account);
    return res.json({ user });
  } catch (error) {
    console.error("Failed to fetch current user:", {
      message: error.message,
      userId: req.user?.userId,
      email: req.user?.email,
    });
    return res.status(500).json({
      message: error.message || "Failed to fetch user",
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
    const loggedInAccount = await recordSuccessfulLogin(account);
    const { trialStatus } = buildAuthenticatedUser(loggedInAccount);
    const token = buildAuthToken(loggedInAccount);

    const frontendUrl = getFrontendUrl();
    const userPayload = encodeURIComponent(
      JSON.stringify({
        email: loggedInAccount.email,
        name: loggedInAccount.name,
        picture: loggedInAccount.picture,
        provider: loggedInAccount.provider,
        isOwner: trialStatus.isOwner,
        trialStartedAt: trialStatus.trialStartedAt,
        trialEndsAt: trialStatus.trialEndsAt,
        isTrialExpired: trialStatus.isTrialExpired,
        trialDays: trialStatus.trialDays,
        membershipPlan: loggedInAccount.membershipPlan || "standard",
        isPremium:
          trialStatus.isOwner ||
          (loggedInAccount.membershipPlan || "standard") === "premium",
      }),
    );

    res.redirect(`${frontendUrl}/dashboard?token=${token}&user=${userPayload}`);
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
