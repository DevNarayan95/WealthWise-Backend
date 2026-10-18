import { Global, Module } from '@nestjs/common';

import { MailSender } from './mail-sender';
import { SmtpMailSender } from './smtp-mail-sender';

@Global()
@Module({
  providers: [{ provide: MailSender, useClass: SmtpMailSender }],
  exports: [MailSender],
})
export class MailModule {}
