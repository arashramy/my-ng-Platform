import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { PermissionKey } from '../constant/auth.constant';
import EventEmitter from 'events';
import { OnEvent } from '@nestjs/event-emitter';
import { EventsConstant } from '../constant/events.constant';

export const CHANNEL = {
  REMOTE: 'remote'
};

export enum CrudAction {
  Add,
  Edit,
  Upsert,
  Remove,
  Refresh
}

export interface ActionEvent {
  action?: CrudAction;
  data?: any;
  first?: boolean;
  field?: string;
  loading?: boolean;
}

export enum RemoteAction {
  DataTable,
  Redirect,
  Message
}

export interface RemoteCommand {
  action?: RemoteAction;
  key?: PermissionKey;
  data?: ActionEvent;
}

@Injectable()
export class SseService {
  readonly emitter: EventEmitter = new EventEmitter();
  subject: Subject<any> = new Subject<any>();

  constructor() {}

  @OnEvent(EventsConstant.CLIENT_REMOTE)
  onEvent(payload: any) {
    this.subject.next({
      id: `${Date.now()}`,
      type: 'event',
      retry: 30000,
      data: payload
    });
  }
}
