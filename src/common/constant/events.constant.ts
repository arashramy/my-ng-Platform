export enum EventsConstant {
  ORDER_SAVE_LOG = 'ORDER_SAVE_LOG',
  CASH_BACK_PROCESS = 'CASH_BACK_PROCESS',
  SMS_NOTIFICATION = 'SMS_NOTIFICATION',
  CLIENT_USER_REPORT = 'CLIENT_USER_REPORT',
  USER_DETAIL = 'USER_DETAIL',
  AUDIT = 'audit',
  ORDER_FULL = 'order.*',
  ORDER_SAVE = 'order.save',
  ORDER_SETTLED = 'order.settled',
  ORDER_DELETE = 'order.delete',
  ORDER_DELETE_TRANSACTIONS = 'order.delete-transactions',
  ORDER_SAVED_CHECK_GIFT_PACKAGE = 'ORDER_SAVED_CHECK_GIFT_PACKAGE',
  UPDATE_PACKAGE_DATA = 'UPDATE_PACKAGE_DATA',
  CREATE_USER_SMS = 'CREATE_USER_SMS',
  BACKUP_NOTIFICATION = 'BACKUP_NOTIFICATION',

  RECEPTION_FULL = 'reception.*',
  RECEPTION_BACK_TO_LOGIN = 'reception.back-to-login',
  RECEPTION_LOGOUT = 'reception.logout',
  RECEPTION_LOGOUT_ALL = 'reception.logout-all',

  LOAN_ADD = 'loan.add',
  LOAN_UPDATE = 'loan.update',
  LOAN_REMOVE = 'loan.remove',
  LOAN_INSTALLMENT_TIMEOUT = 'loan.installment.timeout',
  LOAN_INSTALLMENT_PAYED = 'loan.installment.payed',

  LOCKER_ASSIGNED = 'lockers.assigned',
  LOCKER_UNASSIGNED = 'lockers.unassigned',


  LOCKER_ASSIGNED_DEVICE='lockers.assigned.device',

  SERVICE_SESSIONAL_CHANGED = 'service.sessional.changed',
  SERVICE_CLASS_GROUP_CHANGED = 'service.class-group.changed',

  TRANSACTION_DEPOSIT = 'transactions.deposit',
  TRANSACTION_WITHDRAW = 'transactions.withdraw',
  TRANSACTION_TRANSFER = 'transactions.transfer',

  TRANSACTION_SETTLE = 'transactions.settle.',
  TRANSACTION_SETTLE_FULL = 'transactions.settle.*',
  TRANSACTION_SETTLE_CREDIT = 'transactions.settle.0',
  TRANSACTION_SETTLE_BANK = 'transactions.settle.1',
  TRANSACTION_SETTLE_CASH = 'transactions.settle.2',
  TRANSACTION_SETTLE_CHARGING_SERVICE = 'transactions.settle.3',
  TRANSACTION_SETTLE_GIFT = 'transactions.settle.4',
  TRANSACTION_SETTLE_LOAN = 'transactions.settle.5',
  TRANSACTION_SETTLE_CHEQUE = 'transactions.settle.6',
  TRANSACTION_SETTLE_DISCOUNT = 'transactions.settle.7',
  TRANSACTION_SETTLE_ARCHIVED = 'transactions.settle.8',
  TRANSACTION_SETTLE_TRANSFER = 'transactions.settle.9',

  TRANSACTION_REMOVE = 'transactions.remove.',
  TRANSACTION_REMOVE_FULL = 'transactions.remove.*',
  TRANSACTION_REMOVE_CREDIT = 'transactions.remove.0',
  TRANSACTION_REMOVE_BANK = 'transactions.remove.1',
  TRANSACTION_REMOVE_CASH = 'transactions.remove.2',
  TRANSACTION_REMOVE_CHARGING_SERVICE = 'transactions.remove.3',
  TRANSACTION_REMOVE_GIFT = 'transactions.remove.4',
  TRANSACTION_REMOVE_LOAN = 'transactions.remove.5',
  TRANSACTION_REMOVE_CHEQUE = 'transactions.remove.6',
  TRANSACTION_REMOVE_DISCOUNT = 'transactions.remove.7',
  TRANSACTION_REMOVE_ARCHIVED = 'transactions.remove.8',
  TRANSACTION_REMOVE_TRANSFER = 'transactions.remove.9',


  NOTIFICATION = 'notification',
  MQTT_SEND = 'mqtt.send',

  FACE_GET_SAMPLE = 'face-api.sample',

  CLIENT_REMOTE = 'client.remote',

  IMAGE_HUB_UPLOADER = 'IMAGE_HUB_UPLOADER',
  UPLOADING_IDENTIFICATION_PROVIDER = 'UPLOADING_IDENTIFICATION_PROVIDER',


  USER_ACTIVITY='USER_ACTIVITY'
}
