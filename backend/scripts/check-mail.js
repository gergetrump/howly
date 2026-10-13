import nodemailer from 'nodemailer';
import config from '../config.js';

if (config.disableEmailSending) {
    console.log('Email sending is disabled.');
} else {
    const transport = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: false,
        auth: { user: config.smtp.user, pass: config.smtp.pass },
    });

    try {
        await transport.verify();
        console.log('SMTP connection and authentication verified.');
    } catch (error) {
        console.error('SMTP verification failed:', error.code || 'unknown error');
        process.exitCode = 1;
    } finally {
        transport.close();
    }
}
