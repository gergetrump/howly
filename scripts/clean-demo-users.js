import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import User from '../src/features/users/user.model.js';
import Companion from '../src/features/companion/companion.model.js';
import Habit from '../src/features/habits/habit.model.js';
import HabitCheckIn from '../src/features/analytics/habitCheckIn.model.js';
import { Friendship, FriendRequest } from '../src/features/social/social.model.js';
import { MilestonePost, MilestoneLike } from '../src/features/milestones/milestone.model.js';
import Challenge from '../src/features/challenges/challenge.model.js';
import ChallengeParticipant from '../src/features/challenges/challengeParticipant.model.js';
import ChallengeInvitation from '../src/features/challenges/challengeInvitation.model.js';
import {
    assertDemoSeedAllowed,
    DEMO_EMAIL_REGEX,
    printSeedHelp,
} from './demo-users/shared.js';

function parseCleanArgs(argv = process.argv.slice(2)) {
    if (argv.includes('--help') || argv.includes('-h')) {
        return { help: true };
    }

    return {};
}

async function cleanDemoUsers() {
    const options = parseCleanArgs();

    if (options.help) {
        printSeedHelp('clean-demo-users.js');
        return;
    }

    assertDemoSeedAllowed();
    await connectDB();

    const demoUsers = await User.find({ email: DEMO_EMAIL_REGEX }).select('_id email username').lean();
    if (demoUsers.length === 0) {
        console.log('No demo users found.');
        return;
    }

    const userIds = demoUsers.map((user) => user._id);
    const habits = await Habit.find({ ownerId: { $in: userIds } }).select('_id challengeId').lean();
    const habitIds = habits.map((habit) => habit._id);
    const demoChallenges = await Challenge.find({ createdBy: { $in: userIds } }).select('_id').lean();
    const demoChallengeIds = demoChallenges.map((challenge) => challenge._id);
    const milestonePosts = await MilestonePost.find({ user: { $in: userIds } }).select('_id').lean();
    const milestonePostIds = milestonePosts.map((post) => post._id);

    const deleted = {
        checkIns: 0,
        challengeInvitations: 0,
        challengeParticipants: 0,
        challenges: 0,
        milestoneLikes: 0,
        milestonePosts: 0,
        friendRequests: 0,
        friendships: 0,
        habits: 0,
        companions: 0,
        users: 0,
    };

    const checkInResult = await HabitCheckIn.deleteMany({
        $or: [
            { user: { $in: userIds } },
            { habit: { $in: habitIds } },
        ],
    });
    deleted.checkIns = checkInResult.deletedCount;

    const challengeInvitationResult = await ChallengeInvitation.deleteMany({
        $or: [
            { challenge: { $in: demoChallengeIds } },
            { inviter: { $in: userIds } },
            { invitee: { $in: userIds } },
        ],
    });
    deleted.challengeInvitations = challengeInvitationResult.deletedCount;

    const challengeParticipantResult = await ChallengeParticipant.deleteMany({
        $or: [
            { user: { $in: userIds } },
            { challenge: { $in: demoChallengeIds } },
        ],
    });
    deleted.challengeParticipants = challengeParticipantResult.deletedCount;

    const challengeResult = await Challenge.deleteMany({ createdBy: { $in: userIds } });
    deleted.challenges = challengeResult.deletedCount;

    if (demoChallengeIds.length > 0) {
        await Habit.deleteMany({ challengeId: { $in: demoChallengeIds } });
    }

    if (milestonePostIds.length > 0) {
        const milestoneLikeResult = await MilestoneLike.deleteMany({
            $or: [
                { milestonePost: { $in: milestonePostIds } },
                { user: { $in: userIds } },
            ],
        });
        deleted.milestoneLikes = milestoneLikeResult.deletedCount;
    }

    const milestonePostResult = await MilestonePost.deleteMany({ user: { $in: userIds } });
    deleted.milestonePosts = milestonePostResult.deletedCount;

    const friendRequestResult = await FriendRequest.deleteMany({
        $or: [
            { requester: { $in: userIds } },
            { recipient: { $in: userIds } },
        ],
    });
    deleted.friendRequests = friendRequestResult.deletedCount;

    const friendshipResult = await Friendship.deleteMany({
        $or: [
            { userA: { $in: userIds } },
            { userB: { $in: userIds } },
        ],
    });
    deleted.friendships = friendshipResult.deletedCount;

    const habitResult = await Habit.deleteMany({ ownerId: { $in: userIds } });
    deleted.habits = habitResult.deletedCount;

    const companionResult = await Companion.deleteMany({ user: { $in: userIds } });
    deleted.companions = companionResult.deletedCount;

    const userResult = await User.deleteMany({ _id: { $in: userIds } });
    deleted.users = userResult.deletedCount;

    console.log('Demo cleanup complete.');
    console.log(`  Users removed:              ${deleted.users}`);
    console.log(`  Companions removed:         ${deleted.companions}`);
    console.log(`  Habits removed:             ${deleted.habits}`);
    console.log(`  Check-ins removed:          ${deleted.checkIns}`);
    console.log(`  Challenges removed:         ${deleted.challenges}`);
    console.log(`  Challenge participants:     ${deleted.challengeParticipants}`);
    console.log(`  Challenge invitations:      ${deleted.challengeInvitations}`);
    console.log(`  Milestone posts:            ${deleted.milestonePosts}`);
    console.log(`  Milestone likes:            ${deleted.milestoneLikes}`);
    console.log(`  Friendships removed:        ${deleted.friendships}`);
    console.log(`  Friend requests:            ${deleted.friendRequests}`);
}

cleanDemoUsers()
    .catch((error) => {
        console.error('Demo cleanup failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
