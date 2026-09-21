import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(envPath) {
    if (!fs.existsSync(envPath)) {
        return;
    }

    for (const rawLine of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }

        const eq = line.indexOf('=');
        if (eq === -1) {
            continue;
        }

        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

loadEnvFile(path.join(configDir, '.env'));
loadEnvFile(path.join(process.cwd(), '.env'));

function envString(name, fallback = '') {
    const value = process.env[name];
    return value === undefined || value === '' ? fallback : value;
}

function envNumber(name, fallback) {
    const value = process.env[name];
    if (value === undefined || value === '') {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function envBoolean(name, fallback) {
    const value = process.env[name];
    if (value === undefined || value === '') {
        return fallback;
    }
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const config = {
    port: envNumber('PORT', 3000),
    timezone: envString('APP_TIMEZONE', 'Europe/Berlin'),
    mongoUri: envString('MONGO_URI', 'mongodb://127.0.0.1:27017/howly'),
    jwtSecret: envString('JWT_SECRET', 'dev-only-change-me'),
    jwtExpiresIn: envString('JWT_EXPIRES_IN', '7d'),
    serverBaseUrl: envString('SERVER_BASE_URL', 'http://localhost:3000'),
    frontendBaseUrl: envString('FRONTEND_BASE_URL', 'http://localhost:5173'),
    disableEmailSending: envBoolean('DISABLE_EMAIL_SENDING', true),
    developerFeedbackEmail: envString('DEVELOPER_FEEDBACK_EMAIL', ''),
    cloudinary: {
        cloudName: envString('CLOUDINARY_CLOUD_NAME'),
        apiKey: envString('CLOUDINARY_API_KEY'),
        apiSecret: envString('CLOUDINARY_API_SECRET'),
    },
    smtp: {
        host: envString('SMTP_HOST', 'smtp.gmail.com'),
        port: envNumber('SMTP_PORT', 587),
        user: envString('SMTP_USER'),
        pass: envString('SMTP_PASS'),
        from: envString('SMTP_FROM', 'Howly <noreply@localhost>'),
    },
    stripe: {
        secretKey: envString('STRIPE_SECRET_KEY'),
        webhook_secret: envString('STRIPE_WEBHOOK_SECRET'),
    },
    ai: {
        openrouter: {
            apiKey: envString('OPENROUTER_API_KEY'),
            model: envString('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
            fallbackModels: [
                'openai/gpt-oss-20b:free',
                'meta-llama/llama-3.3-70b-instruct:free',
                'qwen/qwen3-next-80b-a3b-instruct:free',
                'google/gemma-4-31b-it:free',
            ],
            embeddingModel: envString(
                'OPENROUTER_EMBEDDING_MODEL',
                'openai/text-embedding-3-small',
            ),
        },
    },
    moderation: {
        apiKey: envString('MODERATION_API_KEY'),
        model: envString('MODERATION_MODEL', 'omni-moderation-latest'),
    },
    taxonomy: {
        minScore: envNumber('TAXONOMY_MIN_SCORE', 0.1),
    },
};

export default config;
