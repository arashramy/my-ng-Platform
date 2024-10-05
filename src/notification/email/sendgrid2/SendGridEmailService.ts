import { Injectable } from '@nestjs/common';
import {
  NotificationAbstractService,
  NotificationType
} from '../../../notification/NotificationAbstractService';
import {
  SendGrid2SendByTemplateRequestDTO,
  SendGrid2SendRequestDTO
} from './sendgrid2.dto';
import { default as SendGrid } from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';
import EmailTemplate from 'swig-email-templates';

@Injectable()
export class SendGridEmailService extends NotificationAbstractService<
  SendGrid2SendRequestDTO,
  SendGrid2SendByTemplateRequestDTO
> {
  constructor(public readonly configService: ConfigService) {
    SendGrid.setApiKey(configService.get<string>('MAIL_API_KEY')!);
    super();
  }

  getSender() {
    return this.configService.get<string>('MAIL_SENDER');
  }

  send(data: SendGrid2SendRequestDTO) {
    SendGrid.send(
      {
        from: this.getSender(),
        subject: data.subject,
        text: data.text,
        to: data.receiver
      },
      false,
      (error) => {
        if (error) {
          console.log('SendGridEmail ERROR : ', error, JSON.stringify(data));
        } else {
          console.log('SendGridEmail Success', JSON.stringify(data));
        }
      }
    );
  }
  async sendByTemplate(data: SendGrid2SendByTemplateRequestDTO) {
    const template = new EmailTemplate({
      root: this.configService.get<string>('MAIL_TEMPLATE_URL')
    });
    const { html } = await template.render(`${data.templateName}.html`, {
      ...(data.datas || {})
    });
    SendGrid.send(
      {
        from: this.getSender(),
        subject: data.subject,
        to: data.receiver,
        html
      },
      false,
      (error) => {
        if (error) {
          console.log(
            'SendGridEmail Template ERROR : ',
            error,
            JSON.stringify(data)
          );
        } else {
          console.log('SendGridEmail Template Success', JSON.stringify(data));
        }
      }
    );
  }
  name(): NotificationType {
    return NotificationType.SendGrid;
  }
}
