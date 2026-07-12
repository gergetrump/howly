import Stripe from 'stripe';
import config from '../../config.js';
import { ApiError } from '../errors/ApiError.js';
import User from '../features/users/user.model.js';
import { PLANS, PLAN_KEYS, hasPremiumAccess } from '../config/plans.js';


const stripe = new Stripe(config.stripe.secretKey);
const frontendBaseUrl = config.frontendBaseUrl || config.clientBaseUrl;
const premiumPlan = PLANS[PLAN_KEYS.PREMIUM];
const PREMIUM_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

async function getStripeCustomerForUser(user) {
    if (user.stripeCustomerId) {
        return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' '),
        metadata: {
            userId: user._id.toString(),
        },
    });

    await User.findByIdAndUpdate(
        user._id,
        { stripeCustomerId: customer.id },
        { runValidators: true }
    );

    return customer.id;
}

const PREMIUM_BENEFIT_INVOICE_REASONS = new Set(['subscription_create', 'subscription_cycle']);

function toPeriodEndDate(periodEndUnix) {
    return new Date(periodEndUnix * 1000);
}

function hasCoinsForBillingPeriod(user, periodEndUnix) {
    if (!user?.coinsLastGrantedPeriodEnd || !periodEndUnix) {
        return false;
    }

    return user.coinsLastGrantedPeriodEnd.getTime() === toPeriodEndDate(periodEndUnix).getTime();
}

function hasShieldsForBillingPeriod(user, periodEndUnix) {
    if (!user?.streakShieldsLastGrantedPeriodEnd || !periodEndUnix) {
        return false;
    }

    return user.streakShieldsLastGrantedPeriodEnd.getTime() === toPeriodEndDate(periodEndUnix).getTime();
}

/* Grants premium coins and streak shields once per paid subscription billing period (idempotent). */
export async function grantPremiumBenefitsForBillingPeriod(userId, periodEndUnix, options = {}) {
    const { requirePremiumAccess = true } = options;
    const coinAmount = premiumPlan.monthlyBenefits.coins;
    const shieldAmount = premiumPlan.monthlyBenefits.streakShields;

    if (!periodEndUnix || (!coinAmount && !shieldAmount)) {
        return { coinsGranted: false, shieldsGranted: false };
    }

    const user = await User.findOne({
        _id: userId,
        isDeleted: false,
    }).select(
        'role isPremium coins streakShields coinsLastGrantedPeriodEnd streakShieldsLastGrantedPeriodEnd'
    );

    if (!user || (requirePremiumAccess && !hasPremiumAccess(user))) {
        return { coinsGranted: false, shieldsGranted: false };
    }

    const periodEndDate = toPeriodEndDate(periodEndUnix);
    let changed = false;
    let coinsGranted = false;
    let shieldsGranted = false;

    if (coinAmount && !hasCoinsForBillingPeriod(user, periodEndUnix)) {
        user.coins = (user.coins ?? 0) + coinAmount;
        user.coinsLastGrantedPeriodEnd = periodEndDate;
        coinsGranted = true;
        changed = true;
    }

    if (shieldAmount && !hasShieldsForBillingPeriod(user, periodEndUnix)) {
        user.streakShields = (user.streakShields ?? 0) + shieldAmount;
        user.streakShieldsLastGrantedPeriodEnd = periodEndDate;
        shieldsGranted = true;
        changed = true;
    }

    if (changed) {
        await user.save();
    }

    return { coinsGranted, shieldsGranted };
}

/* Grants premium moon coins once per paid subscription billing period (idempotent). */
export async function grantPremiumCoinsForBillingPeriod(userId, periodEndUnix, options = {}) {
    const result = await grantPremiumBenefitsForBillingPeriod(userId, periodEndUnix, options);
    return { granted: result.coinsGranted };
}

/* Grants premium streak shields once per paid subscription billing period (idempotent). */
export async function grantPremiumShieldsForBillingPeriod(userId, periodEndUnix, options = {}) {
    const result = await grantPremiumBenefitsForBillingPeriod(userId, periodEndUnix, options);
    return { granted: result.shieldsGranted };
}

/* Grants premium benefits from a paid subscription invoice (initial checkout or renewal). */
export async function grantPremiumBenefitsFromInvoice(invoice) {
    if (invoice?.status !== 'paid' || !PREMIUM_BENEFIT_INVOICE_REASONS.has(invoice.billing_reason)) {
        return { coinsGranted: false, shieldsGranted: false };
    }

    const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;
    if (!customerId || !invoice.subscription) {
        return { coinsGranted: false, shieldsGranted: false };
    }

    const user = await User.findOne({ stripeCustomerId: customerId }).select('_id');
    if (!user) {
        return { coinsGranted: false, shieldsGranted: false };
    }

    const periodEndUnix = invoice.lines?.data?.[0]?.period?.end;
    if (!periodEndUnix) {
        return { coinsGranted: false, shieldsGranted: false };
    }

    return grantPremiumBenefitsForBillingPeriod(user._id, periodEndUnix, {
        requirePremiumAccess: false,
    });
}

/* Grants premium coins from a paid subscription invoice (initial checkout or renewal). */
export async function grantPremiumCoinsFromInvoice(invoice) {
    const result = await grantPremiumBenefitsFromInvoice(invoice);
    return { granted: result.coinsGranted };
}

async function syncSubscriptionToUser(userId, subscription, customerId) {
    const isPremium = PREMIUM_SUBSCRIPTION_STATUSES.has(subscription.status);
    const stripeCustomerId =
        typeof customerId === 'string'
            ? customerId
            : customerId?.id;

    const user = await User.findByIdAndUpdate(
        userId,
        {
            isPremium,
            stripeCustomerId,
            stripeSubscriptionId: subscription.id,
            premiumStatus: subscription.status,
            premiumUntil: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : null,
        },
        { returnDocument: 'after', runValidators: true }
    );

    if (isPremium && subscription.current_period_end) {
        await grantPremiumBenefitsForBillingPeriod(userId, subscription.current_period_end);
        return User.findById(userId);
    }

    return user;
}

export async function createPremiumCheckoutSession(userId) {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    if (user.isPremium) {
        throw ApiError.badRequest('Premium is already active for this user.');
    }

    const customerId = await getStripeCustomerForUser(user);

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,

        line_items: [
            {
                price_data: {
                    currency: premiumPlan.billing.currency,
                    product_data: {
                        name: 'Howly Premium',
                        description: 'Monthly premium subscription for your Howly account',
                    },
                    recurring: {
                        interval: 'month',
                    },
                    unit_amount: premiumPlan.billing.priceInCents,
                },
                quantity: 1,
            },
        ],

        success_url: `${frontendBaseUrl}/shop?payment=success&checkout_session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendBaseUrl}/shop?payment=cancelled`,

        metadata: {
            userId,
            upgrade: 'subscription',
        },
    });

    return session;
}

export async function markPremiumFromCheckoutSession(session) {
    const userId = session?.metadata?.userId;
    const subscription = session?.subscription;

    if (!userId || !subscription) {
        return null;
    }

    const resolvedSubscription = typeof subscription === 'string'
        ? await stripe.subscriptions.retrieve(subscription)
        : subscription;

    return syncSubscriptionToUser(userId, resolvedSubscription, session.customer);
}

export async function markPremiumFromSubscription(subscription) {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });

    if (!user) {
        return null;
    }

    return syncSubscriptionToUser(user._id, subscription, subscription.customer);
}

export function constructStripeWebhookEvent(payload, signature, webhookSecret) {
    if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}


export async function confirmPremiumCheckoutSession(userId, sessionId) {
    if (!sessionId) {
        throw ApiError.badRequest('Checkout session id is required.');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
    });

    if (session.metadata?.userId !== userId.toString()) {
        throw ApiError.forbidden('Checkout session does not belong to this user.');
    }

    if (session.status !== 'complete') {
        throw ApiError.badRequest('Checkout session is not complete.');
    }

    const user = await markPremiumFromCheckoutSession(session);

    if (!user) {
        throw ApiError.badRequest('Checkout session does not include a subscription.');
    }

    return user;
}

export async function cancelStripeBillingForUser(user) {
    if (!user?.stripeSubscriptionId) {
        return;
    }

    try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    } catch (error) {
        // Subscription may already be canceled or missing in Stripe test data.
        if (error?.code !== 'resource_missing') {
            throw error;
        }
    }
}

export async function createManagePremiumSession(userId) {
    const user = await User.findById(userId);

    if (!user) {
        throw ApiError.notFound('User not found');
    }

    if (!user.stripeCustomerId) {
        throw ApiError.badRequest('No Stripe customer found for this user. Create a checkout session before opening the billing portal.');
    }

    return stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${frontendBaseUrl}/profile`,
    });
}
