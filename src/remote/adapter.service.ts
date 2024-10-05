

export class Adapter {
  connection: any;
  constructor() {
    if (!this.connection) {
      // this.connection = new ConnectionBuilder()
      //   .connectTo(
      //     "./AccessDeviceControlApp/AccessDeviceControlApp/bin/Debug/AccessDeviceControlApp.exe"
      //   )
      //   .build();
    }
  }
  onDisconnect(onDisconnectCallback) {
    this.connection.onDisconnect = onDisconnectCallback;
  }
  subscribe(eventName, cb) {
    this.connection.on(eventName, cb);
  }
  emit(methodName, data, cb) {
    this.connection.send(methodName, { data }, cb);
  }
}
