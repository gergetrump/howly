import Stripe from 'stripe';
import config from '../../config.js';
import User from '../features/users/user.model.js';
import { PLANS, PLAN_KEYS } from '../config/plans.js';


const stripe = new Stripe(config.stripe.secretKey)
const frontendBaseUrl = config.frontendBaseUrl || config.clientBaseUrl;
const premiumPlan = PLANS[PLAN_KEYS.PREMIUM];

async function setUserPremium(userId) {
    const upgradedUser = await User.findOneAndUpdate(
        { _id: userId, isPremium: { $ne: true } },
        {
            $set: { isPremium: true },
            $inc: { coins: premiumPlan.monthlyBenefits.coins },
        },
        { returnDocument: 'after', runValidators: true }
    );

    if (upgradedUser) {
        return upgradedUser;
    }

    return User.findById(userId);
}

export async function createPremiumCheckoutSession(userId) {
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',

        line_items: [
            {
                price_data: {
                    currency: premiumPlan.billing.currency,
                    product_data: {
                        name: 'Howly Premium',
                        description: 'Premium upgrade for your Howly account',
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
            upgrade: 'premium'
        },
    });

    return session
}

export async function markPremiumFromCheckoutSession(session) {
    const userId = session?.metadata?.userId;

    if (!userId) {
        return null;
    }

    return setUserPremium(userId);
}

export function constructStripeWebhookEvent(payload, signature, webhookSecret) {
    if (!webhookSecret) {
        return JSON.parse(payload.toString('utf8'));
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
