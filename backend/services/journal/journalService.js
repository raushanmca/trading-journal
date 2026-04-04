const Journal = require("../../models/Journal");
const { normalizePnl } = require("./pnlService");
const {
  decryptJournalPayload,
  encryptJournalPayload,
} = require("./journalCryptoService");

function buildLegacyJournalPayload(journal) {
  return {
    date: journal.date || "",
    marketBias: journal.marketBias || "",
    instrument: journal.instrument || "",
    entryTime: journal.entryTime || "",
    entryPrice: journal.entryPrice || "",
    stopLoss: journal.stopLoss || "",
    target: journal.target || "",
    quantity: journal.quantity || 0,
    setupType: journal.setupType || "",
    entryReason: journal.entryReason || "",
    exitTime: journal.exitTime || "",
    exitPrice: journal.exitPrice || "",
    pnl: journal.pnl || 0,
    mistakes: journal.mistakes || [],
    journalComment: journal.journalComment || "",
    whatWentRight: journal.whatWentRight || "",
    emotionalState: journal.emotionalState || {},
    ruleBreak: Boolean(journal.ruleBreak),
    brokenRules: journal.brokenRules || [],
    improvement: journal.improvement || "",
    rating: journal.rating || 0,
    aiInsight: journal.aiInsight || "",
  };
}

function toJournalResponse(journal) {
  let decryptedPayload = null;

  if (journal.encryptedEntry) {
    try {
      decryptedPayload = decryptJournalPayload(journal.encryptedEntry);
    } catch (error) {
      console.error("Failed to decrypt journal entry:", error.message);
    }
  }

  const payload = decryptedPayload || buildLegacyJournalPayload(journal);

  return {
    _id: journal._id,
    userId: journal.userId,
    userEmail: journal.userEmail,
    createdAt: journal.createdAt,
    updatedAt: journal.updatedAt,
    ...payload,
  };
}

async function createJournalEntry(payload, user) {
  const normalizedPayload = {
    ...payload,
    pnl: normalizePnl(payload.pnl, payload.tradeResult),
  };
  const journal = new Journal({
    encryptedEntry: encryptJournalPayload(normalizedPayload),
    userId: user.userId,
    userEmail: user.email || "",
  });

  const savedJournal = await journal.save();
  return toJournalResponse(savedJournal);
}

async function getJournalEntries(userId) {
  const journals = await Journal.find({ userId }).sort({
    createdAt: -1,
  });

  return journals.map(toJournalResponse);
}

async function getRecentJournalEntries(userId, limit = 5) {
  const journals = await Journal.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);

  return journals.map(toJournalResponse);
}

module.exports = {
  createJournalEntry,
  getJournalEntries,
  getRecentJournalEntries,
};
