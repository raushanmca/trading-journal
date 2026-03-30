const Journal = require("../../models/Journal");
const { normalizePnl } = require("./pnlService");

async function createJournalEntry(payload, user) {
  const journal = new Journal({
    ...payload,
    pnl: normalizePnl(payload.pnl, payload.tradeResult),
    userId: user.userId,
    userEmail: user.email || "",
  });

  return journal.save();
}

async function getJournalEntries(userId) {
  return Journal.find({ userId }).sort({
    createdAt: -1,
  });
}

async function getRecentJournalEntries(userId, limit = 5) {
  return Journal.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}

module.exports = {
  createJournalEntry,
  getJournalEntries,
  getRecentJournalEntries,
};
