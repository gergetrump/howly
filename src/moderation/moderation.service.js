import config from '../../config.js';

const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';

/* Calls the OpenAI moderation API with a timeout, failing open (unflagged) on missing key or any error. */
async function callModeration(input) {
    const { apiKey, model = 'omni-moderation-latest', timeoutMs = 2500 } = config.moderation ?? {};

    if (!apiKey) {
        return { flagged: false, categories: {}, checked: false };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(OPENAI_MODERATION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ model, input }),
            signal: controller.signal,
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
    } finally {
        clearTimeout(timeout);
    }
}

/* Runs a text string through moderation, treating empty input as safe. */
export async function moderateText(text) {
    const input = typeof text === 'string' ? text.trim() : '';

    if (!input) {
        return { flagged: false, categories: {}, checked: true };
    }

    return callModeration(input);
}

/* Runs an image URL through moderation, treating missing input as safe. */
export async function moderateImage(imageUrl) {
    if (typeof imageUrl !== 'string' || !imageUrl) {
        return { flagged: false, categories: {}, checked: true };
    }

    return callModeration([{ type: 'image_url', image_url: { url: imageUrl } }]);
}
