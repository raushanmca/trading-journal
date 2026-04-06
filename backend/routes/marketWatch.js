const express = require("express");
const requireAuth = require("../middleware/auth");
const requireActiveTrial = require("../middleware/trial");
const { getMarketWatchForUser } = require("../services/marketWatch/marketWatchService");

const router = express.Router();

router.get("/", requireAuth, requireActiveTrial, async (req, res) => {
  try {
    const payload = await getMarketWatchForUser(req.user.userId);
    res.json(payload);
  } catch (error) {
    console.error("Market watch fetch failed:", error.message);
    res.status(500).json({
      message: "Unable to load market watch news right now",
    });
  }
});

module.exports = router;
