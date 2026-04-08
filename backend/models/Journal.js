const mongoose = require("mongoose");

const JournalSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      default: "",
    },
    encryptedEntry: {
      type: String,
      default: "",
    },
    dashboardDate: {
      type: String,
      default: "",
    },
    dashboardInstrument: {
      type: String,
      default: "",
    },
    dashboardPnl: {
      type: Number,
      default: 0,
    },
    dashboardRating: {
      type: Number,
      default: 0,
    },
    dashboardMistakes: {
      type: [String],
      default: [],
    },
    date: String,
    instrument: String,
    entryTime: String,
    entryPrice: String,
    stopLoss: String,
    target: String,
    quantity: Number,

    setupType: String,
    entryReason: String,

    exitTime: String,
    exitPrice: String,
    pnl: Number,

    mistakes: [String],
    journalComment: {
      type: String,
      default: "",
    },
    whatWentRight: String,

    emotionalState: {
      before: String,
      during: String,
      after: String,
    },

    ruleBreak: Boolean,
    brokenRules: [String],

    improvement: String,
    rating: Number,

    aiInsight: String,
  },
  { timestamps: true },
);

JournalSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Journal", JournalSchema);
