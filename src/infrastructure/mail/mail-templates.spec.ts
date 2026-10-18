import { buildOtpEmail, buildWelcomeEmail } from './mail-templates';

describe('mail templates', () => {
  describe('buildOtpEmail', () => {
    it('builds a verification email that contains the code and expiry', () => {
      const mail = buildOtpEmail({
        appName: 'WealthWise',
        firstName: 'John',
        code: '123456',
        kind: 'EMAIL_VERIFICATION',
        expiresInMinutes: 10,
      });

      expect(mail.subject).toBe('Verify your WealthWise email address');
      expect(mail.text).toContain('Your code: 123456');
      expect(mail.text).toContain('expires in 10 minutes');
      expect(mail.html).toContain('123456');
    });

    it('builds a password reset email with a reset subject', () => {
      const mail = buildOtpEmail({
        appName: 'WealthWise',
        firstName: 'John',
        code: '654321',
        kind: 'PASSWORD_RESET',
        expiresInMinutes: 10,
      });

      expect(mail.subject).toBe('Reset your WealthWise password');
      expect(mail.text).toContain('Your code: 654321');
    });

    it('escapes user supplied values in the html body', () => {
      const mail = buildOtpEmail({
        appName: 'WealthWise',
        firstName: '<script>alert(1)</script>',
        code: '111111',
        kind: 'EMAIL_VERIFICATION',
        expiresInMinutes: 10,
      });

      expect(mail.html).not.toContain('<script>');
      expect(mail.html).toContain('&lt;script&gt;');
    });
  });

  describe('buildWelcomeEmail', () => {
    it('greets the user by first name', () => {
      const mail = buildWelcomeEmail({
        appName: 'WealthWise',
        firstName: 'Alex',
      });

      expect(mail.subject).toBe('Welcome to WealthWise');
      expect(mail.text).toContain('Hi Alex');
      expect(mail.html).toContain('Alex');
    });
  });
});
