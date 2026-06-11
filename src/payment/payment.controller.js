
import config from '../../config.js';
import {
    constructStripeWebhookEvent,
    createPremiumCheckoutSession,
    markPremiumFromCheckoutSession,
    markPremiumFromSubscription,
    createManagePremiumSession,
} from './payment.service.js';

export async function handleCreateCheckoutSession(req, res) {
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


export async function handleCreateManagePremiumSession(req, res) {
    try {
        const userId = req.user.id;
        const session = await createManagePremiumSession(userId);
        res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('Stripe session error: ', error);
        return res.status(500).json({
            message: 'Could not create manage premium session',
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

        if (
            event.type === 'customer.subscription.updated' ||
            event.type === 'customer.subscription.deleted'
        ) {
            await markPremiumFromSubscription(event.data.object);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Stripe webhook error: ', error);
        return res.status(400).json({ message: 'Invalid Stripe webhook' });
    }
}