export class SendGrid2BaseDTO {
  subject: string;
  receiver: string;
}

export class SendGrid2SendRequestDTO extends SendGrid2BaseDTO {
  text: string;
}

export class SendGrid2SendByTemplateRequestDTO extends SendGrid2BaseDTO {
  datas: Record<string, any>;
  templateName: string;
}
