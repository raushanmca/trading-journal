const mongoose = require("mongoose");

const PaymentRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    paymentReference: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    adminEmail: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

PaymentRequestSchema.index({ userId: 1, status: 1 });
PaymentRequestSchema.index({ status: 1, requestedAt: -1 });

module.exports = mongoose.model("PaymentRequest", PaymentRequestSchema);
