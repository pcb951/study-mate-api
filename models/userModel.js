const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      minLength: [3, "Name must be at least 3 characters long"],
      maxLength: [50, "Name must be at most 50 characters long"],
      required: [true, "Please provide your name!"],
    },
    email: {
      type: String,
      required: [true, "Please provide your email!"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Please provide your password!"],
    },
    profileImage: String,
    subject: String,
    studyMode: {
      type: Boolean,
      default: false,
    },
    availability: String,
    experienceLevel: {
      type: String,
      enum: {
        values: ["beginner", "intermediate", "advanced"],
        message: `${VALUE} is not supported! Please request with beginner, intermediate or advanced.`,
      },
      default: "beginner",
    },
    ratingAverage: Number,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
