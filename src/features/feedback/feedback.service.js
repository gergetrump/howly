import User from '../users/user.model.js';
import { sendFeedbackEmail } from '../mail/mail.service.js';

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export async function sendFeedback({ userId, type, subject, message }) {
    const user = await User.findById(userId).select('firstName lastName username email').lean();

    if (!user) {
        return { errorCode: 'USER_NOT_FOUND' };
    }

    await sendFeedbackEmail({
        type,
        subject: escapeHtml(subject),
        message: escapeHtml(message),
        user: {
            firstName: escapeHtml(user.firstName),
            lastName: escapeHtml(user.lastName),
            username: escapeHtml(user.username),
            email: escapeHtml(user.email),
        },
    });

    return { sent: true };
}

