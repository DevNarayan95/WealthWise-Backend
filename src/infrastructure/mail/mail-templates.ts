export type OtpEmailKind = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export interface OtpEmailInput {
  appName: string;
  firstName: string;
  code: string;
  kind: OtpEmailKind;
  expiresInMinutes: number;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const OTP_SUBJECTS: Record<OtpEmailKind, (appName: string) => string> = {
  EMAIL_VERIFICATION: (appName) => `Verify your ${appName} email address`,
  PASSWORD_RESET: (appName) => `Reset your ${appName} password`,
};

const OTP_INTRO: Record<OtpEmailKind, string> = {
  EMAIL_VERIFICATION: 'Use the code below to verify your email address.',
  PASSWORD_RESET: 'Use the code below to reset your password.',
};

export const buildOtpEmail = (input: OtpEmailInput): RenderedEmail => {
  const name = escapeHtml(input.firstName);
  const app = escapeHtml(input.appName);
  const code = escapeHtml(input.code);
  const intro = OTP_INTRO[input.kind];
  const expiry = `This code expires in ${input.expiresInMinutes} minutes.`;
  const ignore =
    'If you did not request this, you can safely ignore this email.';

  return {
    subject: OTP_SUBJECTS[input.kind](input.appName),
    text: [
      `Hi ${input.firstName},`,
      '',
      intro,
      '',
      `Your code: ${input.code}`,
      '',
      expiry,
      ignore,
    ].join('\n'),
    html: [
      `<p>Hi ${name},</p>`,
      `<p>${intro}</p>`,
      `<p><strong>Your code: ${code}</strong></p>`,
      `<p>${expiry}</p>`,
      `<p>${ignore}</p>`,
      `<p>- ${app}</p>`,
    ].join(''),
  };
};

export interface WelcomeEmailInput {
  appName: string;
  firstName: string;
}

export const buildWelcomeEmail = (input: WelcomeEmailInput): RenderedEmail => {
  const name = escapeHtml(input.firstName);
  const app = escapeHtml(input.appName);

  return {
    subject: `Welcome to ${input.appName}`,
    text: [
      `Hi ${input.firstName},`,
      '',
      `Welcome to ${input.appName}! Your email address is verified and your account is ready.`,
      '',
      `- ${input.appName}`,
    ].join('\n'),
    html: [
      `<p>Hi ${name},</p>`,
      `<p>Welcome to ${app}! Your email address is verified and your account is ready.</p>`,
      `<p>- ${app}</p>`,
    ].join(''),
  };
};
