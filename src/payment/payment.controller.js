
import config from '../../config.js';
import { ApiError } from '../errors/ApiError.js';
import { toPublicUser } from '../features/users/user.service.js';
import {
    confirmPremiumCheckoutSession,
    constructStripeWebhookEvent,
    createPremiumCheckoutSession,
    grantPremiumBenefitsFromInvoice,
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

        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({
                message: error.message,
                errorCode: error.errorCode,
            });
        }

        return res.status(500).json({
            message: 'Could not create checkout session',
        });
    }
}

export async function handleConfirmCheckoutSession(req, res, next) {
    try {
        const user = await confirmPremiumCheckoutSession(req.user.id, req.body?.sessionId);
        return res.status(200).json({ user: toPublicUser(user) });
    } catch (error) {
        console.error('Stripe checkout confirmation error: ', error);

        if (error instanceof ApiError) {
            return next(error);
        }

        if (error?.type?.startsWith('Stripe')) {
            return next(ApiError.internal(`Stripe could not confirm checkout session: ${error.message}`));
        }

        return next(error);
    }
}


export async function handleCreateManagePremiumSession(req, res, next) {
    try {
        const userId = req.user.id;
        const session = await createManagePremiumSession(userId);
        res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('Stripe session error: ', error);

        if (error instanceof ApiError) {
            return next(error);
        }

        if (error?.type?.startsWith('Stripe')) {
            return next(ApiError.internal(`Stripe could not create manage premium session: ${error.message}`));
        }

        return next(error);
        


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

        if (event.type === 'invoice.paid') {
            await grantPremiumBenefitsFromInvoice(event.data.object);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('Stripe webhook error: ', error);
        return res.status(400).json({ message: 'Invalid Stripe webhook' });
    }
}
