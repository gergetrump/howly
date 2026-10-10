import config from '../config.js';

const INSECURE_JWT_SECRETS = new Set([
    'dev-only-change-me',
    'replace-with-a-long-random-string',
]);

// Production refuses the local placeholder secret. Email and public URL problems
// are warnings so the process can still boot while those are being filled in.
export function productionConfigError(appConfig = config, env = process.env) {
    if (env.NODE_ENV !== 'production') {
        return null;
    }

    if (
        !appConfig.jwtSecret
        || INSECURE_JWT_SECRETS.has(appConfig.jwtSecret)
        || appConfig.jwtSecret.length < 32
    ) {
        return 'JWT_SECRET must be a unique random string of at least 32 characters in production.';
    }

    return null;
}

export function warnAboutProductionLimits(appConfig = config, env = process.env) {
    if (env.NODE_ENV !== 'production') {
        return;
    }

    if (appConfig.disableEmailSending) {
        console.warn('[howly] DISABLE_EMAIL_SENDING is true. New accounts cannot verify email and will be unable to log in.');
    } else if (!appConfig.smtp.user) {
        console.warn('[howly] SMTP_USER is empty. Verification emails will fail and new users will not be able to log in.');
    }

    for (const [name, value] of [
        ['SERVER_BASE_URL', appConfig.serverBaseUrl],
        ['FRONTEND_BASE_URL', appConfig.frontendBaseUrl],
    ]) {
        if (!value.startsWith('https://')) {
            console.warn(`[howly] ${name} is ${value}. Email links and profile images need the public https URL of the site.`);
        }
    }
}
