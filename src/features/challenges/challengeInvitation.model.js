import mongoose from 'mongoose';

const { Schema } = mongoose;

export const CHALLENGE_INVITATION_STATUS = ['pending', 'accepted', 'rejected'];

const challengeInvitationSchema = new Schema(
  {
    challenge: {
      type: Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
      index: true,
    },
    inviter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    invitee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: CHALLENGE_INVITATION_STATUS,
      default: 'pending',
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

challengeInvitationSchema.index(
  { challenge: 1, invitee: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

export default mongoose.model('ChallengeInvitation', challengeInvitationSchema);
