export interface IReceiveSingleLocker {
  state: number;
  id: number;
  relayNumber: number;
}

export interface IReceiveAllLocker {
  id?: any;
  toggle: number;
}
