const express = require("express");
const router = express.Router();
const Journal = require("../models/Journal");

// ✅ Create Journal Entry
router.post("/", async (req, res) => {
  try {
    const journal = new Journal(req.body);
    const saved = await journal.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get All Journals
router.get("/", async (req, res) => {
  try {
    const data = await Journal.find().sort({ createdAt: -1 });
    if (data.length === 0) {
      return res.status(404).json({ message: "No journal entries found" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
