const express = require("express");
const requireAuth = require("../middleware/auth");
const requireActiveTrial = require("../middleware/trial");
const {
  processJournalAssistantRequest,
} = require("../services/ai/journalAssistantService");

const router = express.Router();

router.post(
  "/journal-assistant",
  requireAuth,
  requireActiveTrial,
  async (req, res) => {
    const membershipPlan = req.account?.membershipPlan || "standard";
    const hasPremiumAccess = req.trial?.isOwner || membershipPlan === "premium";

    if (!hasPremiumAccess) {
      return res.status(403).json({
        message: "Premium membership is required to use AI analysis",
      });
    }

    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "A trade description is required" });
    }

    try {
      const result = await processJournalAssistantRequest(
        message.trim(),
        req.user.userId,
      );
      return res.json(result);
    } catch (error) {
      console.error("Journal assistant failed:", error.message);
      return res.status(500).json({
        message: "Unable to process the journal entry right now",
      });
    }
  },
);

module.exports = router;
