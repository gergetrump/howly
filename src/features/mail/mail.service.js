import nodemailer from 'nodemailer';
import config from '../../../config.js';

const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: false,
    auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
    },
});

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function formatUserLine(user) {
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Unknown user';
    return `${name} (@${user?.username || 'unknown'}, ${user?.email || 'no email'})`;
}


function baseEmailShell({ title, eyebrow, heading, bodyHtml, actionUrl, actionText, icon = 'H', note }) {
    const safeTitle = escapeHtml(title);
    const safeEyebrow = escapeHtml(eyebrow);
    const safeHeading = escapeHtml(heading);
    const safeActionUrl = escapeHtml(actionUrl);
    const safeActionText = escapeHtml(actionText);
    const safeIcon = escapeHtml(icon);
    const safeNote = note ? escapeHtml(note) : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>${safeTitle}</title>
</head>
<body style="margin:0; padding:0; background:#0f172a; font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a; padding:40px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
                    <tr>
                        <td style="padding-bottom:20px;">
                            <table cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <div style="width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg, #8b5cf6, #ec4899); color:#ffffff; font-size:24px; font-weight:800; line-height:44px; text-align:center;">
                                            H
                                        </div>
                                    </td>
                                    <td style="padding-left:12px;">
                                        <div style="font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.03em;">Howly</div>
                                        <div style="font-size:13px; color:#94a3b8; margin-top:2px;">Habit companion</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:rgba(15, 23, 42, 0.96); border:1px solid rgba(148, 163, 184, 0.25); border-radius:24px; box-shadow:0 24px 60px rgba(0,0,0,0.35); overflow:hidden;">
                            <div style="height:6px; background:linear-gradient(90deg, #8b5cf6, #ec4899, #22c55e);"></div>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding:36px 34px 32px;">
                                        <div style="width:56px; height:56px; border-radius:18px; background:rgba(139, 92, 246, 0.14); color:#a78bfa; font-size:28px; line-height:56px; text-align:center; margin-bottom:22px;">${safeIcon}</div>
                                        <div style="font-size:12px; font-weight:700; color:#a78bfa; text-transform:uppercase; letter-spacing:0.22em; margin-bottom:10px;">${safeEyebrow}</div>
                                        <h1 style="margin:0; color:#ffffff; font-size:30px; line-height:1.2; letter-spacing:-0.04em;">${safeHeading}</h1>
                                        <p style="margin:16px 0 0; color:#cbd5e1; font-size:16px; line-height:1.65;">${bodyHtml}</p>
                                        <div style="text-align:center; margin:34px 0 30px;">
                                            <a href="${safeActionUrl}" style="display:inline-block; background:linear-gradient(135deg, #8b5cf6, #ec4899); color:#ffffff; text-decoration:none; padding:15px 30px; border-radius:999px; font-size:16px; font-weight:700; box-shadow:0 12px 28px rgba(236, 72, 153, 0.28);">${safeActionText}</a>
                                        </div>
                                        ${safeNote ? `<div style="background:rgba(15, 23, 42, 0.8); border:1px solid rgba(148, 163, 184, 0.18); border-radius:16px; padding:16px 18px; color:#94a3b8; font-size:14px; line-height:1.6;">${safeNote}</div>` : ''}
                                        <p style="margin:26px 0 8px; color:#64748b; font-size:12px; line-height:1.6;">
                                            If the button does not work, copy and paste this link into your browser:
                                        </p>
                                        <p style="margin:0; font-size:12px; line-height:1.6; word-break:break-all;">
                                            <a href="${safeActionUrl}" style="color:#a78bfa; text-decoration:underline;">${safeActionUrl}</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:22px 12px 0; color:#64748b; font-size:12px; line-height:1.6;">&copy; ${new Date().getFullYear()} Howly. Keep your habits growing.</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export function challengeInvitationEmailTemplate({ inviterName, challengeTitle, challengeUrl }) {
    const safeChallengeTitle = escapeHtml(challengeTitle);

    return baseEmailShell({
        title: 'You have a Howly challenge invitation',
        eyebrow: 'Challenge invitation',
        heading: `${inviterName} invited you to a challenge`,
        bodyHtml: `You have a new invitation for <strong style="color:#ffffff;">${safeChallengeTitle}</strong>. Open Howly to accept or decline it.`,
        actionUrl: challengeUrl,
        actionText: 'View invitation',
        icon: 'C',
        note: 'You can turn challenge invitation emails off in Profile > Notifications.',
    });
}

export function challengeInvitationEmailText({ inviterName, challengeTitle, challengeUrl }) {
    return [
        'Howly challenge invitation',
        '',
        `${inviterName} invited you to a challenge.`,
        `Challenge: ${challengeTitle}`,
        '',
        `View invitation: ${challengeUrl}`,
        '',
        'You can turn challenge invitation emails off in Profile > Notifications.',
    ].join('\n');
}

export function streakReminderEmailTemplate({ streak, deadline, appUrl }) {
    const safeStreak = escapeHtml(streak);
    const safeDeadline = escapeHtml(deadline);

    return baseEmailShell({
        title: 'Your Howly streak needs attention',
        eyebrow: 'Streak reminder',
        heading: 'Your streak is almost at risk',
        bodyHtml: `Your ${safeStreak}-day streak repair window ends soon. Complete a habit or use a streak freeze before <strong style="color:#ffffff;">${safeDeadline}</strong>.`,
        actionUrl: appUrl,
        actionText: 'Open Howly',
        icon: 'S',
        note: 'This reminder is sent around two hours before your streak repair window expires.',
    });
}

export function streakReminderEmailText({ streak, deadline, appUrl }) {
    return [
        'Your Howly streak needs attention',
        '',
        `Your ${streak}-day streak repair window ends soon.`,
        `Complete a habit or use a streak freeze before ${deadline}.`,
        '',
        `Open Howly: ${appUrl}`,
        '',
        'This reminder is sent around two hours before your streak repair window expires.',
    ].join('\n');
}

export function passwordResetEmailTemplate(resetUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Reset your Howly password</title>
</head>

<body style="margin:0; padding:0; background:#0f172a; font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a; padding:40px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
                    
                    <!-- Logo / Header -->
                    <tr>
                        <td style="padding-bottom:20px;">
                            <table cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <div style="width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg, #8b5cf6, #ec4899); color:#ffffff; font-size:24px; font-weight:800; line-height:44px; text-align:center;">
                                            H
                                        </div>
                                    </td>
                                    <td style="padding-left:12px;">
                                        <div style="font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.03em;">
                                            Howly
                                        </div>
                                        <div style="font-size:13px; color:#94a3b8; margin-top:2px;">
                                            Habit companion
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Card -->
                    <tr>
                        <td style="background:rgba(15, 23, 42, 0.96); border:1px solid rgba(148, 163, 184, 0.25); border-radius:24px; box-shadow:0 24px 60px rgba(0,0,0,0.35); overflow:hidden;">
                            
                            <!-- Top Accent -->
                            <div style="height:6px; background:linear-gradient(90deg, #8b5cf6, #ec4899, #22c55e);"></div>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding:36px 34px 32px;">
                                        
                                        <div style="width:56px; height:56px; border-radius:18px; background:rgba(139, 92, 246, 0.14); color:#a78bfa; font-size:28px; line-height:56px; text-align:center; margin-bottom:22px;">
                                            🔑
                                        </div>

                                        <div style="font-size:12px; font-weight:700; color:#a78bfa; text-transform:uppercase; letter-spacing:0.22em; margin-bottom:10px;">
                                            New password
                                        </div>

                                        <h1 style="margin:0; color:#ffffff; font-size:30px; line-height:1.2; letter-spacing:-0.04em;">
                                            Reset your password
                                        </h1>

                                        <p style="margin:16px 0 0; color:#cbd5e1; font-size:16px; line-height:1.65;">
                                            You requested a password reset for your Howly account. Click the button below to choose a new password.
                                        </p>

                                        <div style="text-align:center; margin:34px 0 30px;">
                                            <a href="${resetUrl}"
                                               style="display:inline-block; background:linear-gradient(135deg, #8b5cf6, #ec4899); color:#ffffff; text-decoration:none; padding:15px 30px; border-radius:999px; font-size:16px; font-weight:700; box-shadow:0 12px 28px rgba(236, 72, 153, 0.28);">
                                                Reset password
                                            </a>
                                        </div>

                                        <div style="background:rgba(15, 23, 42, 0.8); border:1px solid rgba(148, 163, 184, 0.18); border-radius:16px; padding:16px 18px;">
                                            <p style="margin:0; color:#e2e8f0; font-size:14px; line-height:1.6;">
                                                This link expires in <strong>15 minutes</strong>.
                                            </p>
                                            <p style="margin:8px 0 0; color:#94a3b8; font-size:14px; line-height:1.6;">
                                                If you did not request this, you can safely ignore this email.
                                            </p>
                                        </div>

                                        <p style="margin:26px 0 8px; color:#64748b; font-size:12px; line-height:1.6;">
                                            If the button does not work, copy and paste this link into your browser:
                                        </p>

                                        <p style="margin:0; font-size:12px; line-height:1.6; word-break:break-all;">
                                            <a href="${resetUrl}" style="color:#a78bfa; text-decoration:underline;">
                                                ${resetUrl}
                                            </a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding:22px 12px 0; color:#64748b; font-size:12px; line-height:1.6;">
                            © ${new Date().getFullYear()} Howly. Keep your habits growing.
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
}


export function accountVerificationEmailTemplate(verificationUrl) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Confirm your Howly account</title>
</head>

<body style="margin:0; padding:0; background:#0f172a; font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a; padding:40px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
                    <tr>
                        <td style="padding-bottom:20px;">
                            <table cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <div style="width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg, #8b5cf6, #ec4899); color:#ffffff; font-size:24px; font-weight:800; line-height:44px; text-align:center;">
                                            H
                                        </div>
                                    </td>
                                    <td style="padding-left:12px;">
                                        <div style="font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.03em;">
                                            Howly
                                        </div>
                                        <div style="font-size:13px; color:#94a3b8; margin-top:2px;">
                                            Habit companion
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background:rgba(15, 23, 42, 0.96); border:1px solid rgba(148, 163, 184, 0.25); border-radius:24px; box-shadow:0 24px 60px rgba(0,0,0,0.35); overflow:hidden;">
                            <div style="height:6px; background:linear-gradient(90deg, #8b5cf6, #ec4899, #22c55e);"></div>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding:36px 34px 32px;">
                                        <div style="width:56px; height:56px; border-radius:18px; background:rgba(139, 92, 246, 0.14); color:#a78bfa; font-size:28px; line-height:56px; text-align:center; margin-bottom:22px;">
                                            ✨
                                        </div>

                                        <div style="font-size:12px; font-weight:700; color:#a78bfa; text-transform:uppercase; letter-spacing:0.22em; margin-bottom:10px;">
                                            Confirm account
                                        </div>

                                        <h1 style="margin:0; color:#ffffff; font-size:30px; line-height:1.2; letter-spacing:-0.04em;">
                                            Confirm your email address
                                        </h1>

                                        <p style="margin:16px 0 0; color:#cbd5e1; font-size:16px; line-height:1.65;">
                                            Welcome to Howly. Click the button below to confirm your email and activate your account.
                                        </p>

                                        <div style="text-align:center; margin:34px 0 30px;">
                                            <a href="${verificationUrl}"
                                               style="display:inline-block; background:linear-gradient(135deg, #8b5cf6, #ec4899); color:#ffffff; text-decoration:none; padding:15px 30px; border-radius:999px; font-size:16px; font-weight:700; box-shadow:0 12px 28px rgba(236, 72, 153, 0.28);">
                                                Confirm email
                                            </a>
                                        </div>

                                        <div style="background:rgba(15, 23, 42, 0.8); border:1px solid rgba(148, 163, 184, 0.18); border-radius:16px; padding:16px 18px;">
                                            <p style="margin:0; color:#e2e8f0; font-size:14px; line-height:1.6;">
                                                This link expires in <strong>24 hours</strong>.
                                            </p>
                                            <p style="margin:8px 0 0; color:#94a3b8; font-size:14px; line-height:1.6;">
                                                If you did not create an account, you can safely ignore this email.
                                            </p>
                                        </div>

                                        <p style="margin:26px 0 8px; color:#64748b; font-size:12px; line-height:1.6;">
                                            If the button does not work, copy and paste this link into your browser:
                                        </p>

                                        <p style="margin:0; font-size:12px; line-height:1.6; word-break:break-all;">
                                            <a href="${verificationUrl}" style="color:#a78bfa; text-decoration:underline;">
                                                ${verificationUrl}
                                            </a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding:22px 12px 0; color:#64748b; font-size:12px; line-height:1.6;">
                            © ${new Date().getFullYear()} Howly. Keep your habits growing.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;
}



export function friendRequestEmailTemplate({ requesterName, socialUrl }) {
    return baseEmailShell({
        title: 'You have a new Howly friend request',
        eyebrow: 'Friend request',
        heading: `${requesterName} sent you a friend request`,
        bodyHtml: 'Open Howly to accept or decline the request.',
        actionUrl: socialUrl,
        actionText: 'View request',
        icon: 'F',
        note: 'You can turn friend request emails off in Profile > Notifications.',
    });
}

export function friendRequestEmailText({ requesterName, socialUrl }) {
    return [
        'New Howly friend request',
        '',
        `${requesterName} sent you a friend request.`,
        '',
        `View request: ${socialUrl}`,
        '',
        'You can turn friend request emails off in Profile > Notifications.',
    ].join('\n');
}

export function feedbackEmailTemplate({ user, type, subject, message }) {
    const safeType = type === 'problem' ? 'Problem report' : 'Suggestion';
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || 'Unknown user';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>Howly feedback</title>
</head>
<body style="margin:0; padding:24px; background:#0f172a; font-family:Arial, Helvetica, sans-serif; color:#e2e8f0;">
    <main style="max-width:680px; margin:0 auto; background:#111827; border:1px solid rgba(148,163,184,0.25); border-radius:20px; padding:28px;">
        <p style="margin:0 0 8px; color:#a78bfa; font-size:12px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase;">${safeType}</p>
        <h1 style="margin:0 0 20px; color:#ffffff;">New Howly feedback</h1>
        <p style="margin:0 0 18px; color:#e2e8f0; font-size:18px;"><strong>Subject:</strong> ${subject}</p>
        <p style="margin:0 0 6px;"><strong>User:</strong> ${name}</p>
        <p style="margin:0 0 6px;"><strong>Username:</strong> ${user?.username ?? 'unknown'}</p>
        <p style="margin:0 0 20px;"><strong>Email:</strong> ${user?.email ?? 'unknown'}</p>
        <div style="white-space:pre-wrap; line-height:1.6; background:rgba(15,23,42,0.8); border:1px solid rgba(148,163,184,0.18); border-radius:14px; padding:18px;">${message}</div>
    </main>
</body>
</html>`;
}
export async function sendPasswordResetEmail(email, resetLink) {
    if (config.disableEmailSending) {
        return;
    }

    return transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject: 'Reset your Howly password',
        html: passwordResetEmailTemplate(resetLink),
    });
}

export async function sendAccountVerificationEmail(email, verificationLink) {
    if (config.disableEmailSending) {
        return;
    }

    return transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject: 'Confirm your Howly account',
        html: accountVerificationEmailTemplate(verificationLink),
    });
}
export async function sendChallengeInvitationEmail(email, invitationDetails) {
    if (config.disableEmailSending) {
        return;
    }

    return transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject: 'You have a Howly challenge invitation',
        html: challengeInvitationEmailTemplate(invitationDetails),
        text: challengeInvitationEmailText(invitationDetails),
    });
}

export async function sendStreakReminderEmail(email, reminderDetails) {
    if (config.disableEmailSending) {
        return;
    }

    return transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject: 'Your Howly streak needs attention',
        html: streakReminderEmailTemplate(reminderDetails),
        text: streakReminderEmailText(reminderDetails),
    });
}
export async function sendFriendRequestEmail(email, requestDetails) {
    if (config.disableEmailSending) {
        return;
    }

    return transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject: 'You have a new Howly friend request',
        html: friendRequestEmailTemplate(requestDetails),
        text: friendRequestEmailText(requestDetails),
    });
}

export async function sendFeedbackEmail(feedbackDetails) {
    if (config.disableEmailSending) {
        return;
    }

    return transporter.sendMail({
        from: config.smtp.from,
        to: config.developerFeedbackEmail,
        subject: `Howly feedback: ${feedbackDetails.type === 'problem' ? 'Problem report' : 'Suggestion'} - ${feedbackDetails.subject}`,
        html: feedbackEmailTemplate(feedbackDetails),
    });
}



export async function sendUserReportEmail({ report, reporter, reportedUser, attachmentFile }) {
    if (config.disableEmailSending) {
        return { skipped: true };
    }

    const tags = report.tags?.length ? report.tags.join(', ') : 'No tags selected';
    const attachments = attachmentFile
        ? [{
            filename: attachmentFile.originalname,
            content: attachmentFile.buffer,
            contentType: attachmentFile.mimetype,
        }]
        : [];

    const result = await transporter.sendMail({
        from: config.smtp.from,
        to: config.smtp.user,
        subject: `Howly user report: @${reportedUser.username}`,
        html: `
            <h2>New Howly report</h2>
            <p><strong>Report ID:</strong> ${escapeHtml(report._id.toString())}</p>
            <p><strong>Reporter:</strong> ${escapeHtml(formatUserLine(reporter))}</p>
            <p><strong>Reported user:</strong> ${escapeHtml(formatUserLine(reportedUser))}</p>
            <p><strong>Tags:</strong> ${escapeHtml(tags)}</p>
            <p><strong>Message:</strong></p>
            <div style="white-space:pre-wrap; padding:12px; border:1px solid #ddd; border-radius:8px;">
                ${escapeHtml(report.message)}
            </div>
            ${attachmentFile ? '<p>An image attachment was included with this report.</p>' : ''}
        `,
        text: [
            'New Howly report',
            `Report ID: ${report._id.toString()}`,
            `Reporter: ${formatUserLine(reporter)}`,
            `Reported user: ${formatUserLine(reportedUser)}`,
            `Tags: ${tags}`,
            '',
            report.message,
            attachmentFile ? '\nAn image attachment was included with this report.' : '',
        ].join('\n'),
        attachments,
    });

    return { skipped: false, result };
}
