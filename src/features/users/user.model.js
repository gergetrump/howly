import mongoose from 'mongoose';
import { DISPLAY_NAME_PATTERN, USERNAME_PATTERN } from '../../utils/accountInputValidation.js';

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
      match: [USERNAME_PATTERN, "Username may only contain letters, numbers, dots, underscores, or hyphens."],
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
      match: [DISPLAY_NAME_PATTERN, "First name may only contain letters, spaces, apostrophes, periods, or hyphens."],
      required: true,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50,
      match: [DISPLAY_NAME_PATTERN, "Last name may only contain letters, spaces, apostrophes, periods, or hyphens."],
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
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    premiumStatus: String, // active, canceled, past_due, unpaid
    premiumUntil: Date,
    // User preferences (extensible for future settings)
    preferences: {
      theme: {
        type: String,
        enum: ["forest-dark", "sakura-light", "sunset-warm", "ocean-dark", "hogwarts-night"],
        default: "forest-dark",
      },
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    // Tracks whether the user has finished the post-signup onboarding flow
    // (companion selection + starter habits). Gates the onboarding screens.
    onboardingCompleted: {
      type: Boolean,
      default: false,
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
    // All-time longest streak. Only ever grows (via $max in creditOverallStreak); a break or
    // revoke never lowers it. Forward-only — not backfilled for streaks before this field existed.
    bestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    streakLastDay: {
      type: Date,
      default: null,
    },
    // Streak Freeze ("shields") balance the user holds. Granted monthly to premium users (cron) and buyable in the shop. A daily cron consumes one
    //to protect all habit streaks on a missed day.
    streakShields: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Last time the monthly premium grant ran for this user (idempotency).
    streakShieldsLastGrantedAt: {
      type: Date,
      default: null,
    },
    // Grace window after a missed day with no shield: the streak is held (not broken) until this deadline (~2 days).
    streakRepairDeadline: {
      type: Date,
      default: null,
    },
    streakShieldAutoUsedAt: {
      type: Date,
      default: null,
    },
      

    streakShieldUsedDays: {
      type: [String],
      default: [],
    },
    streakPerfectDays: {
      type: [String],
      default: [],
    },
    notificationPreferences: {
      emailEnabled: { type: Boolean, default: false },
      challengeInvitations: { type: Boolean, default: false },
      friendRequests: { type: Boolean, default: false },
      streakReminders: { type: Boolean, default: false },
      muteAll: { type: Boolean, default: false },
      muteTag: { type: Boolean, default: false },
      muteFriendRequest: { type: Boolean, default: false },
      muteComment: { type: Boolean, default: false },
      muteLike: { type: Boolean, default: false },
      muteReaction: { type: Boolean, default: false },
      muteChallengeInvitation: { type: Boolean, default: false },
    },
    streakReminderEmailLastSentFor: {
      type: Date,
      default: null,
    },
    ghostMode: {
      type: Boolean,
      default: false,
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
    blockedUsers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      }
    ],
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
