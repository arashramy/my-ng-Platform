export enum NotificationType {
  SendGrid = 5,
  Gama = 6
}

export abstract class NotificationAbstractService<SendDTO, SendByTemplateDTO> {
  abstract send(data: SendDTO);
  abstract sendByTemplate(data: SendByTemplateDTO);
  abstract name(): NotificationType;
}
