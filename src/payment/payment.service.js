import Stripe from 'stripe';
import config from '../../config.js';
import { ApiError } from '../errors/ApiError.js';
import User from '../features/users/user.model.js';
import { PLANS, PLAN_KEYS } from '../config/plans.js';


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

async function syncSubscriptionToUser(userId, subscription, customerId) {
    const isPremium = PREMIUM_SUBSCRIPTION_STATUSES.has(subscription.status);
    const stripeCustomerId =
        typeof customerId === 'string'
            ? customerId
            : customerId?.id;

    return User.findByIdAndUpdate(
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
