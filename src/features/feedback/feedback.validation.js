const FEEDBACK_TYPES = ['problem', 'suggestion'];
const MAX_SUBJECT_LENGTH = 120;

export function validateFeedbackInput(body = {}) {
    const type = typeof body.type === 'string' ? body.type.trim() : 'suggestion';
    const subject = typeof body.subject === 'string' ? body.subject.trim().replace(/\s+/g, ' ') : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const errors = [];

    if (!FEEDBACK_TYPES.includes(type)) {
        errors.push('type must be problem or suggestion');
    }

    if (!subject) {
        errors.push('subject is required');
    } else if (subject.length < 3) {
        errors.push('subject must be at least 3 characters');
    } else if (subject.length > MAX_SUBJECT_LENGTH) {
        errors.push(`subject must be ${MAX_SUBJECT_LENGTH} characters or less`);
    }

    if (!message) {
        errors.push('message is required');
    } else if (message.length < 10) {
        errors.push('message must be at least 10 characters');
    } else if (message.length > 2000) {
        errors.push('message must be 2000 characters or less');
    }

    if (errors.length) {
        return { error: errors.join(', ') };
    }

    return { value: { type, subject, message } };
}
