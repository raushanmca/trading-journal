const express = require("express");
const router = express.Router();
const Journal = require("../models/Journal");
const requireAuth = require("../middleware/auth");
const requireActiveTrial = require("../middleware/trial");

// ✅ Create Journal Entry
router.post("/", requireAuth, requireActiveTrial, async (req, res) => {
  try {
    const journal = new Journal({
      ...req.body,
      userId: req.user.userId,
      userEmail: req.user.email || "",
    });
    const saved = await journal.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get All Journals
router.get("/", requireAuth, requireActiveTrial, async (req, res) => {
  try {
    const data = await Journal.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
