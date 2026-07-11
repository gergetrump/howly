import Habit from '../habits/habit.model.js';
import User from '../users/user.model.js';
import HabitBoost from './habitBoost.model.js';

export const BOOST_ASSET_KEYS = {
    SMALL: 'small-boost',
    MEDIUM: 'medium-boost',
    BIG: 'big-boost',
};

export const BOOST_CONFIG_BY_ASSET_KEY = {
    [BOOST_ASSET_KEYS.SMALL]: {
        bonusCoins: 50,
        completions: 3,
    },
    [BOOST_ASSET_KEYS.MEDIUM]: {
        bonusCoins: 75,
        completions: 4,
    },
    [BOOST_ASSET_KEYS.BIG]: {
        bonusCoins: 100,
        completions: 5,
    },
};

// Boosts reward a fixed number of future completions for one habit. They are
// activated from inventory, then consumed automatically when the habit completes.
export const BOOST_ERROR_CODES = {
    HABIT_REQUIRED: 'BOOST_HABIT_REQUIRED',
    HABIT_NOT_FOUND: 'BOOST_HABIT_NOT_FOUND',
    BOOST_ALREADY_ACTIVE: 'BOOST_ALREADY_ACTIVE',
};

function boostError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
}

export function isBoostAssetKey(assetKey) {
    return Boolean(BOOST_CONFIG_BY_ASSET_KEY[assetKey]);
}

function getIsoDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function getWeekKey(date) {
    const firstDayOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.floor((date - firstDayOfYear) / 86400000) + 1;
    const week = Math.ceil((dayOfYear + firstDayOfYear.getUTCDay()) / 7);

    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getCompletionPeriodKey(habit, date = new Date()) {
    // A boosted habit should only pay once per habit period. Daily, weekly, and
    // monthly habits therefore use different reward keys.
    if (habit.frequency === 'Weekly') {
        return getWeekKey(date);
    }

    if (habit.frequency === 'Monthly') {
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    return getIsoDateKey(date);
}

export async function activateHabitBoost({ userId, item, habitId }) {
    const config = BOOST_CONFIG_BY_ASSET_KEY[item.assetKey];

    if (!config) {
        return null;
    }

    if (!habitId) {
        throw boostError(BOOST_ERROR_CODES.HABIT_REQUIRED);
    }

    const habit = await Habit.findOne({ _id: habitId, ownerId: userId });

    if (!habit) {
        throw boostError(BOOST_ERROR_CODES.HABIT_NOT_FOUND);
    }

    const activeBoost = await HabitBoost.findOne({
        user: userId,
        habit: habit._id,
        remainingCompletions: { $gt: 0 },
    });

    if (activeBoost) {
        // Only one active boost per habit keeps reward math predictable and
        // prevents stacking multiple boosts on the same completion.
        throw boostError(BOOST_ERROR_CODES.BOOST_ALREADY_ACTIVE);
    }

    let boost;

    try {
        boost = await HabitBoost.create({
            user: userId,
            habit: habit._id,
            assetKey: item.assetKey,
            bonusCoins: config.bonusCoins,
            remainingCompletions: config.completions,
        });
    } catch (error) {
        if (error.code === 11000) {
            throw boostError(BOOST_ERROR_CODES.BOOST_ALREADY_ACTIVE);
        }

        throw error;
    }

    const freshUser = await User.findById(userId).select('coins');

    return {
        consumable: true,
        assetKey: item.assetKey,
        coins: freshUser.coins,
        boost: {
            id: boost._id.toString(),
            habit: habit._id.toString(),
            habitTitle: habit.title,
            bonusCoins: boost.bonusCoins,
            remainingCompletions: boost.remainingCompletions,
        },
    };
}

export async function applyHabitBoostReward({ userId, habit }) {
    const periodKey = getCompletionPeriodKey(habit, habit.lastCompletedAt ?? new Date());

    // Atomic update prevents double rewards if completion is submitted twice
    // for the same habit period.
    const boost = await HabitBoost.findOneAndUpdate(
        {
            user: userId,
            habit: habit._id,
            remainingCompletions: { $gt: 0 },
            rewardedPeriodKeys: { $ne: periodKey },
        },
        {
            $push: { rewardedPeriodKeys: periodKey },
            $inc: { remainingCompletions: -1 },
        },
        { new: true, sort: { createdAt: 1 } },
    );

    if (!boost) {
        return null;
    }

    if (boost.remainingCompletions === 0 && !boost.completedAt) {
        boost.completedAt = new Date();
        await boost.save();
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { coins: boost.bonusCoins } },
        { new: true },
    ).select('coins');

    return {
        assetKey: boost.assetKey,
        bonusCoins: boost.bonusCoins,
        remainingCompletions: boost.remainingCompletions,
        coins: updatedUser.coins,
    };
}

export async function revertHabitBoostReward({ userId, habit, uncompletedAt = new Date() }) {
    const periodKey = getCompletionPeriodKey(habit, uncompletedAt);

    // If a completion is undone, restore the boost use and remove the coins for
    // that same period.
    const boost = await HabitBoost.findOneAndUpdate(
        {
            user: userId,
            habit: habit._id,
            rewardedPeriodKeys: periodKey,
        },
        {
            $pull: { rewardedPeriodKeys: periodKey },
            $inc: { remainingCompletions: 1 },
            $set: { completedAt: null },
        },
        { new: true },
    );

    if (!boost) {
        return null;
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { coins: -boost.bonusCoins } },
        { new: true },
    ).select('coins');

    return {
        assetKey: boost.assetKey,
        coinsReverted: boost.bonusCoins,
        remainingCompletions: boost.remainingCompletions,
        coins: updatedUser.coins,
    };
}
