import config from '../../config.js';
import { moderateCommentText, COMMENT_MODERATION_BLOCKED } from '../features/moderation/moderation.service.js';

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';

export async function moderateText(text) {
    const input = typeof text === 'string' ? text.trim() : '';

    if (!input) {
        return { flagged: false, categories: {}, checked: true };
    }

    const { apiKey, model = 'omni-moderation-latest' } = config.moderation ?? {};

    if (!apiKey) {
        return { flagged: false, categories: {}, checked: false };
    }

    try {
        const response = await fetch(OPENAI_MODERATION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ model, input }),
        });

        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            console.error(`Moderation request failed (${response.status}): ${detail.slice(0, 200)}`);
            return { flagged: false, categories: {}, checked: false };
        }

        const data = await response.json();
        const result = data?.results?.[0];

        if (!result) {
            return { flagged: false, categories: {}, checked: false };
        }

        return {
            flagged: Boolean(result.flagged),
            categories: result.category_scores ?? {},
            checked: true,
        };
    } catch (error) {
        console.error('Moderation request errored:', error.message);
        return { flagged: false, categories: {}, checked: false };
    }
}

export async function moderateComment(content) {
    const local = moderateCommentText(content);

    if (!local.allowed) {
        return { allowed: false, errorCode: COMMENT_MODERATION_BLOCKED, reason: local.reason };
    }

    const ai = await moderateText(content);

    if (ai.flagged) {
        return { allowed: false, errorCode: COMMENT_MODERATION_BLOCKED, reason: 'ai_flagged' };
    }

    return {
        allowed: true,
        status: ai.checked ? 'approved' : 'skipped',
        checkedAt: ai.checked ? new Date() : null,
    };
}
