
import config from '../../config.js';
import {
    constructStripeWebhookEvent,
    createPremiumCheckoutSession,
    markPremiumFromCheckoutSession,
} from './payment.service.js';

export async function createCheckoutSession(req, res) {
    try {
        const userId = req.user.id;
        const session = await createPremiumCheckoutSession(userId);
        res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error: ', error);
        return res.status(500).json({
            message: 'Could not create checkout session',
        });
    }
}

export async function handleStripeWebhook(req, res) {
    try {
        const signature = req.headers['stripe-signature'];
        const webhookSecret = config.stripe.webhook_secret;
        const event = constructStripeWebhookEvent(req.body, signature, webhookSecret);

        if (event.type === 'checkout.session.completed') {
            await markPremiumFromCheckoutSession(event.data.object);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Stripe webhook error: ', error);
        return res.status(400).json({ message: 'Invalid Stripe webhook' });
    }
}