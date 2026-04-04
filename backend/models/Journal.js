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
    date: String,
    marketBias: String,
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

module.exports = mongoose.model("Journal", JournalSchema);
