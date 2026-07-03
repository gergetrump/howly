import config from '../../config.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Thin adapter around OpenRouter (OpenAI-compatible aggregator, free tier).
 *
 * Provider-specific but feature-agnostic: other AI features (coach, insights, ...)
 * can reuse generateText(). To swap providers later, only this file changes —
 * the signature stays the same.
 *
 * @param {string} prompt                  The full prompt to send to the model.
 * @param {object} [options]
 * @param {boolean} [options.json=false]   Ask the model to return strict JSON.
 * @param {number}  [options.temperature=0.7]
 * @returns {Promise<string>}              The model's text response.
 */
export async function generateText(prompt, { json = false, temperature = 0.7 } = {}) {
    const { apiKey, model } = config.ai?.openrouter ?? {};

    if (!apiKey) {
        throw new Error('OpenRouter API key is not configured (config.ai.openrouter.apiKey).');
    }

    const requestBody = {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        // if a chosen free model rejects it, drop it or swap the model. Callers should still parse defensively.
        ...(json ? { response_format: { type: 'json_object' } } : {}),
    };

    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            // Optional attribution headers used by OpenRouter for app rankings.
            'HTTP-Referer': config.frontendBaseUrl ?? '',
            'X-Title': 'Howly',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`OpenRouter request failed (${response.status}): ${detail.slice(0, 300)}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
        throw new Error('OpenRouter returned an empty response.');
    }

    return text;
}

const OPENROUTER_EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings';

/**
 * Generate an embedding vector for semantic similarity search.
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
    const { apiKey, embeddingModel } = config.ai?.openrouter ?? {};

    if (!apiKey) {
        throw new Error('OpenRouter API key is not configured (config.ai.openrouter.apiKey).');
    }

    const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': config.frontendBaseUrl ?? '',
            'X-Title': 'Howly',
        },
        body: JSON.stringify({
            model: embeddingModel ?? 'openai/text-embedding-3-small',
            input: text,
        }),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`OpenRouter embeddings failed (${response.status}): ${detail.slice(0, 300)}`);
    }

    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;

    if (!Array.isArray(embedding) || !embedding.length) {
        throw new Error('OpenRouter returned an empty embedding.');
    }

    return embedding;
}
