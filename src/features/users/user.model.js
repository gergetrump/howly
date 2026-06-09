import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address."],
    },

    // Supports local and future social login providers without changing schema.
    authProvider: {
      type: String,
      enum: ["local", "google", "apple"],
      default: "local",
    },
    providerId: {
      type: String,
      trim: true,
      required: function isSocialAuth() {
        return this.authProvider !== "local";
      },
    },
    passwordHash: {
      type: String,
      required: function isLocalAuth() {
        return this.authProvider === "local";
      },
      select: false,
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: 50,
      required: true,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50,
      required: true,
    },
    profilePictureUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    coins: {
      type: Number,
      default: 0,
      min: 0,
    },
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
    },
    emailVerificationTokenHash: {
      type: String,
      default: null,
    },
    emailVerificationExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index(
  { authProvider: 1, providerId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      providerId: { $type: "string" },
    },
  }
);

export default mongoose.model('User', userSchema);
