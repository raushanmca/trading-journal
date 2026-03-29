const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    authProviderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: "",
    },
    picture: {
      type: String,
      default: "",
    },
    provider: {
      type: String,
      default: "google",
    },
    isOwner: {
      type: Boolean,
      default: false,
    },
    trialStartedAt: {
      type: Date,
      required: true,
    },
    trialEndsAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);
