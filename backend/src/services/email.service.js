import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { OTP_PURPOSE } from '../constants/otp.js';

/**
 * Email service with graceful degradation:
 * - If SMTP is configured, sends via nodemailer.
 * - Otherwise logs the message (and any OTP code) so flows work in dev without
 *   a mail server. In dev, the API also returns the code in the response body.
 *
 * All messages share one branded HTML shell (`wrap`) for a consistent look.
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

  get enabled() {
    return Boolean(this.transporter);
  }

  /** Branded HTML shell. `body` is trusted internal markup, never user input verbatim. */
  wrap(title, body) {
    return `
  <div style="background:#f4f5f7;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eceef1;">
      <div style="padding:24px 32px;border-bottom:1px solid #f0f1f3;">
        <span style="font-size:18px;font-weight:700;color:#4f46e5;">${config.appName}</span>
      </div>
      <div style="padding:32px;color:#1f2430;font-size:15px;line-height:1.6;">
        <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h1>
        ${body}
      </div>
      <div style="padding:20px 32px;border-top:1px solid #f0f1f3;color:#9aa2ad;font-size:12px;">
        ${config.appName} · This is an automated message, please do not reply.
      </div>
    </div>
  </div>`;
  }

  async send({ to, subject, html, text, attachments }) {
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
      attachments,
    });
    logger.info(`Email sent: ${info.messageId} -> ${to}`);
    return { queued: true, messageId: info.messageId };
  }

  sendOtpEmail(to, code, purpose = OTP_PURPOSE.SIGNUP) {
    const intent = {
      [OTP_PURPOSE.SIGNUP]: 'confirm your email address',
      [OTP_PURPOSE.LOGIN]: 'finish signing in',
      [OTP_PURPOSE.RESET]: 'reset your password',
      [OTP_PURPOSE.EMAIL_CHANGE]: 'confirm your new email address',
    }[purpose];

    if (!this.enabled) {
      logger.info(`[otp] to=${to} purpose=${purpose} code=${code}`);
    }

    return this.send({
      to,
      subject: `Your ${config.appName} verification code: ${code}`,
      html: this.wrap(
        'Verification code',
        `<p>Use the code below to ${intent}. It expires in ${config.otp.expiresMin} minutes.</p>
         <div style="margin:24px 0;text-align:center;">
           <span style="display:inline-block;font-size:32px;letter-spacing:10px;font-weight:700;
             color:#111827;background:#f4f5f7;border-radius:12px;padding:16px 24px;">${code}</span>
         </div>
         <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>`,
      ),
      text: `Your ${config.appName} code is ${code} (expires in ${config.otp.expiresMin} minutes).`,
    });
  }

  sendInviteEmail(to, { token, organizationName, inviterName }) {
    const url = `${config.clientUrl}/accept-invite?token=${token}`;
    if (!this.enabled) {
      logger.info(`[invite] to=${to} org="${organizationName}" url=${url}`);
    }
    return this.send({
      to,
      subject: `${inviterName || 'A teammate'} invited you to ${organizationName} on ${config.appName}`,
      html: this.wrap(
        `Join ${organizationName}`,
        `<p>${inviterName || 'A teammate'} has invited you to collaborate on <strong>${organizationName}</strong>.</p>
         <div style="margin:24px 0;">
           <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;
             padding:12px 22px;border-radius:10px;font-weight:600;">Accept invitation</a>
         </div>
         <p style="color:#6b7280;font-size:13px;">Or paste this link into your browser:<br>${url}</p>`,
      ),
      text: `You've been invited to ${organizationName}. Accept: ${url}`,
    });
  }

  sendTaskAssignedEmail(to, { taskTitle, assignerName, link }) {
    const url = `${config.clientUrl}${link || '/app/board'}`;
    return this.send({
      to,
      subject: `You were assigned: ${taskTitle}`,
      html: this.wrap(
        'New task assigned to you',
        `<p><strong>${assignerName || 'Someone'}</strong> assigned you a task:</p>
         <p style="font-size:16px;font-weight:600;color:#111827;margin:16px 0;">${taskTitle}</p>
         <div style="margin:24px 0;">
           <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;
             padding:12px 22px;border-radius:10px;font-weight:600;">View task</a>
         </div>`,
      ),
      text: `${assignerName || 'Someone'} assigned you the task "${taskTitle}". View: ${url}`,
    });
  }

  sendTaskDueSoonEmail(to, { taskTitle, dueDate, overdue, link }) {
    const url = `${config.clientUrl}${link || '/app/board'}`;
    const when = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '';
    return this.send({
      to,
      subject: overdue ? `Overdue: ${taskTitle}` : `Due soon: ${taskTitle}`,
      html: this.wrap(
        overdue ? 'A task is overdue' : 'A task is due soon',
        `<p>Your task ${overdue ? 'was due' : 'is due'}${when ? ` on <strong>${when}</strong>` : ' soon'}:</p>
         <p style="font-size:16px;font-weight:600;color:#111827;margin:16px 0;">${taskTitle}</p>
         <div style="margin:24px 0;">
           <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;
             padding:12px 22px;border-radius:10px;font-weight:600;">View task</a>
         </div>`,
      ),
      text: `${overdue ? 'Overdue' : 'Due soon'}: "${taskTitle}"${when ? ` (${when})` : ''}. View: ${url}`,
    });
  }

  sendMentionEmail(to, { taskTitle, actorName, message, link }) {
    const url = `${config.clientUrl}${link || '/app/board'}`;
    const snippet = (message || '').slice(0, 280);
    return this.send({
      to,
      subject: `${actorName || 'Someone'} mentioned you on “${taskTitle}”`,
      html: this.wrap(
        'You were mentioned',
        `<p><strong>${actorName || 'Someone'}</strong> mentioned you on <strong>${taskTitle}</strong>:</p>
         <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #4f46e5;background:#f4f5f7;
           border-radius:8px;color:#374151;">${snippet}</blockquote>
         <div style="margin:24px 0;">
           <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;
             padding:12px 22px;border-radius:10px;font-weight:600;">View comment</a>
         </div>`,
      ),
      text: `${actorName || 'Someone'} mentioned you on "${taskTitle}": ${snippet}. View: ${url}`,
    });
  }

  sendReportEmail(to, { subject, summaryHtml, attachments }) {
    return this.send({
      to,
      subject,
      html: this.wrap('Your report is ready', summaryHtml),
      attachments,
    });
  }
}

export default new EmailService();
