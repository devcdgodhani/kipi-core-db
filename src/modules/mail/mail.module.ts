import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './services/mail.service';
import mailConfig from '../../config/mail.config';

@Global()
@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
