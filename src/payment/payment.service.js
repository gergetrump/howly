import Stripe from 'stripe';
import config from '../../config.js';
import User from '../features/users/user.model.js';


const stripe = new Stripe(config.stripe.secretKey)
const frontendBaseUrl = config.frontendBaseUrl || config.clientBaseUrl;

async function setUserPremium(userId) {
    return User.findByIdAndUpdate(
        userId,
        { isPremium: true },
        { returnDocument: 'after', runValidators: true }
    );
}

export async function createPremiumCheckoutSession(userId) {
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',

        line_items: [
            {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: 'Howly Premium',
                        description: 'Premium upgrade for your Howly account',
                    },
                    unit_amount: 499, // 4.99€
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