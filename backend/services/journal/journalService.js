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

function toDashboardJournalResponse(journal) {
  const hasDashboardSnapshot =
    Boolean(journal.dashboardDate) ||
    Boolean(journal.dashboardInstrument) ||
    Array.isArray(journal.dashboardMistakes);

  if (hasDashboardSnapshot) {
    return {
      _id: journal._id,
      date: journal.dashboardDate || "",
      instrument: journal.dashboardInstrument || "",
      pnl: journal.dashboardPnl || 0,
      rating: journal.dashboardRating || 0,
      mistakes: journal.dashboardMistakes || [],
      createdAt: journal.createdAt,
      updatedAt: journal.updatedAt,
    };
  }

  const fullResponse = toJournalResponse(journal);

  return {
    _id: fullResponse._id,
    date: fullResponse.date,
    instrument: fullResponse.instrument,
    pnl: fullResponse.pnl,
    rating: fullResponse.rating,
    mistakes: fullResponse.mistakes || [],
    createdAt: fullResponse.createdAt,
    updatedAt: fullResponse.updatedAt,
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
    dashboardDate: normalizedPayload.date || "",
    dashboardInstrument: normalizedPayload.instrument || "",
    dashboardPnl: normalizedPayload.pnl || 0,
    dashboardRating: normalizedPayload.rating || 0,
    dashboardMistakes: normalizedPayload.mistakes || [],
  });

  const savedJournal = await journal.save();
  return toJournalResponse(savedJournal);
}

async function getJournalEntries(userId, options = {}) {
  const { view = "full" } = options;

  if (view === "dashboard") {
    const journals = await Journal.find(
      { userId },
      "_id createdAt updatedAt dashboardDate dashboardInstrument dashboardPnl dashboardRating dashboardMistakes encryptedEntry date instrument pnl rating mistakes",
    )
      .sort({ createdAt: -1 })
      .lean();

    return journals.map(toDashboardJournalResponse);
  }

  const journals = await Journal.find({ userId }).sort({
    createdAt: -1,
  }).lean();

  return journals.map(toJournalResponse);
}

async function getRecentJournalEntries(userId, limit = 5) {
  const journals = await Journal.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return journals.map(toJournalResponse);
}

async function deleteJournalEntries(userId) {
  const result = await Journal.deleteMany({ userId });
  return result.deletedCount || 0;
}

module.exports = {
  createJournalEntry,
  deleteJournalEntries,
  getJournalEntries,
  getRecentJournalEntries,
};
