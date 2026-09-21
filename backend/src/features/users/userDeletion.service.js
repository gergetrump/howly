import User from './user.model.js';
import Habit from '../habits/habit.model.js';
import HabitCheckIn from '../analytics/habitCheckIn.model.js';
import HabitBoost from '../boosts/habitBoost.model.js';
import Companion from '../companion/companion.model.js';
import UserItem from '../inventory/inventory.model.js';
import BoostPurchaseLimit from '../inventory/boostPurchaseLimit.model.js';
import { Story, StoryLike, StoryComment } from '../stories/story.model.js';
import { MilestonePost, MilestoneLike } from '../milestones/milestone.model.js';
import { FriendRequest, Friendship } from '../social/social.model.js';
import { Notification } from '../notifications/notification.model.js';
import { Report } from '../reports/report.model.js';
import Challenge from '../challenges/challenge.model.js';
import ChallengeParticipant from '../challenges/challengeParticipant.model.js';
import ChallengeInvitation from '../challenges/challengeInvitation.model.js';
import { deleteFromCloudinary } from '../cloudinary/cloudinary.service.js';
import { deleteNotificationsByFilter } from '../notifications/notification.service.js';
import { cancelStripeBillingForUser } from '../../payment/payment.service.js';

function hasStarted(challenge, now = new Date()) {
    return challenge.startsAt <= now;
}

async function deleteOwnedStories(userId) {
    const stories = await Story.find({ user: userId }).select('_id imagePublicId').lean();

    for (const story of stories) {
        try {
            await deleteFromCloudinary(story.imagePublicId);
        } catch (error) {
            console.error('Failed to delete story image from Cloudinary:', error);
        }
    }

    const storyIds = stories.map((story) => story._id);

    if (storyIds.length === 0) {
        return;
    }

    await StoryLike.deleteMany({ story: { $in: storyIds } });
    await StoryComment.deleteMany({ story: { $in: storyIds } });
    await deleteNotificationsByFilter({
        entityType: 'story',
        entityId: { $in: storyIds },
    });
    await Story.deleteMany({ _id: { $in: storyIds } });
}

async function deleteNotStartedOwnedChallenges(userId) {
    const ownedChallenges = await Challenge.find({ createdBy: userId }).lean();
    const now = new Date();

    for (const challenge of ownedChallenges) {
        if (hasStarted(challenge, now)) {
            continue;
        }

        const invitationIds = await ChallengeInvitation.distinct('_id', { challenge: challenge._id });

        await Habit.deleteMany({ challengeId: challenge._id, source: 'challenge' });
        await ChallengeParticipant.deleteMany({ challenge: challenge._id });
        await ChallengeInvitation.deleteMany({ challenge: challenge._id });

        if (invitationIds.length > 0) {
            await deleteNotificationsByFilter({
                entityType: 'challengeInvitation',
                entityId: { $in: invitationIds },
            });
        }

        await Challenge.findByIdAndDelete(challenge._id);
    }
}

async function leaveRemainingChallengeParticipations(userId) {
    const participations = await ChallengeParticipant.find({
        user: userId,
        status: { $in: ['active', 'completed'] },
    }).lean();

    for (const participation of participations) {
        const habitId = participation.habit;

        await ChallengeParticipant.findByIdAndUpdate(participation._id, {
            status: 'left',
            habit: null,
            rewardClaimed: false,
            rewardClaimedAt: null,
            rewardCoins: 0,
        });

        if (habitId) {
            await Habit.deleteOne({
                _id: habitId,
                ownerId: userId,
                source: 'challenge',
                challengeId: participation.challenge,
            });
        }
    }
}

async function deleteChallengeInvitationsForUser(userId) {
    await ChallengeInvitation.deleteMany({
        $or: [{ inviter: userId }, { invitee: userId }],
    });
}

async function deleteUserHabitsAndActivity(userId) {
    const habitIds = await Habit.find({ ownerId: userId }).distinct('_id');

    if (habitIds.length > 0) {
        await HabitBoost.deleteMany({ habit: { $in: habitIds } });
        await HabitCheckIn.deleteMany({ habit: { $in: habitIds } });
    }

    await HabitBoost.deleteMany({ user: userId });
    await HabitCheckIn.deleteMany({ user: userId });
    await Habit.deleteMany({ ownerId: userId });
}

async function deleteUserMilestones(userId) {
    const milestoneIds = await MilestonePost.find({ user: userId }).distinct('_id');

    if (milestoneIds.length > 0) {
        await MilestoneLike.deleteMany({ milestonePost: { $in: milestoneIds } });
        await deleteNotificationsByFilter({
            entityType: 'milestone',
            entityId: { $in: milestoneIds },
        });
        await MilestonePost.deleteMany({ _id: { $in: milestoneIds } });
    }

    await MilestoneLike.deleteMany({ user: userId });
}

async function deleteUserSocialData(userId) {
    await FriendRequest.deleteMany({
        $or: [{ requester: userId }, { recipient: userId }],
    });
    await Friendship.deleteMany({
        $or: [{ userA: userId }, { userB: userId }],
    });
    await User.updateMany(
        { blockedUsers: userId },
        { $pull: { blockedUsers: userId } },
    );
}

async function deleteUserInventoryAndCompanion(userId) {
    await UserItem.deleteMany({ user: userId });
    await BoostPurchaseLimit.deleteMany({ user: userId });
    await Companion.deleteOne({ user: userId });
}

async function deleteUserNotificationsAndReports(userId) {
    await Notification.deleteMany({
        $or: [{ recipient: userId }, { actor: userId }],
    });
    await Report.deleteMany({
        $or: [{ reporter: userId }, { reportedUser: userId }],
    });
}

async function deleteUserInteractionsOnOthersContent(userId) {
    await StoryLike.deleteMany({ user: userId });
    await StoryComment.deleteMany({ user: userId });
}

async function deleteUserProfilePicture(userId) {
    try {
        await deleteFromCloudinary(`howly/profile-pictures/${userId}`);
    } catch (error) {
        console.error('Failed to delete profile picture from Cloudinary:', error);
    }
}

// Permanently delete a user and all associated app data.
export async function deleteUserAccount(userId) {
    const user = await User.findById(userId);

    if (!user) {
        return null;
    }

    await cancelStripeBillingForUser(user);
    await deleteUserProfilePicture(userId);
    await deleteOwnedStories(userId);
    await deleteNotStartedOwnedChallenges(userId);
    await leaveRemainingChallengeParticipations(userId);
    await deleteChallengeInvitationsForUser(userId);
    await deleteUserHabitsAndActivity(userId);
    await deleteUserMilestones(userId);
    await deleteUserSocialData(userId);
    await deleteUserInventoryAndCompanion(userId);
    await deleteUserNotificationsAndReports(userId);
    await deleteUserInteractionsOnOthersContent(userId);

    return User.findByIdAndDelete(userId);
}
