import { sendFeedback as sendFeedbackMessage } from './feedback.service.js';
import { validateFeedbackInput } from './feedback.validation.js';

export async function sendFeedback(req, res) {
    const { error, value } = validateFeedbackInput(req.body);

    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const result = await sendFeedbackMessage({
            userId: req.user.id,
            type: value.type,
            subject: value.subject,
            message: value.message,
        });

        if (result.errorCode === 'USER_NOT_FOUND') {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ message: 'Feedback sent' });
    } catch (sendError) {
        console.error('Failed to send feedback:', sendError);
        return res.status(500).json({ message: 'Could not send feedback right now' });
    }
}

