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


export async function sendPasswordResetEmail(email, resetLink) {
    return transporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject: 'Reset your Howly password',
        html: passwordResetEmailTemplate(resetLink),
    });
}