const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/auth");
const requireActiveTrial = require("../middleware/trial");
const {
  createJournalEntry,
  deleteJournalEntries,
  getJournalEntries,
} = require("../services/journal/journalService");

// ✅ Create Journal Entry
router.post("/", requireAuth, requireActiveTrial, async (req, res) => {
  try {
    const saved = await createJournalEntry(req.body, req.user);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get All Journals
router.get("/", requireAuth, requireActiveTrial, async (req, res) => {
  try {
    const data = await getJournalEntries(req.user.userId, {
      view: req.query.view === "dashboard" ? "dashboard" : "full",
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all journals for the signed-in user
router.delete("/", requireAuth, async (req, res) => {
  try {
    const deletedCount = await deleteJournalEntries(req.user.userId);
    res.json({ deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update single journal entry
router.put("/:id", requireAuth, requireActiveTrial, async (req, res) => {
  try {
    const {
      updateJournalEntry,
    } = require("../services/journal/journalService");
    const updated = await updateJournalEntry(req.params.id, req.body, req.user);
    res.json(updated);
  } catch (err) {
    if (err.message === "Journal entry not found or access denied") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
