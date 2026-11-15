// Optional outbound email (SMTP). When SMTP_HOST / SMTP_FROM are not set, email
// features (signup verification, password reset) are disabled.
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_FROM = process.env.SMTP_FROM || '';

let transporter = null;

function isEmailEnabled() {
  return Boolean(SMTP_HOST && SMTP_FROM);
}

function getTransporter() {
  if (!transporter) {
    const user = process.env.SMTP_USER || '';
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: user ? { user, pass: process.env.SMTP_PASSWORD || '' } : undefined
    });
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderEmail({ title, intro, buttonText, url, footer }) {
  const safeUrl = escapeHtml(url);
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1f2937; padding: 24px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #5BA8D0; margin: 0; font-size: 26px;">ThinkCNAP</h1>
        <p style="color: #D1D5DB; margin: 8px 0 0 0;">Maturity Assessment &amp; Attack Simulation Platform</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="margin-top: 0;">${escapeHtml(title)}</h2>
        <p>${escapeHtml(intro)}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${safeUrl}" style="background: #3A7EB0; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">${escapeHtml(buttonText)}</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 14px;">${safeUrl}</p>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">${escapeHtml(footer)}</p>
      </div>
    </body>
    </html>
  `;
}

async function sendMail(to, subject, html) {
  if (!isEmailEnabled()) {
    throw new Error('Email is not configured');
  }
  await getTransporter().sendMail({ from: SMTP_FROM, to, subject, html });
}

async function sendVerificationEmail(to, url) {
  return sendMail(to, 'Verify your ThinkCNAP account', renderEmail({
    title: 'Verify Your Email Address',
    intro: 'Thank you for signing up! Please verify your email address to activate your account.',
    buttonText: 'Verify Email Address',
    url,
    footer: 'This link expires in 24 hours. If you did not create a ThinkCNAP account, you can ignore this email.'
  }));
}

async function sendPasswordResetEmail(to, url) {
  return sendMail(to, 'Reset your ThinkCNAP password', renderEmail({
    title: 'Reset Your Password',
    intro: 'We received a request to reset your password. Click the button below to choose a new one.',
    buttonText: 'Reset Password',
    url,
    footer: 'This link expires in 24 hours. If you did not request a password reset, you can ignore this email.'
  }));
}

module.exports = { isEmailEnabled, sendVerificationEmail, sendPasswordResetEmail };
