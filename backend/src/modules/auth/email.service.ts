import nodemailer from 'nodemailer';
import dns from 'node:dns/promises';
import net from 'node:net';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { env } from '../../config/env';

type MailContent = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function canSendEmail() {
  return Boolean(env.brevoApiKey || (env.smtpHost && env.smtpUser && env.smtpPass));
}

function parseMailFrom(value: string) {
  const match = /^(.*?)\s*<([^>]+)>$/.exec(value.trim());
  if (!match) return { email: value.trim() };

  const name = match[1].trim().replace(/^"|"$/g, '');
  return { name: name || undefined, email: match[2].trim() };
}

async function resolveSmtpHost() {
  if (!env.smtpHost || net.isIP(env.smtpHost)) return env.smtpHost;

  try {
    const [address] = await dns.resolve4(env.smtpHost);
    return address ?? env.smtpHost;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[email] failed to resolve IPv4 address for ${env.smtpHost}: ${message}`);
    return env.smtpHost;
  }
}

async function getTransporter() {
  const smtpHost = await resolveSmtpHost();
  const options: SMTPTransport.Options = {
    host: smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    dnsTimeout: 10_000,
    tls: smtpHost !== env.smtpHost ? { servername: env.smtpHost } : undefined,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  };

  return nodemailer.createTransport(options);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function baseEmailFrame(options: {
  title: string;
  preheader: string;
  intro: string;
  body: string;
  actionHtml?: string;
  footerNote: string;
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(options.title)}</title>
  </head>
  <body style="margin:0;background:#f5f7fb;color:#172033;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(options.preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e8f2;border-radius:18px;overflow:hidden;box-shadow:0 18px 48px rgba(20,32,55,0.10);">
            <tr>
              <td style="background:#172033;padding:28px 32px;">
                <div style="display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;border-radius:12px;background:#4f46e5;color:#ffffff;font-size:20px;font-weight:800;">P</div>
                <div style="margin-top:18px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:0;">${escapeHtml(options.title)}</div>
                <div style="margin-top:8px;color:#cbd5e1;font-size:14px;line-height:22px;">${escapeHtml(options.intro)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${options.body}
                ${options.actionHtml ?? ''}
                <p style="margin:28px 0 0;color:#64748b;font-size:13px;line-height:20px;">${escapeHtml(options.footerNote)}</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e3e8f2;padding:18px 32px;color:#94a3b8;font-size:12px;line-height:18px;">
                Sent by PulseBoard. If you did not request this email, you can safely ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function otpEmailHtml(otp: string) {
  const digits = otp
    .split('')
    .map(
      (digit) =>
        `<span style="display:inline-block;width:42px;height:48px;line-height:48px;margin:0 3px;border-radius:10px;background:#eef2ff;color:#312e81;font-size:24px;font-weight:800;text-align:center;">${digit}</span>`,
    )
    .join('');

  return baseEmailFrame({
    title: 'Verify your email',
    preheader: `Your PulseBoard verification code is ${otp}.`,
    intro: 'Use this one-time code to finish setting up your account.',
    body: `
      <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:24px;">Enter this code on the verification screen:</p>
      <div style="margin:0 0 22px;text-align:center;white-space:nowrap;">${digits}</div>
      <p style="margin:0;color:#334155;font-size:15px;line-height:24px;">This code expires in 10 minutes.</p>
    `,
    footerNote: 'For your security, never share this code with anyone.',
  });
}

function resetPasswordHtml(resetLink: string) {
  const safeLink = escapeHtml(resetLink);

  return baseEmailFrame({
    title: 'Reset your password',
    preheader: 'Use this secure link to reset your PulseBoard password.',
    intro: 'We received a request to create a new password for your account.',
    body: `
      <p style="margin:0 0 22px;color:#334155;font-size:15px;line-height:24px;">Click the button below to choose a new password. This link expires in 1 hour.</p>
    `,
    actionHtml: `
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
        <tr>
          <td style="border-radius:10px;background:#4f46e5;">
            <a href="${safeLink}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Reset password</a>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#64748b;font-size:13px;line-height:20px;">If the button does not work, paste this link into your browser:<br><a href="${safeLink}" style="color:#4f46e5;word-break:break-all;">${safeLink}</a></p>
    `,
    footerNote: 'Resetting your password will sign out active sessions on your account.',
  });
}

function notificationEmailHtml(options: {
  title: string;
  preheader: string;
  intro: string;
  message: string;
  footerNote: string;
}) {
  return baseEmailFrame({
    title: options.title,
    preheader: options.preheader,
    intro: options.intro,
    body: `
      <p style="margin:0;color:#334155;font-size:15px;line-height:24px;">${escapeHtml(options.message)}</p>
    `,
    footerNote: options.footerNote,
  });
}

async function sendMail(content: MailContent) {
  if (!canSendEmail()) {
    console.info(`[email] Email provider is not configured. Would send "${content.subject}" to ${content.to}: ${content.text}`);
    return;
  }

  if (env.brevoApiKey) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: parseMailFrom(env.mailFrom),
        to: [{ email: content.to }],
        subject: content.subject,
        textContent: content.text,
        htmlContent: content.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo email failed with ${response.status}: ${errorText}`);
    }

    return;
  }

  const transporter = await getTransporter();

  await transporter.sendMail({
    from: env.mailFrom,
    to: content.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}

export const emailService = {
  async sendEmailVerificationOtp(email: string, otp: string) {
    await sendMail({
      to: email,
      subject: 'Verify your PulseBoard email',
      text: `Your PulseBoard verification code is ${otp}. It expires in 10 minutes.`,
      html: otpEmailHtml(otp),
    });
  },

  async sendPasswordResetLink(email: string, resetLink: string) {
    await sendMail({
      to: email,
      subject: 'Reset your PulseBoard password',
      text: `Reset your PulseBoard password using this link: ${resetLink}\n\nThis link expires in 1 hour.`,
      html: resetPasswordHtml(resetLink),
    });
  },

  async sendProjectCreatedNotification(email: string, projectName: string) {
    await sendMail({
      to: email,
      subject: `Project created: ${projectName}`,
      text: `Your PulseBoard project "${projectName}" has been created.`,
      html: notificationEmailHtml({
        title: 'Project created',
        preheader: `Your project "${projectName}" has been created.`,
        intro: 'Your new workspace is ready in PulseBoard.',
        message: `Your project "${projectName}" has been created successfully.`,
        footerNote: 'You can now add members and start creating tasks.',
      }),
    });
  },

  async sendProjectMemberAddedNotification(
    email: string,
    recipientName: string,
    projectName: string,
    addedByName: string,
  ) {
    await sendMail({
      to: email,
      subject: `You were added to ${projectName}`,
      text: `${addedByName} added you to the PulseBoard project "${projectName}".`,
      html: notificationEmailHtml({
        title: 'Added to a project',
        preheader: `You were added to "${projectName}".`,
        intro: `Hi ${recipientName}, you have a new project in PulseBoard.`,
        message: `${addedByName} added you to the project "${projectName}".`,
        footerNote: 'Open PulseBoard to view the project board and tasks.',
      }),
    });
  },

  async sendTaskAssignedNotification(
    email: string,
    recipientName: string,
    taskTitle: string,
    projectName: string,
    assignedByName: string,
  ) {
    await sendMail({
      to: email,
      subject: `Task assigned: ${taskTitle}`,
      text: `${assignedByName} assigned you "${taskTitle}" in the PulseBoard project "${projectName}".`,
      html: notificationEmailHtml({
        title: 'Task assigned',
        preheader: `You were assigned "${taskTitle}".`,
        intro: `Hi ${recipientName}, you have a new assignment.`,
        message: `${assignedByName} assigned you "${taskTitle}" in the project "${projectName}".`,
        footerNote: 'Open PulseBoard to review the task details.',
      }),
    });
  },

  async sendTaskStatusChangedNotification(
    email: string,
    recipientName: string,
    taskTitle: string,
    projectName: string,
    oldStatus: string,
    newStatus: string,
    changedByName: string,
  ) {
    await sendMail({
      to: email,
      subject: `Task status changed: ${taskTitle}`,
      text: `${changedByName} changed "${taskTitle}" in "${projectName}" from ${oldStatus} to ${newStatus}.`,
      html: notificationEmailHtml({
        title: 'Task status changed',
        preheader: `"${taskTitle}" moved from ${oldStatus} to ${newStatus}.`,
        intro: `Hi ${recipientName}, a task assigned to you was updated.`,
        message: `${changedByName} changed "${taskTitle}" in "${projectName}" from ${oldStatus} to ${newStatus}.`,
        footerNote: 'Open PulseBoard to see the latest task activity.',
      }),
    });
  },
};
