const config = {
    port: 3000,
    timezone: process.env.APP_TIMEZONE || 'Europe/Berlin',
    mongoUri: 'mongodb://127.0.0.1:27017/howly',
    jwtSecret: 'REDACTED',
    serverBaseUrl: 'http://localhost:3000',
    frontendBaseUrl: 'http://localhost:5173',
    disableEmailSending: false,
    developerFeedbackEmail: 'yourhowlyteam@gmail.com',
    cloudinary: {
        cloudName: 'dxclpq7wx',
        apiKey: 'REDACTED',
        apiSecret: 'REDACTED',
    },
    smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        user: 'yourhowlyteam@gmail.com',
        pass: 'REDACTED',
        from: 'Howly <yourhowlyteam@gmail.com>',
    },
    stripe: {
        secretKey: 'REDACTED',
        webhook_secret: 'REDACTED'
    },
    // OpenRouter (OpenAI-compatible aggregator) — used for AI habit suggestions.
    ai: {
        openrouter: {
            // Key: https://openrouter.ai/keys
            apiKey: 'REDACTED',
            // Paid primary — uses account credit for reliable suggestions. Free models below are fallbacks.
            model: 'openai/gpt-4o-mini',
            // Tried in order when the primary is rate-limited or unavailable.
            // Different providers, so an upstream throttle rarely hits all at once.
            fallbackModels: [
                'openai/gpt-oss-20b:free',
                'meta-llama/llama-3.3-70b-instruct:free',
                'qwen/qwen3-next-80b-a3b-instruct:free',
                'google/gemma-4-31b-it:free',
            ],
            embeddingModel: 'openai/text-embedding-3-small',
        },
    },
    moderation: {
        apiKey: 'REDACTED',
        model: 'omni-moderation-latest',
    },
    taxonomy: {
        minScore: 0.1,
    },
};

export default config;