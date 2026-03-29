const mongoose = require("mongoose");

const JournalSchema = new mongoose.Schema(
  {
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
