import Stripe from 'stripe';
import config from '../../config.js';
import User from '../features/users/user.model.js';
import { PLANS, PLAN_KEYS } from '../config/plans.js';


const stripe = new Stripe(config.stripe.secretKey);
const frontendBaseUrl = config.frontendBaseUrl || config.clientBaseUrl;
const premiumPlan = PLANS[PLAN_KEYS.PREMIUM];

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
    const isPremium = subscription.status === 'active' || subscription.status === 'trialing';

    return User.findByIdAndUpdate(
        userId,
        {
            isPremium,
            stripeCustomerId: customerId,
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

        success_url: `${frontendBaseUrl}/shop?payment=success`,
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
    const subscriptionId = session?.subscription;

    if (!userId || !subscriptionId) {
        return null;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return syncSubscriptionToUser(userId, subscription, session.customer);
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
        return JSON.parse(payload.toString('utf8'));
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}


export async function createManagePremiumSession(userId) {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    if (!user.stripeCustomerId) {
        throw new Error('No Stripe customer found');
    }

    return stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${frontendBaseUrl}/profile`,
    });
}
