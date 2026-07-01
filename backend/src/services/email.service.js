import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Email service with graceful degradation:
 * - If SMTP is configured, sends via nodemailer.
 * - Otherwise logs the message (dev) so flows work without a mail server.
 */
class EmailService {
  constructor() {
    this.transporter = null;
    if (config.mail.host && config.mail.user) {
      this.transporter = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port || 587,
        secure: (config.mail.port || 587) === 465,
        auth: { user: config.mail.user, pass: config.mail.pass },
      });
    }
  }

  async send({ to, subject, html, text }) {
    if (!this.transporter) {
      logger.warn(`[email:noop] to=${to} subject="${subject}" (SMTP not configured)`);
      return { queued: false, noop: true };
    }
    const info = await this.transporter.sendMail({
      from: config.mail.from,
      to,
      subject,
      html,
      text,
    });
    logger.info(`Email sent: ${info.messageId} -> ${to}`);
    return { queued: true, messageId: info.messageId };
  }

  sendVerificationEmail(to, token) {
    const url = `${config.clientUrl}/verify-email?token=${token}`;
    return this.send({
      to,
      subject: 'Verify your email',
      html: `<p>Welcome! Verify your account:</p><p><a href="${url}">${url}</a></p>`,
    });
  }

  sendPasswordResetEmail(to, token) {
    const url = `${config.clientUrl}/reset-password?token=${token}`;
    return this.send({
      to,
      subject: 'Reset your password',
      html: `<p>Reset your password (valid 15 min):</p><p><a href="${url}">${url}</a></p>`,
    });
  }
}

export default new EmailService();
