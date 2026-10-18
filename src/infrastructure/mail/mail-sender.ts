export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Outbound email port. The SMTP adapter is the production implementation;
 * e2e tests swap it for an in-memory sender.
 */
export abstract class MailSender {
  abstract send(message: MailMessage): Promise<void>;
}
