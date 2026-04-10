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

function toDashboardJournalResponseWithoutDecrypt(journal) {
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

  const hasLegacyFields =
    Boolean(journal.date) ||
    Boolean(journal.instrument) ||
    Array.isArray(journal.mistakes);

  if (!hasLegacyFields) {
    return null;
  }

  return {
    _id: journal._id,
    date: journal.date || "",
    instrument: journal.instrument || "",
    pnl: journal.pnl || 0,
    rating: journal.rating || 0,
    mistakes: journal.mistakes || [],
    createdAt: journal.createdAt,
    updatedAt: journal.updatedAt,
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
      "_id createdAt updatedAt dashboardDate dashboardInstrument dashboardPnl dashboardRating dashboardMistakes date instrument pnl rating mistakes",
    )
      .sort({ createdAt: -1 })
      .lean();

    const dashboardRows = journals.map((journal) =>
      toDashboardJournalResponseWithoutDecrypt(journal),
    );

    const missingSnapshotIds = journals
      .filter((_, index) => !dashboardRows[index])
      .map((journal) => journal._id);

    if (missingSnapshotIds.length === 0) {
      return dashboardRows;
    }

    const fallbackJournals = await Journal.find(
      { _id: { $in: missingSnapshotIds } },
      "_id createdAt updatedAt dashboardDate dashboardInstrument dashboardPnl dashboardRating dashboardMistakes encryptedEntry date instrument pnl rating mistakes",
    ).lean();

    const fallbackById = new Map();
    const backfillOperations = [];

    fallbackJournals.forEach((journal) => {
      const response = toDashboardJournalResponse(journal);
      fallbackById.set(String(journal._id), response);

      const needsBackfill =
        !journal.dashboardDate &&
        !journal.dashboardInstrument &&
        !Array.isArray(journal.dashboardMistakes);

      if (needsBackfill) {
        backfillOperations.push({
          updateOne: {
            filter: { _id: journal._id },
            update: {
              $set: {
                dashboardDate: response.date,
                dashboardInstrument: response.instrument,
                dashboardPnl: response.pnl,
                dashboardRating: response.rating,
                dashboardMistakes: response.mistakes,
              },
            },
          },
        });
      }
    });

    if (backfillOperations.length > 0) {
      await Journal.bulkWrite(backfillOperations, { ordered: false });
    }

    return journals.map(
      (journal, index) =>
        dashboardRows[index] || fallbackById.get(String(journal._id)),
    );
  }

  const journals = await Journal.find({ userId })
    .sort({
      createdAt: -1,
    })
    .lean();

  return journals.map(toJournalResponse);
}

async function getRecentJournalEntries(userId, limit = 5) {
  const journals = await Journal.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return journals.map(toJournalResponse);
}

async function updateJournalEntry(id, updates, user) {
  const journal = await Journal.findOne({ _id: id, userId: user.userId });
  if (!journal) {
    throw new Error("Journal entry not found or access denied");
  }

  const normalizedUpdates = {
    ...updates,
    pnl: normalizePnl(updates.pnl, updates.tradeResult),
  };

  // Update dashboard summary fields (safe for dashboard edits)
  journal.dashboardDate = normalizedUpdates.date || journal.dashboardDate;
  journal.dashboardInstrument =
    normalizedUpdates.instrument || journal.dashboardInstrument;
  journal.dashboardPnl =
    normalizedUpdates.pnl !== undefined
      ? normalizedUpdates.pnl
      : journal.dashboardPnl;
  journal.dashboardRating =
    normalizedUpdates.rating !== undefined
      ? normalizedUpdates.rating
      : journal.dashboardRating;
  journal.dashboardMistakes =
    normalizedUpdates.mistakes !== undefined
      ? normalizedUpdates.mistakes
      : journal.dashboardMistakes;

  // If full payload provided, encrypt and update
  if (
    normalizedUpdates.encryptedEntry ||
    Object.keys(normalizedUpdates).some(
      (key) =>
        !["date", "instrument", "pnl", "rating", "mistakes"].includes(key),
    )
  ) {
    const fullPayload = normalizedUpdates.encryptedEntry
      ? normalizedUpdates
      : { ...journal.toObject(), ...normalizedUpdates };
    journal.encryptedEntry = encryptJournalPayload(fullPayload);
  }

  const updatedJournal = await journal.save();
  return toJournalResponse(updatedJournal);
}

async function deleteJournalEntry(id, user) {
  const result = await Journal.deleteOne({ _id: id, userId: user.userId });
  if (result.deletedCount === 0) {
    throw new Error("Journal entry not found or access denied");
  }
  return result.deletedCount;
}

async function deleteJournalEntries(userId) {
  const result = await Journal.deleteMany({ userId });
  return result.deletedCount || 0;
}

module.exports = {
  createJournalEntry,
  deleteJournalEntry,
  deleteJournalEntries,
  getJournalEntries,
  getRecentJournalEntries,
  updateJournalEntry,
};
