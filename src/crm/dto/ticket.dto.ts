import { Ticket, TicketPriority } from '../entities/Ticket';
import { Media } from '../../base/dto/image.dto';

export interface CreateTicketDto {
  subject: string;
  content: string;
  priority: TicketPriority;
  group?: number;
  attachments?: Media[];
  project?: string;
}

export interface TicketItemDto {
  ticket: number | Ticket;
  content: string;
  group?: number;
  attachments?: Media[];
}
