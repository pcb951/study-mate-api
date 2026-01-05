const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const slugify = require("slugify");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
    },
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
    authProvider: {
      type: String,
      enum: ["mongodb", "firebase"],
      required: true,
      default: "mongodb",
    },
    password: {
      type: String,
      minLength: 6,
      required: function () {
        return this.authProvider === "mongodb";
      },
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [
        function () {
          return this.authProvider === "mongodb";
        },
        "Please confirm your password",
      ],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords do not match!",
      },
      select: false, // optional: prevent storing in DB
    },
    role: {
      type: String,
      enum: {
        values: ["student", "tutor", "admin"],
        message: `{VALUE} is not supported! Please request with student, tutor or admin.`,
      },
      default: "student",
    },
    image: String,
    subject: String,
    studyMode: {
      type: Boolean,
      default: false,
    },
    availability: String,
    experienceLevel: {
      type: String,
      enum: {
        values: ["Beginner", "Intermediate", "Expert"],
        message: `{VALUE} is not supported! Please request with beginner, intermediate or advanced.`,
      },
      default: "Beginner",
    },
    location: String,
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    birthdate: {
      type: String,
      required: [true, "Please Provide Your Birthdate!"],
    },
    passwordChangedAt: {
      type: Date,
    },

    slug: { type: String, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual("friendRequests", {
  ref: "Friendship",
  foreignField: "requester",
  localField: "_id",
});
userSchema.virtual("sentRequests", {
  ref: "Friendship",
  foreignField: "requester",
  localField: "_id",
});

// generate slug
userSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// 1 Hash password if changed
userSchema.pre("save", async function (next) {
  if (this.authProvider !== "mongodb") return next();
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordConfirm = undefined;
  next();
});

// 2 Update passwordChangedAt after hashing
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidateCredential,
  databaseCredential
) {
  return await bcrypt.compare(candidateCredential, databaseCredential);
};

userSchema.methods.isPasswordChanged = function (jwtTimeStamp) {
  if (this.passwordChangedAt) {
    // we get jwt iat in seconds so we convert to seconds
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return jwtTimeStamp < changedTimeStamp;
  }
  return false;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
