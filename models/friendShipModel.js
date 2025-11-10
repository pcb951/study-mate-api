const mongoose = require("mongoose");

const friendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  },
  { timestamps: true }
);

friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

friendshipSchema.pre(/^find/, function (next) {
  this.populate("requester").populate("recipient");
  next();
});
friendshipSchema.statics.findRelation = async function (
  userA,
  userB,
  statuses = ["pending", "accepted"]
) {
  return await this.findOne({
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
    status: { $in: statuses },
  });
};

const Friendship = mongoose.model("Friendship", friendshipSchema);

module.exports = Friendship;
